'use client'
import { useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const IDEAS = {
  EN: ["Red items", "Starts with 'S'", "Smaller than a cat", "Round objects", "Items you find in a kitchen"],
  RU: ["Красные предметы", "Слова на букву 'С'", "Предметы меньше кошки", "Круглые вещи", "То, что есть на кухне"]
}

export default function SetupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const lang = (searchParams.get('lang') || 'RU') as 'EN' | 'RU'
  const router = useRouter()
  
  const [concept, setConcept] = useState('')

  const t = {
    EN: { title: 'SETUP ROOM', label: 'Secret Rule', dice: '🎲 IDEA', button: 'START PICNIC', ai_desc: 'AI will create a secret rule for everyone. You play as a guest!' },
    RU: { title: 'НАСТРОЙКА', label: 'Секретное правило', dice: '🎲 ИДЕЯ', button: 'НАЧАТЬ ИГРУ', ai_desc: 'ИИ сам придумает правило для всех. Ты играешь как гость!' }
  }[lang]

  const rollDice = () => {
    const list = IDEAS[lang]
    setConcept(list[Math.floor(Math.random() * list.length)])
  }

  const start = () => {
    if (mode !== 'ai_host' && !concept) return alert(lang === 'RU' ? "Введите правило!" : "Enter rule!")
    localStorage.setItem(`picnic_rule_${code}`, mode === 'ai_host' ? 'AI_GENERATED' : concept)
    router.push(`/game/${code}?mode=${mode}&lang=${lang}`)
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center p-6 text-black relative">
      <div className="bg-white p-8 rounded-[32px] shadow-xl w-full max-w-sm space-y-6 border border-green-50">
        <h2 className="text-2xl font-black text-center text-green-800 tracking-tighter uppercase">{t.title}</h2>
        
        {mode === 'ai_host' ? (
          <div className="p-8 bg-green-50 rounded-[24px] border-2 border-dashed border-green-200 text-center">
            <p className="text-sm font-bold text-green-700 italic leading-relaxed">{t.ai_desc}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <label className="text-[10px] font-black text-gray-400 ml-4 uppercase tracking-widest">{t.label}</label>
              <input placeholder="..." value={concept} onChange={e => setConcept(e.target.value)} className="w-full p-5 bg-gray-50 rounded-[20px] outline-none focus:ring-2 ring-green-500 font-bold" />
              <button onClick={rollDice} className="absolute right-4 bottom-4 text-2xl hover:rotate-12 transition-transform active:scale-90">🎲</button>
            </div>
          </div>
        )}

        <button onClick={start} className="w-full bg-black text-white font-black py-5 rounded-[20px] shadow-lg active:scale-95 transition-all uppercase tracking-widest text-sm">{t.button}</button>
      </div>
    </div>
  )
}