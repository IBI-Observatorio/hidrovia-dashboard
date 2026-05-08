"use client";

import { AlertTriangle, TrendingDown, Info, Zap, CheckCircle } from "lucide-react";
import { DADOS_ATUAIS, type DadosEstacao } from "@/lib/dados-historicos";
import { geraInsights, type InsightData } from "@/lib/gera-insights";

const ICONE: Record<InsightData["tipo"], React.ReactNode> = {
  critico:  <TrendingDown size={16} />,
  alerta:   <AlertTriangle size={16} />,
  info:     <Info size={16} />,
  positivo: <CheckCircle size={16} />,
};

const COR: Record<InsightData["tipo"], string> = {
  critico:  "#A0153E",
  alerta:   "#D4922A",
  info:     "#60A5FA",
  positivo: "#00C04B",
};

const BADGE: Record<InsightData["tipo"], string> = {
  critico:  "bg-vermelho/10 border-vermelho/40",
  alerta:   "bg-ouro/10 border-ouro/40",
  info:     "bg-blue-500/10 border-blue-500/40",
  positivo: "bg-verde/10 border-verde/40",
};

export default function InsightsPanel({
  dados = DADOS_ATUAIS,
}: {
  dados?: Record<string, DadosEstacao>;
}) {
  const insights = geraInsights(dados);

  const criticos  = insights.filter((i) => i.tipo === "critico").length;
  const alertas   = insights.filter((i) => i.tipo === "alerta").length;

  return (
    <div className="bg-azul-medio rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-white font-bold text-lg">Insights Automáticos</h2>
          <p className="text-gray-400 text-sm">
            Gerados dos dados mais recentes — cache 6h.
          </p>
        </div>
        {/* Contadores */}
        <div className="flex gap-2 text-xs shrink-0">
          {criticos > 0 && (
            <span className="bg-vermelho/20 text-vermelho border border-vermelho/40 px-2 py-0.5 rounded-full font-bold">
              {criticos} crítico{criticos > 1 ? "s" : ""}
            </span>
          )}
          {alertas > 0 && (
            <span className="bg-ouro/20 text-ouro border border-ouro/40 px-2 py-0.5 rounded-full font-bold">
              {alertas} alerta{alertas > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {insights.map((ins, i) => (
          <div
            key={i}
            className={`flex gap-3 bg-azul-marinho rounded-lg p-3 border ${BADGE[ins.tipo]}`}
          >
            <span style={{ color: COR[ins.tipo] }} className="mt-0.5 shrink-0">
              {ICONE[ins.tipo]}
            </span>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{ins.titulo}</p>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{ins.texto}</p>
              {ins.estacao && (
                <span className="inline-block mt-1 text-xs text-gray-600 bg-azul-medio rounded px-1.5 py-0.5">
                  {ins.estacao}
                </span>
              )}
            </div>
          </div>
        ))}

        {insights.length === 0 && (
          <div className="flex gap-3 bg-azul-marinho rounded-lg p-3 border border-verde/40">
            <CheckCircle size={16} className="text-verde mt-0.5 shrink-0" />
            <p className="text-gray-300 text-sm">
              Todas as estações dentro dos parâmetros normais.
            </p>
          </div>
        )}
      </div>

      <p className="text-gray-600 text-xs mt-3 text-right">
        <a href="/api/insights" target="_blank" rel="noopener" className="hover:text-gray-400 transition-colors">
          JSON API →
        </a>
      </p>
    </div>
  );
}
