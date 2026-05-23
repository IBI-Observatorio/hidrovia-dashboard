"use client";
import { useState, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { useAntaqSeries } from '../useAntaqApi';
import { useDashboardData } from '../useDashboardData';

// ── Constantes ───────────────────────────────────────────────────────────────

const NATUREZA_API = {
  granel_solido:  'Granel Sólido',
  granel_liquido: 'Granel Líquido e Gasoso',
  carga_geral:    'Carga Geral',
  conteinerizada: 'Carga Conteinerizada',
};
const NATUREZAS = Object.keys(NATUREZA_API);

const CORES = {
  granel_solido:  '#00A652',
  granel_liquido: '#c1322f',
  carga_geral:    '#D4922A',
  conteinerizada: '#0099D8',
};
const LABELS = {
  granel_solido:  'Granel Sólido',
  granel_liquido: 'Granel Líquido e Gasoso',
  carga_geral:    'Carga Geral',
  conteinerizada: 'Contêiner',
};

// Uma query por natureza — MA12 dos últimos 15 anos
const QUERIES_SERIES = NATUREZAS.map(nat => ({
  natureza:             NATUREZA_API[nat],
  metrica:              'toneladas',
  freq:                 'mensal',
  suavizacao:           'ma12',
  apenas_movimentacao:  true,
}));

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

const tickStyle    = { fill: '#9ca3af', fontSize: 11 };
const gridProps    = { stroke: '#374151', strokeDasharray: '3 3' };
const tooltipStyle = { backgroundColor: '#111827', border: '1px solid #4b5563', borderRadius: 8, fontSize: 12 };

// ── Componente ───────────────────────────────────────────────────────────────

export default function GraficoMediasMoveis31() {
  const { data: seriesData, loading: loadingSeries, erro: erroSeries } = useAntaqSeries(QUERIES_SERIES);
  const { data: staticData, loading: loadingFc,    erro: erroFc     } = useDashboardData(['forecast.json']);
  const [metrica, setMetrica] = useState('ma12_mt');

  const { historico, forecastData, momentumAtual } = useMemo(() => {
    if (!seriesData) return {};

    // ── Pivot: [{ data, ma12_mt_X, yoy_ma_pct_X, indice100_X }] ─────────
    const byDate = {};

    NATUREZAS.forEach((nat, i) => {
      const serie = seriesData[i]?.serie || [];
      for (const pt of serie) {
        if (!byDate[pt.data]) byDate[pt.data] = { data: pt.data };
        // ma12 da API está em toneladas → converter para Mt
        byDate[pt.data][`ma12_mt_${nat}`] = pt.ma12 != null ? pt.ma12 / 1e6 : null;
      }
    });

    const historico = Object.values(byDate).sort((a, b) => a.data.localeCompare(b.data));

    // ── YoY da MA12 calculado client-side ─────────────────────────────────
    for (let i = 12; i < historico.length; i++) {
      for (const nat of NATUREZAS) {
        const curr = historico[i][`ma12_mt_${nat}`];
        const prev = historico[i - 12][`ma12_mt_${nat}`];
        historico[i][`yoy_ma_pct_${nat}`] =
          curr != null && prev != null && prev !== 0
            ? ((curr / prev) - 1) * 100
            : null;
      }
    }

    // ── Índice base 100 (primeiro mês com todas as séries disponíveis) ────
    let baseValues = {};
    for (const row of historico) {
      if (NATUREZAS.every(n => (row[`ma12_mt_${n}`] ?? 0) > 0)) {
        baseValues = Object.fromEntries(NATUREZAS.map(n => [n, row[`ma12_mt_${n}`]]));
        break;
      }
    }
    for (const row of historico) {
      for (const nat of NATUREZAS) {
        const base = baseValues[nat];
        const v    = row[`ma12_mt_${nat}`];
        row[`indice100_${nat}`] = base && v != null ? (v / base * 100) : null;
      }
    }

    // ── Momentum atual: último YoY disponível de cada natureza ───────────
    const momentumAtual = {};
    for (const nat of NATUREZAS) {
      for (let i = historico.length - 1; i >= 0; i--) {
        const v = historico[i][`yoy_ma_pct_${nat}`];
        if (v != null) { momentumAtual[nat] = v; break; }
      }
    }

    // ── Forecast (OLS, arquivo estático) ─────────────────────────────────
    const fc = staticData?.['forecast'] || {};
    const obsMap = {};
    for (const r of (fc.serie || [])) obsMap[r.data] = { observado: r.observado, predito: r.predito };
    const obs = Object.entries(obsMap).sort(([a],[b]) => a.localeCompare(b))
      .map(([data, v]) => ({ data, ...v }));
    const forecastData = {
      obs,
      fc:     fc.forecast || [],
      modelo: fc.modelo   || {},
    };

    return { historico, forecastData, momentumAtual };
  }, [seriesData, staticData]);

  const loading = loadingSeries || loadingFc;
  const erro    = erroSeries   || erroFc;

  if (loading) return <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Carregando…</div>;
  if (erro)    return <div className="h-80 flex items-center justify-center text-red-400 text-sm">Erro: {erro}</div>;
  if (!historico) return null;

  const fmtMom = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + Math.abs(v).toFixed(1) + '%';

  const yKey = (nat) =>
    metrica === 'indice100'  ? `indice100_${nat}`  :
    metrica === 'yoy_ma_pct' ? `yoy_ma_pct_${nat}` :
    `ma12_mt_${nat}`;

  const yLabel =
    metrica === 'indice100'  ? 'Índice (base 100)' :
    metrica === 'yoy_ma_pct' ? 'Crescimento a/a (%)' :
    'Mt/mês (média 12m)';

  const fcRows = (forecastData.fc || []).map(r => ({
    data:    r.data,
    central: r.central_pct,
    high:    r.high_pct,
    low:     r.low_pct,
    band:    [r.low_pct, r.high_pct],
  }));

  return (
    <div className="space-y-8">
      {/* ── Projeção primeiro ────────────────────────────────────────────── */}
      <div>
        <div className="text-base font-semibold text-white mb-1">E o que vem pelos próximos meses?</div>
        <p className="text-xs text-gray-400 mb-3 leading-relaxed max-w-3xl">
          Projeção do ritmo do contêiner usando dois sinais antecedentes:
          atividade econômica geral (IBC-Br do Banco Central, defasagem de 5 meses) e
          ritmo da carga geral 12 meses antes. A faixa dourada é a margem de erro típica.{' '}
          {forecastData.modelo.r2_oos != null && (
            <span>
              O modelo explica ~{Math.round(forecastData.modelo.r2_oos * 100)}% da variação
              fora da amostra (correlação: {(forecastData.modelo.corr_oos || 0).toFixed(2)}).
            </span>
          )}
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="data" tickFormatter={fmtMes} tick={tickStyle} padding={{ right: 20 }} />
            <YAxis tick={tickStyle} tickFormatter={v => fmtNum(v, 1)}
                   label={{ value: 'Crescimento a/a (%)', angle: -90, position: 'insideLeft',
                            fill: '#9ca3af', fontSize: 11, dy: 70 }} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtMes}
                     formatter={(v, n) => [fmtNum(v, 2) + '%', n]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" />
            <Line data={forecastData.obs} dataKey="observado" name="Observado (contêiner)"
                  stroke="#0099D8" strokeWidth={2} dot={false} connectNulls />
            <Line data={forecastData.obs} dataKey="predito" name="Calculado pelo modelo"
                  stroke="#9ca3af" strokeWidth={1.4} strokeDasharray="4 2" dot={false} connectNulls />
            <Area data={fcRows} dataKey="band" type="monotone"
                  fill="rgba(212,146,42,0.18)" stroke="none"
                  name="Margem de erro" legendType="none" />
            <Line data={fcRows} dataKey="central" name="Projeção (5m à frente)"
                  stroke="#D4922A" strokeWidth={2.4} dot={{ r: 4, fill: '#D4922A' }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Contexto histórico ───────────────────────────────────────────── */}
      <div className="border-t border-gray-700 pt-6">
        <div className="text-base font-semibold text-white mb-3">
          Contexto histórico: 15 anos de médias móveis por carga
        </div>

        {/* KPI cards de momentum */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {NATUREZAS.map(nat => (
            <div key={nat} className="rounded-lg p-3"
                 style={{ background: `${CORES[nat]}15`, border: `1px solid ${CORES[nat]}40` }}>
              <div className="text-xs text-gray-400 mb-1">{LABELS[nat]}</div>
              <div className="text-lg font-bold" style={{ color: CORES[nat] }}>
                {fmtMom(momentumAtual[nat])} a/a
              </div>
            </div>
          ))}
        </div>

        {/* Seletor de métrica */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-xs text-gray-400">Como medir:</span>
          {[
            { v: 'ma12_mt',    l: 'Volume (Mt/mês, MM12)' },
            { v: 'indice100',  l: 'Índice base 100' },
            { v: 'yoy_ma_pct', l: 'Crescimento a/a (%)' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setMetrica(v)}
                    className="px-3 py-1 text-xs rounded-md transition-colors"
                    style={{
                      background: metrica === v ? '#0099D8' : '#374151',
                      color:      metrica === v ? '#fff' : '#d1d5db',
                      border:     '1px solid ' + (metrica === v ? '#0099D8' : '#4b5563'),
                    }}>
              {l}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={historico} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="data" tickFormatter={fmtMes} tick={tickStyle} interval={11} />
            <YAxis tick={tickStyle} tickFormatter={v => fmtNum(v, metrica === 'indice100' ? 0 : 1)}
                   label={{ value: yLabel, angle: -90, position: 'insideLeft',
                            fill: '#9ca3af', fontSize: 11, dy: 60 }} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtMes}
                     formatter={(v, n) => [fmtNum(v, metrica === 'indice100' ? 1 : 2), n]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {metrica === 'indice100'  && <ReferenceLine y={100} stroke="#6b7280" strokeDasharray="4 2" />}
            {metrica === 'yoy_ma_pct' && <ReferenceLine y={0}   stroke="#6b7280" strokeDasharray="4 2" />}
            {NATUREZAS.map(nat => (
              <Line key={nat} type="monotone" dataKey={yKey(nat)} name={LABELS[nat]}
                    stroke={CORES[nat]} strokeWidth={2.2} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-1">
          Cada ponto = média dos 12 meses anteriores — remove sazonalidade e revela tendência real.
          Dados: ANTAQ Estatística Aquaviária · API ao vivo.
        </p>
      </div>
    </div>
  );
}
