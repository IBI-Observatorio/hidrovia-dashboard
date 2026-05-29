"use client";

import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { DADOS_ATUAIS, PREVISAO_2026, type DadosEstacao } from "@/lib/dados-historicos";
import { riscoDescasamento } from "@/lib/calcula-idn";
import type { Previsao2026 } from "@/lib/fetch-dados";

const MESES_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

// "2026-05-26" → "26/mai/2026". Aceita também formatos tipo "05/05/2026" e
// devolve o input sem mudança quando não reconhecer (failsafe).
function formataDataBoletim(data: string | undefined): string {
  if (!data) return "—";
  const iso = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${d}/${MESES_PT[parseInt(m, 10) - 1]}/${y}`;
  }
  return data;
}

const fmt = (n: number) => n.toFixed(2).replace(".", ",");
const pct = (p: number) => `${Math.round(p * 100)}%`;

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
  idn,
  previsao,
}: {
  dados?: Record<string, DadosEstacao>;
  idn?: number;
  previsao?: Previsao2026;
}) {
  const mao = dados.Manaus;
  const ita = dados.Itacoatiara;
  const idnAtual = idn ?? 0;
  // Fallback hardcoded só dispara se o componente for usado fora da página
  // /monitor (que sempre passa `previsao` do cache SGB).
  const prev: Previsao2026 = previsao ?? {
    ...PREVISAO_2026,
    fonte_dinamica: false,
  };
  const risco    = riscoDescasamento(mao.cota_m, ita.cota_m, mao.delta_2025, ita.delta_2025);

  const abaixoGatilho = mao.cota_m < 17.7;
  const divergencia = Math.abs(mao.delta_2025 - ita.delta_2025);

  return (
    <div className="bg-azul-medio rounded-lg p-5 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-bold text-lg">Monitoramento Manaus × Itacoatiara</h2>
          <p className="text-gray-400 text-sm">
            Leitura conjunta das estações de referência e do trecho de navegação
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
            label="Manaus"
            valor={`${mao.cota_m.toFixed(2)} m`}
            destaque={!abaixoGatilho}
            alerta={abaixoGatilho}
          />
          {abaixoGatilho && (
            <p className="text-vermelho text-xs mb-1">⚠ Abaixo de 17,7 m — referência histórica de baixas águas</p>
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
                  mínima histórica de −0,17 m em 31/out/2024 — 22 dias após a mínima de Manaus.
                </p>
              </div>
            </div>
          </div>

          {/* Previsão SGB — alimentado pelo cache de boletins (data/boletins_sgb_cache.json),
              atualizado pelo cron semanal (scripts/pipeline-sace.py → /api/sgb). */}
          <div className="bg-azul-marinho rounded-lg p-3">
            <p className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>
                Previsão SGB ({prev.numero_boletim ?? "?"}° Boletim, {formataDataBoletim(prev.data_boletim)})
              </span>
              {!prev.fonte_dinamica && (
                <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700">
                  fallback
                </span>
              )}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Pico cheia Manaus</span>
                <span className="text-verde font-bold">
                  {fmt(prev.manaus_pico_cheia.media)} m (IC80: {fmt(prev.manaus_pico_cheia.ic80_min)}–{fmt(prev.manaus_pico_cheia.ic80_max)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Prob. acima de 27,5 m</span>
                <span className="text-verde font-bold">{pct(prev.manaus_pico_cheia.prob_27_5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ENSO</span>
                <span className="text-ouro font-bold">{prev.enso}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mínima Itacoatiara 2026</span>
                <span className="text-white font-bold">4,10–5,15 m</span>
              </div>
            </div>
          </div>

          {/* Lógica do semáforo */}
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
