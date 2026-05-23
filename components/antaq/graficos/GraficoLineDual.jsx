"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceArea, ResponsiveContainer,
} from 'recharts';

const fmtBR = (v, casas = 1) => {
  if (v == null || isNaN(v)) return '—';
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(casas) + ' bi';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(casas) + ' M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(casas) + ' k';
  return v.toFixed(casas);
};

const fmtData = (v) => (v ? String(v).slice(0, 7) : '');

/**
 * Linhas mensais com eixo X temporal (ex: #30 PortGDP × PIM-PF).
 *
 * Suporta:
 *  - séries normais (cor sólida)
 *  - séries com `estilo: 'dashed'` (linha tracejada — usado para forecast)
 *  - banda de confiança entre dois campos (banda_confianca: {low, high, cor})
 *
 * spec: {
 *   tipo: 'line_dual',
 *   x: 'mes',
 *   label_x, label_y,
 *   series: [{y, label, cor, estilo?}],
 *   banda_confianca?: {low, high, cor},
 * }
 */
export default function GraficoLineDual({ dados, spec }) {
  const dataPlot = [...dados]
    .filter((r) => r[spec.x] != null)
    .sort((a, b) => String(a[spec.x]).localeCompare(String(b[spec.x])));

  // Se há banda de confiança, monta o campo _banda = [low, high]
  const banda = spec.banda_confianca;
  const dataPrepared = banda
    ? dataPlot.map((r) => ({
        ...r,
        _banda:
          r[banda.low] != null && r[banda.high] != null
            ? [r[banda.low], r[banda.high]]
            : null,
      }))
    : dataPlot;

  // Identifica a região de forecast para sombrear
  const forecastSerie = spec.series.find((s) => s.estilo === 'dashed');
  let forecastStart = null;
  let forecastEnd = null;
  if (forecastSerie) {
    const pontosFc = dataPlot.filter((r) => r[forecastSerie.y] != null);
    if (pontosFc.length > 1) {
      forecastStart = pontosFc[1][spec.x]; // pula o ponto-bridge
      forecastEnd = pontosFc[pontosFc.length - 1][spec.x];
    } else if (pontosFc.length === 1) {
      forecastStart = pontosFc[0][spec.x];
      forecastEnd = pontosFc[0][spec.x];
    }
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dataPrepared} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey={spec.x}
            tickFormatter={fmtData}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            minTickGap={36}
          />
          <YAxis
            tickFormatter={(v) => fmtBR(v, 0)}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: spec.label_y, angle: -90, position: 'insideLeft',
                     fill: '#9ca3af', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151',
                            borderRadius: 8, color: '#e5e7eb' }}
            labelFormatter={fmtData}
            formatter={(v, n) => {
              if (Array.isArray(v)) return [`${fmtBR(v[0], 1)} – ${fmtBR(v[1], 1)}`, n];
              return [fmtBR(v, 1), n];
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} />

          {/* Sombra leve na região de forecast */}
          {forecastStart && forecastEnd && (
            <ReferenceArea
              x1={forecastStart}
              x2={forecastEnd}
              fill="#c1322f"
              fillOpacity={0.04}
              stroke="none"
            />
          )}

          {/* Banda de confiança 80% — renderizada antes das linhas para ficar atrás */}
          {banda && (
            <Area
              dataKey="_banda"
              name="Intervalo 80%"
              stroke="none"
              fill={banda.cor || '#c1322f'}
              fillOpacity={0.18}
              connectNulls={false}
              isAnimationActive={false}
              legendType="none"
            />
          )}

          {/* Linhas (sólidas e tracejadas) */}
          {spec.series.map((s) => (
            <Line
              key={s.y}
              type="monotone"
              dataKey={s.y}
              name={s.label}
              stroke={s.cor || '#0099D8'}
              strokeWidth={s.estilo === 'dashed' ? 2.2 : 2}
              strokeDasharray={s.estilo === 'dashed' ? '6 4' : undefined}
              dot={s.estilo === 'dashed' ? { r: 3, fill: s.cor } : false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      {forecastSerie && forecastStart && (
        <div className="mt-2 text-center text-xs text-gray-400">
          Área tracejada à direita é a previsão IBI para os próximos meses
          (intervalo de 80% em vermelho claro).
        </div>
      )}
    </div>
  );
}
