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
  ? `You have asked ${askedCount} questions. Make a GUESS now.`
  : `Ask question #${askedCount + 1}. MUST be different from all ${askedCount} above.`
}

STRICT RULES:
- NEVER repeat any question from the list above
- Each question must explore a NEW property
- Questions must be short (under 10 words)
- If guessing: say the exact word

Respond ONLY in JSON: {"type": "question" or "guess", "text": "your question or guess in ${lang}"}`

    const keys = getKeys()
    const completion = await callGroq(keys, prompt)
    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ type: parsed.type, text: parsed.text })
  } catch (error: any) {
    console.error("AI Guess Error:", error?.message)
    return NextResponse.json({
      type: "question",
      text: lang === 'RU' ? "Это больше кошки?" : lang === 'UA' ? "Це більше за кота?" : "Is it bigger than a cat?"
    })
  }
}