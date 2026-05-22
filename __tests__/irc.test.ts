import { describe, it, expect } from "vitest";
import {
  calculaIRC,
  faixaIRC,
  componenteLWS,
  componenteHMMExtremo,
  componenteOndaBranco,
} from "@/lib/irc";

describe("componentes individuais do IRC", () => {
  it("LWS: 0 quando Manaus muito alto (acima 22m)", () => {
    expect(componenteLWS(28.0)).toBe(0);
    expect(componenteLWS(25.0)).toBe(0);
    expect(componenteLWS(22.0)).toBe(0);
  });

  it("LWS: 100 quando Manaus exatamente no gatilho 17,7m", () => {
    expect(componenteLWS(17.70)).toBe(100);
  });

  it("LWS: > 100 quando Manaus abaixo do gatilho (extrapolação +15/m)", () => {
    expect(componenteLWS(15.0)).toBeCloseTo(100 + 2.7 * 15, 0);  // 140.5
  });

  it("LWS: escala linear na faixa 17,7–22m", () => {
    expect(componenteLWS(19.85)).toBeCloseTo(50, 0);
  });

  it("LWS projetado: quando ETA <= 30 dias, retorna 90 mesmo com cota alta", () => {
    expect(componenteLWS(25.0, 15)).toBe(90);
  });

  it("LWS projetado: quando ETA muito longe, componente fica baixo (<10)", () => {
    expect(componenteLWS(25.0, 250)).toBeLessThan(10);
  });

  it("HMM extremo: alto quando IDN claramente em Norte ou Sul", () => {
    expect(componenteHMMExtremo(0.55)).toBeGreaterThan(70);   // estado Norte
    expect(componenteHMMExtremo(-0.55)).toBeGreaterThan(70);  // estado Sul
  });

  it("HMM extremo: baixo quando IDN em Sincronizado", () => {
    expect(componenteHMMExtremo(0.05)).toBeLessThan(30);
  });

  it("Onda Branco: mapeamento discreto correto", () => {
    expect(componenteOndaBranco("nenhuma")).toBe(0);
    expect(componenteOndaBranco("moderada")).toBe(30);
    expect(componenteOndaBranco("alta")).toBe(65);
    expect(componenteOndaBranco("extrema")).toBe(100);
  });
});

describe("faixaIRC", () => {
  it("classifica corretamente nas 4 faixas", () => {
    expect(faixaIRC(10)).toBe("verde");
    expect(faixaIRC(35)).toBe("amarelo");
    expect(faixaIRC(60)).toBe("laranja");
    expect(faixaIRC(85)).toBe("vermelho");
  });

  it("trata bordas das faixas", () => {
    expect(faixaIRC(24.9)).toBe("verde");
    expect(faixaIRC(25)).toBe("amarelo");
    expect(faixaIRC(49.9)).toBe("amarelo");
    expect(faixaIRC(50)).toBe("laranja");
    expect(faixaIRC(74.9)).toBe("laranja");
    expect(faixaIRC(75)).toBe("vermelho");
  });
});

describe("calculaIRC — cenários âncora", () => {
  // 1) set/2024 — Mega-seca: Manaus já abaixo de 17,7m, sistema em driver Sul
  it("set/2024 (mega-seca) → IRC ≥ 80, faixa vermelho", () => {
    const r = calculaIRC({
      cotaManaus_m:     16.0,         // abaixo do gatilho
      idn:              -0.45,        // Driver Sul extremo
      severidade_onda:  "nenhuma",    // não tem onda do Branco na estiagem
      var_onda_m:       0,
      anomalia_pp:      -2,           // muito seco
    });
    expect(r.irc).toBeGreaterThanOrEqual(80);
    expect(r.faixa).toBe("vermelho");
  });

  // 2) abr/2025 — Cheia normal: Manaus próximo do pico, sistema saudável
  it("abr/2025 (cheia normal) → IRC ≤ 30, faixa verde ou amarelo", () => {
    const r = calculaIRC({
      cotaManaus_m:     26.50,        // bem acima de 22m
      idn:              +0.05,        // Sincronizado
      severidade_onda:  "nenhuma",
      var_onda_m:       0,
      anomalia_pp:      0,            // normal
    });
    expect(r.irc).toBeLessThanOrEqual(30);
    expect(["verde", "amarelo"]).toContain(r.faixa);
  });

  // 3) out/2023 — Estiagem moderada (cota só ligeiramente abaixo do gatilho)
  it("out/2023 (estiagem moderada) → faixa laranja+, IRC ≥ 50", () => {
    // v2.1: pesos recalibrados (PP↑, HMM↓). Com PP=-1 (anomalia leve) e
    // HMM moderado, IRC fica em ~58 (faixa laranja). É consistente.
    const r = calculaIRC({
      cotaManaus_m:     17.5,
      idn:              -0.30,
      severidade_onda:  "nenhuma",
      var_onda_m:       0,
      anomalia_pp:      -1,
    });
    expect(r.irc).toBeGreaterThanOrEqual(50);
    expect(["laranja", "vermelho"]).toContain(r.faixa);
  });

  // 4) mar/2026 — Driver Norte extremo (SGC colapsado). Manaus em cheia alta
  //     → componente LWS atual = 0, mas se passar ETA projetado, ele compensa.
  it("mar/2026 (driver Norte extremo, sem ETA) → faixa amarelo+ pelo HMM", () => {
    const r = calculaIRC({
      cotaManaus_m:     24.82,
      idn:              +0.52,
      severidade_onda:  "nenhuma",
      var_onda_m:       0,
      anomalia_pp:      -2,
    });
    expect(r.componentes.hmm_extremo).toBeGreaterThan(70);
    expect(r.irc).toBeGreaterThanOrEqual(25);   // pelo menos amarelo
  });

  it("mar/2026 com ETA cruzamento em ~210d → IRC sobe pelo componente projetado", () => {
    const r = calculaIRC({
      cotaManaus_m:        24.82,
      idn:                 +0.52,
      severidade_onda:     "nenhuma",
      var_onda_m:          0,
      anomalia_pp:         -2,
      eta_dias_cruzamento: 60,         // hipotético: modelo prevê cruzamento próximo
    });
    expect(r.irc).toBeGreaterThan(40);
  });

  // 5) mai/2026 — Onda Branco detectada
  it("mai/2026 (Onda Branco EXTREMA) → IRC ≥ 35 mesmo com Manaus alto", () => {
    const r = calculaIRC({
      cotaManaus_m:     27.44,        // pico aproximando
      idn:              +0.30,
      severidade_onda:  "extrema",    // boletim 20° SGB
      var_onda_m:       2.5,
      anomalia_pp:      -1,
    });
    expect(r.irc).toBeGreaterThanOrEqual(35);
    expect(r.componentes.onda_branco).toBe(100);
  });
});

describe("calculaIRC — propriedades estruturais", () => {
  it("IRC sempre entre 0 e 100 (clamp)", () => {
    const r1 = calculaIRC({ cotaManaus_m: 30, idn: 0, severidade_onda: "nenhuma", var_onda_m: 0 });
    const r2 = calculaIRC({ cotaManaus_m: 10, idn: 1.5, severidade_onda: "extrema", var_onda_m: 5, anomalia_pp: 3 });
    expect(r1.irc).toBeGreaterThanOrEqual(0);
    expect(r2.irc).toBeLessThanOrEqual(100);
  });

  it("componentes obedecem aos pesos: soma ponderada bate com IRC (v2.1)", () => {
    const r = calculaIRC({
      cotaManaus_m:     20.0,
      idn:              +0.3,
      severidade_onda:  "moderada",
      var_onda_m:       1.0,
      anomalia_pp:      1,
    });
    // v2.1: pesos calibrados — usar PESOS_IRC para evitar magic numbers
    const soma = 0.40 * r.componentes.lws +
                 0.15 * r.componentes.hmm_extremo +
                 0.15 * r.componentes.onda_branco +
                 0.30 * r.componentes.anomalia_pp;
    expect(soma).toBeCloseTo(r.irc, 0);
  });

  it("anomalia_pp ausente é tratada como 0 (neutro)", () => {
    const r = calculaIRC({
      cotaManaus_m:     22.0,
      idn:              0.0,
      severidade_onda:  "nenhuma",
      var_onda_m:       0,
      // anomalia_pp omitido
    });
    expect(r.componentes.anomalia_pp).toBe(0);
  });
});
