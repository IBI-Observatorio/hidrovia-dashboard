import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { clienteRadarAtual } from "@/lib/radar/acesso";

export const metadata: Metadata = {
  title: "Radar · Acesso restrito · Observatório IBI",
  robots: { index: false, follow: false },
};

export default async function RadarAcessoPage() {
  // Se já estiver autenticado, não faz sentido ficar aqui.
  if (await clienteRadarAtual()) redirect("/radar");

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 pt-28 text-center md:pt-32">
      <span className="inline-flex items-center gap-2 rounded-full border border-ouro/30 bg-ouro/10 px-3 py-1 text-xs font-medium text-ouro">
        <Lock className="h-3.5 w-3.5" /> Acesso restrito
      </span>
      <h1 className="mt-5 text-2xl font-bold text-white md:text-3xl">
        Radar de Maturação Ferroviária
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-400">
        Este é um produto de inteligência <strong className="text-gray-200">exclusivo</strong> do
        Observatório IBI, disponível apenas a clientes autorizados. Se você recebeu um link de
        acesso, ele ativa sua sessão automaticamente. Caso o acesso tenha expirado ou você precise
        de credenciais, fale com o IBI.
      </p>
      <p className="mt-6 text-[11px] text-gray-600">
        Probabilidades e projeções do Radar são saída de modelo proprietário sobre dados públicos,
        ilustrativas — não constituem recomendação de investimento.
      </p>
    </main>
  );
}
