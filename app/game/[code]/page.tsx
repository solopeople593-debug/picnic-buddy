'use client'

import { useState, useEffect, use } from 'react'
// Поднимаемся на 2 уровня: из [code] -> game -> app/lib
import { supabase } from '../../lib/supabase' 
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

// Определяем интерфейс для TypeScript
interface Move {
  id: number
  player_name: string
  item: string
  is_allowed: boolean
  room_code: string
}

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params)
  const code = resolvedParams.code.toUpperCase()
  const router = useRouter()

  const [moves, setMoves] = useState<Move[]>([])
  const [inputValue, setInputValue] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const name = localStorage.getItem('picnic_player_name')
    if (!name) {
      router.push('/')
      return
    }
    setPlayerName(name)
    setIsHost(localStorage.getItem('picnic_is_host') === 'true')

    const fetchMoves = async () => {
      const { data } = await supabase
        .from('moves')
        .select('*')
        .eq('room_code', code)
        .order('created_at', { ascending: true })
      
      if (data) setMoves(data as Move[])
      setLoading(false)
    }
    fetchMoves()

    const channel = supabase.channel(`room-${code}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'moves', 
          filter: `room_code=eq.${code}` 
        }, 
        // Здесь мы явно указываем тип для payload, чтобы не было ошибки any
        (payload: { new: any }) => {
          const newMove = payload.new as Move
          setMoves(prev => {
            if (prev.find(m => m.id === newMove.id)) return prev
            return [...prev, newMove]
          })
        }
      ).subscribe()

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
    } catch (e) {
      console.error("Error:", e)
    }
  }

  const isMyTurn = (moves.length % 2 === 0) ? isHost : !isHost

  if (loading) return <div className="h-screen flex items-center justify-center font-bold">🧺 Loading...</div>

  if (moves.length === 0 && !isHost) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-10 text-center bg-white text-black">
        <h2 className="text-2xl font-bold">Waiting for the Host to start...</h2>
        <div className="mt-4 p-2 bg-gray-100 rounded-lg font-mono">Code: {code}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white p-6 overflow-hidden text-black font-sans">
      <div className="flex justify-between items-center mb-6">
        <div className={`font-bold px-4 py-2 rounded-full ${isMyTurn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
          {isMyTurn ? 'YOUR TURN' : 'WAITING'}
        </div>
        <div className="font-mono text-sm">ROOM: {code}</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-24 pr-2">
        <AnimatePresence initial={false}>
          {moves.map((move) => (
            <motion.div
              key={move.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${move.player_name === playerName ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`px-5 py-3 rounded-[22px] max-w-[85%] shadow-sm ${
                move.is_allowed ? 'bg-gray-100' : 'bg-red-50 text-red-500 border border-red-100'
              }`}>
                <span className="text-[10px] block font-bold uppercase opacity-30 mb-1">{move.player_name}</span>
                <span className="text-lg font-medium">{move.item} {move.is_allowed ? '✅' : '❌'}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-10 left-6 right-6 flex gap-3">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && isMyTurn && handleSend()}
          disabled={!isMyTurn}
          placeholder={isMyTurn ? "I'm bringing..." : "Wait for turn..."}
          className="flex-1 bg-gray-50 rounded-full px-6 py-4 outline-none focus:ring-2 ring-black disabled:opacity-30"
        />
        <button
          onClick={handleSend}
          disabled={!isMyTurn}
          className="bg-black text-white w-14 h-14 rounded-full flex items-center justify-center disabled:bg-gray-200 active:scale-90 transition-all"
        >
          🧺
        </button>
      </div>
    </div>
  )
}