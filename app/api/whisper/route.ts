import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getGroq(): Groq {
  const keysString = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || ""
  const keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
  const key = keys[Math.floor(Math.random() * keys.length)]
  return new Groq({ apiKey: key })
}

export async function POST(req: Request) {
  try {
    const { roomCode, lang } = await req.json()

    const { data: room } = await supabase
      .from('rooms').select('secret_rule').eq('code', roomCode).single()

    const { data: moves } = await supabase
      .from('moves')
      .select('item, is_allowed, player_name')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: false })
      .limit(10)

    const rule = room?.secret_rule || '???'
    const recentItems = moves?.map(m => `${m.item} (${m.is_allowed ? '✅' : '❌'})`).join(', ') || ''

    const prompt = `You are secretly helping the HOST of the game "I'm going on a picnic".
Secret rule: "${rule}"
Recent items players tried: ${recentItems}
Analyze: are players getting close to guessing the rule?
Give the host a SHORT whisper in language ${lang} (max 10 words):
- If players are getting close: warn the host subtly
- If players are far off: reassure the host
- Never reveal the rule directly
Answer ONLY in JSON no markdown: {"whisper": "short message", "danger": true or false}`

    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    })

    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ whisper: parsed.whisper, danger: !!parsed.danger })
  } catch (error: any) {
    console.error("Whisper API Error:", error?.message)
    return NextResponse.json({ whisper: null, danger: false }, { status: 500 })
  }
}