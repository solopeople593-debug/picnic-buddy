"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "../lib/supabase";

function LobbyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";
  const mode = searchParams.get("mode") || "ai";
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/login?code=${code}` : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center p-6 text-slate-900">
      <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-xl border border-gray-100 text-center">
        <div className="text-5xl mb-4">🏠</div>
        <h1 className="text-2xl font-black mb-2">Game Lobby</h1>
        <p className="text-gray-400 mb-8 font-medium">Waiting for players to join...</p>

        <div className="bg-gray-50 p-4 rounded-2xl mb-6">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Room Code</p>
          <p className="text-3xl font-mono font-black tracking-tighter text-green-600">{code}</p>
        </div>

        <button 
          onClick={copyToClipboard}
          className="w-full mb-3 p-4 rounded-2xl border-2 border-dashed border-gray-200 font-bold text-sm hover:border-green-400 transition-all"
        >
          {copied ? "✅ COPIED!" : "🔗 COPY INVITE LINK"}
        </button>

        <button 
          onClick={() => router.push(`/game?code=${code}&mode=${mode}`)}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-black transition-all"
        >
          START GAME
        </button>
      </div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      < LobbyContent />
    </Suspense>
  );
}