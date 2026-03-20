"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "../lib/supabase";

// Интерфейс для строгой типизации ходов
interface Move {
  id: string;
  player_name: string;
  item: string;
  is_allowed: boolean;
  status: string;
  room_code: string;
}

function GameContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const mode = searchParams.get("mode") || "ai";
  
  const [username, setUsername] = useState<string>("");
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [history, setHistory] = useState<Move[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rule, setRule] = useState<string>("");

  const isHost = mode !== 'join';

  useEffect(() => {
    const savedName = localStorage.getItem("picnic_username") || (isHost ? "Host" : "Guest");
    setUsername(savedName);

    const fetchInitialData = async () => {
      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('code', code)
        .single();
      
      if (gameData) {
        setRule(gameData.rule);
        setTurnIndex(gameData.turn_index || 0);
      }

      const { data: moves } = await supabase
        .from('moves')
        .select('*')
        .eq('room_code', code)
        .order('id', { ascending: true });
      
      if (moves) setHistory(moves as Move[]);
    };

    fetchInitialData();

    // Исправленная подписка (используем type: 'postgres_changes' как объект)
    const channel = supabase
      .channel(`room-${code}`)
      .on(
        'postgres_changes' as any, 
        { 
          event: '*', 
          schema: 'public', 
          table: 'moves', 
          filter: `room_code=eq.${code}` 
        }, 
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setHistory(prev => [...prev, payload.new as Move]);
            setTurnIndex(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            setHistory(prev => prev.map(m => m.id === payload.new.id ? (payload.new as Move) : m));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, isHost]);

  const isMyTurn = isHost ? (turnIndex % 2 === 0) : (turnIndex % 2 === 1);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isMyTurn || isLoading) return;

    setIsLoading(true);
    const currentInput = input;
    setInput("");

    let isAllowed = true;
    let status = 'done';

    if (mode === 'ai' || mode === 'auto') {
      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item: currentInput, rule: rule })
        });
        const data = await res.json();
        isAllowed = data.allowed;
      } catch (err) {
        console.error("AI check failed", err);
      }
    } else if (mode === 'manual' && !isHost) {
      status = 'pending';
    }

    await supabase.from('moves').insert([{
      room_code: code,
      player_name: username,
      item: currentInput,
      is_allowed: isAllowed,
      status: status
    }]);

    await supabase.from('games').update({ turn_index: turnIndex + 1 }).eq('code', code);
    setIsLoading(false);
  };

  const judgeMove = async (moveId: string, result: boolean) => {
    await supabase
      .from('moves')
      .update({ is_allowed: result, status: "done" })
      .eq('id', moveId);
  };

  return (
    <main className="min-h-screen bg-[#FDFCF8] p-4 font-sans text-slate-900">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6 flex justify-between items-center text-slate-900">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
            <p className={`font-bold ${isMyTurn ? "text-green-500" : "text-orange-400"}`}>
              {isMyTurn ? "● YOUR TURN" : "● WAITING..."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Room</p>
            <p className="font-bold text-gray-700">{code}</p>
          </div>
        </div>

        <div className="space-y-4 mb-32">
          {history.map((move) => (
            <div key={move.id} className={`flex ${move.player_name === username ? "justify-end" : "justify-start"}`}>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 border-b-2 max-w-[85%]">
                <p className="text-[9px] font-bold text-gray-400 mb-1 uppercase">{move.player_name}</p>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-slate-900">{move.item}</span>
                  {move.status === 'pending' ? (
                    isHost ? (
                      <div className="flex gap-2 ml-2">
                        <button onClick={() => judgeMove(move.id, true)} type="button">✅</button>
                        <button onClick={() => judgeMove(move.id, false)} type="button">❌</button>
                      </div>
                    ) : (
                      <span className="animate-pulse">⏳</span>
                    )
                  ) : (
                    <span className="text-xl">{move.is_allowed ? "✅" : "❌"}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDFCF8] via-[#FDFCF8] to-transparent">
          <form onSubmit={handleSend} className="max-w-md mx-auto flex gap-2">
            <input 
              disabled={!isMyTurn || isLoading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isMyTurn ? "I'm bringing..." : "Wait for your turn..."}
              className="flex-1 p-5 rounded-2xl border-2 border-gray-100 outline-none focus:border-green-400 transition-all shadow-lg disabled:bg-gray-50 text-slate-900"
            />
            <button 
              type="submit"
              disabled={!isMyTurn || isLoading}
              className="bg-green-500 text-white w-16 rounded-2xl shadow-lg flex items-center justify-center text-2xl hover:bg-green-600 transition-all disabled:grayscale"
            >
              🧺
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading game...</div>}>
      <GameContent />
    </Suspense>
  );
}