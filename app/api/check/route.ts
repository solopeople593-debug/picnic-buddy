import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getKeys(): string[] {
  const keysString = process.env.GROQ_API_KEY || process.env.GROQ_API_KEYS || ""
  return keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
}

async function callGroq(keys: string[], prompt: string, temperature = 0.1): Promise<any> {
  for (let i = 0; i < keys.length; i++) {
    try {
      const groq = new Groq({ apiKey: keys[i] })
      return await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a JSON-only response bot. Never explain. Never add text outside JSON." },
          { role: "user", content: prompt }
        ],
        temperature,
        response_format: { type: "json_object" }
      })
    } catch (err: any) {
      console.warn(`Key #${i + 1} failed: ${err?.message}`)
      if (i === keys.length - 1) throw err
    }
  }
}

export async function POST(req: Request) {
  let moveId: string | null = null
  try {
    const { item, roomCode, lang, needHint } = await req.json()

    const { data: lastMove } = await supabase
      .from('moves')
      .select('id')
      .eq('room_code', roomCode)
      .eq('item', item.toUpperCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    moveId = lastMove?.id || null

    const { data: room } = await supabase
      .from('rooms')
      .select('secret_rule')
      .eq('code', roomCode)
      .single()
    const rule = room?.secret_rule || '???'

    const { data: moves } = await supabase
      .from('moves')
      .select('item, is_allowed, player_name')
      .eq('room_code', roomCode)

    const hostNames = ['ВЕДУЩИЙ ИИ', 'HOST AI', 'ВЕДУЧИЙ ШІ', 'VADĪTĀJS AI']
    const acceptedWords = moves
      ?.filter(m => m.is_allowed && !hostNames.includes(m.player_name))
      .map(m => m.item)
      .join(', ') || 'none'

    const rejectedWords = moves
      ?.filter(m => !m.is_allowed && !hostNames.includes(m.player_name))
      .map(m => m.item)
      .join(', ') || 'none'

    const totalMoves = moves?.filter(m => !hostNames.includes(m.player_name)).length || 0

    const checkPrompt = `You are the strict host of "I'm going on a picnic" game. Language: ${lang}.
Secret rule: "${rule}"
Word submitted by player: "${item}"
Previously ACCEPTED words (follow the rule): ${acceptedWords}
Previously REJECTED words (do NOT follow the rule): ${rejectedWords}
Total player moves so far: ${totalMoves}

STEP 1 — ANALYZE THE RULE:
First, understand what the rule "${rule}" means precisely.
- If it's a letter rule (e.g. "words starting with A"): check the EXACT letter
- If it's a category rule (e.g. "metal objects"): check if the item truly belongs
- If it's a pattern rule (e.g. "words with double letters"): check the EXACT pattern
- If it's a property rule (e.g. "round objects"): check if the item has that property
- Use the accepted/rejected words as reference to calibrate your understanding

STEP 2 — EVALUATE:
Does "${item}" follow the rule "${rule}"?
Be CONSISTENT with previously accepted/rejected words.
Be STRICT and PRECISE — do not be lenient.

STEP 3 — GUESSED CHECK:
"guessed" = true ONLY IF the player is naming the RULE ITSELF, not just an item that fits.
Examples:
- Rule "words with double letters", player says "COFFEE" → guessed=false (fits but doesn't name rule)
- Rule "words with double letters", player says "DOUBLE LETTERS" → guessed=true
- Rule "red items", player says "APPLE" → guessed=false
- Rule "red items", player says "RED COLOR" or "RED THINGS" → guessed=true
Be VERY strict about this. Almost always guessed=false.

STEP 4 — HINT (only if needHint=true):
Generate ONE real word that fits the rule "${rule}".
- Must be a real, common word
- Must NOT be in: ${acceptedWords}
- Must NOT explain the rule — just be an example
- Single word only, no punctuation

Return JSON: {"allowed": boolean, "guessed": boolean, "hint": string or null}`

    const keys = getKeys()
    const completion = await callGroq(keys, checkPrompt)
    const result = JSON.parse(completion.choices[0].message.content)

    if (moveId) {
      await supabase
        .from('moves')
        .update({ status: 'approved', is_allowed: result.allowed })
        .eq('id', moveId)
    }

    return NextResponse.json({
      allowed: !!result.allowed,
      guessed: !!result.guessed,
      hint: needHint ? (result.hint || null) : null
    })

  } catch (error: any) {
    console.error("API ERROR:", error)
    if (moveId) {
      await supabase
        .from('moves')
        .update({ status: 'approved', is_allowed: false })
        .eq('id', moveId)
    }
    return NextResponse.json({ allowed: false, guessed: false, hint: null }, { status: 200 })
  }
}