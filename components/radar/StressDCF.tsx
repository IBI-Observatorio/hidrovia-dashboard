"use client";

// Módulo 2 do Radar — Estresse RCF sobre o motor DCF real (Build Brief §4).
// Substitui a interpolação do mock por um fluxo de caixa completo:
//   • Cenário Oficial (tarifa calibrada → TIR ≈ WACC)
//   • Cenário Realista (uplift implícito de CAPEX → TIR ≈ 11,04%)
//   • Cenário Custom (premissas editáveis, recalculado ao vivo)
//   • Monte Carlo da classe de referência → distribuição de TIR + P(spread<0)
//   • Furo de funding (TCU) e sensibilidade às alavancas
//
// Todo número carrega `source` (citável) ou é rotulado "saída de modelo ·
// ilustrativo". Probabilidades NÃO são recomendação de investimento.

import { useMemo, useState } from "react";
import { AlertTriangle, Info, TrendingDown } from "lucide-react";
import type { Asset, Levers, Num } from "@/lib/dcf/types";
import { LEVERS_NEUTROS } from "@/lib/dcf/types";
import { paramsFromAsset, tirCenario, buildCashflow } from "@/lib/dcf/cashflow";
import { calibrarOficial, calibrarRealista, slipRealista, distribPadrao } from "@/lib/dcf/referenceClass";
import { runMonteCarlo } from "@/lib/dcf/montecarlo";
import { npv } from "@/lib/dcf/irr";
import { num, pct, sign } from "@/lib/radar/format";
import FundingBar from "@/components/radar/FundingBar";

function FonteTag({ s }: { s?: Num }) {
  const src = s?.source;
  if (!src) return null;
  return (
    <span className="text-[10px] text-gray-500" title={src.url ?? src.label}>
      {src.label}
      {src.date ? ` · ${src.date}` : ""}
    </span>
  );
}

function IlustrativoTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ouro/30 bg-ouro/10 px-2 py-0.5 text-[10px] font-medium text-ouro">
      <Info className="h-3 w-3" /> saída de modelo · ilustrativo
    </span>
  );
}

// ───────────────────────── cartão de cenário ─────────────────────────
function CenarioCard({
  titulo,
  nota,
  tir,
  spread,
  vpl,
  destaque,
}: {
  titulo: string;
  nota?: string;
  tir: number;
  spread: number;
  vpl: number;
  destaque: "oficial" | "realista" | "custom";
}) {
  const cor =
    destaque === "oficial"
      ? "border-ibi-blue/40"
      : destaque === "realista"
        ? "border-ouro/40"
        : spread >= 0
          ? "border-ibi-green/40"
          : "border-vermelho/40";
  const corTir =
    destaque === "oficial"
      ? "text-ibi-blue"
      : destaque === "realista"
        ? "text-ouro"
        : spread >= 0
          ? "text-ibi-green"
          : "text-vermelho";
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${cor} bg-azul-medio p-5`}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ibi-green to-ibi-blue opacity-70" />
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-white">{titulo}</h4>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            spread >= 0
              ? "bg-ibi-green/10 text-ibi-green"
              : "bg-vermelho/10 text-vermelho"
          }`}
        >
          spread {sign(spread)}
        </span>
      </div>
      <p className={`mt-3 text-4xl font-bold tabular-nums ${corTir}`}>{pct(tir)}</p>
      <p className="mt-1 text-xs text-gray-400">TIR · VPL ao WACC {num(vpl, 1)} R$ bi</p>
      {nota && <p className="mt-3 text-[11px] leading-snug text-gray-500">{nota}</p>}
    </div>
  );
}

// ───────────────────────── slider de premissa ─────────────────────────
function Slider({
  label,
  unit,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
  referencia,
}: {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
  referencia?: { label: string; value: number };
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-xs text-gray-300">{label}</label>
        <span className="text-xs font-semibold tabular-nums text-white">
          {fmt(value)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[#00a652]"
      />
      {referencia && (
        <p className="text-[10px] text-gray-500">
          ref. {referencia.label}: {fmt(referencia.value)}
        </p>
      )}
    </div>
  );
}

// ───────────────────────── histograma Monte Carlo ─────────────────────────
function HistogramaTIR({
  hist,
  wacc,
  realista,
  oficial,
}: {
  hist: { bin: number; count: number }[];
  wacc: number;
  realista: number;
  oficial: number;
}) {
  const W = 520;
  const H = 150;
  const pad = 28;
  if (hist.length === 0) return null;
  const maxCount = Math.max(...hist.map((b) => b.count));
  const minX = hist[0].bin;
  const maxX = hist[hist.length - 1].bin;
  const x = (v: number) => pad + ((v - minX) / (maxX - minX)) * (W - 2 * pad);
  const bw = (W - 2 * pad) / hist.length;
  const linha = (v: number, cor: string, rotulo: string) => (
    <g>
      <line x1={x(v)} x2={x(v)} y1={pad - 6} y2={H - pad} stroke={cor} strokeWidth={1.5} strokeDasharray="3 3" />
      <text x={x(v)} y={pad - 9} fill={cor} fontSize={9} textAnchor="middle">
        {rotulo}
      </text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Distribuição de TIR do Monte Carlo">
      {hist.map((b, i) => {
        const h = (b.count / maxCount) * (H - 2 * pad);
        const below = b.bin < wacc;
        return (
          <rect
            key={i}
            x={pad + i * bw + 0.5}
            y={H - pad - h}
            width={Math.max(0.5, bw - 1)}
            height={h}
            fill={below ? "#A0153E" : "#00a652"}
            opacity={0.65}
          />
        );
      })}
      {linha(wacc, "#0099d8", `WACC ${pct(wacc, 1)}`)}
      {linha(realista, "#D4922A", "realista")}
      {linha(oficial, "#9ca3af", "oficial")}
      {/* eixo X */}
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="#374151" strokeWidth={1} />
      <text x={pad} y={H - 8} fill="#6b7280" fontSize={9}>{pct(minX, 0)}</text>
      <text x={W - pad} y={H - 8} fill="#6b7280" fontSize={9} textAnchor="end">{pct(maxX, 0)}</text>
    </svg>
  );
}

// ───────────────────────── componente principal ─────────────────────────
export default function StressDCF({ asset }: { asset: Asset }) {
  const params = useMemo(() => paramsFromAsset(asset), [asset]);
  const tarifaTetoMilTKU = params.tarifaTKU * 1000; // R$/mil TKU oficial

  // Calibração das âncoras + Monte Carlo (reprodutível; não recalcula no slider).
  const base = useMemo(() => {
    const cof = calibrarOficial(params);
    const cre = calibrarRealista(params, cof.levers, {
      slipAnos: slipRealista(asset, params.obraAnos),
    });
    const mc = runMonteCarlo(params, cof.levers, 4000, 42);
    const oficialVpl = npv(params.wacc, buildCashflow(params, cof.levers).fcl);
    const realistaVpl = npv(params.wacc, buildCashflow(params, cre.levers).fcl);
    return { cof, cre, mc, oficialVpl, realistaVpl };
  }, [params]);

  // Operating ratio sourçado do oficial (O&M/receita); o slider ajusta a partir dele.
  const operatingRatio = base.cof.operatingRatio;

  // ── premissas editáveis: "Custom" parte do OFICIAL (estresse a partir dele) ──
  const [tarifa, setTarifa] = useState(tarifaTetoMilTKU);
  const [upliftPct, setUpliftPct] = useState(0);
  const [haircutPct, setHaircutPct] = useState(0);
  const [slip, setSlip] = useState(0);
  const [omPp, setOmPp] = useState(0);
  const [wacc, setWacc] = useState(params.wacc);

  const customLevers: Levers = {
    ...LEVERS_NEUTROS,
    tarifaMult: tarifa / tarifaTetoMilTKU,
    capexUplift: 1 + upliftPct / 100,
    demandaHaircut: 1 - haircutPct / 100,
    slipAnos: slip,
    omAdjPp: omPp / 100, // ajuste do operating ratio (a partir do sourçado)
  };
  const { customTir, customVpl } = useMemo(
    () => ({
      customTir: tirCenario(params, customLevers),
      customVpl: npv(wacc, buildCashflow(params, customLevers).fcl),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, tarifa, upliftPct, haircutPct, slip, omPp, wacc],
  );

  // ── sensibilidade: ΔTIR ao perturbar cada alavanca (a partir do realista) ──
  const d = distribPadrao();
  const sens = useMemo(() => {
    const baseL = base.cre.levers;
    const perturb = (over: Partial<Levers>) =>
      tirCenario(params, { ...baseL, ...over }) - base.cre.tir;
    return [
      { nome: "Uplift CAPEX +1σ", delta: perturb({ capexUplift: baseL.capexUplift * Math.exp(d.upliftSigma) }) },
      { nome: "Haircut demanda −10pp", delta: perturb({ demandaHaircut: baseL.demandaHaircut - 0.1 }) },
      { nome: "Slip +2 anos", delta: perturb({ slipAnos: baseL.slipAnos + 2 }) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, base]);
  const maxAbs = Math.max(...sens.map((s) => Math.abs(s.delta)), 1e-6);

  const mc = base.mc;

  return (
    <div className="space-y-8">
      {/* cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Estresse RCF — Motor DCF</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Fluxo de caixa real sobre os {num(params.prazoAnos, 0)} anos da concessão — com
            tributos (IRPJ+CSLL 34%), depreciação e aporte reais. Cenário oficial da ANTT
            (TIR = WACC = {pct(params.wacc, 2)}) e realista de Frischtak/Amazônia 2030
            (TIR {pct(base.cre.tir, 1)} — retorno ~7× menor).
          </p>
        </div>
        <IlustrativoTag />
      </header>

      {/* cenários */}
      <section className="grid gap-4 md:grid-cols-3">
        <CenarioCard
          titulo="Oficial"
          destaque="oficial"
          tir={base.cof.tir}
          spread={base.cof.tir - params.wacc}
          vpl={base.oficialVpl}
          nota={`ANTT: tarifa-teto R$ ${num(tarifaTetoMilTKU, 2)}/mil TKU; operating ratio ${pct(operatingRatio, 0)} + tributos reais → TIR = WACC = ${pct(params.wacc, 2)} sem botão de fechamento.`}
        />
        <CenarioCard
          titulo="Realista"
          destaque="realista"
          tir={base.cre.tir}
          spread={base.cre.tir - params.wacc}
          vpl={base.realistaVpl}
          nota={`Frischtak/Amazônia 2030 (06/nov/2024): TIR ${pct(base.cre.tir, 1)} (piso pessimista). Emerge da COMBINAÇÃO: CAPEX +${num((base.cre.capexUplift - 1) * 100, 0)}% (mediana da classe de ref.) + execução ${num(params.obraAnos, 0)}→${num(params.obraAnos + base.cre.slipAnos, 0)} anos (slip ${num(base.cre.slipAnos, 0)}a) + haircut de demanda −${num(base.cre.haircutImplicito * 100, 0)}% (resíduo do modelo).`}
        />
        <CenarioCard
          titulo="Custom"
          destaque="custom"
          tir={customTir}
          spread={customTir - wacc}
          vpl={customVpl}
          nota="Ajuste as premissas ao lado para estressar a estrutura."
        />
      </section>

      {/* premissas + sensibilidade */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-azul-medio p-5">
          <h4 className="mb-4 text-sm font-semibold text-white">Premissas (editável)</h4>
          <div className="space-y-4">
            <Slider label="Tarifa" unit="R$/mil TKU" value={tarifa} min={60} max={160} step={0.5}
              fmt={(v) => num(v, 1)} onChange={setTarifa}
              referencia={{ label: "teto oficial", value: tarifaTetoMilTKU }} />
            <Slider label="Uplift de CAPEX" unit="%" value={upliftPct} min={0} max={200} step={1}
              fmt={(v) => num(v, 0)} onChange={setUpliftPct}
              referencia={{ label: "mediana da classe (realista)", value: (base.cre.capexUplift - 1) * 100 }} />
            <Slider label="Haircut de demanda" unit="%" value={haircutPct} min={0} max={50} step={1}
              fmt={(v) => num(v, 0)} onChange={setHaircutPct} />
            <Slider label="Slip de cronograma" unit="anos" value={slip} min={0} max={8} step={1}
              fmt={(v) => num(v, 0)} onChange={setSlip} />
            <Slider label="Operating ratio (O&M)" unit="" value={operatingRatio * 100 + omPp}
              min={45} max={90} step={1}
              fmt={(v) => `${num(v, 0)}%`} onChange={(v) => setOmPp(v - operatingRatio * 100)}
              referencia={{ label: "faixa heavy-haul", value: 65 }} />
            <Slider label="WACC (hurdle)" unit="" value={wacc} min={0.08} max={0.18} step={0.0005}
              fmt={(v) => pct(v, 2)} onChange={setWacc} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-azul-medio p-5">
          <h4 className="mb-1 text-sm font-semibold text-white">Sensibilidade da TIR</h4>
          <p className="mb-4 text-[11px] text-gray-500">ΔTIR a partir do caso realista ({pct(base.cre.tir)})</p>
          <div className="space-y-3">
            {sens.map((s) => {
              const w = (Math.abs(s.delta) / maxAbs) * 100;
              return (
                <div key={s.nome}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-gray-300">{s.nome}</span>
                    <span className="font-semibold tabular-nums text-vermelho">{sign(s.delta)}</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded bg-white/5">
                    <div className="h-2 rounded bg-vermelho/70" style={{ width: `${w}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-ouro/20 bg-ouro/5 p-3 text-[11px] text-gray-400">
            <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ouro" />
            <span>
              O realista combina <strong className="text-gray-300">CAPEX +{num((base.cre.capexUplift - 1) * 100, 0)}%</strong>{" "}
              (mediana da classe de ref.), execução de{" "}
              <strong className="text-gray-300">{num(params.obraAnos, 0)}→{num(params.obraAnos + base.cre.slipAnos, 0)} anos</strong>{" "}
              e <strong className="text-gray-300">haircut de demanda −{num(base.cre.haircutImplicito * 100, 0)}%</strong> (resíduo).
              A TIR de 1,6% (piso Frischtak) EMERGE da combinação — não de uma alavanca única.
            </span>
          </div>
        </div>
      </section>

      {/* Monte Carlo */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-azul-medio to-gray-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">
              Monte Carlo — classe de referência ({mc.n.toLocaleString("pt-BR")} simulações · seed {mc.seed})
            </h4>
            <p className="mt-1 text-[11px] text-gray-500">
              Amostra {`{uplift, haircut, slip}`} das distribuições da classe ferroviária. Reprodutível.
            </p>
          </div>
          <IlustrativoTag />
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_220px]">
          <HistogramaTIR hist={mc.histograma} wacc={params.wacc} realista={base.cre.tir} oficial={base.cof.tir} />
          <div className="space-y-3">
            <div className="rounded-xl border border-vermelho/30 bg-vermelho/10 p-3">
              <p className="text-[11px] text-gray-400">P(spread &lt; 0)</p>
              <p className="text-2xl font-bold tabular-nums text-vermelho">{pct(mc.pSpreadNeg, 1)}</p>
              <p className="text-[10px] text-gray-500">
                IC95 [{pct(mc.pSpreadNegIC[0], 1)} – {pct(mc.pSpreadNegIC[1], 1)}]
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { l: "P5", v: mc.tirP5 },
                { l: "Mediana", v: mc.tirMediana },
                { l: "P95", v: mc.tirP95 },
              ].map((s) => (
                <div key={s.l} className="rounded-lg border border-white/10 bg-azul-medio p-2">
                  <p className="text-[10px] text-gray-500">{s.l}</p>
                  <p className="text-sm font-semibold tabular-nums text-white">{pct(s.v, 1)}</p>
                </div>
              ))}
            </div>
            {mc.anoBreakevenMediano && (
              <p className="text-[11px] text-gray-400">
                Break-even mediano (VPL ao WACC ≥ 0): <strong className="text-white">{mc.anoBreakevenMediano}</strong>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* furo de funding */}
      {asset.funding && <FundingBar funding={asset.funding} />}

      {/* disclaimer fixo */}
      <footer className="flex items-start gap-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-gray-500">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-600" />
        <span>
          Os pontos âncora (oficial 11,04% e realista 1,6%), o uplift de CAPEX (classe de ref.) e o
          slip de cronograma (execução realista) são <strong>números de fonte citável</strong>; o
          haircut de demanda residual e a distribuição do Monte Carlo são <strong>saída de modelo</strong>,
          ilustrativos. Não constituem recomendação de investimento. Fontes: ANTT (params oficiais,
          WACC, demanda), Frischtak/Amazônia 2030 (06/nov/2024 — TIR realista 1,6%), TCU (furo de
          funding) e classe de referência ferroviária (Flyvbjerg 2002).
        </span>
      </footer>
    </div>
  );
}
