import { redirect } from 'next/navigation';

export default function Home() {
  // Этот серверный компонент мгновенно перенаправит пользователя
  redirect('/setup');
  
  // Этот код никогда не выполнится, но нужен для структуры
  return null;
}