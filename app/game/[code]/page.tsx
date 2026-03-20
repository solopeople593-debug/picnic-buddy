'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [code, setCode] = useState('')
  const router = useRouter()

  // Функция для создания новой игры
  const handleCreateGame = () => {
    // Генерируем случайный код из 5 символов
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    
    // Сохраняем, что мы Хост
    localStorage.setItem('picnic_is_host', 'true')
    
    // ВАЖНО: Переходим по прямому пути /game/КОД
    router.push(`/game/${newCode}`)
  }

  // Функция для входа в существующую игру
  const handleJoinGame = () => {
    if (code.trim()) {
      localStorage.setItem('picnic_is_host', 'false')
      // ВАЖНО: Переходим по прямому пути /game/КОД
      router.push(`/game/${code.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white text-black p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">🧺 Picnic Buddy</h1>
      
      <div className="space-y-4 w-full max-w-xs">
        <button 
          onClick={handleCreateGame}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg"
        >
          Create New Game
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <input 
          type="text"
          placeholder="Enter Room Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full px-6 py-4 bg-gray-100 rounded-2xl outline-none focus:ring-2 ring-black text-center font-mono text-xl uppercase"
        />
        
        <button 
          onClick={handleJoinGame}
          className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-all"
        >
          Join Game
        </button>
      </div>
    </div>
  )
}