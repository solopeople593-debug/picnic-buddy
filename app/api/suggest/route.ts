import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(req: Request) {
  try {
    const { lang, secret } = await req.json()

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompts: any = {
      RU: secret
        ? `Придумай секретное правило для игры "Я беру с собой в поход". 
           Правило должно быть неочевидным, интересным и основанным на свойствах слов или предметов.
           Примеры хороших правил: "Слова с двумя одинаковыми буквами", "Предметы круглой формы", "Слова длиннее 5 букв", "Живые существа".
           Ответь ТОЛЬКО в JSON без markdown: {"suggestion": "твоё правило"}`
        : `Придумай одно интересное правило для игры "Я беру с собой в поход".
           Правило должно быть коротким (до 5 слов) и понятным.
           Ответь ТОЛЬКО в JSON без markdown: {"suggestion": "твоё правило"}`,
      EN: secret
        ? `Create a secret rule for the game "I'm going on a picnic".
           The rule should be non-obvious and interesting, based on word properties or item categories.
           Good examples: "Words with double letters", "Round objects", "Words longer than 5 letters", "Living things".
           Answer ONLY in JSON no markdown: {"suggestion": "your rule"}`
        : `Create one interesting rule for the game "I'm going on a picnic".
           Keep it short (max 5 words) and clear.
           Answer ONLY in JSON no markdown: {"suggestion": "your rule"}`,
      UA: secret
        ? `Придумай секретне правило для гри "Я беру з собою в похід".
           Правило має бути неочевидним та цікавим.
           Відповідай ТІЛЬКИ в JSON без markdown: {"suggestion": "твоє правило"}`
        : `Придумай одне цікаве правило для гри "Я беру з собою в похід".
           Коротко (до 5 слів).
           Відповідай ТІЛЬКИ в JSON без markdown: {"suggestion": "твоє правило"}`,
      LV: secret
        ? `Izdomā slepenu noteikumu spēlei "Es ņemu līdzi".
           Noteikumam jābūt neacīmredzamam un interesantam.
           Atbildi TIKAI JSON bez markdown: {"suggestion": "tavs noteikums"}`
        : `Izdomā vienu interesantu noteikumu spēlei "Es ņemu līdzi".
           Īsi (līdz 5 vārdiem).
           Atbildi TIKAI JSON bez markdown: {"suggestion": "tavs noteikums"}`
    }

    const prompt = prompts[lang] || prompts['RU']
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(text)

    return NextResponse.json({ suggestion: parsed.suggestion })
  } catch (error) {
    console.error("Suggest API Error:", error)

    // Фоллбэк на случай если Gemini упал
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