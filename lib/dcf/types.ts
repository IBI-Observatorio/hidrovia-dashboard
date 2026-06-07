// Tipos do motor DCF + Reference-Class Forecasting do Radar de Maturação.
// Espelha o modelo de dados do Build Brief (§5). Todo número exibível na UI
// carrega `source` (citável) ou `modeled: true` (saída de modelo / ilustrativo).

export type SourceTag = { label: string; url?: string; date?: string };

/** Número rastreável: valor + unidade + procedência (fonte OU modelado). */
export type Num = {
  value: number;
  unit: string;
  source?: SourceTag;
  modeled?: boolean;
};

/** Aceita Num ou number cru e devolve o número. */
export function numVal(n: Num | number): number {
  return typeof n === "number" ? n : n.value;
}

/** Ponto da curva oficial de demanda (Mt por ano-calendário). */
export interface DemandaPonto {
  ano: number;
  mt: number;
}

/** Tranche de aporte público (R$ bi num ano-calendário). */
export interface AportePonto {
  ano: number;
  valor: number; // R$ bilhões
}

/**
 * Premissas de modelagem do ativo. Escalares vêm como `Num` no seed (para
 * carregar fonte/flag), e são convertidos para number puro por `paramsFromAsset`.
 */
export interface ModelingParams {
  anoBase: number;        // ano-calendário do t=0 (início da concessão)
  prazoAnos: number;      // duração da concessão
  obraAnos: number;       // anos de implantação antes da operação
  rampaAnos: number;      // anos de rampa de demanda pós-obra
  rampaInicial: number;   // fração da curva no 1º ano de operação (0–1)
  extensaoKm: number;     // extensão física da ferrovia
  distTarifavelKm: number;// distância média tarifável (TKU)
  capexImplant: number;   // R$ bi — implantação
  capexRecorr: number;    // R$ bi — recorrente/manutenção ao longo da concessão
  capacidadeMt: number;   // teto físico de transporte (Mt/ano)
  demandaCurva: DemandaPonto[];
  tarifaTKU: number;      // R$/TKU (ex.: 0,11005 = R$ 110,05/mil TKU)
  opexPctReceita: number; // operating ratio (O&M como fração da receita)
  aliquotaImposto: number;// IRPJ+CSLL sobre o lucro tributável (ex.: 0,34)
  depreciacaoAnos: number;// anos de depreciação linear do CAPEX de implantação
  aportePublico: AportePonto[];
  wacc: number;           // custo de capital (ex.: 0,1104)
}

/**
 * Alavancas de cenário aplicadas sobre as premissas. Neutras = cenário oficial
 * sem correção. As alavancas RCF (uplift/haircut/slip) deslocam o caso realista.
 */
export interface Levers {
  tarifaMult: number;     // multiplicador da tarifa (calibração do oficial)
  capexUplift: number;    // multiplicador do CAPEX (viés de otimismo, classe de ref.)
  demandaHaircut: number; // multiplicador da demanda (1 = sem haircut)
  slipAnos: number;       // atraso (anos) no início da operação
  omAdjPp: number;        // ajuste aditivo no O&M (pontos da fração de receita)
}

export const LEVERS_NEUTROS: Levers = {
  tarifaMult: 1,
  capexUplift: 1,
  demandaHaircut: 1,
  slipAnos: 0,
  omAdjPp: 0,
};

/** Linha anual do fluxo de caixa. Valores em R$ bilhões. */
export interface CashflowRow {
  ano: number;
  t: number;
  demandaMt: number;
  receita: number;
  opex: number;        // O&M
  capexImpl: number;   // implantação
  capexRecorr: number; // recorrente
  depreciacao: number; // escudo fiscal (não-caixa)
  imposto: number;     // IRPJ+CSLL pago
  aporte: number;
  fcl: number;         // fluxo de caixa livre (já líquido de imposto)
}

export interface CashflowResult {
  rows: CashflowRow[];
  fcl: number[];       // série de FCL para a TIR (R$ bi)
  anos: number[];
}

/** Resultado de um cenário avaliado. */
export interface ScenarioResult {
  id: "oficial" | "tcu" | "realista" | "custom";
  label: string;
  levers: Levers;
  tir: number;          // taxa interna de retorno
  spread: number;       // tir − wacc
  vpl: number;          // VPL ao WACC (R$ bi)
  cashflow: CashflowResult;
}

/** Entrada da classe de referência ferroviária (sobrecusto histórico). */
export interface ReferenceClassEntry {
  projeto: string;
  sobrecustoPct: number; // ex.: 0,45 = +45%
  fonte: SourceTag;
}

export type GateStatus = "na" | "resolvido" | "em-curso" | "atencao" | "risco";

export interface RiskVector {
  stf: GateStatus;
  tcu: GateStatus;
  ambiental: GateStatus;
  concessionaria: GateStatus;
  modelagem: GateStatus;
  notes: Record<string, string>;
}

export interface Prediction {
  date: string;
  metric: "janela" | "pleilao" | "tir";
  value: string | number;
  realized?: string | number;
}

/** Seed de um ativo (data/assets/<id>.json). */
export interface Asset {
  id: "ef-170" | "fico-fiol" | "ef-118" | "ef-151-norte";
  name: string;
  sub: string;
  route: string;
  arcoNorte?: boolean;
  params: Record<string, Num | number | DemandaPonto[] | AportePonto[]>;
  referenceClass: ReferenceClassEntry[];
  risk?: RiskVector;
  predictions?: Prediction[];
  funding?: {
    aporteNecessario: Num;
    coberturaCruzada: { fonte: string; valor: Num }[];
    deficit: Num;
  };
  scenariosMeta?: Record<string, { label: string; nota?: string }>;
}
