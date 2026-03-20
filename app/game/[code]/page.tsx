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
  const noLives = searchParams.get('nolives') === 'true'

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
  const [winner, setWinner] = useState<string>('')
  const [turnPlayer, setTurnPlayer] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [showRuleReminder, setShowRuleReminder] = useState(false)
  
  // Состояния для ИИ
  const [aiQuestion, setAiQuestion] = useState<string>('')
  const [aiQuestionType, setAiQuestionType] = useState<'question' | 'guess'>('question')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [aiAttemptsLeft, setAiAttemptsLeft] = useState(3)
  const [isGuessPhase, setIsGuessPhase] = useState(false)
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  const isSolo = mode === 'solo'
  const isAiGuesses = mode === 'ai_guesses'
  const isAiHost = mode === 'ai_host'
  const isAssist = mode === 'manual' && subMode === 'assist'
  const isManual = mode === 'manual'

  const myLives = playerLives[playerName] ?? 3
  const isSpilled = spilledPlayers[playerName] ?? false
  const isEliminated = eliminatedPlayers.includes(playerName)

  const isMyTurn = isSolo || isAiGuesses || turnPlayer === playerName

  const t: any = {
    RU: {
      title: "ПИКНИК БАДДИ", placeholder: "Я БЕРУ С СОБОЙ...", surrender: "СДАТЬСЯ",
      spilled: "ТЫ ПРОЛИЛ ЛИМОНАД!", concept: "КОНЦЕПТ ПОХОДА БЫЛ:",
      menu: "В ГЛАВНОЕ МЕНЮ", hostName: "ВЕДУЩИЙ ИИ", campers: "В ПОХОДЕ:",
      spilledMsg: (n: string) => `🥤 ${n} ПРОЛИЛ ЛИМОНАД!`,
      eliminatedMsg: (n: string) => `💀 ${n} ВЫБЫЛ ИЗ ИГРЫ!`,
      winnerMsg: (n: string) => `🏆 ${n} УГАДАЛ КОНЦЕПТ!`,
      whisperLabel: "🤫 ТОЛЬКО ДЛЯ ТЕБЯ:", victory: "ТЫ УГАДАЛ!", defeat: "ТЫ ПРОИГРАЛ",
      surrenderTitle: "СДАЛСЯ", eliminated: "ТЫ ВЫБЫЛ!",
      playerGuessed: "УГАДАЛ!", duplicate: "Это слово уже было!",
      notYourTurn: (n: string) => `Ходит ${n}...`,
      hostHint: "ПОДСКАЗКА ХОСТА", copied: "СКОПИРОВАНО!",
      ruleReminder: "ТВОЁ ПРАВИЛО:",
      aiGuessVictory: "ИИ УГАДАЛ!", aiGuessDefeat: "ТЫ ПОБЕДИЛ!",
      aiDefeatSub: "ИИ НЕ СМОГ УГАДАТЬ ТВОЁ СЛОВО:",
      startAiGame: "НАЧАТЬ — ИИ ЗАДАЁТ ВОПРОСЫ",
      aiThinking: "ИИ ДУМАЕТ...", yesAnswer: "ДА", noAnswer: "НЕТ",
      aiGuessLabel: "🎯 ИИ ДУМАЕТ ЧТО ЭТО:", aiQuestionLabel: "❓ ВОПРОС ОТ ИИ:",
      aiAttemptsLeft: (n: number) => `Попыток угадать: ${n}`,
      guessPhaseLabel: "ИИ УГАДУЕТ — ОСТАЛОСЬ ПОПЫТОК:",
      myTurn: "ТВОЙ ХОД", theirTurn: (n: string) => `ХОД: ${n}`,
      pending: "Проверка..."
    },
    EN: {
      title: "PICNIC BUDDY", placeholder: "I'M TAKING...", surrender: "SURRENDER",
      spilled: "YOU SPILLED LEMONADE!", concept: "THE CONCEPT WAS:",
      menu: "MAIN MENU", hostName: "HOST AI", campers: "CAMPERS:",
      spilledMsg: (n: string) => `🥤 ${n} SPILLED LEMONADE!`,
      eliminatedMsg: (n: string) => `💀 ${n} IS OUT!`,
      winnerMsg: (n: string) => `🏆 ${n} GUESSED IT!`,
      whisperLabel: "🤫 ONLY FOR YOU:", victory: "YOU GUESSED IT!", defeat: "YOU LOST",
      surrenderTitle: "SURRENDERED", eliminated: "YOU'RE OUT!",
      playerGuessed: "GUESSED!", duplicate: "Already used!",
      notYourTurn: (n: string) => `${n}'s turn...`,
      hostHint: "HOST HINT", copied: "COPIED!",
      ruleReminder: "YOUR RULE:",
      aiGuessVictory: "AI GUESSED IT!", aiGuessDefeat: "YOU WIN!",
      aiDefeatSub: "AI FAILED TO GUESS:",
      startAiGame: "START — AI ASKS QUESTIONS",
      aiThinking: "AI THINKING...", yesAnswer: "YES", noAnswer: "NO",
      aiGuessLabel: "🎯 AI GUESS:", aiQuestionLabel: "❓ AI QUESTION:",
      aiAttemptsLeft: (n: number) => `Guesses left: ${n}`,
      guessPhaseLabel: "AI GUESSING — ATTEMPTS LEFT:",
      myTurn: "YOUR TURN", theirTurn: (n: string) => `TURN: ${n}`,
      pending: "Checking..."
    },
    UA: {
      title: "ПІКНІК БАДІ", placeholder: "Я БЕРУ З СОБОЮ...", surrender: "ЗДАТИСЯ",
      spilled: "ТИ ПРОЛИВ ЛИМОНАД!", concept: "КОНЦЕПТ ПОХОДУ БУВ:",
      menu: "В ГОЛОВНЕ МЕНЮ", hostName: "ВЕДУЧИЙ ШІ", campers: "У ПОХОДІ:",
      spilledMsg: (n: string) => `🥤 ${n} ПРОЛИВ ЛИМОНАД!`,
      eliminatedMsg: (n: string) => `💀 ${n} ВИБУВ!`,
      winnerMsg: (n: string) => `🏆 ${n} ВГАДАВ КОНЦЕПТ!`,
      whisperLabel: "🤫 ТІЛЬКИ ДЛЯ ТЕБЕ:", victory: "ТИ ВГАДАВ!", defeat: "ТИ ПРОГРАВ",
      surrenderTitle: "ЗДАВСЯ", eliminated: "ТИ ВИБУВ!",
      playerGuessed: "ВГАДАВ!", duplicate: "Це слово вже було!",
      notYourTurn: (n: string) => `Хід гравця ${n}...`,
      hostHint: "ПІДКАЗКА ХОСТА", copied: "СКОПІЙОВАНО!",
      ruleReminder: "ТВОЄ ПРАВИЛО:",
      aiGuessVictory: "ШІ ВГАДАВ!", aiGuessDefeat: "ТИ ПЕРЕМІГ!",
      aiDefeatSub: "ШІ НЕ ЗМІГ ВГАДАТИ:",
      startAiGame: "СТАРТ — ШІ СТАВИТЬ ПИТАННЯ",
      aiThinking: "ШІ ДУМАЄ...", yesAnswer: "ТАК", noAnswer: "НІ",
      aiGuessLabel: "🎯 ШІ ДУМАЄ ЩО ЦЕ:", aiQuestionLabel: "❓ ПИТАННЯ ВІД ШІ:",
      aiAttemptsLeft: (n: number) => `Спроб: ${n}`,
      guessPhaseLabel: "ШІ ВГАДУЄ — ЗАЛИШИЛОСЬ СПРОБ:",
      myTurn: "ТВІЙ ХІД", theirTurn: (n: string) => `ХІД: ${n}`,
      pending: "Перевірка..."
    },
    LV: {
      title: "PIKNIKA BIEDRS", placeholder: "ES ŅEMU LĪDZI...", surrender: "PADOTIES",
      spilled: "TU IZLĒJI LIMONĀDI!", concept: "PĀRGĀJIENA KONCEPTS BIJA:",
      menu: "UZ GALVENO IZVĒLNI", hostName: "VADĪTĀJS AI", campers: "DALĪBNIEKI:",
      spilledMsg: (n: string) => `🥤 ${n} IZLĒJA LIMONĀDI!`,
      eliminatedMsg: (n: string) => `💀 ${n} IR ĀRĀ!`,
      winnerMsg: (n: string) => `🏆 ${n} UZMINĒJA!`,
      whisperLabel: "🤫 TIKAI TEV:", victory: "TU UZMINĒJI!", defeat: "TU ZAUDĒJI",
      surrenderTitle: "PADEVĀS", eliminated: "TU ESI ĀRĀ!",
      playerGuessed: "UZMINĒJA!", duplicate: "Jau bija!",
      notYourTurn: (n: string) => `${n} gājiens...`,
      hostHint: "VADĪTĀJA PADOMS", copied: "NOKOPĒTS!",
      ruleReminder: "TAVS NOTEIKUMS:",
      aiGuessVictory: "AI UZMINĒJA!", aiGuessDefeat: "TU UZVARĒJI!",
      aiDefeatSub: "AI NEUZMINĒJA:",
      startAiGame: "SĀKT — AI UZDOD JAUTĀJUMUS",
      aiThinking: "AI DOMĀ...", yesAnswer: "JĀ", noAnswer: "NĒ",
      aiGuessLabel: "🎯 AI DOMĀ KA TAS IR:", aiQuestionLabel: "❓ AI JAUTĀJUMS:",
      aiAttemptsLeft: (n: number) => `Minējumi: ${n}`,
      guessPhaseLabel: "AI MIN — ATLIKUŠI MĒĢINĀJUMI:",
      myTurn: "TAVS GĀJIENS", theirTurn: (n: string) => `GĀJIENS: ${n}`,
      pending: "Pārbaude..."
    }
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
        if (room.status === 'victory') { setIsVictory(true); setWinner(room.winner || '') }
        setTurnPlayer(room.turn_player || '')
        
        const livesData: Record<string, number> = room.lives || {}
        if (!(name in livesData) && !noLives) {
          livesData[name] = 3
          await supabase.from('rooms').update({ lives: livesData }).eq('code', code)
        }
        setPlayerLives(livesData)
      }

      const { data: mv } = await supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true })

      if (mv) {
        setMoves(mv)

        if (!isSolo && !isAiGuesses) {
          const names = Array.from(new Set(mv.map((m: any) => m.player_name).filter((n: string) => n !== t.hostName))) as string[]
          if (!names.includes(name)) names.push(name)

          const livesPlayers = Object.keys(room?.lives || {})
          livesPlayers.forEach(p => { if (!names.includes(p)) names.push(p) })

          const sortedPlayers = names.sort()
          setPlayers(sortedPlayers)

          const { data: freshRoom } = await supabase.from('rooms').select('turn_player').eq('code', code).single()
          if ((!freshRoom?.turn_player || freshRoom.turn_player === '') && sortedPlayers.length > 0) {
            const firstPlayer = sortedPlayers[0]
            await supabase.from('rooms').update({ turn_player: firstPlayer }).eq('code', code)
            setTurnPlayer(firstPlayer)
          }
        }
      }
    }

    fetchAll()

    const channel = supabase.channel(`game-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moves', filter: `room_code=eq.${code}` }, () => fetchAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (p) => {
        if (p.new.status === 'finished') setIsGameOver(true)
        if (p.new.status === 'victory') { setIsVictory(true); setWinner(p.new.winner || '') }
        if (p.new.secret_rule) setRevealReason(p.new.secret_rule)
        
        if (p.new.lives) {
          setPlayerLives(p.new.lives)
          setPlayers(prev => Array.from(new Set([...prev, ...Object.keys(p.new.lives)])).sort())
        }
        
        if (p.new.turn_player !== undefined) setTurnPlayer(p.new.turn_player || '')
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code, isSolo, isAiGuesses])

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const nextTurn = async (currentPlayers: string[], currentTurn: string, hostName: string) => {
    if (isSolo || isAiGuesses) return
    const gamePlayers = currentPlayers.filter(p => p !== hostName).sort()
    if (gamePlayers.length === 0) return

    if (!currentTurn || currentTurn === '' || currentTurn === hostName) {
      await supabase.from('rooms').update({ turn_player: gamePlayers[0] }).eq('code', code)
    } else {
      const idx = gamePlayers.indexOf(currentTurn)
      const nextIdx = (idx + 1) % gamePlayers.length
      if (idx === gamePlayers.length - 1 && isManual) {
         await supabase.from('rooms').update({ turn_player: hostName }).eq('code', code)
      } else {
         await supabase.from('rooms').update({ turn_player: gamePlayers[nextIdx] }).eq('code', code)
      }
    }
  }

  const handleLoseLive = async (targetPlayer: string) => {
    if (noLives) return
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
        await supabase.from('moves').insert([{ room_code: code, player_name: t.hostName, item: t.eliminatedMsg(targetPlayer), status: 'approved', is_allowed: true }])
        setEliminatedPlayers(prev => [...prev, targetPlayer])
      }
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isGameOver || isVictory || isSpilled || isChecking || isEliminated || code === 'undefined') return
    if (!isMyTurn && !isHost) return

    const text = inputValue.trim().toUpperCase()
    const isDuplicate = moves.some(m => m.item === text && m.player_name !== t.hostName)
    if (isDuplicate) { alert(t.duplicate); return }

    setInputValue('')
    setIsChecking(true)

    try {
      const { data: move } = await supabase.from('moves').insert([{
        room_code: code,
        player_name: playerName,
        item: text,
        status: isSolo ? 'approved' : 'pending',
        is_allowed: true
      }]).select().single()

      if (!move) return

      if (isSolo) {
        const res = await fetch('/api/check', { method: 'POST', body: JSON.stringify({ item: text, roomCode: code, lang, needHint: true }) })
        const result = await res.json()
        if (result.guessed) {
          await supabase.from('moves').update({ is_allowed: true }).eq('id', move.id)
          await supabase.from('rooms').update({ status: 'victory', winner: playerName }).eq('code', code)
          setIsVictory(true); setWinner(playerName)
          return
        }
        await supabase.from('moves').update({ is_allowed: result.allowed }).eq('id', move.id)
        if (result.hint) await supabase.from('moves').insert([{ room_code: code, player_name: t.hostName, item: result.hint, status: 'approved', is_allowed: true }])
        if (!result.allowed) await handleLoseLive(playerName)
      }

      if (isAiHost) {
        const res = await fetch('/api/check', { method: 'POST', body: JSON.stringify({ item: text, roomCode: code, lang, needHint: false }) })
        const result = await res.json()

        if (result.guessed) {
          await supabase.from('moves').update({ is_allowed: true, status: 'approved' }).eq('id', move.id)
          await supabase.from('rooms').update({ status: 'victory', winner: playerName }).eq('code', code)
          setIsVictory(true); setWinner(playerName)
          return
        }

        await supabase.from('moves').update({ is_allowed: result.allowed, status: 'approved' }).eq('id', move.id)
        if (!result.allowed) await handleLoseLive(playerName)

        const { data: freshRoom } = await supabase.from('rooms').select('lives').eq('code', code).single()
        let allPlayers = Array.from(new Set([...Object.keys(freshRoom?.lives || {}), ...players])).sort()
        const activePlayers = allPlayers.filter(p => !eliminatedPlayers.includes(p))

        if (activePlayers.length > 0) {
          const currentIdx = activePlayers.indexOf(playerName)
          const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % activePlayers.length
          const nextPlayer = activePlayers[nextIdx]

          if (nextIdx === 0 && activePlayers.length > 1) {
            const checkRes = await fetch('/api/check', { method: 'POST', body: JSON.stringify({ item: text, roomCode: code, lang, needHint: true }) })
            const checkResult = await checkRes.json()
            if (checkResult.hint) await supabase.from('moves').insert([{ room_code: code, player_name: t.hostName, item: checkResult.hint, status: 'approved', is_allowed: true }])
          }

          await supabase.from('rooms').update({ turn_player: nextPlayer }).eq('code', code)
        }
      }

      if (!isSolo && !isAiGuesses && !isAiHost) {
        const hostName = isHost ? playerName : players[0]
        await nextTurn(players, turnPlayer, hostName)
      }

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
  }

  const canType = !isSpilled && !isChecking && isMyTurn && !isGameOver && !isVictory && !isEliminated

  const getPlaceholder = () => {
    if (isSpilled) return t.spilled
    if (isChecking) return '...'
    if (!isMyTurn && turnPlayer) return t.notYourTurn(turnPlayer)
    return t.placeholder
  }

  return (
    <div className="min-h-screen bg-[#F0FFF4] font-sans">
      <div className="w-full max-w-2xl mx-auto flex flex-col h-screen px-4 md:px-8 py-4 md:py-6">

        {/* HEADER */}
        <div className="flex justify-between items-center relative mb-3">
          <button onClick={() => router.push('/')} className="text-2xl opacity-20 hover:opacity-60 transition-opacity">←</button>
          <div className="absolute left-1/2 -translate-x-1/2">
            <button onClick={() => router.push('/')} className="font-black text-sm md:text-base text-[#1A5319] opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest">
              {t.title}
            </button>
          </div>
          <div className="flex gap-2 md:gap-3 items-center">
            {!isManual && !noLives && !isAiGuesses && (
              <div className="flex gap-0.5">
                {[...Array(Math.max(myLives, 0))].map((_, i) => <span key={i} className="text-2xl md:text-3xl">🍋</span>)}
              </div>
            )}
            <button onClick={() => setHasSurrendered(true)} className="text-xs font-black opacity-30 uppercase hover:opacity-100 transition-opacity">
              {t.surrender}
            </button>
          </div>
        </div>

        {/* CAMPERS BAR */}
        {!isSolo && !isAiGuesses && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 border-b border-green-100 mb-3 items-center">
            <button onClick={copyCode} className="font-black text-xl text-[#1A5319] tracking-widest hover:opacity-60 active:scale-95 transition-all shrink-0">
              {copied ? t.copied : code}
            </button>
            <span className="text-[10px] font-black opacity-20">·</span>
            {players.map((p, i) => {
              const pLives = playerLives[p] ?? 3
              const pEliminated = eliminatedPlayers.includes(p)
              const isCurrentTurn = turnPlayer === p
              return (
                <div key={i} className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap flex items-center gap-1.5 transition-all ${pEliminated ? 'bg-red-100 text-red-800 border-red-200 line-through opacity-50' : isCurrentTurn ? 'bg-[#1A5319] text-white border-[#1A5319] shadow-md' : 'bg-white/50 text-[#1A5319] border-green-200/50'}`}>
                  {pEliminated ? '💀' : isCurrentTurn ? '▶' : '●'} {p}
                  {!pEliminated && !noLives && <span className="text-base">{'🍋'.repeat(Math.max(pLives, 0))}</span>}
                </div>
              )
            })}
          </div>
        )}

        {/* CHAT AREA */}
        <div className="flex-1 bg-white/50 rounded-3xl p-4 overflow-y-auto mb-4 border border-green-100 shadow-inner flex flex-col gap-2 relative no-scrollbar">
          {moves.map((move, index) => {
            const isMe = move.player_name === playerName
            const isPending = move.status === 'pending'
            const isAllowed = move.is_allowed
            const isHostMsg = move.player_name === t.hostName

            return (
              <motion.div key={move.id || index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : isHostMsg ? 'self-center items-center' : 'self-start items-start'}`}>
                {!isHostMsg && <span className="text-[10px] font-black opacity-30 px-2 mb-0.5">{move.player_name}</span>}
                <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border-2 ${isHostMsg ? 'bg-[#1A5319] text-white border-[#1A5319] font-black uppercase text-sm px-6 py-3 text-center' : isPending ? 'bg-gray-100 text-gray-500 border-gray-200' : isAllowed ? 'bg-[#E6F4EA] text-[#1A5319] border-[#A8D5BA]' : 'bg-[#FCE8E8] text-[#C62828] border-[#F4B4B4] line-through opacity-60'}`}>
                  <span className="font-bold wrap-break-word">{move.item}</span>
                  {!isHostMsg && (
                    <span className="text-xl">
                      {isPending ? '⏳' : isAllowed ? '✅' : '❌'}
                    </span>
                  )}
                </div>
                {isHost && isManual && isPending && !isMe && (
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => judge(move.id, true)} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-full text-xs font-bold transition-colors">✅ Да</button>
                    <button onClick={() => judge(move.id, false)} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-full text-xs font-bold transition-colors">❌ Нет</button>
                  </div>
                )}
              </motion.div>
            )
          })}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="flex flex-col gap-2 shrink-0">
          {(isGameOver || isVictory || hasSurrendered) ? (
            <div className="text-center font-black text-xl text-[#1A5319] p-4 bg-white/80 rounded-2xl border-2 border-green-200">
              {isVictory ? t.victory : hasSurrendered ? t.surrenderTitle : t.defeat}
              <div className="text-sm opacity-50 mt-1">{t.concept} {revealReason}</div>
              <button onClick={() => router.push('/')} className="mt-4 px-6 py-3 bg-[#1A5319] text-white rounded-full text-sm font-black uppercase hover:opacity-90 active:scale-95 transition-all w-full">
                {t.menu}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={getPlaceholder()}
                disabled={!canType}
                className="flex-1 px-5 py-4 rounded-full border-2 border-[#1A5319]/20 bg-white font-black text-[#1A5319] placeholder:opacity-30 focus:outline-none focus:border-[#1A5319]/50 transition-all uppercase disabled:opacity-50 disabled:bg-gray-50"
              />
              <button
                onClick={handleSend}
                disabled={!canType || !inputValue.trim() || isChecking}
                className="w-14 h-14 shrink-0 rounded-full bg-[#1A5319] text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isChecking ? '⏳' : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/></svg>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}