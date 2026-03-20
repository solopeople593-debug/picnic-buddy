import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  try {
    const { lang, secret } = await req.json()

    const prompts: any = {
      RU: secret
        ? `Придумай секретное правило для игры "Я беру с собой в поход".
ВАЖНО: правило должно быть конкретным, визуальным, однозначным.
ХОРОШИЕ примеры: "Предметы красного цвета", "Слова на букву М", "Животные", "Еда", "Слова из 5 букв", "Предметы из дерева", "Вещи в полоску", "Круглые предметы".
ПЛОХИЕ примеры — НЕ ИСПОЛЬЗУЙ: "Слова на одном выдохе", "Вещи которые делают счастливым", "Абстрактные понятия", "Слова звучащие мягко", "Вещи связанные с природой" (слишком широко).
Правило должно быть таким, чтобы игрок мог его угадать за 10-15 попыток.
Ответь ТОЛЬКО в JSON без markdown: {"suggestion": "твоё правило"}`
        : `Придумай одно конкретное правило для игры "Я беру с собой в поход". До 5 слов. Ответь ТОЛЬКО в JSON: {"suggestion": "правило"}`,
      EN: secret
        ? `Create a secret rule for the game "I'm going on a picnic".
IMPORTANT: rule must be concrete, visual, unambiguous.
GOOD examples: "Red colored items", "Words starting with M", "Animals", "Food items", "Words with 5 letters", "Wooden objects", "Striped things", "Round objects".
BAD examples — DO NOT USE: "Words said in one breath", "Things that make you happy", "Abstract concepts", "Softly sounding words", "Nature related things" (too broad).
Rule must be guessable in 10-15 attempts.
Answer ONLY in JSON no markdown: {"suggestion": "your rule"}`
        : `Create one concrete rule for the game "I'm going on a picnic". Max 5 words. Answer ONLY in JSON: {"suggestion": "rule"}`,
      UA: secret
        ? `Придумай секретне правило для гри "Я беру з собою в похід".
ВАЖЛИВО: правило має бути конкретним, візуальним, однозначним.
ХОРОШІ приклади: "Предмети червоного кольору", "Слова на букву М", "Тварини", "Їжа", "Слова з 5 букв".
ПОГАНІ приклади — НЕ ВИКОРИСТОВУЙ: "Слова на одному видиху", "Абстрактні поняття".
Відповідай ТІЛЬКИ в JSON без markdown: {"suggestion": "твоє правило"}`
        : `Придумай одне конкретне правило. До 5 слів. Відповідай ТІЛЬКИ в JSON: {"suggestion": "правило"}`,
      LV: secret
        ? `Izdomā slepenu noteikumu spēlei "Es ņemu līdzi".
SVARĪGI: noteikumam jābūt konkrētam, vizuālam, nepārprotamam.
LABI piemēri: "Sarkanas krāsas priekšmeti", "Vārdi ar burtu M", "Dzīvnieki", "Pārtika", "Vārdi ar 5 burtiem".
Atbildi TIKAI JSON bez markdown: {"suggestion": "tavs noteikums"}`
        : `Izdomā vienu konkrētu noteikumu. Īsi. Atbildi TIKAI JSON: {"suggestion": "noteikums"}`
    }

    const prompt = prompts[lang] || prompts['RU']
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    })

    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ suggestion: parsed.suggestion })
  } catch (error: any) {
    console.error("Suggest API Error:", error?.message)
    const fallbacks: any = { RU: "Предметы красного цвета", EN: "Red colored items", UA: "Предмети червоного кольору", LV: "Sarkanas krāsas priekšmeti" }
    return NextResponse.json({ suggestion: fallbacks['RU'] })
  }
}