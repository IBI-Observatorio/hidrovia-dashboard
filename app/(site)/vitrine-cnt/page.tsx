import type { Metadata } from "next";
import EmbedButton from "@/components/EmbedButton";
import SeloProveniencia from "@/components/SeloProveniencia";
import { EMBED_REGISTRY } from "@/lib/embed-registry";
import { EMBED_REGISTRY_HIDRO } from "@/lib/embed-registry-hidro";
import { EMBED_RELOGIO } from "@/lib/relogio";

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA-VITRINE NÃO-LISTADA — "complemento às bases consolidadas do setor".
//
// Não-listada de verdade:
//   • noindex/nofollow no metadata abaixo;
//   • NÃO está em lib/navigation-copy.ts (header/footer) nem em nenhum sitemap
//     (o projeto não gera sitemap.ts — confirmado em 28/06/2026);
//   • nenhuma outra página linka para cá. Só acessível por link direto.
//
// Fonte única: os módulos vivos são os MESMOS /embed/relogio, /embed/pavimento
// e /embed/aquaviario, embutidos via <iframe> real (mesma origin). Zero
// número/copy de domínio duplicado aqui — os números vivem dentro dos embeds.
// As alturas vêm dos registries.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "O que mostra o que ainda não aconteceu | Observatório IBI",
  description:
    "O Observatório de Infraestrutura como camada viva e preditiva, complementar às bases que o setor já consolida.",
  robots: { index: false, follow: false },
};

const ALTURA_RELOGIO = EMBED_RELOGIO.alturaEmbed;
const ALTURA_PAVIMENTO = EMBED_REGISTRY.pavimento.alturaEmbed ?? 560;
const ALTURA_AQUAVIARIO = EMBED_REGISTRY_HIDRO.aquaviario.alturaEmbed;

// Mapa: base consolidada do setor → camada viva do Observatório.
const MAPA: {
  base: string;
  camada: string;
  status: "no-ar" | "dev";
}[] = [
  {
    base: "Pesquisa de condição rodoviária",
    camada: "Contador de sobrecusto em tempo real",
    status: "no-ar",
  },
  {
    base: "Acidentes (contagem)",
    camada: "Custo econômico vivo por dia / UF",
    status: "dev",
  },
  {
    base: "Combustíveis / diesel (preço)",
    camada: "Elasticidade frete ↔ diesel em R$",
    status: "dev",
  },
  {
    base: "Movimentação aquaviária",
    camada: "Vertical hidrológica preditiva (calado, LWS, IDN)",
    status: "no-ar",
  },
  {
    base: "Mapas estáticos",
    camada: "Corredores com custo de atraso por concessão",
    status: "dev",
  },
];

// Código ilustrativo (estático) — exemplo de como um indicador é embutido.
const EXEMPLO_IFRAME = `<iframe
  src="https://ibi-observatorio.org/embed/pavimento"
  width="100%" height="${ALTURA_PAVIMENTO}" frameborder="0"
  style="border:0;border-radius:12px"></iframe>`;

export default function VitrineCntPage() {
  return (
    <main className="max-w-screen-lg mx-auto px-4 py-14 flex flex-col gap-16">
      {/* ════════ (A) ABERTURA ════════ */}
      <header className="max-w-3xl">
        <p className="text-ouro text-[11px] font-bold uppercase tracking-widest mb-3">
          Observatório de Infraestrutura de Transportes · IBI
        </p>
        <h1 className="text-white text-4xl sm:text-5xl font-extrabold leading-[1.08] mb-5">
          O que mostra o que ainda não aconteceu.
        </h1>
        <p className="text-gray-300 text-lg leading-relaxed">
          O Observatório de Infraestrutura como camada viva e preditiva —
          complementar às bases que o setor já consolida. Da medição anual ao
          acompanhamento contínuo.
        </p>
      </header>

      {/* ════════ (A½) O RELÓGIO — agregador nacional ════════ */}
      <section className="flex flex-col gap-4">
        <div className="max-w-3xl">
          <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-2">
            Relógio da Infraestrutura
          </p>
          <p className="text-gray-300 text-base leading-relaxed">
            Cada painel abaixo é um componente do Relógio — somado ao placar
            (pavimento) ou como camada de antecipação, fora da soma (aquaviário).
          </p>
        </div>
        <div className="rounded-xl overflow-hidden border border-white/10 bg-azul-medio">
          <iframe
            src="/embed/relogio"
            width="100%"
            height={ALTURA_RELOGIO}
            frameBorder={0}
            style={{ border: 0, display: "block" }}
            title="Relógio da Infraestrutura — custo evitável nacional em tempo real"
          />
        </div>
        <div>
          <EmbedButton modulo="relogio" altura={ALTURA_RELOGIO} />
        </div>
      </section>

      {/* ════════ (B) MÓDULOS VIVOS ════════ */}
      <section className="flex flex-col gap-12">
        <div>
          <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-2">
            Os módulos, ao vivo
          </p>
          <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
            Cada bloco abaixo é o indicador real, rodando agora — não uma imagem.
            É a própria prova de que o embed funciona.
          </p>
        </div>

        {/* Pavimento */}
        <article className="flex flex-col gap-4">
          <div className="max-w-3xl">
            <h2 className="text-white text-2xl font-bold mb-1.5">
              Pavimento
            </h2>
            <p className="text-gray-300 text-base leading-relaxed">
              Da pesquisa anual ao tempo real: o sobrecusto do pavimento, vivo.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden border border-white/10 bg-azul-medio">
            <iframe
              src="/embed/pavimento"
              width="100%"
              height={ALTURA_PAVIMENTO}
              frameBorder={0}
              style={{ border: 0, display: "block" }}
              title="Módulo Pavimento — sobrecusto rodoviário em tempo real"
            />
          </div>
          <div>
            <EmbedButton modulo="pavimento" altura={ALTURA_PAVIMENTO} />
          </div>
        </article>

        {/* Aquaviário */}
        <article className="flex flex-col gap-4">
          <div className="max-w-3xl">
            <h2 className="text-white text-2xl font-bold mb-1.5">
              Aquaviário
            </h2>
            <p className="text-gray-300 text-base leading-relaxed">
              Antecipação, não medição: quando o calado restringe — antes de
              restringir.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden border border-white/10 bg-azul-medio">
            <iframe
              src="/embed/aquaviario"
              width="100%"
              height={ALTURA_AQUAVIARIO}
              frameBorder={0}
              style={{ border: 0, display: "block" }}
              title="Módulo Aquaviário — risco hidrológico preditivo"
            />
          </div>
          <div>
            <EmbedButton modulo="aquaviario" altura={ALTURA_AQUAVIARIO} />
          </div>
        </article>
      </section>

      {/* ════════ (C) O MAPA ════════ */}
      <section>
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-2">
          Onde a camada viva encaixa
        </p>
        <h2 className="text-white text-2xl font-bold mb-2 max-w-3xl">
          Cada base consolidada do setor ganha uma camada viva.
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mb-7">
          As bases consolidadas do setor medem o estado. O Observatório acrescenta
          o movimento — o mesmo número, agora contínuo e projetado.
        </p>

        <div className="flex flex-col divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden">
          {MAPA.map((item) => (
            <div
              key={item.base}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center gap-2 sm:gap-4 bg-azul-medio px-5 py-4"
            >
              <p className="text-gray-400 text-sm leading-snug">{item.base}</p>
              <span className="hidden sm:block text-gray-600" aria-hidden>
                →
              </span>
              <p className="text-white text-sm font-semibold leading-snug">
                {item.camada}
              </p>
              <div className="justify-self-start sm:justify-self-end">
                {item.status === "no-ar" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-verde/40 bg-verde/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-verde">
                    <span className="h-1.5 w-1.5 rounded-full bg-verde" />
                    No ar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                    Em desenvolvimento
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ (D) PROVA DE VELOCIDADE ════════ */}
      <section className="rounded-xl border border-ouro/30 bg-ouro/[0.06] p-7 sm:p-9">
        <p className="text-ouro text-[11px] font-bold uppercase tracking-widest mb-3">
          Prova de velocidade
        </p>
        <p className="text-white text-xl sm:text-2xl font-bold leading-snug max-w-3xl mb-4">
          Quando os leilões ferroviários foram reprogramados, o Observatório
          quantificou o custo do adiamento em dias — não no relatório do ano
          seguinte.
        </p>
        <p className="text-gray-300 text-base leading-relaxed max-w-3xl mb-5">
          Para a Ferrogrão, o custo do adiamento foi estimado em torno de{" "}
          <strong className="text-white">R$ 740 milhões</strong> em sobrecusto
          rodoviário evitável — calculado enquanto a decisão ainda estava em
          curso.{" "}
          <a
            href="/radar"
            className="text-ibi-blue hover:underline underline-offset-2"
          >
            Ver o Radar de Leilões →
          </a>
        </p>
        <SeloProveniencia
          tipo="estimativa-ibi"
          fonte="Estimativa IBI — sobrecusto rodoviário do adiamento (cenário base 2026)"
        />
      </section>

      {/* ════════ (E) COMO ENTRA ════════ */}
      <section>
        <p className="text-verde text-[11px] font-bold uppercase tracking-widest mb-2">
          Como entra
        </p>
        <h2 className="text-white text-2xl font-bold mb-3 max-w-3xl">
          Cada indicador acima é um iframe.
        </h2>
        <p className="text-gray-300 text-base leading-relaxed max-w-3xl mb-6">
          O mesmo mecanismo de embed que as plataformas do setor já usam. Integra
          sem alterar a arquitetura de quem recebe.
        </p>
        <pre className="rounded-xl border border-white/10 bg-azul-marinho p-5 overflow-x-auto text-xs sm:text-sm leading-relaxed text-gray-300">
          <code>{EXEMPLO_IFRAME}</code>
        </pre>
      </section>
    </main>
  );
}
