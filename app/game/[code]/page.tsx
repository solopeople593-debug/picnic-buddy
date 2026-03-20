'use client'
import { useState, useEffect, use } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase' 

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params)
  const code = resolvedParams.code
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const lang = (searchParams.get('lang') || 'RU') as 'EN' | 'RU'
  const router = useRouter()
  
  const [moves, setMoves] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [lives, setLives] = useState(3)
  const [isGameOver, setIsGameOver] = useState(false)
  const [revealReason, setRevealReason] = useState('')

  const playerName = typeof window !== 'undefined' ? localStorage.getItem('picnic_player_name') || 'Guest' : 'Guest'

  const t = {
    EN: { 
      turn: "Your turn!", wait: "Wait...", lemon: "spilled lemonade!", 
      giveup: "GIVE UP", over: "GAME OVER", ruleWas: "The secret rule was:",
      input: "I'm bringing...", restart: "New Game"
    },
    RU: { 
      turn: "Твой черед!", wait: "Ждем...", lemon: "пролил на себя лимонад!", 
      giveup: "СДАТЬСЯ", over: "ИГРА ОКОНЧЕНА", ruleWas: "Секретное правило было:",
      input: "Я беру с собой...", restart: "Заново"
    }
  }[lang]

  useEffect(() => {
    setIsHost(localStorage.getItem('picnic_is_host') === 'true')
    // Подписка на Supabase (как в прошлом коде)
  }, [code])

  const isSolo = mode === 'solo'
  const approvedMoves = moves.filter(m => m.status === 'approved')
  const isMyTurn = isSolo ? true : (approvedMoves.length % 2 === 0 ? isHost : !isHost)

  const handleGiveUp = async () => {
    const secretRule = localStorage.getItem(`picnic_rule_${code}`) || "???"
    // Запрашиваем у ИИ объяснение (API call)
    setRevealReason(`ИИ объясняет: Правило заключалось в том, что ${secretRule}.`)
    setIsGameOver(true)
  }

  const handleSend = async () => {
    if (!inputValue.trim() || !isMyTurn || isGameOver) return
    const text = inputValue.trim().toUpperCase()
    
    // Вставляем в базу... (логика из прошлого шага)
    const newMove = { room_code: code, player_name: playerName, item: text, status: isSolo ? 'approved' : 'pending' }
    setMoves(prev => [...prev, newMove])
    setInputValue('')
  }

  return (
    <div className="h-screen bg-white flex flex-col p-6 text-black font-sans overflow-hidden relative">
      {/* Шапка */}
      <div className="flex justify-between items-start mb-4 z-10">
        <div>
          <h1 className="font-black text-xl tracking-tighter uppercase">🧺 {code}</h1>
          {/* Сердца только НЕ в соло режиме */}
          {!isSolo && !isGameOver && (
            <div className="flex gap-1 mt-1 text-sm">
              {[...Array(lives)].map((_, i) => <span key={i}>❤️</span>)}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <div className={`px-4 py-2 rounded-2xl text-[10px] font-black ${isMyTurn && !isGameOver ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
            {isGameOver ? "FINISH" : (isMyTurn ? t.turn : t.wait)}
          </div>
          {!isGameOver && (
            <button onClick={handleGiveUp} className="text-[9px] font-black text-red-400 underline uppercase tracking-widest opacity-50 hover:opacity-100">
              {t.giveup}
            </button>
          )}
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-32 scrollbar-hide z-10">
        {isGameOver ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-black text-white rounded-[32px] text-center space-y-4 shadow-2xl">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">{t.over}</h2>
            <div className="h-px bg-white/20 w-12 mx-auto" />
            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">{t.ruleWas}</p>
            <p className="text-lg font-bold italic leading-tight">{revealReason || "..."}</p>
            <button onClick={() => router.push('/')} className="w-full bg-white text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl">
              {t.restart}
            </button>
          </motion.div>
        ) : (
          moves.map((m, i) => (
            // Карточки слов (дизайн из "Фото 2")
            <div key={i} className={`flex flex-col ${m.player_name === playerName ? 'items-end' : 'items-start'}`}>
               <div className={`p-4 rounded-[26px] max-w-[85%] shadow-sm ${m.player_name === playerName ? 'bg-black text-white' : 'bg-gray-50'}`}>
                  <p className="text-[9px] font-black opacity-40 mb-1">{m.player_name}</p>
                  <p className="font-bold text-lg italic">"{m.item}"</p>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Поле ввода (скрывается при конце игры) */}
      {!isGameOver && (
        <div className="fixed bottom-8 left-6 right-6 z-20">
          <div className="flex gap-2">
            <input 
              value={inputValue} onChange={e => setInputValue(e.target.value)}
              placeholder={isMyTurn ? t.input : t.wait}
              className="flex-1 bg-white p-5 rounded-[26px] shadow-xl border border-gray-100 outline-none font-bold"
            />
            <button onClick={handleSend} className="w-16 h-16 rounded-[26px] bg-[#22C55E] text-white shadow-2xl flex items-center justify-center text-2xl">🧺</button>
          </div>
        </div>
      )}
    </div>
  )
}