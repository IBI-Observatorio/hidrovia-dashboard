import type { Metadata } from "next";
import { Anchor, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title:       "Assinar · IRC Tabocal — Observatório IBI Hidrovias",
  description: "Planos de assinatura para acesso parametrizado ao Índice de Risco de Calado (IRC-Tabocal). Cargill, Hermasa, Cargill, Amaggi e demais operadores customizam o calado-alvo da sua operação.",
};

const PLANOS = [
  {
    nome: "Briefing",
    publico: "Assessoria · Imprensa · MPF",
    preco: "R$ 800 / mês",
    features: [
      "Briefing semanal por e-mail (PDF)",
      "Dashboard /monitor com calado-alvo padrão (11m)",
      "Acesso a estudos de caso e relatórios",
    ],
    cta: "Falar com vendas",
    destaque: false,
  },
  {
    nome: "Operacional",
    publico: "Tradings · Pequenos armadores",
    preco: "R$ 5.000 / mês",
    features: [
      "Tudo do Briefing",
      "Calado-alvo parametrizável (slider 7m–13m)",
      "URL deep-link com calado fixado (citação em contratos)",
      "5 usuários · alertas por e-mail quando IRC cruza faixas",
      "Histórico IRC 90 dias",
    ],
    cta: "Solicitar acesso",
    destaque: true,
  },
  {
    nome: "Enterprise",
    publico: "Grandes armadores · Tradings tier-1",
    preco: "Sob consulta",
    features: [
      "Tudo do Operacional",
      "API JSON com IRC ao vivo (webhooks)",
      "Calado-alvo por filial/operação (multi-perfil)",
      "Onboarding analítico com equipe IBI",
      "Citação contratual com royalty",
    ],
    cta: "Falar com diretoria",
    destaque: false,
  },
];

export default function AssinarPage() {
  return (
    <main className="max-w-screen-lg mx-auto px-4 py-12">
      {/* Hero */}
      <header className="text-center mb-12 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 mb-3">
          <Anchor size={16} className="text-verde" />
          <p className="text-verde text-[11px] font-bold uppercase tracking-widest">
            IRC-Tabocal · Assinaturas
          </p>
        </div>
        <h1 className="text-white text-3xl md:text-4xl font-extrabold mb-3 leading-tight">
          Cada operação tem seu calado.
          <br />Cada calado tem seu IRC.
        </h1>
        <p className="text-gray-400 text-base leading-relaxed">
          A versão gratuita do IRC-Tabocal usa o calado-alvo padrão de 11m (comboio carregado
          em cheia normal). Assinantes parametrizam o calado da sua operação — Cargill com
          11,5m, comboios menores com 9m, grandes balsas com 12m — e o índice se ajusta em
          tempo real à realidade do seu fleet.
        </p>
      </header>

      {/* Planos */}
      <section className="grid md:grid-cols-3 gap-5 mb-12">
        {PLANOS.map((p) => (
          <div
            key={p.nome}
            className={`rounded-xl p-6 border ${
              p.destaque
                ? "bg-verde/5 border-verde/40 shadow-lg shadow-verde/10"
                : "bg-azul-medio border-white/10"
            }`}
          >
            {p.destaque && (
              <p className="text-verde text-[10px] font-bold uppercase tracking-widest mb-2">
                Mais popular
              </p>
            )}
            <h2 className="text-white text-xl font-bold mb-1">{p.nome}</h2>
            <p className="text-gray-500 text-xs mb-4">{p.publico}</p>
            <p className={`text-2xl font-extrabold mb-5 ${p.destaque ? "text-verde" : "text-white"}`}>
              {p.preco}
            </p>
            <ul className="space-y-2 mb-6 text-sm text-gray-300">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-verde mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href="mailto:contato@ibi-observatorio.org?subject=IRC-Tabocal · Plano "
              className={`block text-center text-sm font-bold py-2 rounded transition-colors ${
                p.destaque
                  ? "bg-verde text-azul-marinho hover:bg-verde/90"
                  : "bg-azul-marinho text-white border border-white/20 hover:border-white/40"
              }`}
            >
              {p.cta}
            </a>
          </div>
        ))}
      </section>

      {/* FAQ rápido */}
      <section className="max-w-2xl mx-auto text-sm text-gray-400 space-y-4">
        <h2 className="text-white font-bold text-base mb-3">Como funciona?</h2>
        <details className="bg-azul-medio rounded-lg p-4 border border-white/5">
          <summary className="cursor-pointer text-white font-semibold">
            Já assinei. Como ativo no dashboard?
          </summary>
          <p className="mt-2 leading-relaxed">
            Após confirmação do pagamento, você recebe por e-mail um link com seu token
            (formato <code className="text-verde">ASS-NOMECLIENTE-2026</code>). Basta abrir
            o link: <code className="text-verde">/api/auth?token=ASS-XYZ-2026</code> e a
            sessão fica salva por 90 dias. Depois disso o calado-alvo passa a ser
            parametrizável em <code>/monitor</code>.
          </p>
        </details>
        <details className="bg-azul-medio rounded-lg p-4 border border-white/5">
          <summary className="cursor-pointer text-white font-semibold">
            Por que calado-alvo parametrizável é diferencial?
          </summary>
          <p className="mt-2 leading-relaxed">
            A Capitania publica um CMR único. Mas armadores diferentes têm comboios
            diferentes — um comboio de soja a granel pesado opera com calado 11,5m,
            uma balsa menor de cabotagem com 8m. O IRC parametrizado mostra
            <strong className="text-white"> exatamente o que importa para sua operação</strong>,
            não uma média genérica do setor.
          </p>
        </details>
        <details className="bg-azul-medio rounded-lg p-4 border border-white/5">
          <summary className="cursor-pointer text-white font-semibold">
            URL com calado fixo vale em contrato?
          </summary>
          <p className="mt-2 leading-relaxed">
            Sim — esse é parte do produto. Ao copiar o link com seu calado-alvo, a URL fica
            imutável. Pode ser referenciada em cláusulas de força maior, gatilhos de seguro
            e prospectos de financiamento.
          </p>
        </details>
      </section>

      <p className="text-center text-gray-600 text-xs mt-10">
        Observatório IBI · Infraestrutura de Transportes ·{" "}
        <a href="mailto:contato@ibi-observatorio.org" className="hover:text-gray-400">
          contato@ibi-observatorio.org
        </a>
      </p>
    </main>
  );
}
