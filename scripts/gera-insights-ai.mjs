// Pipeline semanal — gera Insights Automáticos via Claude API e salva cache JSON.
// Executado pelo run-pipeline-sace.bat (toda terça-feira).
// Saída: data/insights_ai_cache.json

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Carrega .env.local manualmente (script CLI, não Next.js) ─────────────────
function carregaEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const linhas = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const linha of linhas) {
    const m = linha.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
carregaEnv();

const CACHE_OUT = path.join(ROOT, "data", "insights_ai_cache.json");
const MODELO    = "claude-sonnet-4-5";

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ── Leitura dos caches de dados ───────────────────────────────────────────────
function lerJSON(relPath) {
  const p = path.join(ROOT, relPath);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; }
}

const anaDiario  = lerJSON("data/ana-diario-cache.json");
const idnSeries  = lerJSON("data/ana-idn-series.json");
const enso       = lerJSON("data/enso_cpc_cache.json");
const sgbCache   = lerJSON("data/boletins_sgb_cache.json");

if (!anaDiario) { log("ERRO: ana-diario-cache.json não encontrado"); process.exit(1); }
if (!idnSeries) { log("ERRO: ana-idn-series.json não encontrado");   process.exit(1); }

// ── Monta contexto para o prompt ──────────────────────────────────────────────
const dados = anaDiario.dados ?? {};
const dataRef = anaDiario.data;

// IDN atual: usa o valor calculado do cache diário (cotasIDN ao vivo = mesma
// fonte do gauge). Cai para o último ponto da série se o campo não existir
// (caches gerados antes desta versão).
const serie30 = (idnSeries.serie ?? []).slice(-30);
const idnSerie = serie30.at(-1)?.idn ?? 0;
const idnAtual = anaDiario.idn_atual ?? idnSerie;

const idnD30  = serie30.at(0)?.idn ?? idnAtual;
const tendIDN = +(idnAtual - idnD30).toFixed(3);

// Máx/mín recentes IDN
const idnsArr = serie30.map(p => p.idn);
const idnMax  = Math.max(...idnsArr).toFixed(3);
const idnMin  = Math.min(...idnsArr).toFixed(3);

// Resumo de cada estação
function resumoEstacao(nome) {
  const d = dados[nome];
  if (!d) return null;
  const sinal = (v) => (v >= 0 ? `+${v}` : `${v}`);
  return `${nome}: ${d.cota_m.toFixed(2)} m (Δ24h ${sinal(d.variacao_24h)} cm | vs 2025: ${sinal(d.delta_2025)} cm | vs 2024: ${sinal(d.delta_2024)} cm)`;
}

const linhasEstacoes = [
  "Manaus","Itacoatiara","Manacapuru",
  "PortoVelho","Humaita","Manicore",
  "Labrea","Curicuriari",
].map(resumoEstacao).filter(Boolean).join("\n");

const boletimLatest = sgbCache?.boletins?.[0];
const boletimStr = boletimLatest
  ? `Último boletim SGB: nº ${boletimLatest.numero} de ${boletimLatest.data}.`
  : "";

const ensoStr = enso
  ? `ENSO — ${enso.status} (CPC/NOAA, ${enso.data_emissao}): ${enso.sintese_pt}`
  : "";

// ── Prompt ────────────────────────────────────────────────────────────────────
const SISTEMA = `Você é o analista hidrológico sênior do Observatório de Infraestrutura de Transportes do IBI (Instituto Brasileiro de Infraestrutura).
Sua missão é produzir insights analíticos semanais sobre a situação das hidrovias amazônicas para operadores logísticos, gestores portuários e analistas de mercado.

Diretrizes editoriais:
- Linguagem direta, técnica e calibrada. Sem alarmismo, sem eufemismo.
- Cite sempre os números concretos. Compare com 2024 e 2025 quando relevante.
- O IDN (Índice de Dessincronização Norte-Sul) mede a divergência entre sub-bacias Norte (Negro/Branco) e Sul (Madeira/Purus). IDN > +0,56 = Driver Norte; IDN < −0,15 = Driver Sul; entre = Sincronizado.
- Fronteiras GMM calibradas (2016–2023): Sul ≤ −0,15; Norte ≥ +0,56.
- Nível 17,7 m em Manaus é a referência regulatória de Baixas Águas (ANTAQ/LWS).
- Priorize o que é acionável para o setor de transporte fluvial.`;

const USUARIO = `Data de referência: ${dataRef}

NÍVEIS DAS ESTAÇÕES (ANA/SNIRH, cache diário):
${linhasEstacoes}

IDN ATUAL: ${idnAtual >= 0 ? "+" : ""}${idnAtual} | Tendência 30d: ${tendIDN >= 0 ? "+" : ""}${tendIDN} | Faixa 30d: [${idnMin}; ${idnMax}]
${boletimStr}
${ensoStr}

Com base nesses dados, gere entre 3 e 6 insights para o painel do Observatório IBI.

Responda EXCLUSIVAMENTE com um array JSON. Cada elemento deve ter exatamente estes campos:
- "tipo": um de "critico" | "alerta" | "info" | "positivo"
- "titulo": string curta (máx 90 caracteres), título do insight
- "texto": string de 1-3 frases com o contexto analítico
- "estacao": (opcional) nome da estação mais relevante

Não inclua markdown, código, comentários ou qualquer texto fora do JSON.`;

// ── Chamada à API ─────────────────────────────────────────────────────────────
async function main() {
  log(`Iniciando geração de insights com ${MODELO}...`);

  const client = new Anthropic();

  const msg = await client.messages.create({
    model:      MODELO,
    max_tokens: 2048,
    system:     SISTEMA,
    messages:   [{ role: "user", content: USUARIO }],
  });

  const raw = msg.content[0]?.text ?? "";
  log(`Resposta recebida (${raw.length} chars, ${msg.usage?.output_tokens ?? "?"} tokens).`);

  // Extrai JSON da resposta (tolera markdown ```json ... ```)
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) ?? raw.match(/(\[[\s\S]*\])/);
  const jsonStr = jsonMatch ? jsonMatch[1] : raw.trim();

  let insights;
  try {
    insights = JSON.parse(jsonStr);
    if (!Array.isArray(insights)) throw new Error("Resposta não é um array");
  } catch (e) {
    log(`ERRO ao parsear JSON: ${e.message}`);
    log(`Raw: ${raw.slice(0, 500)}`);
    process.exit(1);
  }

  // Valida campos obrigatórios
  const TIPOS_VALIDOS = ["critico", "alerta", "info", "positivo"];
  insights = insights.filter(ins => {
    if (!TIPOS_VALIDOS.includes(ins.tipo)) { log(`Descartando insight com tipo inválido: ${ins.tipo}`); return false; }
    if (!ins.titulo || !ins.texto) { log("Descartando insight sem titulo/texto"); return false; }
    return true;
  });

  log(`${insights.length} insights validados.`);

  const cache = {
    gerado_em: new Date().toISOString(),
    modelo:    MODELO,
    data_ref:  dataRef,
    insights,
  };

  fs.writeFileSync(CACHE_OUT, JSON.stringify(cache, null, 2), "utf-8");
  log(`Cache salvo em ${CACHE_OUT}`);
}

main().catch(e => { log(`ERRO FATAL: ${e.message}`); process.exit(1); });
