'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { use as useReact } from 'react'
import { supabase } from '../../../lib/supabase'

export default function SetupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = useReact(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'manual'
  const lang = searchParams.get('lang') || 'RU'
  const subFromUrl = searchParams.get('sub') || 'hardcore'
  const difficulty = searchParams.get('difficulty') || 'easy'
  const noLives = searchParams.get('nolives') || 'false'

  const [rule, setRule] = useState('')
  const [playerWord, setPlayerWord] = useState('')
  const [subMode, setSubMode] = useState(subFromUrl)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const t: any = {
    RU: {
      setup: 'НАСТРОЙКА ПРАВИЛА', placeholder: 'Твоё правило...', start: 'ПОГНАЛИ 🚀',
      thinking: 'ИИ придумывает концепт...', ready: 'Концепт готов! Удачи 🍀',
      aiGuessesTitle: 'ЗАДАЙ СЛОВО ДЛЯ ИИ',
      aiGuessesPlaceholder: 'Введи любое слово...',
      aiGuessesDesc: 'ИИ будет угадывать это слово задавая вопросы. Ты отвечаешь ✅ или ❌.',
      aiGuessesStart: 'НАЧАТЬ ИГРУ 🚀',
    },
    EN: {
      setup: 'SETUP RULE', placeholder: 'Your rule...', start: 'START 🚀',
      thinking: 'AI is thinking...', ready: 'Concept ready! Good luck 🍀',
      aiGuessesTitle: 'SET A WORD FOR AI',
      aiGuessesPlaceholder: 'Enter any word...',
      aiGuessesDesc: 'AI will try to guess your word by asking questions. You answer ✅ or ❌.',
      aiGuessesStart: 'START GAME 🚀',
    },
    UA: {
      setup: 'НАЛАШТУВАННЯ ПРАВИЛА', placeholder: 'Твоє правило...', start: 'ПОЇХАЛИ 🚀',
      thinking: 'ШІ придумує концепт...', ready: 'Концепт готовий! Удачі 🍀',
      aiGuessesTitle: 'ЗАДАЙ СЛОВО ДЛЯ ШІ',
      aiGuessesPlaceholder: 'Введи будь-яке слово...',
      aiGuessesDesc: 'ШІ буде вгадувати це слово ставлячи питання. Ти відповідаєш ✅ або ❌.',
      aiGuessesStart: 'ПОЧАТИ ГРУ 🚀',
    },
    LV: {
      setup: 'NOTEIKUMA IESTATĪŠANA', placeholder: 'Tavs noteikums...', start: 'SĀKAM 🚀',
      thinking: 'AI domā...', ready: 'Koncepts gatavs! Veiksmi 🍀',
      aiGuessesTitle: 'UZSTĀDI VĀRDU AI',
      aiGuessesPlaceholder: 'Ievadi jebkuru vārdu...',
      aiGuessesDesc: 'AI mēģinās uzminēt tavu vārdu uzdodot jautājumus. Tu atbildi ✅ vai ❌.',
      aiGuessesStart: 'SĀKT SPĒLI 🚀',
    },
  }[lang]

  useEffect(() => {
    if (mode === 'solo' || mode === 'ai_host') {
      generateAIConcept()
    }
  }, [])

  const generateAIConcept = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, secret: true, difficulty })
      })
      const data = await res.json()
      setRule(data.suggestion)
      setIsReady(true)
    } catch {
      const fallbacks: any = {
        RU: 'Предметы красного цвета', EN: 'Red colored items',
        UA: 'Предмети червоного кольору', LV: 'Sarkanas krāsas priekšmeti'
      }
      setRule(fallbacks[lang] || fallbacks.RU)
      setIsReady(true)
    } finally {
      setIsLoading(false)
    }
  }

  const suggest = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, difficulty })
      })
      const data = await res.json()
      setRule(data.suggestion)
    } catch {
      const fallbacks: any = {
        RU: 'Предметы красного цвета', EN: 'Red colored items',
        UA: 'Предмети червоного кольору', LV: 'Sarkanas krāsas priekšmeti'
      }
      setRule(fallbacks[lang] || fallbacks.RU)
    } finally {
      setIsLoading(false)
    }
  }

  const start = async () => {
    if (!rule) return
    await supabase.from('rooms').update({
      secret_rule: rule,
      sub_mode: subMode,
      status: 'playing'
    }).eq('code', code)
    router.push(`/game/${code}?mode=${mode}&sub=${subMode}&difficulty=${difficulty}&nolives=${noLives}&lang=${lang}`)
  }

  const startAiGuesses = async () => {
    if (!playerWord.trim()) return
    await supabase.from('rooms').update({
      secret_rule: playerWord.trim().toUpperCase(),
      sub_mode: 'ai_guesses',
      status: 'playing'
    }).eq('code', code)
    router.push(`/game/${code}?mode=ai_guesses&nolives=${noLives}&lang=${lang}`)
  }

  // РЕЖИМ: ИИ УГАДЫВАЕТ СЛОВО ИГРОКА
  if (mode === 'ai_guesses') {
    return (
      <div className="min-h-screen bg-[#F0FFF4] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-2xl space-y-6 text-center">
          <div className="text-5xl">🤖</div>
          <h2 className="text-xl font-black text-[#1A5319] uppercase">{t.aiGuessesTitle}</h2>
          <p className="text-[10px] opacity-40 font-bold">{t.aiGuessesDesc}</p>
          <input
            value={playerWord}
            onChange={e => setPlayerWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && startAiGuesses()}
            placeholder={t.aiGuessesPlaceholder}
            autoComplete="off"
            className="w-full p-5 rounded-[22px] bg-gray-50 border-none outline-none font-bold text-center uppercase focus:ring-2 ring-green-300"
          />
          <button
            onClick={startAiGuesses}
            disabled={!playerWord.trim()}
            className="w-full bg-[#22C55E] text-white py-5 rounded-[22px] font-black uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40"
          >
            {t.aiGuessesStart}
          </button>
        </div>
      </div>
    )
  }

  // СОЛО / AI_HOST — экран загрузки
  if (mode === 'solo' || mode === 'ai_host') {
    return (
      <div className="min-h-screen bg-[#F0FFF4] flex flex-col items-center justify-center p-6 font-sans">
        <div className="text-center space-y-6">
          <div className={`text-8xl ${isLoading ? 'animate-bounce' : ''}`}>🧺</div>
          <p className="font-black text-[#1A5319] uppercase text-sm tracking-widest">
            {isLoading ? t.thinking : t.ready}
          </p>
          {isReady && (
            <button onClick={start} className="mt-4 bg-[#22C55E] text-white px-12 py-5 rounded-[22px] font-black uppercase shadow-xl active:scale-95 transition-all tracking-widest">
              {t.start}
            </button>
          )}
        </div>
      </div>
    )
  }

  // MANUAL — форма с правилом
  return (
    <div className="min-h-screen bg-[#F0FFF4] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-2xl space-y-6">
        <h2 className="text-xl font-black text-[#1A5319] text-center uppercase">{t.setup}</h2>

        <div className="flex p-1 bg-gray-100 rounded-2xl">
          <button onClick={() => setSubMode('hardcore')} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${subMode === 'hardcore' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>HARDCORE</button>
          <button onClick={() => setSubMode('assist')} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${subMode === 'assist' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>ASSIST</button>
        </div>

        <div className="relative">
          <textarea
            autoComplete="off"
            value={rule}
            onChange={e => setRule(e.target.value)}
            className="w-full p-5 bg-gray-50 rounded-[22px] font-bold text-sm h-32 outline-none border-none resize-none"
            placeholder={t.placeholder}
          />
          <button onClick={suggest} disabled={isLoading} className={`absolute bottom-4 right-4 text-2xl transition-all ${isLoading ? 'animate-spin opacity-50' : 'hover:rotate-12 active:scale-90'}`}>
            {isLoading ? '⏳' : '🎲'}
          </button>
        </div>

        <button onClick={start} disabled={!rule} className="w-full bg-[#22C55E] text-white py-5 rounded-[22px] font-black uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40 disabled:scale-100">
          {t.start}
        </button>
      </div>
    </div>
  )
}