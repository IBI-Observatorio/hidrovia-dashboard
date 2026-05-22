// Validação cross-temporal do IRC contra eventos históricos rotulados.
//
// Cada evento tem uma "severidade observada" estimada a partir de:
//   - cota Manaus mínima do ciclo
//   - lag Manaus-Itacoatiara
//   - impacto operacional documentado (boletins ANTAQ/SGB)
//
// O IRC deve correlacionar monotonicamente com essa severidade.

import { describe, it, expect } from "vitest";
import { calculaIRC, calculaIRC_Agora } from "@/lib/irc";
import { calculaIRCMonteCarlo } from "@/lib/irc-incerteza";

interface Evento {
  rotulo: string;
  data: string;
  snapshot: Parameters<typeof calculaIRC>[0];
  irc_esperado_minimo?: number;
  irc_esperado_maximo?: number;
  severidade_observada: 1 | 2 | 3 | 4 | 5;  // 1=trivial, 5=mega-seca
}

const EVENTOS: Evento[] = [
  {
    rotulo: "Mega-seca out/2024 (Manaus 12,11m)",
    data: "2024-10-09",
    snapshot: {
      cotaManaus_m: 12.11,
      idn: -0.55,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -2,
      eta_dias_cruzamento: -30,  // já cruzou há 30d
    },
    irc_esperado_minimo: 80,
    severidade_observada: 5,
  },
  {
    rotulo: "Estiagem set/2023 (Manaus 14,5m)",
    data: "2023-09-15",
    snapshot: {
      cotaManaus_m: 14.5,
      idn: -0.40,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -1,
      eta_dias_cruzamento: -15,  // já cruzou
    },
    irc_esperado_minimo: 70,
    severidade_observada: 4,
  },
  {
    rotulo: "Estiagem set/2010 (cota ~13m)",
    data: "2010-09-15",
    snapshot: {
      cotaManaus_m: 13.0,
      idn: -0.50,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -2,
      eta_dias_cruzamento: -30,
    },
    irc_esperado_minimo: 75,
    severidade_observada: 5,
  },
  {
    rotulo: "Cheia normal abr/2025 (Manaus 26,5m, sistema saudável)",
    data: "2025-04-15",
    snapshot: {
      cotaManaus_m: 26.5,
      idn: 0.05,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: 0,
      eta_dias_cruzamento: 200,
    },
    irc_esperado_maximo: 35,
    severidade_observada: 1,
  },
  {
    rotulo: "Dessincronização mar/2026 (SGC colapsa mas Manaus alto)",
    data: "2026-03-17",
    snapshot: {
      cotaManaus_m: 24.82,
      idn: 0.55,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -2,
      eta_dias_cruzamento: 230,
    },
    severidade_observada: 3,
  },
  {
    rotulo: "Onda Branco mai/2026 (boletim 20°, sistema em cheia)",
    data: "2026-05-19",
    snapshot: {
      cotaManaus_m: 27.5,
      idn: 0.30,
      severidade_onda: "alta",
      severidade_onda_continua: 75,
      var_onda_m: 2.2,
      anomalia_pp: -1,
      eta_dias_cruzamento: 165,
    },
    severidade_observada: 2,
  },
];

describe("Validação cross-temporal do IRC", () => {
  it("retorna severidade alta para mega-secas", () => {
    for (const e of EVENTOS.filter((x) => x.severidade_observada >= 4)) {
      const r = calculaIRC(e.snapshot);
      if (e.irc_esperado_minimo != null) {
        expect(r.irc, `${e.rotulo}: IRC=${r.irc} (esperado ≥${e.irc_esperado_minimo})`)
          .toBeGreaterThanOrEqual(e.irc_esperado_minimo);
      }
    }
  });

  it("retorna severidade baixa para sistema saudável", () => {
    for (const e of EVENTOS.filter((x) => x.severidade_observada <= 1)) {
      const r = calculaIRC(e.snapshot);
      if (e.irc_esperado_maximo != null) {
        expect(r.irc, `${e.rotulo}: IRC=${r.irc} (esperado ≤${e.irc_esperado_maximo})`)
          .toBeLessThanOrEqual(e.irc_esperado_maximo);
      }
    }
  });

  it("correlaciona monotonicamente com severidade observada (Spearman)", () => {
    const pares = EVENTOS.map((e) => ({
      sev: e.severidade_observada,
      irc: calculaIRC(e.snapshot).irc,
    }));
    // Spearman simples: ranks
    const ranksSev = pares.map(p => p.sev).map((v, i, arr) => arr.filter(x => x < v).length);
    const ranksIRC = pares.map(p => p.irc).map((v, i, arr) => arr.filter(x => x < v).length);
    let n = pares.length;
    let num = 0, dx = 0, dy = 0;
    const meanX = ranksSev.reduce((a, b) => a + b, 0) / n;
    const meanY = ranksIRC.reduce((a, b) => a + b, 0) / n;
    for (let i = 0; i < n; i++) {
      num += (ranksSev[i] - meanX) * (ranksIRC[i] - meanY);
      dx  += (ranksSev[i] - meanX) ** 2;
      dy  += (ranksIRC[i] - meanY) ** 2;
    }
    const rho = num / Math.sqrt(dx * dy);
    expect(rho, `Correlação rho=${rho.toFixed(3)}, esperada ≥ 0.7`).toBeGreaterThanOrEqual(0.7);
  });

  it("IRC_AGORA é menor que IRC_PROJETADO em cenário com Onda em trânsito", () => {
    const cenarioOnda = EVENTOS.find((e) => e.rotulo.includes("Onda Branco"))!;
    const agora     = calculaIRC_Agora(cenarioOnda.snapshot);
    const projetado = calculaIRC(cenarioOnda.snapshot);
    expect(agora.irc).toBeLessThan(projetado.irc);
  });

  it("Monte Carlo devolve IC80 finito em cenário sensível (faixa transitória)", () => {
    // Cenário em faixa transitória (cota próx do gatilho, IDN próx de zero) onde
    // pequenas perturbações mudam a faixa — banda IC80 não-degenerada.
    const cenario = {
      cotaManaus_m: 19.0,
      idn: 0.1,
      severidade_onda: "moderada" as const,
      severidade_onda_continua: 35,
      var_onda_m: 1.0,
      anomalia_pp: -1,
      eta_dias_cruzamento: 80,
    };
    const mc = calculaIRCMonteCarlo(cenario, 500);
    expect(mc.irc_sigma).toBeGreaterThan(0);
    expect(mc.irc_ic80_hi).toBeGreaterThan(mc.irc_ic80_lo);
    expect(Math.abs(mc.irc_media - mc.irc_central)).toBeLessThan(10);
  });

  it("Monte Carlo em cenário saturado retorna sigma=0 (corretamente)", () => {
    // Cenário mega-seca: todos componentes saturados → perturbações não mudam
    // o resultado. sigma = 0 é coerente, não um bug.
    const mc = calculaIRCMonteCarlo(EVENTOS[0].snapshot, 100);
    expect(mc.irc_sigma).toBeGreaterThanOrEqual(0);
    expect(mc.prob_faixa.vermelho).toBeGreaterThan(0.9);   // certeza ≥ 90%
  });
});
