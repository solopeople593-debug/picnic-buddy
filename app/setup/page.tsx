"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useEffect } from "react";

function SetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const mode = searchParams.get("mode") || "ai";
  const code = searchParams.get("code") || "?????";

  const [rule, setRule] = useState("");
  const [example, setExample] = useState("");

  // Если режим AI, мы можем сразу подставить "Случайное правило" (позже подключим нейронку)
  useEffect(() => {
    if (mode === "ai") {
      setRule("Words that contain double letters (e.g., Apple, Beer)");
      setExample("Apple");
    }
  }, [mode]);

  const handleStartPicnic = () => {
    // Переходим в саму игру и передаем все настройки
    const params = new URLSearchParams({
      code,
      mode,
      rule,
      example
    });
    router.push(`/game?${params.toString()}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-text-main">
      <div className="text-5xl mb-6 animate-bounce">🤫</div>
      
      <h1 className="text-3xl font-black mb-2 text-center">The Secret Rule</h1>
      <p className="text-gray-500 text-sm text-center mb-10 max-w-xs font-medium">
        {mode === "ai" 
          ? "AI has generated a rule. You can change it if you want!" 
          : "Players will have to guess what you're thinking."}
      </p>

      <div className="w-full max-w-sm space-y-6">
        {/* Поле ПРАВИЛО */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-4">
            {mode === "ai" ? "AI Selected Rule" : "Enter Your Secret Rule"}
          </label>
          <div className="relative">
            <textarea
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              placeholder="e.g. Items that are green..."
              className="w-full bg-white border-2 border-gray-100 rounded-[2rem] p-5 shadow-sm focus:border-accent outline-none font-bold text-lg min-h-[120px] resize-none"
            />
            <div className="absolute top-4 right-4 text-2xl">📝</div>
          </div>
        </div>

        {/* Поле ПРИМЕР */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-4">
            First Correct Item (Example)
          </label>
          <input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="e.g. Grass"
            className="w-full bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm focus:border-accent outline-none font-bold"
          />
        </div>

        {/* Кнопка запуска */}
        <button
          onClick={handleStartPicnic}
          disabled={!rule || !example}
          className={`w-full py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all flex items-center justify-center gap-3 ${
            rule && example 
              ? "bg-accent text-white shadow-accent/30 hover:scale-[1.03] active:scale-95" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <span>Let&apos;s Play!</span>
          <span className="text-2xl">🚀</span>
        </button>

        <p className="text-center text-[10px] text-gray-400 uppercase font-bold tracking-widest">
          The game will start for all players
        </p>
      </div>
    </main>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-accent">Preparing...</div>}>
      <SetupContent />
    </Suspense>
  );
}