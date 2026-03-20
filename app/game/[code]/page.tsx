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

  // ✅ ФИКС 1: убрали turnPlayer === '' — это и был корень бага
  const isMyTurn = isSolo || isAiGuesses ||
    (isAiHost && turnPlayer === playerName) ||
    (!isAiHost && !isSolo && !isAiGuesses && turnPlayer === playerName)

  const t: any = {
    RU: {
      title: "ПИКНИК БАДДИ",
      placeholder: "Я БЕРУ С СОБОЙ...", surrender: "СДАТЬСЯ",
      spilled: "ТЫ ПРОЛИЛ ЛИМОНАД!", concept: "КОНЦЕПТ ПОХОДА БЫЛ:",
      menu: "В ГЛАВНОЕ МЕНЮ", hostName: "ВЕДУЩИЙ ИИ", campers: "В ПОХОДЕ:",
      spilledMsg: (n: string) => `🥤 ${n} ПРОЛИЛ ЛИМОНАД!`,
      eliminatedMsg: (n: string) => `💀 ${n} ВЫБЫЛ ИЗ ИГРЫ!`,
      winnerMsg: (n: string) => `🏆 ${n} УГАДАЛ КОНЦЕПТ!`,
      whisperLabel: "🤫 ТОЛЬКО ДЛЯ ТЕБЯ:",
      victory: "ТЫ УГАДАЛ!", defeat: "ТЫ ПРОИГРАЛ",
      surrenderTitle: "СДАЛСЯ", eliminated: "ТЫ ВЫБЫЛ!",
      playerGuessed: "УГАДАЛ!", duplicate: "Это слово уже было!",
      notYourTurn: (n: string) => `Ход игрока ${n}...`,
      hostHint: "ПОДСКАЗКА ХОСТА", copied: "СКОПИРОВАНО!",
      ruleReminder: "ТВОЁ ПРАВИЛО:",
      aiGuessVictory: "ИИ УГАДАЛ!", aiGuessDefeat: "ТЫ ПОБЕДИЛ!",
      aiDefeatSub: "ИИ НЕ СМОГ УГАДАТЬ ТВОЁ СЛОВО:",
      startAiGame: "НАЧАТЬ — ИИ ЗАДАЁТ ВОПРОСЫ",
      aiThinking: "ИИ ДУМАЕТ...",
      yesAnswer: "ДА", noAnswer: "НЕТ",
      aiGuessLabel: "🎯 ИИ ДУМАЕТ ЧТО ЭТО:",
      aiQuestionLabel: "❓ ВОПРОС ОТ ИИ:",
      aiAttemptsLeft: (n: number) => `Попыток угадать: ${n}`,
      guessPhaseLabel: "ИИ УГАДЫВАЕТ — ОСТАЛОСЬ ПОПЫТОК:",
      myTurn: "ТВОЙ ХОД",
      theirTurn: (n: string) => `ХОД: ${n}`,
    },
    EN: {
      title: "PICNIC BUDDY",
      placeholder: "I'M TAKING...", surrender: "SURRENDER",
      spilled: "YOU SPILLED LEMONADE!", concept: "THE CONCEPT WAS:",
      menu: "MAIN MENU", hostName: "HOST AI", campers: "CAMPERS:",
      spilledMsg: (n: string) => `🥤 ${n} SPILLED LEMONADE!`,
      eliminatedMsg: (n: string) => `💀 ${n} IS OUT!`,
      winnerMsg: (n: string) => `🏆 ${n} GUESSED THE CONCEPT!`,
      whisperLabel: "🤫 ONLY FOR YOU:",
      victory: "YOU GUESSED IT!", defeat: "YOU LOST",
      surrenderTitle: "SURRENDERED", eliminated: "YOU'RE OUT!",
      playerGuessed: "GUESSED!", duplicate: "This word was already used!",
      notYourTurn: (n: string) => `${n}'s turn...`,
      hostHint: "HOST HINT", copied: "COPIED!",
      ruleReminder: "YOUR RULE:",
      aiGuessVictory: "AI GUESSED IT!", aiGuessDefeat: "YOU WIN!",
      aiDefeatSub: "AI COULDN'T GUESS YOUR WORD:",
      startAiGame: "START — AI ASKS QUESTIONS",
      aiThinking: "AI IS THINKING...",
      yesAnswer: "YES", noAnswer: "NO",
      aiGuessLabel: "🎯 AI THINKS IT'S:",
      aiQuestionLabel: "❓ AI QUESTION:",
      aiAttemptsLeft: (n: number) => `Guesses left: ${n}`,
      guessPhaseLabel: "AI IS GUESSING — ATTEMPTS LEFT:",
      myTurn: "YOUR TURN",
      theirTurn: (n: string) => `TURN: ${n}`,
    },
    UA: {
      title: "ПІКНІК БАДДІ",
      placeholder: "Я БЕРУ З СОБОЮ...", surrender: "ЗДАТИСЯ",
      spilled: "ТИ ПРОЛИВ ЛІМОНАД!", concept: "КОНЦЕПТ ПОХОДУ БУВ:",
      menu: "В ГОЛОВНЕ МЕНЮ", hostName: "ВЕДУЧИЙ ШІ", campers: "У ПОХОДІ:",
      spilledMsg: (n: string) => `🥤 ${n} ПРОЛИВ ЛІМОНАД!`,
      eliminatedMsg: (n: string) => `💀 ${n} ВИБУВ!`,
      winnerMsg: (n: string) => `🏆 ${n} ВГАДАВ КОНЦЕПТ!`,
      whisperLabel: "🤫 ТІЛЬКИ ДЛЯ ТЕБЕ:",
      victory: "ТИ ВГАДАВ!", defeat: "ТИ ПРОГРАВ",
      surrenderTitle: "ЗДАВСЯ", eliminated: "ТИ ВИБУВ!",
      playerGuessed: "ВГАДАВ!", duplicate: "Це слово вже було!",
      notYourTurn: (n: string) => `Хід гравця ${n}...`,
      hostHint: "ПІДКАЗКА ХОСТА", copied: "СКОПІЙОВАНО!",
      ruleReminder: "ТВОЄ ПРАВИЛО:",
      aiGuessVictory: "ШІ ВГАДАВ!", aiGuessDefeat: "ТИ ПЕРЕМІГ!",
      aiDefeatSub: "ШІ НЕ ЗМІГ ВГАДАТИ ТВОЄ СЛОВО:",
      startAiGame: "СТАРТ — ШІ СТАВИТЬ ПИТАННЯ",
      aiThinking: "ШІ ДУМАЄ...",
      yesAnswer: "ТАК", noAnswer: "НІ",
      aiGuessLabel: "🎯 ШІ ДУМАЄ ЩО ЦЕ:",
      aiQuestionLabel: "❓ ПИТАННЯ ВІД ШІ:",
      aiAttemptsLeft: (n: number) => `Спроб вгадати: ${n}`,
      guessPhaseLabel: "ШІ ВГАДУЄ — ЗАЛИШИЛОСЬ СПРОБ:",
      myTurn: "ТВІЙ ХІД",
      theirTurn: (n: string) => `ХІД: ${n}`,
    },
    LV: {
      title: "PIKNIKA BIEDRS",
      placeholder: "ES ŅEMU LĪDZI...", surrender: "PADOTIES",
      spilled: "TU IZLĒJI LIMONĀDI!", concept: "PĀRGĀJIENA KONCEPTS BIJA:",
      menu: "UZ GALVENO IZVĒLNI", hostName: "VADĪTĀJS AI", campers: "DALĪBNIEKI:",
      spilledMsg: (n: string) => `🥤 ${n} IZLĒJA LIMONĀDI!`,
      eliminatedMsg: (n: string) => `💀 ${n} IR ĀRĀ!`,
      winnerMsg: (n: string) => `🏆 ${n} UZMINĒJA KONCEPTU!`,
      whisperLabel: "🤫 TIKAI TEV:",
      victory: "TU UZMINĒJI!", defeat: "TU ZAUDĒJI",
      surrenderTitle: "PADEVĀS", eliminated: "TU ESI ĀRĀ!",
      playerGuessed: "UZMINĒJA!", duplicate: "Šis vārds jau tika izmantots!",
      notYourTurn: (n: string) => `${n} gājiens...`,
      hostHint: "VADĪTĀJA PADOMS", copied: "NOKOPĒTS!",
      ruleReminder: "TAVS NOTEIKUMS:",
      aiGuessVictory: "AI UZMINĒJA!", aiGuessDefeat: "TU UZVARĒJI!",
      aiDefeatSub: "AI NEUZMINĒJA TAVU VĀRDU:",
      startAiGame: "SĀKT — AI UZDOD JAUTĀJUMUS",
      aiThinking: "AI DOMĀ...",
      yesAnswer: "JĀ", noAnswer: "NĒ",
      aiGuessLabel: "🎯 AI DOMĀ KA TAS IR:",
      aiQuestionLabel: "❓ AI JAUTĀJUMS:",
      aiAttemptsLeft: (n: number) => `Minējumi atlikuši: ${n}`,
      guessPhaseLabel: "AI MIN — ATLIKUŠI MĒĢINĀJUMI:",
      myTurn: "TAVS GĀJIENS",
      theirTurn: (n: string) => `GĀJIENS: ${n}`,
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
      const { data: room } = await supabase
        .from('rooms').select('*').eq('code', code).single()

      if (room) {
        setRevealReason(room.secret_rule || '???')
        if (room.status === 'finished') setIsGameOver(true)
        if (room.status === 'victory') {
          setIsVictory(true)
          setWinner(room.winner || '')
        }
        console.log('turn_player from DB:', room.turn_player)
        setTurnPlayer(room.turn_player || '')
        const livesData: Record<string, number> = room.lives || {}
        if (!(name in livesData) && !noLives) {
          livesData[name] = 3
          await supabase.from('rooms').update({ lives: livesData }).eq('code', code)
        }
        setPlayerLives(livesData)
      }

      const { data: mv } = await supabase
        .from('moves').select('*').eq('room_code', code)
        .order('created_at', { ascending: true })

      if (mv) {
        setMoves(mv)

        if (!isSolo && !isAiGuesses) {
          const names = Array.from(new Set(
            mv.map((m: any) => m.player_name)
              .filter((n: string) => n !== t.hostName)
          )) as string[]
          if (!names.includes(name)) names.push(name)
          setPlayers(names)

           // ✅ ФИКС 2: инициализация первого хода
          const { data: freshRoom } = await supabase
            .from('rooms').select('turn_player').eq('code', code).single()

          console.log('freshRoom turn_player:', freshRoom?.turn_player, 'names:', names)
          if ((!freshRoom?.turn_player || freshRoom.turn_player === '') && names.length > 0) {
            const firstPlayer = [...names].sort()[0]
            await supabase.from('rooms')
              .update({ turn_player: firstPlayer })
              .eq('code', code)
            setTurnPlayer(firstPlayer)
          }
        }

        // Считаем попытки ИИ в режиме ai_guesses
        if (isAiGuesses) {
          const hostNames = ['ВЕДУЩИЙ ИИ', 'HOST AI', 'ВЕДУЧИЙ ШІ', 'VADĪTĀJS AI']
          const guessCount = mv.filter((m: any) =>
            hostNames.includes(m.player_name) && m.item.includes('🎯')
          ).length
          const questionCount = mv.filter((m: any) =>
            hostNames.includes(m.player_name) && m.item.includes('❓')
          ).length
          setAiAttemptsLeft(Math.max(3 - guessCount, 0))
          setIsGuessPhase(questionCount >= 7)
        }
      }
    }

    fetchAll()

    const channel = supabase.channel(`game-${code}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'moves',
        filter: `room_code=eq.${code}`
      }, () => fetchAll())
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `code=eq.${code}`
      }, (p) => {
        if (p.new.status === 'finished') setIsGameOver(true)
        if (p.new.status === 'victory') {
          setIsVictory(true)
          setWinner(p.new.winner || '')
        }
        if (p.new.secret_rule) setRevealReason(p.new.secret_rule)
        if (p.new.lives) setPlayerLives(p.new.lives)
        // ✅ ФИКС 3: всегда обновляем turnPlayer из базы, даже если пустой
        if (p.new.turn_player !== undefined) {
          setTurnPlayer(p.new.turn_player || '')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code])

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const nextTurn = async (
    currentPlayers: string[],
    currentTurn: string,
    hostName: string
  ) => {
    if (isSolo || isAiGuesses) return
    const gamePlayers = currentPlayers.filter(p => p !== hostName)
    if (gamePlayers.length === 0) return

    // ✅ ФИКС 4: если ход пустой — всегда ставим первого игрока, не хоста
    if (!currentTurn || currentTurn === '') {
      await supabase.from('rooms')
        .update({ turn_player: gamePlayers[0] })
        .eq('code', code)
    } else if (currentTurn === hostName) {
      await supabase.from('rooms')
        .update({ turn_player: gamePlayers[0] })
        .eq('code', code)
    } else {
      const idx = gamePlayers.indexOf(currentTurn)
      if (idx === gamePlayers.length - 1) {
        await supabase.from('rooms')
          .update({ turn_player: hostName })
          .eq('code', code)
      } else {
        await supabase.from('rooms')
          .update({ turn_player: gamePlayers[idx + 1] })
          .eq('code', code)
      }
    }
  }

  const nextAiHostTurn = async (
    currentPlayers: string[],
    currentTurn: string
  ) => {
    const activePlayers = currentPlayers.filter(p => !eliminatedPlayers.includes(p))
    if (activePlayers.length === 0) return

    // ✅ ФИКС 5: если текущий игрок не в активных — ставим первого
    if (!currentTurn || !activePlayers.includes(currentTurn)) {
      await supabase.from('rooms')
        .update({ turn_player: activePlayers[0] })
        .eq('code', code)
      return
    }
    const idx = activePlayers.indexOf(currentTurn)
    const next = activePlayers[(idx + 1) % activePlayers.length]
    await supabase.from('rooms')
      .update({ turn_player: next })
      .eq('code', code)
  }

  const checkWhisper = async (currentMoves: any[]) => {
    if (!isAssist || !isHost) return
    const playerMovesCount = currentMoves.filter(
      (m: any) => m.player_name !== t.hostName
    ).length
    if (playerMovesCount === 0 || playerMovesCount % 3 !== 0) return
    try {
      const res = await fetch('/api/whisper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, lang })
      })
      const data = await res.json()
      if (data.whisper) {
        setWhisper(data.whisper)
        setWhisperDanger(data.danger)
        setTimeout(() => setWhisper(null), 6000)
      }
    } catch { }
  }

  const handleLoseLive = async (targetPlayer: string) => {
    if (noLives) return
    const { data: room } = await supabase
      .from('rooms').select('lives').eq('code', code).single()
    const currentLives: Record<string, number> = room?.lives || {}
    const newCount = Math.max((currentLives[targetPlayer] ?? 3) - 1, 0)
    const updated = { ...currentLives, [targetPlayer]: newCount }
    await supabase.from('rooms').update({ lives: updated }).eq('code', code)
    setPlayerLives(updated)

    if (newCount <= 0) {
      if (isSolo) {
        setIsGameOver(true)
        await supabase.from('rooms')
          .update({ status: 'finished' })
          .eq('code', code)
      } else {
        await supabase.from('moves').insert([{
          room_code: code,
          player_name: t.hostName,
          item: t.eliminatedMsg(targetPlayer),
          status: 'approved',
          is_allowed: true
        }])
        setEliminatedPlayers(prev => [...prev, targetPlayer])
      }
    }
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
        room_code: code,
        player_name: t.hostName,
        item: data.type === 'guess' ? `🎯 ${data.text}` : `❓ ${data.text}`,
        status: 'approved',
        is_allowed: true
      }])
    } finally {
      setIsAiThinking(false)
    }
  }

  const answerAiQuestion = async (answer: boolean) => {
    const { data: lastMove } = await supabase
      .from('moves').select('*').eq('room_code', code)
      .eq('player_name', t.hostName)
      .order('created_at', { ascending: false })
      .limit(1).single()

    if (lastMove) {
      await supabase.from('moves')
        .update({ is_allowed: answer })
        .eq('id', lastMove.id)
      await supabase.from('moves').insert([{
        room_code: code,
        player_name: playerName,
        item: answer ? `✅ ${t.yesAnswer}` : `❌ ${t.noAnswer}`,
        status: 'approved',
        is_allowed: answer
      }])
    }

    if (aiQuestionType === 'guess' && answer) {
      await supabase.from('rooms')
        .update({ status: 'victory', winner: t.hostName })
        .eq('code', code)
      setIsVictory(true)
      setWinner(t.hostName)
    } else if (aiQuestionType === 'guess' && !answer) {
      const newAttempts = aiAttemptsLeft - 1
      setAiAttemptsLeft(newAttempts)
      setAiQuestion('')
      if (newAttempts <= 0) {
        await supabase.from('rooms')
          .update({ status: 'victory', winner: playerName })
          .eq('code', code)
        setIsVictory(true)
        setWinner(playerName)
      } else {
        await askAiQuestion()
      }
    } else {
      setAiQuestion('')
      await askAiQuestion()
    }
  }

  const sendHostHint = async () => {
    if (!inputValue.trim() || isChecking) return
    const text = inputValue.trim().toUpperCase()
    setInputValue('')
    setIsChecking(true)
    try {
      await supabase.from('moves').insert([{
        room_code: code,
        player_name: t.hostName,
        item: text,
        status: 'approved',
        is_allowed: true
      }])
      const gamePlayers = players.filter(p => p !== playerName)
      if (gamePlayers.length > 0) {
        await supabase.from('rooms')
          .update({ turn_player: gamePlayers[0] })
          .eq('code', code)
      }
    } finally {
      setIsChecking(false)
    }
  }

  const handleSend = async () => {
    if (
      !inputValue.trim() || isGameOver || isVictory ||
      isSpilled || isChecking || isEliminated ||
      code === 'undefined'
    ) return

    // ✅ ФИКС 6: единая строгая проверка хода — без turnPlayer === ''
    if (!isSolo && !isAiGuesses && turnPlayer !== playerName) return

    const text = inputValue.trim().toUpperCase()
    const isDuplicate = moves.some(
      m => m.item === text && m.player_name !== t.hostName
    )
    if (isDuplicate) { alert(t.duplicate); return }

    setInputValue('')
    setIsChecking(true)

    try {
      const { data: move } = await supabase.from('moves').insert([{
        room_code: code,
        player_name: playerName,
        item: text,
        status: (isSolo || isAiHost) ? 'approved' : 'pending',
        is_allowed: true
      }]).select().single()

      // --- SOLO режим ---
      if (isSolo && move) {
        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: text, roomCode: code, lang, needHint: true })
        })
        const result = await res.json()
        if (result.guessed) {
          await supabase.from('moves')
            .update({ is_allowed: true }).eq('id', move.id)
          await supabase.from('rooms')
            .update({ status: 'victory', winner: playerName }).eq('code', code)
          setIsVictory(true)
          setWinner(playerName)
          return
        }
        await supabase.from('moves')
          .update({ is_allowed: result.allowed }).eq('id', move.id)
        if (result.hint) {
          await supabase.from('moves').insert([{
            room_code: code,
            player_name: t.hostName,
            item: result.hint,
            status: 'approved',
            is_allowed: true
          }])
        }
        if (!result.allowed) await handleLoseLive(playerName)
      }

      // --- AI HOST режим ---
      if (isAiHost && move) {
        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: text, roomCode: code, lang, needHint: false })
        })
        const result = await res.json()

        if (result.guessed) {
          await supabase.from('moves')
            .update({ is_allowed: true }).eq('id', move.id)
          await supabase.from('rooms')
            .update({ status: 'victory', winner: playerName }).eq('code', code)
          setIsVictory(true)
          setWinner(playerName)
          return
        }

        await supabase.from('moves')
          .update({ is_allowed: result.allowed }).eq('id', move.id)
        if (!result.allowed) await handleLoseLive(playerName)

        // Получаем актуальный список игроков из базы
        const { data: freshMoves } = await supabase
          .from('moves').select('player_name').eq('room_code', code)
          .order('created_at', { ascending: true })

        const allPlayers = Array.from(new Set(
          freshMoves?.map((m: any) => m.player_name)
            .filter((n: string) => n !== t.hostName) || []
        )) as string[]

        const activePlayers = allPlayers.filter(p => !eliminatedPlayers.includes(p))

        if (activePlayers.length > 0) {
          const currentIdx = activePlayers.indexOf(playerName)
          const nextIdx = (currentIdx + 1) % activePlayers.length
          const nextPlayer = activePlayers[nextIdx]

          // Если круг завершён — ИИ даёт подсказку
          if (nextIdx === 0) {
            const checkRes = await fetch('/api/check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ item: text, roomCode: code, lang, needHint: true })
            })
            const checkResult = await checkRes.json()
            if (checkResult.hint) {
              await supabase.from('moves').insert([{
                room_code: code,
                player_name: t.hostName,
                item: checkResult.hint,
                status: 'approved',
                is_allowed: true
              }])
            }
          }

          // ✅ ФИКС 7: явно передаём nextPlayer в базу
          await supabase.from('rooms')
            .update({ turn_player: nextPlayer })
            .eq('code', code)
        }
      }

      // --- ASSIST режим ---
      if (isAssist && move) {
        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: text, roomCode: code, lang, needHint: false })
        })
        const result = await res.json()
        if (result.guessed) {
          await supabase.from('rooms')
            .update({ status: 'victory', winner: playerName }).eq('code', code)
          setIsVictory(true)
          setWinner(playerName)
          return
        }
        await supabase.from('moves')
          .update({ status: 'approved', is_allowed: result.allowed }).eq('id', move.id)
        if (!result.allowed) await handleLoseLive(playerName)
      }

      // --- MANUAL / обычный мультиплеер ---
      if (!isSolo && !isAiGuesses && !isAiHost) {
        const hostName = isHost ? playerName : players[0]
        await nextTurn(players, turnPlayer, hostName)
      }

      const { data: freshMovesForWhisper } = await supabase
        .from('moves').select('*').eq('room_code', code)
        .order('created_at', { ascending: true })
      if (freshMovesForWhisper) await checkWhisper(freshMovesForWhisper)

    } finally {
      setIsChecking(false)
    }
  }

  const declareWinner = async (winnerName: string) => {
    await supabase.from('moves').insert([{
      room_code: code,
      player_name: t.hostName,
      item: t.winnerMsg(winnerName),
      status: 'approved',
      is_allowed: true
    }])
    await supabase.from('rooms')
      .update({ status: 'victory', winner: winnerName })
      .eq('code', code)
    setIsVictory(true)
    setWinner(winnerName)
  }

  const judge = async (id: string, allowed: boolean) => {
    await supabase.from('moves')
      .update({ status: 'approved', is_allowed: allowed }).eq('id', id)
    if (!allowed) {
      const { data: move } = await supabase
        .from('moves').select('player_name').eq('id', id).single()
      if (move) await handleLoseLive(move.player_name)
    }
    const { data: freshMoves } = await supabase
      .from('moves').select('*').eq('room_code', code)
      .order('created_at', { ascending: true })
    if (freshMoves) await checkWhisper(freshMoves)
  }

  const showVictory = isVictory
  const showDefeat = isGameOver && !isVictory && (isSolo || isAiHost)
  const showEliminated = isEliminated && !isSolo && !isAiGuesses && !isVictory
  const showSurrender = hasSurrendered && !isVictory && !isGameOver

  // ✅ ФИКС 8: canType тоже без turnPlayer === ''
  const canType = !isSpilled && !isChecking && (
    isSolo || isAiGuesses ||
    (isAiHost && turnPlayer === playerName) ||
    (!isAiHost && !isSolo && !isAiGuesses && isMyTurn)
  )

  const getPlaceholder = () => {
    if (isSpilled) return t.spilled
    if (isChecking) return '...'
    if (isAiHost && turnPlayer && turnPlayer !== playerName) return t.notYourTurn(turnPlayer)
    if (!isMyTurn && turnPlayer && !isAiHost) return t.notYourTurn(turnPlayer)
    return t.placeholder
  }

  return (
    <div className="min-h-screen bg-[#F0FFF4] font-sans">
      <div className="w-full max-w-2xl mx-auto flex flex-col h-screen px-4 md:px-8 py-4 md:py-6">

        {/* HEADER */}
        <div className="flex justify-between items-center relative mb-3">
          <button
            onClick={() => router.push('/')}
            className="text-2xl opacity-20 hover:opacity-60 transition-opacity"
          >←</button>
          <div className="absolute left-1/2 -translate-x-1/2">
            <button
              onClick={() => router.push('/')}
              className="font-black text-sm md:text-base text-[#1A5319] opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest"
            >
              {t.title}
            </button>
          </div>
          <div className="flex gap-2 md:gap-3 items-center">
            {!isManual && !noLives && !isAiGuesses && (
              <div className="flex gap-0.5">
                {[...Array(Math.max(myLives, 0))].map((_, i) =>
                  <span key={i} className="text-2xl md:text-3xl">🍋</span>
                )}
              </div>
            )}
            {isAiGuesses && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black opacity-30 uppercase">AI</span>
                <div className="flex gap-0.5">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-xl transition-all ${i < aiAttemptsLeft ? 'opacity-100' : 'opacity-20 grayscale'}`}
                    >🔋</span>
                  ))}
                </div>
              </div>
            )}
            {noLives && !isManual && !isAiGuesses && (
              <span className="text-xl font-black opacity-30">∞</span>
            )}
            {isHost && isManual && (
              <button
                onClick={() => setShowRuleReminder(!showRuleReminder)}
                className={`text-xl transition-opacity ${showRuleReminder ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
              >📋</button>
            )}
            <button
              onClick={() => setHasSurrendered(true)}
              className="text-xs font-black opacity-30 uppercase hover:opacity-100 transition-opacity"
            >
              {t.surrender}
            </button>
          </div>
        </div>

        {/* RULE REMINDER */}
        <AnimatePresence>
          {showRuleReminder && isHost && isManual && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 px-5 py-3 rounded-[18px] bg-[#1A5319]/10 border-2 border-[#1A5319]/20"
            >
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">
                {t.ruleReminder}
              </p>
              <p className="font-black text-[#1A5319] text-base">"{revealReason}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CAMPERS */}
        {!isSolo && !isAiGuesses && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 border-b border-green-100 mb-3 items-center">
            <button
              onClick={copyCode}
              className="font-black text-xl text-[#1A5319] tracking-widest hover:opacity-60 active:scale-95 transition-all shrink-0"
            >
              {copied ? t.copied : code}
            </button>
            <span className="text-[10px] font-black opacity-20">·</span>
            <span className="text-[10px] font-black opacity-30 uppercase pt-0.5 shrink-0">
              {t.campers}
            </span>
            {players.map((p, i) => {
              const pLives = playerLives[p] ?? 3
              const pEliminated = eliminatedPlayers.includes(p)
              const isCurrentTurn = turnPlayer === p
              return (
                <div
                  key={i}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap flex items-center gap-1.5 transition-all
                    ${pEliminated
                      ? 'bg-red-100 text-red-800 border-red-200 line-through opacity-50'
                      : isCurrentTurn
                        ? 'bg-[#1A5319] text-white border-[#1A5319] shadow-md'
                        : 'bg-white/50 text-[#1A5319] border-green-200/50'
                    }`}
                >
                  {pEliminated ? '💀' : isCurrentTurn ? '▶' : '●'} {p}
                  {!pEliminated && !noLives && (
                    <span className="text-base">{'🍋'.repeat(Math.max(pLives, 0))}</span>
                  )}
                  {!pEliminated && noLives && (
                    <span className="opacity-40 text-xs">∞</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* WHISPER */}
        <AnimatePresence>
          {whisper && isHost && isAssist && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-3 px-5 py-3 rounded-[18px] text-sm font-bold border-2 
                ${whisperDanger
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-green-50 border-green-200 text-green-800'
                }`}
            >
              <span className="opacity-50 text-[10px] uppercase tracking-widest block mb-1">
                {t.whisperLabel}
              </span>
              {whisper}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI HOST индикатор хода */}
        {isAiHost && players.length > 1 && !isGameOver && !isVictory && (
          <motion.div
            key={turnPlayer}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center text-xs font-black uppercase tracking-widest mb-2 py-1.5 rounded-full
              ${turnPlayer === playerName
                ? 'text-[#1A5319] bg-green-100'
                : 'text-gray-400 bg-gray-50'
              }`}
          >
            {turnPlayer === playerName
              ? `▶ ${t.myTurn}`
              : `⏳ ${t.theirTurn(turnPlayer)}`
            }
          </motion.div>
        )}

        {/* AI GUESSES — индикатор фазы угадывания */}
        {isAiGuesses && isGuessPhase && !isVictory && !isGameOver && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-xs font-black uppercase tracking-widest mb-2 py-2 px-4 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center gap-2"
          >
            <span>{t.guessPhaseLabel}</span>
            <span className="flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={i < aiAttemptsLeft ? 'opacity-100' : 'opacity-20 grayscale'}>
                  🔋
                </span>
              ))}
            </span>
          </motion.div>
        )}

        {/* CHAT */}
        <div className={`flex-1 overflow-y-auto space-y-3 py-3 no-scrollbar ${isAiGuesses ? 'pb-72' : 'pb-32'}`}>
          {moves.map((m, i) => {
            const isSystemMsg = m.player_name === t.hostName &&
              (m.item.includes('🥤') || m.item.includes('💀') || m.item.includes('🏆'))
            const isHintMsg = m.player_name === t.hostName && !isSystemMsg
            const isAiMsg = isAiGuesses && m.player_name === t.hostName

            if (isSystemMsg) {
              return (
                <div key={m.id || i} className="flex justify-center">
                  <div className={`px-6 py-3 rounded-[20px] font-black text-sm uppercase tracking-wider border
                    ${m.item.includes('💀')
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : m.item.includes('🏆')
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-orange-100 text-orange-800 border-orange-200'
                    }`}>
                    {m.item}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={m.id || i}
                className={`flex flex-col ${m.player_name === playerName ? 'items-end' : 'items-start'}`}
              >
                <div className={`p-4 md:p-5 rounded-[25px] max-w-[85%] md:max-w-[70%] shadow-sm relative
                  ${m.player_name === playerName
                    ? 'bg-black text-white'
                    : isHintMsg || isAiMsg
                      ? 'bg-green-100 text-green-900 border-2 border-green-200'
                      : 'bg-white text-black'
                  }`}>
                  {m.status === 'approved' && !isHintMsg && !isAiGuesses && (
                    <div className={`absolute -top-1 ${m.player_name === playerName ? '-left-2' : '-right-2'} text-xs bg-white rounded-full shadow-md w-6 h-6 flex items-center justify-center`}>
                      {m.is_allowed ? '✅' : '❌'}
                    </div>
                  )}
                  <p className="text-[11px] font-bold opacity-40 mb-1 uppercase tracking-widest">
                    {isHintMsg || isAiMsg
                      ? (isAiGuesses ? '🤖 AI' : t.hostHint)
                      : m.player_name
                    }
                  </p>
                  <p className={`font-bold text-xl md:text-2xl italic 
                    ${m.status === 'approved' && !m.is_allowed && !isAiGuesses
                      ? 'line-through opacity-30'
                      : ''
                    }`}>
                    "{m.item}"
                  </p>
                  {isHost && isManual && subMode === 'hardcore' &&
                    m.status === 'pending' && m.player_name !== playerName && (
                      <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => judge(m.id, true)}
                          className="bg-green-500 text-white px-4 py-2 rounded-full text-xs font-black"
                        >✅ OK</button>
                        <button
                          onClick={() => judge(m.id, false)}
                          className="bg-red-500 text-white px-4 py-2 rounded-full text-xs font-black"
                        >❌ NO</button>
                        <button
                          onClick={() => declareWinner(m.player_name)}
                          className="bg-yellow-500 text-white px-4 py-2 rounded-full text-xs font-black"
                        >🏆 {t.playerGuessed}</button>
                      </div>
                    )}
                </div>
              </div>
            )
          })}
          <div ref={chatEndRef} />
          <div className="pt-2 pb-2 text-center opacity-10 font-black uppercase tracking-[0.3em] text-[10px]">
            MADE BY SOLO
          </div>
        </div>

        {/* INPUT обычный */}
        {!isAiGuesses && !hasSurrendered && !isGameOver && !isVictory && !isEliminated && (
          <div
            className="sticky bottom-0 bg-[#F0FFF4] pt-2 pb-4 space-y-2"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {!canType && turnPlayer && !isAiGuesses && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-xs font-black text-[#1A5319] opacity-40 uppercase tracking-widest"
              >
                {t.notYourTurn(turnPlayer)}
              </motion.div>
            )}
            <div className="flex gap-2">
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    isHost && isManual && turnPlayer === playerName
                      ? sendHostHint()
                      : handleSend()
                  }
                }}
                disabled={!canType}
                className="flex-1 bg-white p-4 md:p-5 rounded-[22px] shadow-2xl font-bold text-base md:text-lg outline-none border-none ring-offset-2 focus:ring-2 ring-green-300 disabled:opacity-40 transition-all"
                placeholder={getPlaceholder()}
              />
              <button
                onClick={isHost && isManual && turnPlayer === playerName
                  ? sendHostHint
                  : handleSend
                }
                disabled={!inputValue.trim() || !canType}
                className="w-14 h-14 md:w-16 md:h-16 bg-[#22C55E] rounded-[22px] shadow-xl flex items-center justify-center text-2xl active:scale-95 transition-all disabled:grayscale disabled:opacity-50"
              >
                {isChecking ? '⏳' : '🧺'}
              </button>
              {isHost && isManual && (
                <button
                  onClick={() => {
                    const lastPlayerMove = [...moves].reverse().find(
                      m => m.player_name !== t.hostName && m.player_name !== playerName
                    )
                    if (lastPlayerMove) declareWinner(lastPlayerMove.player_name)
                  }}
                  className="w-14 h-14 md:w-16 md:h-16 bg-yellow-400 rounded-[22px] shadow-xl flex items-center justify-center text-2xl active:scale-95 transition-all hover:bg-yellow-500"
                >🏆</button>
              )}
            </div>
          </div>
        )}

        {/* INPUT ai_guesses */}
        {isAiGuesses && !isGameOver && !isVictory && !hasSurrendered && (
          <div
            className="sticky bottom-0 bg-[#F0FFF4] pt-2 pb-4 space-y-3"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {aiQuestion && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[22px] p-5 shadow-2xl text-center"
              >
                <p className="text-[10px] font-black opacity-30 uppercase mb-2">
                  {aiQuestionType === 'guess' ? t.aiGuessLabel : t.aiQuestionLabel}
                </p>
                <p className="font-black text-xl md:text-2xl">{aiQuestion}</p>
                {aiQuestionType === 'guess' && (
                  <div className="flex justify-center gap-1 mt-2">
                    {[...Array(3)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-lg ${i < aiAttemptsLeft ? 'opacity-100' : 'opacity-20 grayscale'}`}
                      >🔋</span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {!aiQuestion && !isAiThinking && (
              <button
                onClick={askAiQuestion}
                className="w-full py-5 bg-[#1A5319] text-white rounded-[22px] font-black uppercase text-base shadow-xl active:scale-95 transition-all"
              >
                🤖 {t.startAiGame}
              </button>
            )}
            {isAiThinking && (
              <div className="w-full py-5 bg-gray-100 rounded-[22px] text-center font-black text-base opacity-50">
                {t.aiThinking}
              </div>
            )}
            {aiQuestion && !isAiThinking && (
              <div className="flex gap-3">
                <button
                  onClick={() => answerAiQuestion(false)}
                  className="flex-1 h-16 md:h-20 bg-red-500 text-white rounded-[22px] font-black text-xl md:text-2xl active:scale-95 transition-all shadow-xl"
                >
                  ❌ {t.noAnswer}
                </button>
                <button
                  onClick={() => answerAiQuestion(true)}
                  className="flex-1 h-16 md:h-20 bg-green-500 text-white rounded-[22px] font-black text-xl md:text-2xl active:scale-95 transition-all shadow-xl"
                >
                  ✅ {t.yesAnswer}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OVERLAY ПОБЕДА */}
      <AnimatePresence>
        {showVictory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-50 bg-[#F0FFF4]/95 backdrop-blur-md flex items-center justify-center p-6 text-center"
          >
            <div className="w-full max-w-sm space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-8xl"
              >
                {isAiGuesses && winner === t.hostName ? '🤖' : isAiGuesses ? '🎉' : '🏆'}
              </motion.div>
              <div className="bg-[#1A5319] p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">
                  {isAiGuesses
                    ? (winner === t.hostName ? t.aiGuessVictory : t.aiGuessDefeat)
                    : (winner === playerName ? t.victory : `🏆 ${winner}`)
                  }
                </h2>
                {isAiGuesses && winner !== t.hostName && (
                  <p className="opacity-60 text-sm font-bold text-white mb-2">
                    {t.aiDefeatSub}
                  </p>
                )}
                <p className="opacity-40 text-[10px] uppercase font-bold tracking-widest text-white mb-2">
                  {t.concept}
                </p>
                <p className="text-2xl font-bold italic underline decoration-green-400 decoration-2 underline-offset-4 mb-8 text-white">
                  "{revealReason}"
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-gray-100"
                >
                  {t.menu}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY ПОРАЖЕНИЕ */}
      <AnimatePresence>
        {showDefeat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-6 text-center"
          >
            <div className="w-full max-w-sm space-y-6">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-8xl"
              >🥀</motion.div>
              <div className="bg-[#1a1a1a] border border-white/10 p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">{t.defeat}</h2>
                <p className="opacity-40 text-[10px] uppercase font-bold tracking-widest text-white mb-2">
                  {t.concept}
                </p>
                <p className="text-2xl font-bold italic underline decoration-red-400 decoration-2 underline-offset-4 mb-8 text-white">
                  "{revealReason}"
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-gray-100"
                >
                  {t.menu}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY ВЫБЫЛ */}
      <AnimatePresence>
        {showEliminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center"
          >
            <div className="w-full max-w-sm space-y-6">
              <motion.div
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-8xl"
              >💀</motion.div>
              <div className="bg-[#1a1a1a] border border-white/10 p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">{t.eliminated}</h2>
                <p className="opacity-40 text-[10px] uppercase font-bold tracking-widest text-white mb-2">
                  {t.concept}
                </p>
                <p className="text-2xl font-bold italic underline decoration-red-400 decoration-2 underline-offset-4 mb-8 text-white">
                  "{revealReason}"
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-gray-100"
                >
                  {t.menu}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY СДАЧА */}
      <AnimatePresence>
        {showSurrender && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-50 bg-[#F0FFF4]/95 backdrop-blur-md flex items-center justify-center p-6 text-center"
          >
            <div className="w-full max-w-sm space-y-6">
              <motion.div
                initial={{ rotate: -10, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-8xl"
              >🏳️</motion.div>
              <div className="bg-[#1A5319] p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black italic mb-2 text-white">{t.surrenderTitle}</h2>
                <p className="opacity-40 text-[10px] uppercase font-bold tracking-widest text-white mb-2">
                  {t.concept}
                </p>
                <p className="text-2xl font-bold italic underline decoration-green-400 decoration-2 underline-offset-4 mb-8 text-white">
                  "{revealReason}"
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-sm tracking-widest hover:bg-gray-100"
                >
                  {t.menu}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

            {/* OVERLAY SPILLED */}
      <AnimatePresence>
        {isSolo && isSpilled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-yellow-400/90 flex items-center justify-center p-10 text-center backdrop-blur-sm"
          >
            <div className="text-yellow-900 font-black uppercase italic space-y-4">
              <span className="text-9xl block animate-bounce">🥤</span>
              <p className="text-3xl">{t.spilled}</p>
              <p className="text-xs opacity-60 tracking-widest">8 seconds...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}