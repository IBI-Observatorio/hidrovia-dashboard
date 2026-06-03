'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
  ComposedChart, Area, ReferenceLine, ReferenceDot,
} from 'recharts';
import { useDashboardData } from '@/components/antaq/useDashboardData';
import { fonteAntaqIbi, listaMesesIBI } from '@/lib/fonte-portos';

// ── types ──────────────────────────────────────────────────────────────────────

type NaturezaKey = 'granel_solido' | 'granel_liquido' | 'carga_geral' | 'conteinerizada';
type NaturezaFilter = NaturezaKey | 'todos';

type Ponto = { data: string; mt: number; est?: boolean };
type PortoSerie = {
  porto: string;
  uf: string | null;
  regiao: string | null;
  vol12m_mt: number;
  naturezas: Record<NaturezaKey, Ponto[]>;
  teu_conteiner?: { data: string; teu: number; est?: boolean }[];   // série de TEU do porto
};
type Dataset = {
  gerado_em: string;
  referencia: string;            // "YYYY-MM" — último mês ANTAQ
  fonte: string;
  metrica: string;
  top_n: number;
  portos: PortoSerie[];
  nacional_por_natureza: Record<NaturezaKey, Ponto[]>;
  nacional_conteiner_teu?: { data: string; teu: number; est?: boolean }[];  // série nacional de contêiner em TEU
  meses_preliminares?: string[];   // "YYYY-MM" carregados à mão (real + estimativa IBI)
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

/** Formata uma contagem de TEU (unidade convencional do contêiner). */
function fmtTeu(v: number) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2).replace('.', ',')} mi TEU`;
  if (v >= 1e3) return `${Math.round(v / 1e3).toLocaleString('pt-BR')} mil TEU`;
  return `${Math.round(v).toLocaleString('pt-BR')} TEU`;
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

/** Igual a somaMeses, mas para a série de TEU ({data, teu}). */
function somaTeu(serie: { data: string; teu: number }[] | undefined, ano: string, meses: string[]): number | null {
  if (!serie?.length) return null;
  let total = 0, achou = false;
  for (const p of serie) {
    if (p.data.slice(0, 4) === ano && meses.includes(p.data.slice(5, 7))) { total += p.teu; achou = true; }
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

function TooltipVolume({ active, payload, mes, ctnTeu }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PortoDisplay;
  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl p-3 shadow-xl text-sm min-w-[220px]">
      <p className="font-semibold text-white text-sm leading-snug">{d.porto}</p>
      <span className="text-xs text-gray-500">{d.uf ?? ''}</span>
      <div className="mt-2 space-y-0.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Volume</span>
          <span className="text-white font-medium">{ctnTeu ? fmtTeu(d.volume_display) : fmtVol(d.volume_display, mes)}</span>
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
  const [unidadeCtn, setUnidadeCtn] = useState<'teu' | 'ton'>('teu');  // unidade do contêiner

  // inicializa o ano quando os dados chegam
  useEffect(() => { if (data && !ano) setAno(anoPadrao); }, [data, anoPadrao, ano]);

  const isTodos = natureza === 'todos';
  // contêiner medido em TEU (padrão): vale para KPIs, ranking e bloco acumulado
  const ctnTeu = natureza === 'conteinerizada' && unidadeCtn === 'teu'
    && (data?.nacional_conteiner_teu?.length ?? 0) > 0;
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
  // período em vista cobre algum mês carregado à mão (real + estimativa IBI)?
  // contêiner NUNCA é preliminar (dado IBI sólido) → não dispara aviso de mês IBI
  const isPreliminar = natureza !== 'conteinerizada'
    && (data?.meses_preliminares ?? []).some(
      ym => ym.slice(0, 4) === anoEfetivo && mesesAlvo.includes(ym.slice(5, 7)),
    );

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
      } else if (ctnTeu) {
        // contêiner em TEU: usa a série por porto (teu_conteiner)
        const vol = somaTeu(p.teu_conteiner, anoEfetivo, mesesAlvo);
        if (vol == null || vol <= 0) continue;
        const prev = somaTeu(p.teu_conteiner, prevAno, mesesAlvo);
        linhas.push({
          porto: p.porto, uf: p.uf,
          volume_display: vol,
          delta_yoy: prev != null && prev > 0 ? ((vol - prev) / prev) * 100 : null,
          _color: NAT_COLOR.conteinerizada,
          _naturezaKey: 'conteinerizada',
          _label: `${truncate(p.porto, 32)} (${p.uf ?? '—'})`,
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
  }, [data, natureza, isTodos, ctnTeu, anoEfetivo, mes, mesesAlvo, prevAno, ncmSel]);

  // KPIs nacionais (todos os portos do país, não só o top N)
  const nacionalPeriodo = useMemo(() => {
    if (!data) return null;
    if (ctnTeu) return somaTeu(data.nacional_conteiner_teu, anoEfetivo, mesesAlvo);
    const keys = isTodos ? NATUREZAS.map(n => n.key) : [natureza as NaturezaKey];
    let tot = 0, achou = false;
    for (const k of keys) {
      const v = somaMeses(data.nacional_por_natureza[k], anoEfetivo, mesesAlvo);
      if (v != null) { tot += v; achou = true; }
    }
    return achou ? tot : null;
  }, [data, natureza, isTodos, ctnTeu, anoEfetivo, mesesAlvo]);

  // contêiner em toneladas (para a participação no total, que só faz sentido em t)
  const ctnTonPeriodo = useMemo(() => {
    if (!data || !ctnTeu) return null;
    return somaMeses(data.nacional_por_natureza.conteinerizada, anoEfetivo, mesesAlvo);
  }, [data, ctnTeu, anoEfetivo, mesesAlvo]);

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
    if (ctnTeu) {
      const a = somaTeu(data.nacional_conteiner_teu, anoEfetivo, mesesAlvo);
      const p = somaTeu(data.nacional_conteiner_teu, prevAno, mesesAlvo);
      return a != null && p != null && p > 0 ? ((a - p) / p) * 100 : null;
    }
    const keys = isTodos ? NATUREZAS.map(n => n.key) : [natureza as NaturezaKey];
    let atual = 0, prev = 0, okA = false, okP = false;
    for (const k of keys) {
      const a = somaMeses(data.nacional_por_natureza[k], anoEfetivo, mesesAlvo);
      const p = somaMeses(data.nacional_por_natureza[k], prevAno, mesesAlvo);
      if (a != null) { atual += a; okA = true; }
      if (p != null) { prev += p; okP = true; }
    }
    return okA && okP && prev > 0 ? ((atual - prev) / prev) * 100 : null;
  }, [data, natureza, isTodos, ctnTeu, anoEfetivo, mesesAlvo, prevAno]);

  // apuração do(s) mês(es) preliminar(es) em vista: quanto da tonelagem por porto é
  // dado real (est != true) vs estimado, por natureza. Base = pontos dos portos.
  const apuracao = useMemo(() => {
    if (!data) return null;
    const prelim = new Set(
      (data.meses_preliminares ?? []).filter(
        ym => ym.slice(0, 4) === anoEfetivo && mesesAlvo.includes(ym.slice(5, 7)),
      ),
    );
    if (!prelim.size) return null;
    const por = NATUREZAS.map(n => {
      let real = 0, total = 0;
      for (const p of data.portos)
        for (const pt of p.naturezas[n.key] ?? [])
          if (prelim.has(pt.data)) { total += pt.mt; if (!pt.est) real += pt.mt; }
      return { key: n.key, label: n.label, color: n.color, real, total, pct: total > 0 ? (real / total) * 100 : null };
    });
    const real = por.reduce((s, x) => s + x.real, 0);
    const total = por.reduce((s, x) => s + x.total, 0);
    return { por, pct: total > 0 ? (real / total) * 100 : null };
  }, [data, anoEfetivo, mesesAlvo]);

  // acumulado móvel de 12 meses do TOTAL nacional (soma das 4 naturezas), série inteira.
  // Independe dos filtros — é a leitura macro "recorde". Marca janelas que tocam mês preliminar.
  const acum12 = useMemo(() => {
    if (!data) return null;
    // contêiner em TEU quando o toggle de unidade está em TEU
    const teuMode = ctnTeu;
    const keys = isTodos ? NATUREZAS.map(n => n.key) : [natureza as NaturezaKey];
    const byMonth: Record<string, { t: number; n: number; est: boolean }> = {};
    if (teuMode) {
      for (const p of data.nacional_conteiner_teu!)            // valor em MILHÕES de TEU
        byMonth[p.data] = { t: p.teu / 1e6, n: 1, est: !!p.est };
    } else {
      for (const k of keys)
        for (const p of data.nacional_por_natureza[k] ?? []) {
          const m = (byMonth[p.data] ??= { t: 0, n: 0, est: false });
          m.t += p.mt; m.n++; if (p.est) m.est = true;
        }
    }
    const need = teuMode ? 1 : keys.length;
    const datas = Object.keys(byMonth).filter(d => byMonth[d].n === need).sort();
    const roll: { data: string; total: number; est: boolean }[] = [];
    for (let i = 11; i < datas.length; i++) {
      let s = 0, est = false;
      for (let k = i - 11; k <= i; k++) { s += byMonth[datas[k]].t; if (byMonth[datas[k]].est) est = true; }
      roll.push({ data: datas[i], total: +s.toFixed(3), est });
    }
    if (roll.length < 13) return null;
    const last = roll[roll.length - 1];
    const prev = roll[roll.length - 13];                 // 12 meses antes
    const max = roll.reduce((a, b) => (b.total > a.total ? b : a), roll[0]);
    // melhor janela apoiada só em dado oficial (nenhum mês preliminar)
    const maxOficial = roll.filter(r => !r.est).reduce<{ data: string; total: number; est: boolean } | null>(
      (a, b) => (!a || b.total > a.total ? b : a), null);
    // o recorde já se confirma no oficial se essa máxima oficial superou tudo que veio antes dela
    const idxMaxOf = maxOficial ? roll.findIndex(r => r.data === maxOficial.data) : -1;
    const recordeOficial = !!(maxOficial && roll.slice(0, idxMaxOf).every(r => r.total < maxOficial.total - 1e-9));
    return {
      roll, last, prev, max, maxOficial,
      yoy: prev.total ? ((last.total - prev.total) / prev.total) * 100 : null,
      isRecord: last.total >= max.total - 1e-9,
      recordeOficial,
      unidade: teuMode ? 'TEU' : 'Mt',
    };
  }, [data, natureza, isTodos, ctnTeu]);

  const sectorLabel = isTodos ? 'Todos os tipos' : NAT_LABEL[natureza as NaturezaKey];
  const topPort = ranking[0];

  if (loading || (!data && !erro)) return <LoadingState />;
  if (erro)    return <ErrorState msg={erro} />;
  if (!data)   return <ErrorState msg="Dataset de movimentação indisponível." />;

  const isMensal = mes !== 'todos';
  const mesLabel = MESES.find(m => m.v === mes)?.l ?? '';
  const periodoLabel = isMensal ? `${mesLabel}/${anoEfetivo}` : anoEfetivo;
  const refLabel = `${refMonthLabel}/${refYear}`;
  // o mês de referência é preliminar (carga manual)? em caso afirmativo, qual o
  // último mês OFICIAL da ANTAQ (anda para trás enquanto o mês estiver na lista).
  const refPreliminar = (data.meses_preliminares ?? []).includes(data.referencia);
  const refOficial = (() => {
    const prelim = new Set(data.meses_preliminares ?? []);
    let ym = data.referencia;
    while (prelim.has(ym)) {
      const [y, m] = ym.split('-').map(Number);
      ym = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    }
    return ym;
  })();
  const refOficialLabel = `${MESES.find(m => m.v === refOficial.slice(5, 7))?.l ?? ''}/${refOficial.slice(0, 4)}`;
  // atribuição de fonte automática: ANTAQ até o último oficial + IBI nos preliminares
  const fonteLabel = fonteAntaqIbi(
    data.nacional_por_natureza.granel_solido.map(p => p.data),
    data.meses_preliminares ?? [],
  );
  const mesesIBILabel = listaMesesIBI(data.meses_preliminares ?? []);   // "mar. e abr. 2026"
  // participação no total nacional é sempre em tonelada (comparar com o total de cargas);
  // em modo TEU usa a tonelagem do contêiner, não a contagem de TEU.
  const participacaoNum = ctnTeu ? ctnTonPeriodo : nacionalPeriodo;
  const participacao = isTodos
    ? 100
    : (participacaoNum != null && nacionalTotalTodos)
      ? (participacaoNum / nacionalTotalTodos) * 100
      : null;
  // formatador da unidade ativa (TEU para contêiner, senão Mt)
  const fmtMov = (v: number) => ctnTeu ? fmtTeu(v) : fmtVol(v, mes);

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
          Ranking de portos e terminais por tonelagem movimentada — dados mensais da ANTAQ
          {refPreliminar ? <> (mês corrente: dado IBI)</> : <> (oficial)</>}.
          Filtre por tipo de carga, ano, mês e produto (NCM SH4).
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-600">
            {refPreliminar
              ? <>Oficial ANTAQ até {refOficialLabel} · <span className="text-amber-300/80">{refLabel} IBI</span></>
              : <>Dados reais até {refLabel}</>}
            {' '}· {data.portos.length} maiores portos · atualização mensal
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
          {/* unidade do contêiner (TEU é o padrão; pode ver em toneladas) */}
          {natureza === 'conteinerizada' && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Unidade</span>
              <div className="inline-flex rounded-full border border-white/10 overflow-hidden">
                {([['teu', 'TEU'], ['ton', 'Toneladas']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setUnidadeCtn(v)}
                    className={[
                      'px-3 py-1 text-xs font-medium transition-all',
                      unidadeCtn === v ? 'text-white' : 'text-gray-400 hover:text-white',
                    ].join(' ')}
                    style={unidadeCtn === v ? { background: NAT_COLOR.conteinerizada + '33' } : {}}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-gray-600">contêiner mede-se em TEU</span>
            </div>
          )}
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

      {/* aviso: mês corrente é dado IBI (ANTAQ ainda não publicou) */}
      {isPreliminar && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-3 -mt-4">
          <span className="text-base leading-none mt-0.5 shrink-0">ℹ️</span>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            <strong className="text-amber-200">Dado IBI.</strong> {refLabel} é número do IBI
            (coleta direta; agregado nacional estimado para portos sem divulgação), pois a ANTAQ
            ainda não publicou o mês. Oficial ANTAQ vai até {refOficialLabel}.
          </p>
        </div>
      )}

      {/* apurado pelo IBI por tipo de carga (só no período preliminar) */}
      {isPreliminar && apuracao && (
        <div className="rounded-xl border border-white/10 bg-azul-medio p-4 -mt-4 space-y-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
              Apurado pelo IBI por tipo de carga · {refLabel}
            </p>
            {apuracao.pct != null && (
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-300">{apuracao.pct.toFixed(0)}%</span> da tonelagem é dado real · restante estimado
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {apuracao.por.map(n => (
              <div key={n.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <span className="size-2 rounded-full inline-block" style={{ background: n.color }} />
                    {n.label}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-gray-200">{n.pct != null ? `${n.pct.toFixed(0)}%` : '—'}</span>
                    <span className="text-gray-600"> real</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${n.pct ?? 0}%`, background: n.color }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-600">
            Coleta direta IBI (real) vs estimativa para portos sem dado divulgado. Base: tonelagem dos {data.portos.length} maiores portos.
          </p>
        </div>
      )}

      {/* ── kpi cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label={`Movimentação — ${periodoLabel}`}
          value={nacionalPeriodo != null ? fmtMov(nacionalPeriodo) : '—'}
          sub={`${isMensal ? (ctnTeu ? 'TEU do mês (nacional)' : 'Tonelagem do mês (nacional)') : `Acumulado ${anoEfetivo} (nacional)`}${isPreliminar ? ' · IBI' : ''}`}
          color={activeColor}
        />
        <KpiCard
          label="Participação no total nacional"
          value={participacao != null ? `${participacao.toFixed(0)}%` : '—'}
          sub={ctnTeu
            ? (ctnTonPeriodo != null ? `${ctnTonPeriodo.toFixed(0)} Mt · contêiner ÷ total (em t)` : 'em toneladas')
            : (nacionalPeriodo != null ? `${nacionalPeriodo.toFixed(0)} Mt · ${sectorLabel}` : sectorLabel)}
          color={activeColor}
        />
        <KpiCard
          label={`Variação a/a — ${periodoLabel}`}
          value={momentum != null ? fmtPct(momentum) : '—'}
          sub={`vs ${isMensal ? mesLabel + '/' + prevAno : prevAno} (nacional)${ctnTeu ? ' · em TEU' : ''}${isPreliminar ? ' · IBI' : ''}`}
          positive={momentum != null ? momentum > 0 : undefined}
          color={activeColor}
        />
        <KpiCard
          label={ncmSel ? `Portos c/ NCM ${ncmSel.ncm}` : 'Maior volume'}
          value={ncmSel ? `${ranking.length} porto${ranking.length !== 1 ? 's' : ''}` : (topPort ? fmtMov(topPort.volume_display) : '—')}
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
              {(() => { const u = ctnTeu ? 'TEU' : 'tonelagem'; return isMensal ? `${u} de ${mesLabel}/${anoEfetivo}` : `${u} acumulada ${anoEfetivo}`; })()}
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
          <VolumeChart data={ranking} mes={mes} ctnTeu={ctnTeu} />
        )}
        {isTodos && (
          <p className="text-[11px] text-gray-600">Em &quot;Todos os tipos&quot;, a barra soma as 4 naturezas; a cor indica a carga predominante no porto.</p>
        )}
      </div>

      {/* ── acumulado 12 meses (recorde) ────────────────────────────────────── */}
      {acum12 && (() => {
        const ymL = (ym: string) => `${MESES.find(m => m.v === ym.slice(5, 7))?.l}/${ym.slice(2, 4)}`;
        const ini = acum12.roll[acum12.roll.length - 12]?.data ?? acum12.last.data;
        const janela = `${ymL(ini)}–${ymL(acum12.last.data)}`;
        const isTeu = acum12.unidade === 'TEU';
        // contêiner nunca é preliminar → não sinaliza "inclui IBI" mesmo com pontos est
        const estVisivel = acum12.last.est && natureza !== 'conteinerizada';
        // valor já vem em Mt (toneladas) ou em milhões de TEU
        const fmtVal = (v: number) => isTeu
          ? `${v.toFixed(2).replace('.', ',')} mi TEU`
          : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} Mt`;
        const acumColor = isTodos ? '#0099d8' : activeColor;
        return (
          <div className="bg-azul-medio border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  Acumulado de 12 meses — {isTodos ? 'movimentação nacional' : sectorLabel}
                  {acum12.isRecord && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: '#D4922A22', color: '#D4922A', border: '1px solid #D4922A66' }}>
                      🏆 Recorde da série
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Soma móvel · {isTodos ? 'todas as cargas' : sectorLabel} · nacional{isTeu ? ' · em TEU' : ''} · {acum12.roll[0]?.data.slice(0, 4)}→hoje · acompanha o tipo de carga selecionado
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                label={`Acumulado 12 meses · ${janela}`}
                value={fmtVal(acum12.last.total)}
                sub={`${!isTeu && isTodos ? `≈ ${(acum12.last.total / 1000).toFixed(2).replace('.', ',')} bi de t · ` : ''}${isTodos ? 'todas as cargas' : sectorLabel} (nacional)${estVisivel ? ' · inclui meses IBI' : ''}`}
                color={acumColor}
              />
              <KpiCard
                label="Variação vs 12 meses anteriores"
                value={acum12.yoy != null ? fmtPct(acum12.yoy) : '—'}
                sub={`vs ${ymL(acum12.prev.data)} (mesma janela)`}
                positive={acum12.yoy != null ? acum12.yoy > 0 : undefined}
                color={acum12.yoy != null && acum12.yoy < 0 ? '#A0153E' : '#00a652'}
              />
              <KpiCard
                label="Posição histórica"
                value={acum12.isRecord ? 'Máxima da série' : 'Abaixo do pico'}
                sub={acum12.isRecord
                  ? (acum12.recordeOficial && acum12.maxOficial
                      ? `Confirmado no oficial: ${fmtVal(acum12.maxOficial.total)} (12m até ${ymL(acum12.maxOficial.data)})`
                      : 'Pico apoiado em meses IBI')
                  : `Máxima: ${fmtVal(acum12.max.total)} (12m até ${ymL(acum12.max.data)})`}
                color="#D4922A"
              />
            </div>

            <Acum12Chart roll={acum12.roll} peak={acum12.max} color={acumColor} unidade={acum12.unidade} />

            <p className="text-[11px] text-gray-600 leading-relaxed">
              Cada ponto é a soma dos 12 meses anteriores — remove sazonalidade e mostra a tendência de fundo.
              {estVisivel && ' A ponta inclui mar/abr/2026 (dado IBI).'}
              {estVisivel && acum12.isRecord && acum12.recordeOficial && ' O status de recorde se mantém mesmo usando só o dado oficial ANTAQ.'}
              {' '}Fonte: {fonteLabel}. Elaboração: Observatório IBI.
            </p>
          </div>
        );
      })()}

      {/* ── info footer ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-azul-medio/50 border border-white/5 rounded-xl p-4 text-xs text-gray-500">
        <span className="text-base mt-0.5 shrink-0">ℹ️</span>
        <div className="space-y-1">
          <p>
            <strong className="text-gray-400">Tonelagem</strong> — movimentação efetiva (peso bruto de carga, operações de carga/descarga), conceito da Base Estatística Aquaviária da ANTAQ.{mesesIBILabel ? <> Série oficial da ANTAQ; os meses ainda não publicados ({mesesIBILabel}) são <strong className="text-gray-400">coleta IBI</strong>.</> : null}{' '}
            <strong className="text-gray-400">Variação a/a</strong> — compara o mesmo período do ano anterior (mesmos meses).{' '}
            <strong className="text-gray-400">NCM SH4</strong> — associação porto × produto baseada na composição típica de carga de cada terminal.
          </p>
          <p>
            Fonte: {fonteLabel}.{' '}
            {refPreliminar
              ? <>Mês corrente {refLabel} é <span className="text-amber-300/80">dado IBI</span> (coleta direta + agregado nacional estimado); a ANTAQ publica o oficial depois.</>
              : <>Último mês disponível: {refLabel}.</>}
            {' '}Elaboração: Observatório IBI.
          </p>
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

function Acum12Chart({ roll, peak, color, unidade }: {
  roll: { data: string; total: number; est: boolean }[];
  peak: { data: string; total: number };
  color: string;
  unidade: string;
}) {
  const isTeu = unidade === 'TEU';
  const minV = Math.min(...roll.map(r => r.total));
  const maxV = peak.total;
  // domínio com folga embaixo pra valorizar a inclinação, e um respiro no topo
  const span = maxV - minV || maxV;
  const passo = span > 400 ? 50 : span > 80 ? 10 : span > 8 ? 2 : span > 0.8 ? 1 : 0.5;
  const dom = [Math.floor((minV - span * 0.05) / passo) * passo, Math.ceil((maxV + span * 0.05) / passo) * passo];
  const fmtAxis = (v: number) => isTeu ? v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  const fmtTip = (v: number) => isTeu ? `${Number(v).toFixed(2).replace('.', ',')} mi TEU` : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} Mt`;
  return (
    <div className="w-full" style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={roll} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="acum12fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
          <XAxis dataKey="data" tickFormatter={d => d.slice(0, 4)} interval={11}
                 tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#ffffff10' }} tickLine={false} />
          <YAxis domain={dom} tickFormatter={(v: number) => fmtAxis(v)}
                 tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={isTeu ? 36 : 48} />
          <Tooltip
            cursor={{ stroke: '#ffffff20' }}
            contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
            labelFormatter={(d: any) => `12m até ${d}`}
            formatter={(v: any) => [fmtTip(v), 'Acumulado']} />
          <ReferenceLine y={maxV} stroke="#D4922A" strokeDasharray="4 3" strokeOpacity={0.5} />
          <Area type="monotone" dataKey="total" stroke={color} strokeWidth={2} fill="url(#acum12fill)" dot={false} />
          <ReferenceDot x={peak.data} y={peak.total} r={4} fill="#D4922A" stroke="#111827" strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function VolumeChart({ data, mes, ctnTeu }: { data: PortoDisplay[]; mes: string; ctnTeu?: boolean }) {
  const altura = Math.max(300, data.length * 30);
  const fmtEixo = (v: number) => ctnTeu
    ? (v >= 1e6 ? `${(v / 1e6).toFixed(1)} mi` : `${Math.round(v / 1e3)} mil`)
    : (v >= 1 ? `${v.toFixed(0)} Mt` : `${(v * 1000).toFixed(0)} kt`);

  return (
    <div className="w-full" style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={fmtEixo}
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
          <Tooltip content={<TooltipVolume mes={mes} ctnTeu={ctnTeu} />} cursor={{ fill: '#ffffff06' }} />
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
