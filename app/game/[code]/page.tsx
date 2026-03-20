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
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([])

  const playerName = typeof window !== 'undefined' ? localStorage.getItem('picnic_player_name') || 'Player' : 'Player'

  // ИСПРАВЛЕНО: Добавлены allow и deny
  const t = {
    EN: { 
      turn: "Your turn!", wait: "Wait...", lemon: "spilled lemonade!", 
      giveup: "GIVE UP", over: "GAME OVER", ruleWas: "The rule was:", 
      joined: "in game!", allow: "ALLOW ✅", deny: "DENY ❌",
      input: "I'm bringing..."
    },
    RU: { 
      turn: "Твой черед!", wait: "Ждем...", lemon: "пролил на себя лимонад!", 
      giveup: "СДАТЬСЯ", over: "ИГРА ОКОНЧЕНА", ruleWas: "Правило было:", 
      joined: "в игре!", allow: "ДА ✅", deny: "НЕТ ❌",
      input: "Я беру с собой..."
    }
  }[lang]

  useEffect(() => {
    const hostStatus = localStorage.getItem('picnic_is_host') === 'true'
    setIsHost(hostStatus)

    // ИСПРАВЛЕННЫЙ Presence (используем sync и join правильно)
    const channel = supabase.channel(`room-${code}`, { 
      config: { presence: { key: playerName } } 
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const names = Object.keys(state)
        setOnlinePlayers(names)
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'moves', 
        filter: `room_code=eq.${code}` 
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') setMoves(prev => [...prev, payload.new])
        if (payload.eventType === 'UPDATE') setMoves(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true })
      .then(({ data }) => data && setMoves(data))

    return () => { supabase.removeChannel(channel) }
  }, [code, playerName])

  const approvedMoves = moves.filter(m => m.status === 'approved')
  const isMyTurn = mode === 'solo' ? true : (approvedMoves.length % 2 === 0 ? isHost : !isHost)

  const handleSend = async () => {
    if (!inputValue.trim() || !isMyTurn || isGameOver) return
    const text = inputValue.trim().toUpperCase()
    setInputValue('')

    const isAiManaged = mode === 'solo' || mode === 'ai_host'
    
    const { data: newMove } = await supabase.from('moves').insert([{
      room_code: code,
      player_name: playerName,
      item: text,
      status: isAiManaged ? 'approved' : 'pending',
      is_allowed: true 
    }]).select().single()

    if (isAiManaged && newMove) {
      const res = await fetch('/api/check', { 
        method: 'POST', 
        body: JSON.stringify({ item: text, roomCode: code, lang }) 
      })
      const result = await res.json()
      await supabase.from('moves').update({ is_allowed: result.allowed }).eq('id', newMove.id)
    }
  }

  const judge = async (id: number, result: boolean) => {
    await supabase.from('moves').update({ is_allowed: result, status: 'approved' }).eq('id', id)
  }

  const handleGiveUp = () => {
    const rule = localStorage.getItem(`picnic_rule_${code}`) || "???"
    setRevealReason(rule)
    setIsGameOver(true)
  }

  return (
    <div className="h-screen bg-white flex flex-col p-6 text-black font-sans overflow-hidden relative">
      <div className="flex justify-between items-start mb-4 z-10">
        <div className="space-y-2">
          <h1 className="font-black text-xl tracking-tighter uppercase italic">🧺 {code}</h1>
          <div className="flex gap-1 flex-wrap">
            {onlinePlayers.map(p => (
              <span key={p} className="px-2 py-1 bg-green-50 text-[8px] font-black rounded-lg border border-green-100">
                ● {p.toUpperCase()} {p === playerName ? '(YOU)' : ''}
              </span>
            ))}
          </div>
          {!isHost && mode !== 'solo' && !isGameOver && (
            <div className="flex gap-1 mt-2 text-xs">
              {[...Array(lives)].map((_, i) => <span key={i}>❤️</span>)}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className={`px-4 py-2 rounded-2xl text-[10px] font-black shadow-sm ${isMyTurn && !isGameOver ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
            {isGameOver ? "FINISH" : (isMyTurn ? t.turn : t.wait)}
          </div>
          {!isGameOver && (
            <button onClick={handleGiveUp} className="text-[9px] font-black text-red-300 underline uppercase tracking-widest">{t.giveup}</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-32 scrollbar-hide z-10">
        <AnimatePresence>
          {isGameOver ? (
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-black text-white p-8 rounded-[32px] text-center space-y-4 shadow-2xl">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">{t.over}</h2>
                <div className="h-px bg-white/20 w-12 mx-auto" />
                <p className="text-[10px] uppercase tracking-widest text-green-400 font-black">{t.ruleWas}</p>
                <p className="text-xl font-bold italic leading-tight">"{revealReason}"</p>
                <button onClick={() => router.push('/')} className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">EXIT</button>
             </motion.div>
          ) : (
            moves.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.player_name === playerName ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-[26px] max-w-[85%] shadow-sm border ${
                  m.player_name === playerName ? 'bg-black text-white border-black' : 'bg-gray-50 text-black border-gray-100'
                } ${m.status === 'approved' && !m.is_allowed ? 'bg-red-50 text-red-500 border-red-100' : ''}`}>
                  <p className="text-[9px] font-black opacity-30 mb-1">{m.player_name}</p>
                  <p className="font-bold text-lg italic tracking-tight">"{m.item}"</p>
                  <div className="mt-1 text-[8px] font-black opacity-50 uppercase">
                    {m.status === 'approved' ? (m.is_allowed ? '✅' : '❌') : '⏳ PENDING'}
                  </div>
                </div>

                {isHost && m.status === 'pending' && m.player_name !== playerName && (
                  <div className="flex gap-2 mt-2 ml-2">
                    <button onClick={() => judge(m.id, true)} className="bg-green-500 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-green-100 active:scale-95 transition-all">{t.allow}</button>
                    <button onClick={() => judge(m.id, false)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-red-100 active:scale-95 transition-all">{t.deny}</button>
                  </div>
                )}
              </div>
            ))
          )}
        </AnimatePresence>
      </div>

      {!isGameOver && (
        <div className="fixed bottom-8 left-6 right-6 z-20">
          <div className="flex gap-2">
            <input 
              value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={!isMyTurn} placeholder={isMyTurn ? t.input : t.wait}
              className="flex-1 bg-white p-5 rounded-[26px] shadow-2xl border border-gray-100 outline-none font-bold disabled:opacity-50 transition-all focus:ring-2 ring-green-500"
            />
            <button onClick={handleSend} disabled={!isMyTurn} className={`w-16 h-16 rounded-[26px] shadow-2xl flex items-center justify-center text-2xl transition-all ${isMyTurn ? 'bg-[#22C55E] text-white active:scale-90 shadow-green-200' : 'bg-gray-100 text-gray-400'}`}>🧺</button>
          </div>
          <p className="text-center text-[9px] font-black text-gray-400 uppercase tracking-widest mt-3 opacity-30 italic">Made by Solo</p>
        </div>
      )}
    </div>
  )
}