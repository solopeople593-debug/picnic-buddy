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
    
    // Переход в папку game/[code]
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 font-sans text-black">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-4xl font-black text-center mb-10">🧺 PICNIC BUDDY</h1>
        
        <input 
          placeholder="YOUR NAME"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-6 py-4 bg-gray-100 rounded-2xl outline-none focus:ring-2 ring-black text-center font-bold"
        />

        <div className="h-[1px] bg-gray-100 w-full my-4"></div>

        <button onClick={handleCreateGame} className="w-full bg-green-500 text-white font-bold py-5 rounded-2xl shadow-lg active:scale-95 transition-all">
          CREATE NEW GAME
        </button>

        <div className="flex items-center gap-2">
          <input 
            placeholder="CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="flex-1 px-4 py-4 bg-gray-100 rounded-2xl outline-none font-mono text-center"
          />
          <button onClick={handleJoinGame} className="bg-black text-white px-8 py-4 rounded-2xl font-bold active:scale-95 transition-all">
            JOIN
          </button>
        </div>
      </div>
    </div>
  )
}