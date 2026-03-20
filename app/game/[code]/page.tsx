'use client'
import { useState, useEffect, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params)
  const code = resolvedParams.code
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const lang = (searchParams.get('lang') || 'RU') as 'EN' | 'RU'
  
  const [moves, setMoves] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isHost, setIsHost] = useState(false)
  const playerName = typeof window !== 'undefined' ? localStorage.getItem('picnic_player_name') || 'Guest' : 'Guest'

  const t = {
    EN: { solo: 'SOLO TRAINING', room: 'ROOM', input: "I'm bringing...", allow: 'ALLOW ✅', deny: 'DENY ❌', turn: "It's your turn!", wait: "Waiting...", duplicate: "Already taken!" },
    RU: { solo: 'ТРЕНИРОВКА', room: 'КОМНАТА', input: "Я беру с собой...", allow: 'ДА ✅', deny: 'НЕТ ❌', turn: "Твой черед!", wait: "Ждем хода...", duplicate: "Уже было!" }
  }[lang]

  useEffect(() => {
    setIsHost(localStorage.getItem('picnic_is_host') === 'true')
  }, [code])

  // Очередь: Хост (четные), Гость (нечетные). В Соло всегда твой ход.
  const approvedCount = moves.filter(m => m.status === 'approved').length
  const isMyTurn = mode === 'solo' ? true : (approvedCount % 2 === 0 ? isHost : !isHost)

  const handleSend = async () => {
    if (!inputValue.trim() || !isMyTurn) return
    const text = inputValue.trim().toUpperCase()

    if (moves.some(m => m.item === text)) {
      alert(t.duplicate)
      return
    }

    setInputValue('')
    let isAllowed = true
    let status = 'pending' // По умолчанию ждем хоста

    // Если ИИ-режим — проверяем сразу
    if (mode === 'solo' || mode === 'ai_host') {
      const res = await fetch('/api/check', { method: 'POST', body: JSON.stringify({ item: text, roomCode: code, lang }) })
      const data = await res.json()
      isAllowed = data.allowed
      status = 'approved'
    }

    const newMove = { id: Date.now(), player_name: playerName, item: text, is_allowed: isAllowed, status: status }
    setMoves(prev => [...prev, newMove])
  }

  const judge = (id: number, result: boolean) => {
    setMoves(prev => prev.map(m => m.id === id ? { ...m, is_allowed: result, status: 'approved' } : m))
  }

  return (
    <div className="h-screen bg-white flex flex-col p-6 text-black font-sans overflow-hidden relative">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M20 10l-5 5h10l-5-5zm0-8l-7 7h14L20 2zm0 16l-3 3h6l-3-3z" fill="%3C/svg%3E")' }} />

      <div className="flex justify-between items-start mb-6 z-10">
        <div>
          <h1 className="font-black text-xl tracking-tighter uppercase">🧺 {mode === 'solo' ? t.solo : `${t.room}: ${code}`}</h1>
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">{mode?.replace('_', ' ')}</p>
        </div>
        <div className={`px-4 py-2 rounded-2xl text-[10px] font-black transition-all shadow-sm ${isMyTurn ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
          {isMyTurn ? t.turn : t.wait}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pb-32 z-10 scrollbar-hide">
        <AnimatePresence initial={false}>
          {moves.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, x: m.player_name === playerName ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className={`flex flex-col ${m.player_name === playerName ? 'items-end' : 'items-start'}`}>
              <div className={`p-5 rounded-[28px] max-w-[80%] shadow-sm border transition-all ${m.player_name === playerName ? 'bg-black text-white border-black' : 'bg-gray-50 text-black border-gray-100'} ${m.status === 'approved' && !m.is_allowed ? 'bg-red-50 text-red-600 border-red-200' : ''}`}>
                <p className="text-[9px] font-black uppercase opacity-40 mb-1 tracking-widest">{m.player_name}</p>
                <p className="font-bold text-xl italic tracking-tight">"{m.item}"</p>
                <div className="mt-2 text-[9px] font-black uppercase flex items-center gap-1">
                  {m.status === 'approved' ? (m.is_allowed ? '✅ Approved' : '❌ Denied') : '⏳ Pending...'}
                </div>
              </div>

              {/* КНОПКИ ДЛЯ ХОСТА ПОД ЧУЖИМ СЛОВОМ */}
              {isHost && m.status === 'pending' && m.player_name !== playerName && (
                <div className="flex gap-3 mt-3 ml-2">
                  <button onClick={() => judge(m.id, true)} className="bg-green-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all">{t.allow}</button>
                  <button onClick={() => judge(m.id, false)} className="bg-red-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all">{t.deny}</button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-8 left-6 right-6 z-20">
        <div className="flex gap-2 mb-3">
          <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={!isMyTurn} placeholder={isMyTurn ? t.input : t.wait} className="flex-1 bg-white/90 backdrop-blur-sm p-5 rounded-[26px] outline-none font-bold shadow-xl border border-gray-100 disabled:opacity-50 focus:ring-2 ring-green-500 transition-all" />
          <button onClick={handleSend} disabled={!isMyTurn} className={`w-16 h-16 rounded-[26px] shadow-2xl flex items-center justify-center text-2xl transition-all ${isMyTurn ? 'bg-[#22C55E] text-white active:scale-90 shadow-green-200' : 'bg-gray-200 text-gray-400'}`}>🧺</button>
        </div>
        <p className="text-center text-[9px] font-black text-gray-400 uppercase tracking-widest opacity-40 italic">Made by Solo</p>
      </div>
    </div>
  )
}