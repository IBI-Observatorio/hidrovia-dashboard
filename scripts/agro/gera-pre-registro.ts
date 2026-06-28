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
  FAIXAS_IEE, FATOR_UTILIZACAO_EMBARQUE, JANELA_CHEGADAS_F, HINTERLANDIA, PARTICIPACAO_PORTO,
  JANELA_SAZONAL_SEMANAS, MIN_OBS_PERCENTIL, MIN_SAFRAS_PERCENTIL,
  PARAMETROS_CUSTEIO_V0, PERFIL_VEICULO_PADRAO, PERFIS_VEICULO,
  PESOS_H_INTERNO, PESOS_IEE, PORTOS_ARCO_NORTE, ROTAS_T,
  THRESHOLD_COLISAO_PCT, URGENCIA_CALADO_DIAS_MAX, HORIZONTE_IEE_MAIS,
} from "../../lib/iee-params";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQ = join(RAIZ, "data", "agro", "pre-registro-iee-v8.json");

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
    fatorUtilizacaoEmbarque: FATOR_UTILIZACAO_EMBARQUE,
    janelaChegadasF: JANELA_CHEGADAS_F,
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
    versao: "v8",
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
      "Continua aberto (lacuna, tratado no v5): o NOWCAST de embarcado (fator ×0,7) do S.",
    ],
    changelogV4paraV5: [
      "Pilar S — fator de utilização do NOWCAST de embarque CALIBRADO contra o realizado da ANTAQ. Sai o 0,70 chutado, entra a utilização média dos portos na janela de escoamento (fev–jul): Santos 0,89 · Paranaguá 0,92 · Arco Norte 0,87 (FATOR_UTILIZACAO_EMBARQUE, por corredor). Fonte: Estatística Aquaviária (data/antaq/capacidade-semanal.json → serieMensalMilT); gerador scripts/agro/calibra-utilizacao-embarque.py.",
      "O 0,70 subestimava o embarcado → inflava o excedente. Com a calibração, o S de Santos cai de ~44 para ~40 'semanas de excedente'. Fecha a última lacuna de parâmetro chutado do S.",
      "SIMPLIFICAÇÃO declarada que permanece: fator plano por corredor (a utilização real varia ~0,7→0,99 ao longo da safra; perfil sazonal e o embarcado real onde a EA já cobre ficam para refinamento). E a defasagem ~3-4m da EA mantém o caráter de nowcast.",
    ],
    changelogV5paraV6: [
      "Pilar F de SANTOS reconstruído: deixa o line-up ao vivo (APS/DIOPE — sem histórico longo, percentil em calibração, peso subaproveitado) e passa a ser a PRESSÃO DE CHEGADAS da ANTAQ — nº de graneleiros de grão que chegam por semana (data/antaq/espera-semanal.json, campo `n`), em soma móvel de JANELA_CHEGADAS_F=4 semanas. Série 2016→2026. O line-up segue exibido como cor ('navios hoje'), sem alimentar o percentil. Paranaguá/Arco Norte mantêm o F do line-up.",
      "Por que é honesto (sem leakage): a chegada é FLUXO de demanda e NÃO usa a TEsperaAtracacao (o alvo). A previsão F(t)→espera(t+2) é, portanto, fora-de-amostra na variável-alvo. Evidência: scripts/backtest/iee-f-chegadas.ts — soma-4sem dá Spearman 0,37 vs espera t+2 na série cheia (525 sem); o estoque-de-fila reconstruído (que usaria a espera) seria parcialmente autoregressivo e foi descartado.",
      "Pesos do IEE-SANTOS recalibrados COM o F validado (sweep F×T×S, scripts/backtest/iee-v4-pesos-f.ts): F/T/S de 0,25/0,60/0,15 (efetivo v3 sem F) → 0,50/0,40/0,10. F sozinho é o melhor preditor isolado da fila (Spearman 0,62 recente / 0,37 cheio, vs T 0,50); composto sobe de 0,43 (v3) para 0,58 (MAE 24,2→21,9). T (0,40) ancora o NÍVEL (melhor MAE isolado); S (0,10) residual (sinal ~nulo), mantido simbólico por amplitude narrativa.",
      "CAVEAT registrado: sweep de pesos IN-SAMPLE, n≈46 na janela onde os 3 pilares coexistem (limitada pela série curta do diesel ANP), SE±0,15. O número conservador do F é o da série cheia (0,37), não o recente (0,62). NOWCAST: a EA defasa ~3-4 meses, então a leitura corrente do F é a última semana com dado da EA (como o S). Refinamento futuro: reconstruir a pressão de chegadas em TONELAGEM e estendê-la com dado mais fresco.",
      "F de PARANAGUÁ também migrado para a pressão de chegadas ANTAQ (mesmo método de Santos): sinal fraco mas positivo na previsão da fila (Spearman 0,17 em t+2; 0,22 em t+0/t+1, evidência scripts/backtest/iee-f-chegadas.ts) e com 10 anos de história, melhor que o line-up APPA sem histórico. Pesos de Paranaguá NÃO recalibrados (seguem v0, não-validados) — calibração própria é tarefa à parte. Mudança de FONTE do pilar, não de parâmetro hasheado → hash do pré-registro inalterado.",
      "F de ARCO NORTE NÃO migrado, por decisão guiada pelo dado: a pressão de chegadas NÃO prevê a fila do Arco Norte (Spearman 0,06 em t+2 ≈ ruído), pois o gargalo do corredor é HIDROLÓGICO (calado do Tabocal, pilar H), não congestão de berço por chegadas. Mantém o F do line-up (EMAP+CDP; Miritituba/Santarém sem line-up público → parcial).",
    ],
    changelogV6paraV7: [
      "Pesos do IEE-PARANAGUÁ CALIBRADOS contra a espera EA de Paranaguá em t+2 (sweep F×T×S, scripts/backtest/iee-pesos-paranagua.ts) — antes eram v0 chutados e nunca validados. F/T/S 0,40/0,35/0,25 → 0,50/0,40/0,10 (alinhado ao Santos). Mesmo padrão: F é o melhor preditor isolado (Spearman 0,28), T ancora o nível, S tem sinal NEGATIVO na fila (−0,23) → residual, mantido simbólico por amplitude narrativa.",
      "CAVEAT CENTRAL declarado: a validade preditiva do IEE-Paranaguá é FRACA — composto Spearman ~0,23 (MAE 19,0), vs 0,58 do Santos. Todos os combos de peso ficam dentro de 1 SE entre si (n≈45). A fila de Paranaguá é sabidamente dirigida também por chuva/parada operacional e alocação de berço (fatores fora do F/T/S agrícola). Os pesos refletem a evidência (S desce, F lidera), mas a leitura de Paranaguá deve ser comunicada como RADAR de baixa validade preditiva, não previsão forte.",
      "Estrutura de Paranaguá já estava sólida e fica MANTIDA: rotas T (Cascavel/Maringá/Ponta Grossa/Londrina × bitrem), hinterlândia PR/SC × participação Comex (PR 0,68 / SC 0,17), capacidade ANTAQ, fator de embarque 0,92. A correção do corredor é de PESOS + declaração de validade, não estrutural.",
      "Métrica-alvo de Paranaguá agora PUBLICADA no backtest final (antes só Santos). Arco Norte segue sem métrica-alvo própria publicada (F no line-up, sem composição validada).",
    ],
    changelogV7paraV8: [
      "PARÂMETROS E PESOS: INALTERADOS vs v7 (hash sha256 IDÊNTICO). Esta versão NÃO é recalibração — revisa SOMENTE o ESCOPO de um episódio-âncora. O bump existe para tornar a mudança de critério do gate de publicação auditável, como exige o pré-registro.",
      "Episódio-âncora pico-safra-2026 RE-ESCOPADO: o critério P_S ≥ 95 (percentil sazonal walk-forward) deixa de bloquear PARANAGUÁ e permanece bloqueante só para SANTOS. Paranaguá vira episódio REGISTRADO (não verificável até ≥3 safras), na entrada pico-safra-2026-paranagua.",
      "Razão (sem mover trave): o percentil sazonal exige ≥3 safras de histórico (MIN_SAFRAS_PERCENTIL=3); a série Conab de Paranaguá começa em abr/2025 (~1 safra), então o percentil de abr–mai é instável a revisões de levantamento da Conab — caiu de 100 para 50 entre o 8º e o 9º levantamento 2025/26 SEM mudança de pressão real (o S BRUTO de abr seguiu a 99% do pico próprio de Paranaguá). O que não é confiável é o PERCENTIL de série curta, não a pressão de safra. Demote alinha com o compromisso já vigente ('séries com <3 safras: calibração em construção').",
      "Santos (série madura, percentil estável em 100 no pico) segue como o teste DURO verificável do pico de safra. Reavaliar Paranaguá como verificável quando acumular ≥3 safras.",
      "Efeito operacional: o gate semanal do CI (scripts/backtest/iee-final.ts) deixa de ser bloqueado por instabilidade de percentil de série curta de Paranaguá; o commit diário de dados volta a fluir.",
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
      { id: "pico-safra-2026", janela: "2026-02 a 2026-05", pilar: "S", criterio: "P_S ≥ 95 no pico da colheita de soja (SANTOS — série madura, ≥3 safras)", status: "verificável — testado no backtest" },
      { id: "pico-safra-2026-paranagua", janela: "2026-02 a 2026-05", pilar: "S", criterio: "P_S de Paranaguá no pico — REGISTRADO, não bloqueia (v8): o percentil sazonal exige ≥3 safras e a série Conab de Paranaguá tem ~1 ano; o S bruto de abr está a 99% do pico próprio (pressão presente), mas o percentil é instável a revisões de levantamento. Reavaliar como verificável com ≥3 safras.", status: "registrado — não verificável até ≥3 safras" },
      { id: "dez-2025-fila-santos", janela: "2025-12", pilar: "F", criterio: "fila 100+ navios deve elevar P_F", status: "VERIFICADO CONTRA EA NO V1: espera ≈ média de 2025 — não confirmado como excepcional; substituído (ver out-2023)" },
      { id: "out-2023-espera-recorde", janela: "2023-08 a 2023-11", pilar: "métrica-alvo", criterio: "≥4 das 5 maiores esperas da série EA 2016–2026 caem na janela (critério factual, sem limiar arbitrário)", status: "verificável — testado no backtest" },
      { id: "jan-2025-salto-frete", janela: "2025-01", pilar: "T(mercado)", criterio: "fora do alvo: T é CUSTO modelado, não frete negociado", status: "fora de escopo declarado" },
    ],
    lacunasConhecidas: [
      "F de Santos e Paranaguá (v6): PRESSÃO DE CHEGADAS da ANTAQ (soma móvel 4 sem de graneleiros chegando), série 2016→2026, percentil sazonal walk-forward. É FLUXO antecedente da fila (sem leakage com o alvo), não o estoque de navios parados. Sinal em t+2: Santos 0,37 (forte) · Paranaguá 0,17 (fraco mas positivo). NOWCAST: a EA defasa ~3-4 m, então a leitura corrente é a última semana com dado. O line-up (APS/DIOPE; APPA) entra só como cor ('navios hoje'). Pesos de Paranaguá CALIBRADOS no v7 (F0,50/T0,40/S0,10), com validade preditiva FRACA declarada (~0,23). Refinamento: versão em TONELAGEM + dado mais fresco.",
      "F de Arco Norte: MANTIDO no line-up ao vivo (EMAP+CDP; Miritituba/Santarém sem line-up público → parcial). Não migrado para chegadas ANTAQ porque a pressão de chegadas não prevê a fila do corredor (Spearman 0,06) — seu gargalo é hidrológico (pilar H/Tabocal), não congestão de berço.",
      "Nowcast de embarque do S: fator de utilização CALIBRADO contra a EA (Santos 0,89 · Pgua 0,92 · AN 0,87, v5). Resta o caráter de nowcast (a EA defasa ~3-4 meses, então a safra corrente é estimada) e a simplificação de fator plano (utilização real varia ao longo da safra).",
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
