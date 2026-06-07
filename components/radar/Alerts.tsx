// Módulo 6 — Alertas (mudança de regime/estágio/gate). Lista sourçada + o
// scaffolding de push/e-mail (ainda não disparável nesta fase). Render puro.

import { Bell, BellRing } from "lucide-react";
import { ALERT_KIND_INFO, type Alert } from "@/lib/radar/alerts";
import { fmtData } from "@/lib/radar/format";
import EmptyState from "@/components/radar/EmptyState";

export default function Alerts({ alertas }: { alertas: Alert[] }) {
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <BellRing className="h-5 w-5 text-ouro" />
        <h3 className="text-xl font-bold text-white">Alertas</h3>
      </header>

      {alertas.length === 0 ? (
        <EmptyState>Nenhuma mudança de regime/estágio/gate registrada para este ativo.</EmptyState>
      ) : (
        <ol className="space-y-2">
          {alertas.map((al, i) => {
            const ki = ALERT_KIND_INFO[al.kind];
            return (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-azul-medio p-4">
                <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${ki.bg} ${ki.txt}`}>
                  {ki.label}
                </span>
                <div>
                  <p className="text-[13px] leading-snug text-gray-200">{al.text}</p>
                  <p className="mt-1 text-[10px] text-gray-500">
                    {fmtData(al.date)}
                    {al.fonte ? ` · ${al.fonte.label}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* scaffolding de push/e-mail — ainda não disparável */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-azul-medio/50 p-4">
        <div className="flex items-center gap-2 text-[12px] text-gray-400">
          <Bell className="h-4 w-4 text-gray-500" />
          Receber alertas deste ativo por e-mail quando o regime/estágio mudar.
        </div>
        <button
          disabled
          className="cursor-not-allowed rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-gray-500"
          title="Disparo de alertas entra numa próxima fase"
        >
          Em breve
        </button>
      </div>
    </div>
  );
}
