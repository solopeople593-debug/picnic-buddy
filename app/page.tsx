'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'

type Lang = 'RU' | 'EN' | 'UA' | 'LV'
type MultiMode = 'ai_host' | 'manual'
type SubMode = 'hardcore' | 'assist'
type Difficulty = 'easy' | 'medium' | 'hard'
type SoloMode = 'classic' | 'ai_guesses'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [lang, setLang] = useState<Lang>('RU')
  const [mainMode, setMainMode] = useState<'solo' | 'multi'>('solo')
  const [multiMode, setMultiMode] = useState<MultiMode>('ai_host')
  const [subMode, setSubMode] = useState<SubMode>('hardcore')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [noLives, setNoLives] = useState(false)
  const [soloMode, setSoloMode] = useState<SoloMode>('classic')

  const t: any = {
    RU: {
      title: "ПИКНИК БАДДИ", name: "ВАШЕ ИМЯ", solo: "СОЛО", multi: "МУЛЬТИ",
      start: "НАЧАТЬ", code: "КОД КОМНАТЫ", join: "ВОЙТИ",
      aiHost: "ИИ ХОСТ", manual: "МАНУАЛ", hardcore: "ХАРДКОР", assist: "АССИСТ",
      hardcoreDesc: "Ты сам выбираешь концепт и фильтруешь слова",
      assistDesc: "ИИ помогает с концептом и подсказывает во время игры",
      classic: "ТЫ УГАДЫВАЕШЬ", aiGuesses: "ИИ УГАДЫВАЕТ",
      classicDesc: "ИИ придумывает концепт — ты угадываешь",
      aiGuessesDesc: "Ты задаёшь слово — ИИ пытается угадать (как Акинатор)",
      easy: "ЛЕГКО", medium: "СРЕДНЕ", hard: "СЛОЖНО",
      easyDesc: "Одно слово, простая категория",
      mediumDesc: "Словосочетание, нужно подумать",
      hardDesc: "Хитрое правило, сложно угадать",
      noLives: "БЕЗ ЖИЗНЕЙ", difficulty: "СЛОЖНОСТЬ:",
    },
    EN: {
      title: "PICNIC BUDDY", name: "YOUR NAME", solo: "SOLO", multi: "MULTI",
      start: "START", code: "ROOM CODE", join: "JOIN",
      aiHost: "AI HOST", manual: "MANUAL", hardcore: "HARDCORE", assist: "ASSIST",
      hardcoreDesc: "You pick the concept and judge every word",
      assistDesc: "AI helps with concept and whispers hints during the game",
      classic: "YOU GUESS", aiGuesses: "AI GUESSES",
      classicDesc: "AI makes a concept — you try to guess it",
      aiGuessesDesc: "You set a word — AI tries to guess it (like Akinator)",
      easy: "EASY", medium: "MEDIUM", hard: "HARD",
      easyDesc: "One word, simple category",
      mediumDesc: "Word combo, requires thinking",
      hardDesc: "Tricky rule, hard to guess",
      noLives: "NO LIVES", difficulty: "DIFFICULTY:",
    },
    UA: {
      title: "ПІКНІК БАДІ", name: "ВАШЕ ІМ'Я", solo: "СОЛО", multi: "МУЛЬТИ",
      start: "ПОЧАТИ", code: "КОД КІМНАТИ", join: "УВІЙТИ",
      aiHost: "ШІ ВЕДУЧИЙ", manual: "МАНУАЛ", hardcore: "ХАРДКОР", assist: "АСИСТ",
      hardcoreDesc: "Ти сам обираєш концепт і фільтруєш слова",
      assistDesc: "ШІ допомагає з концептом і підказує під час гри",
      classic: "ТИ ВГАДУЄШ", aiGuesses: "ШІ ВГАДУЄ",
      classicDesc: "ШІ придумує концепт — ти вгадуєш",
      aiGuessesDesc: "Ти задаєш слово — ШІ намагається вгадати (як Акінатор)",
      easy: "ЛЕГКО", medium: "СЕРЕДНЬО", hard: "СКЛАДНО",
      easyDesc: "Одне слово, проста категорія",
      mediumDesc: "Словосполучення, потрібно подумати",
      hardDesc: "Хитре правило, складно вгадати",
      noLives: "БЕЗ ЖИТТІВ", difficulty: "СКЛАДНІСТЬ:",
    },
    LV: {
      title: "PIKNIKA BIEDRS", name: "TAVS VĀRDS", solo: "SOLO", multi: "MULTI",
      start: "SĀKT", code: "ISTABAS KODS", join: "PIEVIENOTIES",
      aiHost: "AI VADĪTĀJS", manual: "MANUĀLS", hardcore: "HARDCORE", assist: "ASISTS",
      hardcoreDesc: "Tu izvēlies konceptu un filtrē vārdus",
      assistDesc: "AI palīdz ar konceptu un čukst padomus spēles laikā",
      classic: "TU MINI", aiGuesses: "AI MIN",
      classicDesc: "AI izdomā konceptu — tu mini",
      aiGuessesDesc: "Tu uzstādi vārdu — AI mēģina minēt (kā Akinator)",
      easy: "VIEGLI", medium: "VIDĒJI", hard: "GRŪTI",
      easyDesc: "Viens vārds, vienkārša kategorija",
      mediumDesc: "Vārdu savienojums, jāpadomā",
      hardDesc: "Viltīgs noteikums, grūti uzminēt",
      noLives: "BEZ DZĪVĪBĀM", difficulty: "GRŪTĪBA:",
    },
  }[lang]

  // ✅ Сложность скрыта для мануального мульти
  const showDifficulty = !(mainMode === 'multi' && multiMode === 'manual')
  // ✅ Без жизней показываем всегда кроме ai_guesses соло
  const showNoLives = !(mainMode === 'solo' && soloMode === 'ai_guesses')

  const handleStart = async () => {
    if (!name.trim()) return alert(lang === 'RU' ? "Введите имя!" : "Enter name!")
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    localStorage.removeItem('picnic_room_code')
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'true')

    const { error } = await supabase.from('rooms').insert([{ code: newCode, status: 'setup' }])
    if (error) return alert("DB Error: " + error.message)

    if (mainMode === 'solo') {
      if (soloMode === 'ai_guesses') {
        router.push(`/game/${newCode}/setup?mode=ai_guesses&nolives=${noLives}&lang=${lang}`)
      } else {
        router.push(`/game/${newCode}/setup?mode=solo&difficulty=${difficulty}&nolives=${noLives}&lang=${lang}`)
      }
    } else if (multiMode === 'ai_host') {
      router.push(`/game/${newCode}/setup?mode=ai_host&difficulty=${difficulty}&nolives=${noLives}&lang=${lang}`)
    } else {
      // ✅ manual — без difficulty, хост сам решает сложность
      router.push(`/game/${newCode}/setup?mode=manual&sub=${subMode}&nolives=${noLives}&lang=${lang}`)
    }
  }

  const handleJoin = async () => {
    if (!name.trim() || !joinCode.trim()) return alert(lang === 'RU' ? "Введите имя и код!" : "Enter name & code!")
    const cleanCode = joinCode.trim().toUpperCase()
    const { data } = await supabase.from('rooms').select('*').eq('code', cleanCode).single()
    if (!data) return alert(lang === 'RU' ? "Комната не найдена!" : "Room not found!")
    localStorage.removeItem('picnic_room_code')
    localStorage.setItem('picnic_player_name', name)
    localStorage.setItem('picnic_is_host', 'false')
    const mode = data.sub_mode === 'hardcore' || data.sub_mode === 'assist'
      ? 'manual'
      : (data.sub_mode || 'ai_host')
    router.push(`/game/${cleanCode}?mode=${mode}&sub=${data.sub_mode || 'hardcore'}&lang=${lang}`)
  }

  return (
    <div className="min-h-screen bg-[#F0FFF4] flex flex-col items-center justify-center p-4 text-black font-sans relative">

      {/* LANG SWITCHER */}
      <div className="absolute top-4 right-4 flex gap-1 z-50">
        {(['EN', 'UA', 'RU', 'LV'] as const).map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all
              ${lang === l ? 'bg-black text-white' : 'bg-white border border-gray-100 shadow-sm'}`}>
            {l}
          </button>
        ))}
      </div>

      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-6xl mb-4">
        🧺
      </motion.div>
      <h1 className="text-3xl font-black text-[#1A5319] mb-6 tracking-tighter">{t.title}</h1>

      <div className="w-full max-w-sm bg-white p-6 rounded-[40px] shadow-2xl space-y-4 border border-green-50/50 text-center">

        {/* ИМЯ */}
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t.name}
          className="w-full p-4 rounded-[22px] bg-gray-50 border-none outline-none font-bold focus:ring-2 ring-green-300 transition-all uppercase text-sm"
        />

        {/* СОЛО / МУЛЬТИ */}
        <div className="flex p-1.5 bg-gray-100 rounded-[22px]">
          <button onClick={() => setMainMode('solo')}
            className={`flex-1 py-3 text-[10px] font-black rounded-[18px] transition-all ${mainMode === 'solo' ? 'bg-white shadow-md' : 'opacity-50'}`}>
            {t.solo}
          </button>
          <button onClick={() => setMainMode('multi')}
            className={`flex-1 py-3 text-[10px] font-black rounded-[18px] transition-all ${mainMode === 'multi' ? 'bg-white shadow-md' : 'opacity-50'}`}>
            {t.multi}
          </button>
        </div>

        {/* ══════════ СОЛО ОПЦИИ ══════════ */}
        <AnimatePresence>
          {mainMode === 'solo' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3">

              {/* ТЫ УГАДЫВАЕШЬ / ИИ УГАДЫВАЕТ */}
              <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                <button onClick={() => setSoloMode('classic')}
                  className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${soloMode === 'classic' ? 'bg-black text-white' : 'opacity-40'}`}>
                  {t.classic}
                </button>
                <button onClick={() => setSoloMode('ai_guesses')}
                  className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${soloMode === 'ai_guesses' ? 'bg-black text-white' : 'opacity-40'}`}>
                  {t.aiGuesses}
                </button>
              </div>
              <p className="text-[9px] opacity-40 font-bold px-2 text-left">
                {soloMode === 'classic' ? t.classicDesc : t.aiGuessesDesc}
              </p>

              {/* СЛОЖНОСТЬ — только классика */}
              {soloMode === 'classic' && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black opacity-30 uppercase text-left">{t.difficulty}</p>
                  <div className="flex gap-1">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                      <button key={d} onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all border ${
                          difficulty === d
                            ? d === 'easy' ? 'bg-green-500 text-white border-green-500'
                            : d === 'medium' ? 'bg-yellow-500 text-white border-yellow-500'
                            : 'bg-red-500 text-white border-red-500'
                            : 'opacity-30 border-gray-200'
                        }`}>
                        {t[d]}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] opacity-30 font-bold px-1 text-left">{t[`${difficulty}Desc`]}</p>
                </div>
              )}

              {/* БЕЗ ЖИЗНЕЙ — только классика */}
              {soloMode === 'classic' && (
                <button onClick={() => setNoLives(!noLives)}
                  className={`w-full py-2.5 rounded-[16px] text-[9px] font-black transition-all border-2 ${noLives ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 opacity-50'}`}>
                  {noLives ? '∞' : '🍋'} {t.noLives}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════ МУЛЬТИ ОПЦИИ ══════════ */}
        <AnimatePresence>
          {mainMode === 'multi' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3">

              {/* ИИ ХОСТ / МАНУАЛ */}
              <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                <button onClick={() => setMultiMode('ai_host')}
                  className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${multiMode === 'ai_host' ? 'bg-black text-white' : 'opacity-40'}`}>
                  {t.aiHost}
                </button>
                <button onClick={() => setMultiMode('manual')}
                  className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${multiMode === 'manual' ? 'bg-black text-white' : 'opacity-40'}`}>
                  {t.manual}
                </button>
              </div>

              {/* ХАРДКОР / АССИСТ — только мануал */}
              <AnimatePresence>
                {multiMode === 'manual' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-2">
                    <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                      <button onClick={() => setSubMode('hardcore')}
                        className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${subMode === 'hardcore' ? 'bg-[#1A5319] text-white' : 'opacity-40'}`}>
                        {t.hardcore}
                      </button>
                      <button onClick={() => setSubMode('assist')}
                        className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${subMode === 'assist' ? 'bg-[#1A5319] text-white' : 'opacity-40'}`}>
                        {t.assist}
                      </button>
                    </div>
                    <p className="text-[9px] opacity-40 font-bold px-2 text-left">
                      {subMode === 'hardcore' ? t.hardcoreDesc : t.assistDesc}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ✅ СЛОЖНОСТЬ — только для ИИ ХОСТ, скрыта для мануал */}
              <AnimatePresence>
                {multiMode === 'ai_host' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-2">
                    <p className="text-[9px] font-black opacity-30 uppercase text-left">{t.difficulty}</p>
                    <div className="flex gap-1">
                      {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                        <button key={d} onClick={() => setDifficulty(d)}
                          className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all border ${
                            difficulty === d
                              ? d === 'easy' ? 'bg-green-500 text-white border-green-500'
                              : d === 'medium' ? 'bg-yellow-500 text-white border-yellow-500'
                              : 'bg-red-500 text-white border-red-500'
                              : 'opacity-30 border-gray-200'
                          }`}>
                          {t[d]}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] opacity-30 font-bold px-1 text-left">{t[`${difficulty}Desc`]}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* БЕЗ ЖИЗНЕЙ — мульти */}
              <button onClick={() => setNoLives(!noLives)}
                className={`w-full py-2.5 rounded-[16px] text-[9px] font-black transition-all border-2 ${noLives ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 opacity-50'}`}>
                {noLives ? '∞' : '🍋'} {t.noLives}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* НАЧАТЬ */}
        <button onClick={handleStart}
          className="w-full bg-[#22C55E] text-white py-5 rounded-[22px] font-black shadow-xl shadow-green-200 active:scale-95 transition-all uppercase text-xs tracking-widest">
          {t.start}
        </button>

        {/* ВОЙТИ ПО КОДУ */}
        <div className="flex gap-2 pt-2">
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            placeholder={t.code}
            className="flex-1 p-4 rounded-[20px] bg-gray-50 border-none outline-none font-bold uppercase text-xs focus:ring-2 ring-gray-200"
          />
          <button onClick={handleJoin}
            className="px-8 rounded-[20px] bg-black text-white font-black text-[10px] uppercase active:scale-95 transition-all">
            {t.join}
          </button>
        </div>
      </div>

      <p className="mt-8 text-[10px] font-black opacity-20 uppercase italic tracking-[0.4em]">MADE BY SOLO</p>
    </div>
  )
}