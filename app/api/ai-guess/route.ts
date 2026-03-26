import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MAX_QUESTIONS = 12 // вопросов до фазы угадывания
const MAX_GUESSES = 3    // попыток угадать

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
        temperature: 0.7,
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

    const { data: moves } = await supabase
      .from('moves')
      .select('item, is_allowed, player_name')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: true })

    const hostNames = ['ВЕДУЩИЙ ИИ', 'HOST AI', 'ВЕДУЧИЙ ШІ', 'VADĪTĀJS AI']

    // История диалога
    const dialogHistory = moves?.map(m => {
      if (hostNames.includes(m.player_name)) {
        return `AI: ${m.item}`
      } else {
        const answer = m.is_allowed ? 'YES' : 'NO'
        return `Player answered: ${answer} (to: ${m.item})`
      }
    }).join('\n') || 'Game just started.'

    // Вопросы которые уже задавались
    const askedQuestions = moves
      ?.filter(m => hostNames.includes(m.player_name) && m.item.includes('❓'))
      .map(m => m.item.replace('❓ ', '').trim())
      .filter(q => q.length > 0) || []

    const askedCount = askedQuestions.length

    // Попытки угадать
    const guessAttempts = moves
      ?.filter(m => hostNames.includes(m.player_name) && m.item.includes('🎯'))
      .length || 0

    const isGuessPhase = askedCount >= MAX_QUESTIONS
    const attemptsLeft = MAX_GUESSES - guessAttempts

    // Неправильные угадывания
    const wrongGuesses = moves
      ?.filter(m => hostNames.includes(m.player_name) && m.item.includes('🎯'))
      .map(m => m.item.replace('🎯 ', '').trim()) || []

    let prompt = ''

    if (isGuessPhase) {
      // #8 fix: фаза угадывания
      prompt = `You are playing Akinator. Language: ${lang}.
You have asked ${MAX_QUESTIONS} yes/no questions. Now you must guess.
You have ${attemptsLeft} guess attempt(s) left.

=== DIALOG HISTORY ===
${dialogHistory}

=== YOUR WRONG GUESSES SO FAR ===
${wrongGuesses.length > 0 ? wrongGuesses.join(', ') : 'none'}

Based on all YES/NO answers, make your best guess for what the secret word/concept is.
- Do NOT repeat a wrong guess
- Single word or very short phrase
- In language: ${lang}

Return JSON: {"type": "guess", "text": "your best guess"}`

    } else {
      // #8 fix: ТОЛЬКО вопросы на которые можно ответить да/нет
      prompt = `You are playing Akinator. Language: ${lang}.
Your goal: guess the SECRET WORD by asking YES/NO questions only.
You have ${MAX_QUESTIONS - askedCount} questions left before you must start guessing.

=== DIALOG HISTORY ===
${dialogHistory}

=== QUESTIONS YOU ALREADY ASKED (${askedCount}/${MAX_QUESTIONS}) ===
${askedCount > 0 ? askedQuestions.map(q => `- ${q}`).join('\n') : '- none yet'}

Ask question #${askedCount + 1}.

STRICT RULES:
1. The question MUST be answerable with YES or NO only. No "how many", "what color exactly", "which" — only yes/no.
2. NEVER repeat any question from the list above.
3. Explore new properties: is it alive? is it bigger than a car? is it used indoors? is it found in nature? can you eat it?
4. Keep questions short (under 10 words).
5. Write the question in language: ${lang}.

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
      RU: "Это живое существо?",
      EN: "Is it a living creature?",
      UA: "Це жива істота?",
      LV: "Vai tas ir dzīva būtne?"
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