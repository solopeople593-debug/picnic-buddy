'use client'
import { useState, useEffect, useRef, use as useReact } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'

type SupportedLangs = 'RU' | 'EN' | 'UA' | 'LV'

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = useReact(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const langParam = searchParams.get('lang') || 'RU'
  const lang = (['RU', 'EN', 'UA', 'LV'].includes(langParam) ? langParam : 'RU') as SupportedLangs
  const mode = searchParams.get('mode') || 'solo'
  const subMode = searchParams.get('sub') || 'hardcore'

  const [moves, setMoves] = useState<any[]>([])
  const [players, setPlayers] = useState<string[]>([])
  const [playerLives, setPlayerLives] = useState<Record<string, number>>({})
  const [spilledPlayers, setSpilledPlayers] = useState<Record<string, boolean>>({})
  const [inputValue, setInputValue] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isVictory, setIsVictory] = useState(false)
  const [hasSurrendered, setHasSurrendered] = useState(false)
  const [revealReason, setRevealReason] = useState('???')
  const [playerName, setPlayerName] = useState('')
  const [whisper, setWhisper] = useState<string | null>(null)
  const [whisperDanger, setWhisperDanger] = useState(false)
  const [eliminatedPlayers, setEliminatedPlayers] = useState<string[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const isSolo = mode === 'solo'
  const isAssist = mode === 'manual' && subMode === 'assist'
  const myLives = playerLives[playerName] ?? 3
  const isSpilled = spilledPlayers[playerName] ?? false
  const isEliminated = eliminatedPlayers.includes(playerName)

  const t: any = {
    RU: {
      placeholder: "Я БЕРУ С СОБОЙ...", surrender: "СДАТЬСЯ",
      spilled: "ТЫ ПРОЛИЛ ЛИМОНАД!", finish: "ФИНИШ!", concept: "КОНЦЕПТ ПОХОДА БЫЛ:",
      menu: "В ГЛАВНОЕ МЕНЮ", hostName: "ВЕДУЩИЙ ИИ", campers: "В ПОХОДЕ:",
      spilledMsg: (n: string) => `🥤 ${n} ПРОЛИЛ ЛИМОНАД!`,
      eliminatedMsg: (n: string) => `💀 ${n} ВЫБЫЛ ИЗ ИГРЫ!`,
      whisperLabel: "🤫 ТОЛЬКО ДЛЯ ТЕБЯ:",
      victory: "ТЫ УГАДАЛ!", victorySub: "КОНЦЕПТ БЫЛ:",
      defeat: "ТЫ ПРОИГРАЛ", defeatSub: "КОНЦЕПТ БЫЛ:",
      surrenderTitle: "СДАЛСЯ",
      eliminated: "ТЫ ВЫБЫЛ!", eliminatedSub: "КОНЦЕПТ БЫЛ:",
    },
    EN: {
      placeholder: "I'M TAKING...", surrender: "SURRENDER",
      spilled: "YOU SPILLED LEMONADE!", finish: "FINISHED!", concept: "THE CONCEPT WAS:",
      menu: "MAIN MENU", hostName: "HOST AI", campers: "CAMPERS:",
      spilledMsg: (n: string) => `🥤 ${n} SPILLED LEMONADE!`,
      eliminatedMsg: (n: string) => `💀 ${n} IS OUT!`,
      whisperLabel: "🤫 ONLY FOR YOU:",
      victory: "YOU GUESSED IT!", victoryVSub: "THE CONCEPT WAS:",
      defeat: "YOU LOST", defeatSub: "THE CONCEPT WAS:",
      surrenderTitle: "SURRENDERED",
      eliminated: "YOU'RE OUT!", eliminatedSub: "THE CONCEPT WAS:",
    },
    UA: {
      placeholder: "Я БЕРУ З СОБОЮ...", surrender: "ЗДАТИСЯ",
      spilled: "ТИ ПРОЛИВ ЛІМОНАД!", finish: "ФІНІШ!", concept: "КОНЦЕПТ ПОХОДУ БУВ:",
      menu: "В ГОЛОВНЕ МЕНЮ", hostName: "ВЕДУЧИЙ ШІ", campers: "У ПОХОДІ:",
      spilledMsg: (n: string) => `🥤 ${n} ПРОЛИВ ЛІМОНАД!`,
      eliminatedMsg: (n: string) => `💀 ${n} ВИБУВ!`,
      whisperLabel: "🤫 ТІЛЬКИ ДЛЯ ТЕБЕ:",
      victory: "ТИ ВГАДАВ!", victoryVSub: "КОНЦЕПТ БУВ:",
      defeat: "ТИ ПРОГРАВ", defeatSub: "КОНЦЕПТ БУВ:",
      surrenderTitle: "ЗДАВСЯ",
      eliminated: "ТИ ВИБУВ!", eliminatedSub: "КОНЦЕПТ БУВ:",
    },
    LV: {
      placeholder: "ES ŅEMU LĪDZI...", surrender: "PADOTIES",
      spilled: "TU IZLĒJI LIMONĀDI!", finish: "FINIŠS!", concept: "PĀRGĀJIENA KONCEPTS BIJA:",
      menu: "UZ GALVENO IZVĒLNI", hostName: "VADĪТĀJS AI", campers: "DALĪBNIEKI:",
      spilledMsg: (n: string) => `🥤 ${n} IZLĒJA LIMONĀDI!`,
      eliminatedMsg: (n: string) => `💀 ${n} IR ĀRĀ!`,
      whisperLabel: "🤫 TIKAI TEV:",
      victory: "TU UZMINĒJI!", victoryVSub: "KONCEPTS BIJA:",
      defeat: "TU ZAUDĒJI", defeatSub: "KONCEPTS BIJA:",
      surrenderTitle: "PADEVĀS",
      eliminated: "TU ESI ĀRĀ!", eliminatedSub: "KONCEPTS BIJA:",
    },
  }[lang]

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [moves])

  useEffect(() => {
    if (!code || code === 'undefined') return
    const name = localStorage.getItem('picnic_player_name') || 'Guest'
    const hostStatus = localStorage.getItem('picnic_is_host') === 'true'
    setPlayerName(name)
    setIsHost(hostStatus)

    const fetchAll = async () => {
      const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single()
      if (room) {
        setRevealReason(room.secret_rule || '???')
        if (room.status === 'finished') setIsGameOver(true)
        if (room.status === 'victory') setIsVictory(true)
        const livesData: Record<string, number> = room.lives || {}
        if (!(name in livesData)) {
          livesData[name] = 3
          await supabase.from('rooms').update({ lives: livesData }).eq('code', code)
        }
        setPlayerLives(livesData)
      }

      const { data: mv } = await supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true })
      if (mv) {
        setMoves(mv)
        if (!isSolo) {
          const names = Array.from(new Set(mv.map((m: any) => m.player_name).filter((n: string) => n !== t.hostName))) as string[]
          if (!names.includes(name)) names.push(name)
          setPlayers(names)
        }
      }
    }

    fetchAll()

    const channel = supabase.channel(`game-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` }, () => fetchAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (p) => {
        if (p.new.status === 'finished') setIsGameOver(true)
        if (p.new.status === 'victory') setIsVictory(true)
        if (p.new.secret_rule) setRevealReason(p.new.secret_rule)
        if (p.new.lives) setPlayerLives(p.new.lives)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code])

  const checkWhisper = async (currentMoves: any[]) => {
    if (!isAssist || !isHost) return
    const playerMovesCount = currentMoves.filter((m: any) => m.player_name !== t.hostName).length
    if (playerMovesCount === 0 || playerMovesCount % 3 !== 0) return
    try {
      const res = await fetch('/api/whisper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomCode: code, lang }) })
      const data = await res.json()
      if (data.whisper) {
        setWhisper(data.whisper)
        setWhisperDanger(data.danger)
        setTimeout(() => setWhisper(null), 6000)
      }
    } catch { }
  }

  const handleLoseLive = async (targetPlayer: string) => {
    const { data: room } = await supabase.from('rooms').select('lives').eq('code', code).single()
    const currentLives: Record<string, number> = room?.lives || {}
    const newCount = Math.max((currentLives[targetPlayer] ?? 3) - 1, 0)
    const updated = { ...currentLives, [targetPlayer]: newCount }
    await supabase.from('rooms').update({ lives: updated }).eq('code', code)
    setPlayerLives(updated)

    if (newCount <= 0) {
      if (isSolo) {
        setIsGameOver(true)
        await supabase.from('rooms').update({ status: 'finished' }).eq('code', code)
      } else {
        // В мультиплеере — игрок выбывает навсегда
        await supabase.from('moves').insert([{
          room_code: code, player_name: t.hostName,
          item: t.eliminatedMsg(targetPlayer), status: 'approved', is_allowed: true
        }])
        setEliminatedPlayers(prev => [...prev, targetPlayer])
      }
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isGameOver || isVictory || isSpilled || isChecking || isEliminated || code === 'undefined') return
    const text = inputValue.trim().toUpperCase()
    setInputValue('')
    setIsChecking(true)

    try {
      const { data: move } = await supabase.from('moves').insert([{
        room_code: code, player_name: playerName, item: text,
        status: (mode === 'solo' || mode === 'ai_host') ? 'approved' : 'pending', is_allowed: true
      }]).select().single()

      if ((mode === 'solo' || mode === 'ai_host') && move) {
        const res = await fetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: text, roomCode: code, lang, needHint: true }) })
        const result = await res.json()

        // Проверяем победу
        if (result.guessed) {
          await supabase.from('moves').update({ is_allowed: true }).eq('id', move.id)
          await supabase.from('rooms').update({ status: 'victory' }).eq('code', code)
          setIsVictory(true)
          return
        }

        await supabase.from('moves').update({ is_allowed: result.allowed }).eq('id', move.id)
        if (result.hint) {
          await supabase.from('moves').insert([{ room_code: code, player_name: t.hostName, item: result.hint, status: 'approved', is_allowed: true }])
        }
        if (!result.allowed) await handleLoseLive(playerName)
      }

      if (isAssist && move) {
        const res = await fetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: text, roomCode: code, lang, needHint: false }) })
        const result = await res.json()
        if (result.guessed) {
          await supabase.from('rooms').update({ status: 'victory' }).eq('code', code)
          setIsVictory(true)
          return
        }
        await supabase.from('moves').update({ status: 'approved', is_allowed: result.allowed }).eq('id', move.id)
        if (!result.allowed) await handleLoseLive(playerName)
      }

      const { data: freshMoves } = await supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true })
      if (freshMoves) await checkWhisper(freshMoves)
    } finally {
      setIsChecking(false)
    }
  }

  const judge = async (id: string, allowed: boolean) => {
    await supabase.from('moves').update({ status: 'approved', is_allowed: allowed }).eq('id', id)
    if (!allowed) {
      const { data: move } = await supabase.from('moves').select('player_name').eq('id', id).single()
      if (move) await handleLoseLive(move.player_name)
    }
    const { data: freshMoves } = await supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true })
    if (freshMoves) await checkWhisper(freshMoves)
  }

  // Определяем какой оверлей показывать
  const showVictory = isVictory
  const showDefeat = isGameOver && !isVictory && isSolo
  const showEliminated = isEliminated && !isSolo
  const showSurrender = hasSurrendered && !isVictory && !isGameOver

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col p-6 relative font-sans overflow-hidden">

      {/* HEADER */}
      <div className="flex justify-between items-center z-10">
        <h1 className="font-black text-2xl text-[#1A5319]">🧺 {code && code !== 'undefined' ? code : '...'}</h1>
        <div className="flex gap-4 items-center">
          {!(mode === 'manual' && isHost) && (
            <div className="flex gap-1">
              {[...Array(Math.max(myLives, 0))].map((_, i) => <span key={i} className="text-3xl">🍋</span>)}
            </div>
          )}
          <button onClick={() => setHasSurrendered(true)} className="text-[10px] font-black opacity-30 uppercase hover:opacity-100 transition-opacity">{t.surrender}</button>
        </div>
      </div>

      {/* CAMPERS — только мультиплеер */}
      {!isSolo && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 border-b border-green-100 mt-2">
          <span className="text-[9px] font-black opacity-30 uppercase pt-1">{t.campers}</span>
          {players.map((p, i) => {
            const pLives = playerLives[p] ?? 3
            const pEliminated = eliminatedPlayers.includes(p)
            return (
              <div key={i} className={`px-3 py-1 rounded-full text-[9px] font-bold border whitespace-nowrap flex items-center gap-1 ${pEliminated ? 'bg-red-100 text-red-800 border-red-200 line-through opacity-50' : 'bg-white/50 text-[#1A5319] border-green-200/50'}`}>
                {pEliminated ? '💀' : '●'} {p}
                {!pEliminated && <span className="opacity-50 text-base">{'🍋'.repeat(Math.max(pLives, 0))}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* WHISPER */}
      <AnimatePresence>
        {whisper && isHost && isAssist && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`mt-3 px-5 py-3 rounded-[18px] text-[11px] font-bold border-2 ${whisperDanger ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
            <span className="opacity-50 text-[9px] uppercase tracking-widest block mb-1">{t.whisperLabel}</span>
            {whisper}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto space-y-4 py-8 pb-40 no-scrollbar">
        {moves.map((m, i) => {
          const isSystemMsg = m.player_name === t.hostName && (m.item.includes('🥤') || m.item.includes('💀'))
          const isHintMsg = m.player_name === t.hostName && !isSystemMsg

          if (isSystemMsg) {
            return (
              <div key={m.id || i} className="flex justify-center">
                <div className={`px-6 py-3 rounded-[20px] font-black text-[11px] uppercase tracking-wider border ${m.item.includes('💀') ? 'bg-red-100 text-red-800 border-red-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                  {m.item}
                </div>
              </div>
            )
          }

          return (
            <div key={m.id || i} className={`flex flex-col ${m.player_name === playerName ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-[25px] max-w-[80%] shadow-sm relative ${m.player_name === playerName ? 'bg-black text-white' : isHintMsg ? 'bg-green-100 text-green-900 border-2 border-green-200' : 'bg-white text-black'}`}>
                {m.status === 'approved' && !isHintMsg && (
                  <div className={`absolute -top-1 ${m.player_name === playerName ? '-left-2' : '-right-2'} text-[10px] bg-white rounded-full shadow-md w-5 h-5 flex items-center justify-center`}>
                    {m.is_allowed ? '✅' : '❌'}
                  </div>
                )}
                <p className="text-[8px] font-bold opacity-40 mb-1 uppercase tracking-widest">{m.player_name}</p>
                <p className={`font-bold italic ${m.status === 'approved' && !m.is_allowed ? 'line-through opacity-30' : ''}`}>"{m.item}"</p>
                {isHost && mode === 'manual' && subMode === 'hardcore' && m.status === 'pending' && m.player_name !== playerName && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                    <button onClick={() => judge(m.id, true)} className="bg-green-500 text-white px-3 py-1.5 rounded-full text-[9px] font-black">✅ OK</button>
                    <button onClick={() => judge(m.id, false)} className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[9px] font-black">❌ NO</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={chatEndRef} />
        <div className="pt-4 pb-4 text-center opacity-10 font-black uppercase tracking-[0.3em] text-[9px]">MADE BY SOLO</div>
      </div>

      {/* INPUT */}
      {!hasSurrendered && !isGameOver && !isVictory && !isEliminated && (
        <div className="fixed bottom-8 left-6 right-6 flex gap-2 z-40">
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={isSpilled || isChecking}
            className="flex-1 bg-white p-5 rounded-[22px] shadow-2xl font-bold outline-none border-none ring-offset-2 focus:ring-2 ring-green-300 disabled:opacity-50 transition-all"
            placeholder={isSpilled ? t.spilled : isChecking ? '...' : t.placeholder}
          />
          <button onClick={handleSend} disabled={!inputValue.trim() || isSpilled || isChecking} className="w-16 h-16 bg-[#22C55E] rounded-[22px] shadow-xl flex items-center justify-center text-2xl active:scale-95 transition-all disabled:grayscale disabled:opacity-50">
            {isChecking ? '⏳' : '🧺'}
          </button>
        </div>
      )}

      {/* OVERLAY: ПОБЕДА 🏆 */}
      <AnimatePresence>
        {showVictory && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute inset-0 z-50 bg-[#F0FFF4]/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm space-y-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 0.2, duration: 0.5 }} className="text-8xl">🏆</motion.div>
              <div className="bg-[#1A5319] p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">{t.victory}</h2>
                <p className="opacity-40 text-[9px] uppercase font-bold tracking-widest text-white mb-2">{t.concept}</p>
                <p className="text-2xl font-bold italic underline decoration-green-400 decoration-2 underline-offset-4 mb-8 text-white">"{revealReason}"</p>
                <button onClick={() => router.push('/')} className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-[10px] tracking-widest hover:bg-gray-100">{t.menu}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY: ПОРАЖЕНИЕ в соло 💀 */}
      <AnimatePresence>
        {showDefeat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm space-y-6">
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl">🥀</motion.div>
              <div className="bg-[#1a1a1a] border border-white/10 p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">{t.defeat}</h2>
                <p className="opacity-40 text-[9px] uppercase font-bold tracking-widest text-white mb-2">{t.defeatSub}</p>
                <p className="text-2xl font-bold italic underline decoration-red-400 decoration-2 underline-offset-4 mb-8 text-white">"{revealReason}"</p>
                <button onClick={() => router.push('/')} className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-[10px] tracking-widest hover:bg-gray-100">{t.menu}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY: ВЫБЫЛ в мультиплеере */}
      <AnimatePresence>
        {showEliminated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm space-y-6">
              <motion.div initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl">💀</motion.div>
              <div className="bg-[#1a1a1a] border border-white/10 p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">{t.eliminated}</h2>
                <p className="opacity-40 text-[9px] uppercase font-bold tracking-widest text-white mb-2">{t.eliminatedSub}</p>
                <p className="text-2xl font-bold italic underline decoration-red-400 decoration-2 underline-offset-4 mb-8 text-white">"{revealReason}"</p>
                <button onClick={() => router.push('/')} className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-[10px] tracking-widest hover:bg-gray-100">{t.menu}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY: СДАЧА */}
      <AnimatePresence>
        {showSurrender && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="absolute inset-0 z-50 bg-[#F0FFF4]/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm space-y-6">
              <motion.div initial={{ rotate: -10, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl">🏳️</motion.div>
              <div className="bg-[#1A5319] p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">{t.surrenderTitle}</h2>
                <p className="opacity-40 text-[9px] uppercase font-bold tracking-widest text-white mb-2">{t.concept}</p>
                <p className="text-2xl font-bold italic underline decoration-green-400 decoration-2 underline-offset-4 mb-8 text-white">"{revealReason}"</p>
                <button onClick={() => router.push('/')} className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-[10px] tracking-widest hover:bg-gray-100">{t.menu}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY: SPILLED только соло */}
      <AnimatePresence>
        {isSolo && isSpilled && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-yellow-400/90 flex items-center justify-center p-10 text-center backdrop-blur-sm">
            <div className="text-yellow-900 font-black uppercase italic space-y-4">
              <span className="text-9xl block animate-bounce">🥤</span>
              <p className="text-3xl">{t.spilled}</p>
              <p className="text-[10px] opacity-60 tracking-widest">8 seconds...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}