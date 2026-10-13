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

describe("deploy.yml — revisão", () => {
  it("envia sha@digest (imagem imutável), não só o sha", () => {
    expect(deploy).toContain('hidrovia-deploy@2.24.121.118 "${{ github.sha }}@${{ needs.build.outputs.digest }}"');
    expect(deploy).toMatch(/digest: \$\{\{ steps\.push\.outputs\.digest \}\}/);
  });
  it("trava de concorrência só no job da VPS (não segura o job do Railway)", () => {
    const antesDosJobs = deploy.split(/^jobs:/m)[0];
    expect(antesDosJobs).not.toContain("concurrency:");
    expect(deploy).toMatch(/deploy-vps:[\s\S]*concurrency:/);
  });
});

describe("docker-compose da VPS", () => {
  it("sobe a imagem pelo digest (imutável), nunca por tag", () => {
    const c = readFileSync("deploy/vps/docker-compose.yml", "utf8");
    expect(c).toContain("image: ghcr.io/ibi-observatorio/hidrovia-dashboard@${DIGEST:?");
    expect(c).not.toContain("hidrovia-dashboard:${TAG");
  });
});

describe("robôs de dados (push na main protegida)", () => {
  const dir = ".github/workflows";
  const robos = readdirSync(dir).filter((f) => f.endsWith(".yml") && /git push/.test(readFileSync(`${dir}/${f}`, "utf8")));
  it("são os 5 conhecidos", () => {
    expect(robos.sort()).toEqual([
      "agro-dados.yml", "atualiza-portos.yml", "boletim-cabotagem-semanal.yml",
      "idn-semanal.yml", "itacoatiara-semanal.yml",
    ]);
  });
  it("fazem checkout com a deploy key (a única liberada na regra da main)", () => {
    for (const f of robos) {
      expect(readFileSync(`${dir}/${f}`, "utf8"), f).toMatch(/actions\/checkout@v5\s*\n\s*with:\s*\n(?:\s*#[^\n]*\n)?\s*ssh-key: \$\{\{ secrets\.BOT_DEPLOY_KEY \}\}/);
    }
  });
  it("não disparam deploy.yml à mão (o push com deploy key já dispara)", () => {
    for (const f of robos) {
      expect(readFileSync(`${dir}/${f}`, "utf8"), f).not.toContain("gh workflow run deploy.yml");
    }
  });
});
