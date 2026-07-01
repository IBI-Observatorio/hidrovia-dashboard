// aereo-cada-real.ts
// Types, copy e lógica pura da página "Onde vai cada real da sua passagem"
// (/aereo/cada-real), primeira página da vertical Setor Aéreo.
//
// Os DADOS (rotas + decomposição) vivem em public/data/aereo/cada-real.json,
// gerado por scripts/gera-aereo-cada-real.mjs (ver docs/RUNBOOK-DADOS.md).
// Este arquivo não guarda números — só tipos, a copy editorial e a função de
// ajuste regional. A page (server) lê o JSON e passa via props ao client.

export type Regiao = "norte" | "nordeste" | "sudeste" | "sul";

export interface RotaAncora {
  id: string;
  label: string;        // "GRU → SDU"
  origem: string;       // "São Paulo (GRU)"
  destino: string;      // "Rio de Janeiro (SDU)"
  tarifaMedia: number;  // R$
  regiao: Regiao;
  amostra?: number;     // assentos na amostra ANAC (quando tarifa é real)
}

export interface CamadaCusto {
  id: string;
  label: string;
  percentual: number;       // % do preço total pago pelo passageiro
  cor: string;
  descricaoCurta: string;
  insight: string;
  destaque?: string;        // selo opcional no mini-card (ex.: "menor fatia")
}

// Shape do public/data/aereo/cada-real.json.
export interface CadaRealData {
  referencia: string;
  geradoEm: string;
  fonte: string;
  tarifas: { origem: string; periodo: string | null; dadosIlustrativos: boolean; nota: string };
  ajusteNorteCombustivelPP: number;
  rotas: RotaAncora[];
  decomposicao: CamadaCusto[];
}

// Ajuste regional: rotas do Norte carregam +N p.p. de combustível (logística de
// distribuição do QAV na Amazônia, onde o abastecimento em aeroportos remotos é
// materialmente mais caro), retirados proporcionalmente das demais camadas.
export function decomposicaoParaRota(
  decomposicao: CamadaCusto[],
  regiao: Regiao,
  ajustePP: number
): CamadaCusto[] {
  if (regiao !== "norte" || ajustePP === 0) return decomposicao;
  const combustivel = decomposicao.find((c) => c.id === "combustivel");
  if (!combustivel) return decomposicao;
  const base = combustivel.percentual;
  const combustivelNorte = base + ajustePP;
  const fator = (100 - combustivelNorte) / (100 - base);
  return decomposicao.map((c) =>
    c.id === "combustivel"
      ? { ...c, percentual: combustivelNorte }
      : { ...c, percentual: c.percentual * fator }
  );
}

// ─── Copy da página ──────────────────────────────────────────────────────────

export const AVISO_ILUSTRATIVO =
  "⚠ Anatomia estrutural — percentuais calibrados em fontes públicas (CNT/ABEAR/ANAC); tarifa por rota a ligar aos Microdados da ANAC.";

export const paginaCopy = {
  breadcrumb: ["Setor Aéreo", "Onde vai cada real"],
  eyebrow: "Setor Aéreo · estreia da vertical",
  titulo: "Onde vai cada real da sua passagem",
  subtitulo:
    "Escolha uma rota e veja a decomposição do preço de uma passagem doméstica em seis camadas — do querosene de aviação, o maior item isolado, ao resultado de quem opera o voo, o menor — com o imposto que você paga sem ver.",
  labelSeletor: "Rota",
  labelTarifa: "tarifa média da rota",
  labelBarra: "Composição do preço — cada camada em % do total pago",
} as const;

export const comoLer = {
  titulo: "Como ler este número",
  paragrafos: [
    "A barra decompõe o preço de voar na rota selecionada em seis camadas, expressas em percentual do total. O valor em reais de cada camada é o percentual aplicado sobre a tarifa média da rota.",
    "Os percentuais são uma anatomia ESTRUTURAL do custo de voar no Brasil — as mesmas seis camadas para todas as rotas —, calibrada na estrutura de custos oficial da ABEAR (Panorama 2024). Há um ajuste regional: rotas do Norte carregam 6 pontos percentuais a mais de combustível — reflexo da logística de distribuição do QAV na Amazônia —, retirados proporcionalmente das demais camadas.",
    "Sobre os Tributos, sem dupla contagem: o passageiro doméstico NÃO paga ICMS sobre o bilhete (o STF o declarou inconstitucional — ADI 1600) nem PIS/Cofins sobre a venda (zerado até 2026). O tributo que resta — ~10% do preço — está embutido nos insumos, quase todo no ICMS do querosene (regional: 3% no Norte, 7% na maioria, 10% em SP). Por isso o QAV aparece líquido do ICMS, que é mostrado à parte na fatia de Tributos.",
    "Ainda na leitura: a 'tarifa média' que a ANAC divulga exclui as taxas aeroportuárias, que aqui aparecem como camada própria do preço total pago. A decomposição descreve fatores estruturais do transporte aéreo, não a planilha de nenhuma companhia específica.",
  ],
  fontes: [
    "ABEAR — estrutura de custos (Panorama 2024, dados 2023): combustível ~36%, arrendamento/manutenção/depreciação ~21%, pessoal/operação/vendas ~37%, tarifas aeroportuárias e navegação ~6%; ~57% dos custos dolarizados. QAV ~36% dos custos também na CNT (2024), ~45% no pico de 2026.",
    "ANAC — Tarifas Aéreas Domésticas (microdados): tarifa média por rota, ponderada por assentos. A média doméstica foi R$ 632,53 em mai/2026 e a série exclui taxas aeroportuárias.",
    "Carga tributária ~10% do preço, quase toda ICMS embutido no QAV (Maran Gehlen, 2026; alíquotas CONFAZ 188/17). STF ADI 1600 (sem ICMS sobre o bilhete); Lei 14.592/2023 (PIS/Cofins zerado). Reforma IBS/CBS: ~26% a partir de 2027.",
  ],
  aviso:
    "Os percentuais são uma anatomia estrutural calibrada na estrutura de custos da ABEAR e na carga tributária do setor, não a planilha de uma companhia. A tarifa média de cada rota vem dos Microdados de Tarifas Aéreas Domésticas da ANAC (média ponderada por assentos).",
} as const;

export const insightFinal =
  "O combustível é o maior item isolado de uma passagem — cerca de um terço do preço — e, somado ao imposto embutido, chega a perto de 40%. E quase todo esse imposto é o ICMS sobre o querosene, que varia por região (3% no Norte a 10% em SP): não há tributo sobre o bilhete em si. Do outro lado, o resultado da companhia é a menor fatia — no Brasil, a margem do setor foi zero ou negativa em vários anos. Voar é, em essência, uma equação de petróleo, câmbio e carga tributária.";
