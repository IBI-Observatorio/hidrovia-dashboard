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
import capacidadeAntaq from "../../data/antaq/capacidade-semanal.json";
import {
  CAPACIDADE_SEMANAL_MIL_T, COMPONENTES_POR_CORREDOR, CUSTO_DEMURRAGE_DIA_USD,
  FAIXAS_IEE, FATOR_UTILIZACAO_EMBARQUE_V0, HINTERLANDIA, PARTICIPACAO_PORTO,
  JANELA_SAZONAL_SEMANAS, MIN_OBS_PERCENTIL, MIN_SAFRAS_PERCENTIL,
  PARAMETROS_CUSTEIO_V0, PERFIL_VEICULO_PADRAO, PERFIS_VEICULO,
  PESOS_H_INTERNO, PESOS_IEE, PORTOS_ARCO_NORTE, ROTAS_T,
  THRESHOLD_COLISAO_PCT, URGENCIA_CALADO_DIAS_MAX, HORIZONTE_IEE_MAIS,
} from "../../lib/iee-params";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ = join(RAIZ, "data", "agro", "pre-registro-iee-v4.json");

function snapshotParametros() {
  // capacidades REAIS (ANTAQ EA) entram no snapshot congelado: são parte da
  // verdade comprometida do v1 — mudar o cache sem novo registro = drift.
  const capAntaq = (capacidadeAntaq as { status: string; corredores?: Record<string, { capacidadeSemanalMilT: number; dadosAte: string }> });
  const capacidadesAntaqEA = capAntaq.status === "ok"
    ? Object.fromEntries(Object.entries(capAntaq.corredores ?? {}).map(([c, v]) => [c, { capacidadeSemanalMilT: v.capacidadeSemanalMilT, dadosAte: v.dadosAte }]))
    : null;
  return {
    capacidadesAntaqEA,
    pesosIEE: PESOS_IEE,
    componentesPorCorredor: COMPONENTES_POR_CORREDOR,
    pesosHInterno: PESOS_H_INTERNO,
    hinterlandia: HINTERLANDIA,
    participacaoPorto: PARTICIPACAO_PORTO,
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
    versao: "v4",
    changelogV0paraV1: [
      "Capacidades semanais: parâmetros declarados (1300/450/1000) SUBSTITUÍDOS pela agregação real da Estatística Aquaviária ANTAQ (1567/597/883 mil t/sem, média 12m até 2026-02) — leitura 'cache ok → cache; senão declarado'.",
      "Métrica-alvo torna-se COMPUTÁVEL: TEsperaAtracacao (EA) por semana, 2016→2026; baseline Spearman/MAE registrado no backtest final.",
      "Episódio-âncora dez/2025 (fila 100+) verificado contra a EA e NÃO CONFIRMADO como excepcional (espera ≈ média de 2025); substituído pela referência out/2023 (espera recorde ~397 h) — diff documentado, sem ajuste de pesos.",
      "F de Santos sai de ilustrativo para REAL (line-up APS/DIOPE, PASSO 2).",
    ],
    changelogV1paraV2: [
      "Calibração do T contra fonte primária (dossiê docs/calibracao-T-frete.md): diesel default 6,10→7,00 R$/L (ANP revenda S10 jun/2026; runtime já usa ANP ao vivo) e pedágio 0,07→0,05 R$/km/eixo (0,07 era teto BR-163/MT; 0,05 = média de rede). RECONCILIA o drift introduzido sem novo pré-registro na calibração anterior.",
      "Carga útil dos perfis: rodotrem 50→48 t e bitrem 37→36 t (grão líquido real descontada a tara; 50/37 eram teto otimista). Reescala constante por corredor → percentil INVARIANTE (não altera vereditos do backtest).",
      "Validação externa registrada: custo modelo IBI (~R$ 410/t Sorriso→Santos) ≈ piso regulado ANTT (~R$ 407/t) < frete de mercado SIFRECA (~R$ 480–530/t).",
      "Rótulo do denominador: 'capacidade' → 'vazão média de embarque' (é throughput EA realizado, não capacidade nominal). Sem mudança de valor.",
      "Faixa do card suavizada para 'leitura inicial' (não 'Crítico') enquanto a série tem <3 safras.",
    ],
    changelogV2paraV3: [
      "Pesos do IEE-SANTOS recalibrados contra a métrica-alvo (espera EA t+2): F/T/S de 0,40/0,35/0,25 → 0,25/0,60/0,15. Evidência: scripts/backtest/iee-v3-pesos.ts — no sweep T×S, mais peso no T melhora monotonicamente o Spearman do composto (0,23 nos pesos antigos → ~0,5 com T dominante); o S entra com sinal fraco/negativo na previsão da fila. F mantido em 0,25 (é a própria fila; deve prever bem quando o histórico acumular).",
      "CAVEAT registrado: seleção de peso IN-SAMPLE, n≈46 (SE do Spearman ≈ ±0,15) — o sentido (mais T) é firme; o número exato é sugestivo. Filosofia adotada: ainda é radar amplo (F/T/S compostos), só com T protagonista; S permanece residual, não eliminado.",
      "Escopo: SÓ Santos. Paranaguá e Arco Norte mantêm pesos v0 (sem dado de validação próprio).",
      "Pilares F/T/S/H seguem percentil walk-forward; reponderar não altera os percentis dos pilares, logo os episódios-âncora (P_S, P_T, P_H) seguem verificáveis.",
    ],
    changelogV3paraV4: [
      "Pilar S — RESOLVIDA a dupla contagem de MT (estrutural). Nova matriz PARTICIPACAO_PORTO (origem→porto) escala a produção de cada UF pela fração que de fato sai por cada corredor. Fonte PRIMÁRIA: Comex Stat/MDIC, exportação 2023-2024, NCM soja+milho, state × URF (gerador scripts/comex/gera-participacao.py; dados brutos em data/comex/).",
      "MT deixa de ser contado 100% em Santos E 100% no Arco Norte: agora 43% Santos / 52% Arco Norte (≈ split IMEA soja~41%/milho~61% AN). Demais frações declaradas na matriz (SP 0,81; GO 0,73; MG 0,76; MS 0,14 Santos; PR 0,68; SC 0,17 Pgua; PA/MA/RO ~1,0; TO 0,97; PI 0,96 AN).",
      "Efeito: o 'semanas de excedente' do S deixa de ser inflado pela hinterlândia inteira ÷ um porto. Resolve a lacuna 'MT inteiro nas duas hinterlândias' declarada no v1.",
      "Continua aberto (lacuna): o NOWCAST de embarcado (proxy ×0,7) do S — independente desta correção.",
    ],
    congeladoEm: new Date().toISOString().slice(0, 10),
    hashParametros: hash,
    algoritmoHash: "sha256 do JSON canônico (chaves ordenadas) do bloco `parametros`",
    compromissos: [
      "Os pesos do IEE (F/T/S/H por corredor) e os pesos internos do H são JULGAMENTO v0 declarado e permanecem FIXOS até calibração pré-registrada.",
      "Critério de substituição: pesos calibrados (wₖ ≥ 0, Σwₖ = 1) só substituem os v0 se reduzirem o MAE out-of-sample em validação walk-forward contra a métrica-alvo.",
      "Métrica-alvo: o IEE da semana t deve prever o tempo médio de espera no line-up em t+2, medido pela TEsperaAtracacao da Estatística Aquaviária ANTAQ (atracações com grão embarcado). Baseline v1 (Spearman/MAE) registrado no backtest final.",
      "Nenhum coeficiente é ajustado retroativamente para 'encaixar' episódio. Episódio não acusado é reportado e bloqueia publicação da leitura retroativa, nunca corrigido por ajuste de peso.",
      "Percentis são walk-forward (sem lookahead); séries com menos de 3 safras usam z robusto (mediana/MAD) e carregam o rótulo 'calibração em construção' na interface.",
      "Toda mudança de parâmetro gera novo pré-registro versionado (hash novo), com diff e justificativa públicas.",
    ],
    episodiosAncora: [
      { id: "out-2024-seca-tabocal", janela: "2024-09-25 a 2024-11-15", pilar: "H", criterio: "percentil walk-forward médio ≥ 90 e P_H bruto máx ≥ 80", status: "verificável — testado no backtest" },
      { id: "mar-2026-choque-diesel", janela: "2026-03-14 em diante", pilar: "T", criterio: "P_T = 100 a partir do salto ANP (R$ 6,15 → 7,58/L)", status: "verificável — testado no backtest" },
      { id: "pico-safra-2026", janela: "2026-02 a 2026-05", pilar: "S", criterio: "P_S ≥ 95 no pico da colheita de soja (Santos e Paranaguá)", status: "verificável — testado no backtest" },
      { id: "dez-2025-fila-santos", janela: "2025-12", pilar: "F", criterio: "fila 100+ navios deve elevar P_F", status: "VERIFICADO CONTRA EA NO V1: espera ≈ média de 2025 — não confirmado como excepcional; substituído (ver out-2023)" },
      { id: "out-2023-espera-recorde", janela: "2023-08 a 2023-11", pilar: "métrica-alvo", criterio: "≥4 das 5 maiores esperas da série EA 2016–2026 caem na janela (critério factual, sem limiar arbitrário)", status: "verificável — testado no backtest" },
      { id: "jan-2025-salto-frete", janela: "2025-01", pilar: "T(mercado)", criterio: "fora do alvo: T é CUSTO modelado, não frete negociado", status: "fora de escopo declarado" },
    ],
    lacunasConhecidas: [
      "F de Santos: REAL (esperados-carga APS/DIOPE) — fundeados/atracados sem mercadoria pública ficam fora da fila v1 (documentado).",
      "F do Arco Norte: PARCIAL — EMAP + CDP; Miritituba/Santarém sem line-up público.",
      "F sem retroativo em todos os corredores: histórico nasce em 10/06/2026.",
      "Nowcast de embarque do S: capacidade × utilização (0,7) — a EA traz o embarcado real mas com defasagem ~3-4 meses, então a safra corrente é estimada. v1 do S deve calibrar o 0,7 contra o realizado da EA.",
      "Denominador do S/F é VAZÃO MÉDIA de embarque (ANTAQ EA, média 12m até 2026-02), não capacidade nominal/de pico — throughput é limitado pela demanda (denominador parcialmente endógeno); rotulado como 'vazão' na interface.",
      "S: dupla contagem de MT RESOLVIDA no v4 (matriz PARTICIPACAO_PORTO do Comex Stat). Resta a granularidade municipal (a alocação é por UF×porto, não por microrregião) — refinamento futuro.",
      "Coeficientes internos de custeio do T (custo fixo, manutenção/km, pneu): premissas IBI, sem fonte pública livre; validados no AGREGADO pela triangulação ANTT/SIFRECA (dossiê).",
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
