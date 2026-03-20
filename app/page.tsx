'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('RU')
  const [isMulti, setIsMulti] = useState(false)
  const [multiMode, setMultiMode] = useState('manual')

  const t: any = {
    RU: { title: "ПИКНИК БАДДИ", sub: "Умная игра в поход с ИИ", name: "ИМЯ", start: "НАЧАТЬ", join: "ВОЙТИ", code: "КОД", solo: "СОЛО", multi: "МУЛЬТИ" },
    EN: { title: "PICNIC BUDDY", sub: "AI Camping Game", name: "NAME", start: "START", join: "JOIN", code: "CODE", solo: "SOLO", multi: "MULTI" },
    UA: { title: "ПІКНІК БАДДІ", sub: "Гра в похід з ШІ", name: "ІМ'Я", start: "ПОЧАТИ", join: "УВІЙТИ", code: "КОД", solo: "СОЛО", multi: "МУЛЬТІ" },
    LV: { title: "PIKNIKA BIEDRS", sub: "AI pārgājiena spēle", name: "VĀRDS", start: "SĀKT", join: "PIEVIENOTIES", code: "KODS", solo: "SOLO", multi: "MULTI" }
  }[lang]

  const handleStart = async () => {
    if (!name) return alert("Введите имя!")
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'true')
    
    // Создаем комнату в базе сразу
    await supabase.from('rooms').insert([{ code: newCode, status: 'setup', sub_mode: multiMode }])

    if (isMulti && multiMode === 'manual') {
      router.push(`/game/${newCode}/setup?mode=manual&lang=${lang}`)
    } else {
      router.push(`/game/${newCode}?mode=${isMulti ? 'ai_host' : 'solo'}&lang=${lang}`)
    }
  }

  const handleJoin = async () => {
    if (!name || !code) return alert("Имя и код!")
    const { data } = await supabase.from('rooms').select('*').eq('code', code.toUpperCase()).single()
    if (!data) return alert("Комната не найдена!")
    
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'false')
    router.push(`/game/${code.toUpperCase()}?lang=${lang}`)
  }

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col items-center p-6 text-black relative font-sans overflow-hidden">
      <div className="absolute top-6 right-6 flex gap-1 z-20">
        {['EN', 'UA', 'RU', 'LV'].map(l => (
          <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 rounded text-[9px] font-bold ${lang === l ? 'bg-black text-white' : 'bg-white border'}`}>{l}</button>
        ))}
      </div>
      <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 2, repeat: Infinity }} className="mt-12 mb-4 text-8xl">🧺</motion.div>
      <h1 className="text-4xl font-black text-[#1A5319]">{t.title}</h1>
      <p className="text-[10px] font-bold text-[#71A87D] mb-10 tracking-[0.2em]">{t.sub}</p>

      <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-2xl space-y-5 z-10">
        <input onChange={(e) => setName(e.target.value)} placeholder={t.name} className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold outline-none" />
        <div className="flex p-1 bg-gray-100 rounded-2xl relative">
          <motion.div animate={{ x: isMulti ? '100%' : '0%' }} className="absolute inset-y-1 left-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm" />
          <button onClick={() => setIsMulti(false)} className="flex-1 py-2 text-[10px] font-black z-10">{t.solo}</button>
          <button onClick={() => setIsMulti(true)} className="flex-1 py-2 text-[10px] font-black z-10">{t.multi}</button>
        </div>
        <AnimatePresence>
          {isMulti && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-1 bg-gray-50 p-1 rounded-xl">
              <button onClick={() => setMultiMode('manual')} className={`flex-1 py-2 text-[9px] font-black rounded-lg ${multiMode === 'manual' ? 'bg-black text-white' : ''}`}>MANUAL</button>
              <button onClick={() => setMultiMode('ai_host')} className={`flex-1 py-2 text-[9px] font-black rounded-lg ${multiMode === 'ai_host' ? 'bg-black text-white' : ''}`}>AI HOST</button>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={handleStart} className="w-full bg-[#22C55E] text-white py-4 rounded-2xl font-black shadow-lg">{t.start}</button>
        <div className="flex gap-2">
          <input onChange={(e) => setCode(e.target.value)} placeholder={t.code} className="flex-1 p-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold outline-none uppercase" />
          <button onClick={handleJoin} className="px-6 rounded-2xl bg-black text-white font-black text-[10px]">{t.join}</button>
        </div>
      </div>
      <p className="mt-8 text-[10px] font-black opacity-20 uppercase tracking-widest italic">MADE BY SOLO</p>
    </div>
  )
}