'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('RU')
  const [isMulti, setIsMulti] = useState(false)
  const [multiMode, setMultiMode] = useState('manual')

  const handleStart = async () => {
    if (!name) return alert("Введите имя!")
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'true')
    
    // ВАЖНО: Сначала создаем запись в БД
    const { error } = await supabase.from('rooms').insert([{ 
      code: newCode, 
      status: 'setup', 
      sub_mode: multiMode 
    }])

    if (error) return alert("Ошибка базы данных")

    if (isMulti && multiMode === 'manual') {
      router.push(`/game/${newCode}/setup?mode=manual&lang=${lang}`)
    } else {
      router.push(`/game/${newCode}?mode=${isMulti ? 'ai_host' : 'solo'}&lang=${lang}`)
    }
  }

  const handleJoin = async () => {
    if (!name || !code) return alert("Имя и код!")
    const cleanCode = code.trim().toUpperCase()
    const { data } = await supabase.from('rooms').select('*').eq('code', cleanCode).single()
    
    if (!data) return alert("Комната не найдена!")
    
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'false')
    router.push(`/game/${cleanCode}?lang=${lang}`)
  }

  return (
    <div className="h-screen bg-[#F0FFF4] flex flex-col items-center justify-center p-6 text-black font-sans relative">
        {/* Выбор языка */}
        <div className="absolute top-6 right-6 flex gap-1">
            {['EN', 'UA', 'RU', 'LV'].map(l => (
            <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 rounded text-[9px] font-bold ${lang === l ? 'bg-black text-white' : 'bg-white border'}`}>{l}</button>
            ))}
        </div>

        <h1 className="text-4xl font-black text-[#1A5319] mb-8">ПИКНИК БАДДИ</h1>

        <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-2xl space-y-4">
            <input onChange={(e) => setName(e.target.value)} placeholder="ВАШЕ ИМЯ" className="w-full p-4 rounded-2xl bg-gray-50 border outline-none font-bold" />
            
            <div className="flex p-1 bg-gray-100 rounded-2xl">
                <button onClick={() => setIsMulti(false)} className={`flex-1 py-2 text-[10px] font-black rounded-xl ${!isMulti ? 'bg-white shadow-sm' : ''}`}>СОЛО</button>
                <button onClick={() => setIsMulti(true)} className={`flex-1 py-2 text-[10px] font-black rounded-xl ${isMulti ? 'bg-white shadow-sm' : ''}`}>МУЛЬТИ</button>
            </div>

            {isMulti && (
                <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                    <button onClick={() => setMultiMode('manual')} className={`flex-1 py-2 text-[9px] font-black rounded-lg ${multiMode === 'manual' ? 'bg-black text-white' : ''}`}>MANUAL</button>
                    <button onClick={() => setMultiMode('ai_host')} className={`flex-1 py-2 text-[9px] font-black rounded-lg ${multiMode === 'ai_host' ? 'bg-black text-white' : ''}`}>AI HOST</button>
                </div>
            )}

            <button onClick={handleStart} className="w-full bg-[#22C55E] text-white py-4 rounded-2xl font-black shadow-lg">НАЧАТЬ</button>
            
            <div className="flex gap-2">
                <input onChange={(e) => setCode(e.target.value)} placeholder="КОД" className="flex-1 p-4 rounded-2xl bg-gray-50 border outline-none font-bold uppercase" />
                <button onClick={handleJoin} className="px-6 rounded-2xl bg-black text-white font-black text-[10px]">ВОЙТИ</button>
            </div>
        </div>
        <p className="mt-8 text-[10px] font-black opacity-20 uppercase italic">MADE BY SOLO</p>
    </div>
  )
}