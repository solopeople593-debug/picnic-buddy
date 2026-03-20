import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  try {
    const { lang, secret } = await req.json()

    const prompts: any = {
      RU: secret
        ? `Ты ведущий игры "Я беру с собой в поход". Придумай секретное правило для этой игры.
КОНТЕКСТ: игроки называют предметы которые берут на пикник или в поход. Правило должно быть о ПРЕДМЕТАХ или СЛОВАХ, а не о действиях или абстракциях.
ХОРОШИЕ примеры: "Предметы красного цвета", "Слова на букву К", "Вещи из металла", "Еда", "Животные", "Предметы с ручкой", "Круглые предметы", "Слова из 5 букв".
ПЛОХИЕ примеры — НЕ ИСПОЛЬЗУЙ: "Вставай рано", "Будь счастлив", "Думай позитивно", "Абстрактные понятия", любые действия или советы.
Правило должно быть конкретным, угадываемым за 10-15 попыток, связанным с предметами или буквами.
Ответь ТОЛЬКО в JSON без markdown: {"suggestion": "правило"}`
        : `Придумай короткое конкретное правило для игры про пикник. О предметах или буквах. До 5 слов. ТОЛЬКО JSON: {"suggestion": "правило"}`,
      EN: secret
        ? `You are the host of "I'm going on a picnic" game. Create a secret rule.
CONTEXT: players name items they would bring to a picnic. Rule must be about ITEMS or WORDS, not actions or abstract concepts.
GOOD examples: "Red colored items", "Words starting with K", "Metal objects", "Food items", "Animals", "Items with a handle", "Round objects", "5-letter words".
BAD examples — DO NOT USE: "Wake up early", "Be happy", "Think positive", "Abstract concepts", any actions or life advice.
Rule must be concrete, guessable in 10-15 tries, related to physical items or word properties.
Answer ONLY in JSON no markdown: {"suggestion": "rule"}`
        : `Create a short concrete rule for a picnic game. About items or letters. Max 5 words. ONLY JSON: {"suggestion": "rule"}`,
      UA: secret
        ? `Ти ведучий гри "Я беру з собою в похід". Придумай секретне правило.
КОНТЕКСТ: гравці називають предмети які беруть на пікнік. Правило має бути про ПРЕДМЕТИ або СЛОВА, не про дії чи абстракції.
ХОРОШІ приклади: "Предмети червоного кольору", "Слова на букву К", "Речі з металу", "Їжа", "Тварини", "Предмети з ручкою", "Круглі предмети".
ПОГАНІ приклади — НЕ ВИКОРИСТОВУЙ: "Вставай рано", "Будь щасливий", абстрактні поняття, поради.
Відповідай ТІЛЬКИ в JSON без markdown: {"suggestion": "правило"}`
        : `Придумай коротке конкретне правило для гри про пікнік. Про предмети або букви. До 5 слів. ТІЛЬКИ JSON: {"suggestion": "правило"}`,
      LV: secret
        ? `Tu esi spēles "Es ņemu līdzi" vadītājs. Izdomā slepenu noteikumu.
KONTEKSTS: spēlētāji nosauc priekšmetus ko ņemtu piknikā. Noteikumam jābūt par PRIEKŠMETIEM vai VĀRDIEM, ne par darbībām vai abstrakcijām.
LABI piemēri: "Sarkanas krāsas priekšmeti", "Vārdi ar burtu K", "Metāla priekšmeti", "Pārtika", "Dzīvnieki", "Apaļi priekšmeti".
SLIKTI piemēri — NEIZMANTO: "Celies agri", "Esi laimīgs", abstrakti jēdzieni, padomi.
Atbildi TIKAI JSON bez markdown: {"suggestion": "noteikums"}`
        : `Izdomā īsu konkrētu noteikumu piknika spēlei. Par priekšmetiem vai burtiem. Max 5 vārdi. TIKAI JSON: {"suggestion": "noteikums"}`
    }

    const prompt = prompts[lang] || prompts['RU']
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    })

    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ suggestion: parsed.suggestion })
  } catch (error: any) {
    console.error("Suggest API Error:", error?.message)
    const fallbacks: any = {
      RU: "Предметы красного цвета",
      EN: "Red colored items",
      UA: "Предмети червоного кольору",
      LV: "Sarkanas krāsas priekšmeti"
    }
    return NextResponse.json({ suggestion: fallbacks['RU'] })
  }
}