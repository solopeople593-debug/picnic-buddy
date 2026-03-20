"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function SetupPage() {
  const [rule, setRule] = useState<string>("");
  const [mode, setMode] = useState<string>("ai");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rule.trim() || isLoading) return;

    setIsLoading(true);
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();

    try {
      const { error } = await supabase.from("games").insert([
        {
          code,
          rule,
          mode,
          turn_index: 0,
        },
      ]);

      if (error) throw error;

      // Устанавливаем имя хоста по умолчанию
      localStorage.setItem("picnic_username", "Host");

      // Перенаправляем в лобби
      router.push(`/lobby?code=${code}&mode=${mode}`);
    } catch (err) {
      console.error("Error creating game:", err);
      alert("Failed to create game. Please check your Supabase connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6 text-slate-900">
      <form onSubmit={handleCreate} className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-xl border border-gray-100">
        <h1 className="text-2xl font-black mb-6 text-center">Setup Picnic 🧺</h1>
        
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Secret Rule</label>
            <input 
              required
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              placeholder="e.g., Only red items"
              className="w-full p-4 rounded-2xl border-2 border-gray-100 outline-none focus:border-green-400 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Hosting Mode</label>
            <select 
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full p-4 rounded-2xl border-2 border-gray-100 bg-white outline-none focus:border-green-400"
            >
              <option value="ai">AI Host (Automated)</option>
              <option value="manual">Manual (You judge)</option>
              <option value="auto">Hybrid (You + AI help)</option>
            </select>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-500 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-green-600 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isLoading ? "PREPARING..." : "CREATE ROOM"}
          </button>
        </div>
      </form>
    </div>
  );
}