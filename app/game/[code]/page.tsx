'use client'
import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const sub = searchParams.get('sub')
  const lang = searchParams.get('lang') || 'RU'

  const [moves, setMoves] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [lives, setLives] = useState(3)
  const [isSpilled, setIsSpilled] = useState(false)
  const [hasSurrendered, setHasSurrendered] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [revealReason, setRevealReason] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [isHostTurn, setIsHostTurn] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [isSuggesting, setIsSuggesting] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('picnic_player_name') || 'Guest'
    setPlayerName(savedName)
    const hostStatus = localStorage.getItem('picnic_is_host') === 'true'
    setIsHost(hostStatus)
    
    // В Соло нет "очереди хоста", ты просто играешь.
    if (mode === 'solo') {
      setIsHostTurn(false)
    }

    supabase.from('rooms').select('*').eq('code', code).single().then(({ data }) => {
      if (data) {
        setRevealReason(data.secret_rule)
        if (data.status === 'finished') setIsGameOver(true)
      }
    })

    const roomChannel = supabase.channel(`room-${code}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (payload) => {
        if (payload.new.status === 'finished') setIsGameOver(true)
      })
      .subscribe()

    const movesChannel = supabase.channel(`moves-${code}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` }, (payload) => {
        setMoves(prev => [...prev, payload.new])
        // Передача хода хосту в Мультиплеере
        if (mode !== 'solo' && payload.new.player_name !== savedName && hostStatus) setIsHostTurn(true)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` }, (payload) => {
        setMoves(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
      })
      .subscribe()

    supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true }).then(({ data }) => {
      if (data) setMoves(data)
    })

    return () => {
      supabase.removeChannel(roomChannel)
      supabase.removeChannel(movesChannel)
    }
  }, [code, mode])

  // БРОНЕБОЙНАЯ ОТПРАВКА СЛОВА
  const handleSend = async () => {
    if (!inputValue.trim() || isSpilled || hasSurrendered || isGameOver) return
    const text = inputValue.trim().toUpperCase()
    setInputValue('')

    try {
      const { data: newMove, error } = await supabase.from('moves').insert([{
        room_code: code,
        player_name: playerName,
        item: text,
        status: (mode === 'solo' || mode === 'ai_host') ? 'approved' : 'pending',
        is_host_move: isHost && isHostTurn && mode !== 'solo', // Хост дает пример только в MP
        is_allowed: true 
      }]).select().single()

      if (error || !newMove) throw error

      // Если режим судится ИИ (Соло или AI_Host)
      if ((mode === 'solo' || mode === 'ai_host') && !(isHost && isHostTurn && mode !== 'solo')) {
        const res = await fetch('/api/check', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: text, roomCode: code, lang }) 
        })
        
        if (!res.ok) throw new Error('API Check Failed')
        const result = await res.json()
        
        await supabase.from('moves').update({ is_allowed: result.allowed }).eq('id', newMove.id)
        if (!result.allowed) loseLife()
      }
    } catch (e) {
      console.error("Ошибка при отправке:", e)
      // В случае ошибки не отнимаем лимон, просто оставляем сообщение как есть
    } finally {
      if (isHost && isHostTurn && mode !== 'solo') setIsHostTurn(false)
    }
  }

  const loseLife = async () => {
    const next = lives - 1
    setLives(next)
    if (next <= 0) {
      if (mode === 'solo') { 
        setIsGameOver(true)
        await supabase.from('rooms').update({ status: 'finished' }).eq('code', code)
      } else { 
        setIsSpilled(true)
        setTimeout(() => { setIsSpilled(false); setLives(3); }, 8000) 
      }
    }
  }

  // БРОНЕБОЙНЫЙ АССИСТ (Только для хоста внутри игры)
  const assistMe = async () => {
    setIsSuggesting(true)
    try {
      const res = await fetch('/api/suggest_item', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule: revealReason, lang }) 
      })
      if (!res.ok) throw new Error('API Error')
      const data = await res.json()
      setInputValue(data.item)
    } catch (err) {
      setInputValue(lang === 'RU' ? 'ЯБЛОКО' : 'APPLE')
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleSurrender = () => setHasSurrendered(true)

  const Confetti = () => (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <motion.div 
          key={i} className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: ['#22C55E', '#FACC15', '#F87171'][i % 3] }}
          initial={{ x: '50%', y: '50%', opacity: 1 }} 
          animate={{ x: `${Math.random()*100-50}vw`, y: `${Math.random()*100-50}vh`, opacity: 0, rotate: 360 }} 
          transition={{ duration: 2, ease: "easeOut" }} 
        />
      ))}
    </div>
  )

  // Проверка: можно ли сейчас писать?
  // В Соло - можно всегда. В Мульти - если ты не хост (и ждешь хоста) - нельзя.
  const isInputDisabled = isSpilled || (mode !== 'solo' && !isHost && isHostTurn)

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col p-6 relative overflow-hidden font-sans">
      
      {/* Шапка */}
      <div className="flex justify-between items-center z-10 mb-6">
        <h1 className="font-black text-2xl text-[#1A5319]">🧺 {code}</h1>
        {!hasSurrendered && !isGameOver && (
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[...Array(lives)].map((_, i) => <span key={i} className="text-xl">🍋</span>)}
            </div>
            <button onClick={handleSurrender} className="text-[10px] font-black opacity-30 uppercase hover:opacity-100 transition-opacity">Сдаться</button>
          </div>
        )}
      </div>

      {/* Оверлей Сдачи / Массового финала */}
      <AnimatePresence>
        {(hasSurrendered || isGameOver) && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-[100] bg-[#F0FFF4]/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#1A5319] text-white p-10 rounded-[40px] text-center shadow-2xl relative overflow-hidden w-full max-w-sm">
              <Confetti />
              <h2 className="text-4xl font-black mb-4 uppercase italic tracking-tighter relative z-10">
                {isGameOver ? "ФИНИШ!" : "ТЫ СДАЛСЯ!"}
              </h2>
              <div className="space-y-2 relative z-10 mb-8">
                <p className="text-[10px] opacity-60 uppercase font-black tracking-widest">Концепт похода:</p>
                <p className="text-2xl font-bold italic leading-tight">"{revealReason}"</p>
              </div>
              <button onClick={() => router.push('/')} className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-[10px] tracking-widest relative z-10 shadow-xl">В главное меню</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Оверлей Лимонада (Только Мультиплеер) */}
      <AnimatePresence>
        {isSpilled && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-yellow-400/90 flex items-center justify-center p-10 text-center backdrop-blur-sm">
            <div className="space-y-4 text-yellow-900">
              <span className="text-8xl">🥤</span>
              <h2 className="text-3xl font-black uppercase leading-tight">{playerName}, пролил лимонад!</h2>
              <p className="font-bold animate-pulse text-[10px] uppercase tracking-widest">Пропуск хода (8 сек)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Чат игры */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-40">
        {moves.map((m, idx) => (
          <div key={idx} className={`flex flex-col ${m.player_name === playerName ? 'items-end' : 'items-start'}`}>
            <div className={`p-4 rounded-[25px] max-w-[85%] ${m.is_host_move ? 'bg-green-50 border-2 border-green-500 text-black' : m.player_name === playerName ? 'bg-black text-white' : 'bg-white text-black shadow-sm'}`}>
              {m.is_host_move && <span className="text-[8px] font-black text-green-600 uppercase block mb-1">Пример Хоста 🌟</span>}
              {!m.is_host_move && <p className="text-[8px] font-bold opacity-40 mb-1 uppercase">{m.player_name}</p>}
              <p className="font-bold italic">"{m.item}"</p>
              {/* Для Manual Hardcore тут можно рендерить кнопки ✅❌, если m.status === 'pending' */}
            </div>
          </div>
        ))}
        {/* MADE BY SOLO (чтобы ты точно не потерял его) */}
        <div className="pt-10 pb-4 text-center opacity-30 pointer-events-none">
          <p className="text-[10px] font-black text-[#065F46] uppercase tracking-widest italic">MADE BY SOLO</p>
        </div>
      </div>

      {/* Панель ввода */}
      {!hasSurrendered && !isGameOver && (
        <div className="fixed bottom-8 left-6 right-6 space-y-3 z-40">
          
          {/* Кубик только для Хоста в режиме Assist */}
          {isHost && sub === 'assist' && isHostTurn && mode !== 'solo' && (
            <div className="flex justify-center">
              <button 
                onClick={assistMe} 
                disabled={isSuggesting}
                className={`bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-sm border border-green-100 text-xl transition-all ${isSuggesting ? 'animate-spin opacity-50' : 'active:scale-90 hover:rotate-12'}`}
              >
                🎲
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            <input 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={isInputDisabled}
              className="flex-1 bg-white p-5 rounded-[22px] shadow-2xl font-bold border-none outline-none focus:ring-2 ring-green-300 transition-all disabled:opacity-70" 
              placeholder={isInputDisabled ? "Ожидание..." : "Я беру с собой..."} 
            />
            <button 
              onClick={handleSend}
              disabled={isInputDisabled || !inputValue.trim()}
              className="w-16 h-16 bg-[#22C55E] rounded-[22px] shadow-xl flex items-center justify-center text-2xl active:scale-90 transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              🧺
            </button>
          </div>
        </div>
      )}
    </div>
  )
}