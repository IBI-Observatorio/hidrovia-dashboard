import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse usa módulos Node.js nativos — não bundlizar no edge
  serverExternalPackages: ["pdf-parse"],

  // Compressão e otimizações para produção
  compress: true,

  // Headers de segurança e cache em produção
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
      // Sobrescreve o Cache-Control padrão do prerender estático para HTML.
      // Sem isso, o edge da Railway cacheia o HTML por 1 ano (s-maxage=31536000)
      // e novos deploys não invalidam — o usuário continua vendo o build antigo.
      // Com s-maxage=60 + stale-while-revalidate, o edge revalida em 1 minuto.
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/monitor",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/caso-2024",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=60" },
        ],
      },
    ];
  },
};

export default nextConfig;
