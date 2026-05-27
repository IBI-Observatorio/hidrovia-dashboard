"use client";

import { CALIBRACAO_HMM, estadoHMM } from "@/lib/hmm-idn";

// Mostra a probabilidade de transição entre regimes nos próximos 30 dias,
// condicionada ao regime atual estimado pelo HMM.
export default function HMMTransicaoRegime({ idnAtual }: { idnAtual: number }) {
  const estado = estadoHMM(idnAtual);
  const transicoes30d = CALIBRACAO_HMM.matriz_transicao_30d[estado.indice];
  const transicoes7d  = CALIBRACAO_HMM.matriz_transicao_7d[estado.indice];
  const persistencia  = CALIBRACAO_HMM.persistencia_dias[estado.indice];

  const cores = ["#A0153E", "#00C04B", "#D4922A"]; // Sul, Sinc, Norte

  return (
    <div className="bg-azul-marinho rounded p-3 border border-white/10 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-xs font-bold uppercase tracking-wide">
          Previsão de regime (HMM)
        </span>
        <span className="text-gray-400 text-[10px]">
          Persistência típica: {persistencia.toFixed(0)} dias
        </span>
      </div>

      <p className="text-gray-400 text-xs mb-2">
        Probabilidade de cada regime nos próximos 30 dias, a partir do regime atual
        estimado pelo HMM ({estado.nome}):
      </p>

      <div className="grid grid-cols-3 gap-2">
        {CALIBRACAO_HMM.nomes.map((nome, i) => {
          const p30 = transicoes30d[i];
          const p7  = transicoes7d[i];
          return (
            <div
              key={nome}
              className="bg-azul-medio/60 rounded p-2 text-center border"
              style={{ borderColor: `${cores[i]}40` }}
            >
              <p className="font-bold text-xs" style={{ color: cores[i] }}>{nome}</p>
              <p className="text-2xl font-extrabold text-white mt-1">
                {(p30 * 100).toFixed(0)}<span className="text-sm text-gray-400">%</span>
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                7d: {(p7 * 100).toFixed(0)}%
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-gray-500 text-[10px] mt-2 leading-relaxed">
        Baseado no histórico 2016–2023. Probabilidades condicionais ao regime atual.
      </p>
    </div>
  );
}
