// GET /api/irc — endpoint público do IRC (Índice de Risco de Calado).
//
// Resposta:
//   {
//     irc_atual:    74.2,
//     faixa:        "laranja",
//     componentes:  { lws, hmm_extremo, onda_branco, anomalia_pp },
//     detalhes:     { cota_manaus_m, idn, ... },
//     serie_30d:    [{ data, irc, faixa }, ...],
//     metodologia:  "https://...",
//     atualizado:   "2026-05-21T...",
//   }
//
// Cache: 6h (revalidate=21600). Mesmo TTL dos outros endpoints públicos.

import { NextRequest, NextResponse } from "next/server";
import {
  fetchTodasEstacoes,
  fetchPrevisao2026,
  fetchSerieCaracarai,
} from "@/lib/fetch-dados";
import { calculaIRC, calculaIRC_Agora, detectaFaseCiclo, IRC_VERSAO } from "@/lib/irc";
import { calculaIRCTabocal, divergenciaIRC, IRC_TABOCAL_VERSAO } from "@/lib/irc-tabocal";
import { calculaIRCMonteCarlo } from "@/lib/irc-incerteza";
import { calculaIDNSimples } from "@/lib/calcula-idn";
import { detectaOndaBranco } from "@/lib/onda-branco";
import { projetaDataCruzamento17_7 } from "@/lib/recessao-modelo";
import { projetaCruzamentoTabocal, projetaCruzamentoCalado } from "@/lib/recessao-itacoatiara";
import { IRC_HISTORICO_CALCULADO } from "@/lib/irc-historico-calculado";

export const revalidate = 21600;

export async function GET(request: NextRequest) {
  try {
    const [dados, previsao, serieCaracarai] = await Promise.all([
      fetchTodasEstacoes(),
      fetchPrevisao2026(),
      fetchSerieCaracarai(14),
    ]);

    const sgc = dados.SGC;
    const hum = dados.Humaita;
    const mao = dados.Manaus;
    if (!sgc || !hum || !mao) {
      return NextResponse.json({ erro: "Dados insuficientes" }, { status: 503 });
    }

    const idnAtual = calculaIDNSimples(
      { SGC: sgc.cota_m, Humaita: hum.cota_m, PortoVelho: dados.PortoVelho?.cota_m, Borba: dados.Borba?.cota_m },
      sgc.ultima_atualizacao,
    );
    // Onda Branco com lag por regime (v2)
    const ondaBranco = serieCaracarai.length >= 8
      ? detectaOndaBranco(serieCaracarai, 7, idnAtual)
      : null;

    const ano = new Date().getUTCFullYear();
    const cruzamento = projetaDataCruzamento17_7(
      previsao.manaus_pico_cheia.media,
      `${ano}-06-15`,
    );
    const etaDias = cruzamento.central
      ? Math.round((new Date(cruzamento.central).getTime() - Date.now()) / 86400000)
      : null;

    const hojeISO = new Date().toISOString().slice(0, 10);
    const snapshot = {
      cotaManaus_m:        mao.cota_m,
      idn:                 idnAtual,
      severidade_onda:     ondaBranco?.severidade ?? "nenhuma" as const,
      severidade_onda_continua: ondaBranco?.severidade_continua,
      var_onda_m:          ondaBranco?.var_total_m ?? 0,
      anomalia_pp:         previsao.anomalia_pp_negro,
      eta_dias_cruzamento: etaDias,
      fase_ciclo:          detectaFaseCiclo(hojeISO),
    };

    const r_projetado = calculaIRC(snapshot);
    const r_agora     = calculaIRC_Agora(snapshot);
    const mc          = calculaIRCMonteCarlo(snapshot, 500);

    // ─── IRC-Tabocal v3 (ancorado em Itacoatiara) ─────────────────────────
    // Espelha o cruzamento Tabocal a partir da previsão Itacoatiara do SGB.
    const cruzTabocal = previsao.itacoatiara_pico
      ? projetaCruzamentoTabocal(previsao.itacoatiara_pico, `${ano}-06-15`)
      : { central: null, min: null, max: null };
    const etaDiasTabocal = cruzTabocal.central
      ? Math.round((new Date(cruzTabocal.central).getTime() - Date.now()) / 86400000)
      : null;
    const cotaItacoatiara = dados.Itacoatiara?.cota_m ?? 0;

    const r_tabocal = calculaIRCTabocal({
      cotaItacoatiara_m:           cotaItacoatiara,
      cotaManaus_m:                mao.cota_m,
      idn:                         idnAtual,
      severidade_onda:             ondaBranco?.severidade ?? "nenhuma" as const,
      severidade_onda_continua:    ondaBranco?.severidade_continua,
      var_onda_m:                  ondaBranco?.var_total_m ?? 0,
      anomalia_pp:                 previsao.anomalia_pp_negro,
      eta_dias_cruzamento_tabocal: etaDiasTabocal,
    });

    const divergencia = divergenciaIRC(r_projetado.irc, r_tabocal.irc);

    // ETA do calado-alvo (default 11m para uso público; assinantes parametrizam no front)
    // Query param ?calado=10.5 permite uso direto da API por sistemas integrados
    const caladoParam = new URL(request.url).searchParams.get("calado");
    const caladoAlvo = caladoParam ? parseFloat(caladoParam) : 11.0;
    const etaCalado = previsao.itacoatiara_pico
      ? projetaCruzamentoCalado(previsao.itacoatiara_pico, `${ano}-06-15`, caladoAlvo, 300)
      : null;

    const serie30 = IRC_HISTORICO_CALCULADO.slice(-30)
      .map((p) => ({ data: p.data, irc: p.irc, faixa: p.faixa }));

    return NextResponse.json({
      // v3: IRC-Tabocal é o índice PRINCIPAL (ponto de controle operacional real)
      irc_tabocal:        r_tabocal.irc,
      irc_tabocal_faixa:  r_tabocal.faixa,
      irc_tabocal_componentes: r_tabocal.componentes,
      irc_tabocal_versao: IRC_TABOCAL_VERSAO,

      // v2.1: IRC-Manaus mantido para comparação com parâmetro regulatório ANTAQ
      irc_manaus:         r_projetado.irc,
      irc_manaus_faixa:   r_projetado.faixa,
      irc_manaus_versao:  IRC_VERSAO,

      // Sinal regulatório: divergência entre os dois IRCs
      divergencia_regulatoria: {
        diferenca:        divergencia.diferenca,
        sinal:            divergencia.sinal_regulatorio,
        interpretacao:    divergencia.interpretacao,
      },

      // Dados Tabocal — v3.2: CMR oficial da Capitania
      eta_cruzamento_tabocal: cruzTabocal.central,
      gatilho_tabocal_m: -0.10,
      cota_itacoatiara_m: cotaItacoatiara,
      cmr_metros:        r_tabocal.detalhes.cmr_metros,
      deficit_calado_m:  r_tabocal.detalhes.deficit_calado_m,
      calado_alvo_m:     r_tabocal.detalhes.calado_alvo_m,
      cmr_fonte:         "Capitania dos Portos da Amazônia Ocidental",

      // v3.3: ETA do calado-alvo (data prevista para CMR cair abaixo do alvo)
      // Use ?calado=X.X para customizar o alvo (default 11m)
      eta_calado: etaCalado ? {
        calado_alvo_m:     etaCalado.calado_alvo_m,
        data_central:      etaCalado.data_central,
        dias_central:      etaCalado.dias_central,
        data_pessimista:   etaCalado.data_pessimista,
        dias_pessimista:   etaCalado.dias_pessimista,
        data_otimista:     etaCalado.data_otimista,
        dias_otimista:     etaCalado.dias_otimista,
        cota_ita_no_alvo:  etaCalado.cota_ita_no_alvo_m,
      } : null,

      // v2 legados (compatibilidade — preferir irc_tabocal/irc_manaus)
      irc_agora:        r_agora.irc,
      irc_agora_faixa:  r_agora.faixa,
      irc_projetado:    r_projetado.irc,
      irc_projetado_faixa: r_projetado.faixa,
      irc_atual:        r_projetado.irc,
      faixa:            r_projetado.faixa,
      // Componentes + pesos efetivos
      componentes:      r_projetado.componentes,
      pesos_efetivos:   r_projetado.pesos_efetivos,
      componentes_ausentes: r_projetado.componentes_ausentes,
      detalhes:         r_projetado.detalhes,
      // Incerteza Monte Carlo (n=500)
      incerteza: {
        sigma:        mc.irc_sigma,
        ic80_lo:      mc.irc_ic80_lo,
        ic80_hi:      mc.irc_ic80_hi,
        ic80_largura: mc.ic80_largura,
        prob_faixa:   mc.prob_faixa,
      },
      onda_branco: ondaBranco ? {
        severidade:        ondaBranco.severidade,
        severidade_continua: ondaBranco.severidade_continua,
        var_total_m:       ondaBranco.var_total_m,
        eta_manaus_dias:   ondaBranco.eta_manaus_dias,
        eta_manaus_data:   ondaBranco.eta_manaus_data,
        p85_mes:           ondaBranco.p85_mes,
        p95_mes:           ondaBranco.p95_mes,
      } : null,
      serie_30d:        serie30,
      metodologia:      "https://ibi-observatorio.org/docs/irc-metodologia",
      versao:           IRC_VERSAO,
      atualizado:       new Date().toISOString(),
      fontes: {
        cota:        mao.ultima_atualizacao,
        previsao:    previsao.fonte,
        eta_17_7m:   cruzamento.central,
        anomalia_pp_negro: previsao.anomalia_pp_negro,
      },
    });
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ erro: `Falha ao calcular IRC: ${erro}` }, { status: 500 });
  }
}
