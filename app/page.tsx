'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion' 

export default function Home() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isSolo, setIsSolo] = useState(true) // Тогл: Solo или Multi
  const [multiMode, setMultiMode] = useState('ai_host') // Внутри мульти: ai_host, help, manual
  const router = useRouter()

  const handleCreateGame = () => {
    if (!name.trim()) return alert("Please enter your name!")
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    localStorage.setItem('picnic_player_name', name.trim())
    localStorage.setItem('picnic_is_host', 'true')
    
    // Формируем режим для передачи в URL
    const finalMode = isSolo ? 'solo' : multiMode
    router.push(`/game/${newCode}?mode=${finalMode}`)
  }

  const handleJoinGame = () => {
    if (!name.trim()) return alert("Enter name!")
    if (code.trim()) {
      localStorage.setItem('picnic_player_name', name.trim())
      localStorage.setItem('picnic_is_host', 'false')
      router.push(`/game/${code.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0FDF4] p-6 font-sans text-black relative overflow-hidden">
      {/* Елочки на фоне */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M20 10l-5 5h10l-5-5zm0-8l-7 7h14L20 2zm0 16l-3 3h6l-3-3z" fill="%3C/svg%3E")' }} />

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <motion.div className="text-7xl mb-6" animate={{ y: [0, -15, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}>🧺</motion.div>
          <h1 className="text-4xl font-black tracking-tight text-[#166534]">PICNIC BUDDY</h1>
          <p className="text-[#15803d] font-medium opacity-70 italic text-sm italic">"I'm going on a picnic and I'm bringing..."</p>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-2xl shadow-green-100/50 border border-green-50 space-y-6">
          {/* Поле Имени */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Identity</label>
            <input 
              placeholder="e.g. Solo Skywalker"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-green-500 font-bold placeholder:text-gray-300"
            />
          </div>

          {/* ТОГЛ: Solo vs Multi */}
          <div className="bg-gray-50 p-1 rounded-2xl flex relative">
            <motion.div 
              className="absolute bg-white shadow-md rounded-xl h-[85%] top-[7.5%]"
              initial={false}
              animate={{ x: isSolo ? '4%' : '104%', width: '46%' }}
            />
            <button onClick={() => setIsSolo(true)} className="flex-1 py-3 text-xs font-black z-10 transition-colors duration-300">SOLO</button>
            <button onClick={() => setIsSolo(false)} className="flex-1 py-3 text-xs font-black z-10 transition-colors duration-300">MULTI</button>
          </div>

          {/* ПОД-РЕЖИМЫ (только для Multi) */}
          <AnimatePresence>
            {!isSolo && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-2">Multiplayer Type</p>
                {[
                  { id: 'ai_host', name: 'AI Host', desc: 'AI filters everything for you' },
                  { id: 'help', name: 'AI Assistant', desc: 'You set rule, AI helps filter' },
                  { id: 'manual', name: 'Classic', desc: 'Pure human ✅/❌ control' }
                ].map((m) => (
                  <button key={m.id} onClick={() => setMultiMode(m.id)} className={`w-full p-3 rounded-xl border text-left transition-all ${multiMode === m.id ? 'bg-green-50 border-green-500' : 'bg-white border-gray-100'}`}>
                    <span className="block text-xs font-bold">{m.name}</span>
                    <span className="block text-[10px] text-gray-400">{m.desc}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={handleCreateGame} className="w-full bg-[#22C55E] text-white font-black py-5 rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition-all uppercase text-sm tracking-wider">
            Start {isSolo ? 'Solo Training' : 'Party Game'}
          </button>

          <div className="flex items-center py-2"><div className="flex-grow border-t border-gray-100"></div><span className="mx-4 text-[10px] font-black text-gray-300">JOIN ROOM</span><div className="flex-grow border-t border-gray-100"></div></div>

          <div className="flex gap-2">
            <input placeholder="e.g. XJ92L" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="flex-1 px-4 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-center font-bold" />
            <button onClick={handleJoinGame} className="bg-black text-white px-6 rounded-2xl font-black text-xs hover:bg-gray-800 transition-all">JOIN</button>
          </div>
        </div>

        <div className="text-center space-y-4">
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em]">Powered by Gemini AI • 2026</p>
          <div className="inline-block px-4 py-1.5 bg-green-100 rounded-full shadow-inner opacity-70">
            <span className="text-green-700 text-[10px] font-black tracking-widest">MADE BY SOLO</span>
          </div>
        </div>
      </div>
    </div>
  )
}