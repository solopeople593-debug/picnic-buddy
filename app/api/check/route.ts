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

    // Ищем pending ход
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

    // Достаём правило
    const { data: room } = await supabase
      .from('rooms')
      .select('secret_rule')
      .eq('code', roomCode)
      .single()
    const rule = room?.secret_rule || '???'

    // Контекст принятых слов
    const { data: moves } = await supabase
      .from('moves')
      .select('item, is_allowed, player_name')
      .eq('room_code', roomCode)

    const hostNames = ['ВЕДУЩИЙ ИИ', 'HOST AI', 'ВЕДУЧИЙ ШІ', 'VADĪTĀJS AI']
    const acceptedWords = moves
      ?.filter(m => m.is_allowed && !hostNames.includes(m.player_name))
      .map(m => m.item)
      .join(', ') || 'none'

    const totalMoves = moves?.filter(m => !hostNames.includes(m.player_name)).length || 0

    // --- ПРОМПТ ДЛЯ ПРОВЕРКИ СЛОВА ---
    // #2 fix: guessed=true только если игрок ЯВНО называет само правило/концепт
    // #10 fix: hint — это просто новое слово по правилу, без объяснений
    const checkPrompt = `You are the host of "I'm going on a picnic" game. Language: ${lang}.
Secret rule: "${rule}"
Word submitted by player: "${item}"
Previously accepted words: ${acceptedWords}
Total player moves so far: ${totalMoves}

TASK: Evaluate if the submitted word follows the secret rule.

RULES FOR "guessed":
- "guessed" must be TRUE ONLY if the player's submitted word IS the rule itself, or directly names/describes the rule concept exactly.
- "guessed" must be FALSE if the word just follows the rule (e.g. fits the pattern) but doesn't reveal what the rule is.
- Example: rule is "words with double letters" — "COFFEE" fits the rule → guessed=false. If player submits "DOUBLE LETTERS" → guessed=true.
- Be strict. Do NOT set guessed=true just because the word fits well.

RULES FOR "hint" (only when needHint=true):
- Return ONE new example word that fits the secret rule "${rule}".
- Do NOT explain the rule. Do NOT give any clues about what the rule is.
- Just return a single word that fits. Nothing else.
- The word must NOT already be in: ${acceptedWords}
- If needHint=false, return hint=null.

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