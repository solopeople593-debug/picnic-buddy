'use client'
import { useState, useEffect, use } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const lang = (searchParams.get('lang') || 'EN') as 'EN' | 'UA' | 'RU' | 'LV'
  const router = useRouter()

  const [moves, setMoves] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [lives, setLives] = useState(3)
  const [isGameOver, setIsGameOver] = useState(false)
  const [revealReason, setRevealReason] = useState('')
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([])

  const playerName = typeof window !== 'undefined' ? localStorage.getItem('picnic_player_name') || 'Guest' : 'Guest'

  const translations = {
    EN: { turn: "Your turn!", wait: "Wait...", giveup: "GIVE UP", rule: "The rule was:", allow: "ALLOW ✅", deny: "DENY ❌", copied: "Copied!", input: "I'm bringing..." },
    UA: { turn: "Твій хід!", wait: "Чекай...", giveup: "ЗДАТИСЯ", rule: "Правило було:", allow: "ТАК ✅", deny: "НІ ❌", copied: "Скопійовано!", input: "Я беру з собою..." },
    RU: { turn: "Твой черед!", wait: "Ждем...", giveup: "СДАТЬСЯ", rule: "Правило было:", allow: "ДА ✅", deny: "НЕТ ❌", copied: "Скопировано!", input: "Я беру с собой..." },
    LV: { turn: "Tava kārta!", wait: "Gaidiet...", giveup: "PADOTIES", rule: "Noteikums bija:", allow: "JĀ ✅", deny: "NĒ ❌", copied: "Kopēts!", input: "Es ņemu līdzi..." }
  }
  const t = translations[lang] || translations.EN

  useEffect(() => {
    setIsHost(localStorage.getItem('picnic_is_host') === 'true')

    const channel = supabase.channel(`room-${code}`, { config: { presence: { key: playerName } } })
    channel
      .on('presence', { event: 'sync' }, () => setOnlinePlayers(Object.keys(channel.presenceState())))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') setMoves(prev => [...prev, payload.new])
        if (payload.eventType === 'UPDATE') setMoves(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
      })
      .subscribe(async (s) => { if (s === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() }) })

    supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true }).then(({ data }) => data && setMoves(data))
    supabase.from('rooms').select('secret_rule').eq('code', code).single().then(({ data }) => { if (data) setRevealReason(data.secret_rule) })

    return () => { supabase.removeChannel(channel) }
  }, [code, playerName])

  const approvedMoves = moves.filter(m => m.status === 'approved')
  const lastMovePending = moves.length > 0 && moves[moves.length - 1].status === 'pending'
  const isMyTurn = mode === 'solo' ? true : (!lastMovePending && (approvedMoves.length % 2 === 0 ? isHost : !isHost))

  const handleSend = async () => {
    if (!inputValue.trim() || !isMyTurn || isGameOver) return
    const text = inputValue.trim().toUpperCase()
    setInputValue('')

    const { data: newMove } = await supabase.from('moves').insert([{
      room_code: code, player_name: playerName, item: text,
      status: (mode === 'solo' || mode === 'ai_host') ? 'approved' : 'pending',
      is_allowed: true 
    }]).select().single()

    if ((mode === 'solo' || mode === 'ai_host') && newMove) {
      const res = await fetch('/api/check', { method: 'POST', body: JSON.stringify({ item: text, roomCode: code, lang }) })
      const result = await res.json()
      await supabase.from('moves').update({ is_allowed: result.allowed }).eq('id', newMove.id)
      if (!result.allowed && mode !== 'solo') {
        setLives(prev => { if (prev <= 1) setIsGameOver(true); return prev - 1 })
      }
    }
  }

  return (
    <div className="h-screen bg-white flex flex-col p-6 text-black font-sans overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-3">
          <h1 onClick={() => { navigator.clipboard.writeText(code); alert(t.copied) }} className="font-black text-2xl italic tracking-tighter cursor-pointer flex items-center gap-2">
            🧺 {code} <span className="text-[10px] opacity-20">📋</span>
          </h1>
          <div className="flex gap-1 flex-wrap">
            {onlinePlayers.map(p => <span key={p} className="px-2 py-1 bg-gray-50 text-[8px] font-black rounded-lg border border-gray-100 uppercase tracking-tighter">● {p}</span>)}
          </div>
          {(!isHost || mode === 'solo') && !isGameOver && (
            <div className="flex gap-1 mt-1 text-sm">{[...Array(lives)].map((_, i) => <span key={i} className="animate-bounce inline-block">🍋</span>)}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className={`px-5 py-2 rounded-2xl text-[10px] font-black shadow-sm transition-all ${isMyTurn ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
            {isGameOver ? "OVER" : (isMyTurn ? t.turn : t.wait)}
          </div>
          <button onClick={() => setIsGameOver(true)} className="text-[10px] font-black text-red-300 underline uppercase tracking-widest">{t.giveup}</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-40 scrollbar-hide">
        <AnimatePresence>
          {isGameOver ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-black text-white p-10 rounded-[40px] text-center space-y-6 shadow-2xl mt-4">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter">FINISH</h2>
              <div className="space-y-2">
                <p className="text-[10px] uppercase text-green-400 font-black tracking-widest">{t.rule}</p>
                <p className="text-2xl font-bold italic">"{revealReason || "???"}"</p>
              </div>
              <button onClick={() => router.push('/')} className="w-full bg-white text-black py-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest">EXIT TO MENU</button>
            </motion.div>
          ) : (
            moves.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.player_name === playerName ? 'items-end' : 'items-start'}`}>
                <div className={`p-5 rounded-[30px] max-w-[85%] border shadow-sm ${m.player_name === playerName ? 'bg-black text-white border-black' : 'bg-white border-gray-100'}`}>
                  <p className="text-[9px] font-black opacity-30 mb-1 uppercase">{m.player_name}</p>
                  <p className="font-bold text-lg italic tracking-tight">"{m.item}"</p>
                  <div className="mt-1 text-[9px] font-black opacity-50">
                    {m.status === 'approved' ? (m.is_allowed ? '✅' : '❌') : '⏳ ...'}
                  </div>
                </div>
                {isHost && m.status === 'pending' && m.player_name !== playerName && (
                  <div className="flex gap-2 mt-3 ml-2">
                    <button onClick={() => supabase.from('moves').update({ is_allowed: true, status: 'approved' }).eq('id', m.id)} className="bg-green-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg shadow-green-100">{t.allow}</button>
                    <button onClick={() => supabase.from('moves').update({ is_allowed: false, status: 'approved' }).eq('id', m.id)} className="bg-red-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg shadow-red-100">{t.deny}</button>
                  </div>
                )}
              </div>
            ))
          )}
        </AnimatePresence>
      </div>

      {!isGameOver && isMyTurn && (
        <div className="fixed bottom-10 left-6 right-6 flex gap-2">
          <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-white p-6 rounded-[30px] shadow-2xl border border-gray-100 outline-none font-bold text-lg" placeholder={t.input} />
          <button onClick={handleSend} className="w-20 h-20 rounded-[30px] bg-[#22C55E] text-white shadow-2xl flex items-center justify-center text-3xl active:scale-90 transition-all">🧺</button>
        </div>
      )}
    </div>
  )
}