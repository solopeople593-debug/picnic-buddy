/** @type {import('next').NextConfig} */
const nextConfig: any = {
  typescript: {
    // Игнорируем ошибки типов при сборке на Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // Игнорируем ошибки линтера
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;