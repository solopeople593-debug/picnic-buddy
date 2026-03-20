"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function GamePage() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const mode = searchParams.get("mode"); // 'ai', 'manual', 'auto'
  
  const [myRole, setMyRole] = useState<"host" | "player">("player");
  const [turnIndex, setTurnIndex] = useState(0);
  const [players, setPlayers] = useState<any[]>(["Host", "Player 1"]); // В будущем подтянем из базы
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secretRule, setSecretRule] = useState(searchParams.get("rule") || "");

  // Определяем, чей сейчас ход
  const isMyTurn = (turnIndex % players.length) === (myRole === "host" ? 0 : 1); 

  // 1. Подписка на Realtime (чтобы видеть ходы других)
  useEffect(() => {
    const channel = supabase
      .channel(`room-${code}`)
      .on('postgres_changes', { event: 'INSERT', table: 'moves', filter: `room_code=eq.${code}` }, 
      (payload) => {
        setHistory(prev => [...prev, payload.new]);
        setTurnIndex(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [code]);

  // 2. Отправка хода
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isMyTurn || isLoading) return;

    setIsLoading(true);
    const currentInput = input;
    setInput("");

    let isAllowed = false;

    // ЛОГИКА ПРОВЕРКИ
    if (mode === "ai" || mode === "auto") {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: currentInput, rule: secretRule })
      });
      const data = await res.json();
      isAllowed = data.allowed;
    } else {
      // В Manual режиме пока ставим "pending", пока хост не нажмет кнопку
      isAllowed = true; 
    }

    // Сохраняем ход в базу
    await supabase.from('moves').insert([{
      room_code: code,
      player_name: myRole === "host" ? "Host" : "You",
      item: currentInput,
      is_allowed: isAllowed,
      status: mode === "manual" ? "pending" : "done"
    }]);

    setIsLoading(false);
  };

  // 3. Ручное подтверждение (для Manual Host)
  const judgeMove = async (moveId: string, result: boolean) => {
    await supabase
      .from('moves')
      .update({ is_allowed: result, status: "done" })
      .eq('id', moveId);
  };

  return (
    <main className="min-h-screen bg-background text-text-main p-4">
      {/* Шапка с очередью */}
      <div className="max-w-md mx-auto bg-white rounded-3xl p-4 shadow-sm mb-6 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black uppercase text-gray-400">Current Turn</p>
          <p className="font-bold text-accent">
            {isMyTurn ? "👉 YOUR TURN" : `Waiting for ${players[turnIndex % players.length]}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-gray-400">Room</p>
          <p className="font-mono font-bold">{code}</p>
        </div>
      </div>

      {/* Чат */}
      <div className="max-w-md mx-auto space-y-4 pb-32">
        {history.map((move, i) => (
          <div key={i} className={`flex flex-col ${move.player_name === "You" ? "items-end" : "items-start"}`}>
            <div className={`p-4 rounded-2xl shadow-sm border bg-white`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{move.player_name}</p>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black">{move.item}</span>
                {move.status === "pending" && myRole === "host" ? (
                  <div className="flex gap-2">
                    <button onClick={() => judgeMove(move.id, true)}>✅</button>
                    <button onClick={() => judgeMove(move.id, false)}>❌</button>
                  </div>
                ) : (
                  <span>{move.is_allowed ? "✅" : "❌"}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ввод текста (только если твой ход) */}
      <div className="fixed bottom-0 left-0 right-0 p-6">
        <form onSubmit={handleSend} className="max-w-md mx-auto flex gap-2">
          <input
            disabled={!isMyTurn || isLoading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isMyTurn ? "I'm bringing..." : "Wait for your turn..."}
            className="flex-1 p-4 rounded-2xl border-2 outline-none focus:border-accent disabled:bg-gray-100"
          />
          <button className="bg-accent text-white p-4 rounded-2xl font-bold">🚀</button>
        </form>
      </div>
    </main>
  );
}