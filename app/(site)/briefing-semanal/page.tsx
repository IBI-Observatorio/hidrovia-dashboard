// Rota /briefing-semanal — entrega editorial semanal.
//
// Recebe os dados ANA + previsão SGB + série de Caracaraí + IDN recente e
// monta uma página única, legível em ~90 segundos, com manchete + 3 sub-headlines
// + alerta destaque + parágrafo de contexto.
//
// Atualiza com revalidate=24h (uma regeneração diária); o cron Railway força
// regeneração toda quarta às 09:00.

import type { Metadata } from "next";
import {
  fetchTodasEstacoes,
  fetchPrevisao2026,
  fetchCotasIDN,
} from "@/lib/fetch-dados";
import { geraBriefing, briefingMinimo, type SnapshotBriefing } from "@/lib/briefing-gerador";
import { IDN_RECENTE_DIARIO } from "@/lib/idn-historico-calculado";
import { navigationCopy } from "@/lib/navigation-copy";

export const revalidate = 86400; // 24h

export const metadata: Metadata = {
  title: "Briefing Semanal — Observatório IBI Hidrovias",
  description:
    "Briefing editorial semanal sobre a bacia do Amazonas: manchete, alertas e contexto operacional para tomada de decisão em logística hidroviária.",
  openGraph: {
    title: "Briefing Semanal IBI — Bacia do Amazonas",
    description:
      "O resumo executivo da semana hidrológica da bacia do Amazonas, com alertas antecipados e contexto regulatório.",
  },
};

function formataDataLonga(iso: string): string {
  const meses = ["janeiro","fevereiro","março","abril","maio","junho",
                 "julho","agosto","setembro","outubro","novembro","dezembro"];
  const [a, m, d] = iso.split("-");
  return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1] ?? "?"} de ${a}`;
}

function corSeveridade(s: "atencao" | "alta" | "critica"): string {
  if (s === "critica") return "border-vermelho/40 bg-vermelho/10 text-vermelho";
  if (s === "alta")    return "border-ouro/40 bg-ouro/10 text-ouro";
  return "border-azul-medio bg-azul-marinho text-white";
}

export default async function BriefingSemanalPage() {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });

  // Busca dados em paralelo
  let dados: Awaited<ReturnType<typeof fetchTodasEstacoes>>;
  let cotasIDN: Awaited<ReturnType<typeof fetchCotasIDN>> = {};
  let previsao: Awaited<ReturnType<typeof fetchPrevisao2026>>;

  try {
    const [d, c, p] = await Promise.all([
      fetchTodasEstacoes(),
      fetchCotasIDN(),
      fetchPrevisao2026(),
    ]);
    dados = d;
    cotasIDN = c;
    previsao = p;
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    const b = briefingMinimo(hoje, `Falha de captura: ${erro}`);
    return renderBriefing(b);
  }

  // Série Caracaraí: extraímos da resposta IDN (últimos N pontos).
  // Como cotasIDN só traz UM ponto agregado por estação, não temos série temporal
  // adequada para detectar a Onda Branco aqui — passamos undefined e o detector
  // é skipado. Para a série completa, o briefing-gerador depende do parser SGB
  // que captura "Boa Vista subiu +2m em 1 semana" no texto do boletim (uma
  // versão v2 do detector pode ler diretamente o cache SGB).
  const snapshot: SnapshotBriefing = {
    dados,
    cotasIDN,
    previsao,
    data_ref:         hoje,
    serie_caracarai:  undefined,        // v2: alimentar via parser SGB ou histórico ANA
    serie_idn:        IDN_RECENTE_DIARIO.slice(-30),
  };

  const briefing = geraBriefing(snapshot);
  return renderBriefing(briefing);
}

// Renderização separada para reutilização em fallback
function renderBriefing(b: ReturnType<typeof geraBriefing>) {
  return (
    <div className="max-w-screen-md mx-auto px-4 py-10 print:py-4">
      {/* ── Cabeçalho ── */}
      <div className="mb-6 pb-4 border-b border-white/10">
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-1">
          Briefing Semanal IBI · Hidrovias
        </p>
        <p className="text-gray-400 text-xs">
          Semana {b.numero_semana} de {b.ano} · Publicado em{" "}
          <time dateTime={b.data_publicacao}>{formataDataLonga(b.data_publicacao)}</time>
        </p>
      </div>

      {/* ── Manchete ── */}
      <header className="mb-8">
        <p className="text-vermelho text-[11px] font-bold uppercase tracking-widest mb-2">
          {b.manchete.eyebrow}
        </p>
        <h1 className="text-white text-3xl md:text-4xl font-extrabold leading-tight mb-4">
          {b.manchete.titulo}
        </h1>
        <p className="text-gray-200 text-lg leading-relaxed">{b.manchete.lead}</p>
      </header>

      {/* ── Alerta destaque (se houver) ── */}
      {b.alerta_destaque && (
        <div className={`rounded-lg p-4 mb-8 border ${corSeveridade(b.alerta_destaque.severidade)}`}>
          <p className="text-[10px] uppercase tracking-widest font-bold mb-1 opacity-80">
            {b.alerta_destaque.rotulo}
          </p>
          <p className="text-sm leading-relaxed">{b.alerta_destaque.texto}</p>
        </div>
      )}

      {/* ── Sub-headlines ── */}
      {b.sublinhas.length > 0 && (
        <section className="space-y-5 mb-8">
          <h2 className="text-white text-lg font-bold border-b border-white/10 pb-2">
            Movimentos da semana
          </h2>
          {b.sublinhas.map((s, i) => (
            <article key={i} className="bg-azul-medio/50 rounded-lg p-4 border border-white/5">
              <p className="text-verde text-[10px] uppercase tracking-widest font-bold mb-1">
                {s.rotulo}
              </p>
              <h3 className="text-white text-base font-bold mb-1.5">{s.titulo}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{s.texto}</p>
            </article>
          ))}
        </section>
      )}

      {/* ── Contexto ── */}
      {b.paragrafo_contexto && (
        <section className="mb-8">
          <h2 className="text-white text-base font-bold border-b border-white/10 pb-2 mb-3">
            Contexto
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">{b.paragrafo_contexto}</p>
        </section>
      )}

      {/* ── Rodapé ── */}
      <footer className="mt-10 pt-4 border-t border-white/10 text-xs text-gray-500 leading-relaxed">
        <p className="mb-1">
          <strong className="text-gray-400">Fonte:</strong> {b.fonte_dados}.
        </p>
        <p>
          Briefing produzido automaticamente pelo Observatório IBI a partir de dados
          ANA HidroWebService, boletins SGB/CPRM e modelo próprio de recessão pós-pico
          (calibrado em 2016–2023). Atualizado semanalmente. Versão impressa
          disponível via{" "}
          <span className="text-verde">Ctrl+P</span>. Para o monitor em tempo real,{" "}
          <a href="/monitor" className="text-verde hover:underline">/monitor</a>.
        </p>
        <div className="flex flex-wrap gap-3 mt-3 print:hidden">
          <a href={navigationCopy.header.brand.href} className="text-gray-600 hover:text-gray-400">
            {navigationCopy.header.brand.label}
          </a>
          <span className="text-gray-700">·</span>
          <a href="/calendario-lws-2026" className="text-gray-600 hover:text-gray-400">
            Calendário LWS 2026 →
          </a>
        </div>
      </footer>
    </div>
  );
}
