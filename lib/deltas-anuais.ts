// Deltas "vs 2025" e "vs 2024" dos cards: cota de hoje − cota do MESMO DIA do
// ano de referência (cm), a partir de lib/historico-series.ts (mesma fonte do
// cotagrama).
//
// Antes (até 29/09/2026) os deltas vinham fixos de DADOS_ATUAIS (snapshot de
// 07/05/2026) e só a cota era atualizada — os cards e os insights mostravam
// "−48 cm vs 2025" com Manaus 9 m abaixo do nível daquele dia. Sem dado do
// mesmo dia (±JANELA_DIAS) o delta fica null e a UI mostra "—": nunca um
// número velho.

import type { DadosEstacao } from "./dados-historicos";
import { serieHistorica, type Ponto } from "./historico-series";

// Nome da estação no painel → chave da série histórica. Estações fora daqui
// (Manicore, Labrea) não têm série de anos anteriores no repo → delta null.
const CHAVE_SERIE: Record<string, string> = {
  Manaus:      "Manaus",
  Itacoatiara: "Itacoatiara",
  Manacapuru:  "Manacapuru",
  Humaita:     "Humaita",
  PortoVelho:  "PortoVelho",
  Curicuriari: "SGC",
};

const JANELA_DIAS = 2;

function cotaNoDia(pontos: Ponto[], ano: number, md: string): number | null {
  const alvo = Date.UTC(ano, parseInt(md.slice(0, 2), 10) - 1, parseInt(md.slice(3, 5), 10));
  let melhor: { dist: number; cota: number } | null = null;
  for (const p of pontos) {
    const t = Date.UTC(ano, parseInt(p.md.slice(0, 2), 10) - 1, parseInt(p.md.slice(3, 5), 10));
    const dist = Math.abs(t - alvo) / 86_400_000;
    if (dist <= JANELA_DIAS && (!melhor || dist < melhor.dist)) melhor = { dist, cota: p.cota_m };
  }
  return melhor?.cota ?? null;
}

// Memo por (estação, data): as séries vêm de CSV em disco e não mudam no dia.
const memo = new Map<string, { d2025: number | null; d2024: number | null }>();

export function aplicaDeltasAnuais(dados: Record<string, DadosEstacao>): Record<string, DadosEstacao> {
  const out: Record<string, DadosEstacao> = {};
  for (const [nome, d] of Object.entries(dados)) {
    const data = d.ultima_atualizacao;           // YYYY-MM-DD da leitura
    const chave = CHAVE_SERIE[nome];
    if (!chave || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      out[nome] = { ...d, delta_2025: null, delta_2024: null };
      continue;
    }
    const ano = parseInt(data.slice(0, 4), 10);
    const md = data.slice(5);
    const k = `${nome}|${data}`;
    let refs = memo.get(k);
    if (!refs) {
      try {
        const s = serieHistorica(chave, new Set([ano - 1, ano - 2]));
        refs = {
          d2025: cotaNoDia(s[ano - 1] ?? [], ano - 1, md),
          d2024: cotaNoDia(s[ano - 2] ?? [], ano - 2, md),
        };
      } catch {
        refs = { d2025: null, d2024: null };
      }
      memo.set(k, refs);
    }
    const delta = (c: number | null) => (c === null ? null : Math.round((d.cota_m - c) * 100));
    out[nome] = { ...d, delta_2025: delta(refs.d2025), delta_2024: delta(refs.d2024) };
  }
  return out;
}
