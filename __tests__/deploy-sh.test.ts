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
const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const BASE_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => k.toUpperCase() !== "PATH"),
) as NodeJS.ProcessEnv;

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
  stub("docker", 'echo "docker TAG=$TAG $*" >> "$CALLS"');
  stub("curl", 'echo "curl $*" >> "$CALLS"; exit "$CURL_EXIT"');
  stub("sleep", "true");
});

describe("deploy.sh", () => {
  for (const ruim of ["", "abc", SHA_A.toUpperCase(), `${SHA_A}; rm -rf /`, `${SHA_A}0`]) {
    it(`recusa argumento inválido: ${JSON.stringify(ruim)}`, () => {
      const r = run(ruim);
      expect(r.status).toBe(2);
      expect(existsSync(calls)).toBe(false);
      expect(existsSync(join(dir, "tag"))).toBe(false);
    });
  }

  it("health 200 = sucesso: grava tag e log", () => {
    const r = run(SHA_A, 0);
    expect(r.status).toBe(0);
    expect(readFileSync(join(dir, "tag"), "utf8").trim()).toBe(SHA_A);
    expect(readFileSync(calls, "utf8")).toContain(`docker TAG=${SHA_A} compose pull web`);
    expect(readFileSync(join(dir, "deploys.log"), "utf8")).toMatch(new RegExp(`OK ${SHA_A}`));
  });

  it("health falha com tag anterior: reverte e sai 1", () => {
    writeFileSync(join(dir, "tag"), `${SHA_A}\n`);
    const r = run(SHA_B, 7);
    expect(r.status).toBe(1);
    expect(readFileSync(join(dir, "tag"), "utf8").trim()).toBe(SHA_A);
    const c = readFileSync(calls, "utf8");
    expect(c).toContain(`docker TAG=${SHA_B} compose up -d web`);
    expect(c).toContain(`docker TAG=${SHA_A} compose up -d web`);
    expect(readFileSync(join(dir, "deploys.log"), "utf8")).toMatch(/FALHA/);
  });

  it("health falha no primeiro deploy (sem anterior): sai 1 sem reverter", () => {
    const r = run(SHA_A, 7);
    expect(r.status).toBe(1);
    expect(readFileSync(calls, "utf8")).not.toMatch(/TAG= compose/);
  });
});
