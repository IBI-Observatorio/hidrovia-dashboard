import type { Metadata } from "next";
import Link from "next/link";
import HeroStat from "@/components/home/HeroStat";
import SubscribeForm from "@/components/home/SubscribeForm";
import { heroCopy, achados, paineis } from "@/lib/home-content";

export const metadata: Metadata = {
  title: "Observatório IBI — Dados de infraestrutura de transportes",
  description:
    "Movimentação portuária, hidrovias e análises sobre a infraestrutura logística brasileira. Dados oficiais, indicadores originais e leitura para decisão. Mantido pelo Instituto Brasileiro de Infraestrutura (IBI).",
  openGraph: {
    title: "Observatório IBI — Dados de infraestrutura de transportes",
    description:
      "O número que o setor espera todo mês, com a leitura do que ele significa.",
  },
};

const corNumero: Record<string, string> = {
  blue: "text-ibi-blue",
  red: "text-vermelho",
  green: "text-verde",
};
const corBarra: Record<string, string> = {
  blue: "bg-ibi-blue",
  red: "bg-vermelho",
  green: "bg-verde",
};
const badge: Record<string, { txt: string; cls: string }> = {
  novo: { txt: "Novo", cls: "bg-ibi-blue/15 text-ibi-blue" },
  live: { txt: "No ar", cls: "bg-ibi-green/15 text-verde" },
  breve: { txt: "Em breve", cls: "bg-white/5 text-gray-500" },
};

export default function HomePage() {
  return (
    <main>
      {/* ───────────── HERO ───────────── */}
      <section className="relative overflow-hidden border-b border-white/5 pt-28 pb-16">
        {/* atmosfera */}
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(560px 360px at 78% 18%,rgba(0,153,216,.16),transparent 70%),radial-gradient(620px 420px at 8% 92%,rgba(0,166,82,.12),transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-screen-xl px-6">
          {/* eyebrow */}
          <div className="mb-7 flex flex-wrap items-center gap-3.5">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-ibi-green" />
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                {heroCopy.eyebrow[0]}
              </span>
            </span>
            {heroCopy.eyebrow.slice(1).map((e) => (
              <span key={e} className="flex items-center gap-3.5">
                <span className="h-1 w-1 rounded-full bg-gray-600" />
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">{e}</span>
              </span>
            ))}
          </div>

          <HeroStat />

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap gap-3.5">
            <Link
              href="/portos/movimentacao"
              className="rounded-full bg-gradient-to-r from-ibi-green to-ibi-blue px-6 py-3.5 font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Explorar o painel de portos →
            </Link>
            <Link
              href="#receber"
              className="rounded-full border border-white/15 px-6 py-3.5 font-semibold text-white transition-colors hover:border-ibi-blue"
            >
              Receber todo mês
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── ACHADOS ───────────── */}
      <section id="analises" className="mx-auto max-w-screen-xl px-6 py-20">
        <div className="mb-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ibi-blue">
            O que os dados estão dizendo
          </p>
          <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Análises que ninguém mais publica.
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-gray-400">
            Indicadores originais construídos sobre a Estatística Aquaviária da ANTAQ — do antecedente do PIB ao custo do navio parado.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {achados.map((a) => (
            <Link
              key={a.valor}
              href={a.href}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-azul-medio p-7 transition-all hover:-translate-y-1 hover:border-white/20"
            >
              <span className={`absolute inset-x-0 top-0 h-[3px] ${corBarra[a.cor]}`} />
              <div className={`text-[2.7rem] font-black leading-none tracking-tight ${corNumero[a.cor]}`}>
                {a.valor}
              </div>
              <div className="mt-2 min-h-[34px] text-sm font-semibold text-gray-400">{a.label}</div>
              <p className="mt-4 mb-5 text-sm leading-relaxed text-gray-500">{a.texto}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
                Ver indicador
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* ───────────── PAINÉIS ───────────── */}
      <section id="dados" className="mx-auto max-w-screen-xl px-6 py-20">
        <div className="mb-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-verde">Explore os dados</p>
          <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Painéis vivos, porto a porto.
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-gray-400">
            Cada painel é uma porta de entrada para a base — com o número certo, do mês certo, do porto certo.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {paineis.map((p) => {
            const Icon = p.icon;
            const isBreve = p.status === "breve";
            const inner = (
              <>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    p.iconCor === "green" ? "bg-ibi-green/12 text-verde" : "bg-ibi-blue/12 text-ibi-blue"
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <h3 className="flex items-center gap-2.5 text-lg font-bold">
                  {p.titulo}
                  <span className={`rounded px-1.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wider ${badge[p.status].cls}`}>
                    {badge[p.status].txt}
                  </span>
                </h3>
                <p className="text-sm leading-relaxed text-gray-400">{p.descricao}</p>
                <span className={`mt-auto inline-flex items-center gap-1.5 text-sm font-bold ${isBreve ? "text-gray-500" : "text-white"}`}>
                  {p.cta}{!isBreve && " →"}
                </span>
              </>
            );
            const cls =
              "flex min-h-[200px] flex-col gap-3.5 rounded-2xl border border-white/10 bg-azul-medio p-7 transition-all";
            return isBreve ? (
              <div key={p.titulo} className={`${cls} opacity-60`}>{inner}</div>
            ) : (
              <Link key={p.titulo} href={p.href} className={`${cls} hover:-translate-y-1 hover:border-ibi-blue`}>
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ───────────── CAPTURA ───────────── */}
      <section id="receber" className="mx-auto max-w-screen-xl px-6 py-20">
        <div
          className="overflow-hidden rounded-3xl border border-white/10 px-8 py-14 text-center"
          style={{
            background:
              "linear-gradient(120deg,rgba(0,153,216,.1),rgba(0,166,82,.08))",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ibi-blue">Boletim mensal</p>
          <h2 className="mx-auto mt-3 max-w-[620px] text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Receba a movimentação portuária assim que sair.
          </h2>
          <p className="mx-auto mt-4 mb-7 max-w-[480px] leading-relaxed text-gray-400">
            Todo mês, o número oficial da ANTAQ com a leitura do IBI — direto no seu e-mail, antes de você precisar procurar.
          </p>
          <SubscribeForm />
          <p className="mt-4 text-xs text-gray-500">Sem spam. Só dados e análise. Cancele quando quiser.</p>
        </div>
      </section>
    </main>
  );
}
