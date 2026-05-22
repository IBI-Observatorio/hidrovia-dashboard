// IRC Widget — número proprietário do Observatório IBI.
// Renderiza no topo do /monitor, acima das réguas atuais.
//
// Inclui:
//   - Número grande IRC (0–100) com faixa colorida
//   - Seta de tendência vs ponto anterior da série histórica
//   - Mini-sparkline 90d
//   - Breakdown dos 4 componentes ao hover (tooltip via title nativo)

import { calculaIRC, calculaIRC_Agora, COR_FAIXA, PESOS_IRC, type SnapshotIRC } from "@/lib/irc";
import { calculaIRCMonteCarlo } from "@/lib/irc-incerteza";
import { IRC_HISTORICO_CALCULADO } from "@/lib/irc-historico-calculado";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  snapshot: SnapshotIRC;
}

export default function IRCWidget({ snapshot }: Props) {
  const r = calculaIRC(snapshot);
  const rAgora = calculaIRC_Agora(snapshot);
  const mc = calculaIRCMonteCarlo(snapshot, 300);
  const cor = COR_FAIXA[r.faixa];

  // Histórico 90d para sparkline
  const ult90 = IRC_HISTORICO_CALCULADO.slice(-90);
  const ircsHist = ult90.map((p) => p.irc);
  const ircAnterior = ircsHist.length ? ircsHist[ircsHist.length - 1] : r.irc;
  const delta = r.irc - ircAnterior;

  // SVG sparkline dimensions
  const W = 240, H = 36, PAD = 2;
  const minIRC = Math.min(0, ...ircsHist);
  const maxIRC = Math.max(100, ...ircsHist);
  const range = maxIRC - minIRC || 1;
  const stepX = (W - 2 * PAD) / Math.max(1, ircsHist.length - 1);
  const pathD = ircsHist
    .map((v, i) => `${i === 0 ? "M" : "L"} ${PAD + i * stepX} ${PAD + (1 - (v - minIRC) / range) * (H - 2 * PAD)}`)
    .join(" ");

  const TrendIcon = delta > 1 ? TrendingUp : delta < -1 ? TrendingDown : Minus;

  return (
    <div className={`rounded-lg p-5 border ${cor.border} ${cor.bg}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Número grande */}
        <div className="flex-shrink-0">
          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">
            IRC · Índice de Risco de Calado <span className="text-gray-600">v2</span>
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-extrabold tabular-nums ${cor.texto}`}>
              {r.irc.toFixed(0)}
            </span>
            <span className="text-gray-500 text-sm">/100</span>
            <span
              className={`flex items-center gap-1 text-xs font-semibold ${
                delta > 1 ? "text-vermelho" : delta < -1 ? "text-verde" : "text-gray-500"
              }`}
              title="Variação vs último ponto da série histórica"
            >
              <TrendIcon size={14} />
              {delta >= 0 ? "+" : ""}{delta.toFixed(1)}
            </span>
          </div>
          <p className={`text-xs font-semibold uppercase tracking-wider mt-1 ${cor.texto}`}>
            Faixa {r.faixa}
          </p>
          {/* IC80 e IRC_AGORA — novidades v2 */}
          <p className="text-gray-500 text-[10px] mt-1">
            IC80: <span className="text-gray-300">{mc.irc_ic80_lo.toFixed(0)}–{mc.irc_ic80_hi.toFixed(0)}</span>
            {" · "}σ {mc.irc_sigma.toFixed(1)}
          </p>
          <p className="text-gray-500 text-[10px]">
            IRC agora (s/ projeção): <span className="text-gray-300">{rAgora.irc.toFixed(0)}</span>
          </p>
        </div>

        {/* Sparkline */}
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">
            últimos 90 pontos
          </p>
          <svg width={W} height={H} className="block">
            <path d={pathD} fill="none" stroke="currentColor" strokeWidth="1.5" className={cor.texto} />
            <line x1={PAD} y1={PAD + (1 - 25/100) * (H - 2*PAD)} x2={W - PAD} y2={PAD + (1 - 25/100) * (H - 2*PAD)} stroke="#475569" strokeDasharray="2,2" strokeWidth="0.5" />
            <line x1={PAD} y1={PAD + (1 - 75/100) * (H - 2*PAD)} x2={W - PAD} y2={PAD + (1 - 75/100) * (H - 2*PAD)} stroke="#475569" strokeDasharray="2,2" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          {[
            { rotulo: "LWS",           valor: r.componentes.lws,         peso: PESOS_IRC.lws },
            { rotulo: "HMM extremo",   valor: r.componentes.hmm_extremo, peso: PESOS_IRC.hmm_extremo },
            { rotulo: "Onda Branco",   valor: r.componentes.onda_branco, peso: PESOS_IRC.onda_branco },
            { rotulo: "Anomalia PP",   valor: r.componentes.anomalia_pp, peso: PESOS_IRC.anomalia_pp },
          ].map((c) => (
            <div key={c.rotulo} className="flex justify-between gap-3" title={`Peso ${(c.peso*100).toFixed(0)}% × ${c.valor.toFixed(0)} = ${(c.peso * c.valor).toFixed(1)} pts`}>
              <span className="text-gray-400">{c.rotulo}</span>
              <span className="text-white font-semibold tabular-nums">
                {c.valor.toFixed(0)} <span className="text-gray-600 text-[10px]">×{(c.peso*100).toFixed(0)}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Descrição abaixo */}
      <p className="text-gray-500 text-[11px] mt-4 leading-relaxed">
        Score 0–100 que combina <strong className="text-gray-300">distância ao gatilho LWS</strong> (40%),{" "}
        <strong className="text-gray-300">prob. HMM de regime extremo em 7d</strong> (25%),{" "}
        <strong className="text-gray-300">severidade da Onda Branco</strong> (20%) e{" "}
        <strong className="text-gray-300">anomalia de precipitação 30d</strong> (15%). Calibrado pelo IBI.
      </p>
    </div>
  );
}
