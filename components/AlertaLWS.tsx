"use client";

import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { DADOS_ATUAIS, type DadosEstacao } from "@/lib/dados-historicos";
import { calculaIDN, riscoDescasamento } from "@/lib/calcula-idn";

const ICONE_RISCO = {
  NORMAL:   <CheckCircle className="text-verde" size={22} />,
  MODERADO: <AlertTriangle className="text-ouro"  size={22} />,
  ELEVADO:  <XCircle className="text-vermelho"    size={22} />,
};

const BADGE_RISCO: Record<string, string> = {
  NORMAL:   "bg-verde/20 text-verde border border-verde/40",
  MODERADO: "bg-ouro/20 text-ouro border border-ouro/40",
  ELEVADO:  "bg-vermelho/20 text-vermelho border border-vermelho/40",
};

function MetricRow({
  label, valor, unidade, destaque, alerta,
}: {
  label: string;
  valor: string;
  unidade?: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span
        className={`font-bold text-sm ${
          alerta   ? "text-vermelho" :
          destaque ? "text-verde"   :
                     "text-white"
        }`}
      >
        {valor}
        {unidade && <span className="text-gray-400 font-normal ml-1">{unidade}</span>}
      </span>
    </div>
  );
}

export default function AlertaLWS({
  dados = DADOS_ATUAIS,
}: {
  dados?: Record<string, DadosEstacao>;
}) {
  const mao = dados.Manaus;
  const ita = dados.Itacoatiara;
  const cur = dados.Curicuriari;
  const hum = dados.Humaita;
  const idnAtual = calculaIDN(cur.cota_m, hum.cota_m);
  const risco    = riscoDescasamento(mao.cota_m, ita.cota_m, mao.delta_2025, ita.delta_2025);

  const abaixoGatilho = mao.cota_m < 17.7;
  const divergencia = Math.abs(mao.delta_2025 - ita.delta_2025);

  return (
    <div className="bg-azul-medio rounded-lg p-5 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-bold text-lg">Alerta Regulatório — LWS/ANTAQ</h2>
          <p className="text-gray-400 text-sm">
            Parâmetro: Manaus ≥ 17,7 m para suspender restrições de calado
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${BADGE_RISCO[risco.nivel]}`}>
          {ICONE_RISCO[risco.nivel]}
          <div>
            <p className="font-bold text-sm">Risco de descasamento</p>
            <p className="font-extrabold text-lg leading-tight">{risco.nivel}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Coluna esquerda: métricas atuais */}
        <div className="bg-azul-marinho rounded-lg p-4">
          <p className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">
            Situação atual
          </p>
          <MetricRow
            label="Manaus (parâmetro ANTAQ)"
            valor={`${mao.cota_m.toFixed(2)} m`}
            destaque={!abaixoGatilho}
            alerta={abaixoGatilho}
          />
          {abaixoGatilho && (
            <p className="text-vermelho text-xs mb-1">⚠ Abaixo do gatilho LWS (17,7 m)</p>
          )}
          <MetricRow
            label="Itacoatiara (Tabocal)"
            valor={`${ita.cota_m.toFixed(2)} m`}
          />
          <MetricRow
            label="Δ Manaus vs 2025"
            valor={`${mao.delta_2025 >= 0 ? "+" : ""}${mao.delta_2025} cm`}
            alerta={mao.delta_2025 < -50}
            destaque={mao.delta_2025 >= 0}
          />
          <MetricRow
            label="Δ Itacoatiara vs 2025"
            valor={`${ita.delta_2025 >= 0 ? "+" : ""}${ita.delta_2025} cm`}
            alerta={ita.delta_2025 < -50}
            destaque={ita.delta_2025 >= 0}
          />
          <MetricRow
            label="Divergência Manaus–Itacoatiara"
            valor={`${divergencia} cm`}
            alerta={divergencia > 40}
          />
          <MetricRow
            label="Índice Dessincronização (IDN)"
            valor={`${idnAtual > 0 ? "+" : ""}${idnAtual.toFixed(2)}`}
            alerta={Math.abs(idnAtual) > 0.3}
          />
        </div>

        {/* Coluna direita: contexto e referência 2024 */}
        <div className="flex flex-col gap-3">
          {/* Box de contexto */}
          <div className="bg-ouro/10 border border-ouro/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-ouro mt-0.5 shrink-0" />
              <div>
                <p className="text-ouro text-xs font-semibold mb-1">Referência 2024</p>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Quando Manaus cruzou abaixo de 17,7 m em 10/set/2024, Itacoatiara
                  ainda <strong className="text-white">caiu por mais 22 dias</strong>, atingindo
                  mínima histórica de −0,17 m em 31/out/2024 — enquanto o parâmetro ANTAQ
                  sinalizava início de normalização.
                </p>
              </div>
            </div>
          </div>

          {/* Previsão SGB */}
          <div className="bg-azul-marinho rounded-lg p-3">
            <p className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Previsão SGB (18° Boletim, 05/mai/2026)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Pico cheia Manaus</span>
                <span className="text-verde font-bold">28,23 m (IC80: 27,69–28,76)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Prob. acima de 27,5 m</span>
                <span className="text-verde font-bold">96%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ENSO</span>
                <span className="text-ouro font-bold">El Niño emergindo (61%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mínima Itacoatiara 2026</span>
                <span className="text-white font-bold">4,10–5,15 m</span>
              </div>
            </div>
          </div>

          {/* Explicação da lógica */}
          <div className="bg-azul-marinho rounded-lg p-3 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Lógica do semáforo:</p>
            <p className="flex items-center gap-1"><span className="text-verde">●</span> Normal: Manaus &gt; 20 m e divergência &lt; 30 cm</p>
            <p className="flex items-center gap-1"><span className="text-ouro">●</span> Moderado: divergência &gt; 40 cm ou Manaus &lt; 19 m</p>
            <p className="flex items-center gap-1"><span className="text-vermelho">●</span> Elevado: Manaus &lt; 17,7 m ou divergência &gt; 80 cm</p>
          </div>
        </div>
      </div>
    </div>
  );
}
