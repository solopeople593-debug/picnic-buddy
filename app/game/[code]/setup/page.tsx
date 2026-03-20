'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function SetupPage({ params }: { params: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rule, setRule] = useState('')
  const [subMode, setSubMode] = useState('hardcore')
  const [isSuggesting, setIsSuggesting] = useState(false)

  const suggest = async () => {
    setIsSuggesting(true)
    const res = await fetch('/api/suggest')
    const data = await res.json()
    setRule(data.suggestion)
    setIsSuggesting(false)
  }

  const start = async () => {
    if (!rule) return alert("Введите правило!")
    await supabase.from('rooms').insert([{ code: params.code, secret_rule: rule, sub_mode: subMode, status: 'playing' }])
    router.push(`/game/${params.code}?mode=manual&sub=${subMode}`)
  }

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-2xl space-y-6">
        <h2 className="text-xl font-black text-[#1A5319] text-center uppercase">Настройка правила</h2>
        <div className="flex p-1 bg-gray-100 rounded-2xl">
          <button onClick={() => setSubMode('hardcore')} className={`flex-1 py-2 text-[10px] font-black rounded-xl ${subMode === 'hardcore' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>HARDCORE</button>
          <button onClick={() => setSubMode('assist')} className={`flex-1 py-2 text-[10px] font-black rounded-xl ${subMode === 'assist' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>ASSIST</button>
        </div>
        <div className="relative">
          <textarea value={rule} onChange={(e) => setRule(e.target.value)} className="w-full p-5 bg-gray-50 rounded-[22px] font-bold text-sm h-32 outline-none border-none" placeholder="Твое правило..." />
          <button onClick={suggest} className="absolute bottom-4 right-4 text-2xl">{isSuggesting ? '⏳' : '🎲'}</button>
        </div>
        <button onClick={start} className="w-full bg-[#22C55E] text-white py-5 rounded-[22px] font-black uppercase shadow-xl">ПОГНАЛИ</button>
      </div>
    </div>
  )
}