// IRC Duplo Widget — exibe IRC-Tabocal (principal) + IRC-Manaus (regulatório)
// + sinal de divergência regulatória.
//
// Conceito visual:
//   - IRC-Tabocal grande (esquerda) — o número proprietário do IBI
//   - IRC-Manaus médio (centro) — parâmetro ANTAQ formal
//   - Sinal de divergência (direita) — diferença + interpretação

import { COR_FAIXA } from "@/lib/irc";
import type { ResultadoIRCTabocal, DivergenciaIRC } from "@/lib/irc-tabocal";
import type { ResultadoIRC_Estendido } from "@/lib/irc";
import { AlertTriangle, CheckCircle2, Anchor } from "lucide-react";

interface Props {
  rTabocal:    ResultadoIRCTabocal;
  rManaus:     ResultadoIRC_Estendido;
  divergencia: DivergenciaIRC;
}

const CORES_DIV: Record<DivergenciaIRC["sinal_regulatorio"], { bg: string; texto: string; icone: typeof CheckCircle2 }> = {
  alinhado:               { bg: "bg-verde/10 border-verde/40 text-verde",            texto: "text-verde",     icone: CheckCircle2 },
  subestimacao_leve:      { bg: "bg-ouro/10 border-ouro/40 text-ouro",               texto: "text-ouro",      icone: AlertTriangle },
  subestimacao_alta:     { bg: "bg-orange-500/10 border-orange-500/40 text-orange-400", texto: "text-orange-400", icone: AlertTriangle },
  subestimacao_critica:   { bg: "bg-vermelho/10 border-vermelho/40 text-vermelho",   texto: "text-vermelho",  icone: AlertTriangle },
};

const LABEL_SINAL: Record<DivergenciaIRC["sinal_regulatorio"], string> = {
  alinhado:               "Parâmetro alinhado",
  subestimacao_leve:      "ANTAQ subestima leve",
  subestimacao_alta:      "ANTAQ subestima ALTO",
  subestimacao_critica:   "ANTAQ subestima CRÍTICO",
};

export default function IRCDuploWidget({ rTabocal, rManaus, divergencia }: Props) {
  const corT = COR_FAIXA[rTabocal.faixa];
  const corM = COR_FAIXA[rManaus.faixa];
  const corD = CORES_DIV[divergencia.sinal_regulatorio];
  const Icone = corD.icone;

  return (
    <div className="bg-azul-medio rounded-lg p-5 border border-white/10">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-4">
        <Anchor size={16} className="text-verde" />
        <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
          IRC · Índice de Risco de Calado <span className="text-gray-600">v3</span>
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* IRC-Tabocal — PRINCIPAL */}
        <div className={`rounded-lg p-4 border ${corT.border} ${corT.bg}`}>
          <p className="text-[10px] uppercase tracking-widest font-bold mb-1 text-gray-300">
            IRC-Tabocal · operacional
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-extrabold tabular-nums ${corT.texto}`}>
              {rTabocal.irc.toFixed(0)}
            </span>
            <span className="text-gray-500 text-sm">/100</span>
          </div>
          <p className={`text-xs font-semibold uppercase tracking-wider mt-1 ${corT.texto}`}>
            Faixa {rTabocal.faixa}
          </p>
          <p className="text-gray-400 text-[10px] mt-2">
            Itacoatiara: <strong className="text-gray-300">{rTabocal.detalhes.cota_itacoatiara_m.toFixed(2)} m</strong>
          </p>
          <p className="text-gray-400 text-[10px]">
            <strong className="text-white">CMR oficial</strong>: <strong className="text-verde">{rTabocal.detalhes.cmr_metros?.toFixed(2)} m</strong>
            {" · alvo: "}<strong className="text-gray-300">{rTabocal.detalhes.calado_alvo_m?.toFixed(1)} m</strong>
          </p>
          <p className="text-gray-400 text-[10px]">
            Déficit calado: <strong className={(rTabocal.detalhes.deficit_calado_m ?? 0) > 2 ? "text-vermelho" : "text-gray-300"}>
              {rTabocal.detalhes.deficit_calado_m?.toFixed(2)} m
            </strong>
            {" · lag Manaus: "}{rTabocal.detalhes.lag_observado_cm}cm
          </p>
        </div>

        {/* IRC-Manaus — referência regulatória */}
        <div className={`rounded-lg p-4 border ${corM.border} ${corM.bg} opacity-90`}>
          <p className="text-[10px] uppercase tracking-widest font-bold mb-1 text-gray-400">
            IRC-Manaus · parâmetro ANTAQ
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold tabular-nums ${corM.texto}`}>
              {rManaus.irc.toFixed(0)}
            </span>
            <span className="text-gray-500 text-sm">/100</span>
          </div>
          <p className={`text-xs font-semibold uppercase tracking-wider mt-1 ${corM.texto}`}>
            Faixa {rManaus.faixa}
          </p>
          <p className="text-gray-400 text-[10px] mt-2">
            Manaus: <strong className="text-gray-300">{rManaus.detalhes.cota_manaus_m.toFixed(2)} m</strong>
            {" · "}Gatilho LWS: <strong className="text-gray-300">17,7 m</strong>
          </p>
          <p className="text-gray-500 text-[10px] mt-1">
            Mantido para referência ao parâmetro regulatório formal.
          </p>
        </div>

        {/* Sinal de divergência */}
        <div className={`rounded-lg p-4 border ${corD.bg}`}>
          <div className="flex items-center gap-2 mb-1">
            <Icone size={14} className={corD.texto} />
            <p className={`text-[10px] uppercase tracking-widest font-bold ${corD.texto}`}>
              Sinal regulatório
            </p>
          </div>
          <p className={`text-2xl font-bold ${corD.texto}`}>
            {divergencia.diferenca >= 0 ? "+" : ""}{divergencia.diferenca.toFixed(0)} pts
          </p>
          <p className={`text-xs font-semibold uppercase tracking-wider mt-1 ${corD.texto}`}>
            {LABEL_SINAL[divergencia.sinal_regulatorio]}
          </p>
          <p className="text-gray-300 text-[11px] mt-2 leading-relaxed">
            {divergencia.interpretacao}
          </p>
        </div>
      </div>

      {/* Decomposição IRC-Tabocal */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-2">
          Decomposição IRC-Tabocal (peso × valor)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
          {[
            { rotulo: "Calado",  valor: rTabocal.componentes.calado_tabocal,  peso: rTabocal.pesos_efetivos.calado_tabocal },
            { rotulo: "HMM",     valor: rTabocal.componentes.hmm_extremo,     peso: rTabocal.pesos_efetivos.hmm_extremo },
            { rotulo: "Onda",    valor: rTabocal.componentes.onda_branco,     peso: rTabocal.pesos_efetivos.onda_branco },
            { rotulo: "Anom PP", valor: rTabocal.componentes.anomalia_pp,     peso: rTabocal.pesos_efetivos.anomalia_pp },
            { rotulo: "Lag op.", valor: rTabocal.componentes.lag_operacional, peso: rTabocal.pesos_efetivos.lag_operacional },
          ].map((c) => (
            <div key={c.rotulo} className="bg-azul-marinho rounded p-2" title={`${(c.peso*100).toFixed(0)}% × ${c.valor.toFixed(0)} = ${(c.peso*c.valor).toFixed(1)} pts`}>
              <p className="text-gray-500 text-[10px]">{c.rotulo}</p>
              <p className="text-white font-semibold tabular-nums">{c.valor.toFixed(0)}<span className="text-gray-600 text-[9px]">×{(c.peso*100).toFixed(0)}%</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer explicativo */}
      <p className="text-gray-500 text-[11px] mt-4 leading-relaxed">
        <strong className="text-gray-400">v3.2 — CMR oficial:</strong> o IRC-Tabocal usa o{" "}
        <strong className="text-verde">Calado Máximo Recomendado publicado diariamente pela Capitania dos Portos
        da Amazônia Ocidental</strong>. Componente principal calcula déficit em metros vs calado alvo (11m, comboio
        carregado em cheia normal). O IRC-Manaus é mantido para mostrar divergência com o parâmetro ANTAQ formal
        (17,7m em Manaus). Calibrado contra 21 eventos rotulados: ρ Spearman 0,85 / AUC 1,00 perfeita.
      </p>
    </div>
  );
}
