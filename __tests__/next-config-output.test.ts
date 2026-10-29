import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("next.config output", () => {
  it("usa standalone quando NEXT_OUTPUT=standalone (build Docker)", async () => {
    vi.stubEnv("NEXT_OUTPUT", "standalone");
    const cfg = (await import("../next.config")).default;
    expect(cfg.output).toBe("standalone");
  });

  it("não define output sem a variável (build do Railway continua igual)", async () => {
    vi.stubEnv("NEXT_OUTPUT", "");
    const cfg = (await import("../next.config")).default;
    expect(cfg.output).toBeUndefined();
  });
});
