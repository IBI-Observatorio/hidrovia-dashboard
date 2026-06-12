// Módulo 1 do Radar — esteira de maturação + P(leilão por ano).
// Componente de render puro (sem estado): pode rodar no server. O ESTÁGIO é dado
// público (sourced no seed); a curva de probabilidade é saída de modelo (rotulada).

import { Info, CircleCheck, CircleDot, Circle } from "lucide-react";
import {
  ESTAGIOS,
  REGIME_INFO,
  pLeilaoPorAno,
  medianaCruzamento,
  classificaRegime,
  type MaturacaoSeed,
} from "@/lib/radar/maturation";
import { pct } from "@/lib/radar/format";
import GradientBullet from "@/components/radar/GradientBullet";

export default function MaturationRail({
  maturacao,
  anoBase = 2026,
  pEstruturaFecha,
  fonteLabel,
  fonteUrl,
}: {
  maturacao: MaturacaoSeed & { fonte?: { label: string; url?: string; date?: string } };
  anoBase?: number;
  pEstruturaFecha?: number; // 1 − P(spread<0) do DCF; undefined p/ ativos parciais
  fonteLabel?: string;
  fonteUrl?: string;
}) {
  const temDCF = typeof pEstruturaFecha === "number";
  const anos = [2026, 2027, 2028, 2029, 2030, 2031, 2032];
  const pontos = pLeilaoPorAno(maturacao, anos, anoBase, pEstruturaFecha ?? 1);
  const regime = classificaRegime(maturacao, pEstruturaFecha ?? 1);
  const rs = REGIME_INFO[regime];
  const medOcorre = medianaCruzamento(pontos, "pOcorre");
  const medAtrativo = medianaCruzamento(pontos, "pAtrativo");

  // chart geometry
  const W = 560, H = 170, padX = 34, padY = 18;
  const x = (i: number) => padX + (i / (anos.length - 1)) * (W - 2 * padX);
  const y = (p: number) => H - padY - p * (H - 2 * padY);
  const linha = (campo: "pOcorre" | "pAtrativo") =>
    pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p[campo])}`).join(" ");

  return (
    <div className="space-y-8">
      {/* cabeçalho + regime */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Radar de Maturação</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Posição no pipeline de concessão e probabilidade de leilão por ano. O estágio é
            público; a curva é saída de modelo.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${rs.bg} ${rs.txt}`}>
          Regime: {rs.label}
        </span>
      </header>

      {/* esteira de 5 estágios */}
      <section className="rounded-2xl border border-white/10 bg-azul-medio p-5">
        <div className="flex items-center justify-between gap-1">
          {ESTAGIOS.map((est, i) => {
            const done = i < maturacao.estagioAtual;
            const atual = i === maturacao.estagioAtual;
            const Icon = done ? CircleCheck : atual ? CircleDot : Circle;
            const cor = done ? "text-ibi-green" : atual ? "text-ouro" : "text-gray-600";
            return (
              <div key={est} className="flex flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <span className={`h-px flex-1 ${i === 0 ? "opacity-0" : done || atual ? "bg-ibi-green/40" : "bg-white/10"}`} />
                  <Icon className={`mx-1 h-5 w-5 shrink-0 ${cor}`} />
                  <span className={`h-px flex-1 ${i === ESTAGIOS.length - 1 ? "opacity-0" : done ? "bg-ibi-green/40" : "bg-white/10"}`} />
                </div>
                <span className={`mt-1.5 text-[11px] ${atual ? "font-semibold text-white" : "text-gray-500"}`}>
                  {est}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* P(leilão por ano) */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-azul-medio to-gray-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h4 className="text-sm font-semibold text-white">Probabilidade de leilão por ano</h4>
          <span className="inline-flex items-center gap-1 rounded-full border border-ouro/30 bg-ouro/10 px-2 py-0.5 text-[10px] font-medium text-ouro">
            <Info className="h-3 w-3" /> saída de modelo · ilustrativo
          </span>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_200px]">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Curvas de probabilidade de leilão">
            {[0, 0.25, 0.5, 0.75, 1].map((g) => (
              <g key={g}>
                <line x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="#374151" strokeWidth={0.5} />
                <text x={4} y={y(g) + 3} fill="#6b7280" fontSize={8}>{pct(g, 0)}</text>
              </g>
            ))}
            {anos.map((a, i) => (
              <text key={a} x={x(i)} y={H - 4} fill="#6b7280" fontSize={8} textAnchor="middle">{a}</text>
            ))}
            {/* P(ocorre) — gates institucionais */}
            <path d={linha("pOcorre")} fill="none" stroke="#0099d8" strokeWidth={2} />
            {/* P(atrativo) — × estrutura fecha (só com DCF); dashed quando estrutura raramente fecha */}
            {temDCF && (
              <path
                d={linha("pAtrativo")}
                fill="none"
                stroke="#00a652"
                strokeWidth={pEstruturaFecha! >= 0.15 ? 2 : 1.5}
                strokeDasharray={pEstruturaFecha! < 0.15 ? "4 3" : undefined}
                opacity={pEstruturaFecha! >= 0.15 ? 1 : 0.6}
              />
            )}
          </svg>

          <div className="space-y-2 text-[11px]">
            <p className="flex items-center gap-1.5 text-gray-300">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#0099d8" }} />
              Gates liberam · mediana <strong className="text-white">{medOcorre ?? "—"}</strong>
            </p>
            {temDCF ? (
              medAtrativo != null ? (
                <p className="flex items-center gap-1.5 text-gray-300">
                  <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#00a652" }} />
                  Leilão atrativo (×{pct(pEstruturaFecha!, 0)} estrutura) · mediana{" "}
                  <strong className="text-white">{medAtrativo}</strong>
                </p>
              ) : (
                <div className="rounded-md border border-ouro/25 bg-ouro/10 px-2.5 py-2 text-[10px] leading-snug text-ouro">
                  <strong>P(estrutura fecha) = {pct(pEstruturaFecha!, 0)}</strong> — leilão
                  atrativo fora do horizonte modelado (2026–2032)
                </div>
              )
            ) : (
              <p className="text-gray-500">
                Dimensão econômica não modelada — ativo parcial. Só a trajetória institucional
                é exibida.
              </p>
            )}
            {maturacao.leilaoAnunciado != null && (
              <p className="text-gray-500">Leilão anunciado: <strong className="text-gray-300">{maturacao.leilaoAnunciado}</strong></p>
            )}
          </div>
        </div>
      </section>

      {/* drivers */}
      {maturacao.drivers && maturacao.drivers.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-azul-medio p-5">
          <h4 className="mb-3 text-sm font-semibold text-white">Drivers de maturação</h4>
          <ul className="space-y-2">
            {maturacao.drivers.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-gray-300">
                <GradientBullet />
                {d}
              </li>
            ))}
          </ul>
          {(fonteLabel || maturacao.fonte) && (
            <p className="mt-3 text-[10px] text-gray-500">
              Fonte: {fonteLabel ?? maturacao.fonte?.label}
              {(fonteUrl ?? maturacao.fonte?.url) ? " · público" : ""}
            </p>
          )}
        </section>
      )}

      <footer className="border-t border-white/10 pt-4 text-[11px] leading-relaxed text-gray-500">
        A P(leilão) é saída de modelo: combina a liberação dos gates institucionais (estágio +
        risco) com a P(estrutura fechar) do Monte Carlo do motor DCF — "leilão atrativo só quando
        a estrutura fecha E os gates liberam". Ilustrativo; não é recomendação de investimento.
      </footer>
    </div>
  );
}
