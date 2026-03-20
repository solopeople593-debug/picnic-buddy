'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('RU')
  const [isMulti, setIsMulti] = useState(false)
  const [multiMode, setMultiMode] = useState('manual')

  const handleStart = () => {
    if (!name) return alert("Введите имя!")
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'true')
    
    const mode = isMulti ? multiMode : 'solo'
    // Прямой переход: Соло/ИИ-Хост сразу в игру, Мануал в сетап
    if (mode === 'manual') {
      router.push(`/game/${newCode}/setup?mode=manual&lang=${lang}`)
    } else {
      router.push(`/game/${newCode}?mode=${mode}&lang=${lang}`)
    }
  }

  const handleJoin = () => {
    if (!name || !code) return alert("Имя и код!")
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'false')
    router.push(`/game/${code.toUpperCase()}?lang=${lang}`)
  }

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col items-center p-6 text-black relative overflow-hidden font-sans">
      <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 2, repeat: Infinity }} className="mt-12 mb-4">
        <span className="text-8xl drop-shadow-2xl">🧺</span>
      </motion.div>
      <h1 className="text-4xl font-black text-[#1A5319] mb-1">ПИКНИК БАДДИ</h1>
      <p className="text-xs font-bold text-[#71A87D] mb-12 opacity-80 uppercase tracking-widest">Smart AI camping game</p>

      <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-2xl space-y-6 z-10">
        <input onChange={(e) => setName(e.target.value)} placeholder="ТВОЕ ИМЯ" className="w-full p-5 rounded-[22px] bg-gray-50 border border-gray-100 font-bold outline-none" />
        
        <div className="flex p-1.5 bg-gray-100 rounded-[22px] relative">
          <motion.div animate={{ x: isMulti ? '100%' : '0%' }} className="absolute inset-y-1.5 left-1.5 w-[calc(50%-3px)] bg-white rounded-[18px] shadow-sm z-0" />
          <button onClick={() => setIsMulti(false)} className={`flex-1 py-3 text-[10px] font-black uppercase z-10 ${!isMulti ? 'text-black' : 'text-gray-400'}`}>СОЛО</button>
          <button onClick={() => setIsMulti(true)} className={`flex-1 py-3 text-[10px] font-black uppercase z-10 ${isMulti ? 'text-black' : 'text-gray-400'}`}>МУЛЬТИ</button>
        </div>

        <AnimatePresence>
          {isMulti && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex gap-1 bg-gray-50 p-1 rounded-[22px]">
              <button onClick={() => setMultiMode('manual')} className={`flex-1 py-2 text-[9px] font-black rounded-xl ${multiMode === 'manual' ? 'bg-black text-white' : 'text-gray-400'}`}>MANUAL</button>
              <button onClick={() => setMultiMode('ai_host')} className={`flex-1 py-2 text-[9px] font-black rounded-xl ${multiMode === 'ai_host' ? 'bg-black text-white' : 'text-gray-400'}`}>AI HOST</button>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={handleStart} className="w-full bg-[#22C55E] text-white py-5 rounded-[22px] font-black text-sm shadow-xl active:scale-95 transition-all">НАЧАТЬ 🚀</button>

        <div className="flex gap-2">
          <input onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="КОД" className="flex-1 p-5 rounded-[22px] bg-gray-50 border border-gray-100 font-bold outline-none" />
          <button onClick={handleJoin} className="px-6 rounded-[22px] bg-black text-white font-black text-xs">OK</button>
        </div>
      </div>
    </div>
  )
}