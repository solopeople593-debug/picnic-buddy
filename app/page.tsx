'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

// Типизация языков для TS (чтобы не было ошибок индексации)
type LangCode = 'EN' | 'UA' | 'RU' | 'LV'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [lang, setLang] = useState<LangCode>('RU')
  const [isMulti, setIsMulti] = useState(false)
  const [multiMode, setMultiMode] = useState('manual')

  // СИСТЕМА ПЕРЕВОДОВ (верный текст для старого дизайна)
  const translations: Record<LangCode, any> = {
    EN: { title: "PICNIC BUDDY", sub: "Smart AI camping game", name: "Name", start: "START", join: "JOIN GAME", ok: "OK", code: "Room Code", solo: "SOLO", multi: "MULTI", mp_title: "MP MODE" },
    UA: { title: "ПІКНІК БАДДІ", sub: "Розумна гра в похід з ШІ", name: "Ім'я", start: "ПОЧАТИ", join: "УВІЙТИ В ГРУ", ok: "ОК", code: "Код кімнати", solo: "СОЛО", multi: "МУЛЬТІ", mp_title: "МП РЕЖИМ" },
    RU: { title: "ПИКНИК БАДДИ", sub: "Умная игра в поход с ИИ", name: "Имя", start: "НАЧАТЬ", join: "ВОЙТИ В ИГРУ", ok: "ОК", code: "КОД КОМНАТЫ", solo: "соло", multi: "мульти", mp_title: "МП РЕЖИМ" },
    LV: { title: "PIKNIKA BIEDRS", sub: "Gudra AI pārgājiena spēle", name: "Vārds", start: "SĀKT", join: "PIEVIENOTIES", ok: "OK", code: "Istabas kods", solo: "SOLO", multi: "MULTI", mp_title: "MP REŽĪMS" }
  }
  const t = translations[lang] || translations.RU

  // ГЕНЕРАЦИЯ: Только латиница, под капотом (RX51T)
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('')
  }

  const handleCreateGame = () => {
    if (!name) return alert(lang === 'RU' ? "Введите имя!" : "Enter name!")
    const newCode = generateCode()
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'true')
    // Определяем режим на основе переключателей
    const mode = isMulti ? multiMode : 'solo'
    // Идем на сетап правила
    router.push(`/game/${newCode}/setup?mode=${mode}&lang=${lang}`)
  }

  const handleJoinGame = () => {
    if (!name || !code) return alert(lang === 'RU' ? "Имя и код!" : "Name & Code!")
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'false')
    router.push(`/game/${code.toUpperCase()}?lang=${lang}`)
  }

  return (
    // ВОЗВРАЩАЕМ НЕЖНО-ЗЕЛЕНЫЙ ФОН
    <div className="h-screen bg-[#F0FFF4] flex flex-col items-center p-6 text-black font-sans relative overflow-hidden">
      
      {/* Селектор языков (аккуратный, в старом стиле) */}
      <div className="absolute top-6 right-6 flex gap-1 z-20">
        {(['EN', 'UA', 'RU', 'LV'] as LangCode[]).map(l => (
          <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all ${lang === l ? 'bg-black text-white border-black' : 'bg-white/50 border-gray-100'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* 1. КОРЗИНКА (ЭМОДЗИ) - ОНА ПРЫГАЕТ! */}
      <motion.div 
        className="mt-12 mb-6"
        animate={{ y: [0, -10, 0], scale: [1, 1.05, 1] }} 
        transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
      >
        <div className="text-8xl drop-shadow-xl">🧺</div>
      </motion.div>

      {/* 2. ЗАГОЛОВОК (Зеленый, жирный) */}
      <h1 className="text-4xl font-extrabold text-[#1A5319] tracking-tighter mb-1 uppercase text-center">{t.title}</h1>
      <p className="text-xs font-medium text-[#71A87D] mb-12 text-center">{t.sub}</p>

      {/* Белая карточка (как на скрине 1) */}
      <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-2xl shadow-green-50/50 space-y-6 z-10 relative">
        
        {/* Поле имени */}
        <div className="space-y-1.5 animate-fade-in">
          <label className="text-[10px] font-bold text-gray-300 uppercase pl-4">{t.name}</label>
          <input 
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === 'RU' ? "напр. Соло Скайуокер" : "e.g. Solo Skywalker"} 
            className="w-full p-5 rounded-[20px] bg-gray-50 border border-gray-100 font-semibold text-sm outline-none focus:border-green-300 transition-all placeholder:text-gray-200"
          />
        </div>

        {/* 3. СЕЛЕКТОР СОЛО/МУЛЬТИ (image_1.png) */}
        <div className="flex p-1.5 bg-gray-100 rounded-[20px] relative">
          <motion.div 
            animate={{ x: isMulti ? '100%' : '0%' }}
            className="absolute inset-y-1.5 left-1.5 w-[calc(50%-3px)] bg-white rounded-[15px] shadow-md z-0"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button onClick={() => setIsMulti(false)} className={`flex-1 py-3 text-xs font-black uppercase z-10 transition-colors ${!isMulti ? 'text-black' : 'text-gray-400'}`}>{t.solo}</button>
          <button onClick={() => setIsMulti(true)} className={`flex-1 py-3 text-xs font-black uppercase z-10 transition-colors ${isMulti ? 'text-black' : 'text-gray-400'}`}>{t.multi}</button>
        </div>

        {/* 4. ДОПОЛНИТЕЛЬНЫЙ ТОГГЛ ДЛЯ МУЛЬТИ (manual/ai_host) */}
        <AnimatePresence>
          {isMulti && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 p-4 bg-gray-50 rounded-[20px] space-y-3"
            >
              <p className="text-[9px] font-black text-gray-400 uppercase text-center tracking-widest">{t.mp_title}</p>
              <div className="flex gap-2">
                {[
                  { id: 'manual', desc: 'Host decides (PERSON)' },
                  { id: 'ai_host', desc: 'AI decides all (AUTO)' }
                ].map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setMultiMode(m.id)}
                    className={`flex-1 p-3 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                      multiMode === m.id ? 'bg-black text-white border-black scale-105' : 'bg-white border-gray-100'
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase">{m.id.replace('_', ' ')}</p>
                    <p className="text-[8px] opacity-60 font-bold">{m.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. КНОПКА НАЧАТЬ (image_1.png) */}
        <button 
          onClick={handleCreateGame}
          className="w-full bg-[#22C55E] text-white py-5 rounded-[22px] font-black text-sm uppercase tracking-widest shadow-xl shadow-green-100 active:scale-95 transition-all"
        >
          {t.start}
        </button>

        {/* Разделитель "Войти в игру" */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <span className="relative flex justify-center text-[10px] font-bold text-gray-300 uppercase bg-white px-4 tracking-widest">{t.join}</span>
        </div>

        {/* 6. ВВОД КОДА И ОК (image_1.png) */}
        <div className="flex gap-3">
          <input 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t.code} 
            className="flex-1 p-5 rounded-[20px] bg-gray-50 border border-gray-100 font-bold text-sm uppercase tracking-wider outline-none focus:border-green-300 transition-all placeholder:text-gray-200 placeholder:normal-case"
          />
          <button 
            onClick={handleJoinGame}
            className="px-6 py-5 rounded-[20px] bg-black text-white font-black text-xs uppercase active:scale-95 transition-all"
          >
            {t.ok}
          </button>
        </div>
      </div>

      {/* Футер (как на скрине 1) */}
      <div className="mt-16 text-center space-y-4 opacity-50 z-10 animate-fade-in delay-500">
        <p className="text-[10px] font-medium text-gray-400">© 2026</p>
        <div className="px-5 py-2.5 rounded-full bg-[#D1FADF] border border-[#A7F3D0]">
          <p className="text-[10px] font-black text-[#065F46] uppercase tracking-widest">MADE BY SOLO</p>
        </div>
      </div>
    </div>
  )
}