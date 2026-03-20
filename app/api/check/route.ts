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

    const { data: room } = await supabase.from('rooms').select('secret_rule').eq('code', roomCode).single()
    const rule = room?.secret_rule || '???'

    // Берём уже использованные слова чтобы не повторять подсказки
    const { data: moves } = await supabase
      .from('moves')
      .select('item')
      .eq('room_code', roomCode)
      .eq('is_allowed', true)

    const usedWords = moves?.map(m => m.item).join(', ') || ''

    const prompt = `You are the host of the game "I'm going on a picnic". Language: ${lang}.
Secret rule: "${rule}".
Player input: "${item}".
Already used words that fit the rule: ${usedWords || 'none yet'}.

Step 1: Check if the player is trying to GUESS THE RULE ITSELF (not bring an item).
- If yes and correct or very close: guessed=true
- If yes but wrong: guessed=false, allowed=false

Step 2: Check if the item fits the secret rule. Be strict and consistent.

Step 3: ${needHint
  ? `Give ONE concrete noun in language ${lang} that fits the secret rule. 
     This is a WORD EXAMPLE hint, not an explanation. 
     Must be different from already used words.
     Example: if rule is "words with double letters" → hint could be "КОФЕ" or "ЛИМОН"
     Just one word, no explanations.`
  : 'hint = null'}

Answer ONLY in valid JSON, no markdown: {"allowed": true or false, "guessed": true or false, "hint": "one noun word or null"}`

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    })

    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ allowed: !!parsed.allowed, guessed: !!parsed.guessed, hint: parsed.hint || null })
  } catch (error: any) {
    console.error("Check API Error:", error?.message)
    return NextResponse.json({ allowed: false, guessed: false, hint: null }, { status: 500 })
  }
}