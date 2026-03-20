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
    const { item, roomCode, lang, needHint } = await req.json()

    const { data: room } = await supabase
      .from('rooms').select('secret_rule').eq('code', roomCode).single()
    const rule = room?.secret_rule || '???'

    const { data: moves } = await supabase
      .from('moves')
      .select('item, is_allowed, player_name')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: true })

    // Принятые слова игроков (не ИИ)
    const hostNames = ['ВЕДУЩИЙ ИИ', 'HOST AI', 'ВЕДУЧИЙ ШІ', 'VADĪTĀJS AI']
    const acceptedWords = moves
      ?.filter(m => m.is_allowed && !hostNames.includes(m.player_name))
      .map(m => m.item).join(', ') || 'none'

    // Предыдущие подсказки ИИ
    const previousHints = moves
      ?.filter(m => hostNames.includes(m.player_name))
      .map(m => m.item).join(', ') || 'none'

    const prompt = `You are a STRICT host of the game "I'm going on a picnic". Language: ${lang}.
Secret rule: "${rule}".
Player wants to bring: "${item}".
Already accepted words: ${acceptedWords}.
Previous hints already given: ${previousHints}.

JUDGING — BE VERY STRICT:
- Only accept items that CLEARLY and LITERALLY fit the rule.
- Example rule "items with a handle": ACCEPT mug, bag, pan. REJECT cracker, cookie, book.
- Example rule "red items": ACCEPT tomato, apple. REJECT banana, grass.
- When in doubt — REJECT.
- Be consistent with already accepted words.

Step 1: Is player trying to GUESS THE RULE ITSELF (not bring an item)?
- If yes and correct or very close → guessed=true
- If yes but wrong → guessed=false, allowed=false

Step 2: Does "${item}" CLEARLY and LITERALLY fit "${rule}"?

${needHint ? `Step 3: Give ONE concrete noun in language ${lang} that fits the rule.
- Must be DIFFERENT from previous hints: ${previousHints}
- Must be a common everyday item
- Just one word, no explanation` : ''}

Answer ONLY in valid JSON, no markdown: {"allowed": true or false, "guessed": true or false, "hint": "one word or null"}`

    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
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