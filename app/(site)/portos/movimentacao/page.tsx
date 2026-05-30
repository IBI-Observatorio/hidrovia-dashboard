'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { useDashboardData } from '@/components/antaq/useDashboardData';

// ── types ──────────────────────────────────────────────────────────────────────

type NaturezaKey = 'granel_solido' | 'granel_liquido' | 'carga_geral' | 'conteinerizada';
type NaturezaFilter = NaturezaKey | 'todos';

type Ponto = { data: string; mt: number };
type PortoSerie = {
  porto: string;
  uf: string | null;
  regiao: string | null;
  vol12m_mt: number;
  naturezas: Record<NaturezaKey, Ponto[]>;
};
type Dataset = {
  gerado_em: string;
  referencia: string;            // "YYYY-MM" — último mês ANTAQ
  fonte: string;
  metrica: string;
  top_n: number;
  portos: PortoSerie[];
  nacional_por_natureza: Record<NaturezaKey, Ponto[]>;
};

type NcmEntry = { ncm: string; descricao: string; portos: string[] };

type PortoDisplay = {
  porto: string;
  uf: string | null;
  volume_display: number;
  delta_yoy: number | null;
  _label: string;
  _color: string;
  _naturezaKey: NaturezaKey | 'mix';
};

// ── constants ──────────────────────────────────────────────────────────────────

const NATUREZAS: { key: NaturezaKey; label: string; short: string; color: string }[] = [
  { key: 'granel_solido',  label: 'Granel Sólido',  short: 'GS',  color: '#0099d8' },
  { key: 'granel_liquido', label: 'Granel Líquido', short: 'GL',  color: '#00a652' },
  { key: 'carga_geral',    label: 'Carga Geral',    short: 'CG',  color: '#D4922A' },
  { key: 'conteinerizada', label: 'Conteinerizada', short: 'CTZ', color: '#8B5CF6' },
];

const NAT_LABEL: Record<NaturezaKey, string> = Object.fromEntries(
  NATUREZAS.map(n => [n.key, n.label]),
) as Record<NaturezaKey, string>;
const NAT_COLOR: Record<NaturezaKey, string> = Object.fromEntries(
  NATUREZAS.map(n => [n.key, n.color]),
) as Record<NaturezaKey, string>;

const MESES = [
  { v: 'todos', l: 'Todos' },
  { v: '01', l: 'Jan' }, { v: '02', l: 'Fev' }, { v: '03', l: 'Mar' },
  { v: '04', l: 'Abr' }, { v: '05', l: 'Mai' }, { v: '06', l: 'Jun' },
  { v: '07', l: 'Jul' }, { v: '08', l: 'Ago' }, { v: '09', l: 'Set' },
  { v: '10', l: 'Out' }, { v: '11', l: 'Nov' }, { v: '12', l: 'Dez' },
];

const MAX_BARRAS = 25;

// ── formatters ─────────────────────────────────────────────────────────────────

function fmtVol(v: number, mes: string) {
  const unit = mes === 'todos' ? 'Mt' : 'Mt/mês';
  if (v >= 100) return `${v.toFixed(0)} ${unit}`;
  if (v >= 10)  return `${v.toFixed(1)} ${unit}`;
  if (v >= 1)   return `${v.toFixed(2)} ${unit}`;
  return `${(v * 1000).toFixed(0)} kt${mes === 'todos' ? '' : '/mês'}`;
}

function fmtPct(v: number, sign = true) {
  const s = sign && v > 0 ? '+' : '';
  return `${s}${v.toFixed(1)}%`;
}

function truncate(s: string, n = 32) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ── data helpers ────────────────────────────────────────────────────────────────

/** Soma os pontos de `serie` cujo ano == `ano` e mês ∈ `meses`. null se nenhum. */
function somaMeses(serie: Ponto[] | undefined, ano: string, meses: string[]): number | null {
  if (!serie?.length) return null;
  let total = 0;
  let achou = false;
  for (const p of serie) {
    if (p.data.slice(0, 4) === ano && meses.includes(p.data.slice(5, 7))) {
      total += p.mt;
      achou = true;
    }
  }
  return achou ? total : null;
}

/** Meses (MM) presentes nos dados para um dado ano (a partir da série nacional). */
function mesesDisponiveis(nacional: Record<NaturezaKey, Ponto[]>, ano: string): string[] {
  const set = new Set<string>();
  for (const k of Object.keys(nacional) as NaturezaKey[])
    for (const p of nacional[k])
      if (p.data.slice(0, 4) === ano) set.add(p.data.slice(5, 7));
  return [...set].sort();
}

// ── tooltip ──────────────────────────────────────────────────────────────────

function TooltipVolume({ active, payload, mes }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PortoDisplay;
  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl p-3 shadow-xl text-sm min-w-[220px]">
      <p className="font-semibold text-white text-sm leading-snug">{d.porto}</p>
      <span className="text-xs text-gray-500">{d.uf ?? ''}</span>
      <div className="mt-2 space-y-0.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Volume</span>
          <span className="text-white font-medium">{fmtVol(d.volume_display, mes)}</span>
        </div>
        {d.delta_yoy != null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">vs ano anterior</span>
            <span className={d.delta_yoy >= 0 ? 'text-[#00a652]' : 'text-[#A0153E]'}>
              {fmtPct(d.delta_yoy)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── NCM search dropdown ────────────────────────────────────────────────────────

function NcmSearch({
  ncmList, query, onQuery, selected, onSelect,
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
    n => n.ncm.includes(query) || n.descricao.toLowerCase().includes(query.toLowerCase()),
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
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-72 overflow-y-auto">
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
  const { data: raw, loading, erro } = useDashboardData(['portos-series.json', 'ncm_sh4.json']);
  const bag = raw as Record<string, unknown> | null;
  const data = (bag?.['portos-series'] ?? null) as Dataset | null;
  const ncmData = (bag?.ncm_sh4 ?? null) as Record<NaturezaKey, NcmEntry[]> | null;

  // referência e anos derivados dos dados reais
  const refYear = data ? parseInt(data.referencia.slice(0, 4)) : 2026;
  const refMonthLabel = data ? MESES.find(m => m.v === data.referencia.slice(5, 7))?.l ?? '' : '';

  // último ano completo (12 meses) = default; senão o ano de referência
  const anoPadrao = useMemo(() => {
    if (!data) return String(refYear);
    for (let y = refYear; y >= refYear - 2; y--) {
      if (mesesDisponiveis(data.nacional_por_natureza, String(y)).length >= 12) return String(y);
    }
    return String(refYear);
  }, [data, refYear]);

  const ANOS = useMemo(() => {
    const arr: string[] = [];
    for (let y = refYear; y >= refYear - 8; y--) arr.push(String(y));
    return arr.reverse();
  }, [refYear]);

  const [natureza, setNatureza] = useState<NaturezaFilter>('granel_solido');
  const [ano, setAno]           = useState<string>('');
  const [mes, setMes]           = useState('todos');
  const [ncmQuery, setNcmQuery] = useState('');
  const [ncmSel, setNcmSel]     = useState<NcmEntry | null>(null);

  // inicializa o ano quando os dados chegam
  useEffect(() => { if (data && !ano) setAno(anoPadrao); }, [data, anoPadrao, ano]);

  const isTodos = natureza === 'todos';
  const anoEfetivo = ano || anoPadrao;
  const hasActiveFilters = anoEfetivo !== anoPadrao || mes !== 'todos' || ncmSel !== null;

  function clearFilters() {
    setAno(anoPadrao);
    setMes('todos');
    setNcmSel(null);
    setNcmQuery('');
  }

  const nat = isTodos ? null : NATUREZAS.find(n => n.key === natureza)!;
  const activeColor = nat?.color ?? '#9ca3af';

  // NCM list
  const ncmList: NcmEntry[] = useMemo(() => {
    if (!ncmData) return [];
    if (isTodos) return NATUREZAS.flatMap(n => ncmData[n.key] ?? []);
    return ncmData[natureza as NaturezaKey] ?? [];
  }, [ncmData, natureza, isTodos]);

  useEffect(() => { setNcmSel(null); setNcmQuery(''); }, [natureza]);

  // meses-alvo: mês específico ou todos os meses presentes no ano
  const mesesAno = useMemo(
    () => (data ? mesesDisponiveis(data.nacional_por_natureza, anoEfetivo) : []),
    [data, anoEfetivo],
  );
  const mesesAlvo = mes === 'todos' ? mesesAno : [mes];
  const prevAno = String(parseInt(anoEfetivo) - 1);
  const isParcial = mes === 'todos' && mesesAno.length > 0 && mesesAno.length < 12;

  // ranking de portos
  const ranking = useMemo<PortoDisplay[]>(() => {
    if (!data) return [];

    let portos = data.portos;
    if (ncmSel) portos = portos.filter(p => ncmSel.portos.includes(p.porto));

    const linhas: PortoDisplay[] = [];

    for (const p of portos) {
      if (isTodos) {
        // soma das 4 naturezas + cor pela natureza dominante no período
        let vol = 0, prev = 0;
        let dom: NaturezaKey = 'granel_solido', domVal = -1;
        let temAlgum = false, temPrev = false;
        for (const n of NATUREZAS) {
          const v = somaMeses(p.naturezas[n.key], anoEfetivo, mesesAlvo);
          const vp = somaMeses(p.naturezas[n.key], prevAno, mesesAlvo);
          if (v != null) { vol += v; temAlgum = true; if (v > domVal) { domVal = v; dom = n.key; } }
          if (vp != null) { prev += vp; temPrev = true; }
        }
        if (!temAlgum || vol <= 0) continue;
        linhas.push({
          porto: p.porto, uf: p.uf,
          volume_display: vol,
          delta_yoy: temPrev && prev > 0 ? ((vol - prev) / prev) * 100 : null,
          _color: NAT_COLOR[dom],
          _naturezaKey: 'mix',
          _label: `${truncate(p.porto, 30)} (${p.uf ?? '—'})`,
        });
      } else {
        const k = natureza as NaturezaKey;
        const vol = somaMeses(p.naturezas[k], anoEfetivo, mesesAlvo);
        if (vol == null || vol <= 0) continue;
        const prev = somaMeses(p.naturezas[k], prevAno, mesesAlvo);
        linhas.push({
          porto: p.porto, uf: p.uf,
          volume_display: vol,
          delta_yoy: prev != null && prev > 0 ? ((vol - prev) / prev) * 100 : null,
          _color: NAT_COLOR[k],
          _naturezaKey: k,
          _label: `${truncate(p.porto, 32)} (${p.uf ?? '—'})`,
        });
      }
    }

    return linhas.sort((a, b) => b.volume_display - a.volume_display).slice(0, MAX_BARRAS);
  }, [data, natureza, isTodos, anoEfetivo, mes, mesesAlvo, prevAno, ncmSel]);

  // KPIs nacionais (todos os portos do país, não só o top N)
  const nacionalPeriodo = useMemo(() => {
    if (!data) return null;
    const keys = isTodos ? NATUREZAS.map(n => n.key) : [natureza as NaturezaKey];
    let tot = 0, achou = false;
    for (const k of keys) {
      const v = somaMeses(data.nacional_por_natureza[k], anoEfetivo, mesesAlvo);
      if (v != null) { tot += v; achou = true; }
    }
    return achou ? tot : null;
  }, [data, natureza, isTodos, anoEfetivo, mesesAlvo]);

  const nacionalTotalTodos = useMemo(() => {
    if (!data) return null;
    let tot = 0;
    for (const n of NATUREZAS) {
      const v = somaMeses(data.nacional_por_natureza[n.key], anoEfetivo, mesesAlvo);
      if (v != null) tot += v;
    }
    return tot;
  }, [data, anoEfetivo, mesesAlvo]);

  const momentum = useMemo(() => {
    if (!data) return null;
    const keys = isTodos ? NATUREZAS.map(n => n.key) : [natureza as NaturezaKey];
    let atual = 0, prev = 0, okA = false, okP = false;
    for (const k of keys) {
      const a = somaMeses(data.nacional_por_natureza[k], anoEfetivo, mesesAlvo);
      const p = somaMeses(data.nacional_por_natureza[k], prevAno, mesesAlvo);
      if (a != null) { atual += a; okA = true; }
      if (p != null) { prev += p; okP = true; }
    }
    return okA && okP && prev > 0 ? ((atual - prev) / prev) * 100 : null;
  }, [data, natureza, isTodos, anoEfetivo, mesesAlvo, prevAno]);

  const sectorLabel = isTodos ? 'Todos os tipos' : NAT_LABEL[natureza as NaturezaKey];
  const topPort = ranking[0];

  if (loading || (!data && !erro)) return <LoadingState />;
  if (erro)    return <ErrorState msg={erro} />;
  if (!data)   return <ErrorState msg="Dataset de movimentação indisponível." />;

  const isMensal = mes !== 'todos';
  const mesLabel = MESES.find(m => m.v === mes)?.l ?? '';
  const periodoLabel = isMensal ? `${mesLabel}/${anoEfetivo}` : anoEfetivo;
  const refLabel = `${refMonthLabel}/${refYear}`;
  const participacao = isTodos
    ? 100
    : (nacionalPeriodo != null && nacionalTotalTodos)
      ? (nacionalPeriodo / nacionalTotalTodos) * 100
      : null;

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
          Ranking de portos e terminais por tonelagem movimentada — dados mensais reais da ANTAQ.
          Filtre por tipo de carga, ano, mês e produto (NCM SH4).
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-600">
            Dados reais até {refLabel} · {data.portos.length} maiores portos · atualização mensal
          </span>
        </div>
      </div>

      {/* ── filters ─────────────────────────────────────────────────────────── */}
      <div className="bg-azul-medio border border-white/10 rounded-xl p-4 space-y-4">

        {/* natureza */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Tipo de carga</p>
          <div className="flex flex-wrap gap-2">
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
                    anoEfetivo === a
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
              {MESES.map(m => {
                const indisponivel = m.v !== 'todos' && !mesesAno.includes(m.v);
                return (
                  <button
                    key={m.v}
                    onClick={() => !indisponivel && setMes(m.v)}
                    disabled={indisponivel}
                    title={indisponivel ? `Sem dados ANTAQ para ${m.l}/${anoEfetivo}` : undefined}
                    className={[
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                      mes === m.v
                        ? 'bg-white/10 border-white/25 text-white'
                        : indisponivel
                          ? 'border-white/5 text-gray-700 cursor-not-allowed'
                          : 'border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15',
                    ].join(' ')}
                  >
                    {m.l}
                  </button>
                );
              })}
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
          <Chip label={anoEfetivo} onClear={anoEfetivo !== anoPadrao ? () => setAno(anoPadrao) : undefined} />
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

      {/* parcial note */}
      {isParcial && (
        <p className="text-xs text-amber-300/80 -mt-4">
          ⚠️ {anoEfetivo} é ano parcial — acumulado de {mesesAno.length} {mesesAno.length === 1 ? 'mês' : 'meses'}
          {' '}(jan–{MESES.find(m => m.v === mesesAno.at(-1))?.l.toLowerCase()}). Variação a/a compara o mesmo período do ano anterior.
        </p>
      )}

      {/* ── kpi cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label={`Movimentação — ${periodoLabel}`}
          value={nacionalPeriodo != null ? fmtVol(nacionalPeriodo, mes) : '—'}
          sub={isMensal ? 'Tonelagem do mês (nacional)' : `Acumulado ${anoEfetivo} (nacional)`}
          color={activeColor}
        />
        <KpiCard
          label="Participação no total nacional"
          value={participacao != null ? `${participacao.toFixed(0)}%` : '—'}
          sub={nacionalPeriodo != null ? `${nacionalPeriodo.toFixed(0)} Mt · ${sectorLabel}` : sectorLabel}
          color={activeColor}
        />
        <KpiCard
          label={`Variação a/a — ${periodoLabel}`}
          value={momentum != null ? fmtPct(momentum) : '—'}
          sub={`vs ${isMensal ? mesLabel + '/' + prevAno : prevAno} (nacional)`}
          positive={momentum != null ? momentum > 0 : undefined}
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
              {isMensal ? `tonelagem de ${mesLabel}/${anoEfetivo}` : `tonelagem acumulada ${anoEfetivo}`}
              <span className="ml-1 text-gray-600">· variação vs {prevAno}</span>
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
          <EmptyState msg={ncmSel ? `Nenhum porto encontrado para NCM ${ncmSel.ncm} em ${sectorLabel}` : 'Sem dados para o período selecionado'} />
        ) : (
          <VolumeChart data={ranking} mes={mes} />
        )}
        {isTodos && (
          <p className="text-[11px] text-gray-600">Em &quot;Todos os tipos&quot;, a barra soma as 4 naturezas; a cor indica a carga predominante no porto.</p>
        )}
      </div>

      {/* ── info footer ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-azul-medio/50 border border-white/5 rounded-xl p-4 text-xs text-gray-500">
        <span className="text-base mt-0.5 shrink-0">ℹ️</span>
        <div className="space-y-1">
          <p>
            <strong className="text-gray-400">Tonelagem</strong> — movimentação efetiva (peso bruto de carga, operações de carga/descarga) extraída mês a mês da Base Estatística Aquaviária da ANTAQ.{' '}
            <strong className="text-gray-400">Variação a/a</strong> — compara o mesmo período do ano anterior (mesmos meses).{' '}
            <strong className="text-gray-400">NCM SH4</strong> — associação porto × produto baseada na composição típica de carga de cada terminal.
          </p>
          <p>Fonte: {data.fonte}. Último mês disponível: {refLabel}. Elaboração: Observatório IBI.</p>
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

function VolumeChart({ data, mes }: { data: PortoDisplay[]; mes: string }) {
  const altura = Math.max(300, data.length * 30);

  return (
    <div className="w-full" style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 8 }}>
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
            <LabelList dataKey="delta_yoy" content={DeltaLabel} />
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
