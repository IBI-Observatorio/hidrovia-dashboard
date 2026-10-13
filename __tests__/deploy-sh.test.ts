import { describe, it, expect, beforeEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// No Windows roda pelo Git Bash; caminhos em formato /c/... e PATH controlado
// (evita a ambiguidade PATH/Path do Windows). No CI (ubuntu) é bash normal.
const WIN = process.platform === "win32";
// usr/bin/bash (não o launcher bin/bash, que antepõe /mingw64/bin ao PATH e esconde os stubs).
const BASH = WIN ? "C:/Program Files/Git/usr/bin/bash.exe" : "bash";
const posix = (p: string) => p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, l) => `/${l.toLowerCase()}`);
const SCRIPT = posix(resolve(__dirname, "../deploy/vps/deploy.sh"));
const BASE_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => k.toUpperCase() !== "PATH"),
) as NodeJS.ProcessEnv;

// O deploy recebe "<sha do commit>@sha256:<digest da imagem>": o digest fixa a
// imagem exata que o build publicou (uma tag :sha pode ser sobrescrita no GHCR).
const DIG_A = "sha256:" + "1".repeat(64);
const DIG_B = "sha256:" + "2".repeat(64);
const REF_A = `${"a".repeat(40)}@${DIG_A}`;
const REF_B = `${"b".repeat(40)}@${DIG_B}`;

let dir: string;
let calls: string;

function stub(name: string, body: string) {
  const p = join(dir, "bin", name);
  writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(p, 0o755);
}

function run(arg: string, curlExit = 0) {
  const d = posix(dir);
  return spawnSync(BASH, [SCRIPT, arg], {
    encoding: "utf8",
    env: {
      ...BASE_ENV,
      PATH: `${d}/bin:/usr/bin:/bin`,
      HIDROVIA_DIR: d,
      HEALTH_URL: "http://stub/api/health",
      HEALTH_TIMEOUT: "2",
      HEALTH_INTERVAL: "1",
      CURL_EXIT: String(curlExit),
      CALLS: `${d}/calls.txt`,
    },
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "deploy-sh-"));
  mkdirSync(join(dir, "bin"));
  calls = join(dir, "calls.txt");
  stub("docker", 'echo "docker DIGEST=$DIGEST $*" >> "$CALLS"');
  stub("curl", 'echo "curl $*" >> "$CALLS"; exit "$CURL_EXIT"');
  stub("sleep", "true");
});

describe("deploy.sh", () => {
  const ruins = [
    "",
    "abc",
    "a".repeat(40), // só o sha, sem digest: recusado (tag mutável)
    REF_A.toUpperCase(),
    `${REF_A}; rm -rf /`,
    `${"a".repeat(40)}@sha256:${"1".repeat(63)}`,
    `${"a".repeat(40)}@md5:${"1".repeat(64)}`,
  ];
  for (const ruim of ruins) {
    it(`recusa argumento inválido: ${JSON.stringify(ruim)}`, () => {
      const r = run(ruim);
      expect(r.status).toBe(2);
      expect(existsSync(calls)).toBe(false);
      expect(existsSync(join(dir, "tag"))).toBe(false);
    });
  }

  it("health 200 = sucesso: sobe pelo digest, grava tag e log", () => {
    const r = run(REF_A, 0);
    expect(r.status).toBe(0);
    expect(readFileSync(join(dir, "tag"), "utf8").trim()).toBe(REF_A);
    expect(readFileSync(calls, "utf8")).toContain(`docker DIGEST=${DIG_A} compose pull web`);
    expect(readFileSync(join(dir, "deploys.log"), "utf8")).toContain(`OK ${REF_A}`);
  });

  it("health check tem timeout por tentativa (curl não pode pendurar)", () => {
    run(REF_A, 0);
    expect(readFileSync(calls, "utf8")).toMatch(/curl .*--max-time \d+/);
  });

  it("health falha com tag anterior: reverte para o digest anterior e sai 1", () => {
    writeFileSync(join(dir, "tag"), `${REF_A}\n`);
    const r = run(REF_B, 7);
    expect(r.status).toBe(1);
    expect(readFileSync(join(dir, "tag"), "utf8").trim()).toBe(REF_A);
    const c = readFileSync(calls, "utf8");
    expect(c).toContain(`docker DIGEST=${DIG_B} compose up -d web`);
    expect(c).toContain(`docker DIGEST=${DIG_A} compose up -d web`);
    expect(readFileSync(join(dir, "deploys.log"), "utf8")).toMatch(/FALHA/);
  });

  it("health falha no primeiro deploy (sem anterior): sai 1 sem reverter", () => {
    const r = run(REF_A, 7);
    expect(r.status).toBe(1);
    expect(readFileSync(calls, "utf8")).not.toMatch(/DIGEST= compose/);
  });
});
