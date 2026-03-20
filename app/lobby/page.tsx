"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

function LobbyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Получаем данные из адреса (например, ?code=VUR8G&mode=ai)
  const code = searchParams.get("code") || "?????";
  const mode = searchParams.get("mode") || "ai";

  // Список игроков (пока заглушка, позже сделаем онлайн)
  const [players] = useState([
    { name: "You (Host)", isHost: true, avatar: "🎒" },
  ]);

  // Названия режимов для отображения в заголовке
  const modeNames: Record<string, string> = {
    ai: "🤖 AI Host Mode",
    manual: "👤 Manual Host Mode",
    auto: "✨ Hybrid Host Mode",
    join: "🚪 Joining Game..."
  };

  // Функция, которая срабатывает при нажатии на Start Game
  const handleStart = () => {
    // Если режим подразумевает, что человек выбирает правило — идем в setup
    if (mode === "manual" || mode === "auto") {
      router.push(`/setup?code=${code}&mode=${mode}`);
    } else {
      // Если режим чисто с ИИ, можно будет сразу в игру (но пока ведем в setup для теста)
      router.push(`/setup?code=${code}&mode=${mode}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-text-main">
      
      {/* Шапка */}
      <div className="text-4xl mb-2">🧺</div>
      <h1 className="text-3xl font-black mb-1 text-center">Picnic Lobby</h1>
      <p className="text-gray-500 font-medium mb-8 uppercase tracking-widest text-[10px] text-center">
        {modeNames[mode] || "Game Room"}
      </p>

      {/* Карточка с кодом комнаты */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-dashed border-accent/20 flex flex-col items-center mb-10 w-full max-w-sm">
        <p className="text-[10px] font-bold text-gray-400 mb-2 tracking-[0.2em] uppercase">Share this code</p>
        <div className="flex items-center gap-4">
          <span className="text-5xl font-mono font-black text-accent tracking-tighter">{code}</span>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(code);
              alert("Code copied!");
            }}
            className="bg-gray-50 p-3 rounded-2xl hover:bg-gray-100 active:scale-90 transition-all text-xl"
            title="Copy code"
          >
            📋
          </button>
        </div>
      </div>

      {/* Список игроков */}
      <div className="w-full max-w-sm mb-12">
        <div className="flex justify-between items-end mb-4 px-2">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Players</p>
          <p className="text-[10px] font-bold text-accent uppercase tracking-widest leading-none">
            <span className="inline-block w-1.5 h-1.5 bg-accent rounded-full mr-1 animate-pulse"></span>
            Waiting for others
          </p>
        </div>
        
        <div className="space-y-3">
          {players.map((p, i) => (
            <div key={i} className="bg-white p-4 rounded-[1.5rem] flex justify-between items-center shadow-sm border border-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-2xl">
                  {p.avatar}
                </div>
                <span className="font-bold text-lg">{p.name}</span>
              </div>
              {p.isHost && <span className="text-xl drop-shadow-sm">👑</span>}
            </div>
          ))}
          
          {/* Визуальная заглушка для второго игрока */}
          <div className="border-2 border-dotted border-gray-100 p-4 rounded-[1.5rem] flex items-center justify-center text-gray-300 text-sm font-medium italic">
            Waiting for player 2...
          </div>
        </div>
      </div>

      {/* Кнопка Старта */}
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <button 
          onClick={handleStart}
          className="w-full bg-accent text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
           Start Game
        </button>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
          You are the host • Click start when ready
        </p>
      </div>

      {/* Ссылка назад */}
      <Link href="/" className="mt-12 text-sm text-gray-400 hover:text-accent font-bold transition-colors uppercase tracking-widest">
        ← Leave Room
      </Link>
    </main>
  );
}

// Обертка Suspense нужна, чтобы Next.js не ругался при сборке (из-за useSearchParams)
export default function LobbyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-bold text-accent animate-pulse">
        Loading Picnic Lobby...
      </div>
    }>
      <LobbyContent />
    </Suspense>
  );
}