'use client'
import { useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function SetupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = searchParams.get('lang') || 'EN'
  const [rule, setRule] = useState('')
  const [mode, setMode] = useState('manual')

  const handleStart = async () => {
    if (!rule) return alert("Write the rule!")
    
    // ПИШЕМ В БАЗУ: теперь и ИИ, и Гость смогут прочитать правило из таблицы rooms
    await supabase.from('rooms').upsert({ code, secret_rule: rule })
    localStorage.setItem(`picnic_rule_${code}`, rule)
    
    router.push(`/game/${code}?mode=${mode}&lang=${lang}`)
  }

  return (
    <div className="h-screen bg-white flex flex-col p-8 items-center justify-center text-black">
      <h2 className="text-2xl font-black italic uppercase mb-6 tracking-tighter">Set the Logic</h2>
      <textarea 
        onChange={(e) => setRule(e.target.value)}
        placeholder="Example: Only things starting with 'A'..."
        className="w-full max-w-xs h-32 p-6 rounded-[30px] bg-gray-50 border-none font-bold text-sm outline-none mb-6 focus:ring-2 ring-black transition-all"
      />
      <div className="grid grid-cols-2 gap-2 mb-8 w-full max-w-xs">
        {['manual', 'ai_host', 'help', 'solo'].map(m => (
          <button key={m} onClick={() => setMode(m)} className={`py-4 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${mode === m ? 'bg-black text-white border-black shadow-lg' : 'border-gray-100 text-gray-300'}`}>
            {m.replace('_', ' ')}
          </button>
        ))}
      </div>
      <button onClick={handleStart} className="w-full max-w-xs bg-[#22C55E] text-white py-6 rounded-[30px] font-black shadow-xl">
        START 🧺
      </button>
    </div>
  )
}