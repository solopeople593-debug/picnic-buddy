import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  try {
    const { lang, secret } = await req.json()

    const prompts: any = {
      RU: secret
        ? `Придумай секретное правило для игры "Я беру с собой в поход". Правило должно быть неочевидным и интересным. Примеры: "Слова с двумя одинаковыми буквами", "Предметы круглой формы", "Слова длиннее 5 букв". Ответь ТОЛЬКО в JSON без markdown: {"suggestion": "твоё правило"}`
        : `Придумай одно интересное правило для игры "Я беру с собой в поход". Коротко (до 5 слов). Ответь ТОЛЬКО в JSON без markdown: {"suggestion": "твоё правило"}`,
      EN: secret
        ? `Create a secret rule for the game "I'm going on a picnic". Should be non-obvious and interesting. Examples: "Words with double letters", "Round objects", "Words longer than 5 letters". Answer ONLY in JSON no markdown: {"suggestion": "your rule"}`
        : `Create one interesting rule for the game "I'm going on a picnic". Keep it short (max 5 words). Answer ONLY in JSON no markdown: {"suggestion": "your rule"}`,
      UA: secret
        ? `Придумай секретне правило для гри "Я беру з собою в похід". Має бути неочевидним. Відповідай ТІЛЬКИ в JSON без markdown: {"suggestion": "твоє правило"}`
        : `Придумай одне цікаве правило для гри "Я беру з собою в похід". Коротко. Відповідай ТІЛЬКИ в JSON без markdown: {"suggestion": "твоє правило"}`,
      LV: secret
        ? `Izdomā slepenu noteikumu spēlei "Es ņemu līdzi". Tam jābūt neacīmredzamam. Atbildi TIKAI JSON bez markdown: {"suggestion": "tavs noteikums"}`
        : `Izdomā vienu interesantu noteikumu spēlei "Es ņemu līdzi". Īsi. Atbildi TIKAI JSON bez markdown: {"suggestion": "tavs noteikums"}`
    }

    const prompt = prompts[lang] || prompts['RU']

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
    })

    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ suggestion: parsed.suggestion })
  } catch (error: any) {
    console.error("Suggest API Error:", error?.message)
    const fallbacks: any = {
      RU: "Слова с двумя одинаковыми буквами",
      EN: "Words with double letters",
      UA: "Слова з двома однаковими буквами",
      LV: "Vārdi ar diviem vienādiem burtiem"
    }
    const { lang } = await req.json().catch(() => ({ lang: 'RU' }))
    return NextResponse.json({ suggestion: fallbacks[lang] || fallbacks['RU'] })
  }
}