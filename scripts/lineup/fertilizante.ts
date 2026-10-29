// scripts/lineup/fertilizante.ts
// Série de FERTILIZANTE importado nos line-ups (Paranaguá, Santos, Itaqui).
//
// Por que existe: o backtest de 25/09/2026 (docs/parceria-cna/backtest-ciot-pedagio.md,
// adendo 2) não conseguiu testar o line-up de fertilizante como antecedente da
// importação porque não havia histórico (só 45 capturas do Wayback). Esta série
// passa a acumular 1 snapshot/dia para refazer o teste com 12–18 meses de coleta.
//
// ISOLAMENTO DO IEE: a série fica em `snapshotsFertilizantes` (campo próprio no
// JSON do porto). O array `snapshots` — lido pelo pilar F (lib/agro-content.ts,
// calculaComponenteF) — NÃO muda: mesmo filtro de grão, mesmo healthcheck.
// Por isso a série de fertilizante tem healthcheck próprio e é gravada mesmo
// quando o healthcheck de grão falha (página lida, mas sem graneleiro de grão).

export const RX_FERT =
  /FERTILI|ADUBO|UR[EÉ]IA|CLORETOS? DE POT|\bKCL\b|SULFATO DE AM[OÔ]NIO|NITRATO|FOSFAT|SUPERFOSF|\bMAP\b|\bDAP\b|\bNPK\b|ORTOFOSF|POT[AÁ]SS/i;

/** Acima disso é erro de digitação na origem (vistos no histórico APPA: milhões de t por navio). */
export const MAX_T_NAVIO = 100_000;
const MAX_SNAPSHOTS = 730;

export interface NavioFert {
  navio: string;
  /** toneladas de fertilizante a descarregar (previsto; saldo se atracado) */
  toneladas: number;
  mercadoria: string;
  eta?: string;
  status: string;
}
export interface SnapshotFert { dataColeta: string; navios: NavioFert[] }

/** Um registro por navio×status (maior tonelagem); descarta valores implausíveis. */
export function dedupeFert(lista: NavioFert[]): NavioFert[] {
  const m = new Map<string, NavioFert>();
  for (const n of lista) {
    if (!n.navio || !(n.toneladas > 0) || n.toneladas > MAX_T_NAVIO) continue;
    const k = `${n.navio}|${n.status}`;
    const atual = m.get(k);
    if (!atual || n.toneladas > atual.toneladas) m.set(k, n);
  }
  return [...m.values()];
}

/** Acrescenta o snapshot de hoje (substitui se já houver). fert=null ⇒ série inalterada. */
export function acumulaFert(
  anterior: SnapshotFert[] | undefined,
  hoje: string,
  fert: NavioFert[] | null,
): SnapshotFert[] {
  const serie = (anterior ?? []).filter((s) => fert === null || s.dataColeta !== hoje);
  if (fert !== null) serie.push({ dataColeta: hoje, navios: fert });
  while (serie.length > MAX_SNAPSHOTS) serie.shift();
  return serie;
}

export const FILTRO_FERT =
  "importação de fertilizantes (ureia, KCl, sulfato de amônio, nitratos, fosfatos/MAP/DAP, superfosfatos, NPK); campo toneladas = carga prevista (saldo, se atracado)";
