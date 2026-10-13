import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");

describe("deploy.yml", () => {
  it("publica a imagem no GHCR com a tag do commit", () => {
    expect(deploy).toContain("ghcr.io/ibi-observatorio/hidrovia-dashboard:${{ github.sha }}");
  });
  it("job da VPS roda no ambiente production e depende do build", () => {
    expect(deploy).toMatch(/deploy-vps:[\s\S]*needs: build[\s\S]*environment: production/);
  });
  it("chave SSH vem de secret, nunca escrita no arquivo", () => {
    expect(deploy).toContain("secrets.VPS_SSH_KEY");
    expect(deploy).not.toMatch(/BEGIN OPENSSH PRIVATE KEY/);
  });
  it("só envia o sha para a VPS", () => {
    expect(deploy).toContain('hidrovia-deploy@2.24.121.118 "${{ github.sha }}"');
  });
});

describe("CODEOWNERS", () => {
  it("protege workflows, Dockerfile e deploy/", () => {
    const co = readFileSync(".github/CODEOWNERS", "utf8");
    expect(co).toMatch(/^\/\.github\/\s+@brunopinheiro-creator$/m);
    expect(co).toMatch(/^\/Dockerfile\s+@brunopinheiro-creator$/m);
    expect(co).toMatch(/^\/deploy\/\s+@brunopinheiro-creator$/m);
  });
});

describe("crons", () => {
  const dir = ".github/workflows";
  const arquivos = readdirSync(dir).filter((f) => f.endsWith(".yml"));
  it("nenhum workflow usa mais vars.RAILWAY_PUBLIC_URL", () => {
    for (const f of arquivos) {
      expect(readFileSync(`${dir}/${f}`, "utf8"), f).not.toContain("RAILWAY_PUBLIC_URL");
    }
  });
  it("os 9 workflows que chamam o dashboard leem vars.SITE_URL", () => {
    const usam = arquivos.filter((f) => readFileSync(`${dir}/${f}`, "utf8").includes("vars.SITE_URL"));
    expect(usam.sort()).toEqual([
      "boletim-cabotagem-semanal.yml", "briefing-semanal.yml", "enso-mensal.yml",
      "insights-semanal.yml", "noticias-semanal.yml", "reguas-diario.yml",
      "sgb-semanal.yml", "supervisor-boletim-semanal.yml", "watchdog.yml",
    ]);
  });
});
