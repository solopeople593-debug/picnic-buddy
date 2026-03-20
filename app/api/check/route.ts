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
    const { item, roomCode, lang, needHint } = await req.json()

    // Берём секретное правило из базы
    const { data: room } = await supabase
      .from('rooms')
      .select('secret_rule')
      .eq('code', roomCode)
      .single()

    const rule = room?.secret_rule || '???'
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `You are the host of the game "I'm going on a picnic". Language: ${lang}.
Secret rule: "${rule}".
Player wants to bring: "${item}".
Does this item fit the secret rule? Be strict and consistent.
${needHint ? `Also write a very short witty hint for the player in language ${lang} (max 6 words, do NOT reveal the rule directly).` : ''}
Answer ONLY in valid JSON, no markdown: {"allowed": true or false, "hint": "short hint or null"}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(text)

    return NextResponse.json({ allowed: !!parsed.allowed, hint: parsed.hint || null })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ allowed: false, hint: null }, { status: 500 })
  }
}