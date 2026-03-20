import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  try {
    const { lang, secret, difficulty = 'easy' } = await req.json()

    const difficultyPrompts: any = {
      easy: {
        RU: 'ЛЁГКИЙ уровень: одно простое слово-категория. Примеры: "Еда", "Животные", "Красные предметы", "Слова на букву А", "Металлические предметы".',
        EN: 'EASY level: one simple word-category. Examples: "Food", "Animals", "Red items", "Words starting with A", "Metal objects".',
        UA: 'ЛЕГКИЙ рівень: одне просте слово-категорія. Приклади: "Їжа", "Тварини", "Червоні предмети", "Слова на букву А".',
        LV: 'VIEGLS līmenis: viens vienkāršs vārds-kategorija. Piemēri: "Pārtika", "Dzīvnieki", "Sarkani priekšmeti".',
      },
      medium: {
        RU: 'СРЕДНИЙ уровень: словосочетание 2-3 слова. Примеры: "Предметы с ручкой", "Слова из 5 букв", "Вещи синего цвета", "Предметы мягкие на ощупь", "Вещи которые светятся".',
        EN: 'MEDIUM level: 2-3 word phrase. Examples: "Items with a handle", "5-letter words", "Blue colored things", "Soft textured items", "Things that glow".',
        UA: 'СЕРЕДНІЙ рівень: словосполучення 2-3 слова. Приклади: "Предмети з ручкою", "Слова з 5 букв", "Речі синього кольору".',
        LV: 'VIDĒJS līmenis: 2-3 vārdu frāze. Piemēri: "Priekšmeti ar rokturi", "5 burtu vārdi", "Zilas krāsas lietas".',
      },
      hard: {
        RU: 'СЛОЖНЫЙ уровень: хитрое нестандартное правило. Примеры: "Слова где первая и последняя буква одинаковые", "Предметы которые есть в каждом доме но их не замечают", "Слова содержащие название животного", "Вещи которые бывают и большими и маленькими".',
        EN: 'HARD level: tricky unusual rule. Examples: "Words where first and last letter are the same", "Items found in every home but rarely noticed", "Words containing an animal name", "Things that can be both big and small".',
        UA: 'СКЛАДНИЙ рівень: хитре нестандартне правило. Приклади: "Слова де перша і остання буква однакові", "Предмети які є в кожному домі але їх не помічають", "Слова що містять назву тварини".',
        LV: 'GRŪTS līmenis: viltīgs neparasts noteikums. Piemēri: "Vārdi kur pirmais un pēdējais burts ir vienādi", "Priekšmeti katrās mājās bet reti pamanīti".',
      }
    }

    const diffDesc = difficultyPrompts[difficulty]?.[lang] || difficultyPrompts['easy']['RU']

    const prompts: any = {
      RU: secret
        ? `Ты ведущий игры "Я беру с собой в поход". Придумай секретное правило для игры.
СЛОЖНОСТЬ: ${diffDesc}
КОНТЕКСТ: игроки называют предметы которые берут на пикник или в поход.
Правило должно быть о ПРЕДМЕТАХ или СЛОВАХ — не о действиях, не о советах, не об абстракциях.
НЕ ИСПОЛЬЗУЙ: мотивацию, советы, действия типа "вставай рано", абстрактные понятия.
Придумай что-то новое, не повторяй банальные примеры.
Ответь ТОЛЬКО в JSON без markdown: {"suggestion": "правило"}`
        : `Придумай одно конкретное правило для игры про пикник. ${diffDesc} Ответь ТОЛЬКО в JSON: {"suggestion": "правило"}`,
      EN: secret
        ? `You are the host of "I'm going on a picnic". Create a secret rule.
DIFFICULTY: ${diffDesc}
CONTEXT: players name items they bring to a picnic.
Rule must be about ITEMS or WORDS — not actions, not advice, not abstractions.
DO NOT USE: motivation, life advice, actions like "wake up early", abstract concepts.
Be creative and original.
Answer ONLY in JSON: {"suggestion": "rule"}`
        : `Create one concrete rule for a picnic game. ${diffDesc} Answer ONLY in JSON: {"suggestion": "rule"}`,
      UA: secret
        ? `Ти ведучий гри "Я беру з собою в похід". Придумай секретне правило.
СКЛАДНІСТЬ: ${diffDesc}
КОНТЕКСТ: гравці називають предмети для пікніка.
Правило має бути про ПРЕДМЕТИ або СЛОВА — не про дії, не про поради.
НЕ ВИКОРИСТОВУЙ: мотивацію, поради, дії, абстрактні поняття.
Відповідай ТІЛЬКИ в JSON: {"suggestion": "правило"}`
        : `Придумай одне конкретне правило для гри про пікнік. ${diffDesc} ТІЛЬКИ JSON: {"suggestion": "правило"}`,
      LV: secret
        ? `Tu esi spēles "Es ņemu līdzi" vadītājs. Izdomā slepenu noteikumu.
GRŪTĪBA: ${diffDesc}
Noteikumam jābūt par PRIEKŠMETIEM vai VĀRDIEM — ne par darbībām vai abstrakcijām.
Atbildi TIKAI JSON: {"suggestion": "noteikums"}`
        : `Izdomā vienu konkrētu noteikumu piknika spēlei. ${diffDesc} TIKAI JSON: {"suggestion": "noteikums"}`
    }

    const prompt = prompts[lang] || prompts['RU']
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: difficulty === 'hard' ? 0.9 : 0.7,
    })

    const text = completion.choices[0].message.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ suggestion: parsed.suggestion })
  } catch (error: any) {
    console.error("Suggest API Error:", error?.message)
    return NextResponse.json({ suggestion: "Предметы красного цвета" })
  }
}