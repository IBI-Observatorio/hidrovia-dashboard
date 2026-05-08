"use client";

import { LIMIARES, posicaoRelativa, semaforo, type Estacao } from "@/lib/limiares";
import { DadosEstacao } from "@/lib/dados-historicos";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import Tooltip from "./Tooltip";

interface GaugeCardProps {
  estacao: Estacao;
  dados:   DadosEstacao;
}

const SEMAFORO_CORES = {
  normal:  { borda: "border-verde",    badge: "bg-verde",    texto: "Normal"  },
  atencao: { borda: "border-ouro",     badge: "bg-ouro",     texto: "Atenção" },
  critico: { borda: "border-vermelho", badge: "bg-vermelho", texto: "Crítico" },
};

const TOOLTIP_ESTACAO: Partial<Record<Estacao, string>> = {
  Manaus:      "Parâmetro regulatório ANTAQ: LWS ativada quando Manaus < 17,7 m. Estação-referência do regime hidrológico.",
  Itacoatiara: "Ponto de controle real da calha navegável (Tabocal). Em 2024, caiu 22 dias depois que Manaus já subia.",
  Curicuriari: "Estação SGC — barômetro do Negro alto. Indicador do regime Driver Norte, que comanda a dessincronização 2026.",
  Humaita:     "Indicador do Rio Madeira — barômetro do Driver Sul. Em 2024 foi a bacia mais depletada; em 2026 está acima da média.",
  Manacapuru:  "Barômetro do Rio Solimões — principal artéria da calha central. Reflete o regime geral da bacia.",
  PortoVelho:  "Upstream do Madeira. Excedentes aqui chegam a Humaitá em ~7 dias.",
  Borba:       "Proxy do Madeira médio — mede a propagação da onda de cheia entre Porto Velho e Humaitá.",
};

export default function GaugeCard({ estacao, dados }: GaugeCardProps) {
  const limiar   = LIMIARES[estacao];
  const pos      = posicaoRelativa(dados.cota_m, estacao);
  const nivel    = semaforo(dados.cota_m, estacao);
  const semaCore = SEMAFORO_CORES[nivel];
  const pct      = Math.round(pos * 100);

  const barColor =
    nivel === "critico" ? "#A0153E"
    : nivel === "atencao" ? "#D4922A"
    : "#00C04B";

  const Trend =
    dados.variacao_24h > 0 ? TrendingUp
    : dados.variacao_24h < 0 ? TrendingDown
    : Minus;
  const trendColor =
    dados.variacao_24h > 0 ? "text-verde"
    : dados.variacao_24h < 0 ? "text-vermelho"
    : "text-gray-400";

  return (
    <div
      className={`bg-azul-medio rounded-lg p-4 border-l-4 ${semaCore.borda} flex flex-col gap-3`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0">
          <div className="min-w-0">
            <h3 className="text-white font-bold text-base leading-tight truncate">{dados.nome}</h3>
            <p className="text-gray-400 text-xs">{dados.rio}</p>
          </div>
          {TOOLTIP_ESTACAO[estacao] && (
            <div className="mt-0.5 shrink-0">
              <Tooltip conteudo={TOOLTIP_ESTACAO[estacao]!} />
            </div>
          )}
        </div>
        <span
          className={`${semaCore.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0`}
        >
          {semaCore.texto}
        </span>
      </div>

      {/* Cota principal */}
      <div className="flex items-end gap-2">
        <span className="text-white text-3xl font-extrabold tabular-nums">
          {dados.cota_m.toFixed(2)}
        </span>
        <span className="text-gray-400 text-sm mb-1">m</span>
        <div className={`flex items-center gap-0.5 mb-1 ${trendColor}`}>
          <Trend size={14} />
          <span className="text-xs font-semibold">
            {dados.variacao_24h > 0 ? "+" : ""}{dados.variacao_24h} cm/24h
          </span>
        </div>
      </div>

      {/* Barra P10–P90 */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>P10 {limiar.p10} m</span>
          <span className="font-semibold flex items-center gap-1" style={{ color: barColor }}>
            {pct}%
            <Tooltip
              conteudo={`Posição relativa na faixa histórica P10–P90. 0% = mínimo histórico (P10), 100% = máximo (P90). Atual: ${dados.cota_m.toFixed(2)} m.`}
            />
          </span>
          <span>P90 {limiar.p90} m</span>
        </div>
        <div className="w-full bg-azul-marinho rounded-full h-3 relative overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-700"
            style={{ width: `${Math.max(2, pct)}%`, backgroundColor: barColor }}
          />
          {/* Gatilho LWS */}
          {limiar.gatilho_lws && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-ouro opacity-80"
              style={{
                left: `${Math.round(posicaoRelativa(limiar.gatilho_lws, estacao) * 100)}%`,
              }}
              title={`Gatilho LWS: ${limiar.gatilho_lws} m`}
            />
          )}
        </div>
        {/* Marcador do gatilho LWS abaixo da barra */}
        {limiar.gatilho_lws && (
          <p className="text-ouro text-xs mt-0.5 text-right">
            ▲ LWS {limiar.gatilho_lws} m
          </p>
        )}
      </div>

      {/* Deltas */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-azul-marinho rounded px-2 py-1">
          <span className="text-gray-400 flex items-center gap-1">
            vs 2025
            <Tooltip conteudo="Diferença de cota no mesmo dia de 2025. Positivo = melhor que 2025." posicao="bottom" />
          </span>
          <span className={dados.delta_2025 >= 0 ? "text-verde font-bold" : "text-vermelho font-bold"}>
            {dados.delta_2025 >= 0 ? "+" : ""}{dados.delta_2025} cm
          </span>
        </div>
        <div className="bg-azul-marinho rounded px-2 py-1">
          <span className="text-gray-400 flex items-center gap-1">
            vs 2024
            <Tooltip conteudo="Diferença de cota no mesmo dia de 2024 (mega-seca). Positivo = melhor que a seca histórica." posicao="bottom" />
          </span>
          <span className={dados.delta_2024 >= 0 ? "text-verde font-bold" : "text-vermelho font-bold"}>
            {dados.delta_2024 >= 0 ? "+" : ""}{dados.delta_2024} cm
          </span>
        </div>
      </div>

      <p className="text-gray-500 text-xs text-right">
        {dados.ultima_atualizacao}
      </p>
    </div>
  );
}
