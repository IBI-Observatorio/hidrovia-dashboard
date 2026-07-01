"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useCountUp } from "@/components/home/metric-utils";
import {
  decomposicaoParaRota,
  paginaCopy,
  comoLer,
  insightFinal,
  AVISO_ILUSTRATIVO,
  type CamadaCusto,
  type RotaAncora,
  type CadaRealData,
} from "@/lib/aereo-cada-real";

// id do gradiente verde→azul usado na fatia "margem da companhia"
const MARGEM_GRAD_ID = "aereoMargemGrad";

// ── formatters ────────────────────────────────────────────────────────────────

/** "1420" → "1.420" (o count-up devolve string sem separador de milhar). */
function comMilhar(s: string) {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fmtPct(v: number) {
  const dec = Number.isInteger(+v.toFixed(1)) ? 0 : 1;
  return `${v.toFixed(dec).replace(".", ",")}%`;
}

function fmtReais(v: number) {
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

// ── tooltip da barra empilhada ────────────────────────────────────────────────

function TooltipCamada({ active, payload, camadas, tarifa }: any) {
  if (!active || !payload?.length) return null;
  // payload traz todas as fatias; destaca a que está sob o cursor não é trivial
  // no stacked — mostramos a lista completa, padrão de leitura do gráfico.
  return (
    <div className="min-w-[230px] rounded-xl border border-white/10 bg-[#111827] p-3 text-xs shadow-xl">
      <p className="mb-2 font-semibold text-white">Composição da tarifa</p>
      <div className="space-y-1">
        {camadas.map((c: CamadaCusto) => (
          <div key={c.id} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-gray-400">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: c.cor, border: c.id === "leasingEManutencao" ? "1px solid rgba(255,255,255,0.3)" : undefined }}
              />
              {c.label}
            </span>
            <span className="whitespace-nowrap tabular-nums text-white">
              {fmtPct(c.percentual)} · {fmtReais((c.percentual / 100) * tarifa)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── mini-card por camada ──────────────────────────────────────────────────────

function CamadaCard({ camada, tarifa }: { camada: CamadaCusto; tarifa: number }) {
  const [open, setOpen] = useState(false);
  const valor = useCountUp((camada.percentual / 100) * tarifa, 0);
  const isMargem = camada.id === "margemCia";
  const isLeasing = camada.id === "leasingEManutencao";

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-azul-medio p-5 text-left transition-all hover:-translate-y-0.5 hover:border-white/20"
    >
      <span
        className={`absolute inset-x-0 top-0 h-[3px] ${isMargem ? "bg-gradient-to-r from-ibi-green to-ibi-blue" : ""}`}
        style={
          isMargem
            ? undefined
            : { background: camada.cor, borderBottom: isLeasing ? "1px solid rgba(255,255,255,0.2)" : undefined }
        }
      />

      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-gray-400">
          {camada.label}
        </p>
        {camada.destaque && (
          <span className="shrink-0 rounded border border-ibi-green/40 bg-ibi-green/10 px-1.5 py-0.5 text-[0.56rem] font-extrabold uppercase tracking-[0.1em] text-ibi-green">
            {camada.destaque}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-extrabold tracking-tight text-white">
          R$ {comMilhar(valor)}
        </span>
        <span className="text-sm font-semibold text-gray-400">
          {fmtPct(camada.percentual)}
        </span>
      </div>

      <p className="mt-2 text-[0.8rem] leading-[1.45] text-gray-500">
        {camada.descricaoCurta}
      </p>

      <div
        className={`grid transition-all duration-300 group-hover:mt-3 group-hover:grid-rows-[1fr] group-hover:opacity-100 ${open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="mt-0.5 shrink-0 rounded border border-ibi-blue/35 px-1.5 py-0.5 text-[0.56rem] font-extrabold uppercase tracking-[0.1em] text-ibi-blue">
              Insight
            </span>
            <p className="text-[0.78rem] leading-[1.5] text-[#cdd3da]">{camada.insight}</p>
          </div>
        </div>
      </div>

      <span className="mt-2.5 block text-[0.64rem] uppercase tracking-[0.08em] text-gray-600 group-hover:hidden">
        {open ? "ocultar leitura" : "ver leitura"}
      </span>
    </button>
  );
}

// ── bloco colapsável "Como ler este número" ──────────────────────────────────

function ComoLer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-white/10 bg-azul-medio">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-6 py-4 text-left text-[0.78rem] font-bold uppercase tracking-[0.12em] text-gray-300 transition-colors hover:text-white"
      >
        <span>{comoLer.titulo}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 px-6 py-5 text-[0.86rem] leading-relaxed text-gray-400">
          {comoLer.paragrafos.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <div>
            <p className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-gray-500">
              Fontes previstas
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {comoLer.fontes.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
          <p className="border-t border-white/10 pt-3 text-[0.78rem] text-gray-500">
            {comoLer.aviso}
          </p>
        </div>
      )}
    </div>
  );
}

// ── componente principal ──────────────────────────────────────────────────────

export default function CadaRealClient({ dados }: { dados: CadaRealData }) {
  const [rotaId, setRotaId] = useState<string>(dados.rotas[0].id);
  const rota: RotaAncora = dados.rotas.find((r) => r.id === rotaId)!;
  const camadas = useMemo(
    () => decomposicaoParaRota(dados.decomposicao, rota.regiao, dados.ajusteNorteCombustivelPP),
    [dados, rota.regiao]
  );
  const ilustrativo = dados.tarifas.dadosIlustrativos;

  const tarifaFmt = useCountUp(rota.tarifaMedia, 0);

  // uma linha só: cada camada vira uma série do stacked bar
  const barData = useMemo(
    () => [
      Object.fromEntries([
        ["name", "composicao"],
        ...camadas.map((c) => [c.id, c.percentual]),
      ]),
    ],
    [camadas]
  );

  const reveal = {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.5 },
  } as const;

  return (
    <main className="mx-auto max-w-screen-xl space-y-8 px-4 py-10 md:px-6">
      {/* ── header ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Link
          href="/"
          className="mb-1 inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
          <span>{paginaCopy.breadcrumb[0]}</span>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400">{paginaCopy.breadcrumb[1]}</span>
        </div>
        <h1 className="text-[clamp(1.6rem,3.2vw,2.4rem)] font-bold leading-tight">
          <span className="bg-gradient-to-r from-ibi-green to-ibi-blue bg-clip-text text-transparent">
            {paginaCopy.titulo}
          </span>
        </h1>
        <p className="max-w-2xl text-sm text-gray-400">{paginaCopy.subtitulo}</p>
        {ilustrativo && (
          <p className="text-xs text-gray-600">{AVISO_ILUSTRATIVO}</p>
        )}
      </div>

      {/* ── seletor de rota ─────────────────────────────────────────────── */}
      <motion.div {...reveal} className="space-y-1.5 rounded-xl border border-white/10 bg-azul-medio p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
          {paginaCopy.labelSeletor}
        </p>
        <div className="flex flex-wrap gap-2">
          {dados.rotas.map((r) => (
            <button
              key={r.id}
              onClick={() => setRotaId(r.id)}
              title={`${r.origem} → ${r.destino}`}
              className={[
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                r.id === rotaId
                  ? "border-ibi-blue bg-ibi-blue/15 text-white"
                  : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white",
              ].join(" ")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── hero: tarifa média ──────────────────────────────────────────── */}
      <motion.div
        {...reveal}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-azul-medio p-7"
      >
        <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ibi-green to-ibi-blue" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-gray-400">
              {rota.origem} <span className="text-gray-600">→</span> {rota.destino}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="text-[clamp(2.8rem,7vw,4.4rem)] font-extrabold leading-[0.9] tracking-tighter text-white">
                R$ {comMilhar(tarifaFmt)}
              </span>
              <span className="pb-1 text-sm font-medium text-gray-400">
                {paginaCopy.labelTarifa}
              </span>
            </div>
          </div>
          <div className="text-right text-[0.66rem] uppercase leading-[1.4] tracking-[0.04em] text-gray-500">
            Tarifa doméstica · ida<br />ANAC (a integrar)
          </div>
        </div>

        {/* ── barra empilhada (desktop) ─────────────────────────────────── */}
        <p className="mb-2 mt-8 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
          {paginaCopy.labelBarra}
        </p>

        <div className="hidden sm:block">
          <ResponsiveContainer width="100%" height={92}>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 4, right: 0, bottom: 4, left: 0 }}
              barSize={52}
            >
              <defs>
                <linearGradient id={MARGEM_GRAD_ID} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00A652" />
                  <stop offset="100%" stopColor="#0099D8" />
                </linearGradient>
              </defs>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={<TooltipCamada camadas={camadas} tarifa={rota.tarifaMedia} />}
              />
              {camadas.map((c, i) => (
                <Bar
                  key={c.id}
                  dataKey={c.id}
                  stackId="preco"
                  fill={c.id === "margemCia" ? `url(#${MARGEM_GRAD_ID})` : c.cor}
                  stroke={c.id === "leasingEManutencao" ? "rgba(255,255,255,0.2)" : undefined}
                  radius={
                    i === 0
                      ? [8, 0, 0, 8]
                      : i === camadas.length - 1
                        ? [0, 8, 8, 0]
                        : undefined
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.7rem] text-gray-500">
            {camadas.map((c) => (
              <span key={c.id} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: c.id === "margemCia" ? "linear-gradient(90deg,#00A652,#0099D8)" : c.cor,
                    border: c.id === "leasingEManutencao" ? "1px solid rgba(255,255,255,0.3)" : undefined,
                  }}
                />
                {c.label} · <span className="tabular-nums text-gray-400">{fmtPct(c.percentual)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── camadas em layout vertical (mobile) ───────────────────────── */}
        <div className="space-y-3 sm:hidden">
          {camadas.map((c) => (
            <div key={c.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[0.72rem]">
                <span className="text-gray-400">{c.label}</span>
                <span className="tabular-nums font-semibold text-white">{fmtPct(c.percentual)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${c.percentual}%`,
                    background:
                      c.id === "margemCia" ? "linear-gradient(90deg,#00A652,#0099D8)" : c.cor,
                    border: c.id === "leasingEManutencao" ? "1px solid rgba(255,255,255,0.2)" : undefined,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {ilustrativo && (
          <div className="mt-5 border-t border-white/10 pt-2.5 text-[0.7rem] text-gray-500">
            {AVISO_ILUSTRATIVO}
          </div>
        )}
      </motion.div>

      {/* ── mini-cards por camada ───────────────────────────────────────── */}
      <motion.div {...reveal} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {camadas.map((c) => (
          <CamadaCard key={`${rota.id}-${c.id}`} camada={c} tarifa={rota.tarifaMedia} />
        ))}
      </motion.div>

      {/* ── como ler este número ────────────────────────────────────────── */}
      <motion.div {...reveal}>
        <ComoLer />
      </motion.div>

      {/* ── insight final ───────────────────────────────────────────────── */}
      <motion.div
        {...reveal}
        className="flex items-start gap-2.5 rounded-2xl border border-white/10 bg-ibi-green/[0.05] p-5"
      >
        <span className="mt-0.5 shrink-0 rounded border border-ibi-green/30 px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.1em] text-ibi-green">
          Insight
        </span>
        <p className="text-[0.92rem] leading-[1.6] text-[#cdd3da]">{insightFinal}</p>
      </motion.div>
    </main>
  );
}
