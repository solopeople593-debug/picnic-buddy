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

    const { data: moves } = await supabase
      .from('moves')
      .select('item')
      .eq('room_code', roomCode)
      .eq('is_allowed', true)

    const usedWords = moves?.map(m => m.item).join(', ') || ''

    const prompt = `You are a STRICT host of the game "I'm going on a picnic". Language: ${lang}.
Secret rule: "${rule}".
Player input: "${item}".
Already accepted words: ${usedWords || 'none'}.

IMPORTANT RULES FOR JUDGING:
- Be VERY STRICT. Only accept items that CLEARLY and OBVIOUSLY fit the rule.
- If the rule is about a physical property (like "items with a handle"), the item must LITERALLY have that property.
- "КРЕКЕР" (cracker) does NOT have a handle. "ПЕЧЕНЬЕ" (cookie) does NOT have a handle. REJECT them.
- "КРУЖКА" (mug) HAS a handle. "СУМКА" (bag) HAS a handle. ACCEPT them.
- Do NOT be generous. When in doubt — REJECT.
- Be consistent with previously accepted words.

Step 1: Is the player trying to GUESS THE RULE ITSELF (not bring an item)?
- If yes and VERY close or correct: guessed=true
- If yes but wrong: guessed=false, allowed=false

Step 2: Does "${item}" LITERALLY and OBVIOUSLY fit the rule "${rule}"?
Think carefully. Be strict.

${needHint ? `Step 3: Give ONE concrete noun in language ${lang} that fits the rule. Just the word, no explanation. Different from: ${usedWords || 'none'}.` : ''}

Answer ONLY in valid JSON, no markdown: {"allowed": true or false, "guessed": true or false, "hint": "one noun or null"}`

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
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