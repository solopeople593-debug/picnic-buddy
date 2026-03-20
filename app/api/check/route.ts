import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    console.log("GEMINI_API_KEY exists:", !!apiKey)
    console.log("GEMINI_API_KEY length:", apiKey?.length)

    const genAI = new GoogleGenerativeAI(apiKey || "")
    const { item, roomCode, lang, needHint } = await req.json()
    console.log("Request received:", { item, roomCode, lang })

    const { data: room } = await supabase
      .from('rooms')
      .select('secret_rule')
      .eq('code', roomCode)
      .single()

    console.log("Room data:", room)
    const rule = room?.secret_rule || '???'

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" })

    const prompt = `You are the host of the game "I'm going on a picnic". Language: ${lang}.
Secret rule: "${rule}".
Player wants to bring: "${item}".
Does this item fit the secret rule?
${needHint ? `Also write a very short witty hint in language ${lang} (max 6 words, do NOT reveal the rule).` : ''}
Answer ONLY in valid JSON, no markdown: {"allowed": true or false, "hint": "short hint or null"}`

    console.log("Calling Gemini...")
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, "").trim()
    console.log("Gemini response:", text)
    const parsed = JSON.parse(text)

    return NextResponse.json({ allowed: !!parsed.allowed, hint: parsed.hint || null })
  } catch (error: any) {
    console.error("API Error details:", error?.message, error?.status)
    return NextResponse.json({ allowed: false, hint: null }, { status: 500 })
  }
}