import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse usa módulos Node.js nativos — não bundlizar no edge
  serverExternalPackages: ["pdf-parse"],

  // Compressão e otimizações para produção
  compress: true,

  // Headers de segurança para produção
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options",        value: "SAMEORIGIN" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
