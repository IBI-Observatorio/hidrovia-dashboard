// Módulo 5 — Feed de boletins datados (tom banco central). Render puro (server).

import { FileText } from "lucide-react";
import { parseBlocos, segmentosInline, type Nota } from "@/lib/radar/notes";
import { fmtData } from "@/lib/radar/format";
import GradientBullet from "@/components/radar/GradientBullet";
import EmptyState from "@/components/radar/EmptyState";

function Inline({ texto }: { texto: string }) {
  return (
    <>
      {segmentosInline(texto).map((s, i) =>
        s.b ? <strong key={i} className="text-gray-100">{s.t}</strong> : <span key={i}>{s.t}</span>,
      )}
    </>
  );
}

export default function NotesFeed({ notas }: { notas: Nota[] }) {
  if (notas.length === 0) {
    return <EmptyState>Sem boletins para este ativo ainda.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-ibi-blue" />
        <h3 className="text-xl font-bold text-white">Boletins</h3>
      </header>

      {notas.map((n) => (
        <article key={n.slug} className="rounded-2xl border border-white/10 bg-azul-medio p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-base font-semibold text-white">{n.title}</h4>
            <span className="text-[11px] text-gray-500">
              {fmtData(n.date)}
              {n.tag ? ` · ${n.tag}` : ""}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {parseBlocos(n.body).map((b, i) => {
              if (b.tipo === "h2")
                return <h5 key={i} className="text-sm font-semibold text-gray-200">{b.texto}</h5>;
              if (b.tipo === "ul")
                return (
                  <ul key={i} className="space-y-1.5">
                    {b.itens.map((it, j) => (
                      <li key={j} className="flex items-start gap-2 text-[13px] leading-relaxed text-gray-300">
                        <GradientBullet />
                        <span><Inline texto={it} /></span>
                      </li>
                    ))}
                  </ul>
                );
              return (
                <p key={i} className="text-[13px] leading-relaxed text-gray-300">
                  <Inline texto={b.texto} />
                </p>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
