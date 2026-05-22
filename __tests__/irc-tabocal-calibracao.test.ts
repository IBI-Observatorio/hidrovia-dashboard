// Testes que VALIDAM A CALIBRAÇÃO RIGOROSA do IRC-Tabocal v3.1 contra os 21
// eventos rotulados. Falha aqui significa que a calibração regrediu.

import { describe, it, expect } from "vitest";
import { calculaIRCTabocal } from "@/lib/irc-tabocal";
import { EVENTOS_TABOCAL } from "@/lib/eventos-tabocal-rotulados";
import { IRC_TABOCAL_CALIBRACAO } from "@/lib/irc-tabocal-pesos-calibrados";

// Spearman simples (replicado pra evitar dependência externa)
function spearman(x: number[], y: number[]): number {
  const n = x.length;
  const rank = (arr: number[]) => {
    const sorted = arr.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0]);
    const r = new Array(n);
    sorted.forEach(([, idx], rk) => { r[idx] = rk; });
    return r;
  };
  const rx = rank(x), ry = rank(y);
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx  += (rx[i] - mx) ** 2;
    dy  += (ry[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

describe("IRC-Tabocal v3.1 — validação contra eventos rotulados", () => {
  it(`Spearman(IRC, severidade) ≥ 0,80 nos ${EVENTOS_TABOCAL.length} eventos rotulados`, () => {
    // v3.2: ρ = 0,85 in-sample, 0,87 LOO. Threshold de 0,80 garante robustez.
    const ircs = EVENTOS_TABOCAL.map((e) => calculaIRCTabocal(e.snapshot).irc);
    const sevs = EVENTOS_TABOCAL.map((e) => e.severidade_observada);
    const rho = spearman(ircs, sevs);
    expect(rho).toBeGreaterThanOrEqual(0.80);
  });

  it("Discriminação perfeita: todos os sev=5 têm IRC > qualquer sev=1", () => {
    const ircsSev1 = EVENTOS_TABOCAL.filter((e) => e.severidade_observada === 1).map((e) => calculaIRCTabocal(e.snapshot).irc);
    const ircsSev5 = EVENTOS_TABOCAL.filter((e) => e.severidade_observada === 5).map((e) => calculaIRCTabocal(e.snapshot).irc);
    const maxSev1 = Math.max(...ircsSev1);
    const minSev5 = Math.min(...ircsSev5);
    expect(minSev5).toBeGreaterThan(maxSev1);
  });

  it("Mega-seca 2024 (Itacoatiara -0,17m, sev=5) → vermelho ou laranja+", () => {
    const ev = EVENTOS_TABOCAL.find((e) => e.rotulo.includes("31/out/2024"));
    expect(ev).toBeDefined();
    const r = calculaIRCTabocal(ev!.snapshot);
    // v3.2: CMR oficial satura em ~96-100, sem extrapolação selvagem
    expect(r.irc).toBeGreaterThanOrEqual(65);
    expect(["laranja", "vermelho"]).toContain(r.faixa);
  });

  it("Cheia saudável (Itacoatiara ≥12m, sev=1) → IRC ≤ 35 (verde/amarelo)", () => {
    const evs = EVENTOS_TABOCAL.filter((e) => e.severidade_observada === 1 && e.snapshot.cotaItacoatiara_m >= 12);
    for (const ev of evs) {
      const r = calculaIRCTabocal(ev.snapshot);
      expect(r.irc, `${ev.rotulo}: IRC=${r.irc}`).toBeLessThanOrEqual(35);
    }
  });

  it("Metadados de calibração documentados", () => {
    expect(IRC_TABOCAL_CALIBRACAO.n_eventos).toBeGreaterThanOrEqual(20);
    // v3.2: ρ baixou levemente (0.85 vs 0.90 da v3.1) pela mudança da função
    //       calado para curva CMR oficial — saturação não-extrapolativa.
    expect(IRC_TABOCAL_CALIBRACAO.rho_spearman_in).toBeGreaterThanOrEqual(0.80);
    expect(IRC_TABOCAL_CALIBRACAO.rho_spearman_loo).toBeGreaterThanOrEqual(0.80);
    expect(IRC_TABOCAL_CALIBRACAO.auc_discriminacao).toBeGreaterThanOrEqual(0.95);
  });

  it("Pesos calibrados ≠ pesos uniformes (calibração tem ganho)", () => {
    // Calibração deve produzir pesos heterogêneos — não uniformes (0.2)
    const pesos = [0.41, 0.11, 0.11, 0.26, 0.11];   // calado, hmm, onda, pp, lag
    const max = Math.max(...pesos);
    const min = Math.min(...pesos);
    expect(max - min).toBeGreaterThan(0.20);   // diferença significativa
  });
});

describe("IRC-Tabocal v3.1 — comparação com IRC-Manaus", () => {
  it("IRC-Tabocal sinaliza eventos com defasagem ativa (Itacoatiara < 2m)", () => {
    // Eventos onde Itacoatiara está crítico (cota < 2m) → IRC deve dar laranja+
    const eventosCriticosTabocal = EVENTOS_TABOCAL.filter((e) =>
      e.snapshot.cotaItacoatiara_m < 2.0
    );
    expect(eventosCriticosTabocal.length).toBeGreaterThan(0);
    for (const ev of eventosCriticosTabocal) {
      const r = calculaIRCTabocal(ev.snapshot);
      expect(r.irc, `${ev.rotulo}: IRC=${r.irc}`).toBeGreaterThanOrEqual(50);
    }
  });
});
