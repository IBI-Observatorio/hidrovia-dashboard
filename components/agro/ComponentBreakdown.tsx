"use client";

// ComponentBreakdown — decomposição do IEE em pilares F/T/S/(H).
// LAYOUT FIXO: todos os pilares do corredor selecionado visíveis ao mesmo
// tempo (3 colunas Santos/Paranaguá · 4 colunas Arco Norte · empilha no
// mobile). Sem rotação automática, sem timer, sem bullets de paginação — só
// as tabs de corredor navegam (manual).
//
// Cada pilar é um card compacto: cabeçalho (nome + ícone) → valor bruto em
// destaque → pílula de variação ▲▼ → barra de faixa colorida (percentil) →
// uma linha de interpretação → rótulos de status/fonte. A explicação longa
// vira tooltip (clique no ícone) e a decomposição do custo do T vira expand.
//
// Nenhum número é calculado aqui — percentis, deltas e valores chegam prontos
// de lib/agro-content.ts. Copy de lib/agro-copy.ts.

import { useState } from "react";
import { motion } from "framer-motion";
import { Ship, Truck, Wheat, Waves, Info, ChevronDown, type LucideIcon } from "lucide-react";
import { useCountUp } from "@/components/home/HeroStat";
import CorridorTabs from "./CorridorTabs";
import { agroCopy } from "@/lib/agro-copy";
import { faixaIEE, type FaixaIEE } from "@/lib/iee";
import type { CorredorAgroData, SerieComponenteAgro, StatusPilar } from "@/lib/agro-content";
import type { Corredor, ComponenteIEE } from "@/lib/iee";

// Ícone discreto por pilar (lucide — já usado no repo).
const ICONE: Record<ComponenteIEE, LucideIcon> = { F: Ship, T: Truck, S: Wheat, H: Waves };

// Classes estáticas por status (Tailwind não resolve classe dinâmica).
const STATUS_CLASSES: Record<StatusPilar, string> = {
  real: "border-ibi-green/30 bg-ibi-green/10 text-ibi-green",
  modelado: "border-ibi-blue/30 bg-ibi-blue/10 text-ibi-blue",
  ilustrativo: "border-white/15 bg-white/5 text-gray-400",
  indisponivel: "border-vermelho/30 bg-vermelho/10 text-vermelho",
};

// Cor do texto da faixa do IEE (apenas tokens do globals.css).
const FAIXA_TEXTO: Record<FaixaIEE["token"], string> = {
  "ibi-green": "text-ibi-green",
  "ibi-blue": "text-ibi-blue",
  ouro: "text-ouro",
  vermelho: "text-vermelho",
};

// Grid responsivo: empilha no mobile, abre conforme o nº de pilares.
const GRID_POR_N: Record<number, string> = {
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

function StatusBadge({ status }: { status: StatusPilar }) {
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[0.62rem] font-semibold ${STATUS_CLASSES[status]}`}>
      {agroCopy.breakdown.statusPilar[status]}
    </span>
  );
}

// Pílula de variação semanal — direção de ESTRESSE:
// d > 0 (mais fila/custo/pressão/risco) = piora → ▲ vermelho
// d < 0 (menos) = melhora → ▼ verde
function DeltaPill({ serie }: { serie: SerieComponenteAgro }) {
  const copy = agroCopy.breakdown;
  const comp = copy.componentes[serie.componente];
  const d = serie.deltaSemanal;

  if (d === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-gray-400">
        → {copy.labelEstavel}
      </span>
    );
  }

  const piora = d > 0;
  const mag = `${comp.deltaPrefixo}${String(Math.abs(d)).replace(".", ",")}${comp.deltaSufixo}`;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
        piora
          ? "border-vermelho/30 bg-vermelho/10 text-vermelho"
          : "border-ibi-green/30 bg-ibi-green/10 text-ibi-green"
      }`}
    >
      {piora ? "▲" : "▼"} {mag}
    </span>
  );
}

// Barra de faixa 0–100 (substitui o numerão 100/100): trilha fina, preenchida
// até o percentil na COR da faixa do IEE, com marcador e rótulo pequeno.
function FaixaBar({ percentil }: { percentil: number }) {
  const copy = agroCopy.breakdown;
  const faixa = faixaIEE(percentil);
  const pct = Math.max(0, Math.min(100, percentil));
  return (
    <div>
      <div className="relative h-1.5 w-full rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: faixa.hex }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-azul-medio"
          style={{ left: `${pct}%`, backgroundColor: faixa.hex }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[0.66rem] text-gray-500">
          {copy.labelBarraPercentil} {Math.round(percentil)}
        </span>
        <span className={`text-[0.62rem] font-semibold ${FAIXA_TEXTO[faixa.token]}`}>
          {faixa.label}
        </span>
      </div>
    </div>
  );
}

// Decomposição do custo do T — fechada por padrão, abre em expand.
function DecomposicaoT({ serie }: { serie: SerieComponenteAgro }) {
  const copy = agroCopy.breakdown;
  const [aberto, setAberto] = useState(false);
  const dec = serie.decomposicaoCusto;
  if (!dec) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-ibi-blue hover:text-white"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`} />
        {aberto ? copy.labelOcultarDecomposicao : copy.labelVerDecomposicao}
      </button>

      {aberto && (
        <ul className="mt-2 space-y-1 rounded-lg bg-black/25 p-2.5">
          {(["combustivel", "variavel", "fixo", "pedagio"] as const).map((k) => (
            <li key={k} className="flex items-center justify-between gap-3 text-[0.72rem]">
              <span className="text-gray-400">{copy.decomposicaoT[k]}</span>
              <span className="flex items-center gap-2">
                <span
                  className="h-1 rounded-full bg-gradient-to-r from-ibi-green to-ibi-blue"
                  style={{ width: `${Math.max(6, (dec[k] / serie.valorAtual) * 90)}px` }}
                />
                <span className="w-10 text-right font-bold tabular-nums text-gray-300">
                  {dec[k].toFixed(0)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricCard({ serie }: { serie: SerieComponenteAgro }) {
  const copy = agroCopy.breakdown;
  const comp = copy.componentes[serie.componente];
  const Icone = ICONE[serie.componente];
  const [showInfo, setShowInfo] = useState(false);

  // H exibe a contagem regressiva do calado; demais, o valor bruto da semana.
  const ehH = serie.componente === "H";
  const valorNum = ehH ? serie.diasAteCalado ?? 0 : serie.valorAtual;
  const criticoH = ehH && (serie.diasAteCalado ?? 0) <= 0;
  const decimais = Number.isInteger(valorNum) ? 0 : 1;
  const valorAnim = useCountUp(criticoH ? 0 : valorNum, decimais);

  // Leitura curta: o H alterna entre "calha cheia" (urgência baixa) e
  // "contagem regressiva ativa" (urgência alta).
  const leituraCurta =
    ehH && (serie.urgenciaCalado ?? 0) >= 50
      ? copy.componentes.H.leituraCurtaContagem
      : comp.leituraCurta;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
    >
      {/* a. CABEÇALHO — nome humano + ícone discreto + info */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icone className="h-4 w-4 shrink-0 text-ibi-blue" aria-hidden />
          <h3 className="text-sm font-bold text-white">{comp.nome}</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          aria-expanded={showInfo}
          aria-label={copy.labelInfo}
          className="shrink-0 text-gray-500 transition-colors hover:text-white"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      {showInfo && (
        <p className="rounded-lg bg-black/30 p-2.5 text-[0.7rem] leading-relaxed text-gray-300">
          {comp.leitura}
        </p>
      )}

      {/* b. VALOR BRUTO em destaque médio */}
      <div>
        <div className="flex items-baseline gap-1">
          {criticoH ? (
            <span className="text-2xl font-extrabold tracking-tight text-white">
              {copy.componentes.H.valorEstadoCritico}
            </span>
          ) : (
            <>
              <span className="text-3xl font-extrabold tabular-nums tracking-tight text-white">
                {comp.valorPrefixo}
                {valorAnim}
              </span>
              {comp.valorSufixo && (
                <span className="text-sm font-semibold text-gray-400">{comp.valorSufixo}</span>
              )}
            </>
          )}
        </div>
        <p className="mt-0.5 text-[0.7rem] text-gray-500">{comp.valorDescricao}</p>
      </div>

      {/* c. PÍLULA DE VARIAÇÃO semanal */}
      <div className="flex flex-wrap items-center gap-2">
        <DeltaPill serie={serie} />
        <span className="text-[0.66rem] text-gray-500">{copy.labelDelta}</span>
      </div>

      {/* d. BARRA DE FAIXA colorida (substitui o numerão) */}
      <FaixaBar percentil={serie.percentilAtual} />

      {/* e. UMA LINHA de interpretação */}
      <p className="text-[0.78rem] leading-snug text-gray-400">{leituraCurta}</p>

      {/* decomposição do custo (só T) — expand, não inline */}
      {serie.decomposicaoCusto && <DecomposicaoT serie={serie} />}

      {/* f. RÓTULOS de status + fonte */}
      <div className="mt-auto flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={serie.status} />
          {serie.calibracaoEmConstrucao && (
            <span className="rounded-md border border-ouro/30 bg-ouro/10 px-2 py-0.5 text-[0.62rem] font-semibold text-ouro">
              {copy.labelCalibracao}
            </span>
          )}
        </div>
        <p className="text-[0.62rem] leading-relaxed text-gray-500">
          {serie.status === "ilustrativo"
            ? `${agroCopy.rotuloIlustrativo} · TODO: ${serie.fonteAlvo}`
            : serie.fonte}
        </p>
      </div>
    </motion.div>
  );
}

export default function ComponentBreakdown({
  corredores,
}: {
  corredores: Record<Corredor, CorredorAgroData>;
}) {
  const [corredor, setCorredor] = useState<Corredor>("santos");
  const comps = corredores[corredor].componentes;
  const grid = GRID_POR_N[comps.length] ?? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-azul-medio"
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-ibi-green to-ibi-blue" />
      <div className="p-6">
        <h2 className="text-xl font-bold text-white">{agroCopy.breakdown.titulo}</h2>
        <p className="mt-1 max-w-[640px] text-sm leading-relaxed text-gray-400">
          {agroCopy.breakdown.subtitulo}
        </p>

        <div className="mt-5">
          <CorridorTabs value={corredor} onChange={setCorredor} />
        </div>

        {/* LAYOUT FIXO — todos os pilares do corredor visíveis ao mesmo tempo */}
        <div className={`mt-6 grid gap-4 ${grid}`}>
          {comps.map((c) => (
            <MetricCard key={`${corredor}-${c.componente}`} serie={c} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
