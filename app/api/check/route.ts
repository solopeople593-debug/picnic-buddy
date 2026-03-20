import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@supabase/supabase-js"

// Создаем клиент Supabase (используем Service Role Key если есть, или ANON)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getKeys(): string[] {
  // Приоритет ключу без S, так как в Vercel он основной
  const keysString = process.env.GROQ_API_KEY || process.env.GROQ_API_KEYS || ""
  return keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
}

async function callGroq(keys: string[], prompt: string, temperature = 0.1): Promise<any> {
  for (let i = 0; i < keys.length; i++) {
    try {
      const groq = new Groq({ apiKey: keys[i] })
      return await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: "You are a JSON-only response bot." }, { role: "user", content: prompt }],
        temperature,
        response_format: { type: "json_object" } // ГАРАНТИРУЕТ JSON
      })
    } catch (err: any) {
      console.warn(`Key #${i + 1} failed: ${err?.message}`)
      if (i === keys.length - 1) throw err
    }
  }
}

export async function POST(req: Request) {
  let moveId: string | null = null;
  try {
    const { item, roomCode, lang, needHint } = await req.json()

    // 1. Ищем последний ход этого игрока, который висит в "pending"
    const { data: lastMove } = await supabase
      .from('moves')
      .select('id')
      .eq('room_code', roomCode)
      .eq('item', item.toUpperCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    moveId = lastMove?.id || null

    // 2. Достаем правило комнаты
    const { data: room } = await supabase.from('rooms').select('secret_rule').eq('code', roomCode).single()
    const rule = room?.secret_rule || '???'

    // 3. Собираем контекст для ИИ
    const { data: moves } = await supabase.from('moves').select('item, is_allowed, player_name').eq('room_code', roomCode)
    const hostNames = ['ВЕДУЩИЙ ИИ', 'HOST AI', 'ВЕДУЧИЙ ШІ', 'VADĪTĀJS AI']
    const acceptedWords = moves?.filter(m => m.is_allowed && !hostNames.includes(m.player_name)).map(m => m.item).join(', ') || 'none'

    const prompt = `Strict game "I'm going on a picnic". Language: ${lang}. Rule: "${rule}". Word: "${item}". Accepted: ${acceptedWords}. 
    Return JSON: {"allowed": boolean, "guessed": boolean, "hint": string or null}`

    const keys = getKeys()
    const completion = await callGroq(keys, prompt)
    const result = JSON.parse(completion.choices[0].message.content)

    // !!! ВАЖНЫЙ МОМЕНТ: ОБНОВЛЯЕМ СТАТУС В БАЗЕ !!!
    if (moveId) {
      await supabase
        .from('moves')
        .update({ 
          status: 'approved', 
          is_allowed: result.allowed 
        })
        .eq('id', moveId)
    }

    return NextResponse.json({
      allowed: !!result.allowed,
      guessed: !!result.guessed,
      hint: result.hint || null
    })

  } catch (error: any) {
    console.error("API ERROR:", error)
    // Если всё упало, всё равно пробуем выпустить игрока из "pending", чтобы игра не встала
    if (moveId) {
      await supabase.from('moves').update({ status: 'approved', is_allowed: false }).eq('id', moveId)
    }
    return NextResponse.json({ allowed: false, guessed: false, hint: null }, { status: 200 })
  }
}