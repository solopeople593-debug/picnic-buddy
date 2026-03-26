import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MAX_QUESTIONS = 12
const MAX_GUESSES = 3

function getKeys(): string[] {
  const keysString = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || ""
  return keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
}

async function callGroq(keys: string[], prompt: string): Promise<any> {
  for (let i = 0; i < keys.length; i++) {
    try {
      const groq = new Groq({ apiKey: keys[i] })
      return await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a JSON-only response bot. Never add text outside JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    } catch (err: any) {
      console.warn(`AI Guess key #${i + 1} failed: ${err?.message}`)
      if (i === keys.length - 1) throw err
    }
  }
}

export async function POST(req: Request) {
  let lang = 'RU'
  try {
    const body = await req.json()
    lang = body.lang || 'RU'
    const roomCode = body.roomCode
    const playerHint = body.playerHint || null // #7 — подсказка от игрока

    const { data: moves } = await supabase
      .from('moves')
      .select('item, is_allowed, player_name')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: true })

    const hostNames = ['ВЕДУЩИЙ ИИ', 'HOST AI', 'ВЕДУЧИЙ ШІ', 'VADĪTĀJS AI']

    // #5 — учитываем "возможно" в истории
    const dialogHistory = moves?.map(m => {
      if (hostNames.includes(m.player_name)) {
        return `AI: ${m.item}`
      } else {
        // Определяем тип ответа по содержимому
        if (m.item.includes('🟡') || m.item.includes('MAYBE') || m.item.includes('ВОЗМОЖНО') ||
            m.item.includes('МОЖЛИВО') || m.item.includes('DAĻĒJI')) {
          return `Player answered: MAYBE/PARTIALLY (to previous AI message)`
        }
        const answer = m.is_allowed ? 'YES' : 'NO'
        return `Player answered: ${answer} (to previous AI message)`
      }
    }).join('\n') || 'Game just started.'

    // Подсказки от игрока
    const playerHints = moves
      ?.filter(m => !hostNames.includes(m.player_name) && m.item.includes('💡'))
      .map(m => m.item.replace('💡 ', '').trim()) || []

    if (playerHint) playerHints.push(playerHint)

    const askedQuestions = moves
      ?.filter(m => hostNames.includes(m.player_name) && m.item.includes('❓'))
      .map(m => m.item.replace('❓ ', '').trim())
      .filter(q => q.length > 0) || []

    const askedCount = askedQuestions.length

    const guessAttempts = moves
      ?.filter(m => hostNames.includes(m.player_name) && m.item.includes('🎯'))
      .length || 0

    const isGuessPhase = askedCount >= MAX_QUESTIONS
    const attemptsLeft = MAX_GUESSES - guessAttempts

    const wrongGuesses = moves
      ?.filter(m => hostNames.includes(m.player_name) && m.item.includes('🎯'))
      .map(m => m.item.replace('🎯 ', '').trim()) || []

    const hintsSection = playerHints.length > 0
      ? `\n=== PLAYER HINTS (picnic items given as clues) ===\n${playerHints.map(h => `- "${h}"`).join('\n')}\nThese are ITEMS that fit the secret rule/concept. Use them to narrow down your guess.\n`
      : ''

    let prompt = ''

    if (isGuessPhase) {
      prompt = `You are playing a word guessing game (like Akinator). Language: ${lang}.
You asked ${MAX_QUESTIONS} yes/no questions. Now make your best guess.
You have ${attemptsLeft} guess attempt(s) left.

=== FULL DIALOG HISTORY ===
${dialogHistory}
${hintsSection}
=== YOUR WRONG GUESSES ===
${wrongGuesses.length > 0 ? wrongGuesses.join(', ') : 'none yet'}

ANALYSIS INSTRUCTIONS:
1. Review ALL yes/no/maybe answers carefully
2. Consider player hints as items that fit the rule
3. Eliminate what was ruled out by NO answers
4. Focus on what YES and MAYBE answers confirm
5. Make the most logical guess based on ALL evidence
6. Do NOT repeat a wrong guess: ${wrongGuesses.join(', ') || 'none'}

Your guess should be a word, short phrase, or rule description — whatever fits best.
Write in language: ${lang}

Return JSON: {"type": "guess", "text": "your best guess"}`

    } else {
      prompt = `You are playing a word/concept guessing game. Language: ${lang}.
Your goal: figure out the SECRET WORD or RULE by asking smart yes/no questions.
You have ${MAX_QUESTIONS - askedCount} questions left.

=== FULL DIALOG HISTORY ===
${dialogHistory}
${hintsSection}
=== QUESTIONS ALREADY ASKED (${askedCount}/${MAX_QUESTIONS}) ===
${askedCount > 0 ? askedQuestions.map(q => `- ${q}`).join('\n') : '- none yet'}

STRATEGY FOR QUESTION #${askedCount + 1}:
- Analyze what you know from previous answers
- Each question should cut remaining possibilities in HALF
- Cover new territory: don't ask similar questions to ones already asked
- Think about: is it physical/abstract? alive/inanimate? natural/man-made? used/worn/eaten?
  size? location? time period? letter patterns? number of syllables?
- If player gave hint items, think about what PROPERTY they share
- MAYBE answers mean partial match — dig deeper into that property

STRICT RULES:
1. Question MUST be answerable with YES, NO, or MAYBE only
2. NEVER repeat or paraphrase any question from the list above
3. Keep it SHORT — under 10 words
4. Write in language: ${lang}
5. Be SMART — make every question count

Return JSON: {"type": "question", "text": "your yes/no question"}`
    }

    const keys = getKeys()
    const completion = await callGroq(keys, prompt)
    const parsed = JSON.parse(completion.choices[0].message.content)

    return NextResponse.json({
      type: parsed.type,
      text: parsed.text,
      isGuessPhase,
      attemptsLeft,
      guessAttempts
    })

  } catch (error: any) {
    console.error("AI Guess Error:", error?.message)
    const fallbacks: Record<string, string> = {
      RU: "Это физический предмет?",
      EN: "Is it a physical object?",
      UA: "Це фізичний предмет?",
      LV: "Vai tas ir fizisks priekšmets?"
    }
    return NextResponse.json({
      type: "question",
      text: fallbacks[lang] || fallbacks.RU,
      isGuessPhase: false,
      attemptsLeft: MAX_GUESSES,
      guessAttempts: 0
    })
  }
}