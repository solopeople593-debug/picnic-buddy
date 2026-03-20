'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const router = useRouter()

  const handleCreateGame = () => {
    if (!name.trim()) return alert("Please enter your name first!")
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    localStorage.setItem('picnic_player_name', name.trim())
    localStorage.setItem('picnic_is_host', 'true')
    router.push(`/game/${newCode}`)
  }

  const handleJoinGame = () => {
    if (!name.trim()) return alert("Please enter your name!")
    if (code.trim()) {
      localStorage.setItem('picnic_player_name', name.trim())
      localStorage.setItem('picnic_is_host', 'false')
      router.push(`/game/${code.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9FAFB] text-[#111827] p-6 font-sans">
      <div className="w-full max-w-sm space-y-8">
        
        {/* Лого и Заголовок */}
        <div className="text-center space-y-2">
          <div className="text-6xl mb-4 animate-bounce">🧺</div>
          <h1 className="text-4xl font-black tracking-tighter">PICNIC BUDDY</h1>
          <p className="text-gray-400 font-medium">The ultimate AI picnic game</p>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-gray-200/50 space-y-6 border border-gray-100">
          {/* Поле Имени */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Your Identity</label>
            <input 
              placeholder="ENTER YOUR NAME"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-green-500 transition-all font-bold placeholder:text-gray-300"
            />
          </div>

          <div className="h-[1px] bg-gray-50 w-full"></div>

          {/* Кнопка Создания */}
          <button 
            onClick={handleCreateGame} 
            className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-black py-5 rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition-all uppercase tracking-wide"
          >
            Create New Game
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black text-gray-300 uppercase">Or join friend</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          {/* Поле Кода и кнопка Join */}
          <div className="flex flex-col gap-3">
            <input 
              placeholder="ROOM CODE"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-black font-mono text-center text-lg font-bold placeholder:text-gray-300"
            />
            <button 
              onClick={handleJoinGame} 
              className="w-full bg-black text-white font-black py-5 rounded-2xl hover:bg-gray-800 active:scale-95 transition-all uppercase tracking-wide"
            >
              Join
            </button>
          </div>
        </div>

        {/* Футер */}
        <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em]">
          Powered by Gemini AI • 2026
        </p>
      </div>
    </div>
  )
}