import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getKeys(): string[] {
  const keysString = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || ""
  return keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
}

async function callGroq(keys: string[], prompt: string): Promise<any> {
  for (let i = 0; i < keys.length; i++) {
    try {
      const groq = new Groq({ apiKey: keys[i] })
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      })
      return completion
    } catch (err: any) {
      console.warn(`Whisper key #${i + 1} failed: ${err?.message}`)
      if (i === keys.length - 1) throw err
    }
  }
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
Recent items: ${recentItems}
Are players getting close to guessing the rule?
Give host a SHORT whisper in language ${lang} (max 10 words).
Answer ONLY in JSON: {"whisper": "short message", "danger": true or false}`

    const keys = getKeys()
    const completion = await callGroq(keys, prompt)
    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ whisper: parsed.whisper, danger: !!parsed.danger })
  } catch (error: any) {
    console.error("Whisper API Error:", error?.message)
    return NextResponse.json({ whisper: null, danger: false }, { status: 500 })
  }
}