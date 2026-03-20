'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion' 

export default function Home() {
  const [lang, setLang] = useState<'EN' | 'RU'>('RU')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [isSolo, setIsSolo] = useState(true)
  const [multiMode, setMultiMode] = useState('ai_host')
  const router = useRouter()

  const t = {
    EN: { title: 'PICNIC BUDDY', sub: 'The ultimate AI picnic game', name: 'Identity', namePl: 'e.g. Solo Skywalker', start: 'Start', join: 'JOIN ROOM', joinPl: 'e.g. XJ92L', solo: 'SOLO', multi: 'MULTI' },
    RU: { title: 'ПИКНИК БАДДИ', sub: 'Умная игра в поход с ИИ', name: 'Имя', namePl: 'напр. Соло Скайуокер', start: 'Начать', join: 'ВОЙТИ В ИГРУ', joinPl: 'КОД КОМНАТЫ', solo: 'СОЛО', multi: 'МУЛЬТИ' }
  }[lang]

  const handleCreate = () => {
    if (!name.trim()) return alert(lang === 'EN' ? "Enter name!" : "Введите имя!")
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    localStorage.setItem('picnic_player_name', name.trim())
    localStorage.setItem('picnic_is_host', 'true')
    
    const mode = isSolo ? 'solo' : multiMode
    router.push(isSolo ? `/game/${newCode}?mode=solo&lang=${lang}` : `/game/${newCode}/setup?mode=${mode}&lang=${lang}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0FDF4] p-6 font-sans text-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M20 10l-5 5h10l-5-5zm0-8l-7 7h14L20 2zm0 16l-3 3h6l-3-3z" fill="%3C/svg%3E")' }} />
      
      <button onClick={() => setLang(lang === 'EN' ? 'RU' : 'EN')} className="absolute top-6 right-6 bg-white px-3 py-1 rounded-full shadow-sm text-[10px] font-black border border-green-100 z-20">
        {lang === 'EN' ? '🇬🇧 EN' : '🇷🇺 RU'}
      </button>

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <motion.div className="text-7xl mb-6" animate={{ y: [0, -15, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}>🧺</motion.div>
          <h1 className="text-4xl font-black tracking-tight text-[#166534]">{t.title}</h1>
          <p className="text-[#15803d] font-medium opacity-70 text-sm italic">{t.sub}</p>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-2xl shadow-green-100/50 border border-green-50 space-y-6 text-black">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">{t.name}</label>
            <input placeholder={t.namePl} value={name} onChange={e => setName(e.target.value)} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-green-500 font-bold placeholder:text-gray-200" />
          </div>

          <div className="bg-gray-100 p-1 rounded-2xl flex relative h-12">
            <motion.div className="absolute bg-white shadow-sm rounded-xl h-[80%] top-[10%]" animate={{ x: isSolo ? '4%' : '104%', width: '46%' }} />
            <button onClick={() => setIsSolo(true)} className="flex-1 text-[10px] font-black z-10 transition-colors">{t.solo}</button>
            <button onClick={() => setIsSolo(false)} className="flex-1 text-[10px] font-black z-10 transition-colors">{t.multi}</button>
          </div>

          <AnimatePresence>
            {!isSolo && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
                {['ai_host', 'help', 'manual'].map(m => (
                  <button key={m} onClick={() => setMultiMode(m)} className={`w-full p-3 rounded-xl border text-left transition-all ${multiMode === m ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'bg-white border-gray-100'}`}>
                    <span className="block text-[10px] font-black uppercase">{m.replace('_', ' ')}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={handleCreate} className="w-full bg-[#22C55E] text-white font-black py-5 rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition-all uppercase text-sm tracking-widest">{t.start}</button>

          <div className="flex items-center py-2 text-gray-200"><div className="flex-grow border-t"></div><span className="mx-4 text-[10px] font-black tracking-widest text-gray-300">{t.join}</span><div className="flex-grow border-t"></div></div>

          <div className="flex gap-2">
            <input placeholder={t.joinPl} value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="flex-1 px-4 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-center font-bold" />
            <button onClick={() => router.push(`/game/${code.trim()}?lang=${lang}`)} className="bg-black text-white px-6 rounded-2xl font-black text-xs hover:bg-gray-800 active:scale-90 transition-all">OK</button>
          </div>
        </div>

        <div className="text-center space-y-4">
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em]">© 2026</p>
          <div className="inline-block px-4 py-1.5 bg-green-100 rounded-full"><span className="text-green-700 text-[10px] font-black tracking-widest uppercase italic">MADE BY SOLO</span></div>
        </div>
      </div>
    </div>
  )
}