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
  tarifas: { origem: string; dadosIlustrativos: boolean; nota: string };
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
    "Escolha uma rota e veja a decomposição do preço de uma passagem doméstica em seis camadas — do querosene de aviação, o maior custo, ao resultado de quem opera o voo, o menor.",
  labelSeletor: "Rota",
  labelTarifa: "tarifa média da rota",
  labelBarra: "Composição do preço — cada camada em % do total pago",
} as const;

export const comoLer = {
  titulo: "Como ler este número",
  paragrafos: [
    "A barra decompõe o preço de voar na rota selecionada em seis camadas de custo, expressas em percentual do total. O valor em reais de cada camada é o percentual aplicado sobre a tarifa média da rota.",
    "Os percentuais são uma anatomia ESTRUTURAL do custo de voar no Brasil — as mesmas seis camadas para todas as rotas —, calibrada em ordens de grandeza públicas (CNT/ABEAR para o peso do QAV; ANAC para a tarifa média). Há um ajuste regional: rotas do Norte carregam 6 pontos percentuais a mais de combustível — reflexo da logística de distribuição do QAV na Amazônia —, retirados proporcionalmente das demais camadas.",
    "Duas ressalvas de leitura: (1) a 'tarifa média' que a ANAC divulga exclui as taxas aeroportuárias, que aqui aparecem como camada própria do preço total pago; (2) o ICMS sobre o QAV já está embutido no preço do combustível — a camada 'Tributos' capta os encargos por cima disso, sem dupla contagem.",
    "A decomposição descreve fatores estruturais de custo do transporte aéreo (preço do QAV, tributação, tarifas reguladas, custo de capital), não a planilha de nenhuma companhia específica.",
  ],
  fontes: [
    "CNT / ABEAR — participação do QAV nos custos operacionais (~36% em 2024; ~45% no pico de 2026).",
    "ANAC — Tarifas Aéreas Domésticas (tarifa média R$ 632,53 em mai/2026; exclui taxas aeroportuárias). Integração por rota prevista via Microdados.",
    "ABEAR / IATA — estrutura de custos do transporte aéreo (referência para as demais camadas).",
  ],
  aviso:
    "Os percentuais são uma anatomia estrutural calibrada em fontes públicas, não a planilha de uma companhia. A tarifa por rota será ligada aos Microdados da ANAC. A estrutura da página — rotas-âncora, camadas e leitura — já é a definitiva.",
} as const;

export const insightFinal =
  "Somados, combustível e tributos respondem por mais da metade do preço de uma passagem doméstica — antes de qualquer custo de operação. Na outra ponta, o resultado da companhia aérea é a menor fatia, quando existe: no Brasil, a margem do setor foi zero ou negativa em vários anos. O preço de voar é, em essência, uma equação estrutural: petróleo, câmbio e carga tributária pesam mais do que qualquer decisão comercial.";
