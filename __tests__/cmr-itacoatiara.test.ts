import { describe, it, expect } from "vitest";
import {
  cmrDeItacoatiara,
  deficitCalado,
  reducaoCargaToneladas,
  scoreCMR,
  CMR_OBSERVADO,
} from "@/lib/cmr-itacoatiara";

describe("CMR Itacoatiara — curva oficial da Capitania", () => {
  it("metadados documentam fonte e período", () => {
    expect(CMR_OBSERVADO.fonte).toContain("Capitania");
    expect(CMR_OBSERVADO.n_obs).toBe(187);
  });

  it("CMR satura em ~5,72m no piso histórico (ITA ≈ 0m)", () => {
    expect(cmrDeItacoatiara(0)).toBeCloseTo(5.72, 1);
  });

  it("CMR em ITA = -0,17m (mínima histórica 2024) ≈ 5,73m", () => {
    expect(cmrDeItacoatiara(-0.17)).toBeCloseTo(5.73, 1);
  });

  it("CMR em ITA = 5m → ~10,4m (curva isotônica corrige outlier do bin)", () => {
    // Versão PAV (v3.4): o bin [5,40 → 5,50] tinha inversão grande (11,37→10,13)
    // que a regressão isotônica suavizou para ~10,4m. Mais defensível.
    const cmr = cmrDeItacoatiara(5.0);
    expect(cmr).toBeGreaterThanOrEqual(10.0);
    expect(cmr).toBeLessThanOrEqual(11.0);
  });

  it("CMR em ITA = 6,3m → ≈ 11m (cruzamento do alvo)", () => {
    const cmr = cmrDeItacoatiara(6.3);
    expect(cmr).toBeGreaterThanOrEqual(10.7);
    expect(cmr).toBeLessThanOrEqual(11.3);
  });

  it("CMR em cheia (ITA ≥ 7m) → próximo de 12m", () => {
    expect(cmrDeItacoatiara(7.5)).toBeGreaterThanOrEqual(12.0);
  });

  it("CMR é monotonicamente crescente em ITA (com tolerância para ruído na curva)", () => {
    const valores = [0, 1, 2, 3, 4, 5, 6, 7];
    const cmrs = valores.map(cmrDeItacoatiara);
    for (let i = 1; i < cmrs.length; i++) {
      expect(cmrs[i]).toBeGreaterThan(cmrs[i - 1] - 0.5);   // tolerância
    }
  });

  it("CMR satura no piso para extrapolação abaixo do mínimo observado", () => {
    expect(cmrDeItacoatiara(-1.0)).toBe(CMR_OBSERVADO.cmr_min);
    expect(cmrDeItacoatiara(-5.0)).toBe(CMR_OBSERVADO.cmr_min);
  });
});

describe("Déficit de calado (vs alvo 11m)", () => {
  it("déficit ≈ 5,28m na mínima histórica (CMR = 5,72m)", () => {
    expect(deficitCalado(0, 11)).toBeCloseTo(5.28, 1);
  });

  it("déficit = 0 quando CMR ≥ calado alvo", () => {
    expect(deficitCalado(7.5, 11)).toBe(0);
  });

  it("calado alvo customizado funciona", () => {
    // Comboios menores: alvo 8m
    expect(deficitCalado(2, 8)).toBeCloseTo(0, 1);   // CMR em ITA=2 ≈ 8,12 ≥ 8
  });
});

describe("Redução de carga em toneladas (impacto comercial)", () => {
  it("mega-seca 2024: ~190.000 toneladas perdidas por comboio", () => {
    const ton = reducaoCargaToneladas(0);
    // Déficit 5.28m × 1500 ton/m × 24 balsas ≈ 190.080 ton
    expect(ton).toBeGreaterThanOrEqual(180_000);
    expect(ton).toBeLessThanOrEqual(200_000);
  });

  it("sistema saudável: zero perda", () => {
    expect(reducaoCargaToneladas(8)).toBe(0);
  });
});

describe("scoreCMR (componente 0-100 do IRC)", () => {
  it("score = 0 quando calado ≥ alvo", () => {
    expect(scoreCMR(7.5)).toBe(0);
  });

  it("score ≥ 95 na mega-seca (déficit ~5,28m, próximo da saturação)", () => {
    expect(scoreCMR(0)).toBeGreaterThanOrEqual(95);
  });

  it("score satura em ~98 com cota muito abaixo do mínimo (CMR piso = 5,63m)", () => {
    // A curva oficial nunca registrou CMR < 5,63m. Saturação real é 97-98.
    expect(scoreCMR(-2.0)).toBeGreaterThanOrEqual(95);
    expect(scoreCMR(-2.0)).toBeLessThanOrEqual(100);
  });

  it("score crescente conforme cota desce", () => {
    expect(scoreCMR(0)).toBeGreaterThan(scoreCMR(2));
    expect(scoreCMR(2)).toBeGreaterThan(scoreCMR(4));
    expect(scoreCMR(4)).toBeGreaterThan(scoreCMR(6));
  });

  it("score em ITA=2 (CMR ~8,12, déficit ~2,9m) → faixa intermediária", () => {
    const s = scoreCMR(2);
    expect(s).toBeGreaterThan(40);
    expect(s).toBeLessThan(80);
  });
});
