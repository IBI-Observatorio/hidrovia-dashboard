// Testes de robustez do IRC v2.1:
//   - Reprodutibilidade (idempotência)
//   - Versionamento explícito
//   - Bordas extremas (cota = 0, IDN = ±3)
//   - Sazonalidade do LWS
//   - Soma dos pesos = 1.0
//   - Renormalização correta

import { describe, it, expect } from "vitest";
import {
  calculaIRC,
  calculaIRC_Agora,
  calculaIRC_Projetado,
  componenteLWS,
  detectaFaseCiclo,
  PESOS_IRC,
  IRC_VERSAO,
  type SnapshotIRC,
} from "@/lib/irc";

describe("Versionamento e metadados", () => {
  it("expõe IRC_VERSAO = v2.1", () => {
    expect(IRC_VERSAO).toBe("v2.1");
  });

  it("pesos somam exatamente 1.0", () => {
    const soma = PESOS_IRC.lws + PESOS_IRC.hmm_extremo +
                 PESOS_IRC.onda_branco + PESOS_IRC.anomalia_pp;
    expect(soma).toBeCloseTo(1.0, 10);
  });
});

describe("Reprodutibilidade (idempotência)", () => {
  const snap: SnapshotIRC = {
    cotaManaus_m: 20.0,
    idn: 0.3,
    severidade_onda: "moderada",
    severidade_onda_continua: 35,
    var_onda_m: 1.0,
    anomalia_pp: -1,
    eta_dias_cruzamento: 90,
    fase_ciclo: "subida",
  };

  it("chamadas repetidas retornam exatamente o mesmo IRC", () => {
    const a = calculaIRC(snap);
    const b = calculaIRC(snap);
    const c = calculaIRC(snap);
    expect(a.irc).toBe(b.irc);
    expect(b.irc).toBe(c.irc);
  });

  it("ordem dos campos no snapshot não afeta resultado", () => {
    const a = calculaIRC({ ...snap });
    const b = calculaIRC({
      anomalia_pp: -1,
      idn: 0.3,
      cotaManaus_m: 20.0,
      severidade_onda: "moderada",
      severidade_onda_continua: 35,
      eta_dias_cruzamento: 90,
      fase_ciclo: "subida",
      var_onda_m: 1.0,
    });
    expect(a.irc).toBe(b.irc);
  });
});

describe("Sazonalidade do LWS (v2.1)", () => {
  it("detectaFaseCiclo classifica meses corretamente", () => {
    expect(detectaFaseCiclo("2026-03-15")).toBe("subida");
    expect(detectaFaseCiclo("2026-06-15")).toBe("topo");
    expect(detectaFaseCiclo("2026-10-15")).toBe("descida");
    expect(detectaFaseCiclo("2026-12-15")).toBe("descida");
    expect(detectaFaseCiclo("2026-01-01")).toBe("subida");
  });

  it("mesma cota tem IRC MAIOR na descida que na subida", () => {
    const cota = 19.0;
    const lws_subida  = componenteLWS(cota, null, "subida");
    const lws_descida = componenteLWS(cota, null, "descida");
    expect(lws_descida).toBeGreaterThan(lws_subida);
  });

  it("ETA projetado domina sobre modulação sazonal", () => {
    // Cota alta (atual=0) + subida (modulação 0.6 × 0 = 0)
    // mas ETA próximo (90 pts) → final = 90
    const lws = componenteLWS(25.0, 20, "subida");
    expect(lws).toBe(90);
  });
});

describe("Bordas extremas", () => {
  const baseSnap: SnapshotIRC = {
    cotaManaus_m: 20,
    idn: 0,
    severidade_onda: "nenhuma",
    severidade_onda_continua: 0,
    var_onda_m: 0,
  };

  it("cota = 0 não quebra (LWS satura mas IRC < 100)", () => {
    const r = calculaIRC({ ...baseSnap, cotaManaus_m: 0 });
    expect(r.irc).toBeGreaterThan(40);
    expect(r.irc).toBeLessThanOrEqual(100);
    expect(Number.isFinite(r.irc)).toBe(true);
  });

  it("cota >> 22m não quebra (LWS = 0)", () => {
    const r = calculaIRC({ ...baseSnap, cotaManaus_m: 50 });
    expect(r.componentes.lws).toBe(0);
    expect(Number.isFinite(r.irc)).toBe(true);
  });

  it("IDN extrapolado (±3) clampeia no HMM mas preserva no detalhes", () => {
    const r1 = calculaIRC({ ...baseSnap, idn: +3 });
    const r2 = calculaIRC({ ...baseSnap, idn: +1 });
    // Mesmo HMM (clampeado para 0.9)
    expect(r1.componentes.hmm_extremo).toBeCloseTo(r2.componentes.hmm_extremo, 1);
    // Mas detalhes preserva IDN original
    expect(r1.detalhes.idn).toBe(3);
  });

  it("Anomalia PP categoria > 3 satura em 100", () => {
    const r = calculaIRC({ ...baseSnap, anomalia_pp: 5 });
    expect(r.componentes.anomalia_pp).toBe(100);
  });
});

describe("AGORA vs PROJETADO", () => {
  const snap: SnapshotIRC = {
    cotaManaus_m: 27.5,
    idn: 0.3,
    severidade_onda: "alta",
    severidade_onda_continua: 75,
    var_onda_m: 2.2,
    anomalia_pp: -1,
    eta_dias_cruzamento: 165,
  };

  it("IRC_AGORA descarta Onda em trânsito e ETA projetado", () => {
    const agora     = calculaIRC_Agora(snap);
    const projetado = calculaIRC_Projetado(snap);
    expect(agora.detalhes.severidade_onda).toBe("nenhuma");
    expect(agora.componentes.onda_branco).toBe(0);
    expect(projetado.componentes.onda_branco).toBeGreaterThan(0);
    expect(agora.irc).toBeLessThanOrEqual(projetado.irc);
  });
});

describe("Renormalização v2.1 (peso PP = 0.30)", () => {
  const baseSnap: SnapshotIRC = {
    cotaManaus_m: 19,
    idn: 0.2,
    severidade_onda: "moderada",
    severidade_onda_continua: 35,
    var_onda_m: 1.0,
  };

  it("Sem anomalia_pp: redistribui peso 0.30 para os outros (fator 1/0.70)", () => {
    const r = calculaIRC(baseSnap);
    expect(r.componentes_ausentes).toContain("anomalia_pp");
    const somaPesosEfetivos = r.pesos_efetivos.lws + r.pesos_efetivos.hmm_extremo +
                              r.pesos_efetivos.onda_branco + r.pesos_efetivos.anomalia_pp;
    // Tolerância 2 casas — pesos efetivos arredondados a 3 casas podem somar 0.999
    expect(somaPesosEfetivos).toBeCloseTo(1.0, 2);
    expect(r.pesos_efetivos.lws).toBeCloseTo(0.40 / 0.70, 3);     // ≈0.571
    expect(r.pesos_efetivos.anomalia_pp).toBe(0);
  });

  it("Com anomalia_pp: usa pesos originais", () => {
    const r = calculaIRC({ ...baseSnap, anomalia_pp: -1 });
    expect(r.componentes_ausentes).toHaveLength(0);
    expect(r.pesos_efetivos.lws).toBeCloseTo(0.40, 3);
    expect(r.pesos_efetivos.anomalia_pp).toBeCloseTo(0.30, 3);
  });
});
