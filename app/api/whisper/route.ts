import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const { roomCode, lang } = await req.json()

    // Берём правило и последние ходы
    const { data: room } = await supabase
      .from('rooms')
      .select('secret_rule')
      .eq('code', roomCode)
      .single()

    const { data: moves } = await supabase
      .from('moves')
      .select('item, is_allowed, player_name')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: false })
      .limit(10)

    const rule = room?.secret_rule || '???'
    const recentItems = moves?.map(m => `${m.item} (${m.is_allowed ? '✅' : '❌'})`).join(', ') || ''

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `You are secretly helping the HOST of the game "I'm going on a picnic".
Secret rule: "${rule}"
Recent items players tried: ${recentItems}

Analyze: are players getting close to guessing the rule? 
Give the host a SHORT whisper in language ${lang} (max 10 words):
- If players are getting close: warn the host subtly
- If players are far off: reassure the host
- Never reveal the rule directly

Answer ONLY in JSON no markdown: {"whisper": "short message to host", "danger": true or false}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(text)

    return NextResponse.json({ whisper: parsed.whisper, danger: !!parsed.danger })
  } catch (error) {
    console.error("Whisper API Error:", error)
    return NextResponse.json({ whisper: null, danger: false }, { status: 500 })
  }
}