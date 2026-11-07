import { describe, it, expect, afterEach } from "vitest";
import { clientesRadar, clienteLiberado, copilotoLiberado } from "@/lib/radar/acesso";
import { nomeClienteDoToken } from "@/lib/auth-assinante";

describe("acesso ao Radar", () => {
  const orig = process.env.IBI_RADAR_CLIENTES;
  afterEach(() => {
    if (orig === undefined) delete process.env.IBI_RADAR_CLIENTES;
    else process.env.IBI_RADAR_CLIENTES = orig;
  });

  it("allowlist default = VLI + Ibi", () => {
    delete process.env.IBI_RADAR_CLIENTES;
    expect(clientesRadar()).toEqual(["VLI", "Ibi"]);
  });

  it("allowlist vem do env quando setado", () => {
    process.env.IBI_RADAR_CLIENTES = "Vale, Cargill";
    expect(clientesRadar()).toEqual(["Vale", "Cargill"]);
  });

  it("token ASS-VALE-<segredo> resolve o cliente como 'Vale'", () => {
    expect(nomeClienteDoToken("ASS-VALE-b0e49b4b7715f7b680")).toBe("Vale");
  });

  it("token nulo → sem cliente", () => {
    expect(nomeClienteDoToken(null)).toBeNull();
  });

  // Bug de 14/10/2026: o token vira "Vli" e a allowlist espera "VLI".
  it("token ASS-VLI-<segredo> é liberado e devolve o nome canônico da allowlist", () => {
    delete process.env.IBI_RADAR_CLIENTES;
    expect(clienteLiberado(nomeClienteDoToken("ASS-VLI-x9f2c1"))).toBe("VLI");
  });

  it("comparação com a allowlist ignora maiúsculas/minúsculas", () => {
    process.env.IBI_RADAR_CLIENTES = "vli, IBI";
    expect(clienteLiberado("VLI")).toBe("vli");
    expect(clienteLiberado("Ibi")).toBe("IBI");
  });

  it("cliente fora da allowlist ou nulo → null", () => {
    delete process.env.IBI_RADAR_CLIENTES;
    expect(clienteLiberado(nomeClienteDoToken("ASS-VALE-abc"))).toBeNull();
    expect(clienteLiberado(null)).toBeNull();
  });

  // Decisão do Bruno (14/10/2026): Copiloto fechado para todos por ora.
  it("Copiloto fechado para todos, inclusive anônimo, VLI e Ibi", () => {
    expect(copilotoLiberado(null)).toBe(false);
    expect(copilotoLiberado("VLI")).toBe(false);
    expect(copilotoLiberado("Ibi")).toBe(false);
  });
});
