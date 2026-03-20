import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getKeys(): string[] {
  const keysString = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || ""
  return keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
}

async function callGroq(keys: string[], prompt: string): Promise<any> {
  for (let i = 0; i < keys.length; i++) {
    try {
      const groq = new Groq({ apiKey: keys[i] })
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      })
      return completion
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

    const dialogHistory = moves?.map(m => {
      if (hostNames.includes(m.player_name)) {
        return `AI: ${m.item}`
      } else {
        return `Player: ${m.item}`
      }
    }).join('\n') || 'Game just started.'

    const askedQuestions = moves
      ?.filter(m => hostNames.includes(m.player_name))
      .map(m => m.item.replace('❓ ', '').replace('🎯 ', '').trim())
      .filter(q => q.length > 0)

    const askedCount = askedQuestions?.length || 0
    const askedList = askedQuestions?.join('\n- ') || 'none'

    // Считаем сколько раз ИИ уже угадывал (попытки)
    const guessAttempts = moves
      ?.filter(m => hostNames.includes(m.player_name) && m.item.includes('🎯'))
      .length || 0

    const isGuessPhase = askedCount >= 7
    const attemptsLeft = 3 - guessAttempts

    let prompt = ''

    if (isGuessPhase) {
      prompt = `You are playing Akinator. Language: ${lang}.
You have asked 7 questions. Now you have ${attemptsLeft} guess attempt(s) left.

=== FULL HISTORY ===
${dialogHistory}

=== YOUR PREVIOUS GUESSES ===
${guessAttempts > 0 ? askedQuestions?.filter(q => moves?.find(m => m.item.includes('🎯') && m.item.includes(q))).join(', ') : 'none yet'}

YOU MUST MAKE A GUESS NOW.
- Based on all the answers, what is the most likely word?
- Do NOT ask another question
- Make your best guess as a single word or short phrase in ${lang}
- Do NOT repeat a previous wrong guess

Respond ONLY in JSON: {"type": "guess", "text": "your best guess in ${lang}"}`
    } else {
      prompt = `You are playing Akinator. Language: ${lang}.
Your goal: guess the SECRET WORD. You have ${7 - askedCount} questions left before you must start guessing.

=== FULL HISTORY ===
${dialogHistory}

=== QUESTIONS YOU ALREADY ASKED (${askedCount}/7) ===
- ${askedList}

Ask question #${askedCount + 1}. MUST be different from all above.

STRICT RULES:
- NEVER repeat any question from the list above
- Each question explores a NEW property: size, color, material, location, purpose, shape
- Questions must be short (under 10 words)
- You have ${7 - askedCount} questions left — make them count!

Respond ONLY in JSON: {"type": "question", "text": "your question in ${lang}"}`
    }

    const keys = getKeys()
    const completion = await callGroq(keys, prompt)
    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({
      type: parsed.type,
      text: parsed.text,
      isGuessPhase,
      attemptsLeft,
      guessAttempts
    })
  } catch (error: any) {
    console.error("AI Guess Error:", error?.message)
    return NextResponse.json({
      type: "question",
      text: lang === 'RU' ? "Это больше кошки?" : lang === 'UA' ? "Це більше за кота?" : "Is it bigger than a cat?",
      isGuessPhase: false,
      attemptsLeft: 3,
      guessAttempts: 0
    })
  }
}