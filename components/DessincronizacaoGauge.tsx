"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { calculaIDN, classificaIDN } from "@/lib/calcula-idn";
import { IDN_HISTORICO, DADOS_ATUAIS, type DadosEstacao } from "@/lib/dados-historicos";

// Velocímetro SVG simples
function Velocimetro({ idn }: { idn: number }) {
  // Mapeia -1..+1 para 0..180 graus (0 = extremo esq, 180 = extremo dir)
  const angle = 90 + idn * 90; // graus
  const rad = (angle * Math.PI) / 180;
  const cx = 100, cy = 90, r = 70;
  const px = cx + r * Math.cos(Math.PI - rad);
  const py = cy - r * Math.sin(Math.PI - rad);

  // Cor do ponteiro
  const cor = idn > 0.2 ? "#D4922A" : idn < -0.2 ? "#A0153E" : "#00C04B";

  return (
    <svg viewBox="0 0 200 100" className="w-full max-w-[220px] mx-auto">
      {/* Arco fundo */}
      <path d="M 10 90 A 90 90 0 0 1 190 90" fill="none" stroke="#2c2c2c" strokeWidth="18" strokeLinecap="round" />
      {/* Zona Sul (vermelho, -1 a -0.2) */}
      <path d="M 10 90 A 90 90 0 0 1 64 23" fill="none" stroke="#A0153E" strokeWidth="18" strokeLinecap="round" opacity={0.7} />
      {/* Zona Neutro (verde, -0.2 a +0.2) */}
      <path d="M 64 23 A 90 90 0 0 1 136 23" fill="none" stroke="#00C04B" strokeWidth="18" strokeLinecap="round" opacity={0.7} />
      {/* Zona Norte (ouro, +0.2 a +1) */}
      <path d="M 136 23 A 90 90 0 0 1 190 90" fill="none" stroke="#D4922A" strokeWidth="18" strokeLinecap="round" opacity={0.7} />
      {/* Ponteiro */}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={cor} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={cor} />
      {/* Labels */}
      <text x="8"   y="108" fill="#A0153E" fontSize="9" textAnchor="middle">−1 Sul</text>
      <text x="100" y="12"  fill="#00C04B" fontSize="9" textAnchor="middle">0 Neutro</text>
      <text x="192" y="108" fill="#D4922A" fontSize="9" textAnchor="end">Norte +1</text>
    </svg>
  );
}

export default function DessincronizacaoGauge({
  dados = DADOS_ATUAIS,
}: {
  dados?: Record<string, DadosEstacao>;
}) {
  const idnAtual  = calculaIDN(dados.Curicuriari.cota_m, dados.Humaita.cota_m);
  const classAtual = classificaIDN(idnAtual);

  return (
    <div className="bg-azul-medio rounded-lg p-5">
      <div className="mb-4">
        <h2 className="text-white font-bold text-lg">Monitor de Dessincronização Norte-Sul</h2>
        <p className="text-gray-400 text-sm">
          IDN = posição relativa Curicuriari − Humaitá (faixa P10–P90)
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        {/* Velocímetro */}
        <div className="flex flex-col items-center gap-3">
          <Velocimetro idn={idnAtual} />
          <div className="text-center">
            <p className="text-4xl font-extrabold" style={{ color: classAtual.cor }}>
              {idnAtual > 0 ? "+" : ""}{idnAtual.toFixed(2)}
            </p>
            <p className="font-bold text-lg mt-1" style={{ color: classAtual.cor }}>
              {classAtual.regime}
            </p>
            <p className="text-gray-400 text-sm">{classAtual.descricao}</p>
          </div>


          {/* Legenda regimes */}
          <div className="w-full grid grid-cols-3 gap-2 text-xs mt-2">
            <div className="bg-azul-marinho rounded p-2 text-center border border-vermelho/40">
              <span className="text-vermelho font-bold block">Driver Sul</span>
              <span className="text-gray-400">IDN &lt; −0.2</span>
              <span className="text-gray-500 block">Padrão 2024</span>
            </div>
            <div className="bg-azul-marinho rounded p-2 text-center border border-verde/40">
              <span className="text-verde font-bold block">Neutro</span>
              <span className="text-gray-400">|IDN| ≤ 0.2</span>
              <span className="text-gray-500 block">Regime normal</span>
            </div>
            <div className="bg-azul-marinho rounded p-2 text-center border border-ouro/40">
              <span className="text-ouro font-bold block">Driver Norte</span>
              <span className="text-gray-400">IDN &gt; +0.2</span>
              <span className="text-gray-500 block">Padrão 2026</span>
            </div>
          </div>
        </div>

        {/* Série histórica IDN */}
        <div>
          <p className="text-gray-300 text-sm font-semibold mb-2">Evolução histórica do IDN (2024–2026)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={IDN_HISTORICO} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" />
              <XAxis
                dataKey="data"
                tick={{ fill: "#9CA3AF", fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(0, 7)}
                interval={2}
              />
              <YAxis
                tick={{ fill: "#9CA3AF", fontSize: 10 }}
                domain={[-0.7, 0.8]}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #2c2c2c", color: "#fff", fontSize: 12 }}
                formatter={(v: unknown) => [String(v), "IDN"]}
                labelFormatter={(l) => String(l)}
              />
              {/* Faixas de regime */}
              <ReferenceArea y1={0.2}  y2={0.8}  fill="#D4922A" fillOpacity={0.15} />
              <ReferenceArea y1={-0.2} y2={0.2}  fill="#00C04B" fillOpacity={0.10} />
              <ReferenceArea y1={-0.7} y2={-0.2} fill="#A0153E" fillOpacity={0.15} />
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="4 2" />
              <ReferenceLine y={0.2}  stroke="#D4922A" strokeDasharray="3 2" strokeOpacity={0.6} />
              <ReferenceLine y={-0.2} stroke="#A0153E" strokeDasharray="3 2" strokeOpacity={0.6} />
              <Line
                dataKey="idn"
                stroke="#60A5FA"
                strokeWidth={2}
                dot={{ r: 3, fill: "#60A5FA" }}
                name="IDN"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-gray-500 text-xs mt-1">
            Faixa laranja = regime Norte | verde = neutro | vermelha = regime Sul
          </p>
        </div>
      </div>
    </div>
  );
}
