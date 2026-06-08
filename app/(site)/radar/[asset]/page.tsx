import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { analisarAtivo } from "@/lib/dcf";
import { clienteRadarAtual } from "@/lib/radar/acesso";
import { getRadarAsset, fullAsset } from "@/lib/radar/assets";
import { lerNotas, notasDoAtivo } from "@/lib/radar/notes";
import { alertasDoAtivo } from "@/lib/radar/alerts";
import { previsoesDoAtivo } from "@/lib/radar/backtest";
import StressDCF from "@/components/radar/StressDCF";
import MaturationRail from "@/components/radar/MaturationRail";
import RiskMatrix from "@/components/radar/RiskMatrix";
import Board from "@/components/radar/Board";
import NotesFeed from "@/components/radar/NotesFeed";
import Alerts from "@/components/radar/Alerts";
import Backtest from "@/components/radar/Backtest";
import RadarCopilot from "@/components/radar/RadarCopilot";
import EmptyState from "@/components/radar/EmptyState";

export const revalidate = 21600;

type TabId = "maturacao" | "estresse" | "risco" | "tabuleiro" | "notas" | "copiloto";
const TABS: { id: TabId; label: string; disponivel: boolean }[] = [
  { id: "maturacao", label: "Maturação", disponivel: true },
  { id: "estresse", label: "Estresse RCF", disponivel: true },
  { id: "risco", label: "Risco", disponivel: true },
  { id: "tabuleiro", label: "Tabuleiro", disponivel: true },
  { id: "notas", label: "Notas", disponivel: true },
  { id: "copiloto", label: "Copiloto", disponivel: true },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ asset: string }>;
}): Promise<Metadata> {
  const { asset } = await params;
  const entry = getRadarAsset(asset);
  return {
    title: entry ? `${entry.name} · Radar IBI` : "Radar · Observatório IBI",
    description: entry ? `Deep-dive do ativo ${entry.name} — maturação e estresse DCF.` : undefined,
  };
}

export default async function AssetDeepDive({
  params,
  searchParams,
}: {
  params: Promise<{ asset: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!(await clienteRadarAtual())) redirect("/radar/acesso");

  const { asset } = await params;
  const { tab } = await searchParams;
  const entry = getRadarAsset(asset);
  if (!entry) notFound();

  const tabAtiva = (TABS.find((t) => t.id === tab)?.id ?? "maturacao") as TabId;
  const { name, sub, maturacao } = entry;

  // P(estrutura fechar) = 1 − P(spread<0) do Monte Carlo (só p/ ativo com DCF).
  let pEstruturaFecha: number | undefined;
  const full = fullAsset(entry);
  if (full) {
    const an = analisarAtivo(full, { mcN: 4000, seed: 42 });
    pEstruturaFecha = 1 - an.monteCarlo.pSpreadNeg;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:pt-32">
      <Link
        href="/radar"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Radar
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">{name}</h1>
          <p className="mt-1 text-sm text-gray-400">{sub}</p>
        </div>
        {!entry.completo && (
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-gray-500">
            dados parciais
          </span>
        )}
      </header>

      {/* abas */}
      <nav className="mt-6 flex flex-wrap gap-1 border-b border-white/10">
        {TABS.map((t) => {
          const ativa = t.id === tabAtiva;
          return (
            <Link
              key={t.id}
              href={`/radar/${asset}?tab=${t.id}`}
              className={`relative px-3 py-2 text-sm transition ${
                ativa ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t.label}
              {!t.disponivel && (
                <span className="ml-1 text-[9px] uppercase text-gray-600">em breve</span>
              )}
              {ativa && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-gradient-to-r from-ibi-green to-ibi-blue" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">
        {tabAtiva === "maturacao" && maturacao ? (
          <MaturationRail maturacao={maturacao} pEstruturaFecha={pEstruturaFecha} />
        ) : tabAtiva === "estresse" && full ? (
          <StressDCF asset={full} />
        ) : tabAtiva === "estresse" && !entry.completo ? (
          <EmBreve texto="Estrutura econômico-financeira deste ativo ainda não modelada (dados parciais). A aba Maturação já está disponível." />
        ) : tabAtiva === "risco" ? (
          <RiskMatrix risk={entry.risk} maturacao={maturacao} />
        ) : tabAtiva === "tabuleiro" ? (
          <Board entry={entry} />
        ) : tabAtiva === "notas" ? (
          <div className="space-y-10">
            <NotesFeed notas={notasDoAtivo(lerNotas(), asset)} />
            <Alerts alertas={alertasDoAtivo(asset)} />
            <Backtest previsoes={previsoesDoAtivo(asset)} />
          </div>
        ) : tabAtiva === "copiloto" ? (
          <RadarCopilot assetId={entry.id} assetName={name} />
        ) : (
          <EmBreve texto={`Módulo "${TABS.find((t) => t.id === tabAtiva)?.label}" entra nas próximas fases do Radar.`} />
        )}
      </div>
    </main>
  );
}

function EmBreve({ texto }: { texto: string }) {
  return (
    <EmptyState>
      {texto}
      <p className="mt-2 text-xs text-gray-600">
        Fase 1: Estresse RCF (motor DCF) · Fase 2: Maturação + P(leilão). Demais módulos nas próximas fases.
      </p>
    </EmptyState>
  );
}
