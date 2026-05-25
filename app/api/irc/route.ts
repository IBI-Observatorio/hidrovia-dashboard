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
import { CALIBRACAO_IRC_V36, PESOS_IRC_TABOCAL_V36_HASH } from "@/lib/irc-tabocal-pesos-calibrados-v36";
import { FAIXAS_IRC_CALIBRADAS } from "@/lib/irc-faixas-calibradas";
import { caladoEconomico, CONVERSAO_ECONOMICA_META } from "@/lib/conversao-economica";
import { calculaIRCMonteCarlo } from "@/lib/irc-incerteza";
import { calculaIDNSimples } from "@/lib/calcula-idn";
import { detectaOndaBranco } from "@/lib/onda-branco";
import { projetaDataCruzamento17_7 } from "@/lib/recessao-modelo";
import { projetaCruzamentoTabocal } from "@/lib/recessao-itacoatiara";
import { projetaETAporAnalogos } from "@/lib/recessao-analogos";
import { ITACOATIARA_HISTORICO_DIARIO } from "@/lib/itacoatiara-historico-diario";
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
    // ETA via análogos históricos (v3.5) — incerteza vem da dispersão observada
    // entre os 10 anos de 2016-2025, ponderada por similaridade da trajetória
    // 2026 atual. Banda fecha à medida que mais dias entram. Sem assunção
    // paramétrica.
    const serie2026 = Object.entries(ITACOATIARA_HISTORICO_DIARIO[2026] ?? {})
      .map(([data, cota]) => ({ data, cota: cota as number }))
      .sort((a, b) => a.data.localeCompare(b.data));
    const etaAnalogos = serie2026.length >= 30
      ? projetaETAporAnalogos(serie2026, caladoAlvo, 60, 0.5, 300)
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

      // v3.5: ETA via ANÁLOGOS HISTÓRICOS — comparação direta da trajetória
      // 2026 contra 2016-2025, sem assunção paramétrica. Banda fecha conforme
      // mais dias entram. Use ?calado=X.X para customizar o alvo (default 11m).
      eta_analogos: etaAnalogos ? {
        calado_alvo_m:    etaAnalogos.cmr_alvo_m,
        cota_alvo_m:      etaAnalogos.cota_alvo_m,
        data_atual:       etaAnalogos.data_atual,
        cota_atual_m:     etaAnalogos.cota_atual_m,
        janela_dias:      etaAnalogos.janela_dias,
        // Banda
        data_p10:         etaAnalogos.data_p10,
        data_p50:         etaAnalogos.data_p50,
        data_p90:         etaAnalogos.data_p90,
        dias_p10:         etaAnalogos.dias_p10,
        dias_p50:         etaAnalogos.dias_p50,
        dias_p90:         etaAnalogos.dias_p90,
        prob_cruzamento:  etaAnalogos.prob_cruzamento,
        // Ranking dos análogos
        ano_top:          etaAnalogos.ano_top,
        rmse_top:         etaAnalogos.rmse_top,
        analogos:         etaAnalogos.analogos.slice(0, 5).map((a) => ({
          ano:          a.ano,
          rmse_m:       a.rmse_m,
          peso_relativo: +(a.peso / etaAnalogos.analogos.reduce((s, x) => s + x.peso, 0)).toFixed(3),
          eta_iso:      a.eta_iso,
          eta_offset_d: a.eta_offset_d,
        })),
      } : null,

      // v3.6: METADADOS de calibração (rótulos ANTAQ) para auditoria
      metadata: {
        irc_tabocal_versao:   IRC_TABOCAL_VERSAO,
        irc_manaus_versao:    IRC_VERSAO,
        pesos_hash:           PESOS_IRC_TABOCAL_V36_HASH,
        calibracao_git_sha:   CALIBRACAO_IRC_V36.git_sha,
        calibracao_data:      CALIBRACAO_IRC_V36.gerado_em,
        rho_train:            CALIBRACAO_IRC_V36.rho_train,
        rho_test:             CALIBRACAO_IRC_V36.rho_test,
        p_valor_perm:         CALIBRACAO_IRC_V36.p_valor_perm,
        n_treino:             CALIBRACAO_IRC_V36.n_treino,
        n_teste:              CALIBRACAO_IRC_V36.n_teste,
        faixas_calibradas:    FAIXAS_IRC_CALIBRADAS,
        seed:                 CALIBRACAO_IRC_V36.seed,
        metodologia:          CALIBRACAO_IRC_V36.metodologia,
        ganho_vs_v35:         CALIBRACAO_IRC_V36.ganho_v36_vs_v35,
      },

      // v3.6: CAMADA DE CONVERSÃO ECONÔMICA
      // Cliente passa ?volume=250000&frete=180 (opcional, default Cargill-like)
      impacto_economico: (() => {
        const url = new URL(request.url);
        const volume = parseFloat(url.searchParams.get("volume") ?? "250000");
        const frete  = parseFloat(url.searchParams.get("frete")  ?? "180");
        return {
          volume_mensal_ton:   volume,
          frete_R$_ton:        frete,
          metodologia_r2:      CONVERSAO_ECONOMICA_META.r2,
          conversao:           caladoEconomico(r_tabocal.irc, volume, frete),
        };
      })(),

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
