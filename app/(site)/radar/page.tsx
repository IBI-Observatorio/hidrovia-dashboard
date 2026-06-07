import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Train, ShieldCheck } from "lucide-react";
import type { Asset } from "@/lib/dcf/types";
import { analisarAtivo } from "@/lib/dcf";
import { ESTAGIOS, REGIME_INFO, classificaRegime } from "@/lib/radar/maturation";
import { RADAR_ASSETS, fullAsset } from "@/lib/radar/assets";
import { num } from "@/lib/radar/format";
import { clienteRadarAtual } from "@/lib/radar/acesso";

export const metadata: Metadata = {
  title: "Radar de Maturação Ferroviária · Observatório IBI",
  description:
    "Inteligência sobre a maturação dos próximos leilões ferroviários — esteira de estágios, P(leilão) e motor DCF. Piloto: Ferrogrão (EF-170).",
};

export default async function RadarIndexPage() {
  const cliente = await clienteRadarAtual();
  if (!cliente) redirect("/radar/acesso");

  // Piloto com motor DCF completo (EF-170) — alimenta o regime econômico.
  const pilotoEntry = RADAR_ASSETS.find((a) => a.completo)!;
  const piloto = analisarAtivo(fullAsset(pilotoEntry) as Asset, { mcN: 4000, seed: 42 });
  const pEstruturaFechaPiloto = 1 - piloto.monteCarlo.pSpreadNeg;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:pt-32">
      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center gap-2 rounded-full border border-ibi-green/30 bg-ibi-green/10 px-3 py-1 text-xs font-medium text-ibi-green">
            <Train className="h-3.5 w-3.5" /> Radar de Maturação
          </p>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
            <ShieldCheck className="h-3.5 w-3.5 text-ibi-green" /> Acesso: <strong className="text-white">{cliente}</strong>
          </p>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-white md:text-4xl">
          Antecipando a maturação dos leilões ferroviários
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          Esteira de estágios, probabilidade de leilão e estrutura econômico-financeira de quatro
          ativos. Motor DCF real com correção por classe de referência — não interpolação. Piloto
          completo: <strong className="text-gray-200">Ferrogrão (EF-170)</strong>.
        </p>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {RADAR_ASSETS.map((a) => {
          const mat = a.maturacao;
          const pFecha = a.completo ? pEstruturaFechaPiloto : undefined;
          const regime = mat ? classificaRegime(mat, pFecha ?? 1) : "maturando";
          return (
            <Link
              key={a.id}
              href={`/radar/${a.id}?tab=maturacao`}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-azul-medio p-5 transition hover:border-ibi-green/40"
            >
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ibi-green to-ibi-blue opacity-60" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">{a.name}</h2>
                  <p className="text-xs text-gray-400">{a.sub}</p>
                </div>
                {a.completo ? (
                  <span className="rounded-full bg-ibi-green/10 px-2 py-0.5 text-[10px] font-medium text-ibi-green">
                    piloto completo
                  </span>
                ) : (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    dados parciais
                  </span>
                )}
              </div>

              {mat && (
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[10px] text-gray-500">Estágio</p>
                    <p className="text-xs font-semibold text-white">{ESTAGIOS[mat.estagioAtual]}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Leilão anunciado</p>
                    <p className="text-xs font-semibold text-ibi-blue">{mat.leilaoAnunciado ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Regime</p>
                    <p className={`text-xs font-semibold ${REGIME_INFO[regime].txt}`}>
                      {REGIME_INFO[regime].label}
                    </p>
                  </div>
                </div>
              )}

              {a.completo && (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[10px] text-gray-500">TIR realista</p>
                    <p className="text-sm font-semibold tabular-nums text-ouro">
                      {num(piloto.realista.tir * 100, 1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">P(spread&lt;0)</p>
                    <p className="text-sm font-semibold tabular-nums text-vermelho">
                      {num(piloto.monteCarlo.pSpreadNeg * 100, 0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">WACC</p>
                    <p className="text-sm font-semibold tabular-nums text-ibi-blue">
                      {num(piloto.wacc * 100, 2)}%
                    </p>
                  </div>
                </div>
              )}

              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-ibi-blue">
                Abrir deep-dive
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-[11px] leading-relaxed text-gray-600">
        Estágios e leilões anunciados são públicos (ANTT/PPI/TCU). TIR, P(spread&lt;0) e P(leilão)
        são saída de modelo proprietário sobre dados públicos, ilustrativas — não constituem
        recomendação de investimento.
      </p>
    </main>
  );
}
