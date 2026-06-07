// Construção do fluxo de caixa anual da concessão (Build Brief §4.1).
//
//   Receita(t)    = Demanda(t)[Mt]·1e6 · DistTarifável[km] · Tarifa[R$/TKU]
//   OpEx(t)       = O&M (% receita) + CAPEX recorrente(t)
//   CapEx_impl(t) = cronograma de implantação (anos de obra)
//   Aporte(t)     = inflow de aporte público (calendário fixo)
//   FCL(t)        = Receita − O&M − CapEx_impl − CapEx_recorr + Aporte
//   VPL           = Σ FCL(t)/(1+WACC)^t   ;   TIR = taxa onde VPL = 0
//
// Convenção de unidades: tudo em R$ BILHÕES. A tarifa é R$/TKU; a receita em
// R$/ano é convertida para bi dividindo por 1e9.

import {
  type ModelingParams,
  type Levers,
  type CashflowResult,
  type CashflowRow,
  type Asset,
  type Num,
  type DemandaPonto,
  type AportePonto,
  LEVERS_NEUTROS,
  numVal,
} from "./types";
import { npv, irr } from "./irr";

/** Interpola/extrapola (flat nas pontas) a curva oficial de demanda para um ano. */
export function demandaNoAno(curva: DemandaPonto[], ano: number): number {
  const pts = [...curva].sort((a, b) => a.ano - b.ano);
  if (ano <= pts[0].ano) return pts[0].mt;
  if (ano >= pts[pts.length - 1].ano) return pts[pts.length - 1].mt;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (ano >= a.ano && ano <= b.ano) {
      const frac = (ano - a.ano) / (b.ano - a.ano);
      return a.mt + frac * (b.mt - a.mt);
    }
  }
  return pts[pts.length - 1].mt;
}

/** Perfil de desembolso da implantação ao longo dos anos de obra (soma = 1). */
function perfilObra(obraAnos: number): number[] {
  // Curva em S simplificada: pico no meio da obra.
  const base = Array.from({ length: obraAnos }, (_, i) => {
    const x = (i + 0.5) / obraAnos; // centro de cada ano
    return Math.exp(-Math.pow((x - 0.5) / 0.28, 2)); // gaussiana centrada
  });
  const soma = base.reduce((a, b) => a + b, 0);
  return base.map((v) => v / soma);
}

/**
 * Monta o fluxo de caixa anual de um cenário (premissas + alavancas).
 * Retorna as linhas detalhadas e a série de FCL (R$ bi) para a TIR.
 */
export function buildCashflow(
  params: ModelingParams,
  levers: Levers = LEVERS_NEUTROS,
): CashflowResult {
  const {
    anoBase,
    prazoAnos,
    obraAnos,
    rampaAnos,
    rampaInicial,
    distTarifavelKm,
    capexImplant,
    capexRecorr,
    capacidadeMt,
    demandaCurva,
    tarifaTKU,
    opexPctReceita,
    aliquotaImposto,
    depreciacaoAnos,
    aportePublico,
  } = params;

  const tarifa = tarifaTKU * levers.tarifaMult;
  const opexPct = opexPctReceita + levers.omAdjPp;
  const capImplTotal = capexImplant * levers.capexUplift;
  const capRecorrTotal = capexRecorr * levers.capexUplift;

  // Operação começa após a obra + slip de cronograma.
  const opStart = obraAnos + Math.round(levers.slipAnos); // índice t do 1º ano de operação
  const opAnos = Math.max(1, prazoAnos - opStart);

  const perfil = perfilObra(obraAnos);
  const capRecorrAno = capRecorrTotal / opAnos; // recorrente diluído na operação
  const deprecAno = capImplTotal / Math.max(1, depreciacaoAnos); // depreciação linear

  const rows: CashflowRow[] = [];
  const fcl: number[] = [];
  const anos: number[] = [];
  let nol = 0; // prejuízo fiscal acumulado (NOL)

  for (let t = 0; t < prazoAnos; t++) {
    const ano = anoBase + t;

    // CAPEX de implantação segue o calendário de obra (não desliza com o slip).
    const capexImpl = t < obraAnos ? capImplTotal * perfil[t] : 0;

    // Aporte público (subvenção de investimento — NÃO entra na base tributável).
    const aporte = aportePublico
      .filter((a) => a.ano === ano)
      .reduce((s, a) => s + a.valor, 0);

    // Demanda realizada (0 durante obra; rampa pós-início; teto de capacidade).
    let demandaMt = 0;
    let receita = 0;
    let opex = 0;
    let capexRec = 0;
    if (t >= opStart) {
      const anosOperando = t - opStart;
      const rampa =
        anosOperando >= rampaAnos
          ? 1
          : rampaInicial + (1 - rampaInicial) * (anosOperando / rampaAnos);
      const curva = demandaNoAno(demandaCurva, ano) * levers.demandaHaircut;
      demandaMt = Math.min(curva * rampa, capacidadeMt);
      // Receita em R$ bi: Mt·1e6 t · km · R$/TKU / 1e9
      receita = (demandaMt * 1e6 * distTarifavelKm * tarifa) / 1e9;
      opex = receita * opexPct;
      capexRec = capRecorrAno;
    }

    // Depreciação do CAPEX de implantação só durante a janela, em operação.
    const depreciacao =
      t >= opStart && t < opStart + depreciacaoAnos ? deprecAno : 0;

    // Imposto (IRPJ+CSLL) sobre o lucro tributável, com compensação de prejuízo
    // limitada a 30% do lucro do exercício (trava brasileira).
    const lucroTrib = receita - opex - capexRec - depreciacao;
    let imposto = 0;
    if (lucroTrib > 0) {
      const compensavel = Math.min(nol, lucroTrib * 0.3);
      imposto = (lucroTrib - compensavel) * aliquotaImposto;
      nol -= compensavel;
    } else {
      nol += -lucroTrib;
    }

    const flujo = receita - opex - capexImpl - capexRec + aporte - imposto;
    rows.push({
      ano,
      t,
      demandaMt,
      receita,
      opex,
      capexImpl,
      capexRecorr: capexRec,
      depreciacao,
      imposto,
      aporte,
      fcl: flujo,
    });
    fcl.push(flujo);
    anos.push(ano);
  }

  return { rows, fcl, anos };
}

/** TIR de um cenário. */
export function tirCenario(params: ModelingParams, levers: Levers): number {
  const { fcl } = buildCashflow(params, levers);
  return irr(fcl, 0.1);
}

/** VPL de um cenário descontado ao WACC (R$ bi). */
export function vplCenario(params: ModelingParams, levers: Levers): number {
  const { fcl } = buildCashflow(params, levers);
  return npv(params.wacc, fcl);
}

/**
 * Extrai `ModelingParams` (números puros) de um seed `Asset`. Aceita escalares
 * como `Num` (com fonte) ou number cru; mantém as curvas/cronogramas como arrays.
 */
export function paramsFromAsset(asset: Asset): ModelingParams {
  const p = asset.params;
  const n = (k: string): number => numVal(p[k] as Num | number);
  return {
    anoBase: n("anoBase"),
    prazoAnos: n("prazoAnos"),
    obraAnos: n("obraAnos"),
    rampaAnos: n("rampaAnos"),
    rampaInicial: n("rampaInicial"),
    extensaoKm: n("extensaoKm"),
    distTarifavelKm: n("distTarifavelKm"),
    capexImplant: n("capexImplant"),
    capexRecorr: n("capexRecorr"),
    capacidadeMt: n("capacidadeMt"),
    demandaCurva: p.demandaCurva as DemandaPonto[],
    tarifaTKU: n("tarifaTKU"),
    opexPctReceita: n("opexPctReceita"),
    aliquotaImposto: n("aliquotaImposto"),
    depreciacaoAnos: n("depreciacaoAnos"),
    aportePublico: p.aportePublico as AportePonto[],
    wacc: n("wacc"),
  };
}
