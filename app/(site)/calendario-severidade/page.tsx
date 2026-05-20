import type { Metadata } from "next";
import SeverityCalendarLoader from "@/components/panels/SeverityCalendarLoader";

export const metadata: Metadata = {
  title: "Calendário de Severidade Hidrológica — Observatório IBI",
  description:
    "Heatmap centenário da severidade hidrológica de estações da bacia amazônica. Visualize padrões de seca e cheia de 1927 a 2026.",
  openGraph: {
    title: "Calendário de Severidade Hidrológica — Bacia do Amazonas",
    description:
      "~100 anos de dados hidrológicos em uma visualização: identifique instantaneamente quais anos foram os mais secos ou cheios.",
  },
};

export default function CalendarioSeveridadePage() {
  const breadcrumbs = [
    { label: "Início",    href: "/" },
    { label: "Calendário Histórico", href: "/calendario-severidade" },
  ];

  return (
    <main className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex gap-1.5 items-center">
        {breadcrumbs.map((b, i) => (
          <span key={b.href} className="flex items-center gap-1.5">
            {i > 0 && <span>›</span>}
            {i < breadcrumbs.length - 1 ? (
              <a href={b.href} className="hover:text-gray-300 transition-colors">{b.label}</a>
            ) : (
              <span className="text-gray-300">{b.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Page header */}
      <div className="max-w-3xl">
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-1">
          Série histórica · 1927–2026
        </p>
        <h1 className="text-white text-2xl font-extrabold mb-2">
          Calendário de Severidade Hidrológica
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Cada célula representa uma semana de um ano específico. A cor reflete a posição
          da cota mediana em relação à climatologia de referência (2016–2023): vermelho-escuro
          indica cotas abaixo do P10 histórico, azul-escuro indica acima do P90. A moldura
          amarela tracejada marca a janela sazonal de estiagem (set–nov).
        </p>
      </div>

      {/* Main panel */}
      <SeverityCalendarLoader />

      {/* Metodologia */}
      <div className="bg-azul-medio/20 border border-white/10 rounded-lg p-5 max-w-3xl">
        <h2 className="text-white font-semibold text-sm mb-2">Metodologia</h2>
        <div className="text-gray-400 text-xs space-y-1.5 leading-relaxed">
          <p>
            A posição relativa de cada semana é calculada como{" "}
            <code className="bg-white/10 px-1 rounded">pos = (cota − P10) / (P90 − P10)</code>,
            onde P10 e P90 são os percentis por dia-do-ano obtidos da série histórica 2016–2023
            com janela móvel de ±15 dias e suavização MA-7d.
          </p>
          <p>
            Valores pos {"<"} 0 indicam cotas abaixo do P10 (estiagem extrema);
            pos {">"} 1 indica acima do P90 (cheia excepcional).
          </p>
          <p className="text-gray-500">
            Fonte: ANA HidroWeb (estações 16030000 Itacoatiara, 13870000 Lábrea, 15700000 Manicoré).
            Período de referência para os percentis: 2016–2023
            (excluindo 2024–2025 para não contaminar o baseline com os anos extremos em análise).
          </p>
        </div>
      </div>

      {/* Cross-link */}
      <div className="bg-verde/5 border border-verde/20 rounded-lg p-4 max-w-md">
        <p className="text-gray-400 text-xs mb-1">Contexto regulatório</p>
        <a href="/monitor" className="text-verde text-sm font-medium hover:underline">
          Monitor Hidrológico em tempo real →
        </a>
        <p className="text-gray-500 text-xs mt-1">
          Acompanhe como as estações estão agora, com alertas automáticos e IDN atual.
        </p>
      </div>
    </main>
  );
}
