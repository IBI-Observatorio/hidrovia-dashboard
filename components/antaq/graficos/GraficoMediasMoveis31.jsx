"use client";
import { useState, useMemo } from 'react';
import {
  ComposedChart, LineChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { useDashboardData } from '../useDashboardData';

// ── Constantes ───────────────────────────────────────────────────────────────

const NATUREZAS = ['granel_solido', 'granel_liquido', 'carga_geral', 'conteinerizada'];

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

// Configuração dos dois segmentos de contêiner
const SEGMENTOS = [
  {
    key:       'longo_curso',
    label:     'Longo Curso',
    sublabel:  'Contêiner internacional (~70% do total)',
    cor:       '#0099D8',
    corBanda:  'rgba(0, 153, 216, 0.20)',
    corObs:    '#0099D8',
    corPred:   '#9ca3af',
    corCentral:'#D4922A',
    descricao:
      'Movimentação internacional de contêineres (exportação + importação). ' +
      'Modelo combina atividade brasileira, câmbio BRL/USD, Brent (proxy de freight global) ' +
      'e CNY/USD (proxy do ciclo China), com termo autorregressivo.',
  },
  {
    key:       'cabotagem',
    label:     'Cabotagem',
    sublabel:  'Contêiner doméstico costeiro (~30% do total)',
    cor:       '#00A652',
    corBanda:  'rgba(0, 166, 82, 0.18)',
    corObs:    '#00A652',
    corPred:   '#9ca3af',
    corCentral:'#D4922A',
    descricao:
      'Movimentação doméstica entre portos brasileiros (Santos↔Manaus, etc.). ' +
      'Modelo combina atividade industrial (IBC-Br, PIM-PF), custo do substituto rodoviário ' +
      '(IPCA diesel) e termos autorregressivos para capturar a inércia de contratos longos.',
  },
];

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

// ── Subcomponente: projeção de um segmento ──────────────────────────────────

function ProjecaoSegmento({ cfg, segmento }) {
  if (!segmento) return null;

  // Constrói dataset unificado: observado, predito, central, faixa
  const fcMap     = Object.fromEntries((segmento.forecast || []).map(r => [r.data, r]));
  const obsLookup = Object.fromEntries((segmento.serie    || []).map(r => [r.data, r]));
  const allDates  = [...new Set([...Object.keys(obsLookup), ...Object.keys(fcMap)])].sort();
  const merged    = allDates.map(date => {
    const o = obsLookup[date];
    const f = fcMap[date];
    return {
      data:      date,
      observado: o?.observado    ?? null,
      predito:   o?.predito      ?? null,
      central:   f?.central_pct  ?? null,
      fc_low:    f?.low_pct      ?? null,
      fc_span:   f ? (f.high_pct - f.low_pct) : null,
    };
  });

  const m = segmento.metricas?.walk_forward_modelo || {};
  const ganho = segmento.metricas?.ganho_rmse_vs_naive_pct ?? 0;
  const banda = segmento.banda || {};
  const sigma = banda.sigma_recente;
  const bias  = banda.bias_correction_pp;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-base font-semibold" style={{ color: cfg.cor }}>
            {cfg.label}
            <span className="ml-2 text-xs font-normal text-gray-500">{cfg.sublabel}</span>
          </h4>
        </div>
        <div className="text-[11px] text-gray-500 tabular-nums">
          RMSE OOS: {m.rmse_pp}pp · R²: {m.r2} · ρ: {m.corr} ·{' '}
          <span className={ganho > 0 ? 'text-green-400' : 'text-red-400'}>
            {ganho > 0 ? '+' : ''}{ganho}% vs naïve
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{cfg.descricao}</p>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={merged} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="data" tickFormatter={fmtMes} tick={tickStyle} interval={11} />
          <YAxis tick={tickStyle} tickFormatter={v => fmtNum(v, 1)}
                 label={{ value: 'a/a (%)', angle: -90, position: 'insideLeft',
                          fill: '#9ca3af', fontSize: 11, dy: 30 }} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtMes}
                   formatter={(v, n) => [fmtNum(v, 2) + '%', n]} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" />
          {/* Faixa de incerteza */}
          <Area type="monotone" dataKey="fc_low"  stackId="fc"
                fill="transparent" stroke="none" legendType="none" />
          <Area type="monotone" dataKey="fc_span" stackId="fc"
                fill={cfg.corBanda} stroke="none" name="Margem de erro (80%)" />
          {/* Séries históricas */}
          <Line type="monotone" dataKey="observado" name={`Observado`}
                stroke={cfg.corObs} strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="predito" name="Modelo (in-sample)"
                stroke={cfg.corPred} strokeWidth={1.4} strokeDasharray="4 2"
                dot={false} connectNulls />
          {/* Projeção central */}
          <Line type="monotone" dataKey="central" name="Projeção 5m à frente"
                stroke={cfg.corCentral} strokeWidth={2.4}
                dot={{ r: 4, fill: cfg.corCentral }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Banda 80% conformal sobre resíduos dos últimos 24m (σ={sigma}pp).
        {bias != null && Math.abs(bias) > 0.5 && (
          <> Correção de bias estrutural: <span className="text-gray-400">{bias > 0 ? '+' : ''}{bias}pp</span>{' '}
          (modelo estava sub-prevendo o regime atual; central foi ajustada).</>
        )}
      </p>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function GraficoMediasMoveis31() {
  const { data, loading, erro } = useDashboardData(['series-tendencia.json', 'forecast.json']);
  const [metrica, setMetrica] = useState('ma12_mt');

  const { historico, forecast, momentumAtual } = useMemo(() => {
    if (!data) return {};
    const rawSeries = data['series-tendencia'];
    if (!rawSeries) return {};

    // ── Pivot histórico ─────────────────────────────────────────────────────
    const byDate = {};
    NATUREZAS.forEach(nat => {
      const serie = rawSeries.series?.[nat] || [];
      for (const pt of serie) {
        if (!byDate[pt.data]) byDate[pt.data] = { data: pt.data };
        byDate[pt.data][`ma12_mt_${nat}`] = pt.ma12_mt ?? null;
      }
    });
    const historico = Object.values(byDate).sort((a, b) => a.data.localeCompare(b.data));

    // YoY MA12 client-side
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

    // Índice base 100
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

    // Momentum atual
    const momentumAtual = {};
    for (const nat of NATUREZAS) {
      for (let i = historico.length - 1; i >= 0; i--) {
        const v = historico[i][`yoy_ma_pct_${nat}`];
        if (v != null) { momentumAtual[nat] = v; break; }
      }
    }

    const forecast = data['forecast'] || {};
    return { historico, forecast, momentumAtual };
  }, [data]);

  if (loading) return <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Carregando…</div>;
  if (erro)    return (
    <div className="h-80 flex flex-col items-center justify-center gap-3">
      <p className="text-red-400 text-sm">Erro ao carregar dados: {erro}</p>
      <button onClick={() => window.location.reload()}
              className="px-4 py-1.5 text-xs rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600">
        Tentar novamente
      </button>
    </div>
  );
  if (!historico) return null;

  const fmtMom  = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + Math.abs(v).toFixed(1) + '%';

  const yKey = (nat) =>
    metrica === 'indice100'  ? `indice100_${nat}`  :
    metrica === 'yoy_ma_pct' ? `yoy_ma_pct_${nat}` :
    `ma12_mt_${nat}`;

  const yLabel =
    metrica === 'indice100'  ? 'Índice (base 100)' :
    metrica === 'yoy_ma_pct' ? 'Crescimento a/a (%)' :
    'Mt/mês (média 12m)';

  return (
    <div className="space-y-10">
      {/* ── Projeção: 2 segmentos empilhados ───────────────────────────────── */}
      <div className="space-y-6">
        <div>
          <div className="text-base font-semibold text-white mb-1">E o que vem pelos próximos meses?</div>
          <p className="text-xs text-gray-400 leading-relaxed max-w-3xl">
            O contêiner brasileiro é dois mercados diferentes:{' '}
            <span className="text-blue-300">longo curso</span> (rotas internacionais, ~70% do volume)
            responde ao ciclo global; <span className="text-green-400">cabotagem</span> (entre portos
            brasileiros, ~30%) responde à atividade doméstica. Por isso treinamos um modelo para cada,
            com preditores específicos.
          </p>
        </div>
        {SEGMENTOS.map(cfg => (
          <ProjecaoSegmento key={cfg.key} cfg={cfg} segmento={forecast[cfg.key]} />
        ))}
      </div>

      {/* ── Contexto histórico (sem alteração) ─────────────────────────────── */}
      <div className="border-t border-gray-700 pt-6">
        <div className="text-base font-semibold text-white mb-3">
          Contexto histórico: médias móveis por carga (2011–2026)
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
          Dados: ANTAQ Estatística Aquaviária · Atualizado mensalmente.
        </p>
      </div>
    </div>
  );
}
