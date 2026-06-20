"use client";

import {
  Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
  ComposedChart,
} from "recharts";
import { CALIBRACAO_IDN } from "@/lib/limiares-idn";
import { INCERTEZA_IDN } from "@/lib/incerteza-idn";
import type { PontoIDN } from "@/lib/ana-idn-series";

// Mostra os últimos 90 pontos do IDN com banda ±2σ de incerteza.
// Dados vêm via prop serieIDN (série gerada pelo pipeline ANA).

export default function IDNGrafico90Dias({ serieIDN }: { serieIDN: PontoIDN[] }) {
  const banda = INCERTEZA_IDN.banda_idn_2sigma;

  // Últimos 90 pontos + banda como tupla [lo, hi] (range area)
  const dados = serieIDN.slice(-90).map((p) => ({
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
          Evolução consolidada · {primeira} → {ultima}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" />
          <XAxis
            dataKey="data"
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickFormatter={(v: string) => { const [, m, d] = v.split("-"); return `${d}/${m}`; }}
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
            labelFormatter={(l) => { const [a, m, d] = String(l).split("-"); return `Data: ${d}/${m}/${a}`; }}
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
        Faixas: <span className="text-ouro">Driver Norte</span> ·
        <span className="text-verde"> Sincronizado</span> ·
        <span className="text-vermelho"> Driver Sul</span>.
        Banda azul = incerteza ±2σ via bootstrap.
      </p>
    </div>
  );
}
