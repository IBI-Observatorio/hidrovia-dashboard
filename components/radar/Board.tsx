// Módulo 4 — Tabuleiro Estratégico. Papel do cliente CONFIGURADO (default Vale)
// por ativo, a partir de fatos públicos, + o furo de funding (peça da EFVM/Vale).
// Guardrail §10: cliente configurável; nada que vaze posição de terceiros.

import { Info, Users } from "lucide-react";
import type { RadarAssetEntry } from "@/lib/radar/assets";
import { getTabuleiro, EXPOSICAO_INFO, CLIENTE_PADRAO } from "@/lib/radar/board";
import FundingBar, { type Funding } from "@/components/radar/FundingBar";

export default function Board({
  entry,
  cliente = CLIENTE_PADRAO,
}: {
  entry: RadarAssetEntry;
  cliente?: string;
}) {
  const { entry: tab, mapeado } = getTabuleiro(entry, cliente);
  const ei = EXPOSICAO_INFO[tab.exposicao] ?? EXPOSICAO_INFO.nenhuma;
  const funding = entry.raw.funding as Funding | undefined;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-ibi-green" />
          <h3 className="text-xl font-bold text-white">Tabuleiro Estratégico</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
          Cliente: <strong className="text-white">{cliente}</strong>{" "}
          <span className="text-[10px] text-gray-500">· configurável</span>
        </span>
      </header>

      {/* papel + o que move na malha */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-azul-medio p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Papel da {cliente}</h4>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ei.bg} ${ei.txt}`}>
              {ei.label}
            </span>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-gray-300">{tab.papel}</p>
          {tab.fonte && (
            <p className="mt-3 text-[10px] text-gray-500">Fonte: {tab.fonte.label} · público</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-azul-medio p-5">
          <h4 className="text-sm font-semibold text-white">O que este leilão move na malha</h4>
          <p className="mt-3 text-[12px] leading-relaxed text-gray-300">{tab.moveNaMalha}</p>
          {!mapeado && (
            <p className="mt-3 text-[11px] text-gray-500">
              Nenhum papel direto da {cliente} mapeado em fonte pública para este ativo — sem
              suposição.
            </p>
          )}
        </div>
      </section>

      {/* furo de funding (quando houver) */}
      {funding && <FundingBar funding={funding} cliente={cliente} />}

      <footer className="flex items-start gap-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-gray-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-600" />
        <span>
          O papel do cliente é montado a partir de <strong>fatos públicos</strong> (notícia/órgão),
          configurável por cliente. Nada de posição confidencial de terceiros. Não é recomendação de
          investimento.
        </span>
      </footer>
    </div>
  );
}
