'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// Добавили Framer Motion для прыгающей корзины
import { motion } from 'framer-motion' 

export default function Home() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [aiMode, setAiMode] = useState(true) // По умолчанию Solo/AI режим включен
  const router = useRouter()

  const handleCreateGame = () => {
    if (!name.trim()) return alert("Please enter your name first!")
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    
    // Сохраняем имя и роль Host в localStorage
    localStorage.setItem('picnic_player_name', name.trim())
    localStorage.setItem('picnic_is_host', 'true')
    
    // Переходим в комнату, добавляем параметр ?mode=ai, если он включен
    const modeParam = aiMode ? '?mode=ai' : ''
    router.push(`/game/${newCode}${modeParam}`)
  }

  const handleJoinGame = () => {
    if (!name.trim()) return alert("Please enter your name!")
    if (code.trim()) {
      // Сохраняем имя и роль Guest в localStorage
      localStorage.setItem('picnic_player_name', name.trim())
      localStorage.setItem('picnic_is_host', 'false')
      // Переходим в комнату
      router.push(`/game/${code.trim().toUpperCase()}`)
    }
  }

  return (
    // Весь фон — светло-серый (как на фото 2)
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9FAFB] p-6 font-sans text-black">
      <div className="w-full max-w-sm space-y-8">
        
        {/* Заголовок с ПРЫГАЮЩЕЙ КОРЗИНОЙ 🧺 (из Фото 1) */}
        <div className="text-center space-y-2">
          {/* Анимация: bounce (прыжок) */}
          <motion.div 
            className="text-7xl mb-6"
            animate={{ y: [0, -15, 0] }} 
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
          >
            🧺
          </motion.div>
          <h1 className="text-4xl font-black tracking-tight">PICNIC BUDDY</h1>
          <p className="text-gray-400 font-medium">The ultimate AI picnic game</p>
        </div>

        {/* БЕЛЫЙ ПРЯМОУГОЛЬНИК КАРТОЧКИ (как на фото 2) */}
        <div className="bg-white p-8 rounded-[32px] shadow-2xl shadow-gray-200/50 space-y-6 border border-gray-100">
          
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

          {/* НОВОЕ: Переключатель SOLO/MULTI MODE */}
          <div className="flex items-center justify-between px-4">
             <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Game Mode</span>
             <div className="flex items-center gap-2">
               <span className={`text-xs font-bold ${!aiMode ? 'text-green-500' : 'text-gray-300'}`}>MULTI</span>
               {/* Тогл переключателя */}
               <button 
                 onClick={() => setAiMode(!aiMode)}
                 className={`w-10 h-6 flex items-center p-1 rounded-full transition-colors ${aiMode ? 'bg-black' : 'bg-gray-200'}`}
               >
                 <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${aiMode ? 'translate-x-4' : 'translate-x-0'}`}/>
               </button>
               <span className={`text-xs font-bold ${aiMode ? 'text-black' : 'text-gray-300'}`}>SOLO (AI Host)</span>
             </div>
          </div>

          <div className="h-[1px] bg-gray-50 w-full"></div>

          {/* Кнопка Создания (Зеленая, как на фото 2) */}
          <button 
            onClick={handleCreateGame} 
            className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-black py-5 rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition-all uppercase tracking-wide"
          >
            Create {aiMode ? 'Solo' : 'Multi'} Game
          </button>

          {/* Разделитель OR */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black text-gray-300 uppercase">Or join friend</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          {/* Поле Кода и кнопка Join (как на фото 2) */}
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

        {/* Футер: Made by SOLO! 🔥 */}
        <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em] relative">
          Powered by Gemini AI • 2026
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-black text-[10px] font-black px-4 py-1.5 bg-gray-100 rounded-full shadow-inner opacity-70">
             MADE BY SOLO
          </span>
        </p>
      </div>
    </div>
  )
}