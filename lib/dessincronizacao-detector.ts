// Detector de Dessincronização Extrema — classifica o |IDN| atual contra a
// distribuição histórica DO MESMO PERÍODO DO ANO (percentil DOY).
//
// Por que: o IDN tem sazonalidade natural (Negro alto e Madeira têm ciclos
// defasados estruturalmente). Um |IDN| = 0.4 em janeiro pode ser comum; o
// mesmo valor em agosto pode ser extremo. Comparação DOY-aware é necessária.
//
// Diferença vs HMM (lib/hmm-idn.ts):
//   - HMM classifica REGIME (Sul/Sincronizado/Norte) e projeta transições 7/30d
//   - Este detector identifica MAGNITUDE EXTREMA do |IDN| vs histórico DOY
//
// Uso primário: gerador de briefing semanal (lib/briefing-gerador.ts) — para
// decidir se "dessincronização extrema" merece manchete na semana.

import { PERCENTIS_IDN_DOY } from "./percentis-idn-doy";

export type SeveridadeDessinc = "normal" | "elevada" | "alta" | "extrema";

export interface ResultadoDessincronizacao {
  excede:              boolean;            // |IDN| > P85 DOY
  severidade:          SeveridadeDessinc;
  idn_atual:           number;
  abs_idn_atual:       number;
  data_ref:            string;             // YYYY-MM-DD
  doy:                 number;
  p85_doy:             number | null;
  p95_doy:             number | null;
  percentil_estimado:  number;             // 0..1 — quantil aproximado
  direcao:             "norte" | "sul" | "neutro";  // sinal do IDN
  motivo:              string;
}

function calculaDOY(iso: string): number {
  const d = new Date(iso + "T00:00:00Z");
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
}

/**
 * Detecta se o IDN atual excede o P85 DOY (extremo histórico para o período).
 *
 * @param idn_atual  IDN observado mais recente
 * @param data_ref   Data ISO da observação (default: hoje)
 */
export function dessincronizacaoExcedeP85(
  idn_atual: number,
  data_ref: string = new Date().toISOString().slice(0, 10),
): ResultadoDessincronizacao {
  const doy = calculaDOY(data_ref);
  const abs_idn = Math.abs(idn_atual);

  const p85 = PERCENTIS_IDN_DOY.p85[doy] as number | null;
  const p95 = PERCENTIS_IDN_DOY.p95[doy] as number | null;

  const direcao: "norte" | "sul" | "neutro" =
    idn_atual > 0.05  ? "norte" :
    idn_atual < -0.05 ? "sul"   :
    "neutro";

  // Percentil estimado por interpolação linear contra P85/P95
  let percentil_estimado = 0.5;
  if (p85 != null && p95 != null) {
    if (abs_idn >= p95) {
      percentil_estimado = Math.min(0.99, 0.95 + (abs_idn - p95) / (p95 * 2));
    } else if (abs_idn >= p85) {
      percentil_estimado = 0.85 + ((abs_idn - p85) / (p95 - p85)) * 0.10;
    } else if (abs_idn > 0) {
      percentil_estimado = 0.5 + (abs_idn / p85) * 0.35;
    }
  }

  let severidade: SeveridadeDessinc = "normal";
  let motivo = `|IDN|=${abs_idn.toFixed(2)} dentro da faixa histórica para esta época`;

  if (p95 != null && abs_idn >= p95) {
    severidade = "extrema";
    motivo = `|IDN|=${abs_idn.toFixed(2)} excede o P95 DOY (${p95.toFixed(2)}) — entre os 5% mais extremos historicamente para esta época do ano`;
  } else if (p85 != null && abs_idn >= p85) {
    severidade = "alta";
    motivo = `|IDN|=${abs_idn.toFixed(2)} excede o P85 DOY (${p85.toFixed(2)}) — entre os 15% mais extremos para esta época`;
  } else if (p85 != null && abs_idn >= p85 * 0.85) {
    severidade = "elevada";
    motivo = `|IDN|=${abs_idn.toFixed(2)} próximo do P85 DOY (${p85.toFixed(2)})`;
  }

  const excede = severidade === "alta" || severidade === "extrema";

  return {
    excede,
    severidade,
    idn_atual:          +idn_atual.toFixed(3),
    abs_idn_atual:      +abs_idn.toFixed(3),
    data_ref,
    doy,
    p85_doy:            p85,
    p95_doy:            p95,
    percentil_estimado: +percentil_estimado.toFixed(3),
    direcao,
    motivo,
  };
}

/**
 * Versão de série: aplica o detector ao último ponto + calcula RATE-OF-CHANGE
 * dos últimos N dias para identificar dessincronização CRESCENTE (que pode
 * disparar mesmo sem exceder P85, se a aceleração for forte).
 */
export interface ResultadoDessincSerie extends ResultadoDessincronizacao {
  variacao_30d:        number | null;       // ΔIDN dos últimos 30d
  variacao_acelerando: boolean;             // |IDN| crescendo monotonicamente
}

export function detectaDessincSerie(
  serie: { data: string; idn: number }[],
): ResultadoDessincSerie | null {
  if (!serie || serie.length === 0) return null;
  const ult = serie[serie.length - 1];
  const base = dessincronizacaoExcedeP85(ult.idn, ult.data);

  // Variação 30d
  let variacao_30d: number | null = null;
  if (serie.length >= 2) {
    const alvo = somaDiasISO(ult.data, -30);
    let melhor = serie[0];
    let menorDiff = Infinity;
    for (const p of serie) {
      const d = Math.abs(diferencaDiasISO(p.data, alvo));
      if (d < menorDiff) { menorDiff = d; melhor = p; }
    }
    variacao_30d = +(ult.idn - melhor.idn).toFixed(3);
  }

  // Aceleração: |IDN| crescente nos últimos 4 pontos
  let variacao_acelerando = false;
  if (serie.length >= 4) {
    const ultimos = serie.slice(-4).map((p) => Math.abs(p.idn));
    variacao_acelerando = ultimos[1] < ultimos[2] && ultimos[2] < ultimos[3];
  }

  return { ...base, variacao_30d, variacao_acelerando };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function somaDiasISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diferencaDiasISO(de: string, ate: string): number {
  return Math.round(
    (new Date(ate + "T00:00:00Z").getTime() -
     new Date(de + "T00:00:00Z").getTime()) / 86400000
  );
}
