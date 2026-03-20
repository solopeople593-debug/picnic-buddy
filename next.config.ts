import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Игнорируем ошибки типов при сборке
    ignoreBuildErrors: true,
  },
  // В новых версиях настройки линтера могут игнорироваться автоматически, 
  // если нет файла .eslintrc, но для чистоты логов мы просто убираем лишний ключ.
};

export default nextConfig;