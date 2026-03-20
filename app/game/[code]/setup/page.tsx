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

  const [rule, setRule] = useState('')
  const [subMode, setSubMode] = useState('hardcore')
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Для соло — ИИ сам генерит концепт автоматически
  useEffect(() => {
    if (mode === 'solo') {
      generateSoloConcept()
    }
  }, [])

  const generateSoloConcept = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, secret: true })
      })
      const data = await res.json()
      setRule(data.suggestion)
      setIsReady(true)
    } catch {
      // Фоллбэк если API упало
      const fallback = lang === 'RU' ? 'Слова на букву А' : 'Words starting with A'
      setRule(fallback)
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
        body: JSON.stringify({ lang })
      })
      const data = await res.json()
      setRule(data.suggestion)
    } catch {
      setRule(lang === 'RU' ? 'Слова, в которых есть буква А' : 'Words containing A')
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
    router.push(`/game/${code}?mode=${mode}&sub=${subMode}&lang=${lang}`)
  }

  // СОЛО — минималистичный экран загрузки
  if (mode === 'solo') {
    return (
      <div className="h-screen bg-[#F0FFF4] flex flex-col items-center justify-center p-6 font-sans">
        <div className="text-center space-y-6">
            <div className={`text-8xl ${isLoading ? 'animate-bounce' : ''}`}>🧺</div>
          <p className="font-black text-[#1A5319] uppercase text-sm tracking-widest">
            {isLoading
              ? (lang === 'RU' ? 'ИИ придумывает концепт...' : 'AI is thinking...')
              : (lang === 'RU' ? 'Концепт готов! Удачи 🍀' : 'Concept ready! Good luck 🍀')}
          </p>
          {isReady && (
            <button
              onClick={start}
              className="mt-4 bg-[#22C55E] text-white px-12 py-5 rounded-[22px] font-black uppercase shadow-xl active:scale-95 transition-all tracking-widest"
            >
              {lang === 'RU' ? 'ПОГНАЛИ 🚀' : 'START 🚀'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // МАНУАЛ / AI_HOST — форма с правилом
  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-2xl space-y-6">
        <h2 className="text-xl font-black text-[#1A5319] text-center uppercase">
          {lang === 'RU' ? 'Настройка правила' : 'Setup Rule'}
        </h2>

        {mode === 'manual' && (
          <div className="flex p-1 bg-gray-100 rounded-2xl">
            <button onClick={() => setSubMode('hardcore')} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${subMode === 'hardcore' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>HARDCORE</button>
            <button onClick={() => setSubMode('assist')} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${subMode === 'assist' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>ASSIST</button>
          </div>
        )}

        <div className="relative">
          <textarea
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            className="w-full p-5 bg-gray-50 rounded-[22px] font-bold text-sm h-32 outline-none border-none resize-none"
            placeholder={lang === 'RU' ? "Твоё правило..." : "Your rule..."}
          />
          <button onClick={suggest} disabled={isLoading} className={`absolute bottom-4 right-4 text-2xl transition-all ${isLoading ? 'animate-spin opacity-50' : 'hover:rotate-12 active:scale-90'}`}>
            {isLoading ? '⏳' : '🎲'}
          </button>
        </div>

        <button onClick={start} disabled={!rule} className="w-full bg-[#22C55E] text-white py-5 rounded-[22px] font-black uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40 disabled:scale-100">
          {lang === 'RU' ? 'ПОГНАЛИ 🚀' : 'START 🚀'}
        </button>
      </div>
    </div>
  )
}