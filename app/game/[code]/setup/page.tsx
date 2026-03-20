'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function SetupPage({ params }: { params: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'manual'
  const lang = searchParams.get('lang') || 'RU'
  
  const [rule, setRule] = useState('')
  const [subMode, setSubMode] = useState('hardcore')
  const [isSuggesting, setIsSuggesting] = useState(false)

  // БРОНЕБОЙНЫЙ КУБИК
  const suggest = async () => {
    setIsSuggesting(true)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang })
      })
      if (!res.ok) throw new Error('API Error')
      const data = await res.json()
      setRule(data.suggestion)
    } catch (err) {
      // ЕСЛИ API УПАЛО - ВЫДАСТ ЭТО, НО НЕ ЗАВИСНЕТ
      setRule(lang === 'RU' ? 'Слова, в которых есть буква А' : 'Words containing the letter A')
    } finally {
      setIsSuggesting(false)
    }
  }

  const start = async () => {
    if (!rule) return alert(lang === 'RU' ? "Введите правило!" : "Enter a rule!")
    await supabase.from('rooms').update({ 
      secret_rule: rule, 
      sub_mode: subMode, 
      status: 'playing' 
    }).eq('code', params.code)
    
    router.push(`/game/${params.code}?mode=${mode}&sub=${subMode}&lang=${lang}`)
  }

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-2xl space-y-6">
        <h2 className="text-xl font-black text-[#1A5319] text-center uppercase">Настройка правила</h2>
        <div className="flex p-1 bg-gray-100 rounded-2xl">
          <button onClick={() => setSubMode('hardcore')} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${subMode === 'hardcore' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>HARDCORE</button>
          <button onClick={() => setSubMode('assist')} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${subMode === 'assist' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>ASSIST</button>
        </div>
        <div className="relative">
          <textarea 
            value={rule} 
            onChange={(e) => setRule(e.target.value)} 
            className="w-full p-5 bg-gray-50 rounded-[22px] font-bold text-sm h-32 outline-none border-none resize-none" 
            placeholder={lang === 'RU' ? "Твое правило..." : "Your rule..."} 
          />
          <button onClick={suggest} disabled={isSuggesting} className={`absolute bottom-4 right-4 text-2xl transition-all ${isSuggesting ? 'animate-spin opacity-50' : 'hover:rotate-12 active:scale-90'}`}>
            {isSuggesting ? '⏳' : '🎲'}
          </button>
        </div>
        <button onClick={start} className="w-full bg-[#22C55E] text-white py-5 rounded-[22px] font-black uppercase shadow-xl active:scale-95 transition-all">ПОГНАЛИ 🚀</button>
      </div>
    </div>
  )
}