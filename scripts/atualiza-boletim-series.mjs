// Memória semanal do boletim de cabotagem.
// Lê as saídas do modelo (projeção multi-driver + calibração CMR→carga) e
// acrescenta UMA entrada compacta a data/boletim-cabotagem-series.json — a série
// versionada em git (padrão append-only de ana-idn-series.json) que dá ao
// SUPERVISOR contra o que comparar semana a semana.
//
// Idempotente: re-rodar a mesma data_referencia deixa o arquivo byte-idêntico
// (não reescreve se a série não mudou) → o `git diff --quiet` do workflow funciona.
//
//   node scripts/atualiza-boletim-series.mjs
//     -> data/boletim-cabotagem-series.json
//
// Sem dependências (Node builtins) — igual a atualiza-idn-series.mjs.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = (p) => join(ROOT, p);
const lerJSON = (p) => JSON.parse(readFileSync(r(p), "utf8"));
const lerJSONopcional = (p) => { try { return lerJSON(p); } catch { return null; } };
const round = (x, n = 2) => (x == null ? null : +Number(x).toFixed(n));

// --- 1. Entradas (modelo: obrigatórias; contexto: opcionais) ----------------
const proj = lerJSON("data/projecao-multidriver-itacoatiara.json");
const cal = lerJSON("data/calibracao-cmr-cabotagem.json");
const enso = lerJSONopcional("data/enso_cpc_cache.json");
const sgbCache = lerJSONopcional("data/boletins_sgb_cache.json");

const sgbNumero = (() => {
  const bs = sgbCache?.boletins;
  if (!Array.isArray(bs) || bs.length === 0) return null;
  return Math.max(...bs.map((b) => Number(b.numero)).filter((n) => Number.isFinite(n)));
})();

// --- 2. Entrada compacta da semana ------------------------------------------
const rc = cal.restricao_calado ?? {};
const z = proj.z_2026 ?? {};
const pc = proj.projecao_cmr_2026 ?? {};
const cx = proj.cruzamento_cmr11 ?? {};
const ev = cal.esperanca_ponderada ?? {};

const entrada = {
  data_referencia: proj.data_referencia,
  ao_vivo: proj.ao_vivo ?? null,
  z_2026: {
    MAO: round(z.MAO), BOR: round(z.BOR), MNC: round(z.MNC), ITA: round(z.ITA),
  },
  // só ano+peso (deixa o snapshot compacto; o z por análogo fica no JSON do modelo)
  analogos_top: (proj.analogos_top ?? []).map((a) => ({ ano: a.ano, peso: round(a.peso, 3) })),
  projecao_cmr_2026: {
    central: round(pc.central), pessimista: round(pc.pessimista), otimista: round(pc.otimista),
  },
  ita_min_central: round(proj.ita_min_central),
  cruzamento_cmr11: { central: cx.central ?? null, cedo: cx.cedo ?? null, tarde: cx.tarde ?? null },
  restricao: {
    p10: rc.p10 ?? null, p50: rc.p50 ?? null, p90: rc.p90 ?? null,
    prob: rc.prob ?? null, ano_analogo: rc.ano_analogo ?? null,
  },
  esperanca_ponderada: { delta_pct_2025: round(ev.delta_pct_2025, 4), teu: ev.teu ?? null },
  // separa "modelo mudou" de "rio mudou": nível de calado lido hoje
  cmr_atual: round(rc.cmr_atual),
  cota_ita_atual: round(rc.cota_ita_atual),
  // contexto p/ o supervisor checar divergência com a fonte oficial
  contexto: {
    sgb_numero: sgbNumero,
    enso_status: enso?.status ?? null,
    enso_data_emissao: enso?.data_emissao ?? null,
  },
};

if (!entrada.data_referencia) {
  console.error("ERRO: projecao-multidriver-itacoatiara.json sem data_referencia — abortando.");
  process.exit(1);
}

// --- 3. Merge idempotente por data_referencia -------------------------------
const FILE = "data/boletim-cabotagem-series.json";
const existente = existsSync(r(FILE)) ? lerJSON(FILE) : { gerado_em: "", serie: [] };
const mapa = new Map((existente.serie ?? []).map((e) => [e.data_referencia, e]));
mapa.set(entrada.data_referencia, entrada); // substitui a semana se já existir
const serie = [...mapa.values()].sort((a, b) => a.data_referencia.localeCompare(b.data_referencia));

// Não reescreve se a série ficou idêntica (re-run no mesmo dia = arquivo intacto).
const serieAntiga = JSON.stringify(existente.serie ?? []);
const serieNova = JSON.stringify(serie);
if (serieAntiga === serieNova) {
  console.log(`sem mudança — série já contém ${entrada.data_referencia} idêntica (${serie.length} entradas). Arquivo intacto.`);
  process.exit(0);
}

mkdirSync(r("data"), { recursive: true });
writeFileSync(r(FILE), JSON.stringify({ gerado_em: new Date().toISOString(), serie }, null, 2), "utf8");
console.log(`OK -> ${FILE}`);
console.log(`  ${entrada.data_referencia}: CMR central ${entrada.projecao_cmr_2026.central} | restrição ${entrada.restricao.p50} (prob ${entrada.restricao.prob}) | análogos ${entrada.analogos_top.map((a) => a.ano).join(",")} | SGB nº${sgbNumero} | ENSO ${entrada.contexto.enso_status}`);
console.log(`  série agora com ${serie.length} entrada(s).`);
