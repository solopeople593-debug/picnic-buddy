'use client'
import { useState, useEffect, use } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') 
  const lang = (searchParams.get('lang') || 'RU') as 'EN' | 'UA' | 'RU' | 'LV'
  const router = useRouter()

  const [moves, setMoves] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [lives, setLives] = useState(3)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isSpilled, setIsSpilled] = useState(false) 
  const [revealReason, setRevealReason] = useState('')
  const [playerName, setPlayerName] = useState('')

  useEffect(() => {
    const savedName = localStorage.getItem('picnic_player_name') || 'Guest'
    setPlayerName(savedName)
    setIsHost(localStorage.getItem('picnic_is_host') === 'true')

    const channel = supabase.channel(`room-${code}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` }, (payload) => {
        setMoves(prev => [...prev, payload.new])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` }, (payload) => {
        setMoves(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
      })
      .subscribe()

    supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true }).then(({ data }) => data && setMoves(data))
    supabase.from('rooms').select('secret_rule').eq('code', code).single().then(({ data }) => { if (data) setRevealReason(data.secret_rule) })

    return () => { supabase.removeChannel(channel) }
  }, [code])

  const handleSend = async () => {
    if (!inputValue.trim() || isGameOver || isSpilled) return
    
    const text = inputValue.trim().toUpperCase()
    setInputValue('')

    const { data: newMove } = await supabase.from('moves').insert([{
      room_code: code,
      player_name: playerName,
      item: text,
      status: (mode === 'solo' || mode === 'ai_host') ? 'approved' : 'pending',
      is_allowed: true 
    }]).select().single()

    if ((mode === 'solo' || mode === 'ai_host') && newMove) {
      const res = await fetch('/api/check', { 
        method: 'POST', 
        body: JSON.stringify({ item: text, roomCode: code, lang }) 
      })
      const result = await res.json()
      
      await supabase.from('moves').update({ is_allowed: result.allowed }).eq('id', newMove.id)

      if (!result.allowed) {
        setLives(prev => {
          const newLives = prev - 1
          if (newLives <= 0) {
            if (mode === 'solo') {
              setIsGameOver(true)
            } else {
              setIsSpilled(true)
              setTimeout(() => {
                setIsSpilled(false)
                setLives(3) 
              }, 8000) 
            }
          }
          return newLives
        })
      }
    }
  }

  // ФУНКЦИЯ ДЛЯ ГЕНЕРАЦИИ КОНФЕТТИ
  const Confetti = () => {
    const colors = ['#22C55E', '#1A5319', '#FACC15', '#F59E0B', '#F87171']
    return (
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{ backgroundColor: colors[i % colors.length] }}
            initial={{ 
              opacity: 1, 
              x: '50%', // Центр
              y: '50%', // Центр
              scale: 1
            }}
            animate={{ 
              opacity: 0, 
              x: `${Math.random() * 100 - 50}vw`, // Разлет по горизонтали
              y: `${Math.random() * 100 - 50}vh`, // Разлет по вертикали
              scale: [1, 1.5, 0.5], // Пульсация
              rotate: [0, 360, 720] // Вращение
            }}
            transition={{ 
              duration: 2 + Math.random() * 2, // Случайная длительность
              delay: Math.random() * 0.5, // Случайная задержка
              ease: "easeOut"
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col p-6 text-black font-sans relative overflow-hidden">
      
      {/* Шапка с лимонами */}
      <div className="flex justify-between items-center mb-8 z-10">
        <div>
          <h1 className="font-black text-2xl text-[#1A5319]">🧺 {code}</h1>
          <div className="flex gap-1 mt-1">
            {[...Array(lives)].map((_, i) => <span key={i} className="text-xl">🍋</span>)}
          </div>
        </div>
        <button onClick={() => setIsGameOver(true)} className="text-[10px] font-black opacity-30 uppercase tracking-widest">Сдаться</button>
      </div>

      {/* Оверлей лимонада */}
      <AnimatePresence>
        {isSpilled && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-yellow-400/90 p-10 text-center"
          >
            <div className="space-y-4">
              <span className="text-8xl">🥤</span>
              <h2 className="text-3xl font-black uppercase text-yellow-900">
                {playerName} пролил на себя лимонад!
              </h2>
              <p className="font-bold text-yellow-800 animate-pulse">Отмываемся... Пропуск хода</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Список ходов */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-32">
        {moves.map((m, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: m.player_name === playerName ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={idx} 
            className={`flex flex-col ${m.player_name === playerName ? 'items-end' : 'items-start'}`}
          >
            <div className={`p-4 rounded-[25px] max-w-[80%] shadow-sm ${m.player_name === playerName ? 'bg-black text-white' : 'bg-white text-black'}`}>
              <p className="text-[8px] font-bold opacity-40 mb-1 uppercase">{m.player_name}</p>
              <p className="font-bold italic">"{m.item}"</p>
              <div className="mt-1 text-right">
                {m.status === 'approved' ? (m.is_allowed ? '✅' : '❌') : '⏳'}
              </div>
            </div>
          </motion.div>
        ))}

        {/* ФИКС: Экран Game Over с конфетти */}
        <AnimatePresence>
          {isGameOver && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1A5319] text-white p-10 rounded-[40px] text-center space-y-6 shadow-2xl mt-12 relative z-10"
            >
              {/* Вызов конфетти */}
              <Confetti />
              
              <motion.h2 
                animate={{ scale: [1, 1.1, 1] }} 
                transition={{ duration: 1, repeat: Infinity }}
                className="text-4xl font-black italic tracking-tighter"
              >
                GAME OVER
              </motion.h2>
              <div className="space-y-2 relative z-20">
                <p className="text-xs uppercase opacity-60 font-bold tracking-widest">Правило было:</p>
                <p className="text-2xl font-bold italic">"{revealReason}"</p>
              </div>
              <button 
                onClick={() => router.push('/')} 
                className="w-full bg-white text-black py-5 rounded-[22px] font-black text-[10px] uppercase tracking-widest relative z-20 shadow-xl"
              >
                Вернуться в меню
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ввод */}
      {!isGameOver && (
        <div className="fixed bottom-8 left-6 right-6 flex gap-2">
          <input 
            disabled={isSpilled}
            value={inputValue} 
            onChange={e => setInputValue(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-white p-5 rounded-[22px] shadow-xl border-none outline-none font-bold" 
            placeholder={isSpilled ? "ОТМЫВАЕМСЯ..." : "Я беру с собой..."} 
          />
          <button onClick={handleSend} className="w-16 h-16 bg-[#22C55E] rounded-[22px] shadow-xl flex items-center justify-center text-2xl active:scale-90 transition-all">🧺</button>
        </div>
      )}
    </div>
  )
}