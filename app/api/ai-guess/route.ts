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

    const hostNames = ['ВЕДУЩИЙ ИИ', 'HOST AI', 'ВЕДУЧИЙ ШІ', 'VADĪTĀJS AI']

    const dialogHistory = moves?.map(m => {
      if (hostNames.includes(m.player_name)) {
        return `AI asked: ${m.item}`
      } else {
        return `Player answered: ${m.item}`
      }
    }).join('\n') || 'Game just started.'

    const askedQuestions = moves
      ?.filter(m => hostNames.includes(m.player_name))
      .map(m => m.item.replace('❓ ', '').replace('🎯 ', '').trim())
      .filter(q => q.length > 0)

    const askedCount = askedQuestions?.length || 0
    const askedList = askedQuestions?.join('\n- ') || 'none'

    const prompt = `You are playing Akinator. Language: ${lang}.
Your goal: guess the SECRET WORD by asking yes/no questions.

=== FULL HISTORY ===
${dialogHistory}

=== QUESTIONS YOU ALREADY ASKED (${askedCount} total) ===
- ${askedList}

=== YOUR NEXT ACTION ===
${askedCount >= 6
  ? `You have asked ${askedCount} questions already. Try to make a GUESS now based on all answers.`
  : `Ask question #${askedCount + 1}. It MUST be completely different from all ${askedCount} questions above.`
}

STRICT RULES:
- If the list above contains "Это предмет или живое существо" or "Is it a living thing" or similar — DO NOT ask it again
- Each question must explore a NEW property: size, color, material, where found, how used, shape, taste, etc.
- Questions must be short (under 10 words)
- NEVER reword or rephrase a question already asked

Respond ONLY in JSON: {"type": "question" or "guess", "text": "your question or guess in ${lang}"}`

    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    })

    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ type: parsed.type, text: parsed.text })
  } catch (error: any) {
    console.error("AI Guess Error:", error?.message)
    return NextResponse.json({
      type: "question",
      text: lang === 'RU' ? "Это больше человека?" : lang === 'UA' ? "Це більше за людину?" : "Is it bigger than a human?"
    })
  }
}