'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from 'recharts';
import { motion } from 'framer-motion';
import { useDashboardData } from '@/components/antaq/useDashboardData';

// ── tipos ─────────────────────────────────────────────────────────────────────

type NavKey = 'longo' | 'cabotagem' | 'interior';

type Rota = {
  rank: number;
  origem: string; uf_origem: string;
  destino: string; uf_destino: string;
  teu_acumulado: number;
  teu_ultimo_ano: number;
  cagr_pct: number;
  rota_label: string;
};

// ── design tokens ─────────────────────────────────────────────────────────────

const IBI_BLUE  = '#0099d8';
const IBI_GREEN = '#00a652';
const OURO      = '#D4922A';
const VERM      = '#A0153E';

const SEGMENTS: Record<NavKey, {
  api: string;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
}> = {
  longo: {
    api: 'Longo Curso',
    label: 'Longo Curso',
    shortLabel: 'Longo',
    color: IBI_BLUE,
    description: 'Comércio exterior — exportação e importação para portos estrangeiros.',
  },
  cabotagem: {
    api: 'Cabotagem',
    label: 'Cabotagem',
    shortLabel: 'Cab.',
    color: IBI_GREEN,
    description: 'Costa brasileira — fluxos entre portos nacionais (inclui petróleo offshore).',
  },
  interior: {
    api: 'Interior',
    label: 'Navegação Interior',
    shortLabel: 'Interior',
    color: OURO,
    description: 'Hidrovias — rios e lagos navegáveis (Amazônica, Tocantins, Tietê–Paraná).',
  },
};

// Fonte ÚNICA de dados de navegação (gerada por scripts/update_home_cards.py):
// public/data/antaq/dashboard/navegacao-series.json contém:
//   - hero  → totais 12m + share + YoY + sparkline (14 pontos) por categoria
//   - serie → série mensal completa (sum12 Mt) para a área empilhada
type HeroEntry = { label: string; valor_12m: number; share_pct: number; yoy_pct: number | null; spark: number[] };
type NavSerieJson = {
  ultimo_mes: string;
  fonte: string;
  hero: { longo: HeroEntry; cabotagem: HeroEntry; interior: HeroEntry; total_12m: number };
  serie: { data: string; longo: number; cabotagem: number; interior: number }[];
};

// ── rotas/corredores ilustrativos (Longo Curso e Interior) ────────────────────
// LC: 4 países + 3 blocos disponíveis na API. Valores Mt/12m são ilustrativos,
// derivados de proporções típicas do comércio aquaviário brasileiro.
// TODO: substituir por agregação real via /api/v1/series com filtro pais_*/bloco_*.

const ROTAS_LONGO_CURSO = [
  { parceiro: 'China',         direcao: 'Brasil → China',         vol: 312, share: 32.3, tipo: 'export', cor: '#c1322f' },
  { parceiro: 'União Europeia',direcao: 'Brasil ↔ UE',            vol: 178, share: 18.4, tipo: 'misto',  cor: IBI_BLUE },
  { parceiro: 'EUA',           direcao: 'Brasil ↔ EUA',           vol:  92, share:  9.5, tipo: 'misto',  cor: IBI_GREEN },
  { parceiro: 'Argentina',     direcao: 'Brasil ↔ Argentina',     vol:  44, share:  4.6, tipo: 'misto',  cor: OURO },
  { parceiro: 'Mercosul',      direcao: 'Brasil ↔ Mercosul',      vol:  68, share:  7.0, tipo: 'misto',  cor: '#8B5CF6' },
  { parceiro: 'Asean',         direcao: 'Brasil ↔ Asean',         vol:  41, share:  4.2, tipo: 'misto',  cor: '#06B6D4' },
  { parceiro: 'Demais países', direcao: 'Brasil ↔ outros',        vol: 232, share: 24.0, tipo: 'misto',  cor: '#64748B' },
];

// Interior: principais hidrovias brasileiras. Valores Mt/12m ilustrativos
// derivados de relatórios setoriais (Webportos, ANA, ANTAQ).
// TODO: ligar à API com filtro por porto/região.
const ROTAS_INTERIOR = [
  { hidrovia: 'Hidrovia Amazônica',      corredor: 'Madeira–Solimões–Amazonas',     vol: 38.4, share: 38.4, observ: 'Grãos via Miritituba/Itacoatiara; combustíveis para Manaus' },
  { hidrovia: 'Hidrovia Tocantins',      corredor: 'Marabá → Vila do Conde (PA)',    vol: 18.2, share: 18.2, observ: 'Soja, milho e bauxita; eclusas de Tucuruí' },
  { hidrovia: 'Hidrovia Tietê–Paraná',   corredor: 'Anhembi → Itaipu',               vol: 14.6, share: 14.6, observ: 'Soja, milho e cana; conecta SP–PR–MS–GO' },
  { hidrovia: 'Hidrovia Tapajós',        corredor: 'Itaituba → Santarém/Barcarena',  vol: 12.1, share: 12.1, observ: 'Corredor de grãos do MT (Arco Norte)' },
  { hidrovia: 'Hidrovia Paraná–Paraguai',corredor: 'Cáceres → Nueva Palmira',        vol:  9.3, share:  9.3, observ: 'Soja e minério; bandeira BR, AR, PY, UY' },
  { hidrovia: 'Hidrovia São Francisco',  corredor: 'Pirapora → Juazeiro',            vol:  4.1, share:  4.1, observ: 'Operação reduzida; potencial subaproveitado' },
  { hidrovia: 'Demais bacias',           corredor: 'Madeira alto, Negro, Branco…',   vol:  3.3, share:  3.3, observ: 'Capilaridade regional na Amazônia' },
];

// ── formatters ────────────────────────────────────────────────────────────────

const MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function fmtMes(ym: string) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MESES_ABREV[+m - 1]}/${y.slice(2)}`;
}
function fmtMt(v: number, d = 0) {
  if (v == null || isNaN(v)) return '—';
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })} Mt`;
}
function fmtPct(v: number, sign = true) {
  if (v == null || isNaN(v)) return '—';
  const s = sign && v > 0 ? '+' : '';
  return `${s}${v.toFixed(1).replace('.', ',')}%`;
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function NavegacaoPage() {
  const [seg, setSeg] = useState<NavKey>('cabotagem');
  const { data, loading, erro } = useDashboardData(['navegacao-series.json']);
  const nav: NavSerieJson | null = (data as any)?.['navegacao-series'] || null;

  return (
    <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-10 space-y-10">

      {/* header */}
      <div className="space-y-2">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </a>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500 flex-wrap">
          <span>Navegação</span>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400">Tipos e Rotas</span>
        </div>
        <h1 className="text-[clamp(1.5rem,2.8vw,2.1rem)] font-bold leading-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-ibi-green to-ibi-blue">
            Navegação brasileira por tipo
          </span>
        </h1>
        <p className="text-gray-400 text-sm max-w-2xl">
          Como a movimentação aquaviária se divide entre <strong className="text-gray-200">longo curso</strong>,{' '}
          <strong className="text-gray-200">cabotagem</strong> e <strong className="text-gray-200">navegação interior</strong> —
          e quais são as principais rotas em cada modal.
        </p>
        <p className="text-xs text-gray-600">
          {nav?.ultimo_mes ? `${fmtMes(nav.ultimo_mes).toUpperCase()} · 12 meses móveis` : 'Carregando…'} ·{' '}
          {nav?.fonte || 'ANTAQ — Estatística Aquaviária'}
        </p>
      </div>

      {/* hero — 3 cards comparativos */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(SEGMENTS) as NavKey[]).map((k, i) => (
          <HeroCard
            key={k}
            navKey={k}
            data={nav?.hero?.[k] || null}
            ultimoMes={nav?.ultimo_mes}
            active={seg === k}
            onClick={() => setSeg(k)}
            delay={i * 0.05}
          />
        ))}
      </section>

      {/* série temporal — todos os 3 tipos sobrepostos */}
      <CompositionChart serie={nav?.serie || []} ultimoMes={nav?.ultimo_mes} loading={loading} erro={erro} />

      {/* divider sutil */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Principais rotas</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* seletor de modal */}
      <SegmentTabs seg={seg} onChange={setSeg} />

      {/* painel detalhado */}
      {seg === 'longo'     && <PainelLongoCurso />}
      {seg === 'cabotagem' && <PainelCabotagem />}
      {seg === 'interior'  && <PainelInterior />}

      {/* footer info */}
      <div className="flex items-start gap-3 bg-azul-medio/50 border border-white/5 rounded-xl p-4 text-xs text-gray-500">
        <span className="text-base mt-0.5 shrink-0">ℹ️</span>
        <div className="space-y-1">
          <p>
            <strong className="text-gray-400">Série temporal e splits por tipo:</strong> ANTAQ — Estatística Aquaviária (2010–fev/2026), via API do Observatório.{' '}
            <strong className="text-gray-400">Rotas de cabotagem (TEU):</strong> par origem-destino real, base 2010–2025 acumulada.{' '}
            <strong className="text-gray-400">Corredores de longo curso e hidrovias interiores:</strong> volumes ilustrativos
            calibrados por relatórios setoriais — a ligar à agregação direta da API ANTAQ.
          </p>
          <p>Elaboração: Observatório IBI, mai/2026.</p>
        </div>
      </div>
    </main>
  );
}

// ── componentes ───────────────────────────────────────────────────────────────

function HeroCard({
  navKey, data, ultimoMes, active, onClick, delay,
}: {
  navKey: NavKey;
  data: HeroEntry | null;
  ultimoMes?: string;
  active: boolean;
  onClick: () => void;
  delay: number;
}) {
  const seg = SEGMENTS[navKey];
  const positive = (data?.yoy_pct ?? 0) > 0;
  const isLoaded = !!data;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      viewport={{ once: true }}
      className={[
        'text-left rounded-2xl border bg-azul-medio p-5 transition-all overflow-hidden relative',
        active
          ? 'border-white/30 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
          : 'border-white/10 hover:border-white/20',
      ].join(' ')}
      style={{ borderTop: `3px solid ${seg.color}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{seg.label}</p>
          <p className="text-3xl font-bold tracking-tight mt-1" style={{ color: seg.color }}>
            {isLoaded ? fmtMt(data!.valor_12m, 1) : <span className="inline-block h-7 w-24 bg-white/5 rounded animate-pulse" />}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            12 meses até {ultimoMes ? fmtMes(ultimoMes) : '…'}
          </p>
        </div>
        {isLoaded && data!.yoy_pct != null && (
          <span
            className={[
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border shrink-0',
              positive
                ? 'border-ibi-green/30 bg-ibi-green/10 text-ibi-green'
                : 'border-[#A0153E]/30 bg-[#A0153E]/10 text-[#A0153E]',
            ].join(' ')}
          >
            {positive ? '▲' : '▼'} {fmtPct(Math.abs(data!.yoy_pct), false)}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 leading-relaxed">{seg.description}</p>

      {/* share bar */}
      <div className="mt-4 space-y-1">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-gray-500">Participação no total aquaviário</span>
          <span className="text-gray-300 font-semibold">
            {isLoaded ? `${data!.share_pct.toFixed(1).replace('.', ',')}%` : '…'}
          </span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${isLoaded ? data!.share_pct : 0}%`, background: seg.color }}
          />
        </div>
      </div>

      {/* sparkline */}
      {isLoaded && <Sparkline data={data!.spark} color={seg.color} ultimoMes={ultimoMes} />}

      {active && (
        <div
          className="absolute bottom-2 right-3 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: seg.color }}
        >
          ▼ detalhe
        </div>
      )}
    </motion.button>
  );
}

function Sparkline({ data, color, ultimoMes }: { data: number[]; color: string; ultimoMes?: string }) {
  const path = useMemo(() => {
    if (!data?.length) return '';
    const w = 240, h = 36, pad = 2;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const stepX = (w - pad * 2) / (data.length - 1);
    return data.map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [data]);

  // calcula label do "primeiro mês" do sparkline: ultimoMes - (data.length - 1)
  const primeiroLabel = useMemo(() => {
    if (!ultimoMes) return '';
    const [y, m] = ultimoMes.split('-').map(Number);
    const total = y * 12 + (m - 1) - (data.length - 1);
    const py = Math.floor(total / 12), pm = (total % 12) + 1;
    return fmtMes(`${py}-${String(pm).padStart(2,'0')}`);
  }, [ultimoMes, data.length]);

  return (
    <div className="mt-4">
      <svg viewBox="0 0 240 36" className="w-full h-9">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke={`url(#grad-${color})`} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[9px] text-gray-600 mt-1">
        <span>{primeiroLabel}</span>
        <span>{ultimoMes ? fmtMes(ultimoMes) : ''}</span>
      </div>
    </div>
  );
}

function SegmentTabs({ seg, onChange }: { seg: NavKey; onChange: (k: NavKey) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(SEGMENTS) as NavKey[]).map(k => {
        const s = SEGMENTS[k];
        const active = seg === k;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={[
              'px-4 py-2 rounded-full text-sm font-medium border transition-all',
              active ? 'text-white' : 'text-gray-400 border-white/10 hover:text-white hover:border-white/20',
            ].join(' ')}
            style={active ? { background: s.color + '22', borderColor: s.color, color: s.color } : {}}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

// ── série temporal sobreposta ─────────────────────────────────────────────────

function CompositionChart({
  serie, ultimoMes, loading, erro,
}: {
  serie: { data: string; longo: number; cabotagem: number; interior: number }[];
  ultimoMes?: string;
  loading: boolean;
  erro: string | null;
}) {
  // série pré-computada offline pelo script update_home_cards.py
  // (suavizacao=sum12, Mt, jan/2010 → último mês ANTAQ disponível)
  const chartData = serie;

  return (
    <section className="bg-azul-medio border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-white">Composição da navegação brasileira</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Soma móvel 12 meses · Mt · 2010 → {ultimoMes ? fmtMes(ultimoMes) : '…'}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          {(Object.keys(SEGMENTS) as NavKey[]).map(k => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm inline-block" style={{ background: SEGMENTS[k].color }} />
              {SEGMENTS[k].label}
            </span>
          ))}
        </div>
      </div>

      {loading && <LoadingBlock />}
      {erro && <ErrorBlock msg={erro} />}
      {!loading && !erro && chartData.length > 0 && (
        <div className="w-full h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="gl" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%"   stopColor={SEGMENTS.longo.color}     stopOpacity={0.85} />
                  <stop offset="100%" stopColor={SEGMENTS.longo.color}     stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="gc" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%"   stopColor={SEGMENTS.cabotagem.color} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={SEGMENTS.cabotagem.color} stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="gi" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%"   stopColor={SEGMENTS.interior.color}  stopOpacity={0.85} />
                  <stop offset="100%" stopColor={SEGMENTS.interior.color}  stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
              <XAxis
                dataKey="data"
                tickFormatter={fmtMes}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff15' }}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 8))}
              />
              <YAxis
                tickFormatter={(v) => `${v.toFixed(0)} Mt`}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff15' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #4b5563', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(label: any) => fmtMes(String(label))}
                formatter={(v: any, name: any) => [`${Number(v)?.toFixed(1)} Mt`, name as string]}
              />
              <Area type="monotone" stackId="1" dataKey="longo"     stroke={SEGMENTS.longo.color}     strokeWidth={1.5} fill="url(#gl)" name="Longo Curso" />
              <Area type="monotone" stackId="1" dataKey="cabotagem" stroke={SEGMENTS.cabotagem.color} strokeWidth={1.5} fill="url(#gc)" name="Cabotagem"   />
              <Area type="monotone" stackId="1" dataKey="interior"  stroke={SEGMENTS.interior.color}  strokeWidth={1.5} fill="url(#gi)" name="Interior"    />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-[11px] text-gray-600">
        Longo curso responde por <strong className="text-gray-400">~69%</strong> do volume aquaviário brasileiro;
        cabotagem por <strong className="text-gray-400">~24%</strong> (com quase metade em petróleo offshore);
        navegação interior por <strong className="text-gray-400">~7%</strong>.
      </p>
    </section>
  );
}

// ── painel: longo curso ───────────────────────────────────────────────────────

function PainelLongoCurso() {
  const total = ROTAS_LONGO_CURSO.reduce((a, b) => a + b.vol, 0);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      <div className="lg:col-span-2 bg-azul-medio border border-white/10 rounded-2xl p-5 space-y-4" style={{ borderTop: `3px solid ${IBI_BLUE}` }}>
        <div>
          <h3 className="text-base font-semibold text-white">Corredores de longo curso — Brasil ↔ mundo</h3>
          <p className="text-xs text-gray-500 mt-0.5">Volumes ilustrativos por parceiro · base 12m · Mt</p>
        </div>

        <div className="space-y-3">
          {ROTAS_LONGO_CURSO.map((r, i) => (
            <div key={r.parceiro} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-gray-600 shrink-0 w-5">#{i + 1}</span>
                  <span className="text-sm font-medium text-white truncate">{r.parceiro}</span>
                  <span className="text-[11px] text-gray-500 truncate">· {r.direcao}</span>
                </div>
                <span className="text-sm tabular-nums font-semibold shrink-0" style={{ color: r.cor }}>
                  {r.vol} Mt
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.vol / ROTAS_LONGO_CURSO[0].vol) * 100}%` }}
                  transition={{ duration: 0.7, delay: i * 0.04 }}
                  className="h-full rounded-full"
                  style={{ background: r.cor }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-600 pt-2 border-t border-white/5">
          Soma: <strong className="text-gray-400">{total} Mt</strong> · proxies do mix de longo curso brasileiro.
          Série ilustrativa rotulada — a ligar à agregação direta da base ANTAQ via filtro de país/bloco.
        </p>
      </div>

      <aside className="space-y-3">
        <InsightCard
          color={IBI_BLUE}
          eyebrow="Insight"
          title="China concentra ~32% do longo curso"
          body="O eixo Brasil → China — minério de ferro, soja, petróleo — é o principal vetor da balança aquaviária brasileira. Quando a demanda chinesa esfria, a movimentação portuária sente em ~2 meses."
        />
        <InsightCard
          color={IBI_GREEN}
          eyebrow="Antecipação"
          title="Sinal preditivo no PortGDP"
          body="A série de longo curso correlaciona +0,77 com a PIM-PF (IBGE) e antecede a produção industrial em ~2 meses (modelo AR(1) + DFM-1f)."
        />
      </aside>
    </motion.section>
  );
}

// ── painel: cabotagem ─────────────────────────────────────────────────────────

function PainelCabotagem() {
  const { data, loading, erro } = useDashboardData(['rotas.json']);
  const [filtroUF, setFiltroUF] = useState<'todas' | 'AM' | 'SP' | 'PE' | 'CE'>('todas');
  const [topN, setTopN] = useState(15);

  const rotas: Rota[] = ((data as any)?.rotas || []) as Rota[];
  const rotasFiltradas = useMemo(() => {
    let r = rotas;
    if (filtroUF !== 'todas') {
      r = r.filter(x => x.uf_origem === filtroUF || x.uf_destino === filtroUF);
    }
    return r.slice(0, topN).map(x => ({
      ...x,
      _label: `#${x.rank} ${truncate(x.origem, 18)} (${x.uf_origem}) → ${truncate(x.destino, 18)} (${x.uf_destino})`,
      _teu_k: x.teu_acumulado / 1000,
    }));
  }, [rotas, filtroUF, topN]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      <div className="lg:col-span-2 bg-azul-medio border border-white/10 rounded-2xl p-5 space-y-4" style={{ borderTop: `3px solid ${IBI_GREEN}` }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-white">Principais rotas de cabotagem — contêineres (TEU)</h3>
            <p className="text-xs text-gray-500 mt-0.5">Par origem-destino · TEU acumulado 2010–2025</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(['todas','AM','SP','PE','CE'] as const).map(uf => (
              <button
                key={uf}
                onClick={() => setFiltroUF(uf)}
                className={[
                  'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                  filtroUF === uf
                    ? 'bg-ibi-green/15 border-ibi-green/40 text-ibi-green'
                    : 'border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15',
                ].join(' ')}
              >
                {uf === 'todas' ? 'Todas' : uf}
              </button>
            ))}
            <div className="w-px self-stretch bg-white/10 mx-1" />
            {[10, 15, 25].map(n => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                className={[
                  'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                  topN === n
                    ? 'bg-white/10 border-white/25 text-white'
                    : 'border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15',
                ].join(' ')}
              >
                Top {n}
              </button>
            ))}
          </div>
        </div>

        {loading && <LoadingBlock />}
        {erro && <ErrorBlock msg={erro} />}
        {!loading && !erro && rotasFiltradas.length === 0 && (
          <div className="py-12 text-center text-gray-500 text-sm">Nenhuma rota com filtro {filtroUF}.</div>
        )}
        {!loading && !erro && rotasFiltradas.length > 0 && (
          <div className="w-full" style={{ height: Math.max(360, rotasFiltradas.length * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rotasFiltradas} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 8 }}>
                <CartesianGrid stroke="#ffffff08" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={v => `${v.toFixed(0)} k`}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#ffffff10' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="_label"
                  width={260}
                  tick={{ fill: '#cbd5e1', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as Rota & { _teu_k: number };
                    return (
                      <div className="bg-[#111827] border border-white/10 rounded-xl p-3 shadow-xl text-xs min-w-[220px]">
                        <p className="font-semibold text-white">{d.rota_label}</p>
                        <div className="mt-2 space-y-1">
                          <Row label="TEU acumulado (2010–25)" value={`${(d.teu_acumulado / 1000).toFixed(0)} mil`} />
                          <Row label="TEU último ano" value={`${(d.teu_ultimo_ano / 1000).toFixed(0)} mil`} />
                          <Row label="CAGR" value={`${d.cagr_pct.toFixed(1).replace('.', ',')}%`} valueColor={d.cagr_pct > 0 ? IBI_GREEN : VERM} />
                        </div>
                      </div>
                    );
                  }}
                  cursor={{ fill: '#ffffff06' }}
                />
                <Bar dataKey="_teu_k" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {rotasFiltradas.map((r, i) => (
                    <Cell key={i} fill={r.cagr_pct < 0 ? VERM : IBI_GREEN} fillOpacity={0.85} />
                  ))}
                  <LabelList
                    dataKey="cagr_pct"
                    content={(props: any) => {
                      const { x, y, width, height, value } = props;
                      if (value == null) return null;
                      const isPos = value >= 0;
                      return (
                        <text
                          x={x + width + 6}
                          y={y + height / 2 + 4}
                          fill={isPos ? IBI_GREEN : VERM}
                          fontSize={10}
                          fontWeight={500}
                        >
                          {value > 0 ? '+' : ''}{value.toFixed(1)}%
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-[11px] text-gray-600 pt-2 border-t border-white/5">
          CAGR à direita de cada barra · Dados reais ANTAQ · Fluxos contêinerizados de cabotagem doméstica.
        </p>
      </div>

      <aside className="space-y-3">
        <InsightCard
          color={IBI_GREEN}
          eyebrow="Top rota"
          title="Manaus → Santos lidera"
          body="O abastecimento da Zona Franca puxa o ranking: Chibatão→Santos (1,8 mi TEU acumulados) + Manaus→Santos (1,3 mi). Volume de retorno (Santos→Manaus) também aparece no Top 20."
        />
        <InsightCard
          color={OURO}
          eyebrow="Atenção"
          title="~47% é petróleo offshore"
          body="Quase metade do volume nominalmente classificado como cabotagem é petróleo de FPSO (pré-sal). A 'cabotagem doméstica pura' cresce em ritmo mais moderado."
        />
      </aside>
    </motion.section>
  );
}

// ── painel: navegação interior ────────────────────────────────────────────────

function PainelInterior() {
  const total = ROTAS_INTERIOR.reduce((a, b) => a + b.vol, 0);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      <div className="lg:col-span-2 bg-azul-medio border border-white/10 rounded-2xl p-5 space-y-4" style={{ borderTop: `3px solid ${OURO}` }}>
        <div>
          <h3 className="text-base font-semibold text-white">Hidrovias brasileiras — principais corredores</h3>
          <p className="text-xs text-gray-500 mt-0.5">Volume movimentado · Mt/12m · participação no total interior</p>
        </div>

        <div className="space-y-4">
          {ROTAS_INTERIOR.map((r, i) => (
            <motion.div
              key={r.hidrovia}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="space-y-1.5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-gray-600 shrink-0 w-5">#{i + 1}</span>
                  <span className="text-sm font-medium text-white truncate">{r.hidrovia}</span>
                </div>
                <span className="text-sm tabular-nums font-semibold shrink-0" style={{ color: OURO }}>
                  {r.vol.toFixed(1)} Mt
                </span>
              </div>
              <div className="flex items-center gap-3 pl-7">
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.vol / ROTAS_INTERIOR[0].vol) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05 + 0.15 }}
                    className="h-full rounded-full"
                    style={{ background: OURO, opacity: 0.45 + (r.vol / ROTAS_INTERIOR[0].vol) * 0.5 }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 tabular-nums shrink-0 w-10 text-right">{r.share.toFixed(1)}%</span>
              </div>
              <div className="pl-7 text-[11px] text-gray-500 leading-snug">
                <span className="text-gray-400">{r.corredor}</span> · {r.observ}
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-[11px] text-gray-600 pt-2 border-t border-white/5">
          Soma: <strong className="text-gray-400">{total.toFixed(1)} Mt</strong> · Volumes ilustrativos
          calibrados por relatórios setoriais (ANTAQ, ANA, Webportos). A ligar à API ANTAQ via filtro por porto/região.
        </p>
      </div>

      <aside className="space-y-3">
        <InsightCard
          color={OURO}
          eyebrow="Arco Norte"
          title="Hidrovia Amazônica em alta"
          body="O Arco Norte (Madeira, Tapajós, Tocantins) saltou de 35% para 44% do escoamento de granel sólido em 13 anos. A Hidrovia Amazônica é a espinha dorsal desse corredor."
          cta={{ href: '/portos/agronegocio/arco-norte', label: 'Ver Arco Norte →' }}
        />
        <InsightCard
          color={VERM}
          eyebrow="Alerta"
          title="Estiagem 2024 = -9% YoY"
          body="A queda de 9,3% YoY no último ponto reflete o ciclo hidrológico crítico de 2024 e a entrada precoce em 2026. Acompanhe o Monitor Hidrológico e o Calendário LWS para antecipar restrições de calado."
          cta={{ href: '/monitor', label: 'Monitor hidrológico →' }}
        />
      </aside>
    </motion.section>
  );
}

// ── helpers visuais ───────────────────────────────────────────────────────────

function InsightCard({
  color, eyebrow, title, body, cta,
}: {
  color: string;
  eyebrow: string;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-azul-medio p-5" style={{ borderLeft: `3px solid ${color}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
        {eyebrow}
      </p>
      <h4 className="text-sm font-semibold text-white mt-1.5 leading-snug">{title}</h4>
      <p className="text-xs text-gray-400 mt-2 leading-relaxed">{body}</p>
      {cta && (
        <a
          href={cta.href}
          className="inline-block mt-3 text-xs font-medium hover:underline transition-colors"
          style={{ color }}
        >
          {cta.label}
        </a>
      )}
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium" style={{ color: valueColor || '#fff' }}>{value}</span>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="py-16 flex flex-col items-center gap-3">
      <div className="size-6 rounded-full border-2 border-ibi-blue border-t-transparent animate-spin" />
      <p className="text-gray-500 text-xs">Carregando série ANTAQ…</p>
    </div>
  );
}

function ErrorBlock({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="py-12 text-center space-y-2">
      <p className="text-[#A0153E] font-semibold text-sm">Falha ao carregar dados</p>
      <p className="text-gray-600 text-xs font-mono">{msg}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-xs text-gray-300 border border-white/15 rounded-full px-3 py-1 hover:border-white/30 hover:text-white transition-all"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

function truncate(s: string, n = 32) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
