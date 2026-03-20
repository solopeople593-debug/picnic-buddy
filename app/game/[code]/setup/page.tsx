'use client'
import { useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const IDEAS = ["Red items", "Things that start with 'S'", "Items smaller than a cat", "Things you can eat", "Double letters (Apple)", "Something for a beach"]

export default function SetupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const mode = useSearchParams().get('mode')
  const router = useRouter()
  
  const [concept, setConcept] = useState('')
  const [firstItem, setFirstItem] = useState('')

  const rollDice = () => {
    const random = IDEAS[Math.floor(Math.random() * IDEAS.length)]
    setConcept(random)
  }

  const start = () => {
    if (!concept || !firstItem) return alert("Fill everything!")
    localStorage.setItem(`rule_${code}`, concept)
    router.push(`/game/${code}?mode=${mode}&initial=${firstItem}`)
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center p-6 text-black">
      <div className="bg-white p-8 rounded-[32px] shadow-xl w-full max-w-sm space-y-6">
        <h2 className="text-2xl font-black text-center text-green-800 tracking-tight uppercase">Setup Room</h2>
        
        <div className="space-y-4">
          <div className="relative">
            <label className="text-[10px] font-black text-gray-400 ml-2 uppercase">Secret Rule</label>
            <input placeholder="e.g. Only round things" value={concept} onChange={e => setConcept(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 ring-green-500 font-bold" />
            <button onClick={rollDice} className="absolute right-4 bottom-4 text-xl hover:rotate-12 transition-transform">🎲</button>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 ml-2 uppercase">Starter Item</label>
            <input placeholder="e.g. Ball" value={firstItem} onChange={e => setFirstItem(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 ring-green-500 font-bold" />
          </div>
        </div>

        <button onClick={start} className="w-full bg-black text-white font-black py-5 rounded-2xl shadow-lg active:scale-95 transition-all">START PICNIC 🧺</button>
      </div>
    </div>
  )
}