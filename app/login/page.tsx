'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Lobby() {
  const [code, setCode] = useState('')
  const router = useRouter()

  const handleJoin = () => {
    if (code.trim()) {
      // СОХРАНЯЕМ ДАННЫЕ: Мы гость
      localStorage.setItem('picnic_is_host', 'false')
      // ПЕРЕХОДИМ: Ссылка теперь /game/КОД (без знака вопроса!)
      router.push(`/game/${code.trim().toUpperCase()}`)
    }
  }

  const handleCreate = () => {
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase()
    localStorage.setItem('picnic_is_host', 'true')
    router.push(`/game/${newCode}`)
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <button onClick={handleCreate} className="bg-green-500 text-white p-4 rounded">Create New Game</button>
      <input 
        value={code} 
        onChange={(e) => setCode(e.target.value)} 
        placeholder="Enter Code" 
        className="border p-2 rounded"
      />
      <button onClick={handleJoin} className="bg-blue-500 text-white p-4 rounded">Join Game</button>
    </div>
  )
}