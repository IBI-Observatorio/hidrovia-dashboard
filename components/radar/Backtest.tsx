// Módulo 7 — Backtest. Track record auditável: previsões oficiais de leilão já
// resolvidas (histórico de deslizamento) + calls do Observatório em aberto.
// Cada item carrega autor + fonte. Render puro.

import { Target, Info } from "lucide-react";
import {
  VEREDITO_INFO,
  statusPrevisao,
  taxaAcerto,
  type Previsao,
} from "@/lib/radar/backtest";
import { pct, fmtData } from "@/lib/radar/format";
import EmptyState from "@/components/radar/EmptyState";

function Linha({ p }: { p: Previsao }) {
  const vi = VEREDITO_INFO[statusPrevisao(p)];
  return (
    <li className="rounded-xl border border-white/10 bg-azul-medio p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] leading-snug text-gray-200">{p.texto}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${vi.bg} ${vi.txt}`}>
          {vi.label}
        </span>
      </div>
      {p.realizado && (
        <p className="mt-2 text-[11px] text-gray-400">
          Realizado: {p.realizado}
        </p>
      )}
      <p className="mt-1 text-[10px] text-gray-500">
        Previsto em {fmtData(p.date)} · {p.autor}
        {p.fonte ? ` · ${p.fonte.label}` : ""}
      </p>
    </li>
  );
}

export default function Backtest({ previsoes }: { previsoes: Previsao[] }) {
  const oficiais = previsoes.filter((p) => p.autor === "Oficial");
  const observatorio = previsoes.filter((p) => p.autor === "Observatório");
  const t = taxaAcerto(oficiais);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <Target className="h-5 w-5 text-ibi-green" />
        <h3 className="text-xl font-bold text-white">Track record</h3>
      </header>

      {/* Previsões oficiais de leilão (resolvidas) */}
      {oficiais.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">
              Previsões oficiais de leilão (auditável)
            </h4>
            {t.taxa != null && (
              <span className="text-[11px] text-gray-400">
                acerto das datas anunciadas:{" "}
                <strong className="text-vermelho">{pct(t.taxa, 0)}</strong>{" "}
                ({t.acertos}✓ {t.parciais}~ {t.erros}✗ em {t.resolvidas})
              </span>
            )}
          </div>
          <ol className="space-y-2">
            {oficiais.map((p, i) => <Linha key={i} p={p} />)}
          </ol>
          <p className="text-[11px] text-gray-500">
            Datas de leilão anunciadas pelo governo vs. o que se realizou. O deslizamento
            recorrente é o que calibra o ceticismo do Radar — não é previsão do modelo.
          </p>
        </section>
      )}

      {/* Calls do Observatório (em aberto) */}
      {observatorio.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-white">Calls do Observatório (em aberto)</h4>
          <ol className="space-y-2">
            {observatorio.map((p, i) => <Linha key={i} p={p} />)}
          </ol>
        </section>
      )}

      {previsoes.length === 0 && (
        <EmptyState>Sem previsões registradas para este ativo ainda.</EmptyState>
      )}

      <footer className="flex items-start gap-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-gray-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-600" />
        <span>
          O produto é novo: o track record do Observatório começa agora e será checado contra o
          realizado. Nenhum acerto passado é atribuído ao modelo. Não é recomendação de investimento.
        </span>
      </footer>
    </div>
  );
}
