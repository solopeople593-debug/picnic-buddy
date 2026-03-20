'use client'
import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'

type SupportedLangs = 'RU' | 'EN' | 'UA' | 'LV';

export default function GamePage({ params }: { params: any }) {
  const unwrappedParams: any = use(params)
  const code = unwrappedParams.code
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const langParam = searchParams.get('lang') || 'RU'
  const lang = (['RU', 'EN', 'UA', 'LV'].includes(langParam) ? langParam : 'RU') as SupportedLangs
  const mode = searchParams.get('mode') // 'solo', 'manual', 'ai_host'

  const [moves, setMoves] = useState<any[]>([])
  const [players, setPlayers] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [lives, setLives] = useState(3)
  const [isHost, setIsHost] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [hasSurrendered, setHasSurrendered] = useState(false)
  const [isSpilled, setIsSpilled] = useState(false)
  const [revealReason, setRevealReason] = useState('...')
  const [playerName, setPlayerName] = useState('')

  const t: any = {
    RU: { placeholder: "Я БЕРУ С СОБОЙ...", surrender: "СДАТЬСЯ", spilled: "ПРОЛИТ ЛИМОНАД!", finish: "ФИНИШ!", concept: "КОНЦЕПТ БЫЛ:", menu: "В МЕНЮ", campers: "В ПОХОДЕ:", hostName: "ВЕДУЩИЙ (ИИ)" },
    EN: { placeholder: "I'M TAKING...", surrender: "SURRENDER", spilled: "SPILLED LEMONADE!", finish: "FINISHED!", concept: "THE CONCEPT WAS:", menu: "MENU", campers: "CAMPERS:", hostName: "HOST (AI)" },
    UA: { placeholder: "Я БЕРУ З СОБОЮ...", surrender: "ЗДАТИСЯ", spilled: "ПРОЛИТО ЛИМОНАД!", finish: "ФІНІШ!", concept: "КОНЦЕПТ БУВ:", menu: "В МЕНЮ", campers: "У ПОХОДІ:", hostName: "ВЕДУЧИЙ (ШІ)" },
    LV: { placeholder: "ES ŅEMU LĪDZI...", surrender: "PADOTIES", spilled: "IZLIETA LIMONĀDE!", finish: "FINIŠS!", concept: "KONCEPTS BIJA:", menu: "UZ IZVĒLNI", campers: "DALĪBNIEKI:", hostName: "VADĪTĀJS (AI)" }
  }[lang]

  useEffect(() => {
    if (!code || code === 'undefined') return
    
    const name = localStorage.getItem('picnic_player_name') || 'Guest'
    const hostStatus = localStorage.getItem('picnic_is_host') === 'true'
    setPlayerName(name)
    setIsHost(hostStatus)

    const fetchAll = async () => {
        const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single()
        if (room) {
            setRevealReason(room.secret_rule || '...')
            if (room.status === 'finished') setIsGameOver(true)
        }
        const { data: mv } = await supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true })
        if (mv) {
            setMoves(mv)
            const pNames = Array.from(new Set(mv.map(m => m.player_name)))
            if (!pNames.includes(name)) pNames.push(name)
            setPlayers(pNames as string[])
        }
    }
    fetchAll()

    const channel = supabase.channel(`room_${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` }, () => fetchAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (p) => {
        if (p.new.status === 'finished') setIsGameOver(true)
        if (p.new.secret_rule) setRevealReason(p.new.secret_rule)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code])

  const handleSend = async () => {
    if (!inputValue.trim() || isGameOver || isSpilled || code === 'undefined') return
    const text = inputValue.trim().toUpperCase()
    setInputValue('')

    // Вставляем ход игрока
    const { data: move } = await supabase.from('moves').insert([{
      room_code: code,
      player_name: playerName,
      item: text,
      status: (mode === 'solo' || mode === 'ai_host') ? 'approved' : 'pending',
      is_allowed: true
    }]).select().single()

    // Если судит ИИ
    if ((mode === 'solo' || mode === 'ai_host') && move) {
      const res = await fetch('/api/check', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: text, roomCode: code, lang, needHint: true }) 
      })
      const result = await res.json()
      
      // Обновляем результат игрока
      await supabase.from('moves').update({ is_allowed: result.allowed }).eq('id', move.id)
      
      // ИИ ДАЕТ СВОЕ СЛОВО (Обязательный ход хоста)
      if (result.hint) {
        await supabase.from('moves').insert([{
          room_code: code,
          player_name: t.hostName,
          item: result.hint,
          status: 'approved',
          is_allowed: true
        }])
      }

      if (!result.allowed) {
        setLives(l => {
          const newLives = l - 1
          if (newLives <= 0) {
            if (mode === 'solo') {
              setIsGameOver(true)
              supabase.from('rooms').update({ status: 'finished' }).eq('code', code).then(() => {})
            } else {
              setIsSpilled(true)
              setTimeout(() => { setIsSpilled(false); setLives(3); }, 8000)
            }
            return 0
          }
          return newLives
        })
      }
    }
  }

  const judge = async (id: string, allowed: boolean) => {
    await supabase.from('moves').update({ status: 'approved', is_allowed: allowed }).eq('id', id)
  }

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col p-6 relative font-sans overflow-hidden">
      {/* HEADER */}
      <div className="flex justify-between items-center z-10 mb-2">
        <h1 className="font-black text-2xl text-[#1A5319]">🧺 {code}</h1>
        <div className="flex gap-4 items-center">
            {!(mode === 'manual' && isHost) && (
                <div className="flex gap-1">{[...Array(lives)].map((_, i) => <span key={i}>🍋</span>)}</div>
            )}
            <button onClick={() => setHasSurrendered(true)} className="text-[10px] font-black opacity-30 uppercase">{t.surrender}</button>
        </div>
      </div>

      {/* PLAYERS LIST */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-green-100">
        <span className="text-[9px] font-black opacity-40 uppercase pt-1">{t.campers}</span>
        {players.map((p, i) => (
            <div key={i} className="bg-white/50 px-3 py-1 rounded-full text-[9px] font-bold text-[#1A5319] border border-green-200/50">● {p}</div>
        ))}
      </div>

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto space-y-4 py-8 pb-40 no-scrollbar">
        {moves.map((m, i) => (
          <div key={m.id || i} className={`flex flex-col ${m.player_name === playerName ? 'items-end' : 'items-start'}`}>
            <div className={`p-4 rounded-[25px] max-w-[80%] shadow-sm relative ${m.player_name === playerName ? 'bg-black text-white' : (m.player_name === t.hostName ? 'bg-green-100 text-green-900 border-2 border-green-200' : 'bg-white text-black')}`}>
              {m.status === 'approved' && (
                <div className={`absolute -top-1 ${m.player_name === playerName ? '-left-2' : '-right-2'} text-[10px] bg-white rounded-full shadow-sm w-5 h-5 flex items-center justify-center`}>
                  {m.is_allowed ? '✅' : '❌'}
                </div>
              )}
              <p className="text-[8px] font-bold opacity-40 mb-1 uppercase">{m.player_name}</p>
              <p className={`font-bold italic ${m.status === 'approved' && !m.is_allowed ? 'line-through opacity-30' : ''}`}>"{m.item}"</p>
              
              {isHost && mode === 'manual' && m.status === 'pending' && m.player_name !== playerName && (
                <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                  <button onClick={() => judge(m.id, true)} className="bg-green-500 text-white px-3 py-1 rounded-full text-[9px] font-black">✅ OK</button>
                  <button onClick={() => judge(m.id, false)} className="bg-red-500 text-white px-3 py-1 rounded-full text-[9px] font-black">❌ NO</button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="text-center opacity-10 py-10"><p className="text-[9px] font-black tracking-widest uppercase">MADE BY SOLO</p></div>
      </div>

      {/* INPUT */}
      {!hasSurrendered && !isGameOver && (
        <div className="fixed bottom-8 left-6 right-6 flex gap-2 z-40">
          <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={isSpilled} className="flex-1 bg-white p-5 rounded-[22px] shadow-2xl font-bold outline-none" placeholder={isSpilled ? t.spilled : t.placeholder} />
          <button onClick={handleSend} className="w-16 h-16 bg-[#22C55E] rounded-[22px] shadow-xl flex items-center justify-center text-2xl active:scale-90">🧺</button>
        </div>
      )}

      {/* REVEAL OVERLAY */}
      <AnimatePresence>
        {(hasSurrendered || isGameOver) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-[#F0FFF4]/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="bg-[#1A5319] text-white p-10 rounded-[40px] shadow-2xl space-y-6">
              <h2 className="text-4xl font-black italic">{t.finish}</h2>
              <div>
                <p className="opacity-40 text-[9px] uppercase font-bold tracking-widest">{t.concept}</p>
                <p className="text-2xl font-bold italic mt-2">"{revealReason}"</p>
              </div>
              <button onClick={() => router.push('/')} className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-[10px] tracking-widest">{t.menu}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SPILLED LEMONADE */}
      <AnimatePresence>
        {isSpilled && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-yellow-400/90 flex items-center justify-center p-10 text-center">
            <div className="text-yellow-900 font-black uppercase italic">
              <span className="text-9xl block mb-4">🥤</span>
              <p className="text-3xl">{t.spilled}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}