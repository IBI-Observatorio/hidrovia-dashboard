"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { calculaIDN, classificaIDN } from "@/lib/calcula-idn";
import { calculaIDNVazao } from "@/lib/calcula-idn-vazao";
import { SUB_BACIAS, type EstacaoComDOY } from "@/lib/sub-bacias";
import { SUB_BACIAS_VAZAO, type EstacaoVazao } from "@/lib/sub-bacias-vazao";
import { CALIBRACAO_IDN } from "@/lib/limiares-idn";
import { INCERTEZA_IDN } from "@/lib/incerteza-idn";
import { PCA_VALIDACAO } from "@/lib/pca-validacao";
import HMMTransicaoRegime from "./HMMTransicaoRegime";
import type { CotaIDN, VazaoIDN } from "@/lib/fetch-dados";
import { DADOS_ATUAIS, type DadosEstacao } from "@/lib/dados-historicos";
import { IDN_HISTORICO_CALCULADO } from "@/lib/idn-historico-calculado";

// Velocímetro SVG simples
function Velocimetro({ idn }: { idn: number }) {
  // Mapeia -1..+1 para 0..180 graus (0 = extremo esq, 180 = extremo dir).
  // Clampa apenas a visualização — o valor numérico exibido pode extrapolar.
  const idnVis = Math.max(-1, Math.min(1, idn));
  const angle = 90 + idnVis * 90; // graus
  const rad = (angle * Math.PI) / 180;
  const cx = 100, cy = 90, r = 70;
  const px = cx + r * Math.cos(Math.PI - rad);
  const py = cy - r * Math.sin(Math.PI - rad);

  // Cor do ponteiro — usa fronteiras calibradas (GMM)
  const fSul   = CALIBRACAO_IDN.fronteiras[0];
  const fNorte = CALIBRACAO_IDN.fronteiras[1];
  const cor = idn > fNorte ? "#D4922A" : idn < fSul ? "#A0153E" : "#00C04B";

  return (
    // viewBox expandido 16px acima (y=-16) para dar espaço à label "0 Neutro"
    // acima da faixa verde (arco topo em y≈0, stroke 18px → borda superior em y≈−9)
    <svg viewBox="0 -16 200 116" className="w-full max-w-[220px] mx-auto">
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
      {/* Labels — "0 Neutro" posicionada acima da borda superior do arco (y≈−9) */}
      <text x="8"   y="108" fill="#A0153E" fontSize="9" textAnchor="middle">−1 Sul</text>
      <text x="100" y="-4"  fill="#00C04B" fontSize="9" textAnchor="middle">0 Neutro</text>
      <text x="192" y="108" fill="#D4922A" fontSize="9" textAnchor="end">Norte +1</text>
    </svg>
  );
}

export default function DessincronizacaoGauge({
  dados = DADOS_ATUAIS,
  cotasIDN,
  vazoesIDN,
}: {
  dados?: Record<string, DadosEstacao>;
  cotasIDN?: Partial<Record<EstacaoComDOY, CotaIDN>>;
  vazoesIDN?: Partial<Record<EstacaoVazao, VazaoIDN>>;
}) {
  // Monta o mapa de cotas: prioriza cotasIDN (API ANA), cai para dados do painel.
  // SGC removido em mai/2026 — sem telemetria ANA viva; posicaoSubBacia()
  // renormaliza automaticamente os pesos quando a estação está ausente.
  const cotasParaIDN: Partial<Record<EstacaoComDOY, number>> = {
    Humaita:     cotasIDN?.Humaita?.cota_m     ?? dados.Humaita?.cota_m,
    PortoVelho:  cotasIDN?.PortoVelho?.cota_m  ?? dados.PortoVelho?.cota_m,
    Manicore:    cotasIDN?.Manicore?.cota_m,
    Curicuriari: cotasIDN?.Curicuriari?.cota_m,
    Caracarai:   cotasIDN?.Caracarai?.cota_m,
    Serrinha:    cotasIDN?.Serrinha?.cota_m,
    Moura:       cotasIDN?.Moura?.cota_m,
    Manicore:    cotasIDN?.Manicore?.cota_m,
    Labrea:      cotasIDN?.Labrea?.cota_m,
    Abuna:       cotasIDN?.Abuna?.cota_m,
  };

  // dataRef: data mais recente disponível entre as estações IDN.
  const dataRef =
    Object.values(cotasIDN ?? {})
      .map((v) => v?.ultima_atualizacao ?? "")
      .filter(Boolean)
      .sort()
      .reverse()[0] ??
    new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });

  const resultadoIDN = calculaIDN(cotasParaIDN, dataRef);
  const idnAtual = resultadoIDN.idn;
  const classAtual = classificaIDN(idnAtual);
  const nNorte = resultadoIDN.estacoes_norte.length;
  const nSul   = resultadoIDN.estacoes_sul.length;

  // IDN técnico em vazão (m³/s) — só calcula se vazoesIDN foi passado
  const temVazao = vazoesIDN && Object.keys(vazoesIDN).length > 0;
  const resultadoVazao = temVazao
    ? calculaIDNVazao(
        Object.fromEntries(
          Object.entries(vazoesIDN).map(([k, v]) => [k, v?.vazao_m3s])
        ) as Partial<Record<EstacaoVazao, number>>,
        dataRef
      )
    : null;

  return (
    <div className="bg-azul-medio rounded-lg p-5">
      <div className="mb-4">
        <p className="text-gray-400 text-sm">
          Negro/Norte: <strong className="text-white">{resultadoIDN.pos_norte.toFixed(2)}</strong>
          {" · "}
          Madeira-Purus/Sul: <strong className="text-white">{resultadoIDN.pos_sul.toFixed(2)}</strong>
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Norte: {SUB_BACIAS.Norte.membros.map(m => m.estacao).join(", ")} ·{" "}
          Sul: {SUB_BACIAS.Sul.membros.map(m => m.estacao).join(", ")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        {/* Velocímetro */}
        <div className="flex flex-col items-center gap-3">
          <Velocimetro idn={idnAtual} />
          <div className="text-center">
            <p className="text-4xl font-extrabold" style={{ color: classAtual.cor }}>
              {idnAtual > 0 ? "+" : ""}{idnAtual.toFixed(2)}
              <span className="text-base text-gray-400 font-normal ml-1">
                ± {INCERTEZA_IDN.banda_idn_2sigma.toFixed(2)}
              </span>
            </p>
            <p className="font-bold text-lg mt-1" style={{ color: classAtual.cor }}>
              {classAtual.regime}
            </p>
            <p className="text-gray-400 text-sm">{classAtual.descricao}</p>
            <p className="text-gray-500 text-[10px] mt-1">
              Banda ±2σ via bootstrap (N={INCERTEZA_IDN.n_bootstrap} re-amostragens por ano)
            </p>
          </div>


          {/* Legenda regimes — fronteiras calibradas por GMM */}
          <div className="w-full grid grid-cols-3 gap-2 text-xs mt-2">
            <div className="bg-azul-marinho rounded p-2 text-center border border-vermelho/40">
              <span className="text-vermelho font-bold block">Driver Sul</span>
              <span className="text-gray-400">IDN &lt; {CALIBRACAO_IDN.fronteiras[0].toFixed(2)}</span>
              <span className="text-gray-500 block">{(CALIBRACAO_IDN.componentes[0].pi*100).toFixed(0)}% hist.</span>
            </div>
            <div className="bg-azul-marinho rounded p-2 text-center border border-verde/40">
              <span className="text-verde font-bold block">Sincronizado</span>
              <span className="text-gray-400">{CALIBRACAO_IDN.fronteiras[0].toFixed(2)} ≤ IDN ≤ {CALIBRACAO_IDN.fronteiras[1].toFixed(2)}</span>
              <span className="text-gray-500 block">{(CALIBRACAO_IDN.componentes[1].pi*100).toFixed(0)}% hist.</span>
            </div>
            <div className="bg-azul-marinho rounded p-2 text-center border border-ouro/40">
              <span className="text-ouro font-bold block">Driver Norte</span>
              <span className="text-gray-400">IDN &gt; {CALIBRACAO_IDN.fronteiras[1].toFixed(2)}</span>
              <span className="text-gray-500 block">{(CALIBRACAO_IDN.componentes[2].pi*100).toFixed(0)}% hist.</span>
            </div>
          </div>



          {/* Previsão de regime via HMM */}
          <HMMTransicaoRegime idnAtual={idnAtual} />
        </div>

        {/* Série histórica IDN — calculada com pipeline atual (semanal 2016–2025) */}
        <div>
          <p className="text-gray-300 text-sm font-semibold mb-2">Evolução histórica do IDN (2016–2025)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={IDN_HISTORICO_CALCULADO} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" />
              <XAxis
                dataKey="data"
                tick={{ fill: "#9CA3AF", fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(0, 4)}
                interval={65}
              />
              <YAxis
                tick={{ fill: "#9CA3AF", fontSize: 10 }}
                domain={[-1.2, 1.2]}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #2c2c2c", color: "#fff", fontSize: 12 }}
                formatter={(v: unknown) => [String(v), "IDN"]}
                labelFormatter={(l) => String(l)}
              />
              {/* Faixas de regime — fronteiras calibradas GMM */}
              <ReferenceArea y1={CALIBRACAO_IDN.fronteiras[1]} y2={1.2} fill="#D4922A" fillOpacity={0.15} />
              <ReferenceArea y1={CALIBRACAO_IDN.fronteiras[0]} y2={CALIBRACAO_IDN.fronteiras[1]} fill="#00C04B" fillOpacity={0.10} />
              <ReferenceArea y1={-1.2} y2={CALIBRACAO_IDN.fronteiras[0]} fill="#A0153E" fillOpacity={0.15} />
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="4 2" />
              <ReferenceLine y={CALIBRACAO_IDN.fronteiras[1]} stroke="#D4922A" strokeDasharray="3 2" strokeOpacity={0.6} />
              <ReferenceLine y={CALIBRACAO_IDN.fronteiras[0]} stroke="#A0153E" strokeDasharray="3 2" strokeOpacity={0.6} />
              <Line
                dataKey="idn"
                stroke="#60A5FA"
                strokeWidth={1.5}
                dot={false}
                name="IDN"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-gray-500 text-xs mt-1">
            Série calculada com pipeline atual (MA-7d, percentis DOY, 11 estações). Fronteiras GMM-calibradas.
          </p>
        </div>
      </div>
    </div>
  );
}
