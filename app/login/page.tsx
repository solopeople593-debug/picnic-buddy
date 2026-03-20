"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const [name, setName] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";

  const handleJoin = () => {
    if (name.trim().length < 2) return;
    localStorage.setItem("picnic_username", name.trim());
    router.push(`/game?code=${code}&mode=join`);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6 text-slate-900">
      <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-xl border border-gray-100 text-center">
        <h2 className="text-2xl font-black mb-6">Who's joining?</h2>
        <input 
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name..."
          className="w-full p-5 rounded-2xl border-2 border-gray-100 outline-none focus:border-green-400 text-center font-bold text-lg mb-4"
        />
        <button 
          onClick={handleJoin}
          className="w-full bg-green-500 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-green-600 transition-all"
        >
          JOIN PICNIC 🧺
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}