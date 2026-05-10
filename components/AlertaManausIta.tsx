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

export default function AlertaManausIta({
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
          <h2 className="text-white font-bold text-lg">Monitoramento Manaus Ã— Itacoatiara</h2>
          <p className="text-gray-400 text-sm">
            Leitura conjunta das estaÃ§Ãµes de referÃªncia e do trecho de navegaÃ§Ã£o
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
        {/* Coluna esquerda: mÃ©tricas atuais */}
        <div className="bg-azul-marinho rounded-lg p-4">
          <p className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">
            SituaÃ§Ã£o atual
          </p>
          <MetricRow
            label="Manaus"
            valor={`${mao.cota_m.toFixed(2)} m`}
            destaque={!abaixoGatilho}
            alerta={abaixoGatilho}
          />
          {abaixoGatilho && (
            <p className="text-vermelho text-xs mb-1">âš  Abaixo de 17,7 m â€” referÃªncia histÃ³rica de baixas Ã¡guas</p>
          )}
          <MetricRow
            label="Itacoatiara (Tabocal)"
            valor={`${ita.cota_m.toFixed(2)} m`}
          />
          <MetricRow
            label="Î” Manaus vs 2025"
            valor={`${mao.delta_2025 >= 0 ? "+" : ""}${mao.delta_2025} cm`}
            alerta={mao.delta_2025 < -50}
            destaque={mao.delta_2025 >= 0}
          />
          <MetricRow
            label="Î” Itacoatiara vs 2025"
            valor={`${ita.delta_2025 >= 0 ? "+" : ""}${ita.delta_2025} cm`}
            alerta={ita.delta_2025 < -50}
            destaque={ita.delta_2025 >= 0}
          />
          <MetricRow
            label="DivergÃªncia Manausâ€“Itacoatiara"
            valor={`${divergencia} cm`}
            alerta={divergencia > 40}
          />
          <MetricRow
            label="Ãndice DessincronizaÃ§Ã£o (IDN)"
            valor={`${idnAtual > 0 ? "+" : ""}${idnAtual.toFixed(2)}`}
            alerta={Math.abs(idnAtual) > 0.3}
          />
        </div>

        {/* Coluna direita: contexto e referÃªncia 2024 */}
        <div className="flex flex-col gap-3">
          {/* Box de contexto */}
          <div className="bg-ouro/10 border border-ouro/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-ouro mt-0.5 shrink-0" />
              <div>
                <p className="text-ouro text-xs font-semibold mb-1">ReferÃªncia 2024</p>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Quando Manaus cruzou abaixo de 17,7 m em 10/set/2024, Itacoatiara
                  ainda <strong className="text-white">caiu por mais 22 dias</strong>, atingindo
                  mÃ­nima histÃ³rica de âˆ’0,17 m em 31/out/2024 â€” 22 dias apÃ³s a mÃ­nima de Manaus.
                </p>
              </div>
            </div>
          </div>

          {/* PrevisÃ£o SGB */}
          <div className="bg-azul-marinho rounded-lg p-3">
            <p className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
              PrevisÃ£o SGB (18Â° Boletim, 05/mai/2026)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Pico cheia Manaus</span>
                <span className="text-verde font-bold">28,23 m (IC80: 27,69â€“28,76)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Prob. acima de 27,5 m</span>
                <span className="text-verde font-bold">96%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ENSO</span>
                <span className="text-ouro font-bold">El NiÃ±o emergindo (61%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MÃ­nima Itacoatiara 2026</span>
                <span className="text-white font-bold">4,10â€“5,15 m</span>
              </div>
            </div>
          </div>

          {/* ExplicaÃ§Ã£o da lÃ³gica */}
          <div className="bg-azul-marinho rounded-lg p-3 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">LÃ³gica do semÃ¡foro:</p>
            <p className="flex items-center gap-1"><span className="text-verde">â—</span> Normal: Manaus &gt; 20 m e divergÃªncia &lt; 30 cm</p>
            <p className="flex items-center gap-1"><span className="text-ouro">â—</span> Moderado: divergÃªncia &gt; 40 cm ou Manaus &lt; 19 m</p>
            <p className="flex items-center gap-1"><span className="text-vermelho">â—</span> Elevado: Manaus &lt; 17,7 m ou divergÃªncia &gt; 80 cm</p>
          </div>
        </div>
      </div>
    </div>
  );
}
