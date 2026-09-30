"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// Calado oficial (CMR, demais cargas) 2026 × temporadas 2024 e 2025, eixo set–dez.
// Sem modelo: só o número publicado pela Capitania.

export interface PontoCMR { data: string; demais: number; petroleo: number; previsao: boolean }
export interface PontoHist { md: string; cmr: number }

interface Props {
  serie2026: PontoCMR[];
  historico: Record<string, PontoHist[]>;
}

type Linha = { md: string; a2024?: number; a2025?: number; obs2026?: number; prev2026?: number };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtMD = (md: string) => { const [m, d] = md.split("-"); return `${d}/${MESES[+m - 1]}`; };

function montaLinhas({ serie2026, historico }: Props): Linha[] {
  const mapa = new Map<string, Linha>();
  const pega = (md: string) => {
    if (!mapa.has(md)) mapa.set(md, { md });
    return mapa.get(md)!;
  };
  for (const p of historico["2024"] ?? []) pega(p.md).a2024 = p.cmr;
  for (const p of historico["2025"] ?? []) pega(p.md).a2025 = p.cmr;
  serie2026.forEach((p, i) => {
    const l = pega(p.data.slice(5));
    if (p.previsao) {
      l.prev2026 = p.demais;
    } else {
      l.obs2026 = p.demais;
      // Emenda a linha tracejada no último observado
      if (serie2026[i + 1]?.previsao) l.prev2026 = p.demais;
    }
  });
  return [...mapa.values()]
    .filter((l) => l.md >= "09-01")
    .sort((a, b) => a.md.localeCompare(b.md));
}

export default function CaladoCapitaniaChart(props: Props) {
  const dados = montaLinhas(props);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" />
        <XAxis
          dataKey="md"
          tick={{ fill: "#9CA3AF", fontSize: 10 }}
          tickFormatter={fmtMD}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: "#9CA3AF", fontSize: 10 }}
          domain={[5, 14]}
          tickFormatter={(v: number) => `${v} m`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#111827", border: "1px solid #2c2c2c", color: "#fff", fontSize: 12 }}
          labelFormatter={(l) => fmtMD(String(l))}
          formatter={(v: unknown, name) => [`${Number(v).toFixed(2).replace(".", ",")} m`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
        <Line dataKey="a2024" name="2024" stroke="#A0153E" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls isAnimationActive={false} />
        <Line dataKey="a2025" name="2025" stroke="#00C04B" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls isAnimationActive={false} />
        <Line dataKey="obs2026" name="2026" stroke="#FFFFFF" strokeWidth={2.5} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
        <Line dataKey="prev2026" name="2026 — previsão da Capitania" stroke="#FFFFFF" strokeWidth={2} strokeDasharray="2 3" dot={false} connectNulls isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
