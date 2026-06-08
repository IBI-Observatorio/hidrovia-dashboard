import { describe, it, expect } from "vitest";
import { processosDoAtivo } from "@/lib/radar/processos";
import { montarContextoExplicador, numerosSemLastro } from "@/lib/radar/copilot";
import { getRadarAsset, fullAsset } from "@/lib/radar/assets";
import { alertasDoAtivo } from "@/lib/radar/alerts";
import { lerNotas, notasDoAtivo } from "@/lib/radar/notes";

describe("acompanhamento processual (SEI/TCU)", () => {
  it("EF-170 tem snapshot com os 3 processos (2 ANTT + 1 TCU)", () => {
    const d = processosDoAtivo("ef-170");
    expect(d).not.toBeNull();
    expect(d!.asset).toBe("ef-170");
    expect(d!.processos).toHaveLength(3);
    const numeros = d!.processos.map((p) => p.numero);
    expect(numeros).toContain("50500.036505/2016-15");
    expect(numeros).toContain("50500.702124/2017-17");
    expect(numeros).toContain("037.044/2020-6");
  });

  it("ativo sem snapshot ⇒ null (parciais não têm acompanhamento)", () => {
    expect(processosDoAtivo("fico-fiol")).toBeNull();
    expect(processosDoAtivo("inexistente")).toBeNull();
  });

  it("todo movimento tem data + descrição; todo processo tem fonte sourçada", () => {
    const d = processosDoAtivo("ef-170")!;
    for (const p of d.processos) {
      expect(p.fonte?.label?.length).toBeGreaterThan(0);
      for (const m of p.movimentos) {
        expect(m.data).toMatch(/^\d{4}-\d{2}(-\d{2})?$/);
        expect(m.descricao.length).toBeGreaterThan(0);
      }
    }
  });

  it("o processo-mãe da ANTT traz os andamentos reais de 2026 (Rumo, ABIOVE, Min. Transportes)", () => {
    const mae = processosDoAtivo("ef-170")!.processos.find((p) => p.numero === "50500.036505/2016-15")!;
    const texto = mae.movimentos.map((m) => m.descricao).join(" ");
    expect(texto).toMatch(/ABIOVE/);
    expect(texto).toMatch(/Rumo/);
    expect(texto).toMatch(/Transportes/);
  });

  it("o andamento entra no contexto do copiloto e seus números têm lastro (blindagem)", () => {
    const entry = getRadarAsset("ef-170")!;
    const full = fullAsset(entry);
    const { contexto } = montarContextoExplicador({
      entry, full, analise: null,
      alertas: alertasDoAtivo("ef-170"),
      notas: notasDoAtivo(lerNotas(), "ef-170"),
      processos: processosDoAtivo("ef-170"),
    });
    expect(contexto).toContain("ANDAMENTO PROCESSUAL");
    expect(contexto).toContain("50500.036505/2016-15");
    // uma resposta do explicador que cite a data/processo reais NÃO é bloqueada
    expect(numerosSemLastro("Em 2026-04-07 a ABIOVE teve acesso ao processo 50500.036505/2016-15.", contexto)).toEqual([]);
  });
});
