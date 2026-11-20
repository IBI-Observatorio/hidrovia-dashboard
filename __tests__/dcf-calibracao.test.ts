import { describe, it, expect } from "vitest";
import ef170 from "@/data/assets/ef-170.json";
import type { Asset } from "@/lib/dcf/types";
import { paramsFromAsset, buildCashflow } from "@/lib/dcf/cashflow";
import { LEVERS_NEUTROS } from "@/lib/dcf/types";
import {
  calibrarOficial,
  calibrarRealista,
  slipRealista,
  upliftMedianoDaClasse,
  TIR_REALISTA_ALVO,
} from "@/lib/dcf/referenceClass";
import { runMonteCarlo } from "@/lib/dcf/montecarlo";
import { analisarAtivo } from "@/lib/dcf";
import { tirCenario } from "@/lib/dcf/cashflow";
import { numVal } from "@/lib/dcf/types";

const asset = ef170 as unknown as Asset;
const params = paramsFromAsset(asset);
const slip = slipRealista(asset, params.obraAnos);
const calibrarRe = () => calibrarRealista(params, calibrarOficial(params).levers, { slipAnos: slip });
const tirDeclarada = numVal(asset.oficialAnchor!.tir!);

describe("calibração ancorada nas fontes (nova modelagem set/2026 + Frischtak)", () => {
  it("WACC do seed = 14,08% (nova modelagem; fonte de imprensa, rotulada como tal)", () => {
    expect(params.wacc).toBeCloseTo(0.1408, 4);
    expect(asset.params.wacc).toMatchObject({ source: { label: expect.stringMatching(/^Imprensa/) } });
  });

  it("modelagem sem aporte: calendário de aporte vazio e âncora de aporte = 0 com fonte", () => {
    expect(params.aportePublico).toEqual([]);
    expect(numVal(asset.oficialAnchor!.aporte!)).toBe(0);
    expect(asset.oficialAnchor!.aporte!.source?.label).toMatch(/Deliberação ANTT nº 275\/2026/);
    // o furo de funding (aporte cruzado) deixou de existir com a exclusão do aporte
    expect(asset.funding).toBeUndefined();
  });

  it("TIR declarada pelo governo = 11,28% (imprensa), abaixo do WACC por escolha", () => {
    expect(tirDeclarada).toBeCloseTo(0.1128, 4);
    expect(asset.oficialAnchor!.tir!.source?.label).toMatch(/^Imprensa/);
    expect(tirDeclarada).toBeLessThan(params.wacc);
  });

  it("Oficial do motor: TIR EMERGE dos inputs (sem botão de fechamento) e fica abaixo da declarada", () => {
    const { tir, levers, operatingRatio } = calibrarOficial(params);
    expect(levers.tarifaMult).toBe(1);   // tarifa-teto oficial
    expect(levers.omAdjPp).toBe(0);      // nenhum ajuste de fechamento
    // operating ratio dentro da faixa crível de ferrovia heavy-haul
    expect(operatingRatio).toBeGreaterThanOrEqual(0.55);
    expect(operatingRatio).toBeLessThanOrEqual(0.78);
    // duas leituras: motor < declarada < WACC
    expect(tir).toBeLessThan(tirDeclarada);
    expect(tir).toBeGreaterThan(0);
  });

  it("nem o piso crível do operating ratio (55%) leva o motor à TIR declarada", () => {
    const omAdjPp = 0.55 - params.opexPctReceita;
    expect(tirCenario(params, { ...LEVERS_NEUTROS, omAdjPp })).toBeLessThan(tirDeclarada);
  });

  it("analisarAtivo expõe a TIR declarada ao lado da TIR do motor", () => {
    const an = analisarAtivo(asset, { mcN: 500, seed: 42 });
    expect(an.tirDeclarada).toBeCloseTo(0.1128, 4);
    expect(an.oficial.tir).toBeLessThan(an.tirDeclarada!);
    expect(an.wacc).toBeCloseTo(0.1408, 4);
  });

  it("o cashflow cobra imposto (IRPJ+CSLL 34%) com depreciação como escudo", () => {
    expect(params.aliquotaImposto).toBeCloseTo(0.34, 2);
    const { rows } = buildCashflow(params, LEVERS_NEUTROS);
    const opLeno = rows.find((r) => r.receita > 0 && r.t > params.obraAnos + 5)!;
    expect(opLeno.imposto).toBeGreaterThan(0);   // paga imposto em operação
    const comDeprec = rows.find((r) => r.depreciacao > 0)!;
    expect(comDeprec.depreciacao).toBeGreaterThan(0); // escudo fiscal ativo
    // imposto efetivo < alíquota nominal × receita (graças a O&M + depreciação)
    expect(opLeno.imposto).toBeLessThan(opLeno.receita * params.aliquotaImposto);
  });

  it("Realista: TIR 1,6% EMERGE da COMBINAÇÃO de alavancas (não de uma só)", () => {
    const re = calibrarRe();
    expect(re.tir).toBeCloseTo(TIR_REALISTA_ALVO, 3);
    expect(TIR_REALISTA_ALVO).toBe(0.016);
    // três alavancas ativas simultaneamente:
    expect(re.capexUplift).toBeCloseTo(upliftMedianoDaClasse(), 3); // CAPEX = classe ref.
    expect(re.slipAnos).toBeGreaterThan(0);                          // slip de cronograma
    expect(re.demandaHaircut).toBeLessThan(1);                       // haircut residual
    expect(re.demandaHaircut).toBeGreaterThanOrEqual(0.3);          // dentro do piso
    // e NÃO mais um CAPEX inflado isolado (+179%): o uplift fica na classe (~1,46)
    expect(re.capexUplift).toBeLessThan(2);
  });

  it("uplift do realista fica a ±10pp da mediana da classe de referência", () => {
    const re = calibrarRe();
    const classe = upliftMedianoDaClasse();
    expect(Math.abs(re.capexUplift - classe)).toBeLessThanOrEqual(0.10);
    // slip lido do seed: execução realista (22) − obra (9)
    expect(re.slipAnos).toBe(22 - 9);
  });

  it("slip do realista = execução realista − obra (sourced no seed)", () => {
    expect(slip).toBe(22 - params.obraAnos);
  });

  it("retorno realista ~7× abaixo da TIR declarada (11,28% / 1,6%) e abaixo do motor", () => {
    const cof = calibrarOficial(params);
    const re = calibrarRe();
    expect(re.tir).toBeLessThan(cof.tir);
    expect(tirDeclarada / re.tir).toBeGreaterThan(5); // ordem de grandeza do "7×"
  });
});

describe("Monte Carlo (Build Brief §4.4)", () => {
  it("é reprodutível: mesma seed ⇒ mesmo resultado", () => {
    const cof = calibrarOficial(params);
    const a = runMonteCarlo(params, cof.levers, 2000, 42);
    const b = runMonteCarlo(params, cof.levers, 2000, 42);
    expect(a.tirMediana).toBe(b.tirMediana);
    expect(a.pSpreadNeg).toBe(b.pSpreadNeg);
  });

  it("seeds diferentes ⇒ resultados diferentes", () => {
    const cof = calibrarOficial(params);
    const a = runMonteCarlo(params, cof.levers, 2000, 1);
    const b = runMonteCarlo(params, cof.levers, 2000, 2);
    expect(a.tirMedia).not.toBe(b.tirMedia);
  });

  it("P(spread<0) está em [0,1] com IC coerente", () => {
    const cof = calibrarOficial(params);
    const mc = runMonteCarlo(params, cof.levers, 3000, 42);
    expect(mc.pSpreadNeg).toBeGreaterThanOrEqual(0);
    expect(mc.pSpreadNeg).toBeLessThanOrEqual(1);
    expect(mc.pSpreadNegIC[0]).toBeLessThanOrEqual(mc.pSpreadNeg);
    expect(mc.pSpreadNegIC[1]).toBeGreaterThanOrEqual(mc.pSpreadNeg);
  });

  it("tarifa-teto oficial preservada ≈ R$110,05/mil TKU", () => {
    const tarifa = params.tarifaTKU * 1000;
    expect(tarifa).toBeCloseTo(110.05, 2);
  });

  it("Monte Carlo sem aporte: P5 cobre o realista; a TIR declarada fica ACIMA do P95", () => {
    const cof = calibrarOficial(params);
    const re = calibrarRe();
    const mc = runMonteCarlo(params, cof.levers, 4000, 42);
    expect(mc.tirP5).toBeLessThanOrEqual(re.tir);
    // a TIR declarada (11,28%) está fora da faixa P5–P95 do motor: é o achado
    expect(mc.tirP95).toBeLessThan(tirDeclarada);
    // e com WACC 14,08% praticamente nenhum draw fecha a estrutura
    expect(mc.pSpreadNeg).toBeGreaterThan(0.99);
    // cobertura NÃO-degenerada: P5 não colapsou em −100% (sem-TIR em massa)
    expect(mc.tirP5).toBeGreaterThan(-0.5);
  });
});
