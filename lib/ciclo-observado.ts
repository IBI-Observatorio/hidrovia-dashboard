// Extremos OBSERVADOS do ciclo hidrológico do ano (pico de cheia de Manaus,
// mínima de estiagem de Itacoatiara) — para confrontar a previsão do SGB com
// o que de fato aconteceu, em vez de exibir previsão vencida.
//
// Fontes (todas ANA, mesma régua dos cards):
//   • Manaus      → ana-cotas-series.json (série diária acumulada do cache ANA)
//   • Itacoatiara → ITACOATIARA_HISTORICO_DIARIO (HidroWeb, atualizado pelo bot)
//                   complementado pela ana-cotas-series.json

import { lerSerieCotas } from "./ana-cotas-series";
import { ITACOATIARA_HISTORICO_DIARIO } from "./itacoatiara-historico-diario";

export interface Extremo {
  data:        string;   // YYYY-MM-DD
  cota_m:      number;
  consolidado: boolean;  // true = o rio já reverteu com folga (extremo do ano definido)
}

export interface MinimaItacoatiara extends Extremo {
  ultima:        { data: string; cota_m: number };
  taxa_cm_dia:   number | null;   // variação média dos últimos 7 dias
  referencias:   { ano: number; data: string; cota_m: number }[];  // mínimas de anos anteriores
}

export interface CicloObservado {
  picoManaus?:        Extremo;
  picoItacoatiara?:   Extremo;
  minimaItacoatiara?: MinimaItacoatiara;
}

// Reversão mínima (m) e distância mínima (dias) do extremo até a última leitura
// para considerar o extremo definido — evita chamar de "pico" um platô em curso.
const REVERSAO_M = 0.30;
const DIAS_MIN   = 10;

type Serie = [string, number][];

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

function serieItacoatiara(ano: number): Serie {
  const base: Record<string, number> = { ...(ITACOATIARA_HISTORICO_DIARIO[ano] ?? {}) };
  for (const p of lerSerieCotas().estacoes.Itacoatiara ?? []) {
    if (p.data.startsWith(String(ano)) && !(p.data in base)) base[p.data] = p.cota_m;
  }
  return Object.entries(base).sort((a, b) => a[0].localeCompare(b[0]));
}

function serieManaus(ano: number): Serie {
  return (lerSerieCotas().estacoes.Manaus ?? [])
    .filter((p) => p.data.startsWith(String(ano)))
    .map((p) => [p.data, p.cota_m] as [string, number])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function extremo(s: Serie, tipo: "max" | "min"): Extremo | undefined {
  if (s.length === 0) return undefined;
  const [data, cota_m] = s.reduce((a, b) =>
    (tipo === "max" ? b[1] > a[1] : b[1] < a[1]) ? b : a);
  const [ultData, ultCota] = s[s.length - 1];
  const reverteu = tipo === "max" ? cota_m - ultCota >= REVERSAO_M : ultCota - cota_m >= REVERSAO_M;
  return { data, cota_m, consolidado: reverteu && diasEntre(data, ultData) >= DIAS_MIN };
}

function taxa7d(s: Serie): number | null {
  if (s.length < 2) return null;
  const [d1, c1] = s[s.length - 1];
  const ini = [...s].reverse().find(([d]) => diasEntre(d, d1) >= 7);
  if (!ini) return null;
  return Math.round(((c1 - ini[1]) * 100) / diasEntre(ini[0], d1));
}

export function lerCicloObservado(ano = new Date().getUTCFullYear()): CicloObservado {
  try {
    const mao = serieManaus(ano);
    const ita = serieItacoatiara(ano);

    // Mínima: só o trecho após o pico (a estiagem), senão pega o início do ano.
    const picoIta = extremo(ita, "max");
    const estiagem = picoIta ? ita.filter(([d]) => d >= picoIta.data) : [];
    const min = picoIta?.consolidado ? extremo(estiagem, "min") : undefined;

    const referencias = [ano - 1, ano - 2]
      .map((a) => {
        const s = (Object.entries(ITACOATIARA_HISTORICO_DIARIO[a] ?? {}) as Serie)
          .filter(([d]) => d >= `${a}-07-01`);
        const m = extremo(s, "min");
        return m ? { ano: a, data: m.data, cota_m: m.cota_m } : null;
      })
      .filter((r): r is { ano: number; data: string; cota_m: number } => r !== null);

    return {
      picoManaus:      extremo(mao, "max"),
      picoItacoatiara: picoIta,
      minimaItacoatiara: min && {
        ...min,
        ultima:      { data: estiagem[estiagem.length - 1][0], cota_m: estiagem[estiagem.length - 1][1] },
        taxa_cm_dia: taxa7d(estiagem),
        referencias,
      },
    };
  } catch {
    return {};
  }
}
