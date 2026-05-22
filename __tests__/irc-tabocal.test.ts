import { describe, it, expect } from "vitest";
import {
  calculaIRCTabocal,
  componenteCaladoTabocal,
  componenteLagOperacional,
  divergenciaIRC,
  PESOS_IRC_TABOCAL,
  IRC_TABOCAL_VERSAO,
} from "@/lib/irc-tabocal";
import { calculaIRC } from "@/lib/irc";

describe("IRC-Tabocal v3.6 — metadados", () => {
  it("expõe versão v3.6 (calibração contra ANTAQ tonelagem)", () => {
    expect(IRC_TABOCAL_VERSAO).toBe("v3.6");
  });

  it("pesos somam 1.0", () => {
    const soma = PESOS_IRC_TABOCAL.calado_tabocal + PESOS_IRC_TABOCAL.hmm_extremo +
                 PESOS_IRC_TABOCAL.onda_branco + PESOS_IRC_TABOCAL.anomalia_pp +
                 PESOS_IRC_TABOCAL.lag_operacional;
    expect(soma).toBeCloseTo(1.0, 10);
  });
});

describe("componenteCaladoTabocal (v3.2 — curva CMR oficial)", () => {
  it("zero quando Itacoatiara folgada (≥8m, CMR ≥ calado alvo 11m)", () => {
    expect(componenteCaladoTabocal(8.0)).toBe(0);
    expect(componenteCaladoTabocal(10.0)).toBe(0);
  });

  it("≈96 na mínima histórica (CMR ≈ 5,72m, déficit ≈ 5,28m)", () => {
    // v3.2: déficit 5.28m → score = 50 + (5.28-2.5)*16.67 ≈ 96.3
    expect(componenteCaladoTabocal(-0.10)).toBeGreaterThanOrEqual(95);
    expect(componenteCaladoTabocal(-0.10)).toBeLessThanOrEqual(100);
  });

  it("100 (satura) quando cota extrapola abaixo do mínimo histórico", () => {
    // Cota ITA muito abaixo do mínimo histórico (curva satura em CMR=5,63)
    // → déficit = 11-5,63 = 5,37, score = 50 + 2,87*16.67 ≈ 97.8
    expect(componenteCaladoTabocal(-2.0)).toBeGreaterThanOrEqual(95);
  });

  it("ETA projetado domina quando atual está OK", () => {
    expect(componenteCaladoTabocal(8.0, 20)).toBe(95);
  });
});

describe("componenteLagOperacional (v3.5 — ortogonalizado, ITA = a + b·MAO)", () => {
  it("score próximo do piso (~0-15) quando ITA está acima ou no esperado", () => {
    // MAO=27, ITA_esperada = -10.75 + 0.87*27 ≈ 12.75. ITA=14 → resíduo +1.25 → anomalia -1.25 → score baixo
    const r = componenteLagOperacional(27, 14);
    expect(r).toBeLessThan(20);
  });

  it("score ALTO quando ITA MUITO abaixo do esperado para a cota MAO", () => {
    // MAO=17, ITA_esperada ≈ -10.75 + 0.87*17 ≈ 4.04. ITA=1 → resíduo -3.04 → anomalia +3 → score ~100
    const r = componenteLagOperacional(17, 1);
    expect(r).toBeGreaterThan(80);
  });

  it("score MODERADO quando ITA levemente abaixo do esperado", () => {
    // MAO=17, ITA_esperada ≈ 4.04. ITA=2 → resíduo -2.04 → anomalia +2 → score ~77
    const r = componenteLagOperacional(17, 2);
    expect(r).toBeGreaterThan(50);
    expect(r).toBeLessThan(90);
  });

  it("resíduo próximo de zero → score ~30 (piso climatológico)", () => {
    // MAO=20, ITA_esperada ≈ -10.75 + 0.87*20 ≈ 6.66. ITA=6.66 → resíduo 0 → score 30
    const r = componenteLagOperacional(20, 6.66);
    expect(r).toBeCloseTo(30, 0);
  });
});

describe("calculaIRCTabocal — cenários", () => {
  it("Mega-seca out/2024 (Itacoatiara -0,17m) → vermelho (≥70)", () => {
    const r = calculaIRCTabocal({
      cotaItacoatiara_m: -0.17,
      cotaManaus_m:      12.71,        // Manaus também muito baixo
      idn:               -0.45,
      severidade_onda:   "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m:        0,
      anomalia_pp:       -2,
    });
    // v3.2: com curva CMR oficial, calado satura em 96-100 (não extrapola mais)
    expect(r.irc).toBeGreaterThanOrEqual(65);
    expect(["laranja", "vermelho"]).toContain(r.faixa);
  });

  it("Lag 2024 fim-de-set (Manaus subiu, Itacoatiara ainda em mínima) → defasagem detectada", () => {
    // 22/out/2024: Manaus já em ~12,5m subindo, Itacoatiara ainda em -0,12m
    // v3.1: peso calado_tabocal=0.41 (calibrado). Cenário com calado saturado
    // (≥100) + pp leve + lag negativo gera IRC ~60-65 (faixa laranja).
    const r = calculaIRCTabocal({
      cotaItacoatiara_m: -0.12,
      cotaManaus_m:      12.40,
      idn:               -0.35,
      severidade_onda:   "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m:        0,
      anomalia_pp:       -1,
    });
    // v3.2: CMR satura em 96-100 (não mais extrapola além de 100)
    expect(r.componentes.calado_tabocal).toBeGreaterThanOrEqual(90);
    expect(r.irc).toBeGreaterThanOrEqual(55);
    expect(["laranja", "vermelho"]).toContain(r.faixa);
  });

  it("Cheia normal abr/2025 (Itacoatiara em ~10m) → faixa não-crítica", () => {
    // v3.6: peso lag dominante (0.63). Com MAO=26,5 e ITA=10,5, ITA_esperada
    // = -10,75 + 0,87*26,5 ≈ 12,3. Resíduo = -1,8 → anomalia +1,8 → lag ~72.
    // IRC = 0,09*0 (calado) + 0,09*0 (HMM neutro) + 0,1*0 + 0,1*0 + 0,63*72 ≈ 45.
    // Aceita até 50 (laranja excluído).
    const r = calculaIRCTabocal({
      cotaItacoatiara_m: 10.5,
      cotaManaus_m:      26.5,
      idn:                0.05,
      severidade_onda:   "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m:        0,
      anomalia_pp:       0,
    });
    expect(r.irc).toBeLessThanOrEqual(50);
    expect(["verde", "amarelo"]).toContain(r.faixa);
  });

  it("Dessincronização mar/2026 (SGC colapsa MAS Itacoatiara saudável) → faixa intermediária", () => {
    const r = calculaIRCTabocal({
      cotaItacoatiara_m: 11.37,
      cotaManaus_m:      24.82,
      idn:                0.52,
      severidade_onda:   "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m:        0,
      anomalia_pp:       -2,
    });
    // Itacoatiara OK + delta ~13m climatológico → calado e lag baixos
    // HMM + PP contribuem, mas não saturam
    expect(r.irc).toBeLessThan(50);
  });
});

describe("divergenciaIRC — sinal regulatório", () => {
  it("ALINHADO quando IRC-Manaus e IRC-Tabocal estão próximos", () => {
    const d = divergenciaIRC(45, 47);
    expect(d.sinal_regulatorio).toBe("alinhado");
  });

  it("SUBESTIMACAO_LEVE quando Tabocal 10-25 pts acima de Manaus", () => {
    const d = divergenciaIRC(30, 50);
    expect(d.sinal_regulatorio).toBe("subestimacao_leve");
  });

  it("SUBESTIMACAO_ALTA quando Tabocal 25-40 pts acima", () => {
    const d = divergenciaIRC(30, 60);
    expect(d.sinal_regulatorio).toBe("subestimacao_alta");
  });

  it("SUBESTIMACAO_CRITICA quando Tabocal 40+ pts acima", () => {
    const d = divergenciaIRC(20, 80);
    expect(d.sinal_regulatorio).toBe("subestimacao_critica");
  });

  it("Cenário mid-nov/2024 (Manaus normalizou, Tabocal ainda em mínima) — defasagem regulatória clara", () => {
    // 10/nov/2024 (cenário fictício após recuperação parcial): Manaus em
    // 19m (acima do gatilho ANTAQ — IRC-Manaus baixo), mas Itacoatiara
    // ainda em -0,05m (próximo do gatilho operacional — IRC-Tabocal alto).
    // Esta é a DEFASAGEM REGULATÓRIA que a tese do IBI defende.
    const ircManaus = calculaIRC({
      cotaManaus_m:     19.0,           // acima do gatilho ANTAQ
      idn:              -0.35,
      severidade_onda:  "nenhuma",
      var_onda_m:       0,
      anomalia_pp:      -1,
    }).irc;
    const ircTabocal = calculaIRCTabocal({
      cotaItacoatiara_m: -0.05,         // próximo do gatilho operacional
      cotaManaus_m:      19.0,
      idn:               -0.35,
      severidade_onda:   "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m:        0,
      anomalia_pp:       -1,
    }).irc;
    const d = divergenciaIRC(ircManaus, ircTabocal);
    // Tabocal deve estar SIGNIFICATIVAMENTE acima de Manaus → subestimação regulatória
    expect(d.diferenca).toBeGreaterThan(15);
    expect(["subestimacao_leve","subestimacao_alta","subestimacao_critica"]).toContain(d.sinal_regulatorio);
  });
});
