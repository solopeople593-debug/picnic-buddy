'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../lib/supabase' // Исправленный путь (два уровня вверх)
import { motion, AnimatePresence } from 'framer-motion'

interface Move {
  id: number
  player_name: string
  item: string
  is_allowed: boolean
}

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  // Разворачиваем параметры пути (динамический роут [code])
  const resolvedParams = use(params)
  const code = resolvedParams.code

  const [moves, setMoves] = useState<Move[]>([])
  const [inputValue, setInputValue] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const name = localStorage.getItem('picnic_player_name') || 'Guest'
    const hostStatus = localStorage.getItem('picnic_is_host') === 'true'
    setPlayerName(name)
    setIsHost(hostStatus)

    // 1. Загружаем историю ходов
    const fetchMoves = async () => {
      const { data } = await supabase
        .from('moves')
        .select('*')
        .eq('room_code', code)
        .order('created_at', { ascending: true })
      
      if (data) setMoves(data)
      setLoading(false)
    }

    fetchMoves()

    // 2. Подписываемся на Realtime (чтобы видеть ходы друг друга)
    const channel = supabase
      .channel(`room-${code}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` },
        (payload) => {
          setMoves((current) => {
            if (current.find(m => m.id === payload.new.id)) return current
            return [...current, payload.new as Move]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [code])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const currentItem = inputValue.trim()
    setInputValue('')

    // Отправляем запрос на проверку ИИ (наш API route)
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: currentItem, roomCode: code })
      })
      
      const { allowed } = await res.json()

      // Записываем ход в базу данных
      await supabase.from('moves').insert({
        room_code: code,
        player_name: playerName,
        item: currentItem,
        is_allowed: allowed
      })
    } catch (error) {
      console.error("Error sending move:", error)
    }
  }

  // Очередь хода: Хост ходит на четных (0, 2..), Гость на нечетных (1, 3..)
  const isMyTurn = (moves.length % 2 === 0) ? isHost : !isHost

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>

  return (
    <div className="flex flex-col h-screen bg-white text-black p-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="bg-gray-100 px-4 py-2 rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 block">Status</span>
          <span className="font-bold text-orange-500 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            {isMyTurn ? 'YOUR TURN' : 'WAITING...'}
          </span>
        </div>
        <div className="bg-gray-100 px-4 py-2 rounded-2xl shadow-sm text-right">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 block">Room</span>
          <span className="font-bold">{code}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-24 pr-2">
        <AnimatePresence>
          {moves.map((move, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={move.id || i}
              className={`flex flex-col ${move.player_name === playerName ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[80%] px-5 py-3 rounded-[24px] ${
                move.is_allowed 
                  ? 'bg-gray-100 text-black' 
                  : 'bg-red-50 text-red-500 border border-red-100'
              }`}>
                <span className="text-[10px] block opacity-50 mb-1 font-bold uppercase">{move.player_name}</span>
                <span className="text-lg">{move.item}</span>
                {!move.is_allowed && <span className="ml-2">❌</span>}
                {move.is_allowed && <span className="ml-2">✅</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Fixed at Bottom */}
      <div className="fixed bottom-10 left-6 right-6 flex gap-3">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={!isMyTurn}
          placeholder={isMyTurn ? "I'm bringing..." : "Wait for your turn..."}
          className="flex-1 bg-gray-100 rounded-[24px] px-6 py-4 outline-none focus:ring-2 ring-black transition-all disabled:opacity-50"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={!isMyTurn}
          className="bg-black text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:bg-gray-300"
        >
          🧺
        </button>
      </div>
    </div>
  )
}