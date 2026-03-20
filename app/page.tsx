'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('EN')

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('')
  }

  const startNewGame = () => {
    if (!name) return alert("Enter name!")
    const newCode = generateCode()
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'true')
    router.push(`/game/${newCode}/setup?lang=${lang}`)
  }

  const joinGame = () => {
    if (!name || !code) return alert("Enter name and code!")
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'false')
    router.push(`/game/${code.toUpperCase()}?lang=${lang}`)
  }

  return (
    <div className="h-screen bg-white flex flex-col items-center justify-center p-6 text-black font-sans">
      <h1 className="text-7xl font-black italic tracking-tighter mb-2 italic">PICNIC</h1>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-12 opacity-20 text-center">The Secret Logic Game</p>

      <div className="w-full max-w-xs space-y-4">
        <input 
          onChange={(e) => setName(e.target.value)}
          placeholder="YOUR NAME" 
          className="w-full p-6 rounded-[30px] border-2 border-gray-50 bg-gray-50/30 font-black uppercase text-center outline-none focus:border-black transition-all"
        />
        
        <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl">
          {['EN', 'UA', 'RU', 'LV'].map(l => (
            <button key={l} onClick={() => setLang(l)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${lang === l ? 'bg-white text-black shadow-sm' : 'text-gray-300'}`}>
              {l}
            </button>
          ))}
        </div>

        <button onClick={startNewGame} className="w-full bg-[#22C55E] text-white py-6 rounded-[30px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-green-100 active:scale-95 transition-all">
          CREATE PICNIC 🧺
        </button>

        <div className="relative py-4 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <span className="relative flex justify-center text-[9px] font-black text-gray-200 uppercase bg-white px-4 tracking-[0.2em]">OR JOIN FRIEND</span>
        </div>

        <div className="space-y-3">
          <input 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE" 
            className="w-full p-6 rounded-[30px] border-2 border-gray-50 bg-gray-50/30 font-black uppercase text-center outline-none focus:border-black transition-all"
          />
          <button onClick={joinGame} className="w-full bg-black text-white py-6 rounded-[30px] font-black text-sm uppercase tracking-widest active:scale-95 transition-all">
            JOIN ⚡️
          </button>
        </div>
      </div>
    </div>
  )
}