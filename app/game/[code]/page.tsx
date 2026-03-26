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
  const [eliminatedPlayers, setEliminatedPlayers] = useState<string[]>([])
  const [winner, setWinner] = useState<string>('')
  const [turnPlayer, setTurnPlayer] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [showRuleReminder, setShowRuleReminder] = useState(false)
  const [newPlayerNotif, setNewPlayerNotif] = useState<string | null>(null)
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(120)
  const [timerActive, setTimerActive] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // #2 — поле нового правила при "играть снова"
  const [showNewRuleInput, setShowNewRuleInput] = useState(false)
  const [newRuleValue, setNewRuleValue] = useState('')

  // AI угадывает
  const [aiQuestion, setAiQuestion] = useState<string>('')
  const [aiQuestionType, setAiQuestionType] = useState<'question' | 'guess'>('question')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [aiAttemptsLeft, setAiAttemptsLeft] = useState(3)
  const [isGuessPhase, setIsGuessPhase] = useState(false)

  // #7 — подсказка игрока в акинаторе
  const [hintInputValue, setHintInputValue] = useState('')
  const [showHintInput, setShowHintInput] = useState(false)

  // #6 — отслеживаем круг хоста
  const [hostHasMovedThisRound, setHostHasMovedThisRound] = useState(false)
  const roundCountRef = useRef(0)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const prevPlayersRef = useRef<string[]>([])

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
      victory: "ТЫ УГАДАЛ!", defeat: "ТЫ ПРОИГРАЛ",
      surrenderTitle: "СДАЛСЯ", eliminated: "ТЫ ВЫБЫЛ!",
      playerGuessed: "УГАДАЛ!", duplicate: "Это слово уже было!",
      notYourTurn: (n: string) => `Ходит ${n}...`,
      hostHint: "ПОДСКАЗКА ХОСТА", copied: "СКОПИРОВАНО!",
      ruleReminder: "ТВОЁ ПРАВИЛО:",
      aiGuessVictory: "ИИ УГАДАЛ!", aiGuessDefeat: "ТЫ ПОБЕДИЛ!",
      aiDefeatSub: "ИИ НЕ СМОГ УГАДАТЬ ТВОЁ СЛОВО:",
      startAiGame: "НАЧАТЬ — ИИ ЗАДАЁТ ВОПРОСЫ",
      aiThinking: "ИИ ДУМАЕТ...", yesAnswer: "ДА", noAnswer: "НЕТ", maybeAnswer: "ВОЗМОЖНО",
      aiGuessLabel: "🎯 ИИ ДУМАЕТ ЧТО ЭТО:", aiQuestionLabel: "❓ ВОПРОС ОТ ИИ:",
      guessPhaseLabel: "ИИ УГАДЫВАЕТ — ОСТАЛОСЬ ПОПЫТОК:",
      myTurn: "ТВОЙ ХОД", theirTurn: (n: string) => `ХОД: ${n}`,
      playerJoined: (n: string) => `👋 ${n} присоединился!`,
      playersCount: (n: number) => `${n} игрок${n === 1 ? '' : n < 5 ? 'а' : 'ов'} в игре`,
      playAgain: "ИГРАТЬ ЕЩЁ РАЗ", backToLobby: "В ЛОББИ",
      timerWarning: "ВРЕМЯ ВЫХОДИТ!",
      lemonadeSpill: (n: string) => `🥤 ${n} ПРОЛИЛ ЛИМОНАД! ХОД ПРОПУСКАЕТСЯ.`,
      hostTurn: "ТВОЙ ХОД — ДАТЬ ПОДСКАЗКУ",
      newRule: "НОВОЕ ПРАВИЛО ДЛЯ СЛЕДУЮЩЕЙ ИГРЫ:",
      newRulePlaceholder: "Введи новое правило...",
      startNewGame: "НАЧАТЬ С НОВЫМ ПРАВИЛОМ",
      giveHint: "ДАТЬ ПОДСКАЗКУ 💡",
      hintPlaceholder: "Напиши подсказку (предмет для пикника)...",
      sendHint: "ОТПРАВИТЬ",
      cancelHint: "ОТМЕНА",
    },
    EN: {
      title: "PICNIC BUDDY", placeholder: "I'M TAKING...", surrender: "SURRENDER",
      spilled: "YOU SPILLED LEMONADE!", concept: "THE CONCEPT WAS:",
      menu: "MAIN MENU", hostName: "HOST AI", campers: "CAMPERS:",
      spilledMsg: (n: string) => `🥤 ${n} SPILLED LEMONADE!`,
      eliminatedMsg: (n: string) => `💀 ${n} IS OUT!`,
      winnerMsg: (n: string) => `🏆 ${n} GUESSED IT!`,
      victory: "YOU GUESSED IT!", defeat: "YOU LOST",
      surrenderTitle: "SURRENDERED", eliminated: "YOU'RE OUT!",
      playerGuessed: "GUESSED!", duplicate: "Already used!",
      notYourTurn: (n: string) => `${n}'s turn...`,
      hostHint: "HOST HINT", copied: "COPIED!",
      ruleReminder: "YOUR RULE:",
      aiGuessVictory: "AI GUESSED IT!", aiGuessDefeat: "YOU WIN!",
      aiDefeatSub: "AI FAILED TO GUESS YOUR WORD:",
      startAiGame: "START — AI ASKS QUESTIONS",
      aiThinking: "AI THINKING...", yesAnswer: "YES", noAnswer: "NO", maybeAnswer: "MAYBE",
      aiGuessLabel: "🎯 AI GUESS:", aiQuestionLabel: "❓ AI QUESTION:",
      guessPhaseLabel: "AI GUESSING — ATTEMPTS LEFT:",
      myTurn: "YOUR TURN", theirTurn: (n: string) => `TURN: ${n}`,
      playerJoined: (n: string) => `👋 ${n} joined!`,
      playersCount: (n: number) => `${n} player${n === 1 ? '' : 's'} in game`,
      playAgain: "PLAY AGAIN", backToLobby: "BACK TO LOBBY",
      timerWarning: "TIME IS RUNNING OUT!",
      lemonadeSpill: (n: string) => `🥤 ${n} SPILLED LEMONADE! TURN SKIPPED.`,
      hostTurn: "YOUR TURN — GIVE A HINT",
      newRule: "NEW RULE FOR NEXT GAME:",
      newRulePlaceholder: "Enter new rule...",
      startNewGame: "START WITH NEW RULE",
      giveHint: "GIVE HINT 💡",
      hintPlaceholder: "Write a hint (picnic item)...",
      sendHint: "SEND",
      cancelHint: "CANCEL",
    },
    UA: {
      title: "ПІКНІК БАДДІ", placeholder: "Я БЕРУ З СОБОЮ...", surrender: "ЗДАТИСЯ",
      spilled: "ТИ ПРОЛИВ ЛІМОНАД!", concept: "КОНЦЕПТ ПОХОДУ БУВ:",
      menu: "В ГОЛОВНЕ МЕНЮ", hostName: "ВЕДУЧИЙ ШІ", campers: "У ПОХОДІ:",
      spilledMsg: (n: string) => `🥤 ${n} ПРОЛИВ ЛІМОНАД!`,
      eliminatedMsg: (n: string) => `💀 ${n} ВИБУВ!`,
      winnerMsg: (n: string) => `🏆 ${n} ВГАДАВ КОНЦЕПТ!`,
      victory: "ТИ ВГАДАВ!", defeat: "ТИ ПРОГРАВ",
      surrenderTitle: "ЗДАВСЯ", eliminated: "ТИ ВИБУВ!",
      playerGuessed: "ВГАДАВ!", duplicate: "Це слово вже було!",
      notYourTurn: (n: string) => `Хід гравця ${n}...`,
      hostHint: "ПІДКАЗКА ХОСТА", copied: "СКОПІЙОВАНО!",
      ruleReminder: "ТВОЄ ПРАВИЛО:",
      aiGuessVictory: "ШІ ВГАДАВ!", aiGuessDefeat: "ТИ ПЕРЕМІГ!",
      aiDefeatSub: "ШІ НЕ ЗМІГ ВГАДАТИ ТВОЄ СЛОВО:",
      startAiGame: "СТАРТ — ШІ СТАВИТЬ ПИТАННЯ",
      aiThinking: "ШІ ДУМАЄ...", yesAnswer: "ТАК", noAnswer: "НІ", maybeAnswer: "МОЖЛИВО",
      aiGuessLabel: "🎯 ШІ ДУМАЄ ЩО ЦЕ:", aiQuestionLabel: "❓ ПИТАННЯ ВІД ШІ:",
      guessPhaseLabel: "ШІ ВГАДУЄ — ЗАЛИШИЛОСЬ СПРОБ:",
      myTurn: "ТВІЙ ХІД", theirTurn: (n: string) => `ХІД: ${n}`,
      playerJoined: (n: string) => `👋 ${n} приєднався!`,
      playersCount: (n: number) => `${n} гравець${n === 1 ? '' : 'ів'} в грі`,
      playAgain: "ГРАТИ ЩЕ РАЗ", backToLobby: "В ЛОБІ",
      timerWarning: "ЧАС СПЛИВАЄ!",
      lemonadeSpill: (n: string) => `🥤 ${n} ПРОЛИВ ЛІМОНАД! ХІД ПРОПУСКАЄТЬСЯ.`,
      hostTurn: "ТВІЙ ХІД — ДАТИ ПІДКАЗКУ",
      newRule: "НОВЕ ПРАВИЛО ДЛЯ НАСТУПНОЇ ГРИ:",
      newRulePlaceholder: "Введи нове правило...",
      startNewGame: "ПОЧАТИ З НОВИМ ПРАВИЛОМ",
      giveHint: "ДАТИ ПІДКАЗКУ 💡",
      hintPlaceholder: "Напиши підказку (предмет для пікніку)...",
      sendHint: "НАДІСЛАТИ",
      cancelHint: "СКАСУВАТИ",
    },
    LV: {
      title: "PIKNIKA BIEDRS", placeholder: "ES ŅEMU LĪDZI...", surrender: "PADOTIES",
      spilled: "TU IZLĒJI LIMONĀDI!", concept: "PĀRGĀJIENA KONCEPTS BIJA:",
      menu: "UZ GALVENO IZVĒLNI", hostName: "VADĪTĀJS AI", campers: "DALĪBNIEKI:",
      spilledMsg: (n: string) => `🥤 ${n} IZLĒJA LIMONĀDI!`,
      eliminatedMsg: (n: string) => `💀 ${n} IR ĀRĀ!`,
      winnerMsg: (n: string) => `🏆 ${n} UZMINĒJA!`,
      victory: "TU UZMINĒJI!", defeat: "TU ZAUDĒJI",
      surrenderTitle: "PADEVĀS", eliminated: "TU ESI ĀRĀ!",
      playerGuessed: "UZMINĒJA!", duplicate: "Jau bija!",
      notYourTurn: (n: string) => `${n} gājiens...`,
      hostHint: "VADĪTĀJA PADOMS", copied: "NOKOPĒTS!",
      ruleReminder: "TAVS NOTEIKUMS:",
      aiGuessVictory: "AI UZMINĒJA!", aiGuessDefeat: "TU UZVARĒJI!",
      aiDefeatSub: "AI NEUZMINĒJA TAVU VĀRDU:",
      startAiGame: "SĀKT — AI UZDOD JAUTĀJUMUS",
      aiThinking: "AI DOMĀ...", yesAnswer: "JĀ", noAnswer: "NĒ", maybeAnswer: "VARBŪT",
      aiGuessLabel: "🎯 AI DOMĀ KA TAS IR:", aiQuestionLabel: "❓ AI JAUTĀJUMS:",
      guessPhaseLabel: "AI MIN — ATLIKUŠI MĒĢINĀJUMI:",
      myTurn: "TAVS GĀJIENS", theirTurn: (n: string) => `GĀJIENS: ${n}`,
      playerJoined: (n: string) => `👋 ${n} pievienojās!`,
      playersCount: (n: number) => `${n} spēlētāj${n === 1 ? 's' : 'i'} spēlē`,
      playAgain: "SPĒLĒT VĒLREIZ", backToLobby: "UZ LOBBY",
      timerWarning: "LAIKS BEIDZAS!",
      lemonadeSpill: (n: string) => `🥤 ${n} IZLĒJA LIMONĀDI! GĀJIENS IZLAISTS.`,
      hostTurn: "TAVS GĀJIENS — DOT PADOMU",
      newRule: "JAUNS NOTEIKUMS NĀKAMAJAI SPĒLEI:",
      newRulePlaceholder: "Ievadi jaunu noteikumu...",
      startNewGame: "SĀKT AR JAUNU NOTEIKUMU",
      giveHint: "DOT MĀJIENU 💡",
      hintPlaceholder: "Raksti mājienu (piknika priekšmets)...",
      sendHint: "SŪTĪT",
      cancelHint: "ATCELT",
    },
  }[lang]

  // ТАЙМЕР
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!isMyTurn || isGameOver || isVictory || isSolo || isAiGuesses || isSpilled) {
      setTimerActive(false)
      setTurnTimeLeft(120)
      return
    }
    setTurnTimeLeft(120)
    setTimerActive(true)
    timerRef.current = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          setTimerActive(false)
          handleTimeOut()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [turnPlayer, isMyTurn, isGameOver, isVictory])

  const handleTimeOut = async () => {
    const { data: freshRoom } = await supabase.from('rooms').select('lives, turn_player').eq('code', code).single()
    const allPlayers = Object.keys(freshRoom?.lives || {}).sort()
    const activePlayers = allPlayers.filter(p => !eliminatedPlayers.includes(p))
    if (activePlayers.length === 0) return
    const currentTurn = freshRoom?.turn_player || playerName
    const currentIdx = activePlayers.indexOf(currentTurn)
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % activePlayers.length
    await supabase.from('rooms').update({ turn_player: activePlayers[nextIdx] }).eq('code', code)
  }

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
        setSpilledPlayers(room.spilled_players || {})

        const livesData: Record<string, number> = room.lives || {}
        const isHostPlayer = localStorage.getItem('picnic_is_host') === 'true'
        const isManualMode = mode === 'manual'

        // #4 fix: noLives применяется для ВСЕХ, хост manual никогда не получает жизни
        if (!(name in livesData) && !noLives && !(isHostPlayer && isManualMode)) {
          livesData[name] = 3
          await supabase.from('rooms').update({ lives: livesData }).eq('code', code)
        }
        setPlayerLives(livesData)

        if (!isSolo && !isAiGuesses) {
          const livesPlayers = Object.keys(room.lives || {})
          const newPlayers = Array.from(new Set([...livesPlayers, name])).sort()
          const prev = prevPlayersRef.current
          const joined = newPlayers.filter(p => !prev.includes(p) && p !== name)
          if (joined.length > 0 && prev.length > 0) {
            setNewPlayerNotif(t.playerJoined(joined[0]))
            setTimeout(() => setNewPlayerNotif(null), 3000)
          }
          prevPlayersRef.current = newPlayers
          setPlayers(newPlayers)
          if ((!room.turn_player || room.turn_player === '') && newPlayers.length > 0) {
            await supabase.from('rooms').update({ turn_player: newPlayers[0] }).eq('code', code)
            setTurnPlayer(newPlayers[0])
          }
        }
      }

      const { data: mv } = await supabase.from('moves').select('*').eq('room_code', code).order('created_at', { ascending: true })
      if (mv) {
        setMoves(mv)
        if (isAiGuesses) {
          const hostNames = ['ВЕДУЩИЙ ИИ', 'HOST AI', 'ВЕДУЧИЙ ШІ', 'VADĪTĀJS AI']
          const guessCount = mv.filter((m: any) => hostNames.includes(m.player_name) && m.item.includes('🎯')).length
          const questionCount = mv.filter((m: any) => hostNames.includes(m.player_name) && m.item.includes('❓')).length
          setAiAttemptsLeft(Math.max(3 - guessCount, 0))
          setIsGuessPhase(questionCount >= 12)
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
        if (p.new.turn_player !== undefined) setTurnPlayer(p.new.turn_player || '')
        if (p.new.spilled_players) setSpilledPlayers(p.new.spilled_players)
        if (p.new.lives) {
          setPlayerLives(p.new.lives)
          // #4 fix: при noLives не добавляем жизни никому
          if (!noLives) {
            const newPlayers = Array.from(new Set(Object.keys(p.new.lives))).sort()
            const prev = prevPlayersRef.current
            const joined = newPlayers.filter((p2: string) => !prev.includes(p2))
            if (joined.length > 0 && prev.length > 0) {
              setNewPlayerNotif(t.playerJoined(joined[0]))
              setTimeout(() => setNewPlayerNotif(null), 3000)
            }
            prevPlayersRef.current = newPlayers
            setPlayers(newPlayers)
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code])

  // #2 — Играть снова: хост вводит новое правило
  const handlePlayAgain = async (newRule?: string) => {
    const ruleToUse = newRule || revealReason

    const { data: room } = await supabase.from('rooms').select('lives').eq('code', code).single()
    const resetLives: Record<string, number> = {}

    // #4 fix: при noLives не даём жизни никому
    if (!noLives) {
      Object.keys(room?.lives || {}).forEach(p => {
        // хост manual не получает жизни
        if (!(isManual && isHost && p === playerName)) {
          resetLives[p] = 3
        }
      })
    }

    await supabase.from('rooms').update({
      status: 'waiting',
      winner: null,
      secret_rule: ruleToUse,
      turn_player: players[0] || '',
      lives: resetLives,
      spilled_players: {}
    }).eq('code', code)

    await supabase.from('moves').delete().eq('room_code', code)

    setIsGameOver(false)
    setIsVictory(false)
    setHasSurrendered(false)
    setWinner('')
    setMoves([])
    setEliminatedPlayers([])
    setSpilledPlayers({})
    setPlayerLives(resetLives)
    setAiQuestion('')
    setIsGuessPhase(false)
    setAiAttemptsLeft(3)
    setTurnTimeLeft(120)
    setShowNewRuleInput(false)
    setNewRuleValue('')
    setHostHasMovedThisRound(false)
    roundCountRef.current = 0
    setRevealReason(ruleToUse)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLoseLive = async (targetPlayer: string) => {
    if (noLives) return
    if (isManual && isHost && targetPlayer === playerName) return

    const { data: room } = await supabase.from('rooms').select('lives, spilled_players').eq('code', code).single()
    const currentLives: Record<string, number> = room?.lives || {}
    const currentSpilled: Record<string, boolean> = room?.spilled_players || {}

    const newCount = Math.max((currentLives[targetPlayer] ?? 3) - 1, 0)
    const updated = { ...currentLives, [targetPlayer]: newCount }
    await supabase.from('rooms').update({ lives: updated }).eq('code', code)
    setPlayerLives(updated)

    if (newCount <= 0) {
      if (isSolo) {
        setIsGameOver(true)
        await supabase.from('rooms').update({ status: 'finished' }).eq('code', code)
      } else {
        await supabase.from('moves').insert([{
          room_code: code,
          player_name: t.hostName,
          item: t.lemonadeSpill(targetPlayer),
          status: 'approved',
          is_allowed: true
        }])
        const newSpilled = { ...currentSpilled, [targetPlayer]: true }
        await supabase.from('rooms').update({
          spilled_players: newSpilled,
          lives: { ...updated, [targetPlayer]: 3 }
        }).eq('code', code)
        setSpilledPlayers(newSpilled)
      }
    }
  }

  const clearSpilled = async (targetPlayer: string) => {
    const { data: room } = await supabase.from('rooms').select('spilled_players').eq('code', code).single()
    const current: Record<string, boolean> = room?.spilled_players || {}
    const updated = { ...current, [targetPlayer]: false }
    await supabase.from('rooms').update({ spilled_players: updated }).eq('code', code)
    setSpilledPlayers(updated)
  }

  // Вспомогательная функция для следующего хода (не меняет ход при judge)
  const advanceTurn = async (currentTurnOverride?: string) => {
    const { data: freshRoom } = await supabase.from('rooms').select('lives, turn_player, spilled_players').eq('code', code).single()
    const allPlayers = Object.keys(freshRoom?.lives || {}).sort()
    const activePlayers = allPlayers.filter(p => !eliminatedPlayers.includes(p))
    if (activePlayers.length === 0) return

    const currentTurn = currentTurnOverride || freshRoom?.turn_player || playerName
    const currentIdx = activePlayers.indexOf(currentTurn)
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % activePlayers.length

    let finalNextIdx = nextIdx
    const nextCandidate = activePlayers[nextIdx]
    if (nextCandidate && freshRoom?.spilled_players?.[nextCandidate]) {
      await clearSpilled(nextCandidate)
      finalNextIdx = (nextIdx + 1) % activePlayers.length
    }

    // #6 — проверяем завершился ли круг (вернулись к первому игроку)
    if (finalNextIdx <= currentIdx && activePlayers.length > 1) {
      roundCountRef.current += 1
      setHostHasMovedThisRound(false) // хост снова должен сделать ход в новом круге
    }

    await supabase.from('rooms').update({ turn_player: activePlayers[finalNextIdx] }).eq('code', code)
    return activePlayers[finalNextIdx]
  }

  const askAiQuestion = async () => {
    setIsAiThinking(true)
    try {
      const res = await fetch('/api/ai-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, lang })
      })
      const data = await res.json()
      setAiQuestion(data.text)
      setAiQuestionType(data.type)
      setIsGuessPhase(data.isGuessPhase || false)
      if (data.attemptsLeft !== undefined) setAiAttemptsLeft(data.attemptsLeft)
      await supabase.from('moves').insert([{
        room_code: code, player_name: t.hostName,
        item: data.type === 'guess' ? `🎯 ${data.text}` : `❓ ${data.text}`,
        status: 'approved', is_allowed: true
      }])
    } finally {
      setIsAiThinking(false)
    }
  }

  // #5 — ответ "возможно"
  const answerAiQuestion = async (answer: boolean | 'maybe') => {
    const { data: lastMove } = await supabase
      .from('moves').select('*').eq('room_code', code)
      .eq('player_name', t.hostName)
      .order('created_at', { ascending: false }).limit(1).single()

    if (lastMove) {
      await supabase.from('moves').update({ is_allowed: answer === true }).eq('id', lastMove.id)

      let answerItem = ''
      if (answer === true) answerItem = `✅ ${t.yesAnswer}`
      else if (answer === false) answerItem = `❌ ${t.noAnswer}`
      else answerItem = `🟡 ${t.maybeAnswer}`

      await supabase.from('moves').insert([{
        room_code: code, player_name: playerName,
        item: answerItem,
        status: 'approved', is_allowed: answer === true
      }])
    }

    if (aiQuestionType === 'guess' && answer === true) {
      await supabase.from('rooms').update({ status: 'victory', winner: t.hostName }).eq('code', code)
      setIsVictory(true); setWinner(t.hostName)
        } else if (aiQuestionType === 'guess' && answer !== true) {
      const newAttempts = aiAttemptsLeft - 1
      setAiAttemptsLeft(newAttempts)
      setAiQuestion('')
      if (newAttempts <= 0) {
        await supabase.from('rooms').update({ status: 'victory', winner: playerName }).eq('code', code)
        setIsVictory(true); setWinner(playerName)
      } else {
        await askAiQuestion()
      }
    } else {
      setAiQuestion('')
      await askAiQuestion()
    }
  }

  // #7 — отправить подсказку в акинатор
  const sendHint = async () => {
    if (!hintInputValue.trim()) return
    const hintText = hintInputValue.trim().toUpperCase()
    await supabase.from('moves').insert([{
      room_code: code, player_name: playerName,
      item: `💡 ${hintText}`,
      status: 'approved', is_allowed: true
    }])
    // Передаём подсказку в следующий вопрос ИИ
    setIsAiThinking(true)
    try {
      const res = await fetch('/api/ai-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, lang, playerHint: hintText })
      })
      const data = await res.json()
      setAiQuestion(data.text)
      setAiQuestionType(data.type)
      setIsGuessPhase(data.isGuessPhase || false)
      if (data.attemptsLeft !== undefined) setAiAttemptsLeft(data.attemptsLeft)
      await supabase.from('moves').insert([{
        room_code: code, player_name: t.hostName,
        item: data.type === 'guess' ? `🎯 ${data.text}` : `❓ ${data.text}`,
        status: 'approved', is_allowed: true
      }])
    } finally {
      setIsAiThinking(false)
    }
    setHintInputValue('')
    setShowHintInput(false)
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isGameOver || isVictory || isChecking || isEliminated || code === 'undefined') return
    if (isAssist && isHost) return
    if (!isMyTurn && !isHost) return

    if (isSpilled) {
      await clearSpilled(playerName)
      await advanceTurn()
      return
    }

    const text = inputValue.trim().toUpperCase()
    const isDuplicate = moves.some(m => m.item === text && m.player_name !== t.hostName)
    if (isDuplicate) { alert(t.duplicate); return }

    setInputValue('')
    setIsChecking(true)
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerActive(false)

    try {
      const { data: move } = await supabase.from('moves').insert([{
        room_code: code, player_name: playerName, item: text,
        status: isSolo ? 'approved' : 'pending', is_allowed: true
      }]).select().single()

      if (!move) return

      // СОЛО
      if (isSolo) {
        const res = await fetch('/api/check', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: text, roomCode: code, lang, needHint: true })
        })
        const result = await res.json()
        if (result.guessed) {
          await supabase.from('moves').update({ is_allowed: true }).eq('id', move.id)
          await supabase.from('rooms').update({ status: 'victory', winner: playerName }).eq('code', code)
          setIsVictory(true); setWinner(playerName)
          return
        }
        await supabase.from('moves').update({ is_allowed: result.allowed }).eq('id', move.id)
        if (result.hint) {
          await supabase.from('moves').insert([{
            room_code: code, player_name: t.hostName,
            item: result.hint, status: 'approved', is_allowed: true
          }])
        }
        if (!result.allowed) await handleLoseLive(playerName)
      }

      // #3 fix: AI HOST — проверяем ход КАЖДОГО игрока независимо
      if (isAiHost) {
        const res = await fetch('/api/check', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: text, roomCode: code, lang, needHint: false })
        })
        const result = await res.json()

        if (result.guessed) {
          await supabase.from('moves').update({ is_allowed: true, status: 'approved' }).eq('id', move.id)
          await supabase.from('rooms').update({ status: 'victory', winner: playerName }).eq('code', code)
          setIsVictory(true); setWinner(playerName)
          return
        }

        await supabase.from('moves').update({ is_allowed: result.allowed, status: 'approved' }).eq('id', move.id)
        if (!result.allowed) await handleLoseLive(playerName)

        // #3 fix: advanceTurn всегда переключает ход, независимо от того кто ходил
        const nextPlayer = await advanceTurn()

        // Раз в круг — подсказка от ИИ (просто слово)
        if (!hostHasMovedThisRound) {
          const hintRes = await fetch('/api/check', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: text, roomCode: code, lang, needHint: true })
          })
          const hintResult = await hintRes.json()
          if (hintResult.hint) {
            await supabase.from('moves').insert([{
              room_code: code, player_name: t.hostName,
              item: hintResult.hint,
              status: 'approved', is_allowed: true
            }])
          }
          setHostHasMovedThisRound(true)
        }
      }

      // MANUAL / ASSIST
      if (!isSolo && !isAiGuesses && !isAiHost) {
        if (isAssist) {
          const res = await fetch('/api/check', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: text, roomCode: code, lang, needHint: false })
          })
          const result = await res.json()
          if (result.guessed) {
            await supabase.from('rooms').update({ status: 'victory', winner: playerName }).eq('code', code)
            setIsVictory(true); setWinner(playerName)
            return
          }
          await supabase.from('moves').update({ status: 'approved', is_allowed: result.allowed }).eq('id', move.id)
          if (!result.allowed) await handleLoseLive(playerName)
        }

        // #6 fix: хост в manual — если это его ход, отмечаем что он походил
        if (isHost && isManual) {
          setHostHasMovedThisRound(true)
        }

        // #1 fix: всегда переключаем ход после хода игрока
        await advanceTurn()
      }

    } finally {
      setIsChecking(false)
    }
  }

  // #1 fix: judge НЕ переключает ход — только оценивает слово
  const judge = async (id: string, allowed: boolean) => {
    await supabase.from('moves').update({ status: 'approved', is_allowed: allowed }).eq('id', id)
    if (!allowed) {
      const { data: move } = await supabase.from('moves').select('player_name').eq('id', id).single()
      if (move) await handleLoseLive(move.player_name)
    }
    // НЕ вызываем advanceTurn() — ход меняется только когда игрок сам ходит
  }

  const declareWinner = async (winnerName: string) => {
    await supabase.from('moves').insert([{
      room_code: code, player_name: t.hostName,
      item: t.winnerMsg(winnerName), status: 'approved', is_allowed: true
    }])
    await supabase.from('rooms').update({ status: 'victory', winner: winnerName }).eq('code', code)
    setIsVictory(true); setWinner(winnerName)
  }

  // #6 fix: хост может печатать когда его ход И он ещё не ходил в этом круге
  const hostCanType = isHost && isManual && isMyTurn && !hostHasMovedThisRound
  const canType = !isSpilled && !isChecking && !isGameOver && !isVictory && !isEliminated
    && !(isAssist && isHost)
    && (isMyTurn || hostCanType)

  const getPlaceholder = () => {
    if (isAssist && isHost) return t.hostTurn
    if (isHost && isManual && hostHasMovedThisRound) return t.notYourTurn(turnPlayer)
    if (isSpilled) return t.spilled
    if (isChecking) return '...'
    if (!isMyTurn && turnPlayer) return t.notYourTurn(turnPlayer)
    return t.placeholder
  }

  const showVictory = isVictory
  const showDefeat = isGameOver && !isVictory && isSolo
  const showSurrender = hasSurrendered && !isVictory && !isGameOver
  const timerColor = turnTimeLeft > 60 ? 'text-green-600' : turnTimeLeft > 30 ? 'text-yellow-500' : 'text-red-500'

  return (
    <div className="min-h-screen bg-[#F0FFF4] font-sans">
      <div className="w-full max-w-2xl mx-auto flex flex-col h-screen px-4 md:px-8 py-4 md:py-6">

        {/* HEADER */}
        <div className="flex justify-between items-center relative mb-3">
          <button onClick={() => router.push('/')} className="text-2xl opacity-20 hover:opacity-60 transition-opacity">←</button>
          <div className="absolute left-1/2 -translate-x-1/2">
            <button onClick={() => router.push('/')}
              className="font-black text-sm md:text-base text-[#1A5319] opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest">
              {t.title}
            </button>
          </div>
          <div className="flex gap-2 md:gap-3 items-center">
            {!isManual && !noLives && !isAiGuesses && (
              <div className="flex gap-0.5">
                {[...Array(Math.max(myLives, 0))].map((_, i) => (
                  <span key={i} className="text-2xl md:text-3xl">🍋</span>
                ))}
              </div>
            )}
            {isManual && !isHost && !noLives && (
              <div className="flex gap-0.5">
                {[...Array(Math.max(myLives, 0))].map((_, i) => (
                  <span key={i} className="text-2xl md:text-3xl">🍋</span>
                ))}
              </div>
            )}
            {isAiGuesses && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black opacity-30 uppercase">AI</span>
                {[...Array(3)].map((_, i) => (
                  <span key={i} className={`text-xl transition-all ${i < aiAttemptsLeft ? 'opacity-100' : 'opacity-20 grayscale'}`}>🔋</span>
                ))}
              </div>
            )}
            {noLives && !isManual && !isAiGuesses && <span className="text-xl font-black opacity-30">∞</span>}
            {isHost && isManual && (
              <button onClick={() => setShowRuleReminder(!showRuleReminder)}
                className={`text-xl transition-opacity ${showRuleReminder ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}>
                📋
              </button>
            )}
            <button onClick={() => setHasSurrendered(true)}
              className="text-xs font-black opacity-30 uppercase hover:opacity-100 transition-opacity">
              {t.surrender}
            </button>
          </div>
        </div>

        {/* ТАЙМЕР */}
        {timerActive && isMyTurn && !isSolo && !isAiGuesses && !isGameOver && !isVictory && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center text-xs font-black uppercase tracking-widest mb-2 py-1 ${timerColor} ${turnTimeLeft <= 30 ? 'animate-pulse' : ''}`}>
            ⏱ {Math.floor(turnTimeLeft / 60)}:{String(turnTimeLeft % 60).padStart(2, '0')}
            {turnTimeLeft <= 30 && <span className="ml-2">{t.timerWarning}</span>}
          </motion.div>
        )}

        {/* RULE REMINDER */}
        <AnimatePresence>
          {showRuleReminder && isHost && isManual && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-3 px-5 py-3 rounded-[18px] bg-[#1A5319]/10 border-2 border-[#1A5319]/20">
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">{t.ruleReminder}</p>
              <p className="font-black text-[#1A5319] text-base">"{revealReason}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* УВЕДОМЛЕНИЕ О НОВОМ ИГРОКЕ */}
        <AnimatePresence>
          {newPlayerNotif && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-2 px-4 py-2 rounded-full bg-green-100 border border-green-200 text-center text-xs font-black text-[#1A5319]">
              {newPlayerNotif}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CAMPERS BAR */}
        {!isSolo && !isAiGuesses && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 border-b border-green-100 mb-3 items-center">
            <button onClick={copyCode}
              className="font-black text-xl text-[#1A5319] tracking-widest hover:opacity-60 active:scale-95 transition-all shrink-0">
              {copied ? t.copied : code}
            </button>
            <span className="text-[10px] font-black opacity-20">·</span>
            <span className="text-[10px] font-black opacity-30 shrink-0">{t.playersCount(players.length)}</span>
            <span className="text-[10px] font-black opacity-20">·</span>
            {players.map((p, i) => {
              const pLives = playerLives[p] ?? 3
              const pEliminated = eliminatedPlayers.includes(p)
              const isCurrentTurn = turnPlayer === p
              const pIsHostPlayer = isManual && isHost && p === playerName
              return (
                <div key={i} className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap flex items-center gap-1.5 transition-all
                  ${pEliminated
                    ? 'bg-red-100 text-red-800 border-red-200 line-through opacity-50'
                    : isCurrentTurn
                    ? 'bg-[#1A5319] text-white border-[#1A5319] shadow-md'
                    : 'bg-white/50 text-[#1A5319] border-green-200/50'}`}>
                  {pEliminated ? '💀' : isCurrentTurn ? '▶' : '●'} {p}
                  {!pEliminated && !noLives && !pIsHostPlayer && (
                    <span className="text-base">{'🍋'.repeat(Math.max(pLives, 0))}</span>
                  )}
                  {!pEliminated && noLives && <span className="opacity-40 text-xs">∞</span>}
                </div>
              )
            })}
          </div>
        )}

        {/* AI HOST индикатор хода */}
        {isAiHost && players.length > 1 && !isGameOver && !isVictory && (
          <motion.div key={turnPlayer} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className={`text-center text-xs font-black uppercase tracking-widest mb-2 py-1.5 rounded-full
              ${turnPlayer === playerName ? 'text-[#1A5319] bg-green-100' : 'text-gray-400 bg-gray-50'}`}>
            {turnPlayer === playerName ? `▶ ${t.myTurn}` : `⏳ ${t.theirTurn(turnPlayer)}`}
          </motion.div>
        )}

        {/* AI GUESSES фаза */}
        {isAiGuesses && isGuessPhase && !isVictory && !isGameOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center text-xs font-black uppercase tracking-widest mb-2 py-2 px-4 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center gap-2">
            <span>{t.guessPhaseLabel}</span>
            {[...Array(3)].map((_, i) => (
              <span key={i} className={i < aiAttemptsLeft ? 'opacity-100' : 'opacity-20 grayscale'}>🔋</span>
            ))}
          </motion.div>
        )}

        {/* CHAT */}
        <div className="flex-1 bg-white/50 rounded-3xl p-4 overflow-y-auto mb-4 border border-green-100 shadow-inner flex flex-col gap-2 relative no-scrollbar">
          {moves.map((move, index) => {
            const isMe = move.player_name === playerName
            const isPending = move.status === 'pending'
            const isAllowed = move.is_allowed
            const isHostMsg = move.player_name === t.hostName
            const isMaybe = move.item.includes('🟡')

            return (
              <motion.div key={move.id || index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : isHostMsg ? 'self-center items-center' : 'self-start items-start'}`}>
                {!isHostMsg && (
                  <span className="text-[10px] font-black opacity-30 px-2 mb-0.5">{move.player_name}</span>
                )}
                <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border-2
                  ${isHostMsg
                    ? 'bg-[#1A5319] text-white border-[#1A5319] font-black uppercase text-sm px-6 py-3'
                    : isMaybe
                    ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                    : isPending
                    ? 'bg-gray-100 text-gray-500 border-gray-200'
                    : isAllowed
                    ? 'bg-[#E6F4EA] text-[#1A5319] border-[#A8D5BA]'
                    : 'bg-[#FCE8E8] text-[#C62828] border-[#F4B4B4] line-through opacity-60'}`}>
                  <span className="font-bold text-lg md:text-xl">{move.item}</span>
                  {!isHostMsg && !isMaybe && (
                    <span className="text-xl">{isPending ? '⏳' : isAllowed ? '✅' : '❌'}</span>
                  )}
                </div>
                {/* #1 fix: кнопки judge есть всегда когда pending, не влияют на ход */}
                {isHost && isManual && subMode === 'hardcore' && isPending && !isMe && (
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => judge(move.id, true)} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-full text-xs font-bold">✅ OK</button>
                    <button onClick={() => judge(move.id, false)} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-full text-xs font-bold">❌ NO</button>
                    <button onClick={() => declareWinner(move.player_name)} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">🏆 {t.playerGuessed}</button>
                  </div>
                )}
              </motion.div>
            )
          })}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT ZONE */}
        <div className="flex flex-col gap-2 shrink-0" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>

          {/* AI GUESSES */}
          {isAiGuesses && !isGameOver && !isVictory && !hasSurrendered && (
            <div className="space-y-3">
              {aiQuestion && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[22px] p-5 shadow-2xl text-center border border-green-100">
                  <p className="text-[10px] font-black opacity-30 uppercase mb-2">
                    {aiQuestionType === 'guess' ? t.aiGuessLabel : t.aiQuestionLabel}
                  </p>
                  <p className="font-black text-xl md:text-2xl">{aiQuestion}</p>
                  {aiQuestionType === 'guess' && (
                    <div className="flex justify-center gap-1 mt-2">
                      {[...Array(3)].map((_, i) => (
                        <span key={i} className={`text-lg ${i < aiAttemptsLeft ? 'opacity-100' : 'opacity-20 grayscale'}`}>🔋</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
              {!aiQuestion && !isAiThinking && (
                <button onClick={askAiQuestion}
                  className="w-full py-5 bg-[#1A5319] text-white rounded-[22px] font-black uppercase text-base shadow-xl active:scale-95 transition-all">
                  🤖 {t.startAiGame}
                </button>
              )}
              {isAiThinking && (
                <div className="w-full py-5 bg-gray-100 rounded-[22px] text-center font-black text-base opacity-50 animate-pulse">
                  {t.aiThinking}
                </div>
              )}
              {/* #5 — три кнопки: да, нет, возможно */}
              {aiQuestion && !isAiThinking && (
                <div className="flex gap-2">
                  <button onClick={() => answerAiQuestion(false)}
                    className="flex-1 h-16 md:h-20 bg-red-500 text-white rounded-[22px] font-black text-lg md:text-xl active:scale-95 transition-all shadow-xl">
                    ❌ {t.noAnswer}
                  </button>
                  <button onClick={() => answerAiQuestion('maybe')}
                    className="flex-1 h-16 md:h-20 bg-yellow-400 text-white rounded-[22px] font-black text-lg md:text-xl active:scale-95 transition-all shadow-xl">
                    🟡 {t.maybeAnswer}
                  </button>
                  <button onClick={() => answerAiQuestion(true)}
                    className="flex-1 h-16 md:h-20 bg-green-500 text-white rounded-[22px] font-black text-lg md:text-xl active:scale-95 transition-all shadow-xl">
                    ✅ {t.yesAnswer}
                  </button>
                </div>
              )}
              {/* #7 — поле для подсказки */}
              {aiQuestion && !isAiThinking && (
                <div>
                  {!showHintInput ? (
                    <button onClick={() => setShowHintInput(true)}
                      className="w-full py-3 bg-white border-2 border-[#1A5319]/20 text-[#1A5319] rounded-[18px] font-black text-sm uppercase opacity-60 hover:opacity-100 transition-all">
                      {t.giveHint}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={hintInputValue}
                        onChange={(e) => setHintInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendHint()}
                        placeholder={t.hintPlaceholder}
                        className="flex-1 px-4 py-3 rounded-full border-2 border-yellow-300 bg-yellow-50 font-black text-[#1A5319] placeholder:opacity-40 focus:outline-none focus:border-yellow-400 uppercase text-sm"
                      />
                      <button onClick={sendHint}
                        className="px-4 py-3 bg-yellow-400 text-white rounded-full font-black text-sm active:scale-95 transition-all">
                        {t.sendHint}
                      </button>
                      <button onClick={() => { setShowHintInput(false); setHintInputValue('') }}
                        className="px-4 py-3 bg-gray-100 text-gray-500 rounded-full font-black text-sm active:scale-95 transition-all">
                        {t.cancelHint}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Конец игры */}
          {!isAiGuesses && (isGameOver || isVictory || hasSurrendered) && (
            <div className="text-center font-black text-xl text-[#1A5319] p-4 bg-white/80 rounded-2xl border-2 border-green-200">
              <div className="text-sm opacity-50 mt-1">{t.concept} {revealReason}</div>
              {/* #2 fix: хост вводит новое правило */}
              {!isSolo && isHost && isManual && (
                <div className="mt-3">
                  {!showNewRuleInput ? (
                    <button onClick={() => setShowNewRuleInput(true)}
                      className="w-full px-6 py-3 bg-[#1A5319] text-white rounded-full text-sm font-black uppercase">
                      {t.playAgain}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs opacity-50 uppercase">{t.newRule}</p>
                      <input
                        type="text"
                        value={newRuleValue}
                        onChange={(e) => setNewRuleValue(e.target.value)}
                        placeholder={t.newRulePlaceholder}
                        className="w-full px-4 py-3 rounded-full border-2 border-[#1A5319]/30 bg-white font-black text-[#1A5319] placeholder:opacity-30 focus:outline-none focus:border-[#1A5319]/60 uppercase text-sm"
                      />
                      <button
                        onClick={() => newRuleValue.trim() && handlePlayAgain(newRuleValue.trim())}
                        disabled={!newRuleValue.trim()}
                        className="w-full px-6 py-3 bg-[#1A5319] text-white rounded-full text-sm font-black uppercase disabled:opacity-40">
                        {t.startNewGame}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!isSolo && !isManual && (
                <button onClick={() => handlePlayAgain()}
                  className="mt-3 px-6 py-3 bg-[#1A5319] text-white rounded-full text-sm font-black uppercase w-full">
                  {t.playAgain}
                </button>
              )}
              <button onClick={() => router.push('/')}
                className="mt-2 px-6 py-3 bg-white border-2 border-[#1A5319] text-[#1A5319] rounded-full text-sm font-black uppercase w-full">
                {t.menu}
              </button>
            </div>
          )}

          {/* Обычный инпут */}
          {!isAiGuesses && !isGameOver && !isVictory && !hasSurrendered && (
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={getPlaceholder()}
                disabled={!canType}
                className="flex-1 px-5 py-4 rounded-full border-2 border-[#1A5319]/20 bg-white font-black text-[#1A5319] placeholder:opacity-30 focus:outline-none focus:border-[#1A5319]/50 transition-all uppercase disabled:opacity-50 disabled:bg-gray-50 text-base md:text-lg"
              />
              <button
                onClick={handleSend}
                disabled={!canType || !inputValue.trim()}
                className="w-14 h-14 shrink-0 rounded-full bg-[#1A5319] text-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all">
                {isChecking ? '⏳' : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
                  </svg>
                )}
              </button>
              {isHost && isManual && (
                <button onClick={() => {
                  const last = [...moves].reverse().find(m => m.player_name !== t.hostName && m.player_name !== playerName)
                  if (last) declareWinner(last.player_name)
                }} className="w-14 h-14 shrink-0 rounded-full bg-yellow-400 text-white flex items-center justify-center active:scale-95 transition-all text-2xl">
                  🏆
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* OVERLAY — ПОБЕДА */}
      <AnimatePresence>
        {showVictory && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
            className="absolute inset-0 z-50 bg-[#F0FFF4]/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm space-y-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 0.2, duration: 0.5 }} className="text-8xl">
                {isAiGuesses && winner === t.hostName ? '🤖' : isAiGuesses ? '🎉' : '🏆'}
              </motion.div>
              <div className="bg-[#1A5319] p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">
                  {isAiGuesses
                    ? (winner === t.hostName ? t.aiGuessVictory : t.aiGuessDefeat)
                    : (winner === playerName ? t.victory : `🏆 ${winner}`)}
                </h2>
                {isAiGuesses && winner !== t.hostName && (
                  <p className="opacity-60 text-sm font-bold text-white mb-2">{t.aiDefeatSub}</p>
                )}
                <p className="opacity-40 text-[10px] uppercase font-bold tracking-widest text-white mb-2">{t.concept}</p>
                <p className="text-2xl font-bold italic underline decoration-green-400 decoration-2 underline-offset-4 mb-6 text-white">"{revealReason}"</p>
                {!isSolo && isHost && isManual && (
                  <div className="mb-3">
                    {!showNewRuleInput ? (
                      <button onClick={() => setShowNewRuleInput(true)}
                        className="w-full bg-white/20 text-white py-4 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-white/30">
                        {t.playAgain}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs opacity-60 uppercase text-white">{t.newRule}</p>
                        <input
                          type="text"
                          value={newRuleValue}
                          onChange={(e) => setNewRuleValue(e.target.value)}
                          placeholder={t.newRulePlaceholder}
                          className="w-full px-4 py-3 rounded-full border-2 border-white/30 bg-white/10 text-white font-black placeholder:opacity-40 focus:outline-none focus:border-white/60 uppercase text-sm"
                        />
                        <button
                          onClick={() => newRuleValue.trim() && handlePlayAgain(newRuleValue.trim())}
                          disabled={!newRuleValue.trim()}
                          className="w-full bg-white text-black py-4 rounded-[22px] font-black uppercase text-sm disabled:opacity-40">
                          {t.startNewGame}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!isSolo && !isManual && (
                  <button onClick={() => { setIsVictory(false); handlePlayAgain() }}
                    className="w-full bg-white/20 text-white py-4 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-white/30 mb-3">
                    {t.playAgain}
                  </button>
                )}
                <button onClick={() => router.push('/')}
                  className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-gray-100">
                  {t.menu}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY — ПОРАЖЕНИЕ */}
      <AnimatePresence>
        {showDefeat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm space-y-6">
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl">🥀</motion.div>
              <div className="bg-[#1a1a1a] border border-white/10 p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">{t.defeat}</h2>
                <p className="opacity-40 text-[10px] uppercase font-bold tracking-widest text-white mb-2">{t.concept}</p>
                <p className="text-2xl font-bold italic underline decoration-red-400 decoration-2 underline-offset-4 mb-8 text-white">"{revealReason}"</p>
                <button onClick={() => router.push('/')}
                  className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-gray-100">
                  {t.menu}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY — СДАЛСЯ */}
      <AnimatePresence>
        {showSurrender && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
            className="absolute inset-0 z-50 bg-[#F0FFF4]/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm space-y-6">
              <motion.div initial={{ rotate: -10, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-8xl">🏳️</motion.div>
              <div className="bg-[#1A5319] p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">{t.surrenderTitle}</h2>
                <p className="opacity-40 text-[10px] uppercase font-bold tracking-widest text-white mb-2">{t.concept}</p>
                <p className="text-2xl font-bold italic underline decoration-green-400 decoration-2 underline-offset-4 mb-6 text-white">"{revealReason}"</p>
                {!isSolo && isHost && isManual && (
                  <div className="mb-3">
                    {!showNewRuleInput ? (
                      <button onClick={() => setShowNewRuleInput(true)}
                        className="w-full bg-white/20 text-white py-4 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-white/30">
                        {t.playAgain}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs opacity-60 uppercase text-white">{t.newRule}</p>
                        <input
                          type="text"
                          value={newRuleValue}
                          onChange={(e) => setNewRuleValue(e.target.value)}
                          placeholder={t.newRulePlaceholder}
                          className="w-full px-4 py-3 rounded-full border-2 border-white/30 bg-white/10 text-white font-black placeholder:opacity-40 focus:outline-none uppercase text-sm"
                        />
                        <button
                          onClick={() => newRuleValue.trim() && handlePlayAgain(newRuleValue.trim())}
                          disabled={!newRuleValue.trim()}
                          className="w-full bg-white text-black py-4 rounded-[22px] font-black uppercase text-sm disabled:opacity-40">
                          {t.startNewGame}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!isSolo && !isManual && (
                  <button onClick={() => { setHasSurrendered(false); handlePlayAgain() }}
                    className="w-full bg-white/20 text-white py-4 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-white/30 mb-3">
                    {t.playAgain}
                  </button>
                )}
                <button onClick={() => router.push('/')}
                  className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-gray-100">
                  {t.menu}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY — ЛИМОНАД (соло) */}
      <AnimatePresence>
        {isSolo && isSpilled && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-yellow-400/90 flex items-center justify-center p-10 text-center backdrop-blur-sm">
            <div className="text-yellow-900 font-black uppercase italic space-y-4">
              <span className="text-9xl block animate-bounce">🥤</span>
              <p className="text-3xl">{t.spilled}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}