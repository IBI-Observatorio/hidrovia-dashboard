import { describe, expect, it } from "vitest";
import { geraBriefing, type SnapshotBriefing } from "../lib/briefing-gerador";
import type { DadosEstacao } from "../lib/dados-historicos";
import type { Previsao2026 } from "../lib/fetch-dados";

const est = (nome: string, cota_m: number, variacao_24h: number, delta_2025: number | null): DadosEstacao => ({
  nome, rio: "", cota_m, variacao_24h, delta_2025, delta_2024: null, ultima_atualizacao: "2026-10-25",
});

// cenário publicado em 25/10/2026 (semana 43): Manaus já abaixo de 17,7 m
const previsao = {
  fonte: "SGB/CPRM — 26° Boletim SAH Amazonas (30/06/2026)",
  fonte_dinamica: true,
  manaus_pico_cheia: { media: 28.2, ic80_min: 27.88, ic80_max: 28.52, prob_27_5: 0.9 },
  manacapuru_pico: 20,
  itacoatiara_pico: 13.63,
} as Previsao2026;

const snap: SnapshotBriefing = {
  data_ref: "2026-10-25",
  previsao,
  cotasIDN: {},
  dados: {
    Manaus: est("Manaus", 16.66, -20, -276),
    Itacoatiara: est("Itacoatiara", 3.52, -5, -252),
    Humaita: est("Humaitá", 12.22, 56, 56),
    PortoVelho: est("Porto Velho", 4.16, 2, 2),
  },
};

describe("briefing na vazante (25/10/2026)", () => {
  const b = geraBriefing(snap);
  const tudo = JSON.stringify(b);

  it("não anuncia cruzamento de 17,7 m que já aconteceu", () => {
    expect(b.manchete.titulo).not.toMatch(/deve cruzar 17,7/);
    expect(b.alerta_destaque?.rotulo ?? "").not.toMatch(/Janela LWS se aproxima/);
    expect(b.paragrafo_contexto).toMatch(/já está abaixo do gatilho de 17,7 m/);
  });

  it("não imprime undefined nem data quebrada", () => {
    expect(tudo).not.toMatch(/undefined|\/\?\//);
  });

  it("Itacoatiara fala da vazante, não do pico previsto", () => {
    const ita = b.sublinhas.find((x) => x.rotulo.includes("Itacoatiara"))!;
    expect(ita.titulo).toBe("Itacoatiara em 3.52 m (-5 cm/24h)");
    expect(ita.texto).not.toMatch(/pico|favorável|quando a descida começar/i);
  });
});

describe("briefing na cheia (abril) mantém a projeção", () => {
  it("cita o pico previsto do SGB", () => {
    const b = geraBriefing({ ...snap, data_ref: "2026-04-20", dados: { ...snap.dados, Manaus: est("Manaus", 25, 10, 0) } });
    const ita = b.sublinhas.find((x) => x.rotulo.includes("Itacoatiara"))!;
    expect(ita.titulo).toMatch(/pico previsto 13.63 m/);
  });
});
