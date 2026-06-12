import { describe, it, expect, afterEach } from "vitest";
import { clientesRadar } from "@/lib/radar/acesso";
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
});
