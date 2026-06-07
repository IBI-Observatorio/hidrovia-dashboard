// Módulo 3 — Risco Institucional. Matriz viva (5 vetores) + leitura agregada.
// Render puro (server). Para o piloto (com `risk` sourced) mostra a matriz
// completa; para ativos parciais, cai numa leitura leve a partir da maturação.

import { ShieldAlert, Info } from "lucide-react";
import type { RiskVector } from "@/lib/dcf/types";
import { GATES, GATE_INFO, posturaRisco, POSTURA_INFO } from "@/lib/radar/risk";
import type { MaturacaoSeed } from "@/lib/radar/maturation";
import GradientBullet from "@/components/radar/GradientBullet";

export default function RiskMatrix({
  risk,
  maturacao,
}: {
  risk?: RiskVector;
  maturacao?: MaturacaoSeed;
}) {
  // ── ativo parcial: sem vetor de risco sourced → leitura leve da maturação ──
  if (!risk) {
    // gateRisk (baixo|medio|alto) mapeia direto na postura de risco (mesmos níveis).
    const reg = maturacao ? POSTURA_INFO[maturacao.gateRisk] : null;
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-ouro" />
          <h3 className="text-xl font-bold text-white">Risco Institucional</h3>
        </header>
        <div className="rounded-2xl border border-dashed border-white/15 bg-azul-medio/50 p-6">
          <p className="text-sm text-gray-400">
            Vetor de risco detalhado (STF/TCU/Ambiental/Concessionária/Modelagem) ainda não
            mapeado para este ativo (parcial). Leitura institucional a partir da maturação:
          </p>
          {maturacao && reg && (
            <div className="mt-4">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${reg.bg} ${reg.txt}`}>
                Gate risk: {maturacao.gateRisk}
              </span>
              {maturacao.drivers && (
                <ul className="mt-4 space-y-2">
                  {maturacao.drivers.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-gray-300">
                      <GradientBullet />
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const postura = posturaRisco(risk);
  const pi = POSTURA_INFO[postura];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-ouro" />
          <h3 className="text-xl font-bold text-white">Risco Institucional</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${pi.bg} ${pi.txt}`}>
          {pi.label}
        </span>
      </header>

      {/* heat strip — matriz viva compacta */}
      <section className="rounded-2xl border border-white/10 bg-azul-medio p-5">
        <div className="grid grid-cols-5 gap-2">
          {GATES.map((g) => {
            const gi = GATE_INFO[risk[g.key]] ?? GATE_INFO.na;
            return (
              <div key={g.key} className="text-center">
                <div className={`mx-auto mb-2 h-2 w-full rounded-full`} style={{ background: gi.dot }} />
                <p className="text-[11px] font-medium text-white">{g.label}</p>
                <p className={`text-[10px] ${gi.txt}`}>{gi.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* matriz detalhada com notas */}
      <section className="space-y-2">
        {GATES.map((g) => {
          const gi = GATE_INFO[risk[g.key]] ?? GATE_INFO.na;
          const nota = risk.notes?.[g.key];
          return (
            <div key={g.key} className={`rounded-xl border ${gi.bg} p-4`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">{g.label}</span>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${gi.txt}`}>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: gi.dot }} />
                  {gi.label}
                </span>
              </div>
              {nota && <p className="mt-2 text-[12px] leading-snug text-gray-300">{nota}</p>}
            </div>
          );
        })}
      </section>

      <footer className="flex items-start gap-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-gray-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-600" />
        <span>
          Status dos gates curados de fontes públicas (STF, TCU, IBAMA/ANTT). A leitura agregada é
          saída de modelo (ponderação de severidade), ilustrativa.
        </span>
      </footer>
    </div>
  );
}
