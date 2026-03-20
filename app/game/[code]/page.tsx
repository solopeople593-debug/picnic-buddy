'use client'
import { useState, useEffect, use as useReact } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'

type SupportedLangs = 'RU' | 'EN' | 'UA' | 'LV';

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = useReact(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const langParam = searchParams.get('lang') || 'RU'
  const lang = (['RU', 'EN', 'UA', 'LV'].includes(langParam) ? langParam : 'RU') as SupportedLangs
  
  const mode = searchParams.get('mode') // 'solo', 'manual', 'ai_host'
  const sub = searchParams.get('sub') // 'hardcore', 'assist'

  const [moves, setMoves] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [lives, setLives] = useState(3)
  const [isHost, setIsHost] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [hasSurrendered, setHasSurrendered] = useState(false)
  const [isSpilled, setIsSpilled] = useState(false)
  const [revealReason, setRevealReason] = useState('???') // Дефолт, чтобы не было пусто
  const [playerName, setPlayerName] = useState('')

  // Полный объект локализации, включая финал
  const translations: Record<SupportedLangs, any> = {
    RU: { placeholder: "Я БЕРУ С СОБОЙ...", surrender: "СДАТЬСЯ", spilled: "ТЫ ПРОЛИЛ ЛИМОНАД!", finish: "ФИНИШ!", concept: "КОНЦЕПТ ПОХОДА БЫЛ:", menu: "В ГЛАВНОЕ МЕНЮ", hostName: "ВЕДУЩИЙ ИИ" },
    EN: { placeholder: "I'M TAKING...", surrender: "SURRENDER", spilled: "YOU SPILLED LEMONADE!", finish: "FINISHED!", concept: "THE CONCEPT WAS:", menu: "MAIN MENU", hostName: "HOST AI" },
    UA: { placeholder: "Я БЕРУ З СОБОЮ...", surrender: "ЗДАТИСЯ", spilled: "ТИ ПРОЛИВ ЛИМОНАД!", finish: "ФІНІШ!", concept: "КОНЦЕПТ ПОХОДУ БУВ:", menu: "В ГОЛОВНЕ МЕНЮ", hostName: "ВЕДУЧИЙ ШІ" },
    LV: { placeholder: "ES ŅEMU LĪDZI...", surrender: "PADOTIES", spilled: "TU IZLĒJI LIMONĀDI!", finish: "FINIŠS!", concept: "PĀRGĀJIENA KONCEPTS BIJA:", menu: "UZ ГЛАВНОЕ ИЗВЕРТНИ", hostName: "VADĪTĀJS AI" }
  }
  const t = translations[lang]

  useEffect(() => {
    if (!code) return
    const name = localStorage.getItem('picnic_player_name') || 'Guest'
    const hostStatus = localStorage.getItem('picnic_is_host') === 'true'
    setPlayerName(name)
    setIsHost(hostStatus)

    // ПОДПИСКА НА ОБНОВЛЕНИЯ (РЕАЛТАЙМ)
    const channel = supabase.channel(`game-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMoves(prev => [...prev, payload.new])
          // Если это мануал и ты хост, а сообщение от другого игрока -> помечаем pending
          if (mode === 'manual' && hostStatus && payload.new.player_name !== name && payload.new.status === 'pending') {
             // TS ворнинг тут ок
          }
        }
        if (payload.eventType === 'UPDATE') {
          setMoves(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (p) => {
        if (p.new.status === 'finished') setIsGameOver(true)
        if (p.new.secret_rule) setRevealReason(p.new.secret_rule)
      })
      .subscribe()

    // НАЧАЛЬНАЯ ЗАГРУЗКА (Принудительно забираем правило и ходы)
    supabase.from('rooms').select('*').eq('code', code).single().then(({ data }) => {
      if (data) {
        setRevealReason(data.secret_rule || '???')
        if (data.status === 'finished') setIsGameOver(true)
      }
    })
    
    supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true }).then(({ data }) => {
      if (data) setMoves(data)
    })

    return () => { supabase.removeChannel(channel) }
  }, [code, mode])

  const handleSend = async () => {
    if (!inputValue.trim() || isGameOver || isSpilled || code === 'undefined') return
    const text = inputValue.trim().toUpperCase()
    setInputValue('')

    // Вставляем ход игрока
    const { data: move, error } = await supabase.from('moves').insert([{
      room_code: code,
      player_name: playerName,
      item: text,
      status: (mode === 'solo' || mode === 'ai_host') ? 'approved' : 'pending',
      is_allowed: true // По умолчанию, ИИ проверит ниже
    }]).select().single()

    if (error) return console.error(error)

    // Если ИИ судит (Solo или AI Host)
    if ((mode === 'solo' || mode === 'ai_host') && move) {
      const res = await fetch('/api/check', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: text, roomCode: code, lang, needHint: true }) 
      })
      const result = await res.json()
      
      // 1. Обновляем результат игрока
      await supabase.from('moves').update({ is_allowed: result.allowed }).eq('id', move.id)
      
      // 2. ИИ ДАЕТ СВОЕ СЛОВО (Обязательный ход хоста в режиме ИИ)
      if (result.hint) {
        await supabase.from('moves').insert([{
          room_code: code,
          player_name: t.hostName,
          item: result.hint,
          status: 'approved',
          is_allowed: true
        }])
      }

      if (!result.allowed) {
        setLives(l => {
          const newLives = l - 1
          if (newLives <= 0) {
            if (mode === 'solo') {
              setIsGameOver(true)
              supabase.from('rooms').update({ status: 'finished' }).eq('code', code).then(() => {})
            } else {
              setIsSpilled(true)
              setTimeout(() => { setIsSpilled(false); setLives(3); }, 8000)
            }
            return 0
          }
          return newLives
        })
      }
    }
  }

  const judge = async (id: string, allowed: boolean) => {
    await supabase.from('moves').update({ status: 'approved', is_allowed: allowed }).eq('id', id)
  }

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col p-6 relative font-sans overflow-hidden">
      
      {/* HEADER (Твой дизайн) */}
      <div className="flex justify-between items-center z-10">
        <h1 className="font-black text-2xl text-[#1A5319]">🧺 {code}</h1>
        {!(mode === 'manual' && isHost) && (
          <div className="flex gap-4 items-center">
             <div className="flex gap-1">
               {[...Array(lives)].map((_, i) => <span key={i} className="text-xl">🍋</span>)}
             </div>
             <button onClick={() => setHasSurrendered(true)} className="text-[10px] font-black opacity-30 uppercase tracking-tighter transition-opacity hover:opacity-100">{t.surrender}</button>
          </div>
        )}
      </div>

      {/* MESSAGES LIST (Твой дизайн) */}
      <div className="flex-1 overflow-y-auto space-y-4 py-8 pb-40 no-scrollbar">
        {moves.map((m, i) => (
          <div key={m.id || i} className={`flex flex-col ${m.player_name === playerName ? 'items-end' : 'items-start'}`}>
            <div className={`p-4 rounded-[25px] max-w-[80%] shadow-sm relative ${m.player_name === playerName ? 'bg-black text-white' : (m.player_name === t.hostName ? 'bg-green-100 text-green-900 border-2 border-green-200' : 'bg-white text-black')}`}>
              
              {/* Иконка результата (История попыток) */}
              {m.status === 'approved' && (
                <div className={`absolute -top-1 ${m.player_name === playerName ? '-left-2' : '-right-2'} text-[10px] bg-white rounded-full shadow-md w-5 h-5 flex items-center justify-center`}>
                  {m.is_allowed ? '✅' : '❌'}
                </div>
              )}

              <p className="text-[8px] font-bold opacity-40 mb-1 uppercase tracking-widest">{m.player_name}</p>
              <p className={`font-bold italic ${m.status === 'approved' && !m.is_allowed ? 'line-through opacity-30' : ''}`}>"{m.item}"</p>
              
              {/* Кнопки судьи (только для Хоста в режиме Manual) */}
              {isHost && mode === 'manual' && m.status === 'pending' && m.player_name !== playerName && (
                <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                  <button onClick={() => judge(m.id, true)} className="bg-green-500 text-white px-3 py-1.5 rounded-full text-[9px] font-black">✅ OK</button>
                  <button onClick={() => judge(m.id, false)} className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[9px] font-black">❌ NO</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {/* MADE BY SOLO */}
        <div className="pt-10 pb-4 text-center opacity-10 pointer-events-none">
          <p className="text-[9px] font-black uppercase tracking-[0.3em]">MADE BY SOLO</p>
        </div>
      </div>

      {/* INPUT BAR (Твой дизайн) */}
      {!hasSurrendered && !isGameOver && (
        <div className="fixed bottom-8 left-6 right-6 flex gap-2 z-40">
          <input 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isSpilled}
            className="flex-1 bg-white p-5 rounded-[22px] shadow-2xl font-bold outline-none border-none ring-offset-2 focus:ring-2 ring-green-300 transition-all disabled:opacity-50" 
            placeholder={isSpilled ? t.spilled : t.placeholder} 
          />
          <button 
            onClick={handleSend} 
            disabled={!inputValue.trim() || isSpilled}
            className="w-16 h-16 bg-[#22C55E] rounded-[22px] shadow-xl flex items-center justify-center text-2xl active:scale-95 transition-all disabled:grayscale disabled:opacity-50"
          >
            🧺
          </button>
        </div>
      )}

      {/* REVEAL OVERLAY (Твой дизайн + Локализация и Фикс правила) */}
      <AnimatePresence>
        {(hasSurrendered || isGameOver) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-[#F0FFF4]/95 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#1A5319] text-white p-10 rounded-[40px] text-center space-y-6 shadow-2xl border-4 border-white/10 w-full max-w-sm">
              <h2 className="text-4xl font-black italic">{isGameOver ? t.finish : t.surrender}</h2>
              <div className="space-y-1">
                <p className="opacity-40 text-[9px] uppercase font-bold tracking-[0.2em]">{t.concept}</p>
                <p className="text-2xl font-bold italic underline decoration-green-400 decoration-2 underline-offset-4 mt-2">"{revealReason}"</p>
              </div>
              <button onClick={() => router.push('/')} className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-[10px] tracking-widest hover:bg-gray-100 transition-colors">{t.menu}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEMONADE OVERLAY (Твой дизайн) */}
      <AnimatePresence>
        {isSpilled && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-yellow-400/90 flex items-center justify-center p-10 text-center backdrop-blur-sm">
            <div className="text-yellow-900 font-black uppercase italic space-y-4">
              <span className="text-9xl block animate-bounce">🥤</span>
              <p className="text-3xl leading-tight drop-shadow-sm">{t.spilled}</p>
              <p className="text-[10px] opacity-60 tracking-widest">Пропуск хода (8 сек)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}