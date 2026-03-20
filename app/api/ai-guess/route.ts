import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@supabase/supabase-js"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  let lang = 'RU'
  try {
    const body = await req.json()
    lang = body.lang || 'RU'
    const roomCode = body.roomCode

    const { data: moves } = await supabase
      .from('moves')
      .select('item, is_allowed')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: true })

    const history = moves?.map(m => `${m.item} → ${m.is_allowed ? 'YES' : 'NO'}`).join('\n') || ''

    const prompt = `You are playing Akinator in language ${lang}. You are trying to guess a SECRET WORD.
Previous questions and answers:
${history || 'None yet.'}

Based on this, either ask ONE smart yes/no question OR make a guess if confident.
- Ask about: category, color, size, material, usage
- Never repeat a question
- Be natural and short

Answer ONLY in JSON: {"type": "question" or "guess", "text": "your question or guess in ${lang}"}`

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    })

    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ type: parsed.type, text: parsed.text })
  } catch (error: any) {
    console.error("AI Guess Error:", error?.message)
    return NextResponse.json({ type: "question", text: lang === 'RU' ? "Это живое существо?" : "Is it a living thing?" })
  }
}