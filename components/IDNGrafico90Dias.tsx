"use client";

import {
  LineChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
  ComposedChart,
} from "recharts";
import { IDN_RECENTE_DIARIO } from "@/lib/idn-historico-calculado";
import { CALIBRACAO_IDN } from "@/lib/limiares-idn";
import { INCERTEZA_IDN } from "@/lib/incerteza-idn";

// Mostra os últimos ~90 dias de IDN diário com banda ±2σ de incerteza.
// Dados vêm da série calculada offline (até o último ponto consolidado dos CSVs).
// O valor "atual" no DessincronizacaoGauge pode ser mais recente — este é o
// histórico recente consolidado.

export default function IDNGrafico90Dias() {
  const banda = INCERTEZA_IDN.banda_idn_2sigma;

  // Últimos 90 dias da série + banda como tupla [lo, hi] (range area)
  const dados = IDN_RECENTE_DIARIO.slice(-90).map((p) => ({
    data: p.data,
    idn:  p.idn,
    banda: [p.idn - banda, p.idn + banda] as [number, number],
  }));

  const primeira = dados[0]?.data ?? "";
  const ultima   = dados.at(-1)?.data ?? "";

  return (
    <div className="bg-azul-medio rounded-lg p-5">
      <div className="mb-4">
        <h2 className="text-white font-bold text-lg">Trajetória recente do IDN (90 dias)</h2>
        <p className="text-gray-400 text-sm">
          Evolução diária consolidada · {primeira} → {ultima} · banda sombreada = ±{banda.toFixed(2)} (IC95%)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" />
          <XAxis
            dataKey="data"
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickFormatter={(v: string) => v.slice(5)}
            interval={10}
          />
          <YAxis
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            domain={[-1.2, 1.2]}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #2c2c2c", color: "#fff", fontSize: 12 }}
            formatter={(v: unknown, name) => {
              if (name === "IDN") return [Number(v).toFixed(2), "IDN"];
              return null as unknown as [string, string];
            }}
            labelFormatter={(l) => `Data: ${l}`}
          />

          {/* Faixas de regime calibradas */}
          <ReferenceArea y1={CALIBRACAO_IDN.fronteiras[1]} y2={1.2} fill="#D4922A" fillOpacity={0.12} />
          <ReferenceArea y1={CALIBRACAO_IDN.fronteiras[0]} y2={CALIBRACAO_IDN.fronteiras[1]} fill="#00C04B" fillOpacity={0.08} />
          <ReferenceArea y1={-1.2} y2={CALIBRACAO_IDN.fronteiras[0]} fill="#A0153E" fillOpacity={0.12} />
          <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="4 2" />

          {/* Banda de incerteza ±2σ (range area entre lo e hi) */}
          <Area
            type="monotone"
            dataKey="banda"
            stroke="none"
            fill="#60A5FA"
            fillOpacity={0.18}
            isAnimationActive={false}
            legendType="none"
          />

          {/* Linha IDN */}
          <Line
            type="monotone"
            dataKey="idn"
            stroke="#60A5FA"
            strokeWidth={2}
            dot={false}
            name="IDN"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-gray-500 text-xs mt-2 leading-relaxed">
        Faixas: <span className="text-ouro">Norte (IDN &gt; {CALIBRACAO_IDN.fronteiras[1].toFixed(2)})</span> ·
        <span className="text-verde"> Sincronizado</span> ·
        <span className="text-vermelho"> Sul (IDN &lt; {CALIBRACAO_IDN.fronteiras[0].toFixed(2)})</span>.
        Banda azul = incerteza ±2σ via bootstrap (N={INCERTEZA_IDN.n_bootstrap}).
      </p>
    </div>
  );
}
