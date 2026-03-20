import { NextResponse } from "next/server"
import Groq from "groq-sdk"

function getGroq(): Groq {
  const keysString = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || ""
  const keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
  const key = keys[Math.floor(Math.random() * keys.length)]
  return new Groq({ apiKey: key })
}

export async function POST(req: Request) {
  try {
    const { lang, secret, difficulty = 'easy' } = await req.json()

    // Случайная категория чтобы не повторяться
    const categories = [
      'letter/alphabet based', 'color based', 'material based',
      'shape based', 'size based', 'category of objects',
      'where you find it', 'number of letters in word', 'starts/ends with letter'
    ]
    const randomCategory = categories[Math.floor(Math.random() * categories.length)]

    const difficultyPrompts: any = {
      easy: {
        RU: `ЛЁГКИЙ: одно простое слово-категория. Примеры: "Еда", "Животные", "Красные предметы", "Слова на букву А", "Металлические предметы", "Круглые вещи", "Предметы синего цвета".`,
        EN: `EASY: one simple word-category. Examples: "Food", "Animals", "Red items", "Words starting with A", "Metal objects", "Round things", "Blue colored items".`,
        UA: `ЛЕГКИЙ: одне просте слово-категорія. Приклади: "Їжа", "Тварини", "Червоні предмети", "Слова на букву А", "Металеві предмети".`,
        LV: `VIEGLS: viens vienkāršs vārds-kategorija. Piemēri: "Pārtika", "Dzīvnieki", "Sarkani priekšmeti", "Vārdi ar burtu A".`,
      },
      medium: {
        RU: `СРЕДНИЙ: словосочетание 2-3 слова. Примеры: "Предметы с ручкой", "Слова из 5 букв", "Вещи синего цвета", "Предметы мягкие на ощупь", "Вещи которые светятся", "Предметы из стекла", "Вещи с колёсами".`,
        EN: `MEDIUM: 2-3 word phrase. Examples: "Items with a handle", "5-letter words", "Soft textured items", "Things that glow", "Glass objects", "Things with wheels", "Items found in kitchen".`,
        UA: `СЕРЕДНІЙ: словосполучення 2-3 слова. Приклади: "Предмети з ручкою", "Слова з 5 букв", "М'які предмети", "Речі що світяться".`,
        LV: `VIDĒJS: 2-3 vārdu frāze. Piemēri: "Priekšmeti ar rokturi", "5 burtu vārdi", "Mīksti priekšmeti", "Lietas kas spīd".`,
      },
      hard: {
        RU: `СЛОЖНЫЙ: хитрое нестандартное правило. Примеры: "Слова где первая и последняя буква одинаковые", "Предметы которые есть в каждом доме но их не замечают", "Слова содержащие название животного", "Вещи которые бывают и большими и маленькими", "Предметы которые можно найти на кухне и в гараже".`,
        EN: `HARD: tricky unusual rule. Examples: "Words where first and last letter are the same", "Items found in every home but rarely noticed", "Words containing an animal name", "Things that can be both big and small", "Items found in both kitchen and garage".`,
        UA: `СКЛАДНИЙ: хитре нестандартне правило. Приклади: "Слова де перша і остання буква однакові", "Предмети що є в кожному домі але їх не помічають", "Слова що містять назву тварини".`,
        LV: `GRŪTS: viltīgs neparasts noteikums. Piemēri: "Vārdi kur pirmais un pēdējais burts ir vienādi", "Priekšmeti katrās mājās bet reti pamanīti".`,
      }
    }

    const diffDesc = difficultyPrompts[difficulty]?.[lang] || difficultyPrompts['easy']['RU']

    const prompts: any = {
      RU: secret
        ? `Ты ведущий игры "Я беру с собой в поход". Придумай УНИКАЛЬНОЕ секретное правило.
СЛОЖНОСТЬ: ${diffDesc}
КАТЕГОРИЯ ДЛЯ ВДОХНОВЕНИЯ: ${randomCategory}
КОНТЕКСТ: игроки называют предметы на пикник. Правило о ПРЕДМЕТАХ или СЛОВАХ.
НЕ ИСПОЛЬЗУЙ: советы, мотивацию, действия, абстракции.
ИЗБЕГАЙ БАНАЛЬНЫХ: животные, фрукты, еда в общем — придумай что-то оригинальнее.
Ответь ТОЛЬКО в JSON: {"suggestion": "правило"}`
        : `Придумай оригинальное правило для пикник-игры. ${diffDesc} ТОЛЬКО JSON: {"suggestion": "правило"}`,
      EN: secret
        ? `You host "I'm going on a picnic". Create a UNIQUE secret rule.
DIFFICULTY: ${diffDesc}
INSPIRATION CATEGORY: ${randomCategory}
CONTEXT: players name picnic items. Rule is about ITEMS or WORDS.
AVOID: advice, motivation, actions, abstractions.
AVOID BORING: generic animals, fruits, food — be more original.
Answer ONLY in JSON: {"suggestion": "rule"}`
        : `Create an original rule for picnic game. ${diffDesc} ONLY JSON: {"suggestion": "rule"}`,
      UA: secret
        ? `Ти ведучий гри "Я беру з собою в похід". Придумай УНІКАЛЬНЕ секретне правило.
СКЛАДНІСТЬ: ${diffDesc}
КАТЕГОРІЯ ДЛЯ НАТХНЕННЯ: ${randomCategory}
Правило про ПРЕДМЕТИ або СЛОВА. НЕ поради, дії, абстракції.
УНИКАЙ БАНАЛЬНИХ: тварини, фрукти — будь оригінальнішим.
Відповідай ТІЛЬКИ в JSON: {"suggestion": "правило"}`
        : `Придумай оригінальне правило для гри про пікнік. ${diffDesc} ТІЛЬКИ JSON: {"suggestion": "правило"}`,
      LV: secret
        ? `Tu esi spēles vadītājs. Izdomā UNIKĀLU slepenu noteikumu.
GRŪTĪBA: ${diffDesc}
Noteikumam jābūt par PRIEKŠMETIEM vai VĀRDIEM. Ne padomi, darbības.
Atbildi TIKAI JSON: {"suggestion": "noteikums"}`
        : `Izdomā oriģinālu noteikumu piknika spēlei. ${diffDesc} TIKAI JSON: {"suggestion": "noteikums"}`
    }

    const prompt = prompts[lang] || prompts['RU']
    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: difficulty === 'hard' ? 0.95 : 0.85,
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