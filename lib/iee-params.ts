// iee-params.ts
// Parâmetros do IEE — Índice de Estresse de Escoamento (vertical AGRO).
//
// Tudo que é PARAMÉTRICO do IEE vive aqui: pesos por corredor, faixas,
// custo de demurrage, rotas de frete representativas e constantes da
// normalização sazonal. A matemática vive em lib/iee.ts — único lugar
// onde o índice é calculado.
//
// Pesos v0: DECLARADOS COMO JULGAMENTO do Observatório (não calibrados).
// Plano de calibração pré-registrado em /agro/metodologia.

/** Corredores de exportação cobertos pelo IEE. */
export type Corredor = "santos" | "paranagua" | "arco-norte";

/**
 * Componentes do IEE (semântica vigente desde o PASSO 4):
 *  F — Fila no porto: tempo médio de espera no line-up (dias). Sobe = estresse.
 *      (PASSO 2 pendente — ilustrativo até o scraper de line-up entrar.)
 *  T — CUSTO rodoviário MODELADO da rota (R$/t) — engine própria IBI
 *      (lib/custeio-rodoviario.ts) + diesel ANP. NÃO é frete de mercado.
 *  S — Pressão de safra: excedente de campo da hinterlândia em semanas de
 *      capacidade do porto (Conab — dado real). Sobe = estresse.
 *  H — Hidrologia (só arco-norte): dias até o calado de 11 m na calha.
 *      CAI = estresse (sinal invertido na normalização — ver lib/iee.ts).
 */
export type ComponenteIEE = "F" | "T" | "S" | "H";

/** Quais componentes entram no IEE de cada corredor. */
export const COMPONENTES_POR_CORREDOR: Record<Corredor, ComponenteIEE[]> = {
  santos: ["F", "T", "S"],
  paranagua: ["F", "T", "S"],
  "arco-norte": ["F", "T", "S", "H"],
};

/**
 * PESOS por corredor (Σ = 1 por corredor).
 * No arco-norte a hidrologia entra com 0,20 porque a janela de calado
 * condiciona toda a logística de barcaças da calha.
 *
 * SANTOS (v6, jun/2026): F protagonista (0,50). Com o F finalmente dotado de
 * série longa — PRESSÃO DE CHEGADAS da ANTAQ (espera-semanal.json, nº de
 * graneleiros que chegam, soma móvel de JANELA_CHEGADAS_F semanas; NÃO usa a
 * espera, logo sem leakage), 2016→2026 — o sweep F×T×S contra a espera EA t+2
 * (scripts/backtest/iee-v4-pesos-f.ts) mostra: F sozinho é o MELHOR preditor
 * isolado da fila (Spearman 0,62 na janela recente / 0,37 na série cheia, vs T
 * 0,50), e o composto sobe de 0,43 (v3, sem F) para 0,58. T (0,40) ancora o
 * NÍVEL (melhor MAE isolado); S (0,10) segue residual (sinal ~nulo na previsão
 * da fila), mantido simbólico por amplitude narrativa. Paranaguá/Arco Norte
 * seguem v0 (sem validação própria; F deles continua no line-up). Ver v6.
 */
export const PESOS_IEE: Record<Corredor, Partial<Record<ComponenteIEE, number>>> = {
  santos: { F: 0.5, T: 0.4, S: 0.1 },
  // v0: pesos de paranagua mantidos (sem validação própria — só Santos tem
  // dado de espera EA suficiente); diferenciar quando o backtest indicar.
  paranagua: { F: 0.4, T: 0.35, S: 0.25 },
  "arco-norte": { F: 0.35, T: 0.25, S: 0.2, H: 0.2 },
};

/**
 * Custo diário de demurrage por navio parado, em US$.
 * Valor declarado, ajustável — citar fonte no card que o exibir.
 * Referência usual de mercado para Panamax/Supramax em janela de safra.
 */
export const CUSTO_DEMURRAGE_DIA_USD = 35_000;

/** Rotas de frete rodoviário representativas de cada corredor (SIFRECA). */
export const ROTAS_FRETE: Record<Corredor, string[]> = {
  santos: ["Sorriso (MT) → Santos (SP)", "Rio Verde (GO) → Santos (SP)"],
  paranagua: ["Cascavel (PR) → Paranaguá (PR)"],
  "arco-norte": ["Sorriso (MT) → Miritituba (PA)"],
};

/** Faixa de leitura do IEE. `token` é a classe-token do globals.css; `hex` é o
 *  mesmo valor do token (para SVG/recharts, que exigem cor literal). */
export interface FaixaIEE {
  /** limite inferior (inclusivo) */
  min: number;
  /** limite superior (exclusivo; 100 é inclusivo na última faixa) */
  max: number;
  label: "Fluido" | "Atenção" | "Pressão" | "Crítico";
  /** nome do token de cor em app/globals.css */
  token: "ibi-green" | "ibi-blue" | "ouro" | "vermelho";
  /** valor hex do MESMO token (não é cor nova) */
  hex: string;
}

/**
 * Faixas do IEE. Tom de boletim: "Crítico" é faixa de leitura,
 * nunca manchete.
 */
export const FAIXAS_IEE: FaixaIEE[] = [
  { min: 0, max: 25, label: "Fluido", token: "ibi-green", hex: "#00a652" },
  { min: 25, max: 50, label: "Atenção", token: "ibi-blue", hex: "#0099d8" },
  { min: 50, max: 75, label: "Pressão", token: "ouro", hex: "#D4922A" },
  { min: 75, max: 100, label: "Crítico", token: "vermelho", hex: "#A0153E" },
];

/** Janela da normalização sazonal: semanas w−2 .. w+2. */
export const JANELA_SAZONAL_SEMANAS = 2;

/** Mínimo de safras históricas para usar percentil empírico puro. */
export const MIN_SAFRAS_PERCENTIL = 3;

/** Mínimo de observações na janela (±2 sem × 3 safras = 15). Abaixo disso,
 *  cai para o z robusto mediana/MAD rotulado "calibração em construção". */
export const MIN_OBS_PERCENTIL =
  MIN_SAFRAS_PERCENTIL * (2 * JANELA_SAZONAL_SEMANAS + 1);

/** Horizonte da projeção IEE+3 (semanas). */
export const HORIZONTE_IEE_MAIS = 3;

// ===========================================================================
// PASSO 3 — Componente S (pressão de safra) · corredor Santos · dado real
// ===========================================================================

/**
 * Hinterlândias v0 por corredor (UFs cuja safra disputa a janela de
 * embarque do porto). APROXIMAÇÕES DECLARADAS:
 *  - santos: MT inteiro como proxy de MT-sul (sem split municipal na v0,
 *    superestima) e MS INTEIRO atribuído a Santos;
 *  - paranagua: ['PR','SC'] — MS-sul EXCLUÍDO na v0 por ambiguidade com
 *    Santos (MS inteiro já está lá; dupla contagem seria pior que omissão).
 *    Refinamento por microrregião fica para a v1;
 *  - arco-norte: ['MT','PA','TO','MA','PI','RO'] — MT INTEIRO como proxy
 *    declarado de MT-NORTE (sem split municipal na v0). ATENÇÃO: MT também
 *    está em Santos; a dupla contagem é aceita como aproximação v0 e
 *    documentada na metodologia — o refinamento por microrregião (BR-163
 *    norte × sul) entra na v1.
 */
export const HINTERLANDIA: Record<Corredor, readonly string[]> = {
  santos: ["SP", "MG", "GO", "MS", "MT"],
  paranagua: ["PR", "SC"],
  "arco-norte": ["MT", "PA", "TO", "MA", "PI", "RO"],
};

/** @deprecated alias de compatibilidade — usar HINTERLANDIA.santos */
export const HINTERLANDIA_SANTOS = HINTERLANDIA.santos;

/**
 * Participação origem→porto (v4): fração do grão de cada UF que de fato sai
 * por cada corredor. RESOLVE a dupla contagem de MT (estava 100% em Santos E
 * 100% no Arco Norte). O componente S escala a produção de cada UF por esta
 * fração antes de somar — assim cada corredor leva só a parte que escoa por ele.
 *
 * FONTE: Comex Stat/MDIC, exportação 2023-2024, NCM soja (12019000) + milho
 * (10059010), state × URF (porto de despacho). Gerado por
 * scripts/comex/gera-participacao.py (dados brutos em data/comex/). Declarado
 * e versionado (pré-registro). UF ausente → 1,0 (sem escala).
 *   MT: 43% Santos / 52% Arco Norte (≈ split IMEA soja~41% / milho~61% AN).
 */
export const PARTICIPACAO_PORTO: Record<Corredor, Partial<Record<string, number>>> = {
  santos: { SP: 0.81, MG: 0.76, GO: 0.73, MS: 0.14, MT: 0.43 },
  paranagua: { PR: 0.68, SC: 0.17 },
  "arco-norte": { MT: 0.52, PA: 1.0, TO: 0.97, MA: 1.0, PI: 0.96, RO: 1.0 },
};

/** Culturas que entram no componente S (grãos que disputam o line-up). */
export type CulturaS = "SOJA" | "MILHO1" | "MILHO2";

/**
 * Capacidade semanal de embarque de grãos por corredor (mil t/semana).
 *
 * ⚠ PROVISÓRIO: valores declarados por ordem de grandeza ANTAQ até o
 * script scripts/antaq/capacidade-semanal.ts (média móvel 52s de granéis
 * sólidos embarcados, Estatística Aquaviária) popular data/antaq/.
 * REGRA DURA: F e S leem a capacidade DESTE único lugar (ou do cache
 * ANTAQ quando status ok) — nunca duplicar o denominador.
 *  - santos:    ~55–65 mi t/ano de grãos → ≈ 1,3 mi t/semana de pico
 *  - paranagua: ~22–28 mi t/ano (soja+milho+farelo APPA) → ≈ 0,45 mi t/sem
 *  - arco-norte: a série ANTAQ do Tabocal (data/antaq/tonelagem_tabocal_
 *    mensal.csv) registra, em 2025, Itaituba/Miritituba 15,6 Mt + Santarém
 *    8,8 Mt; somando Itaqui (~12 Mt grãos) e Vila do Conde + terminais
 *    (~16 Mt), o corredor agrega ≈ 52 Mt/ano → ≈ 1,0 mi t/semana.
 */
export const CAPACIDADE_SEMANAL_MIL_T: Record<Corredor, number> = {
  santos: 1300,
  paranagua: 450,
  "arco-norte": 1000,
};

/** @deprecated alias de compatibilidade — usar CAPACIDADE_SEMANAL_MIL_T.santos */
export const CAPACIDADE_SEMANAL_SANTOS_MIL_T = CAPACIDADE_SEMANAL_MIL_T.santos;

/**
 * Fator de utilização do NOWCAST de embarque acumulado, por corredor.
 * embarcadoProxy = vazão semanal × semanas desde o início do escoamento × FATOR.
 *
 * Por que NOWCAST e não o embarcado real: a Estatística Aquaviária da ANTAQ
 * (data/antaq/capacidade-semanal.json → serieMensalMilT) traz o embarcado de
 * fato, mas com defasagem de ~3–4 meses (dadosAte fev/2026 enquanto a leitura
 * é de jun/2026). Por isso o S estima o embarcado da safra corrente.
 *
 * v5 (jun/2026): o fator deixa de ser 0,70 chutado e passa a ser a UTILIZAÇÃO
 * REALIZADA dos portos na janela de escoamento (fev–jul), medida na própria EA:
 * média de (embarcado_mensal ÷ média móvel 12m). Gerado por
 * scripts/agro/calibra-utilizacao-embarque.py (saída em utilizacao-embarque.json).
 * O 0,70 subestimava o embarcado → inflava o excedente. SIMPLIFICAÇÃO declarada:
 * fator é plano por corredor (a utilização real varia ~0,7→0,99 ao longo da
 * safra; o perfil sazonal fica para um refinamento futuro).
 */
export const FATOR_UTILIZACAO_EMBARQUE: Record<Corredor, number> = {
  santos: 0.89,
  paranagua: 0.92,
  "arco-norte": 0.87,
};

/**
 * Pilar F de SANTOS (v6) — janela da soma móvel da PRESSÃO DE CHEGADAS.
 *
 * O F de Santos deixa de ser o line-up ao vivo (sem histórico → percentil em
 * calibração, peso baixo) e passa a ser a pressão de chegadas da ANTAQ: o nº de
 * graneleiros de grão que CHEGAM por semana (data/antaq/espera-semanal.json, o
 * campo `n`), agregado numa SOMA MÓVEL desta janela. Chegada é FLUXO de demanda
 * sobre os berços — sinal antecedente da fila — e NÃO usa a TEsperaAtracacao
 * (o alvo), então a previsão F(t)→espera(t+2) é honesta (sem leakage).
 *
 * Janela = 4 semanas: melhor lead vs espera t+2 no backtest
 * (scripts/backtest/iee-f-chegadas.ts — soma-4sem dá Spearman 0,37 na série
 * cheia de 525 sem; a chegada de 1 semana isolada é ruidosa, o backlog se forma
 * ao longo de ~1 mês). É NOWCAST: a EA defasa ~3-4 meses (como o S).
 * Paranaguá/Arco Norte mantêm o F do line-up (não usam esta janela).
 */
export const JANELA_CHEGADAS_F = 4;

// ===========================================================================
// PASSO 4 — Componente T (custo rodoviário MODELADO) · parâmetros de custeio
// ===========================================================================
// T NÃO é frete de mercado nem dado SIFRECA: é o CUSTO operacional de rodar
// a rota, calculado pela engine própria do IBI (lib/custeio-rodoviario.ts)
// com a estrutura clássica das metodologias públicas de custeio rodoviário
// de carga (custos fixos + variáveis por km, capacidade, pedágio — cf.
// referenciais ANTT/literatura). TODOS os coeficientes abaixo são PREMISSAS
// IBI declaradas e versionadas, calibráveis — nenhum copiado de série
// proprietária. Única fonte externa: preço do diesel (ANP, citar no card).

/** Perfis de veículo típicos dos corredores de grão. */
export interface PerfilVeiculo {
  /** rótulo exibível */
  nome: string;
  /** carga útil (t) */
  capacidadeT: number;
  /** consumo carregado (km/L) */
  consumoKmL: number;
  /** nº de eixos (base do pedágio) */
  eixos: number;
  /** nº de pneus do conjunto */
  pneus: number;
}

export const PERFIS_VEICULO: Record<string, PerfilVeiculo> = {
  // Conjunto dominante no eixo Sorriso→Santos (CVC 9 eixos, ~74 t PBTC).
  // Carga útil 48 t (não 50): grão líquido real fica em 45–48 t descontada a
  // tara; 50 era o teto otimista (calibração v2, jun/2026 — ver dossiê).
  rodotrem: { nome: "Rodotrem graneleiro 9 eixos", capacidadeT: 48, consumoKmL: 2.0, eixos: 9, pneus: 34 },
  // Alternativa comum no Sul (7 eixos, ~57 t PBTC). Carga útil 36 t (era 37).
  bitrem: { nome: "Bitrem graneleiro 7 eixos", capacidadeT: 36, consumoKmL: 2.2, eixos: 7, pneus: 26 },
  carreta: { nome: "Carreta graneleira 6 eixos", capacidadeT: 32, consumoKmL: 2.4, eixos: 6, pneus: 22 },
};

/** Perfil de veículo representativo por corredor. */
export const PERFIL_VEICULO_PADRAO: Record<Corredor, keyof typeof PERFIS_VEICULO> = {
  santos: "rodotrem",
  // paranagua: bitrem 7 eixos declarado como perfil típico do corredor Sul
  // (rotas mais curtas e mistas que o eixo BR-163; premissa IBI v0).
  paranagua: "bitrem",
  "arco-norte": "rodotrem",
};

/** Coeficientes de custeio v0 — cada campo é premissa IBI declarada. */
export interface ParametrosCusteio {
  /** R$/L — diesel S10 revenda Brasil (ANP). ÚNICO insumo externo; o valor
   *  corrente vem de data/anp/diesel.json e SOBRESCREVE este default. */
  precoDieselRS: number;
  /** desconto B2B de frota vs preço de bomba ANP (adimensional).
   *  Premissa: grandes frotas abastecem ~12% abaixo da revenda. */
  descontoDieselFrota: number;
  /** R$/pneu — pneu de carga 295/80R22.5, considerando recapagens. */
  custoPneuRS: number;
  /** km — vida útil efetiva do pneu (com 2 recapagens). */
  vidaUtilPneuKm: number;
  /** R$/km — lubrificantes e filtros. */
  lubrificanteRSporKm: number;
  /** R$/km — manutenção (peças + oficina) por km rodado. */
  manutencaoRSporKm: number;
  /** R$/mês — custos fixos do conjunto: depreciação + remuneração de capital
   *  + motorista (salário/encargos) + seguro + licenciamento. */
  custoFixoMensalRS: number;
  /** km/mês — rodagem média mensal do conjunto (rateia o custo fixo). */
  kmRodadoMes: number;
  /** R$/km/eixo — pedágio médio do corredor por km e por eixo
   *  (média das praças das rotas Centro-Oeste→Santos rateada pela distância). */
  pedagioRSporKmPorEixo: number;
  /** fração de km de retorno rodado vazio, rateada na viagem carregada.
   *  Premissa: corredores de grão têm retorno parcial com fertilizante. */
  fracaoRetornoVazio: number;
  /** custo variável relativo do km vazio vs carregado (consome menos). */
  custoRelativoKmVazio: number;
}

// Calibração v1 (jun/2026) — ver docs/calibracao-T-frete.md (dossiê com fontes
// primárias ANTT/ANP/SIFRECA e triangulação: modelo IBI ≈ piso ANTT < frete de
// mercado). Só os coeficientes com fonte dura foram alterados; o resto segue
// premissa declarada IBI (julgamento), dentro da faixa validada no dossiê.
export const PARAMETROS_CUSTEIO_V0: ParametrosCusteio = {
  // default usado só se data/anp/diesel.json faltar — runtime usa ANP ao vivo.
  // Atualizado 6,10 → 7,00: o 6,10 era o nível de jan/2026 (defasado); ANP
  // revenda S10 nacional rodava ~R$ 7,1/L em jun/2026 (Síntese Semanal Ed. 24).
  precoDieselRS: 7.0,
  // validado contra ANP: distribuição/revenda S10 = 6,29/7,11 ≈ 0,885 (jun/2026).
  descontoDieselFrota: 0.88,
  custoPneuRS: 3400,
  vidaUtilPneuKm: 160_000,
  lubrificanteRSporKm: 0.06,
  manutencaoRSporKm: 0.75, // método NTC (PM≈1% do ativo/mês ÷ km/mês) ⇒ ~0,67–0,75
  custoFixoMensalRS: 32_000,
  kmRodadoMes: 12_000,
  // 0,07 → 0,05: o 0,07 é o teto BR-163/MT (praça a cada ~100 km × ~R$7/eixo);
  // aplicado uniformemente a TODA a distância superestima (há trechos sem
  // pedágio). 0,05 = média de rede declarada. Fonte: Nova Rota do Oeste 2026.
  pedagioRSporKmPorEixo: 0.05,
  fracaoRetornoVazio: 0.35,
  custoRelativoKmVazio: 0.7,
};

/** Rotas representativas do T com distância rodoviária (km).
 *  Distâncias: medição declarada sobre a malha rodoviária federal
 *  (BR-163/SP-348 etc.), arredondadas — fonte: malha viária pública. */
export interface RotaT { rota: string; distanciaKm: number; peso: number }

/** v0: peso por relevância de volume declarado (Sorriso domina o fluxo MT→Santos).
 *  Simplificação comentada: na v1, pesar por volume embarcado real por origem. */
export const ROTAS_T: Record<Corredor, RotaT[]> = {
  santos: [
    { rota: "Sorriso (MT) → Santos (SP)", distanciaKm: 2100, peso: 0.6 },
    { rota: "Rio Verde (GO) → Santos (SP)", distanciaKm: 1010, peso: 0.4 },
  ],
  // Distâncias rodoviárias aproximadas — "distância declarada IBI v0,
  // verificar contra malha ANTT antes da publicação". Pesos v0 por
  // relevância de volume declarada (oeste do PR domina o fluxo).
  paranagua: [
    { rota: "Cascavel (PR) → Paranaguá (PR)", distanciaKm: 490, peso: 0.4 },
    { rota: "Maringá (PR) → Paranaguá (PR)", distanciaKm: 480, peso: 0.25 },
    { rota: "Ponta Grossa (PR) → Paranaguá (PR)", distanciaKm: 140, peso: 0.2 },
    { rota: "Londrina (PR) → Paranaguá (PR)", distanciaKm: 430, peso: 0.15 },
  ],
  // Distâncias rodoviárias aproximadas — "distância declarada IBI v0,
  // verificar contra malha ANTT antes da publicação". Pesos por relevância
  // de volume declarada (BR-163 → Miritituba domina o fluxo do corredor).
  "arco-norte": [
    { rota: "Sorriso (MT) → Miritituba (PA)", distanciaKm: 1100, peso: 0.5 },
    { rota: "Sorriso (MT) → Itaqui (MA)", distanciaKm: 2100, peso: 0.15 },
    { rota: "Palmas (TO) → Itaqui (MA)", distanciaKm: 1300, peso: 0.15 },
    { rota: "Imperatriz (MA) → Itaqui (MA)", distanciaKm: 630, peso: 0.2 },
  ],
};

// ===========================================================================
// PASSO 6 — Componente H (hidrologia) e Colisão Safra × Calado · Arco Norte
// ===========================================================================
// REGRA DURA: nenhuma constante de calado é redeclarada aqui — GATILHO_TABOCAL_M
// vive em lib/recessao-itacoatiara.ts e o calado-alvo 11 m é o default das
// próprias funções de lib/cmr-itacoatiara.ts / recessao-itacoatiara.ts.

/** Portos agregados do corredor Arco Norte. Pesos IGUAIS na v0 (julgamento
 *  declarado; na v1, pesar pela tonelagem ANTAQ de cada complexo). */
export const PORTOS_ARCO_NORTE = ["itaqui", "vila-do-conde", "santarem"] as const;

/** Horizonte (dias) em que a proximidade do cruzamento de calado satura a
 *  urgência: dias=0 → urgência 100; dias ≥ 90 → urgência 0. Julgamento v0. */
export const URGENCIA_CALADO_DIAS_MAX = 90;

/** Pesos internos do P_H — julgamento v0, declarado para escrutínio:
 *  60% IRC-Tabocal (estado de risco do canal, v3.6 operacional) +
 *  40% urgência de calado (proximidade temporal do CMR < alvo). */
export const PESOS_H_INTERNO = { ircTabocal: 0.6, urgenciaCalado: 0.4 } as const;

/** Zona de colisão: embarque programado acima desta fração da capacidade
 *  semanal E cruzamento de calado a < 30 dias. Julgamento v0. */
export const THRESHOLD_COLISAO_PCT = 0.8;
