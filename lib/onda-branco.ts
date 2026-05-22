// Detector "Onda Surpresa Branco" — monitora a taxa de variação de Caracaraí
// (estação Rio Branco, código ANA 14710000) como sinal antecipado para o pico
// de cheia em Manaus.
//
// Por que: o Rio Branco é tributário maior do Negro (drena Roraima). Uma subida
// forte e atípica em Caracaraí em ~7-10 dias indica uma onda de cheia
// extra que viajará pelo Branco → Negro → Manaus em ~3-5 semanas.
//
// V2 — calibração MENSAL (`scripts/calibra-onda-branco-doy.mjs`):
//   - P85/P95 por mês (1..12) corrigem viés do limiar global. Maio (cheia
//     natural) tem P85=2,18m; out (estiagem) tem P85=1,0m.
//   - Severidade CONTÍNUA (0-100) por sigmoide entre P85 e P95 — elimina
//     cliff edge da v1 discreta.
//   - Lag heurístico ainda 30d (regime-aware fica para 1.8).
//
// Boletim 20° SGB (19/05/2026) reporta +2,5m em Caracaraí na semana. Pelo
// limiar mensal de maio (P85=2,18, P95=3,16), classifica como "alta" — não
// mais "extrema" como o limiar global inflava.

import { ONDA_BRANCO_PERCENTIS_MES } from "./onda-branco-percentis";
import { LAG_BRANCO_MANAUS } from "./lag-branco-manaus";

// Lag de propagação Caracaraí → Manaus CALIBRADO ESTATISTICAMENTE.
// v1 (heurística inicial): 22/30/35 dias por regime — INVERTIDO da realidade.
// v2 (`scripts/calibra-lag-anti-sazonal.mjs`):
//   - Correlação cruzada das ANOMALIAS z-score (sazonalidade DOY removida)
//   - Segmentação por estado do Negro alto (proxy: z-score SGC)
//   - Hidrologicamente: Negro BAIXO tem canal fragmentado → propagação MAIS
//     LENTA (precisa preencher talvegue antes); Negro ALTO tem coluna d'água
//     contígua → onda propaga como pulso de pressão, RÁPIDO.
//   - Resultados (correlação anti-sazonal):
//       Negro baixo (Driver Norte):  38d  (canal fragmentado)
//       Negro normal:                20d  (lag global ótimo)
//       Negro alto (Driver Sul):     13d  (coluna contígua)

const JANELA_DIAS_DEFAULT = 7;

/** Lag estimado baseado no IDN do dia da observação (calibrado anti-sazonal). */
function lagPorRegime(idn?: number): number {
  // Defesa: alguns regimes podem ter calibração sub-determinada (lag=0 indica
  // que o algoritmo não convergiu para um pico). Nesses casos, fallback no
  // lag_otimo global (20d, calibrado com correlação forte r=0.47).
  const sanitiza = (lag: number): number => (lag >= 5 ? lag : LAG_BRANCO_MANAUS.lag_otimo);

  if (idn == null) return sanitiza(LAG_BRANCO_MANAUS.lag_negro_normal);
  // IDN > 0.3 indica Negro depleted (driver Norte) → canal fragmentado → LENTO
  if (idn >  0.3) return sanitiza(LAG_BRANCO_MANAUS.lag_negro_baixo);
  // IDN < -0.3 indica Negro normal/alto, Madeira depleted → coluna contígua → RÁPIDO
  if (idn < -0.3) return sanitiza(LAG_BRANCO_MANAUS.lag_negro_alto);
  return sanitiza(LAG_BRANCO_MANAUS.lag_negro_normal);
}

export type SeveridadeOnda = "nenhuma" | "moderada" | "alta" | "extrema";

export interface ResultadoOndaBranco {
  disparado:           boolean;
  severidade:          SeveridadeOnda;
  severidade_continua: number;          // 0..100 — função sigmoide entre P85 e P95
  taxa_cm_dia:         number;          // taxa observada no período
  var_total_m:         number;          // variação total acumulada no período
  janela_dias:         number;
  percentil_historico: number;          // 0..1 — quantil aproximado vs P85/P95
  p85_mes:             number;          // limiar P85 do mês de referência
  p95_mes:             number;          // limiar P95 do mês de referência
  eta_manaus_dias:     number;          // dias estimados até chegar em Manaus
  eta_manaus_data:     string | null;   // YYYY-MM-DD
  ultima_leitura:      { data: string; cota_m: number } | null;
  primeira_leitura:    { data: string; cota_m: number } | null;
  motivo:              string;          // explicação curta
}

interface LeituraDiaria {
  data:    string;  // YYYY-MM-DD
  cota_m:  number;
}

/**
 * Detecta onda de cheia surpresa em Caracaraí a partir da série recente.
 * Espera leituras ordenadas cronologicamente; pega janela final de N dias.
 *
 * @param serie         Série diária de cota em Caracaraí (m), ordenada ASC
 * @param janelaDias    Janela de medição (default 7)
 */
/**
 * Severidade contínua via sigmoide entre P85 e P95.
 * Abaixo de P85·0,7 → 0. Em P85 → 65. Em P95 → 95. Acima → assintótico em 100.
 */
function severidadeContinua(var_m: number, p85: number, p95: number): number {
  if (var_m <= 0) return 0;
  if (var_m < p85 * 0.7) {
    // Faixa "moderada" linear de 0→30
    return Math.max(0, (var_m / (p85 * 0.7)) * 30);
  }
  if (var_m < p85) {
    // 30 → 65 linear (zona de atenção)
    return 30 + ((var_m - p85 * 0.7) / (p85 * 0.3)) * 35;
  }
  if (var_m < p95) {
    // 65 → 95 linear (alta)
    return 65 + ((var_m - p85) / (p95 - p85)) * 30;
  }
  // Acima de P95: assíntota suave em 100 (não há cliff edge)
  // tanh aproxima 100 conforme excesso cresce
  const excesso = var_m - p95;
  return 95 + 5 * Math.tanh(excesso / 1.5);
}

function severidadeLabel(continuo: number): SeveridadeOnda {
  if (continuo >= 95) return "extrema";
  if (continuo >= 65) return "alta";
  if (continuo >= 30) return "moderada";
  return "nenhuma";
}

export function detectaOndaBranco(
  serie: LeituraDiaria[],
  janelaDias = JANELA_DIAS_DEFAULT,
  idnAtual?: number,
): ResultadoOndaBranco {
  const vazio: ResultadoOndaBranco = {
    disparado:           false,
    severidade:          "nenhuma",
    severidade_continua: 0,
    taxa_cm_dia:         0,
    var_total_m:         0,
    janela_dias:         janelaDias,
    percentil_historico: 0,
    p85_mes:             ONDA_BRANCO_PERCENTIS_MES.p85_global,
    p95_mes:             ONDA_BRANCO_PERCENTIS_MES.p95_global,
    eta_manaus_dias:     lagPorRegime(idnAtual),
    eta_manaus_data:     null,
    ultima_leitura:      null,
    primeira_leitura:    null,
    motivo:              "Série insuficiente",
  };

  if (!serie || serie.length < janelaDias + 1) return vazio;

  // Pega último ponto e o ponto janelaDias atrás (ou mais próximo)
  const ultima = serie[serie.length - 1];
  const dataLimite = subDias(ultima.data, janelaDias);
  const primeira = encontraMaisProximo(serie, dataLimite) ?? serie[0];

  const diasReais = diferencaDias(primeira.data, ultima.data);
  if (diasReais < 1) {
    return { ...vazio, ultima_leitura: ultima, primeira_leitura: primeira };
  }

  const var_total_m = ultima.cota_m - primeira.cota_m;
  const taxa_cm_dia = (var_total_m * 100) / diasReais;

  // Limiares MENSAIS — fallback global se mês não tem dados suficientes
  const mes = parseInt(ultima.data.slice(5, 7), 10);
  const p85_mes = ONDA_BRANCO_PERCENTIS_MES.p85[mes] ?? ONDA_BRANCO_PERCENTIS_MES.p85_global;
  const p95_mes = ONDA_BRANCO_PERCENTIS_MES.p95[mes] ?? ONDA_BRANCO_PERCENTIS_MES.p95_global;

  const continuo = severidadeContinua(var_total_m, p85_mes, p95_mes);
  const severidade = severidadeLabel(continuo);

  // Quantil aproximado (interpolação linear contra P85/P95 mensais)
  let percentil = 0;
  if (var_total_m <= 0) percentil = 0.5;
  else if (var_total_m < p85_mes)
    percentil = 0.5 + (var_total_m / p85_mes) * 0.35;
  else if (var_total_m < p95_mes)
    percentil = 0.85 + ((var_total_m - p85_mes) / (p95_mes - p85_mes)) * 0.10;
  else
    percentil = Math.min(0.99, 0.95 + (var_total_m - p95_mes) / 5);

  const disparado = severidade === "alta" || severidade === "extrema";

  const motivo = disparado
    ? `Subida ${var_total_m.toFixed(2)}m em ${diasReais}d — ${severidade === "extrema" ? "acima do P95" : "acima do P85"} de ${["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][mes-1]} (${severidade === "extrema" ? p95_mes : p85_mes}m)`
    : `Variação ${var_total_m.toFixed(2)}m em ${diasReais}d dentro do esperado para o mês (P85=${p85_mes}m)`;

  return {
    disparado,
    severidade,
    severidade_continua: +continuo.toFixed(1),
    taxa_cm_dia:         +taxa_cm_dia.toFixed(1),
    var_total_m:         +var_total_m.toFixed(2),
    janela_dias:         diasReais,
    percentil_historico: +percentil.toFixed(3),
    p85_mes,
    p95_mes,
    eta_manaus_dias:     lagPorRegime(idnAtual),
    eta_manaus_data:     somaDias(ultima.data, lagPorRegime(idnAtual)),
    ultima_leitura:      ultima,
    primeira_leitura:    primeira,
    motivo,
  };
}

// ─── Helpers de data ────────────────────────────────────────────────────────

function diferencaDias(de: string, ate: string): number {
  const a = new Date(de + "T00:00:00Z").getTime();
  const b = new Date(ate + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

function subDias(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function somaDias(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function encontraMaisProximo(serie: LeituraDiaria[], alvo: string): LeituraDiaria | null {
  let melhor: LeituraDiaria | null = null;
  let menorDiff = Infinity;
  for (const l of serie) {
    const d = Math.abs(diferencaDias(l.data, alvo));
    if (d < menorDiff) { menorDiff = d; melhor = l; }
    if (menorDiff === 0) break;
  }
  return melhor;
}
