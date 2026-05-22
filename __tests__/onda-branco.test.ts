import { describe, it, expect } from "vitest";
import { detectaOndaBranco } from "@/lib/onda-branco";

describe("detectaOndaBranco", () => {
  it("classifica ALTA com +2,5m em 7d em maio (P85_mai=2,18, P95_mai=3,16)", () => {
    // v2: cenário boletim 20° SGB. Com calibração mensal, 2.5m em maio fica
    // ENTRE P85 e P95 — "alta", não mais inflado como "extrema".
    const serie = [
      { data: "2026-05-12", cota_m: 2.50 },
      { data: "2026-05-13", cota_m: 2.85 },
      { data: "2026-05-14", cota_m: 3.20 },
      { data: "2026-05-15", cota_m: 3.55 },
      { data: "2026-05-16", cota_m: 3.90 },
      { data: "2026-05-17", cota_m: 4.30 },
      { data: "2026-05-18", cota_m: 4.70 },
      { data: "2026-05-19", cota_m: 5.00 },
    ];
    const r = detectaOndaBranco(serie, 7);
    expect(r.disparado).toBe(true);
    expect(r.severidade).toBe("alta");
    expect(r.var_total_m).toBeCloseTo(2.5, 1);
    expect(r.p85_mes).toBe(2.18);
    expect(r.p95_mes).toBe(3.16);
    // v2.1: lag global calibrado = 20 dias (correlação anti-sazonal)
    expect(r.eta_manaus_dias).toBe(20);
  });

  it("classifica EXTREMA com +1,5m em outubro (P85_out=1,14, P95_out=1,37)", () => {
    // v2: mesma magnitude (1.5m) é "extrema" em outubro (estiagem, subida rara)
    // mas seria só "alta" em maio (cheia, subidas frequentes). Sazonalidade.
    const serie = Array.from({ length: 8 }, (_, i) => ({
      data: `2025-10-${String(i + 1).padStart(2, "0")}`,
      cota_m: 0.5 + i * 0.215,        // +0.215m/dia ~ 1.50m total
    }));
    const r = detectaOndaBranco(serie, 7);
    expect(r.disparado).toBe(true);
    expect(r.severidade).toBe("extrema");
  });

  it("não dispara em variação leve (~0,3m em 7d)", () => {
    const serie = Array.from({ length: 8 }, (_, i) => ({
      data: `2025-01-${String(i + 1).padStart(2, "0")}`,
      cota_m: 1.0 + i * 0.04,        // +0.04m/dia ~ 0.28m total
    }));
    const r = detectaOndaBranco(serie, 7);
    expect(r.disparado).toBe(false);
    expect(r.severidade).toBe("nenhuma");
  });

  it("severidade contínua sem cliff edge: var ligeiramente abaixo de P85 ainda dá score próximo de 65", () => {
    // v2: severidade_continua é função contínua. 2.0m em maio (P85=2.18) está
    // 92% do caminho até P85, deve estar próximo de 65 (faixa "alta")
    const serie = Array.from({ length: 8 }, (_, i) => ({
      data: `2025-05-${String(i + 1).padStart(2, "0")}`,
      cota_m: 1.0 + i * 0.286,       // 2.0m total
    }));
    const r = detectaOndaBranco(serie, 7);
    expect(r.severidade_continua).toBeGreaterThan(50);
    expect(r.severidade_continua).toBeLessThan(70);
  });

  it("v2.1: lag MAIS LONGO quando Driver Norte (canal Negro fragmentado)", () => {
    // Calibração anti-sazonal inverteu a intuição inicial: Negro baixo = canal
    // fragmentado precisa preencher antes → propagação MAIS LENTA.
    const serie = Array.from({ length: 8 }, (_, i) => ({
      data: `2026-05-${String(i + 12).padStart(2, "0")}`,
      cota_m: 2.5 + i * 0.4,
    }));
    const r = detectaOndaBranco(serie, 7, /*idn Driver Norte*/ +0.5);
    expect(r.eta_manaus_dias).toBeGreaterThan(20);    // mais lento que global
  });

  it("v2.1: lag MAIS CURTO quando Driver Sul (canal Negro contíguo)", () => {
    // Negro alto = coluna d'água contígua → pulso de pressão rápido.
    const serie = Array.from({ length: 8 }, (_, i) => ({
      data: `2024-05-${String(i + 12).padStart(2, "0")}`,
      cota_m: 2.5 + i * 0.4,
    }));
    const r = detectaOndaBranco(serie, 7, /*idn Driver Sul*/ -0.5);
    expect(r.eta_manaus_dias).toBeLessThan(20);       // mais rápido que global
  });

  it("retorna ETA Manaus calculado pelo lag global calibrado (20d) quando IDN não informado", () => {
    const serie = [
      { data: "2026-04-01", cota_m: 3.0 },
      { data: "2026-04-02", cota_m: 3.3 },
      { data: "2026-04-03", cota_m: 3.6 },
      { data: "2026-04-04", cota_m: 3.9 },
      { data: "2026-04-05", cota_m: 4.2 },
      { data: "2026-04-06", cota_m: 4.5 },
      { data: "2026-04-07", cota_m: 4.8 },
      { data: "2026-04-08", cota_m: 5.1 },
    ];
    const r = detectaOndaBranco(serie, 7);
    // v2.1: lag global calibrado (anti-sazonal) = 20d → 08/04 + 20d = 28/04
    expect(r.eta_manaus_data).toBe("2026-04-28");
  });

  it("retorna serie insuficiente quando dados são poucos", () => {
    const r = detectaOndaBranco([{ data: "2025-01-01", cota_m: 1.0 }], 7);
    expect(r.disparado).toBe(false);
    expect(r.motivo).toMatch(/insuficiente/i);
  });

  it("sinaliza direção negativa (descida) sem disparar", () => {
    const serie = Array.from({ length: 8 }, (_, i) => ({
      data: `2025-09-${String(i + 1).padStart(2, "0")}`,
      cota_m: 5.0 - i * 0.3,         // descida forte (-2.1m em 7d)
    }));
    const r = detectaOndaBranco(serie, 7);
    expect(r.disparado).toBe(false);   // só dispara para SUBIDA
    expect(r.var_total_m).toBeLessThan(0);
  });
});
