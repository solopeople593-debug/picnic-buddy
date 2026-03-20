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

    // Строим историю диалога правильно
    const hostNames = ['ВЕДУЩИЙ ИИ', 'HOST AI', 'ВЕДУЧИЙ ШІ', 'VADĪTĀJS AI']
    const dialogHistory = moves?.map(m => {
      if (hostNames.includes(m.player_name)) {
        return `AI: ${m.item}`
      } else {
        return `Player answered: ${m.item}`
      }
    }).join('\n') || 'No history yet.'

    // Список уже заданных вопросов чтобы не повторять
    const askedQuestions = moves
      ?.filter(m => hostNames.includes(m.player_name))
      .map(m => m.item.replace('❓ ', '').replace('🎯 ', ''))
      .join(' | ') || 'none'

    const prompt = `You are playing Akinator in language ${lang}.
You are trying to guess a SECRET WORD that the player has in mind.

FULL DIALOGUE HISTORY:
${dialogHistory}

QUESTIONS YOU ALREADY ASKED (DO NOT REPEAT THESE):
${askedQuestions}

YOUR TASK:
- Look at the full history above
- The player's answers tell you what the word IS and IS NOT
- Ask a NEW question that you have NOT asked before
- Each question must narrow down the possibilities based on previous answers
- If you are very confident (after 5+ questions) — make a GUESS

RULES:
- NEVER repeat a question from the list above
- Ask about: category, size, color, material, where it's found, how it's used
- Keep questions short and natural in ${lang}
- If guessing: say the exact word

Answer ONLY in JSON: {"type": "question" or "guess", "text": "your question or guess in ${lang}"}`

    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    })

    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ type: parsed.type, text: parsed.text })
  } catch (error: any) {
    console.error("AI Guess Error:", error?.message)
    return NextResponse.json({
      type: "question",
      text: lang === 'RU' ? "Это предмет или живое существо?" : "Is it an object or a living thing?"
    })
  }
}