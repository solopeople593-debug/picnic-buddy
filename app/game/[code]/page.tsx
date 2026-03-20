'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Move {
  id: number
  player_name: string
  item: string
  is_allowed: boolean
}

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params)
  const code = resolvedParams.code
  const router = useRouter()

  const [moves, setMoves] = useState<Move[]>([])
  const [inputValue, setInputValue] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Проверка авторизации
    const storedName = localStorage.getItem('picnic_player_name')
    if (!storedName) {
      // Если имени нет, отправляем вводить имя, сохраняя код комнаты
      router.push(`/?join=${code}`) 
      return
    }

    setPlayerName(storedName)
    setIsHost(localStorage.getItem('picnic_is_host') === 'true')

    // Загрузка истории
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

    // Realtime подписка
    const channel = supabase
      .channel(`room-${code}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` }, 
      (payload) => {
        setMoves((current) => {
          if (current.find(m => m.id === payload.new.id)) return current
          return [...current, payload.new as Move]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code, router])

  const handleSend = async () => {
    if (!inputValue.trim()) return
    const currentItem = inputValue.trim()
    setInputValue('')

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: currentItem, roomCode: code })
      })
      const { allowed } = await res.json()

      await supabase.from('moves').insert({
        room_code: code,
        player_name: playerName,
        item: currentItem,
        is_allowed: allowed
      })
    } catch (e) { console.error(e) }
  }

  // Очередь: Хост ходит на четных (0, 2, 4...), Гость на нечетных (1, 3, 5...)
  const isMyTurn = (moves.length % 2 === 0) ? isHost : !isHost

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>

  // ЭКРАН ОЖИДАНИЯ ДЛЯ ГОСТЯ (Мультиплеер)
  if (moves.length === 0 && !isHost) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-10 text-center">
        <h1 className="text-3xl font-bold mb-4">Waiting for Host... 🧺</h1>
        <p className="text-gray-500">The game starts as soon as the host makes the first move.</p>
        <div className="mt-8 p-4 bg-gray-100 rounded-lg font-mono text-sm">Room Code: {code}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white p-6 overflow-hidden">
      {/* Шапка */}
      <div className="flex justify-between items-center mb-6">
        <div className="bg-gray-100 px-4 py-2 rounded-2xl">
          <span className="text-[10px] text-gray-400 block">STATUS</span>
          <span className={`font-bold ${isMyTurn ? 'text-orange-500' : 'text-gray-400'}`}>
            {isMyTurn ? 'YOUR TURN' : 'WAITING...'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-400 block">ROOM</span>
          <span className="font-bold">{code}</span>
        </div>
      </div>

      {/* Список ходов */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-24 pr-2">
        <AnimatePresence initial={false}>
          {moves.map((move) => (
            <motion.div
              key={move.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${move.player_name === playerName ? 'items-end' : 'items-start'}`}
            >
              <div className={`px-5 py-3 rounded-[24px] max-w-[85%] ${
                move.is_allowed ? 'bg-gray-100 text-black' : 'bg-red-50 text-red-500 border border-red-100'
              }`}>
                <span className="text-[10px] block font-bold uppercase opacity-40">{move.player_name}</span>
                <span className="text-lg">{move.item} {move.is_allowed ? '✅' : '❌'}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Поле ввода */}
      <div className="fixed bottom-8 left-6 right-6 flex gap-3">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && isMyTurn && handleSend()}
          disabled={!isMyTurn}
          placeholder={isMyTurn ? "I'm bringing..." : "Wait for your turn..."}
          className="flex-1 bg-gray-100 rounded-full px-6 py-4 outline-none focus:ring-2 ring-black transition-all disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!isMyTurn}
          className="bg-black text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg disabled:bg-gray-300 active:scale-95 transition-all"
        >
          🧺
        </button>
      </div>
    </div>
  )
}