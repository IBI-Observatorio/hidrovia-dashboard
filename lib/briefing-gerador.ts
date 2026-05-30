// Gerador editorial do Briefing Semanal IBI/Hidrovias.
//
// Combina os 3 detectores especializados (Onda Branco, Dessincronização,
// Calendário LWS) + os insights operacionais (geraInsights) + a previsão SGB
// (fetchPrevisao2026) em uma estrutura editorial:
//
//   { manchete, sublinhas[3], alerta_destaque, paragrafo_contexto, ... }
//
// Logica de seleção da manchete (prioridade decrescente):
//   1. Onda Branco com severidade alta/extrema
//   2. Dessincronização com severidade alta/extrema
//   3. Cruzamento 17,7m projetado em <60 dias
//   4. Insight crítico vindo de geraInsights
//   5. Fallback: status semanal do sistema
//
// Tom: institucional, factual, jornalismo de mercado (estilo Bloomberg Brief
// brasileiro). Sem sensacionalismo. Datas em PT-BR.
//
// Esta função é PURA — não faz I/O. Recebe snapshot pronto.

import type { DadosEstacao } from "./dados-historicos";
import type { Previsao2026 } from "./fetch-dados";
import type { CotaIDN } from "./fetch-dados";
import type { EstacaoComDOY } from "./sub-bacias";
import { detectaOndaBranco, type ResultadoOndaBranco } from "./onda-branco";
import { dessincronizacaoExcedeP85, type ResultadoDessincronizacao } from "./dessincronizacao-detector";
import { projetaDataCruzamento17_7 } from "./recessao-modelo";
import { calculaIDNSimples } from "./calcula-idn";
import { geraInsights, type InsightData } from "./gera-insights";

export interface ManscheteBriefing {
  eyebrow: string;       // pequeno rótulo acima do título (ex: "ALERTA DA SEMANA")
  titulo:  string;       // manchete principal
  lead:    string;       // 1-2 frases de abertura
}

export interface SubHeadline {
  rotulo: string;        // ex: "Negro alto", "Madeira", "Regulatório"
  titulo: string;
  texto:  string;
}

export interface AlertaDestaque {
  severidade: "atencao" | "alta" | "critica";
  rotulo:     string;
  texto:      string;
}

export interface Briefing {
  numero_semana:      number;       // 1..53
  data_publicacao:    string;       // YYYY-MM-DD
  ano:                number;
  manchete:           ManscheteBriefing;
  sublinhas:          SubHeadline[];
  alerta_destaque:    AlertaDestaque | null;
  paragrafo_contexto: string;
  fonte_dados:        string;
}

export interface SnapshotBriefing {
  dados:        Record<string, DadosEstacao>;
  cotasIDN:     Partial<Record<EstacaoComDOY, CotaIDN>>;
  previsao:     Previsao2026;
  data_ref:     string;   // YYYY-MM-DD — geralmente hoje
  // Série recente de Caracaraí para detectar Onda Branco. Opcional —
  // se ausente, o detector é skipado.
  serie_caracarai?: { data: string; cota_m: number }[];
  // Série recente de IDN para detectar dessincronização.
  serie_idn?:       { data: string; idn: number }[];
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

function semanaDoAno(iso: string): number {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formataDataPtBR(iso: string): string {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [a, m, d] = iso.split("-");
  return `${d}/${meses[parseInt(m, 10) - 1] ?? "?"}/${a}`;
}

function diferencaDias(de: string, ate: string): number {
  return Math.round(
    (new Date(ate + "T00:00:00Z").getTime() -
     new Date(de + "T00:00:00Z").getTime()) / 86400000,
  );
}

// ─── Composer principal ──────────────────────────────────────────────────────

export function geraBriefing(s: SnapshotBriefing): Briefing {
  const numero_semana   = semanaDoAno(s.data_ref);
  const ano             = parseInt(s.data_ref.slice(0, 4), 10);

  // ─── Fato 1: Onda Branco ───
  let onda: ResultadoOndaBranco | null = null;
  if (s.serie_caracarai && s.serie_caracarai.length >= 8) {
    onda = detectaOndaBranco(s.serie_caracarai, 7);
  }

  // ─── Fato 2: Dessincronização ───
  let dessinc: ResultadoDessincronizacao | null = null;
  const sgc = s.dados.SGC; const hum = s.dados.Humaita;
  const mao = s.dados.Manaus; const ita = s.dados.Itacoatiara;
  if (sgc && hum && mao && ita) {
    const idn = s.serie_idn?.length
      ? s.serie_idn[s.serie_idn.length - 1].idn
      : calculaIDNSimples(
          { SGC: sgc.cota_m, Humaita: hum.cota_m, PortoVelho: s.dados.PortoVelho?.cota_m, Manicore: s.dados.Manicore?.cota_m },
          sgc.ultima_atualizacao,
        );
    dessinc = dessincronizacaoExcedeP85(idn, s.data_ref);
  }

  // ─── Fato 3: Cruzamento 17,7m projetado ───
  const cruz = projetaDataCruzamento17_7(
    s.previsao.manaus_pico_cheia.media,
    `${ano}-06-15`,    // heurística de data do pico
  );
  const diasParaCruzamentoCentral = cruz.central
    ? diferencaDias(s.data_ref, cruz.central)
    : null;
  const cruzPertoNoHorizonte =
    diasParaCruzamentoCentral != null &&
    diasParaCruzamentoCentral >= 0 &&
    diasParaCruzamentoCentral <= 60;

  // ─── Insights operacionais (para sub-headlines) ───
  const insights = geraInsights(s.dados);
  const criticos = insights.filter((i) => i.tipo === "critico");

  // ─── SELEÇÃO DE MANCHETE (prioridade decrescente) ───
  let manchete: ManscheteBriefing;

  if (onda?.disparado) {
    const severidadeRotulo = onda.severidade === "extrema" ? "EXTREMA" : "ALTA";
    manchete = {
      eyebrow: `ALERTA — Onda Branco · ${severidadeRotulo}`,
      titulo:  `Subida atípica em Caracaraí deve chegar em Manaus por ${formataDataPtBR(onda.eta_manaus_data ?? "")}`,
      lead:    `O Rio Branco registrou alta de ${onda.var_total_m.toFixed(2)} m em ${onda.janela_dias} dias na estação de Caracaraí — acima do P${onda.severidade === "extrema" ? "95" : "85"} histórico (${(onda.percentil_historico * 100).toFixed(0)}º percentil). A onda de cheia deve propagar pelo Negro e chegar em Manaus em ~${onda.eta_manaus_dias} dias, podendo elevar o pico previsto pelo SGB.`,
    };
  } else if (dessinc?.excede) {
    const driverNome = dessinc.direcao === "norte" ? "Negro alto está mais depleted que o Madeira" : "Madeira está mais depleted que o Negro alto";
    const driverRotulo = dessinc.direcao === "norte" ? "DRIVER NORTE" : "DRIVER SUL";
    manchete = {
      eyebrow: `DESSINCRONIZAÇÃO — ${driverRotulo} · ${dessinc.severidade.toUpperCase()}`,
      titulo:  `Sistema fluvial em regime ${dessinc.direcao === "norte" ? "Norte" : "Sul"} extremo: IDN = ${dessinc.idn_atual >= 0 ? "+" : ""}${dessinc.idn_atual.toFixed(2)}`,
      lead:    `O Índice de Dessincronização Norte-Sul atingiu ${dessinc.idn_atual >= 0 ? "+" : ""}${dessinc.idn_atual.toFixed(2)}, acima do P85 histórico (${dessinc.p85_doy?.toFixed(2) ?? "?"}) para este período do ano. O ${driverNome} — padrão similar ao observado em ciclos de seca anteriores.`,
    };
  } else if (cruzPertoNoHorizonte) {
    manchete = {
      eyebrow: `CALENDÁRIO LWS — ${diasParaCruzamentoCentral} dias`,
      titulo:  `Manaus deve cruzar 17,7 m em ${formataDataPtBR(cruz.central!)} segundo modelo IBI`,
      lead:    `Projeção forward do ciclo ${ano} indica que a cota de Manaus alcança o gatilho regulatório de 17,7 m por volta de ${formataDataPtBR(cruz.central!)}, com intervalo de incerteza entre ${formataDataPtBR(cruz.max ?? cruz.central!)} (cenário rápido) e ${formataDataPtBR(cruz.min ?? cruz.central!)} (lento). A janela de calado fundo se fecha nas semanas seguintes.`,
    };
  } else if (criticos.length > 0) {
    const c = criticos[0];
    manchete = {
      eyebrow: `ALERTA CRÍTICO — ${c.estacao ?? "Sistema"}`,
      titulo:  c.titulo,
      lead:    c.texto,
    };
  } else {
    // Fallback: status semanal
    const cotaManaus = mao?.cota_m ?? 0;
    const tendencia = mao?.variacao_24h ?? 0;
    manchete = {
      eyebrow: "Status semanal · sistema dentro da banda",
      titulo:  `Manaus em ${cotaManaus.toFixed(2)} m, sem dispersões extremas no IDN`,
      lead:    `Nenhum gatilho disparou na semana ${numero_semana}/${ano}. Manaus em ${cotaManaus.toFixed(2)} m (${tendencia >= 0 ? "+" : ""}${tendencia} cm/24h). Pico previsto pelo SGB: ${s.previsao.manaus_pico_cheia.media.toFixed(2)} m.`,
    };
  }

  // ─── SUB-HEADLINES (até 3) ───
  // Estratégia: pegar até 3 sub-temas distintos. Evitar duplicar a manchete.
  const sublinhas: SubHeadline[] = [];

  // Sub-headline 1: SGC/Negro alto se ainda relevante
  if (sgc) {
    const delta = sgc.delta_2025;
    sublinhas.push({
      rotulo: "Negro alto",
      titulo: sgc.cota_m < 7.96
        ? `SGC em ${sgc.cota_m.toFixed(2)} m — abaixo do P10 histórico`
        : `SGC em ${sgc.cota_m.toFixed(2)} m (${delta >= 0 ? "+" : ""}${delta} cm vs 2025)`,
      texto: sgc.cota_m < 7.96
        ? `São Gabriel da Cachoeira sob a marca de 796 cm (P10 da série completa). Em 17/mar/2026 atingiu 620 cm — 927 cm abaixo de 2024 na mesma data. Padrão sem precedente.`
        : `São Gabriel da Cachoeira segue o ciclo de enchente do Negro alto. Comparação com 2025 mostra ${Math.abs(delta)} cm ${delta >= 0 ? "acima" : "abaixo"} — o sinal de driver Norte ${delta < -50 ? "se mantém" : "perde intensidade"}.`,
    });
  }

  // Sub-headline 2: Madeira/Sul
  if (hum) {
    const delta = hum.delta_2025;
    const pvo = s.dados.PortoVelho;
    sublinhas.push({
      rotulo: "Madeira",
      titulo: `Humaitá em ${hum.cota_m.toFixed(2)} m${pvo ? `; Porto Velho ${pvo.cota_m.toFixed(2)} m` : ""}`,
      texto: `Humaitá ${delta >= 0 ? "+" : ""}${delta} cm vs 2025. ${
        pvo
          ? `Porto Velho ${pvo.delta_2025 >= 0 ? "+" : ""}${pvo.delta_2025} cm — Madeira ${
              pvo.delta_2025 > 0 ? "acima" : "abaixo"
            } da referência do ano anterior.`
          : ""
      }`,
    });
  }

  // Sub-headline 3: Itacoatiara / Tabocal (sempre relevante para frete)
  if (ita) {
    const delta = ita.delta_2025;
    sublinhas.push({
      rotulo: "Tabocal / Itacoatiara",
      titulo: `Itacoatiara em ${ita.cota_m.toFixed(2)} m (pico previsto ${s.previsao.itacoatiara_pico.toFixed(2)} m)`,
      texto: `Atual ${delta >= 0 ? "+" : ""}${delta} cm vs 2025. Pico SGB ${s.previsao.itacoatiara_pico.toFixed(2)} m sugere janela de calado ${
        s.previsao.itacoatiara_pico >= 13.0 ? "favorável" : "apertada"
      } no Tabocal. Em 2024 a mínima veio 22 dias após a de Manaus — relação a monitorar quando a descida começar.`,
    });
  }

  // ─── ALERTA DESTAQUE ───
  let alerta_destaque: AlertaDestaque | null = null;

  if (onda?.disparado) {
    alerta_destaque = {
      severidade: onda.severidade === "extrema" ? "critica" : "alta",
      rotulo:     "Onda Branco a caminho",
      texto:      `Caracaraí subiu ${onda.var_total_m.toFixed(2)} m em ${onda.janela_dias} dias (taxa ${onda.taxa_cm_dia} cm/dia). ETA Manaus: ${formataDataPtBR(onda.eta_manaus_data ?? "")} — pico SGB pode ser superado.`,
    };
  } else if (dessinc?.excede) {
    alerta_destaque = {
      severidade: dessinc.severidade === "extrema" ? "critica" : "alta",
      rotulo:     `Dessincronização ${dessinc.direcao === "norte" ? "Driver Norte" : "Driver Sul"}`,
      texto:      dessinc.motivo,
    };
  } else if (cruzPertoNoHorizonte) {
    alerta_destaque = {
      severidade: "atencao",
      rotulo:     "Janela LWS se aproxima",
      texto:      `Manaus cruza 17,7 m em ~${diasParaCruzamentoCentral} dias (${formataDataPtBR(cruz.central!)}). Faixa IC80: ${formataDataPtBR(cruz.max ?? "")} – ${formataDataPtBR(cruz.min ?? "")}.`,
    };
  }

  // ─── PARÁGRAFO DE CONTEXTO ───
  const idnParaContexto = dessinc?.idn_atual ?? 0;
  const idnDirecao = idnParaContexto > 0.2 ? "Driver Norte"
                   : idnParaContexto < -0.2 ? "Driver Sul"
                   : "regime sincronizado";

  const paragrafo_contexto =
    `Semana ${numero_semana}/${ano}. Sistema fluvial em ${idnDirecao} (IDN = ${idnParaContexto >= 0 ? "+" : ""}${idnParaContexto.toFixed(2)}). ` +
    `Manaus ${mao?.cota_m.toFixed(2) ?? "?"} m, Itacoatiara ${ita?.cota_m.toFixed(2) ?? "?"} m, ` +
    `Humaitá ${hum?.cota_m.toFixed(2) ?? "?"} m. ` +
    `Previsão de pico para Manaus: ${s.previsao.manaus_pico_cheia.media.toFixed(2)} m ` +
    `(IC80 ${s.previsao.manaus_pico_cheia.ic80_min.toFixed(2)}–${s.previsao.manaus_pico_cheia.ic80_max.toFixed(2)} m). ` +
    `Cruzamento estimado de 17,7 m na descida: ${cruz.central ? formataDataPtBR(cruz.central) : "—"} ` +
    `(modelo IBI, IC80 ${cruz.max ? formataDataPtBR(cruz.max) : "—"} a ${cruz.min ? formataDataPtBR(cruz.min) : "—"}).`;

  return {
    numero_semana,
    data_publicacao:    s.data_ref,
    ano,
    manchete,
    sublinhas:          sublinhas.slice(0, 3),
    alerta_destaque,
    paragrafo_contexto,
    fonte_dados:        s.previsao.fonte,
  };
}

/**
 * Versão "vazia" para fallback quando snapshot está incompleto.
 */
export function briefingMinimo(data_ref: string, motivo: string): Briefing {
  return {
    numero_semana:   semanaDoAno(data_ref),
    data_publicacao: data_ref,
    ano:             parseInt(data_ref.slice(0, 4), 10),
    manchete: {
      eyebrow: "Briefing indisponível",
      titulo:  "Dados insuficientes para gerar o briefing desta semana",
      lead:    motivo,
    },
    sublinhas:          [],
    alerta_destaque:    null,
    paragrafo_contexto: "",
    fonte_dados:        "—",
  };
}

// Export reuso pelo InsightData (para a página /briefing-semanal listar
// também os insights operacionais como sidebar opcional)
export type { InsightData };
