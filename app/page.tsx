'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

type LangCode = 'EN' | 'UA' | 'RU' | 'LV'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [lang, setLang] = useState<LangCode>('RU')
  const [isMulti, setIsMulti] = useState(false)
  const [multiMode, setMultiMode] = useState('manual')

  const translations: Record<LangCode, any> = {
    EN: { title: "PICNIC BUDDY", sub: "Smart AI camping game", name: "Name", start: "START", join: "JOIN", ok: "OK", code: "CODE", solo: "SOLO", multi: "MULTI" },
    UA: { title: "ПІКНІК БАДДІ", sub: "Розумна гра в похід з ШІ", name: "Ім'я", start: "ПОЧАТИ", join: "УВІЙТИ", ok: "ОК", code: "КОД", solo: "СОЛО", multi: "МУЛЬТІ" },
    RU: { title: "ПИКНИК БАДДИ", sub: "Умная игра в поход с ИИ", name: "ИМЯ", start: "НАЧАТЬ", join: "ВОЙТИ В ИГРУ", ok: "ОК", code: "КОД", solo: "соло", multi: "мульти" },
    LV: { title: "PIKNIKA BIEDRS", sub: "Gudra AI pārgājiena spēle", name: "Vārds", start: "SĀKT", join: "PIEVIENOTIES", ok: "OK", code: "KODS", solo: "SOLO", multi: "MULTI" }
  }
  const t = translations[lang]

  const handleStart = () => {
    if (!name) return alert(lang === 'RU' ? "Введите имя!" : "Enter name!")
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'true')
    
    const mode = isMulti ? multiMode : 'solo'
    if (mode === 'manual') {
      router.push(`/game/${newCode}/setup?mode=manual&lang=${lang}`)
    } else {
      router.push(`/game/${newCode}?mode=${mode}&lang=${lang}`)
    }
  }

  const handleJoin = () => {
    if (!name || !code) return alert(lang === 'RU' ? "Имя и код!" : "Name & Code!")
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'false')
    router.push(`/game/${code.toUpperCase()}?lang=${lang}`)
  }

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col items-center p-6 text-black relative overflow-hidden font-sans">
      
      {/* ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКОВ (ВОТ ОН, РОДНОЙ!) */}
      <div className="absolute top-6 right-6 flex gap-1 z-20">
        {(['EN', 'UA', 'RU', 'LV'] as LangCode[]).map(l => (
          <button 
            key={l} 
            onClick={() => setLang(l)} 
            className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all ${lang === l ? 'bg-black text-white border-black' : 'bg-white/50 border-gray-100'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 2, repeat: Infinity }} className="mt-12 mb-4">
        <span className="text-8xl drop-shadow-2xl">🧺</span>
      </motion.div>
      
      <h1 className="text-4xl font-black text-[#1A5319] mb-1">{t.title}</h1>
      <p className="text-xs font-bold text-[#71A87D] mb-12 opacity-80 uppercase tracking-widest">{t.sub}</p>

      <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-2xl space-y-6 z-10 relative">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-300 uppercase pl-4">{t.name}</label>
          <input onChange={(e) => setName(e.target.value)} placeholder="..." className="w-full p-5 rounded-[22px] bg-gray-50 border border-gray-100 font-bold outline-none focus:border-green-300" />
        </div>
        
        <div className="flex p-1.5 bg-gray-100 rounded-[22px] relative shadow-inner">
          <motion.div animate={{ x: isMulti ? '100%' : '0%' }} className="absolute inset-y-1.5 left-1.5 w-[calc(50%-3px)] bg-white rounded-[18px] shadow-sm z-0" />
          <button onClick={() => setIsMulti(false)} className={`flex-1 py-3 text-[10px] font-black uppercase z-10 ${!isMulti ? 'text-black' : 'text-gray-400'}`}>{t.solo}</button>
          <button onClick={() => setIsMulti(true)} className={`flex-1 py-3 text-[10px] font-black uppercase z-10 ${isMulti ? 'text-black' : 'text-gray-400'}`}>{t.multi}</button>
        </div>

        <AnimatePresence>
          {isMulti && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex gap-1 bg-gray-50 p-1 rounded-[22px]">
              <button onClick={() => setMultiMode('manual')} className={`flex-1 py-2 text-[9px] font-black rounded-xl ${multiMode === 'manual' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>MANUAL</button>
              <button onClick={() => setMultiMode('ai_host')} className={`flex-1 py-2 text-[9px] font-black rounded-xl ${multiMode === 'ai_host' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>AI HOST</button>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={handleStart} className="w-full bg-[#22C55E] text-white py-5 rounded-[22px] font-black text-sm shadow-xl active:scale-95 transition-all uppercase tracking-widest">{t.start}</button>

        <div className="relative py-2 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <span className="relative flex justify-center text-[9px] font-bold text-gray-200 uppercase bg-white px-4 tracking-widest">{t.join}</span>
        </div>

        <div className="flex gap-2">
          <input onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t.code} className="flex-1 p-5 rounded-[22px] bg-gray-50 border border-gray-100 font-bold outline-none" />
          <button onClick={handleJoin} className="px-6 rounded-[22px] bg-black text-white font-black text-xs uppercase">{t.ok}</button>
        </div>
      </div>

      <div className="mt-12 text-center opacity-30 z-10 scale-90">
        <div className="px-5 py-2.5 rounded-full bg-[#D1FADF] border border-[#A7F3D0]">
          <p className="text-[10px] font-black text-[#065F46] uppercase tracking-widest italic">MADE BY SOLO</p>
        </div>
      </div>
    </div>
  )
}