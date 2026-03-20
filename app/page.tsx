"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase"; 
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState("ai");
  const [inputCode, setInputCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Функция генерации случайного кода
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // ФУНКЦИЯ СОЗДАНИЯ ИГРЫ В БАЗЕ ДАННЫХ
  const handleCreateGame = async () => {
    setIsLoading(true);
    const newCode = generateRandomCode();

    try {
      const { error } = await supabase
        .from('games')
        .insert([
          { 
            code: newCode, 
            mode: selectedMode, 
            status: 'waiting' 
          }
        ]);

      if (error) throw error;

      // Если всё успешно, переходим в лобби
      router.push(`/lobby?code=${newCode}&mode=${selectedMode}`);
    } catch (error: any) {
      alert("Error creating game: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      
      {/* Декор */}
      <div className="absolute top-10 right-10 text-6xl opacity-20 select-none text-text-main">☀️</div>
      <div className="absolute bottom-10 left-10 text-6xl opacity-20 select-none text-text-main">🌲</div>

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <div className="text-5xl mb-4 drop-shadow-sm text-center">🧺</div>

        <h1 className="text-4xl md:text-5xl font-black mb-2 text-center leading-tight text-text-main">
          I&apos;m Going on a <br/>
          <span className="text-accent">Picnic</span>
        </h1>

        <div className="flex flex-col gap-3 w-full mb-8 mt-8">
          {/* Кнопки выбора режима */}
          {["ai", "manual", "auto"].map((m) => (
            <button 
              key={m}
              onClick={() => setSelectedMode(m)}
              className={`flex items-center justify-between p-4 rounded-2xl shadow-sm border-2 transition-all text-left ${
                selectedMode === m ? "bg-accent text-white border-accent" : "bg-white text-text-main border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{m === "ai" ? "🤖" : m === "manual" ? "👤" : "✨"}</span>
                <div>
                  <div className="font-bold tracking-tight uppercase text-xs opacity-60">Mode</div>
                  <div className="font-bold">{m === "ai" ? "AI Host" : m === "manual" ? "Player Host (Manual)" : "Player Host (Auto)"}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* КНОПКА СОЗДАНИЯ */}
        <button 
          onClick={handleCreateGame}
          disabled={isLoading}
          className="w-full bg-accent text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isLoading ? "Creating Room..." : "+ Create New Game"}
        </button>

        {/* ПРИСОЕДИНЕНИЕ */}
        <div className="mt-6 flex flex-col items-center w-full">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-3">or join a game</p>
          <div className="flex gap-2 w-full">
            <input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="flex-1 bg-white border-2 border-gray-100 rounded-2xl p-4 text-center font-mono font-bold focus:border-accent outline-none transition shadow-sm text-text-main"
            />
            <button 
              onClick={() => router.push(`/lobby?code=${inputCode}&mode=join`)}
              disabled={inputCode.length < 4}
              className={`px-5 rounded-2xl transition ${
                inputCode.length >= 4 ? "bg-accent text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}