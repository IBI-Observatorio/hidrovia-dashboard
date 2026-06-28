// Módulo B2 "Aquaviário" — fonte única do PAR de indicadores de risco
// hidrológico (IDN · ETA até a restrição de calado) para a vertical aquaviária.
//
// Convenção da casa (ver lib/modulos/pavimento.ts): nenhum número de domínio
// nasce aqui — TODOS os valores hidrológicos vêm das funções de cálculo já
// existentes. Aqui mora só a COMPOSIÇÃO + a COPY/rótulos.
//
// Dependência de fonte: a cota atual vem da API ANA via cache em disco
// (data/ana-diario-cache.json). A ANA é descontinuada em 30/06/2026; o
// fallback herdado é o mesmo do /monitor — cai para 0/estático quando o
// snapshot diário vier vazio, e o selo de proveniência reflete isso (fonteANA).

import { obterDadosDiariosANA } from "../cache-ana-diario";
import { calculaIDNSimples, classificaIDN } from "../calcula-idn";
import { projetaETAporAnalogos } from "../recessao-analogos";
import { ITACOATIARA_HISTORICO_DIARIO } from "../itacoatiara-historico-diario";
import { lerSerieIDN } from "../ana-idn-series";
import type { CotaIDN, VazaoIDN } from "../fetch-dados";
import type { EstacaoComDOY } from "../sub-bacias";
import type { EstacaoVazao } from "../sub-bacias-vazao";
import type { DadosEstacao } from "../dados-historicos";
import type { PontoIDN } from "../ana-idn-series";

// Calado-alvo de referência da versão pública (comboio carregado em cheia
// normal) — mesmo default do IRCInterativo gratuito. Assinantes parametrizam.
const CALADO_ALVO_M = 11.0;

// ─── Contrato do snapshot ────────────────────────────────────────────────────

export interface AquaviarioSnapshot {
  idn: {
    valor: number;                 // ~−1..+1
    regime: string;                // Driver Norte | Driver Sul | Sincronizado
    descricao: string;
    cor: string;                   // hex (classificaIDN)
  };
  eta: {
    dias: number | null;            // dias de HOJE até a data central (P50)
    alvo_calado_m: number;          // calado-alvo de referência (CMR)
    prob: number;                   // 0–1 — prob. ponderada de cruzamento (análogos)
    ano_gemeo: number | null;       // ano histórico mais similar (menor RMSE)
    datas: {                        // quantis empíricos dos análogos 2016–2025
      central: string | null;       // P50 (mediana)
      precoce: string | null;       // P10 (restrição mais cedo)
      tardia:  string | null;       // P90 (restrição mais tarde)
    };
  };
  // Inputs serializáveis para o GAUGE reaproveitado (DessincronizacaoGauge
  // recalcula o IDN a partir daqui — não duplicamos número na UI).
  gauges: {
    dados:     Record<string, DadosEstacao>;
    cotasIDN:  Partial<Record<EstacaoComDOY, CotaIDN>>;
    vazoesIDN: Partial<Record<EstacaoVazao, VazaoIDN>>;
    serieIDN:  PontoIDN[];
  };
  meta: {
    dataReferencia: string;        // YYYY-MM-DD (cota mais recente do IDN)
    fonteANA:       boolean;       // true = leitura ao vivo; false = fallback estático
  };
}

/**
 * Compõe o par de indicadores aquaviários a partir das mesmas fontes do /monitor.
 * Server-only (async): lê o cache diário ANA.
 */
export async function getAquaviarioSnapshot(): Promise<AquaviarioSnapshot> {
  const { dados, cotasIDN, vazoesIDN } = await obterDadosDiariosANA();
  const serieIDN = lerSerieIDN().serie;

  // ── IDN — só cotasIDN (MA-7d); renormaliza pesos quando estação ausente ────
  const cotasIDNCompletas: Record<string, number> = {};
  for (const [k, v] of Object.entries(cotasIDN)) cotasIDNCompletas[k] = v.cota_m;
  const dataIDN =
    Object.values(cotasIDN).map((v) => v.ultima_atualizacao).sort().reverse()[0] ??
    dados.Humaita?.ultima_atualizacao ??
    new Date().toISOString().slice(0, 10);
  const idnValor =
    Object.keys(cotasIDNCompletas).length > 0
      ? calculaIDNSimples(cotasIDNCompletas, dataIDN)
      : 0;
  const idnClass = classificaIDN(idnValor);

  // ── ETA — análogos históricos até CMR < calado-alvo ─────────────────────────
  // Mesmo modelo do painel ETA do /monitor (projetaETAporAnalogos): produz data
  // P50 + banda P10/P90 + ano gêmeo, medindo a restrição de calado real.
  const ano = new Date().getUTCFullYear();
  const serieIta2026 = Object.entries(
    (ITACOATIARA_HISTORICO_DIARIO as Record<number, Record<string, number>>)[ano] ?? {},
  )
    .map(([data, cota]) => ({ data, cota: cota as number }))
    .sort((a, b) => a.data.localeCompare(b.data));
  const etaAn =
    serieIta2026.length >= 30 ? projetaETAporAnalogos(serieIta2026, CALADO_ALVO_M) : null;
  // dias contados de HOJE (a série tem lag; a data P50 é fixa, a contagem decresce).
  const etaDias = diasDeHojeAte(etaAn?.data_p50 ?? null) ?? etaAn?.dias_p50 ?? null;

  // ── Status de fonte (mesmo critério do /monitor) ───────────────────────────
  const hojeBacia = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });
  const fonteANA =
    Object.values(dados).filter((d) => d.ultima_atualizacao >= hojeBacia).length > 0;

  return {
    idn: {
      valor:     idnValor,
      regime:    idnClass.regime,
      descricao: idnClass.descricao,
      cor:       idnClass.cor,
    },
    eta: {
      dias:          etaDias,
      alvo_calado_m: CALADO_ALVO_M,
      prob:          etaAn?.prob_cruzamento ?? 0,
      ano_gemeo:     etaAn?.ano_top ?? null,
      datas: {
        central: etaAn?.data_p50 ?? null,
        precoce: etaAn?.data_p10 ?? null,
        tardia:  etaAn?.data_p90 ?? null,
      },
    },
    gauges: { dados, cotasIDN, vazoesIDN, serieIDN },
    meta: { dataReferencia: dataIDN, fonteANA },
  };
}

/** Dias inteiros de HOJE (data local) até a data ISO alvo. null se sem alvo. */
function diasDeHojeAte(isoAlvo: string | null): number | null {
  if (!isoAlvo) return null;
  const ymd = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const now = new Date();
  const hoje = ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const [ay, am, ad] = isoAlvo.split("-").map(Number);
  return ymd(ay, am, ad) - hoje;
}

// ─── COPY e rótulos (preditivo-first, registro "banco central") ──────────────

export const AQUAVIARIO_COPY = {
  titulo: "Risco de calado na hidrovia, em tempo real",
  rotulo:
    "Indicadores de risco da navegação no Amazonas — dessincronização de bacias e prazo até a restrição de calado.",
  intro:
    "A navegação no Amazonas não para de repente: a restrição de calado se anuncia semanas antes. Este painel não narra a seca — ele a antecipa, com dois indicadores proprietários do Observatório IBI. O IDN mostra para qual lado as bacias estão saindo de fase (Norte × Sul), o sinal que precede os descasamentos entre o parâmetro regulatório e a operação real. O ETA projeta, por análogos históricos, em quantos dias o calado de Itacoatiara deve cair abaixo do nível de operação. Onde há incerteza, mostramos a banda, não um número seco.",

  // Rótulos dos indicadores exibidos.
  indicadores: {
    idn: {
      titulo: "IDN",
      rotulo: "Índice de Dessincronização Norte–Sul (−1 a +1)",
      ajuda:
        "Mede para qual lado as bacias estão fora de fase: Driver Norte (Negro/Branco depletados, padrão 2026) vs Driver Sul (Madeira/Purus, padrão 2024). O ponteiro fora do verde antecede descasamentos entre o parâmetro regulatório e a operação.",
    },
    eta: {
      titulo: "ETA · restrição de calado",
      rotulo: "Prazo projetado até o CMR cair abaixo do calado-alvo (11 m)",
      ajuda:
        "Data projetada (P50) e banda empírica (P10 precoce / P90 tardia) em que o Calado Máximo Recomendado de Itacoatiara cai abaixo do calado-alvo de referência, por análogos históricos 2016–2025 (ano gêmeo ponderado por similaridade). Não é certeza: a faixa cobre cruzamento mais cedo e mais tarde.",
    },
  },

  metodologia:
    "Calculados pela mesma engine do Monitor Hidrológico do Observatório IBI. " +
    "IDN: posição relativa das sub-bacias Norte e Sul vs climatologia (fronteiras GMM " +
    "calibradas em 2016–2023). ETA: análogos históricos (2016–2025) projetam a data P50 " +
    "e a banda empírica P10/P90 em que o CMR de Itacoatiara cai abaixo do calado-alvo " +
    "(11 m, comboio carregado) — mesmo modelo do painel ETA do Monitor. Cotas via " +
    "telemetria ANA/SNIRH (cache diário, fuso Manaus). A API ANA é descontinuada em " +
    "30/jun/2026 — após isso o painel opera em fallback estático até a migração para a " +
    "nova API SGB.",

  // Proveniência: índices MODELADOS pelo IBI a partir de dado oficial (estimativa-ibi).
  proveniencia: {
    tipo: "estimativa-ibi" as const,
    fonte:
      "Observatório IBI — índices proprietários a partir de telemetria ANA/SNIRH",
  },
};
