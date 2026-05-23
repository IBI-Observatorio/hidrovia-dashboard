"use client";
import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAntaqSeries } from '../useAntaqApi';
import { useDashboardData } from '../useDashboardData';

// ── Queries ──────────────────────────────────────────────────────────────────

// 0 = cabotagem total (doméstica + offshore)
// 1 = cabotagem doméstica pura (offshore expurgado)
const QUERIES = [
  { navegacao: 'Cabotagem', metrica: 'toneladas', freq: 'mensal', suavizacao: 'sum12', expurgar_offshore: false, apenas_movimentacao: true },
  { navegacao: 'Cabotagem', metrica: 'toneladas', freq: 'mensal', suavizacao: 'sum12', expurgar_offshore: true,  apenas_movimentacao: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function fmtMes(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MESES[+m - 1]}/${y.slice(2)}`;
}
function fmtNum(v, d = 1) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtRota(r) {
  const ori = r.origem.slice(0, 14)  + (r.origem.length  > 14 ? '…' : '');
  const dst = r.destino.slice(0, 14) + (r.destino.length > 14 ? '…' : '');
  return `#${r.rank} ${ori} (${r.uf_origem}) → ${dst} (${r.uf_destino})`;
}

const tickStyle    = { fill: '#9ca3af', fontSize: 11 };
const gridProps    = { stroke: '#374151', strokeDasharray: '3 3' };
const tooltipStyle = { backgroundColor: '#111827', border: '1px solid #4b5563', borderRadius: 8, fontSize: 12 };

// ── Componente ───────────────────────────────────────────────────────────────

export default function GraficoMediasMoveis32() {
  const { data: apiData,    loading: loadingApi, erro: erroApi } = useAntaqSeries(QUERIES);
  const { data: staticData, loading: loadingRt,  erro: erroRt  } = useDashboardData(['rotas.json']);
  const [topN, setTopN] = useState(10);

  const { stackData, cabDom, cabOff, cabPct } = useMemo(() => {
    if (!apiData) return {};

    const totalSerie   = apiData[0]?.serie || [];  // doméstica + offshore
    const domSerie     = apiData[1]?.serie || [];  // doméstica pura

    // Índice por data para merge
    const domByDate = Object.fromEntries(domSerie.map(pt => [pt.data, pt.sum12]));

    const stackData = totalSerie
      .map(pt => {
        const total     = pt.sum12 != null ? pt.sum12 / 1e6 : null;
        const dom       = domByDate[pt.data] != null ? domByDate[pt.data] / 1e6 : null;
        const offshore  = total != null && dom != null ? Math.max(0, total - dom) : null;
        return { data: pt.data, domestica: dom, offshore };
      })
      .filter(pt => pt.domestica != null)
      .sort((a, b) => a.data.localeCompare(b.data));

    // KPIs: último ponto disponível
    const ult = stackData[stackData.length - 1] || {};
    const cabDom = ult.domestica || 0;
    const cabOff = ult.offshore  || 0;
    const total  = cabDom + cabOff;
    const cabPct = total > 0 ? (cabOff / total * 100) : 0;

    return { stackData, cabDom, cabOff, cabPct };
  }, [apiData]);

  const loading = loadingApi || loadingRt;
  const erro    = erroApi    || erroRt;

  if (loading) return <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Carregando…</div>;
  if (erro)    return <div className="h-80 flex items-center justify-center text-red-400 text-sm">Erro: {erro}</div>;
  if (!stackData) return null;

  const rotasData  = staticData?.['rotas'] || [];
  const rotasSlice = [...rotasData].slice(0, topN).reverse();

  return (
    <div className="space-y-8">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Cabotagem doméstica',  val: fmtNum(cabDom, 0) + ' Mt/ano', cor: '#00A652' },
          { label: 'Petróleo offshore',    val: fmtNum(cabOff, 0) + ' Mt/ano', cor: '#c1322f' },
          { label: 'Offshore % do total', val: fmtNum(cabPct, 1) + '%',       cor: '#c1322f' },
        ].map(({ label, val, cor }) => (
          <div key={label} className="rounded-lg p-3"
               style={{ background: `${cor}15`, border: `1px solid ${cor}40` }}>
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-lg font-bold" style={{ color: cor }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Stacked area */}
      <div>
        <div className="text-sm font-semibold text-gray-200 mb-2">
          Volume anual da cabotagem (Mt, soma móvel 12m)
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={stackData} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="data" tickFormatter={fmtMes} tick={tickStyle} interval={11} />
            <YAxis tick={tickStyle} tickFormatter={v => fmtNum(v, 0)}
                   label={{ value: 'Milhões de toneladas', angle: -90, position: 'insideLeft',
                            fill: '#9ca3af', fontSize: 11, dy: 60 }} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtMes}
                     formatter={(v, n) => [fmtNum(v, 1) + ' Mt', n]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Area type="monotone" dataKey="domestica" name="Cabotagem doméstica"
                  stackId="1" stroke="#00A652" fill="#00A652" fillOpacity={0.6} />
            <Area type="monotone" dataKey="offshore" name="Petróleo offshore (FPSO/ZEE)"
                  stackId="1" stroke="#c1322f" fill="#c1322f" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-1">
          Soma móvel de 12 meses · offshore = FlagOffshore=1 expurgado da cabotagem total ·
          Dados: ANTAQ Estatística Aquaviária · API ao vivo.
        </p>
      </div>

      {/* Top rotas de contêiner */}
      {rotasData.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="text-sm font-semibold text-gray-200">
              Maiores rotas de contêiner entre portos brasileiros
            </div>
            <div className="flex gap-2 ml-auto">
              {[10, 20, 30].map(n => (
                <button key={n} onClick={() => setTopN(n)}
                        className="px-2.5 py-1 text-xs rounded-md transition-colors"
                        style={{
                          background: topN === n ? '#0099D8' : '#374151',
                          color:      topN === n ? '#fff' : '#d1d5db',
                          border:     '1px solid ' + (topN === n ? '#0099D8' : '#4b5563'),
                        }}>
                  Top {n}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(300, rotasSlice.length * 28)}>
            <BarChart data={rotasSlice} layout="vertical"
                      margin={{ top: 4, right: 100, bottom: 4, left: 220 }}>
              <CartesianGrid {...gridProps} horizontal={false} />
              <XAxis type="number" tick={tickStyle} tickFormatter={v => fmtNum(v, 1)}
                     label={{ value: 'Milhões de TEUs (acumulado 2010–2025)', position: 'insideBottom',
                              fill: '#9ca3af', fontSize: 10, dy: 14 }} />
              <YAxis type="category" dataKey={fmtRota} tick={{ fill: '#d1d5db', fontSize: 10 }} width={215} />
              <Tooltip contentStyle={tooltipStyle}
                       formatter={(v, _n, props) => {
                         const r = props.payload;
                         return [
                           fmtNum(v / 1e6, 2) + ' M TEUs',
                           r.cagr_pct != null
                             ? `CAGR: ${r.cagr_pct >= 0 ? '+' : ''}${r.cagr_pct.toFixed(1)}%/ano`
                             : '',
                         ];
                       }}
                       labelFormatter={v => v} />
              <Bar dataKey="teu_acumulado" nameKey="rank" radius={[0, 4, 4, 0]}
                   label={{ position: 'right', fontSize: 10, fill: '#d1d5db',
                            formatter: (_, entry) => entry?.payload?.cagr_pct != null
                              ? `${entry.payload.cagr_pct >= 0 ? '+' : ''}${entry.payload.cagr_pct.toFixed(1)}%/a`
                              : '' }}>
                {rotasSlice.map((r) => (
                  <Cell key={r.rank}
                        fill={r.cagr_pct > 15 ? '#00A652' : r.cagr_pct > 0 ? '#0099D8' : '#c1322f'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-1">
            Total acumulado de TEUs desde 2010 · rótulo = CAGR médio anual
          </p>
        </div>
      )}
    </div>
  );
}
