// Sub-seção "Andamento oficial (SEI/TCU)" da aba Notas — snapshot curado do
// MonitoraSEI. Tom de banco central; cada movimento carrega data + unidade + fonte.

import { Landmark, ExternalLink, Info } from "lucide-react";
import type { ProcessosAtivo, ProcessoSeed } from "@/lib/radar/processos";
import { fmtData } from "@/lib/radar/format";

const ORGAO_COR: Record<string, string> = {
  ANTT: "text-ibi-blue border-ibi-blue/30 bg-ibi-blue/10",
  TCU: "text-ouro border-ouro/30 bg-ouro/10",
  STF: "text-vermelho border-vermelho/30 bg-vermelho/10",
};

function corOrgao(orgao: string): string {
  return ORGAO_COR[orgao] ?? "text-gray-300 border-white/15 bg-white/5";
}

function ProcessoCard({ p }: { p: ProcessoSeed }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-azul-medio p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${corOrgao(p.orgao)}`}>
          {p.orgao}
        </span>
        <span className="font-mono text-xs text-gray-300">{p.numero}</span>
        {typeof p.totalMovimentacoes === "number" && (
          <span className="text-[10px] text-gray-500">{p.totalMovimentacoes} movimentações</span>
        )}
      </div>

      {p.tipo && <p className="mt-2 text-sm font-medium text-white">{p.tipo}</p>}
      {p.papel && <p className="mt-1 text-xs leading-relaxed text-gray-400">{p.papel}</p>}

      {p.movimentos.length > 0 ? (
        <ol className="mt-4 space-y-3 border-l border-white/10 pl-4">
          {p.movimentos.map((m, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[1.07rem] top-1.5 h-2 w-2 rounded-full bg-ibi-green/70" />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-semibold tabular-nums text-gray-200">{fmtData(m.data)}</span>
                {m.unidade && (
                  <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-gray-500">{m.unidade}</span>
                )}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-300">{m.descricao}</p>
            </li>
          ))}
        </ol>
      ) : (
        p.obs && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-[11px] text-gray-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
            <span>{p.obs}</span>
          </div>
        )
      )}

      {(p.fonte || p.url) && (
        <div className="mt-4 border-t border-white/5 pt-3">
          {p.url ? (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300">
              {p.fonte?.label ?? p.url} <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-[10px] text-gray-500" title={p.fonte?.label}>
              {p.fonte?.label}{p.fonte?.date ? ` · ${fmtData(p.fonte.date)}` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Processos({ dados }: { dados: ProcessosAtivo | null }) {
  if (!dados || dados.processos.length === 0) return null;
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-ibi-blue" />
          <h3 className="text-lg font-bold text-white">Andamento oficial — SEI / TCU</h3>
        </div>
        <span className="text-[10px] text-gray-500">
          Snapshot de {fmtData(dados.capturadoEm)} · atualização manual (não automática)
        </span>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {dados.processos.map((p) => (
          <ProcessoCard key={`${p.orgao}-${p.numero}`} p={p} />
        ))}
      </div>
      {dados.fonteGeral && (
        <p className="text-[10px] leading-relaxed text-gray-600">{dados.fonteGeral}</p>
      )}
    </section>
  );
}
