import { NextResponse } from "next/server"
import Groq from "groq-sdk"

function getKeys(): string[] {
  const keysString = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || ""
  return keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
}

async function callGroq(keys: string[], prompt: string, temperature = 0.95): Promise<any> {
  for (let i = 0; i < keys.length; i++) {
    try {
      const groq = new Groq({ apiKey: keys[i] })
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a JSON-only response bot. Never add text outside JSON." },
          { role: "user", content: prompt }
        ],
        temperature,
        response_format: { type: "json_object" }
      })
      return completion
    } catch (err: any) {
      console.warn(`Suggest key #${i + 1} failed: ${err?.message}`)
      if (i === keys.length - 1) throw err
    }
  }
}

export async function POST(req: Request) {
  try {
    const { lang, secret, difficulty = 'easy' } = await req.json()

    // Большой пул категорий для разнообразия
    const categories = [
      'letter pattern (starts with, ends with, contains, double letters)',
      'physical property (color, size, weight, texture, temperature)',
      'material (wood, metal, glass, plastic, fabric, rubber)',
      'location (where found, where used, indoor/outdoor)',
      'function (what it does, how it is used)',
      'sensory (smell, sound, taste, feel)',
      'quantity (number of syllables, letters, legs, wheels)',
      'time (used in morning, seasonal, ancient vs modern)',
      'cultural (found in specific country, sport, music)',
      'abstract pattern (palindrome, rhymes with, anagram)',
      'combination rules (two properties at once)',
      'unexpected/surprising category',
      'body-related (worn, held, touched)',
      'nature vs man-made',
      'things you would NOT expect on a picnic',
      'things that exist in pairs',
      'things that can be both verb and noun',
      'things associated with childhood',
      'things that make a sound',
      'things that float or sink'
    ]
    const randomCategory = categories[Math.floor(Math.random() * categories.length)]
    const randomCategory2 = categories[Math.floor(Math.random() * categories.length)]

    const difficultyPrompts: any = {
      easy: {
        RU: `ЛЁГКИЙ уровень. Правило должно быть простым и очевидным после 3-5 подсказок.
Примеры хороших лёгких правил:
- "Предметы красного цвета"
- "Животные с четырьмя лапами"  
- "Слова на букву М"
- "Вещи из металла"
- "Еда которую едят холодной"
- "Предметы круглой формы"
- "Вещи которые можно найти в кармане"
- "Предметы мягкие на ощупь"
Придумай что-то в этом духе, но НОВОЕ и ОРИГИНАЛЬНОЕ.`,
        EN: `EASY level. Rule should be simple and obvious after 3-5 hints.
Good easy rule examples:
- "Red colored items"
- "Animals with four legs"
- "Words starting with M"
- "Things made of metal"
- "Food eaten cold"
- "Round shaped objects"
- "Things found in a pocket"
- "Soft textured items"
Create something in this spirit but NEW and ORIGINAL.`,
        UA: `ЛЕГКИЙ рівень. Правило має бути простим і очевидним після 3-5 підказок.
Приклади хороших легких правил:
- "Предмети червоного кольору"
- "Тварини з чотирма лапами"
- "Слова на букву М"
- "Речі з металу"
- "Їжа яку їдять холодною"
Придумай щось нове та оригінальне.`,
        LV: `VIEGLS līmenis. Noteikumam jābūt vienkāršam.
Piemēri: "Sarkani priekšmeti", "Dzīvnieki ar četrām kājām", "Metāla priekšmeti"
Izdomā kaut ko jaunu un oriģinālu.`,
      },
      medium: {
        RU: `СРЕДНИЙ уровень. Правило не очевидно сразу, требует 5-8 подсказок.
Примеры хороших средних правил:
- "Слова из ровно пяти букв"
- "Предметы которые есть в каждой кухне"
- "Вещи которые бывают разных размеров"
- "Предметы с дырками"
- "Вещи которые можно свернуть"
- "Предметы которые шумят"
- "Слова содержащие букву У"
- "Вещи которые можно повесить на стену"
- "Предметы которые нагреваются при использовании"
- "Вещи которые считаются парами (носки, перчатки)"
Придумай что-то в этом духе, ОРИГИНАЛЬНОЕ.`,
        EN: `MEDIUM level. Rule not obvious immediately, needs 5-8 hints.
Good medium rule examples:
- "Words with exactly five letters"
- "Items found in every kitchen"
- "Things that come in different sizes"
- "Objects with holes"
- "Things that can be rolled up"
- "Objects that make noise"
- "Things that come in pairs (socks, gloves)"
- "Items that get warm when used"
Create something ORIGINAL in this spirit.`,
        UA: `СЕРЕДНІЙ рівень. Правило не очевидне відразу, потребує 5-8 підказок.
Приклади: "Слова рівно з п'яти букв", "Предмети в кожній кухні", "Речі з дірками"
Придумай щось оригінальне.`,
        LV: `VIDĒJS līmenis. Noteikums nav uzreiz acīmredzams.
Piemēri: "Vārdi ar tieši pieciem burtiem", "Priekšmeti katrā virtuvē", "Lietas ar caurumiem"
Izdomā kaut ko oriģinālu.`,
      },
      hard: {
        RU: `СЛОЖНЫЙ уровень. Правило хитрое, неочевидное, требует много подсказок.
Примеры хороших сложных правил:
- "Слова где первая и последняя буква одинаковые (топот, потоп, казак)"
- "Предметы которые есть в трёх экземплярах у человека (пальцы ног — нет, три зуба — нет, три пуговицы — возможно)"
- "Слова содержащие название цвета (кРАСный — содержит РАС? нет... СИНица, ЗЕЛЕНь)"
- "Вещи которые были изобретены до нашей эры"
- "Предметы название которых является palindромом"
- "Слова которые читаются одинаково в обе стороны"
- "Вещи которые становятся другим словом если прочитать их наоборот"
- "Предметы в названии которых спрятано имя"
- "Вещи которые упоминаются в пословицах"
- "Предметы которые люди боятся потерять"
Придумай что-то ДЕЙСТВИТЕЛЬНО сложное и нестандартное.`,
        EN: `HARD level. Rule is tricky, non-obvious, needs many hints.
Good hard rule examples:
- "Words where first and last letter are the same (level, radar, kayak)"
- "Things invented before 0 AD"
- "Words that are palindromes"
- "Things that become a different word when read backwards"
- "Objects whose name contains a hidden name"
- "Things mentioned in proverbs"
- "Words containing a color name within them"
- "Things people are afraid to lose"
- "Objects that exist in exactly 2 in a standard home"
Create something GENUINELY tricky and non-standard.`,
        UA: `СКЛАДНИЙ рівень. Правило хитре, неочевидне.
Приклади: "Слова де перша і остання буква однакові", "Речі винайдені до нашої ери"
Придумай щось дійсно складне.`,
        LV: `GRŪTS līmenis. Viltīgs, neacīmredzams noteikums.
Piemēri: "Vārdi kur pirmais un pēdējais burts vienādi", "Lietas izgudrotas pirms mūsu ēras"
Izdomā kaut ko patiešām sarežģītu.`,
      }
    }

    const diffDesc = difficultyPrompts[difficulty]?.[lang] || difficultyPrompts['easy']['RU']

    const prompts: any = {
      RU: secret
        ? `Ты ведущий игры "Я беру с собой в поход". Придумай УНИКАЛЬНОЕ и ИНТЕРЕСНОЕ секретное правило.

${diffDesc}

КАТЕГОРИИ ДЛЯ ВДОХНОВЕНИЯ: ${randomCategory}, ${randomCategory2}

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:
- Правило должно быть про ПРЕДМЕТЫ или СЛОВА (не про действия, не про людей)
- Должно быть ОДНОЗНАЧНЫМ — ведущий может чётко сказать "да" или "нет" на любой предмет
- Должно быть ПРОВЕРЯЕМЫМ без интернета
- НЕ ПОВТОРЯЙ банальные: еда, животные, фрукты, овощи, транспорт — если только с неожиданным углом
- Будь КРЕАТИВНЫМ: удиви игроков необычным правилом

Ответь ТОЛЬКО в JSON: {"suggestion": "правило одной строкой"}`
        : `Придумай оригинальное правило для пикник-игры. ${diffDesc} ТОЛЬКО JSON: {"suggestion": "правило"}`,

      EN: secret
        ? `You host "I'm going on a picnic". Create a UNIQUE and INTERESTING secret rule.

${diffDesc}

INSPIRATION CATEGORIES: ${randomCategory}, ${randomCategory2}

REQUIREMENTS:
- Rule must be about ITEMS or WORDS (not actions, not people)
- Must be UNAMBIGUOUS — host can clearly say yes/no to any item
- Must be VERIFIABLE without internet
- DON'T repeat clichés: food, animals, fruits, vegetables, transport — unless with unexpected twist
- Be CREATIVE: surprise players with an unusual rule

Answer ONLY in JSON: {"suggestion": "rule in one line"}`
        : `Create an original rule for picnic game. ${diffDesc} ONLY JSON: {"suggestion": "rule"}`,

      UA: secret
        ? `Ти ведучий гри "Я беру з собою в похід". Придумай УНІКАЛЬНЕ та ЦІКАВЕ секретне правило.

${diffDesc}

КАТЕГОРІЇ ДЛЯ НАТХНЕННЯ: ${randomCategory}, ${randomCategory2}

ВИМОГИ:
- Правило про ПРЕДМЕТИ або СЛОВА
- ОДНОЗНАЧНЕ — можна чітко сказати "так" або "ні"
- ПЕРЕВІРНЕ без інтернету
- Будь КРЕАТИВНИМ

Відповідай ТІЛЬКИ в JSON: {"suggestion": "правило одним рядком"}`
        : `Придумай оригінальне правило для гри про пікнік. ${diffDesc} ТІЛЬКИ JSON: {"suggestion": "правило"}`,

      LV: secret
        ? `Tu esi spēles "Es ņemu līdzi" vadītājs. Izdomā UNIKĀLU un INTERESANTU slepenu noteikumu.

${diffDesc}

IEDVESMAS KATEGORIJAS: ${randomCategory}, ${randomCategory2}

PRASĪBAS:
- Noteikums par PRIEKŠMETIEM vai VĀRDIEM
- NEPĀRPROTAMS — var skaidri teikt "jā" vai "nē"
- PĀRBAUDĀMS bez interneta
- Esi RADOŠS

Atbildi TIKAI JSON: {"suggestion": "noteikums vienā rindā"}`
        : `Izdomā oriģinālu noteikumu piknika spēlei. ${diffDesc} TIKAI JSON: {"suggestion": "noteikums"}`,
    }

    const prompt = prompts[lang] || prompts['RU']
    const keys = getKeys()
    const temperature = difficulty === 'hard' ? 0.98 : difficulty === 'medium' ? 0.92 : 0.88
    const completion = await callGroq(keys, prompt, temperature)

    const parsed = JSON.parse(completion.choices[0].message.content)
    return NextResponse.json({ suggestion: parsed.suggestion })

  } catch (error: any) {
    console.error("Suggest API Error:", error?.message)
    const fallbacks: any = {
      RU: "Предметы у которых есть дырка",
      EN: "Items that have a hole in them",
      UA: "Предмети у яких є дірка",
      LV: "Priekšmeti ar caurumu"
    }
    const { lang = 'RU' } = await req.json().catch(() => ({}))
    return NextResponse.json({ suggestion: fallbacks[lang] || fallbacks.RU })
  }
}