import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@supabase/supabase-js"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const { item, roomCode, lang, needHint } = await req.json()

    const { data: room } = await supabase
      .from('rooms')
      .select('secret_rule')
      .eq('code', roomCode)
      .single()

    const rule = room?.secret_rule || '???'

    const prompt = `You are the host of the game "I'm going on a picnic". Language: ${lang}.
Secret rule: "${rule}".
Player input: "${item}".

First check: is the player trying to GUESS THE RULE ITSELF (not bring an item, but guess the concept)?
- If yes and they are correct or very close: set guessed=true
- If yes but wrong: set guessed=false, allowed=false

Then check: does the item fit the secret rule?

${needHint ? `Also write a very short witty hint in language ${lang} (max 6 words, do NOT reveal the rule directly).` : ''}

Answer ONLY in valid JSON, no markdown: {"allowed": true or false, "guessed": true or false, "hint": "short hint or null"}`

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    })

    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({
      allowed: !!parsed.allowed,
      guessed: !!parsed.guessed,
      hint: parsed.hint || null
    })
  } catch (error: any) {
    console.error("Check API Error:", error?.message)
    return NextResponse.json({ allowed: false, guessed: false, hint: null }, { status: 500 })
  }
}