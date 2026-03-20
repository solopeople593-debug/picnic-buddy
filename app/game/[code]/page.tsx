'use client'
import { useState, useEffect, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase' 

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const mode = useSearchParams().get('mode') // solo, ai_host, help, manual
  
  const [moves, setMoves] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isHost, setIsHost] = useState(false)
  const playerName = typeof window !== 'undefined' ? localStorage.getItem('picnic_player_name') : 'Player'

  useEffect(() => {
    setIsHost(localStorage.getItem('picnic_is_host') === 'true')
    // Тут в идеале подписка на Supabase, но для теста оставим локальный стейт
  }, [code])

  const handleSend = async () => {
    if (!inputValue.trim()) return
    const text = inputValue.trim()
    setInputValue('')

    // 1. Для Соло или AI Host — сразу вызываем ИИ
    let isAllowed = true
    let status = 'approved'

    if (mode === 'solo' || mode === 'ai_host') {
      const res = await fetch('/api/check', { method: 'POST', body: JSON.stringify({ item: text, roomCode: code }) })
      const data = await res.json()
      isAllowed = data.allowed
    } else {
      // 2. Для Manual/Help — статус "ожидание решения хоста"
      status = 'pending'
    }

    const newMove = { id: Date.now(), player_name: playerName, item: text, is_allowed: isAllowed, status: status }
    setMoves(prev => [...prev, newMove])
  }

  const judge = (id: number, result: boolean) => {
    setMoves(prev => prev.map(m => m.id === id ? { ...m, is_allowed: result, status: 'approved' } : m))
  }

  return (
    <div className="h-screen bg-white flex flex-col p-6 text-black">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-black text-lg">🧺 {mode === 'solo' ? 'SOLO TRAINING' : `ROOM: ${code}`}</h1>
        <div className="px-3 py-1 bg-green-100 rounded-full text-[10px] font-black text-green-700 uppercase">{mode}</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-24 scrollbar-hide">
        {moves.map((m) => (
          <div key={m.id} className="space-y-2">
            <div className={`p-4 rounded-3xl max-w-[85%] ${m.player_name === playerName ? 'ml-auto bg-gray-50' : 'bg-green-50 text-green-900'} ${m.status === 'approved' && !m.is_allowed ? 'border-2 border-red-200 bg-red-50' : ''}`}>
              <p className="text-[9px] font-black uppercase opacity-30 mb-1">{m.player_name}</p>
              <p className="font-bold">{m.item} {m.status === 'approved' ? (m.is_allowed ? '✅' : '❌') : '⏳'}</p>
            </div>
            {isHost && m.status === 'pending' && m.player_name !== playerName && (
              <div className="flex gap-2 ml-4">
                <button onClick={() => judge(m.id, true)} className="bg-green-500 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-md">ALLOW</button>
                <button onClick={() => judge(m.id, false)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-md">DENY</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-8 left-6 right-6 flex gap-2">
        <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder={mode === 'solo' ? "I'm bringing..." : "Your turn..."} className="flex-1 bg-gray-50 p-5 rounded-[24px] outline-none font-bold placeholder:text-gray-300" />
        <button onClick={handleSend} className="bg-black text-white w-16 h-16 rounded-[24px] shadow-2xl active:scale-90 transition-all text-2xl">🧺</button>
      </div>
    </div>
  )
}