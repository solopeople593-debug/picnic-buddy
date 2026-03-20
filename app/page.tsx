'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [lang, setLang] = useState<'RU' | 'EN' | 'UA' | 'LV'>('RU')
  const [isMulti, setIsMulti] = useState(false)
  const [multiMode, setMultiMode] = useState<'manual' | 'ai_host'>('manual')

  const t: any = {
    RU: { title: "ПИКНИК БАДДИ", name: "ВАШЕ ИМЯ", solo: "СОЛО", multi: "МУЛЬТИ", start: "НАЧАТЬ", code: "КОД", join: "ВОЙТИ" },
    EN: { title: "PICNIC BUDDY", name: "YOUR NAME", solo: "SOLO", multi: "MULTI", start: "START", code: "CODE", join: "JOIN" },
    UA: { title: "ПІКНІК БАДДІ", name: "ВАШЕ ІМ'Я", solo: "СОЛО", multi: "МУЛЬТІ", start: "ПОЧАТИ", code: "КОД", join: "УВІЙТИ" },
    LV: { title: "PIKNIKA BIEDRS", name: "TAVS VĀRDS", solo: "SOLO", multi: "MULTI", start: "SĀKT", code: "KODS", join: "PIEVIENOTIES" }
  }[lang]

  const handleStart = async () => {
    if (!name.trim()) return alert(lang === 'RU' ? "Введите имя!" : "Enter name!")
    
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'true')
    
    const { error } = await supabase.from('rooms').insert([{ 
      code: newCode, 
      status: 'setup'
    }])
    if (error) return alert("DB Error: " + error.message)

    // И соло, и мульти — оба идут через setup
    const mode = isMulti ? multiMode : 'solo'
    router.push(`/game/${newCode}/setup?mode=${mode}&lang=${lang}`)
  }

  const handleJoin = async () => {
    if (!name || !code) return alert("Name & Code!")
    const cleanCode = code.trim().toUpperCase()
    const { data } = await supabase.from('rooms').select('*').eq('code', cleanCode).single()
    if (!data) return alert("Room not found!")
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'false')
    router.push(`/game/${cleanCode}?lang=${lang}`)
  }

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col items-center justify-center p-6 text-black font-sans relative overflow-hidden">
      <div className="absolute top-6 right-6 flex gap-1 z-50">
        {(['EN', 'UA', 'RU', 'LV'] as const).map(l => (
          <button key={l} onClick={() => setLang(l)} className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${lang === l ? 'bg-black text-white' : 'bg-white border border-gray-100 shadow-sm'}`}>{l}</button>
        ))}
      </div>

      <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="text-7xl mb-4">🧺</motion.div>
      <h1 className="text-4xl font-black text-[#1A5319] mb-8 tracking-tighter">{t.title}</h1>

      <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-2xl space-y-4 border border-green-50/50 text-center">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} className="w-full p-5 rounded-[22px] bg-gray-50 border-none outline-none font-bold focus:ring-2 ring-green-300 transition-all uppercase text-sm" />
        
        <div className="flex p-1.5 bg-gray-100 rounded-[22px]">
          <button onClick={() => setIsMulti(false)} className={`flex-1 py-3 text-[10px] font-black rounded-[18px] transition-all ${!isMulti ? 'bg-white shadow-md' : 'opacity-50'}`}>{t.solo}</button>
          <button onClick={() => setIsMulti(true)} className={`flex-1 py-3 text-[10px] font-black rounded-[18px] transition-all ${isMulti ? 'bg-white shadow-md' : 'opacity-50'}`}>{t.multi}</button>
        </div>

        <AnimatePresence>
          {isMulti && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex gap-1 bg-gray-50 p-1 rounded-xl overflow-hidden">
              <button onClick={() => setMultiMode('manual')} className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${multiMode === 'manual' ? 'bg-black text-white' : 'opacity-40'}`}>MANUAL</button>
              <button onClick={() => setMultiMode('ai_host')} className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${multiMode === 'ai_host' ? 'bg-black text-white' : 'opacity-40'}`}>AI HOST</button>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={handleStart} className="w-full bg-[#22C55E] text-white py-5 rounded-[22px] font-black shadow-xl shadow-green-200 active:scale-95 transition-all uppercase text-xs tracking-widest">{t.start}</button>
        
        <div className="flex gap-2 pt-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t.code} className="flex-1 p-4 rounded-[20px] bg-gray-50 border-none outline-none font-bold uppercase text-xs focus:ring-2 ring-gray-200" />
          <button onClick={handleJoin} className="px-8 rounded-[20px] bg-black text-white font-black text-[10px] uppercase active:scale-95 transition-all">{t.join}</button>
        </div>
      </div>
      <p className="mt-12 text-[10px] font-black opacity-20 uppercase italic tracking-[0.4em]">MADE BY SOLO</p>
    </div>
  )
}