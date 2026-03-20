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
      .select('item, is_allowed, player_name')
      .eq('room_code', roomCode)

    const acceptedWords = moves?.filter(m => m.is_allowed && m.player_name !== 'ВЕДУЩИЙ ИИ' && m.player_name !== 'HOST AI' && m.player_name !== 'ВЕДУЧИЙ ШІ' && m.player_name !== 'VADĪТĀJS AI').map(m => m.item).join(', ') || ''
    const previousHints = moves?.filter(m => m.player_name === 'ВЕДУЩИЙ ИИ' || m.player_name === 'HOST AI' || m.player_name === 'ВЕДУЧИЙ ШІ' || m.player_name === 'VADĪТĀJS AI').map(m => m.item).join(', ') || ''

    const prompt = `You are a STRICT and SMART host of the game "I'm going on a picnic". Language: ${lang}.
Secret rule: "${rule}".
Player input: "${item}".
Already accepted player words: ${acceptedWords || 'none'}.
Previous hints already given: ${previousHints || 'none'}.

JUDGING RULES — BE STRICT:
- Only accept items that CLEARLY and LITERALLY fit the rule. No exceptions.
- Example: rule "items with a handle" → ACCEPT: mug, suitcase, pan. REJECT: cracker, cookie, book.
- Example: rule "red items" → ACCEPT: tomato, apple, fire truck. REJECT: banana, sky, grass.
- When in doubt — REJECT.

Step 1: Is the player trying to GUESS THE RULE ITSELF?
- If yes and correct or very close → guessed=true
- If yes but wrong → guessed=false, allowed=false

Step 2: Does "${item}" CLEARLY fit the rule "${rule}"? Think carefully. Be strict.

${needHint ? `Step 3: Give ONE short hint word in language ${lang}.
HINT RULES:
- Must be a DIFFERENT category than previous hints: ${previousHints || 'none'}
- Must be a common everyday word that clearly fits the rule
- Must NOT be similar to or repeat any previous hint
- Must help player understand the pattern without being too obvious
- Just one word, no explanation` : ''}

Answer ONLY in valid JSON, no markdown: {"allowed": true or false, "guessed": true or false, "hint": "one word or null"}`

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
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