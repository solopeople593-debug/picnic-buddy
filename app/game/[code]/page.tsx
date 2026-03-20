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

  const [moves, setMoves] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [lives, setLives] = useState(3)
  const [isSpilled, setIsSpilled] = useState(false)
  const [hasSurrendered, setHasSurrendered] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [revealReason, setRevealReason] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [isHostTurn, setIsHostTurn] = useState(false)

  useEffect(() => {
    setIsHost(localStorage.getItem('picnic_is_host') === 'true')
    // Подписки на Supabase для синхронизации moves и room.status...
    // Если status === 'finished' -> setIsGameOver(true)
  }, [code])

  const loseLife = () => {
    const next = lives - 1
    setLives(next)
    if (next <= 0) {
      if (mode === 'solo') { setIsGameOver(true) } 
      else { 
        setIsSpilled(true)
        setTimeout(() => { setIsSpilled(false); setLives(3); }, 8000) 
      }
    }
  }

  const Confetti = () => (
    <div className="absolute inset-0 pointer-events-none z-0">
      {[...Array(30)].map((_, i) => (
        <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-yellow-400" initial={{ x: '50%', y: '50%' }} animate={{ x: `${Math.random()*100-50}vw`, y: `${Math.random()*100-50}vh`, opacity: 0 }} transition={{ duration: 2 }} />
      ))}
    </div>
  )

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col p-6 relative overflow-hidden font-sans">
      {/* Шапка */}
      <div className="flex justify-between items-center z-10 mb-6">
        <h1 className="font-black text-2xl text-[#1A5319]">🧺 {code}</h1>
        {!hasSurrendered && !isGameOver && (
          <div className="flex items-center gap-4">
            <div className="flex gap-1">{[...Array(lives)].map((_, i) => <span key={i}>🍋</span>)}</div>
            <button onClick={() => setHasSurrendered(true)} className="text-[10px] font-black opacity-30 uppercase">Сдаться</button>
          </div>
        )}
      </div>

      {/* Оверлей Сдачи/Финала */}
      <AnimatePresence>
        {(hasSurrendered || isGameOver) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[100] bg-[#F0FFF4]/95 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#1A5319] text-white p-10 rounded-[40px] text-center shadow-2xl relative overflow-hidden">
              <Confetti />
              <h2 className="text-3xl font-black mb-4 uppercase">{isGameOver ? "ВСЕ ПРОИГРАЛИ" : "ТЫ СДАЛСЯ"}</h2>
              <p className="text-[10px] opacity-50 uppercase mb-2">Правило:</p>
              <p className="text-xl font-bold italic mb-8">"{revealReason}"</p>
              <button onClick={() => router.push('/')} className="w-full bg-white text-black py-4 rounded-[22px] font-black uppercase text-[10px]">В меню</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Лимонад */}
      <AnimatePresence>
        {isSpilled && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 bg-yellow-400/90 flex items-center justify-center p-10 text-center">
            <div className="space-y-4 text-yellow-900">
              <span className="text-8xl">🥤</span>
              <h2 className="text-3xl font-black uppercase">Пролил лимонад!</h2>
              <p className="font-bold animate-pulse">ОТМЫВАЕМСЯ (8 сек)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Чат */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-40">
        {moves.map((m, idx) => (
          <div key={idx} className={`flex flex-col ${m.is_host_move ? 'items-center' : 'items-start'}`}>
            <div className={`p-4 rounded-[25px] ${m.is_host_move ? 'bg-green-100 border-2 border-green-500' : 'bg-white shadow-sm'}`}>
              <p className="font-bold italic">"{m.item}"</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ввод */}
      {!hasSurrendered && !isGameOver && (
        <div className="fixed bottom-8 left-6 right-6 space-y-4">
          {isHost && sub === 'assist' && isHostTurn && (
            <div className="flex justify-center">
              <button className="bg-white p-3 rounded-full shadow-sm border text-xl">🎲</button>
            </div>
          )}
          <div className="flex gap-2">
            <input value={inputValue} onChange={e => setInputValue(e.target.value)} className="flex-1 bg-white p-5 rounded-[25px] shadow-2xl font-bold border-none outline-none" placeholder={isHostTurn && !isHost ? "Хост дает пример..." : "Я беру с собой..."} />
            <button className="w-16 h-16 bg-[#22C55E] rounded-[22px] shadow-xl flex items-center justify-center text-2xl">🧺</button>
          </div>
        </div>
      )}
    </div>
  )
}