// Módulo B2 "Aquaviário" — fonte única da TRÍADE de risco hidrológico
// (IRC-Tabocal · IDN · ETA até o gatilho) para a vertical aquaviária.
//
// Convenção da casa (ver lib/modulos/pavimento.ts): nenhum número de domínio
// nasce aqui — TODOS os valores hidrológicos vêm das funções de cálculo já
// existentes. Aqui mora só a COMPOSIÇÃO da tríade + a COPY/rótulos.
//
// Por que compor em vez de usar computeHidrologiaDashboard():
//   computeHidrologiaDashboard() traz IRC + ETA (via análogos), mas NÃO expõe o
//   IDN e usa a série HidroWeb estática (lag ~14d). Para a tríade ser idêntica à
//   do /monitor, espelhamos a MESMA composição do /monitor: snapshot diário ANA
//   (obterDadosDiariosANA) + previsão SGB (fetchPrevisao2026).
//
// Dependência de fonte: a cota atual vem da API ANA via cache em disco
// (data/ana-diario-cache.json). A ANA é descontinuada em 30/06/2026; o
// fallback herdado é o mesmo do /monitor — cai para DADOS_ATUAIS quando o
// snapshot diário vier vazio, e o selo de proveniência reflete isso (fonteANA).

import { fetchPrevisao2026 } from "../fetch-dados";
import { obterDadosDiariosANA } from "../cache-ana-diario";
import { detectaOndaBranco } from "../onda-branco";
import { calculaIDNSimples, classificaIDN } from "../calcula-idn";
import { projetaCruzamentoTabocal } from "../recessao-itacoatiara";
import {
  calculaIRCTabocal,
  divergenciaIRC,
  COR_FAIXA_TABOCAL,
  type SnapshotIRCTabocal,
  type ResultadoIRCTabocal,
  type DivergenciaIRC,
} from "../irc-tabocal";
import {
  calculaIRC,
  detectaFaseCiclo,
  type FaixaIRC,
  type ResultadoIRC_Estendido,
} from "../irc";
import { projetaDataCruzamento17_7 } from "../recessao-modelo";
import { lerSerieIDN } from "../ana-idn-series";
import type { CotaIDN, VazaoIDN } from "../fetch-dados";
import type { EstacaoComDOY } from "../sub-bacias";
import type { EstacaoVazao } from "../sub-bacias-vazao";
import type { DadosEstacao } from "../dados-historicos";
import type { PontoIDN } from "../ana-idn-series";

// ─── Contrato do snapshot ────────────────────────────────────────────────────

export interface TriadeAquaviario {
  // Escalares da tríade (preditivo-first; IRC e ETA carregam faixa/banda).
  irc: {
    valor: number;                 // 0–100 (IRC-Tabocal v3.6)
    faixa: FaixaIRC;               // verde | amarelo | laranja | vermelho
    cor: { texto: string; bg: string; border: string }; // classes (COR_FAIXA)
  };
  idn: {
    valor: number;                 // ~−1..+1
    regime: string;                // Driver Norte | Driver Sul | Sincronizado
    descricao: string;
    cor: string;                   // hex (classificaIDN)
  };
  eta: {
    dias: number | null;           // dias de HOJE até o cruzamento central
    datas: {                       // tríade do modelo de recessão de Itacoatiara
      central: string | null;
      min: string | null;          // descida lenta (cenário otimista)
      max: string | null;          // descida rápida (cenário pessimista)
    };
  };
  // Inputs serializáveis para os GAUGES reaproveitados (render puro da fonte —
  // os componentes recalculam a partir daqui, não duplicamos número na UI).
  gauges: {
    rTabocal:    ResultadoIRCTabocal;
    rManaus:     ResultadoIRC_Estendido;
    divergencia: DivergenciaIRC;
    dados:       Record<string, DadosEstacao>;
    cotasIDN:    Partial<Record<EstacaoComDOY, CotaIDN>>;
    vazoesIDN:   Partial<Record<EstacaoVazao, VazaoIDN>>;
    serieIDN:    PontoIDN[];
  };
  meta: {
    dataReferencia:   string;      // YYYY-MM-DD (cota mais recente do IDN)
    fonteANA:         boolean;     // true = leitura ao vivo; false = fallback estático
    previsaoFonte:    string;      // rótulo da fonte de pico (SGB ou fallback)
    previsaoDinamica: boolean;     // true = parser SGB ao vivo
  };
}

/**
 * Compõe a tríade aquaviária a partir das mesmas fontes do /monitor.
 * Server-only (async): lê o cache diário ANA + a previsão SGB.
 */
export async function getAquaviarioSnapshot(): Promise<TriadeAquaviario> {
  const previsao = await fetchPrevisao2026();
  const { dados, cotasIDN, vazoesIDN, serieCaracarai } = await obterDadosDiariosANA();
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

  // ── Onda Branco (Caracaraí) — alimenta o componente de severidade do IRC ───
  const ondaBranco =
    serieCaracarai.length >= 8 ? detectaOndaBranco(serieCaracarai, 7, idnValor) : null;

  // ── ETA até o gatilho operacional de Tabocal (cruzamento de cota) ──────────
  const ano = new Date().getUTCFullYear();
  const picoData = `${ano}-06-15`;
  const cruzTabocal = previsao.itacoatiara_pico
    ? projetaCruzamentoTabocal(previsao.itacoatiara_pico, picoData)
    : { central: null, min: null, max: null };
  const etaDiasTabocal = cruzTabocal.central
    ? Math.round((new Date(cruzTabocal.central).getTime() - Date.now()) / 86400000)
    : null;

  // ── IRC-Tabocal v3.6 (índice operacional, ancorado em Itacoatiara) ─────────
  const snapTabocal: SnapshotIRCTabocal = {
    cotaItacoatiara_m:           dados.Itacoatiara?.cota_m ?? 0,
    cotaManaus_m:                dados.Manaus?.cota_m ?? 0,
    idn:                         idnValor,
    severidade_onda:             ondaBranco?.severidade ?? "nenhuma",
    severidade_onda_continua:    ondaBranco?.severidade_continua,
    var_onda_m:                  ondaBranco?.var_total_m ?? 0,
    anomalia_pp:                 previsao.anomalia_pp_negro,
    eta_dias_cruzamento_tabocal: etaDiasTabocal,
  };
  const rTabocal = calculaIRCTabocal(snapTabocal);

  // ── IRC-Manaus (parâmetro ANTAQ formal) — só para a divergência regulatória ─
  const cruz17_7 = projetaDataCruzamento17_7(previsao.manaus_pico_cheia.media, picoData);
  const etaDias17_7 = cruz17_7.central
    ? Math.round((new Date(cruz17_7.central).getTime() - Date.now()) / 86400000)
    : null;
  const rManaus = calculaIRC({
    cotaManaus_m:        dados.Manaus?.cota_m ?? 0,
    idn:                 idnValor,
    severidade_onda:     ondaBranco?.severidade ?? "nenhuma",
    severidade_onda_continua: ondaBranco?.severidade_continua,
    var_onda_m:          ondaBranco?.var_total_m ?? 0,
    anomalia_pp:         previsao.anomalia_pp_negro,
    eta_dias_cruzamento: etaDias17_7,
    fase_ciclo:          detectaFaseCiclo(dataIDN),
  });
  const divergencia = divergenciaIRC(rManaus.irc, rTabocal.irc);

  // ── Status de fonte (mesmo critério do /monitor) ───────────────────────────
  const hojeBacia = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Manaus" });
  const fonteANA =
    Object.values(dados).filter((d) => d.ultima_atualizacao >= hojeBacia).length > 0;

  return {
    irc: {
      valor: rTabocal.irc,
      faixa: rTabocal.faixa,
      cor:   COR_FAIXA_TABOCAL[rTabocal.faixa],
    },
    idn: {
      valor:     idnValor,
      regime:    idnClass.regime,
      descricao: idnClass.descricao,
      cor:       idnClass.cor,
    },
    eta: {
      dias:  etaDiasTabocal,
      datas: { central: cruzTabocal.central, min: cruzTabocal.min, max: cruzTabocal.max },
    },
    gauges: { rTabocal, rManaus, divergencia, dados, cotasIDN, vazoesIDN, serieIDN },
    meta: {
      dataReferencia:   dataIDN,
      fonteANA,
      previsaoFonte:    previsao.fonte,
      previsaoDinamica: previsao.fonte_dinamica,
    },
  };
}

// ─── COPY e rótulos (preditivo-first, registro "banco central") ──────────────

export const AQUAVIARIO_COPY = {
  titulo: "Risco de calado na hidrovia, em tempo real",
  rotulo:
    "Tríade de risco operacional da navegação no Amazonas — calado, dessincronização de bacias e prazo até a restrição.",
  intro:
    "A navegação no Amazonas não para de repente: a restrição de calado se anuncia semanas antes, no descompasso entre o que a régua de Manaus mostra e o que o canal de Tabocal, em Itacoatiara, realmente entrega. Este painel não narra a seca — ele a antecipa. Três indicadores proprietários do Observatório IBI leem o risco antes que ele vire embargo de comboio: quanto de margem de calado resta, para qual lado as bacias estão dessincronizando e em quantos dias o gatilho operacional deve ser cruzado. Onde há incerteza, mostramos a banda, não um número seco.",

  // Rótulos dos três indicadores da tríade.
  indicadores: {
    irc: {
      titulo: "IRC-Tabocal",
      rotulo: "Índice de Risco de Calado · operacional (0–100)",
      ajuda:
        "Score 0–100 ancorado no Calado Máximo Recomendado (CMR) de Itacoatiara. Quanto maior, mais perto da restrição. Acompanha a banda IC e o parâmetro ANTAQ (Manaus 17,7 m) para evidenciar a divergência regulatória.",
    },
    idn: {
      titulo: "IDN",
      rotulo: "Índice de Dessincronização Norte–Sul (−1 a +1)",
      ajuda:
        "Mede para qual lado as bacias estão fora de fase: Driver Norte (Negro/Branco depletados, padrão 2026) vs Driver Sul (Madeira/Purus, padrão 2024). O ponteiro fora do verde antecede descasamentos entre o parâmetro regulatório e a operação.",
    },
    eta: {
      titulo: "ETA até o gatilho",
      rotulo: "Prazo projetado até o cruzamento operacional de Tabocal",
      ajuda:
        "Data projetada (com banda otimista/pessimista) em que a cota de Itacoatiara cruza o gatilho operacional, pelo modelo de recessão pós-pico calibrado em histórico. Não é certeza: a faixa cobre descida lenta e rápida.",
    },
  },

  metodologia:
    "Tríade calculada pela mesma engine do Monitor Hidrológico do Observatório IBI. " +
    "IRC-Tabocal v3.6: índice de risco de calado ancorado no CMR oficial de Itacoatiara " +
    "(curva da Capitania dos Portos da Amazônia Ocidental), combinando déficit de calado, " +
    "regime HMM, Onda Branco, anomalia de precipitação e lag operacional Manaus×Itacoatiara, " +
    "com banda de incerteza propagada. IDN: posição relativa das sub-bacias Norte e Sul vs " +
    "climatologia (fronteiras GMM calibradas em 2016–2023). ETA: modelo de recessão pós-pico " +
    "de Itacoatiara projeta a data central e a banda IC80 de cruzamento do gatilho operacional. " +
    "Cotas via telemetria ANA/SNIRH (cache diário, fuso Manaus); previsão de pico via SGB/CPRM. " +
    "A API ANA é descontinuada em 30/jun/2026 — após isso o painel opera em fallback estático " +
    "até a migração para a nova API SGB.",

  // Proveniência: índices MODELADOS pelo IBI a partir de dado oficial (estimativa-ibi).
  proveniencia: {
    tipo: "estimativa-ibi" as const,
    fonte:
      "Observatório IBI — índices proprietários a partir de telemetria ANA/SNIRH e previsão SGB/CPRM",
  },
};
