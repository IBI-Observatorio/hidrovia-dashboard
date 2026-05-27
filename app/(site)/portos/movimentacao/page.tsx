'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { useDashboardData } from '@/components/antaq/useDashboardData';

// ── types ──────────────────────────────────────────────────────────────────────

type Porto = {
  porto: string;
  uf: string;
  cagr_pct: number;
  volume_mt: number;
  divergencia_pp: number;
};

type PortoDisplay = Porto & {
  volume_display: number;
  delta_yoy: number | null;   // % vs mesmo período ano anterior (null se 2018)
  _label: string;
  _tipo: 'ganhador' | 'perdedor';
  _color: string;
  _naturezaKey: NaturezaKey;
};

type NaturezaKey = 'granel_solido' | 'granel_liquido' | 'carga_geral' | 'conteinerizada';
type NaturezaFilter = NaturezaKey | 'todos';

type NcmEntry = { ncm: string; descricao: string; portos: string[] };

// ── constants ──────────────────────────────────────────────────────────────────

const NATUREZAS: { key: NaturezaKey; label: string; short: string; color: string }[] = [
  { key: 'granel_solido',  label: 'Granel Sólido',  short: 'GS',  color: '#0099d8' },
  { key: 'granel_liquido', label: 'Granel Líquido', short: 'GL',  color: '#00a652' },
  { key: 'carga_geral',    label: 'Carga Geral',    short: 'CG',  color: '#D4922A' },
  { key: 'conteinerizada', label: 'Conteinerizada', short: 'CTZ', color: '#8B5CF6' },
];

const ANOS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];

const MESES = [
  { v: 'todos', l: 'Todos' },
  { v: '01', l: 'Jan' }, { v: '02', l: 'Fev' }, { v: '03', l: 'Mar' },
  { v: '04', l: 'Abr' }, { v: '05', l: 'Mai' }, { v: '06', l: 'Jun' },
  { v: '07', l: 'Jul' }, { v: '08', l: 'Ago' }, { v: '09', l: 'Set' },
  { v: '10', l: 'Out' }, { v: '11', l: 'Nov' }, { v: '12', l: 'Dez' },
];

// Fatores sazonais reais derivados da série mensal ANTAQ 2015-2025
// valor 1.0 = volume igual à média anual; >1 = mês acima da média
const SEASONAL: Record<NaturezaKey, Record<string, number>> = {
  granel_solido:  { '01':0.8025,'02':0.8547,'03':0.9804,'04':0.9675,'05':1.0598,'06':1.0712,'07':1.1041,'08':1.1349,'09':1.0566,'10':1.0181,'11':0.9645,'12':0.9858 },
  granel_liquido: { '01':0.9910,'02':0.8994,'03':0.9853,'04':0.9760,'05':0.9977,'06':0.9729,'07':1.0355,'08':1.0449,'09':1.0157,'10':1.0442,'11':1.0018,'12':1.0358 },
  carga_geral:    { '01':0.9776,'02':0.9151,'03':0.9991,'04':0.9686,'05':0.9917,'06':0.9968,'07':0.9923,'08':1.0240,'09':1.0002,'10':1.0347,'11':1.0251,'12':1.0748 },
  conteinerizada: { '01':0.9288,'02':0.8841,'03':0.9865,'04':0.9578,'05':0.9853,'06':0.9762,'07':1.0305,'08':1.0598,'09':1.0492,'10':1.0769,'11':1.0208,'12':1.0442 },
};

// ── formatters ─────────────────────────────────────────────────────────────────

function fmtVol(v: number, mes: string) {
  const unit = mes === 'todos' ? 'Mt/ano' : 'Mt/mês';
  if (v >= 100) return `${v.toFixed(0)} ${unit}`;
  if (v >= 10)  return `${v.toFixed(1)} ${unit}`;
  if (v >= 1)   return `${v.toFixed(2)} ${unit}`;
  return `${(v * 1000).toFixed(0)} kt/${mes === 'todos' ? 'ano' : 'mês'}`;
}

function fmtPct(v: number, sign = true) {
  const s = sign && v > 0 ? '+' : '';
  return `${s}${v.toFixed(1)}%`;
}

function truncate(s: string, n = 32) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ── volume per year/month computation ─────────────────────────────────────────

function computeDisplayVolume(porto: Porto, ano: string, mes: string, natureza: NaturezaKey): number {
  const yearsBack = 2025 - parseInt(ano);
  // Back-calculate annual volume from CAGR
  const annualVol = porto.volume_mt / Math.pow(1 + porto.cagr_pct / 100, yearsBack);
  if (mes === 'todos') return annualVol;
  // Scale by seasonal factor to get monthly estimate
  const sf = SEASONAL[natureza][mes] ?? 1;
  return (annualVol / 12) * sf;
}

// ── tooltips ───────────────────────────────────────────────────────────────────

function TooltipVolume({ active, payload, mes }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PortoDisplay;
  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl p-3 shadow-xl text-sm min-w-[220px]">
      <p className="font-semibold text-white text-sm leading-snug">{d.porto}</p>
      <span className="text-xs text-gray-500">{d.uf}</span>
      <div className="mt-2 space-y-0.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Volume</span>
          <span className="text-white font-medium">{fmtVol(d.volume_display, mes)}</span>
        </div>
      </div>
    </div>
  );
}

// ── NCM search dropdown ────────────────────────────────────────────────────────

function NcmSearch({
  ncmList,
  query,
  onQuery,
  selected,
  onSelect,
}: {
  ncmList: NcmEntry[];
  query: string;
  onQuery: (v: string) => void;
  selected: NcmEntry | null;
  onSelect: (v: NcmEntry | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = ncmList.filter(
    n =>
      n.ncm.includes(query) ||
      n.descricao.toLowerCase().includes(query.toLowerCase())
  );

  function handleSelect(n: NcmEntry) {
    onSelect(n);
    onQuery(n.ncm + ' — ' + n.descricao);
    setOpen(false);
  }

  function handleClear() {
    onSelect(null);
    onQuery('');
  }

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <input
          value={query}
          onChange={e => { onQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar NCM (ex: 2601 — minério de ferro)…"
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-white/20 pr-7"
        />
        {(query || selected) && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-xl">
          {filtered.map(n => (
            <button
              key={n.ncm}
              onClick={() => handleSelect(n)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex items-start gap-2"
            >
              <span className="font-mono text-ibi-blue shrink-0">{n.ncm}</span>
              <span className="text-gray-300">{n.descricao}</span>
              <span className="ml-auto text-gray-600 shrink-0">{n.portos.length}p</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <p className="text-[10px] text-gray-600 mt-0.5">
          {selected.portos.length} porto{selected.portos.length !== 1 ? 's' : ''} •{' '}
          <span className="text-gray-500">{selected.portos.slice(0, 3).map(p => truncate(p, 20)).join(', ')}{selected.portos.length > 3 ? '…' : ''}</span>
        </p>
      )}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

export default function MovimentacaoPage() {
  const [natureza, setNatureza] = useState<NaturezaFilter>('granel_solido');
  const [ano, setAno]           = useState('2025');
  const [mes, setMes]           = useState('todos');
  const [ncmQuery, setNcmQuery] = useState('');
  const [ncmSel, setNcmSel]     = useState<NcmEntry | null>(null);

  const { data: raw, loading, erro } = useDashboardData(['movimentacao.json']);
  const data = raw?.movimentacao ?? null;

  const isTodos = natureza === 'todos';
  const hasActiveFilters = ano !== '2025' || mes !== 'todos' || ncmSel !== null;

  function clearFilters() {
    setAno('2025');
    setMes('todos');
    setNcmSel(null);
    setNcmQuery('');
  }

  // nat só faz sentido para natureza única
  const nat = isTodos ? null : NATUREZAS.find(n => n.key === natureza)!;
  const activeColor = nat?.color ?? '#9ca3af';

  // NCM list — todos os NCMs quando "Todos", senão só da natureza selecionada
  const ncmList: NcmEntry[] = useMemo(() => {
    if (!data?.ncm_sh4) return [];
    if (isTodos) return NATUREZAS.flatMap(n => data.ncm_sh4[n.key] ?? []);
    return data.ncm_sh4[natureza as NaturezaKey] ?? [];
  }, [data, natureza, isTodos]);

  // Clear NCM selection when natureza changes
  useEffect(() => { setNcmSel(null); setNcmQuery(''); }, [natureza]);

  // Build ranked ports
  const ranking = useMemo<PortoDisplay[]>(() => {
    if (!data?.portos) return [];

    const natsToProcess = isTodos ? NATUREZAS : NATUREZAS.filter(n => n.key === natureza);
    const all: PortoDisplay[] = [];

    for (const n of natsToProcess) {
      const nd = data.portos.naturezas[n.key];
      const seen = new Set<string>();
      const entries: Porto[] = [];
      for (const p of nd.ganhadores) { if (!seen.has(p.porto)) { seen.add(p.porto); entries.push(p); } }
      for (const p of nd.perdedores) { if (!seen.has(p.porto)) { seen.add(p.porto); entries.push(p); } }

      for (const p of entries) {
        all.push({
          ...p,
          _tipo: nd.ganhadores.some((g: Porto) => g.porto === p.porto) ? 'ganhador' : 'perdedor',
          _color: n.color,
          _naturezaKey: n.key,
          volume_display: 0,   // filled below
          delta_yoy: null,     // filled below
          _label: '',          // filled below
        });
      }
    }

    // NCM filter (cross-natureza: match by porto name)
    const filtered = ncmSel ? all.filter(p => ncmSel.portos.includes(p.porto)) : all;

    const prevAno = String(parseInt(ano) - 1);
    const hasPrev = parseInt(ano) > 2018;

    return filtered
      .map(p => {
        const vol = computeDisplayVolume(p, ano, mes, p._naturezaKey);
        const prevVol = hasPrev ? computeDisplayVolume(p, prevAno, mes, p._naturezaKey) : null;
        const delta = prevVol && prevVol > 0 ? ((vol - prevVol) / prevVol) * 100 : null;
        return {
          ...p,
          volume_display: vol,
          delta_yoy: delta,
          _label: isTodos
            ? `${truncate(p.porto, 28)} · ${NATUREZAS.find(n => n.key === p._naturezaKey)!.short} (${p.uf})`
            : `${truncate(p.porto, 32)} (${p.uf})`,
        };
      })
      .sort((a, b) => b.volume_display - a.volume_display);
  }, [data, natureza, isTodos, ano, mes, ncmSel]);

  // KPI helpers
  const sectorCagr = isTodos
    ? NATUREZAS.reduce((acc, n) => acc + (data?.portos?.naturezas[n.key]?.cagr_natureza_pct ?? 0), 0) / 4
    : (data?.portos?.naturezas[natureza as NaturezaKey]?.cagr_natureza_pct ?? 0);
  const sectorLabel = isTodos ? 'Todos os tipos' : (data?.portos?.naturezas[natureza as NaturezaKey]?.natureza_label ?? '');
  const composicao  = isTodos
    ? (data?.kpis?.total_12m_mt ?? 0)
    : (data?.kpis?.composicao_12m?.[natureza as NaturezaKey] ?? 0);
  const momentum = isTodos
    ? NATUREZAS.reduce((acc, n) => acc + (data?.kpis?.momentum_atual?.[n.key] ?? 0), 0) / 4
    : (data?.kpis?.momentum_atual?.[natureza as NaturezaKey] ?? 0);
  const topPort = ranking[0];

  // Year-adjusted total volume
  const totalVol = useMemo(() => {
    if (!ranking.length) return composicao;
    const yearsBack = 2025 - parseInt(ano);
    const factor = Math.pow(1 + sectorCagr / 100, yearsBack);
    const annualTotal = composicao / factor;
    if (mes === 'todos') return annualTotal;
    // For "todos", use simple avg seasonal factor
    const natKey = isTodos ? 'granel_solido' : (natureza as NaturezaKey);
    const sf = SEASONAL[natKey][mes] ?? 1;
    return (annualTotal / 12) * sf;
  }, [ranking, ano, mes, natureza, isTodos, composicao, sectorCagr]);

  if (loading) return <LoadingState />;
  if (erro)    return <ErrorState msg={erro} />;

  const isMensal = mes !== 'todos';
  const mesLabel = MESES.find(m => m.v === mes)?.l ?? '';

  return (
    <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-10 space-y-8">

      {/* ── header ──────────────────────────────────────────────────────────── */}
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
          <span>Portos</span>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400">Movimentação Portuária</span>
        </div>
        <h1 className="text-[clamp(1.5rem,2.8vw,2.1rem)] font-bold leading-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-ibi-green to-ibi-blue">
            Movimentação Portuária
          </span>
        </h1>
        <p className="text-gray-400 text-sm max-w-2xl">
          Ranking de portos e terminais por volume e crescimento — filtre por tipo de carga,
          ano, mês e produto (NCM SH4).
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-600">Período base: 2018–2025 · Ref. fev/2026</span>
        </div>
      </div>

      {/* ── filters ─────────────────────────────────────────────────────────── */}
      <div className="bg-azul-medio border border-white/10 rounded-xl p-4 space-y-4">

        {/* natureza */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Tipo de carga</p>
          <div className="flex flex-wrap gap-2">
            {/* Botão Todos */}
            <button
              onClick={() => setNatureza('todos')}
              className={[
                'px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
                isTodos
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'text-gray-400 border-white/10 hover:text-white hover:border-white/20',
              ].join(' ')}
            >
              Todos
            </button>
            {NATUREZAS.map(n => (
              <button
                key={n.key}
                onClick={() => setNatureza(n.key)}
                className={[
                  'px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
                  natureza === n.key ? 'text-white border-transparent' : 'text-gray-400 border-white/10 hover:text-white hover:border-white/20',
                ].join(' ')}
                style={natureza === n.key ? { background: n.color + '22', borderColor: n.color, color: n.color } : {}}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {/* ano + mes + NCM */}
        <div className="flex flex-wrap gap-4 items-start">

          {/* ano */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Ano</p>
            <div className="flex flex-wrap gap-1">
              {ANOS.map(a => (
                <button
                  key={a}
                  onClick={() => setAno(a)}
                  className={[
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                    ano === a
                      ? 'bg-white/10 border-white/25 text-white'
                      : 'border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15',
                  ].join(' ')}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* mês */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Mês</p>
            <div className="flex flex-wrap gap-1">
              {MESES.map(m => (
                <button
                  key={m.v}
                  onClick={() => setMes(m.v)}
                  className={[
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                    mes === m.v
                      ? 'bg-white/10 border-white/25 text-white'
                      : 'border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15',
                  ].join(' ')}
                >
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          {/* NCM SH4 */}
          <div className="space-y-1 flex-1 min-w-[240px] max-w-[420px]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">NCM SH4</p>
            <NcmSearch
              ncmList={ncmList}
              query={ncmQuery}
              onQuery={setNcmQuery}
              selected={ncmSel}
              onSelect={setNcmSel}
            />
          </div>
        </div>

        {/* active filter chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
          <span className="text-xs text-gray-600">Filtros:</span>
          {isTodos
            ? <Chip label="Todos os tipos" onClear={undefined} />
            : <Chip label={nat!.label} color={nat!.color} onClear={undefined} />
          }
          <Chip label={ano} onClear={ano !== '2025' ? () => setAno('2025') : undefined} />
          {mes !== 'todos' && <Chip label={mesLabel} onClear={() => setMes('todos')} />}
          {ncmSel && <Chip label={`NCM ${ncmSel.ncm}`} onClear={() => { setNcmSel(null); setNcmQuery(''); }} />}
          <button
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className={[
              'ml-auto text-xs rounded-full px-3 py-0.5 border transition-all',
              hasActiveFilters
                ? 'text-gray-300 border-white/20 hover:text-white hover:border-white/40 cursor-pointer'
                : 'text-gray-700 border-white/5 cursor-default',
            ].join(' ')}
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* ── kpi cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label={`Movimentação — ${isMensal ? mesLabel + '/' + ano : ano}`}
          value={fmtVol(totalVol, mes)}
          sub={isMensal ? `Estimativa sazonal` : `Referência 2025`}
          color={activeColor}
        />
        <KpiCard
          label="Participação no total nacional"
          value={isTodos ? '100%' : `${(composicao / (data?.kpis?.total_12m_mt ?? 1) * 100).toFixed(0)}%`}
          sub={`${composicao.toFixed(0)} Mt · ${sectorLabel}`}
          color={activeColor}
        />
        <KpiCard
          label="Momentum YoY (últ. 12m)"
          value={fmtPct(momentum)}
          sub={isTodos ? 'Média dos 4 tipos de carga' : `Período 2018–2025`}
          positive={momentum > 0}
          color={activeColor}
        />
        <KpiCard
          label={ncmSel ? `Portos c/ NCM ${ncmSel.ncm}` : 'Maior volume'}
          value={ncmSel ? `${ranking.length} porto${ranking.length !== 1 ? 's' : ''}` : (topPort ? fmtVol(topPort.volume_display, mes) : '—')}
          sub={ncmSel ? ncmSel.descricao : (topPort ? truncate(topPort.porto, 32) : '')}
          color={activeColor}
        />
      </div>

      {/* ── volume ranking chart ─────────────────────────────────────────────── */}
      <div className="bg-azul-medio border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-white">
              Ranking por Volume — {sectorLabel}
              {ncmSel && <span className="ml-2 text-xs font-normal text-gray-500">NCM {ncmSel.ncm}</span>}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {ranking.length} porto{ranking.length !== 1 ? 's' : ''} ·{' '}
              {isMensal ? `estimativa mensal (${mesLabel}/${ano})` : `tonelagem anual (${ano})`}
              {parseInt(ano) > 2018 && (
                <span className="ml-1 text-gray-600">· variação vs {String(parseInt(ano) - 1)}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {isTodos
              ? NATUREZAS.map(n => (
                  <span key={n.key} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full inline-block" style={{ background: n.color }} />
                    {n.label}
                  </span>
                ))
              : (
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full inline-block" style={{ background: activeColor }} />
                    {sectorLabel}
                  </span>
                )
            }
          </div>
        </div>

        {ranking.length === 0 ? (
          <EmptyState msg={ncmSel ? `Nenhum porto encontrado para NCM ${ncmSel.ncm} em ${sectorLabel}` : 'Sem dados'} />
        ) : (
          <VolumeChart data={ranking} mes={mes} ano={ano} />
        )}
      </div>

      {/* ── info footer ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-azul-medio/50 border border-white/5 rounded-xl p-4 text-xs text-gray-500">
        <span className="text-base mt-0.5 shrink-0">ℹ️</span>
        <div className="space-y-1">
          <p>
            <strong className="text-gray-400">Volumes por ano</strong> — retroprojetados a partir do volume de referência 2025 com base na taxa histórica de crescimento do porto.{' '}
            <strong className="text-gray-400">Volumes por mês</strong> — ajustados pelo fator sazonal real da série ANTAQ 2015–2025.{' '}
            <strong className="text-gray-400">NCM SH4</strong> — associação porto × produto baseada na composição típica de carga de cada terminal.
          </p>
          <p>Fonte: ANTAQ — Estatística Aquaviária (2010–2026). Elaboração: Observatório IBI, mai/2026.</p>
        </div>
      </div>

    </main>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────────

function Chip({ label, color, onClear }: { label: string; color?: string; onClear?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border"
      style={color
        ? { background: color + '18', borderColor: color + '55', color }
        : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)', color: '#9ca3af' }}
    >
      {label}
      {onClear && (
        <button onClick={onClear} className="hover:text-white opacity-60 hover:opacity-100 text-[10px] leading-none">✕</button>
      )}
    </span>
  );
}

function KpiCard({ label, value, sub, positive, color }: {
  label: string; value: string; sub: string; positive?: boolean; color: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
      <p className="text-xs text-gray-500 leading-snug">{label}</p>
      <p className="text-xl font-bold tracking-tight leading-tight" style={{ color }}>{value}</p>
      {sub && (
        <p className={['text-xs leading-snug', positive === true ? 'text-[#00a652]' : positive === false ? 'text-[#A0153E]' : 'text-gray-500'].join(' ')}>
          {sub}
        </p>
      )}
    </div>
  );
}

function DeltaLabel(props: any) {
  const { x, y, width, height, value } = props;
  if (value == null) return null;
  const isPos = value >= 0;
  return (
    <text
      x={x + width + 6}
      y={y + height / 2 + 4}
      fill={isPos ? '#00a652' : '#A0153E'}
      fontSize={10}
      fontWeight={500}
    >
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </text>
  );
}

function VolumeChart({ data, mes, ano }: { data: PortoDisplay[]; mes: string; ano: string }) {
  const hasPrev = parseInt(ano) > 2018;
  const altura = Math.max(300, data.length * 30);

  return (
    <div className="w-full" style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: hasPrev ? 72 : 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={v => v >= 1 ? `${v.toFixed(0)} Mt` : `${(v*1000).toFixed(0)} kt`}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={{ stroke: '#ffffff10' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="_label"
            width={236}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip content={<TooltipVolume mes={mes} />} cursor={{ fill: '#ffffff06' }} />
          <Bar dataKey="volume_display" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry._color} fillOpacity={0.85} />
            ))}
            {hasPrev && <LabelList dataKey="delta_yoy" content={DeltaLabel} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-24 flex flex-col items-center gap-4">
      <div className="size-8 rounded-full border-2 border-ibi-blue border-t-transparent animate-spin" />
      <p className="text-gray-500 text-sm">Carregando dados ANTAQ…</p>
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-20 text-center space-y-2">
      <p className="text-[#A0153E] font-semibold">Erro ao carregar dados</p>
      <p className="text-gray-500 text-sm font-mono">{msg}</p>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="py-12 text-center text-gray-500 text-sm">{msg}</div>
  );
}
