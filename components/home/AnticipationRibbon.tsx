import { antecipacoes } from "@/lib/home-content";

export default function AnticipationRibbon() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10"
      style={{
        background:
          "linear-gradient(90deg, rgba(0,166,82,0.06), rgba(0,153,216,0.05))",
      }}
    >
      <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-5 py-3 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ibi-green">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ibi-green" />
        Últimas notícias
      </div>
      <div className="grid md:grid-cols-3">
        {antecipacoes.map((a, i) => (
          <div
            key={a.tag}
            className={`flex items-start gap-2.5 px-5 py-4 ${
              i < antecipacoes.length - 1
                ? "border-b border-white/[0.08] md:border-b-0 md:border-r"
                : ""
            }`}
          >
            <span className="mt-px shrink-0 rounded-md border border-ibi-blue/35 px-1.5 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.06em] text-ibi-blue">
              {a.tag}
            </span>
            <p
              className="text-[0.84rem] leading-[1.45] text-[#cdd3da] [&_b]:font-semibold [&_b]:text-white [&_a]:underline [&_a]:decoration-white/20 [&_a]:underline-offset-2 [&_a]:transition-colors [&_a]:hover:text-white [&_a]:hover:decoration-white/60"
              dangerouslySetInnerHTML={{ __html: a.texto }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
