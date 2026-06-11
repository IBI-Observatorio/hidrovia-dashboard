// scripts/agro/gera-pre-registro.ts
// PASSO 8 — PRÉ-REGISTRO público do IEE v0.
//
// Congela em data/agro/pre-registro-iee-v0.json:
//   - TODOS os parâmetros declarados do IEE (pesos, custeio, capacidades,
//     hinterlândias, rotas, faixas, thresholds) lidos de lib/iee-params.ts;
//   - hash SHA-256 do snapshot canônico (prova de integridade);
//   - os COMPROMISSOS de calibração (o que pode mudar, sob qual critério);
//   - métrica-alvo, episódios-âncora e lacunas conhecidas.
//
// MODOS:
//   npx tsx scripts/agro/gera-pre-registro.ts            → verifica drift
//   npx tsx scripts/agro/gera-pre-registro.ts --congelar → (re)escreve o registro
//
// A verificação de drift falha (exit 1) se os parâmetros correntes do código
// divergirem do snapshot congelado — mudou parâmetro sem novo pré-registro,
// quebrou o compromisso. Rode no CI junto do build.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CAPACIDADE_SEMANAL_MIL_T, COMPONENTES_POR_CORREDOR, CUSTO_DEMURRAGE_DIA_USD,
  FAIXAS_IEE, FATOR_UTILIZACAO_EMBARQUE_V0, HINTERLANDIA,
  JANELA_SAZONAL_SEMANAS, MIN_OBS_PERCENTIL, MIN_SAFRAS_PERCENTIL,
  PARAMETROS_CUSTEIO_V0, PERFIL_VEICULO_PADRAO, PERFIS_VEICULO,
  PESOS_H_INTERNO, PESOS_IEE, PORTOS_ARCO_NORTE, ROTAS_T,
  THRESHOLD_COLISAO_PCT, URGENCIA_CALADO_DIAS_MAX, HORIZONTE_IEE_MAIS,
} from "../../lib/iee-params";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ = join(RAIZ, "data", "agro", "pre-registro-iee-v0.json");

function snapshotParametros() {
  return {
    pesosIEE: PESOS_IEE,
    componentesPorCorredor: COMPONENTES_POR_CORREDOR,
    pesosHInterno: PESOS_H_INTERNO,
    hinterlandia: HINTERLANDIA,
    capacidadeSemanalMilT: CAPACIDADE_SEMANAL_MIL_T,
    portosArcoNorte: PORTOS_ARCO_NORTE,
    rotasT: ROTAS_T,
    perfilVeiculoPadrao: PERFIL_VEICULO_PADRAO,
    perfisVeiculo: PERFIS_VEICULO,
    parametrosCusteioV0: PARAMETROS_CUSTEIO_V0,
    custoDemurrageDiaUSD: CUSTO_DEMURRAGE_DIA_USD,
    fatorUtilizacaoEmbarqueV0: FATOR_UTILIZACAO_EMBARQUE_V0,
    urgenciaCaladoDiasMax: URGENCIA_CALADO_DIAS_MAX,
    thresholdColisaoPct: THRESHOLD_COLISAO_PCT,
    faixasIEE: FAIXAS_IEE,
    normalizacao: {
      janelaSazonalSemanas: JANELA_SAZONAL_SEMANAS,
      minSafrasPercentil: MIN_SAFRAS_PERCENTIL,
      minObsPercentil: MIN_OBS_PERCENTIL,
      horizonteIEEMais: HORIZONTE_IEE_MAIS,
    },
  };
}

/** JSON canônico (chaves ordenadas) p/ hash estável. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object).sort().map((k) =>
      `${JSON.stringify(k)}:${canonico((v as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

function main() {
  const congelar = process.argv.includes("--congelar");
  const parametros = snapshotParametros();
  const hash = createHash("sha256").update(canonico(parametros)).digest("hex");

  if (!congelar) {
    let registro: { hashParametros?: string; congeladoEm?: string } | null = null;
    try { registro = JSON.parse(readFileSync(ARQ, "utf8")); } catch { /* ausente */ }
    if (!registro) {
      console.error("[pre-registro] AUSENTE — rode com --congelar para criar.");
      process.exitCode = 1;
      return;
    }
    if (registro.hashParametros === hash) {
      console.log(`[pre-registro] OK — parâmetros íntegros (congelado em ${registro.congeladoEm}, sha256 ${hash.slice(0, 12)}…)`);
    } else {
      console.error("[pre-registro] DRIFT DETECTADO — os parâmetros do código divergem do snapshot congelado.");
      console.error(`  congelado: ${registro.hashParametros?.slice(0, 16)}…  ·  corrente: ${hash.slice(0, 16)}…`);
      console.error("  Mudar parâmetro exige NOVO pré-registro versionado (v0 → v1) com justificativa");
      console.error("  e evidência de melhoria out-of-sample — não sobrescreva silenciosamente.");
      process.exitCode = 1;
    }
    return;
  }

  const registro = {
    indice: "IEE — Índice de Estresse de Escoamento",
    versao: "v0",
    congeladoEm: new Date().toISOString().slice(0, 10),
    hashParametros: hash,
    algoritmoHash: "sha256 do JSON canônico (chaves ordenadas) do bloco `parametros`",
    compromissos: [
      "Os pesos do IEE (F/T/S/H por corredor) e os pesos internos do H são JULGAMENTO v0 declarado e permanecem FIXOS até calibração pré-registrada.",
      "Critério de substituição: pesos calibrados (wₖ ≥ 0, Σwₖ = 1) só substituem os v0 se reduzirem o MAE out-of-sample em validação walk-forward contra a métrica-alvo.",
      "Métrica-alvo: o IEE da semana t deve prever o tempo médio de espera no line-up em t+2. HOJE NÃO COMPUTÁVEL: exige histórico de fila (F) que só começou a acumular em 10/06/2026 — registrado como critério futuro, não como número.",
      "Nenhum coeficiente é ajustado retroativamente para 'encaixar' episódio. Episódio não acusado é reportado e bloqueia publicação da leitura retroativa, nunca corrigido por ajuste de peso.",
      "Percentis são walk-forward (sem lookahead); séries com menos de 3 safras usam z robusto (mediana/MAD) e carregam o rótulo 'calibração em construção' na interface.",
      "Toda mudança de parâmetro gera novo pré-registro versionado (hash novo), com diff e justificativa públicas.",
    ],
    episodiosAncora: [
      { id: "out-2024-seca-tabocal", janela: "2024-09-25 a 2024-11-15", pilar: "H", criterio: "percentil walk-forward médio ≥ 90 e P_H bruto máx ≥ 80", status: "verificável — testado no backtest" },
      { id: "mar-2026-choque-diesel", janela: "2026-03-14 em diante", pilar: "T", criterio: "P_T = 100 a partir do salto ANP (R$ 6,15 → 7,58/L)", status: "verificável — testado no backtest" },
      { id: "pico-safra-2026", janela: "2026-02 a 2026-05", pilar: "S", criterio: "P_S ≥ 95 no pico da colheita de soja (Santos e Paranaguá)", status: "verificável — testado no backtest" },
      { id: "dez-2025-fila-santos", janela: "2025-12", pilar: "F", criterio: "fila 100+ navios deve elevar P_F", status: "NÃO VERIFICÁVEL — sem histórico de line-up (PASSO 2 pendente); lacuna estrutural declarada" },
      { id: "jan-2025-salto-frete", janela: "2025-01", pilar: "T(mercado)", criterio: "fora do alvo: T é CUSTO modelado, não frete negociado", status: "fora de escopo declarado" },
    ],
    lacunasConhecidas: [
      "F de Santos: ilustrativo (scraper de line-up DIOPE é o PASSO 2 pendente).",
      "F do Arco Norte: PARCIAL — EMAP + CDP; Miritituba/Santarém sem line-up público.",
      "F sem retroativo em todos os corredores: histórico nasce em 10/06/2026.",
      "Proxy de embarque do S: capacidade × utilização declarada até o acumulado ANTAQ real.",
      "Denominadores de capacidade: declarados por ordem de grandeza ANTAQ até a agregação da Estatística Aquaviária (script parametrizado já existe, agregação TODO).",
      "MT inteiro nas hinterlândias de Santos E Arco Norte (proxy declarado; split municipal na v1).",
      "Coeficientes de custeio do T: premissas IBI v0, sem validação contra frete praticado (aguarda convênio).",
    ],
    invalidaPublicacao: [
      "Episódio-âncora verificável não acusado no backtest.",
      "Drift de parâmetros sem novo pré-registro (verificação por hash).",
      "Dado ilustrativo ou indisponível exibido sem rótulo na interface.",
    ],
    parametros,
  };
  mkdirSync(dirname(ARQ), { recursive: true });
  writeFileSync(ARQ, JSON.stringify(registro, null, 1).replace(/\n +(?=[\d"[\]{},.-])/g, "") + "\n");
  console.log(`[pre-registro] CONGELADO — ${ARQ.split("/").pop()} · sha256 ${hash.slice(0, 16)}… · ${registro.congeladoEm}`);
}
main();
