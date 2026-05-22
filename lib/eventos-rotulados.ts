// Eventos âncora rotulados para validação cross-temporal do IRC.
// Severidade observada (1-5) reflete impacto operacional documentado:
//   1 = trivial (sistema saudável)
//   2 = atenção leve
//   3 = preocupação operacional
//   4 = estiagem/cheia severa
//   5 = mega-evento (impacto regulatório, restrição de calado)
//
// Curado a partir de:
//   - Boletins SGB/CPRM SAH Amazonas
//   - Documentação ANTAQ de eventos LWS
//   - Histórico de cotas (Manaus, Itacoatiara, Madeira, Negro)
//   - Boletins SEMA-AM
//   - Reports IBI/FPPA do Observatório

import type { SnapshotIRC } from "./irc";

export interface EventoRotulado {
  rotulo:                string;
  data:                  string;
  severidade_observada:  1 | 2 | 3 | 4 | 5;
  contexto:              string;
  snapshot:              SnapshotIRC;
}

export const EVENTOS_ROTULADOS: EventoRotulado[] = [
  // ─── Mega-eventos (severidade 5) ───────────────────────────────────────────
  {
    rotulo: "Mega-seca out/2024 — Manaus 12,11m (mínima recorde Itacoatiara)",
    data: "2024-10-09",
    severidade_observada: 5,
    contexto: "Manaus atingiu 12.11m (mínima do ciclo). Itacoatiara seguiu caindo por mais 22d, atingindo -0.17m em 31/out. Restrição operacional total no Tabocal.",
    snapshot: {
      cotaManaus_m: 12.11,
      idn: -0.55,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -2,
      eta_dias_cruzamento: -30,
    },
  },
  {
    rotulo: "Estiagem set/2010 — segunda pior do século XX",
    data: "2010-09-15",
    severidade_observada: 5,
    contexto: "Manaus baixou para 13.6m em outubro. Impacto severo na navegação de longa distância.",
    snapshot: {
      cotaManaus_m: 14.0,
      idn: -0.50,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -2,
      eta_dias_cruzamento: -15,
    },
  },
  {
    rotulo: "Cheia out/2021 — Manaus em 30,02m (máxima histórica)",
    data: "2021-06-16",
    severidade_observada: 4,
    contexto: "Cheia recorde. Risco de inundação urbana severa. IRC alto pelo extremo oposto.",
    snapshot: {
      cotaManaus_m: 30.02,
      idn: -0.10,
      severidade_onda: "moderada",
      severidade_onda_continua: 40,
      var_onda_m: 1.2,
      anomalia_pp: +2,
      eta_dias_cruzamento: 150,
    },
  },

  // ─── Severidade 4 — estiagem/cheia severa ──────────────────────────────────
  {
    rotulo: "Estiagem out/2023 — antessala da mega-seca 2024",
    data: "2023-10-15",
    severidade_observada: 4,
    contexto: "Manaus 14,5m. SGC já em colapso. Sinal de driver Sul severo.",
    snapshot: {
      cotaManaus_m: 14.5,
      idn: -0.40,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -1,
      eta_dias_cruzamento: -10,
    },
  },
  {
    rotulo: "Estiagem ago/2024 — Manaus aproximando do gatilho",
    data: "2024-09-01",
    severidade_observada: 4,
    contexto: "Cota descendo abaixo de 19m, antecipando o cruzamento de 17,7m em ~10 dias.",
    snapshot: {
      cotaManaus_m: 18.0,
      idn: -0.30,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -2,
      eta_dias_cruzamento: 10,
    },
  },
  {
    rotulo: "Estiagem nov/2015 — El Niño forte",
    data: "2015-11-01",
    severidade_observada: 4,
    contexto: "Período seco prolongado por El Niño 2015-16. Itacoatiara abaixo do P10.",
    snapshot: {
      cotaManaus_m: 14.8,
      idn: -0.35,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -2,
      eta_dias_cruzamento: -20,
    },
  },

  // ─── Severidade 3 — atenção operacional ────────────────────────────────────
  {
    rotulo: "Dessincronização mar/2026 — SGC colapsado, Manaus alto",
    data: "2026-03-17",
    severidade_observada: 3,
    contexto: "SGC em 6.20m (abaixo P10). IDN +0.52. Driver Norte extremo. Manaus operacional mas regime indica problema futuro.",
    snapshot: {
      cotaManaus_m: 24.82,
      idn: 0.55,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -2,
      eta_dias_cruzamento: 230,
    },
  },
  {
    rotulo: "Set/2022 — estiagem moderada, sem cruzar LWS",
    data: "2022-09-15",
    severidade_observada: 3,
    contexto: "Manaus 18.5m. Próximo do gatilho mas sem cruzar. Atenção sustentada.",
    snapshot: {
      cotaManaus_m: 18.5,
      idn: -0.20,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -1,
      eta_dias_cruzamento: 30,
    },
  },
  {
    rotulo: "Out/2017 — La Niña fraca, estiagem leve",
    data: "2017-10-15",
    severidade_observada: 3,
    contexto: "Manaus em 17.3m. Cruzou levemente o gatilho, retornou rápido.",
    snapshot: {
      cotaManaus_m: 17.3,
      idn: -0.15,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: 0,
      eta_dias_cruzamento: -5,
    },
  },

  // ─── Severidade 2 — atenção leve ───────────────────────────────────────────
  {
    rotulo: "Onda Branco mai/2026 — boletim 20° (sistema em cheia)",
    data: "2026-05-19",
    severidade_observada: 2,
    contexto: "Caracaraí +2.21m em 7d. Sinal antecipado para Manaus. Sistema operacional saudável agora, atenção para pico amplificado.",
    snapshot: {
      cotaManaus_m: 27.5,
      idn: 0.30,
      severidade_onda: "alta",
      severidade_onda_continua: 65.9,
      var_onda_m: 2.21,
      anomalia_pp: -1,
      eta_dias_cruzamento: 165,
    },
  },
  {
    rotulo: "Pre-cheia abr/2024 — Negro recuperando",
    data: "2024-04-15",
    severidade_observada: 2,
    contexto: "Sistema em recuperação após estiagem 2023, mas ainda com déficit acumulado.",
    snapshot: {
      cotaManaus_m: 24.5,
      idn: -0.25,
      severidade_onda: "moderada",
      severidade_onda_continua: 35,
      var_onda_m: 1.0,
      anomalia_pp: -1,
      eta_dias_cruzamento: 145,
    },
  },
  {
    rotulo: "Jul/2023 — vazante começando após cheia normal",
    data: "2023-07-15",
    severidade_observada: 2,
    contexto: "Descida do ciclo, mas dentro da banda histórica.",
    snapshot: {
      cotaManaus_m: 27.0,
      idn: -0.10,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: 0,
      eta_dias_cruzamento: 110,
    },
  },

  // ─── Severidade 1 — sistema saudável ──────────────────────────────────────
  {
    rotulo: "Cheia normal abr/2025 — sistema saudável",
    data: "2025-04-15",
    severidade_observada: 1,
    contexto: "Manaus 26.5m. Sem dispersões. Calado fundo em toda a bacia.",
    snapshot: {
      cotaManaus_m: 26.5,
      idn: 0.05,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: 0,
      eta_dias_cruzamento: 200,
    },
  },
  {
    rotulo: "Cheia abr/2018 — ano de cheia normal",
    data: "2018-04-15",
    severidade_observada: 1,
    contexto: "Sistema em ciclo normal, sem dispersões.",
    snapshot: {
      cotaManaus_m: 25.8,
      idn: 0.0,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: 0,
      eta_dias_cruzamento: 180,
    },
  },
  {
    rotulo: "Jun/2019 — pico de cheia médio",
    data: "2019-06-22",
    severidade_observada: 1,
    contexto: "Pico em 29.42m, em ano normal. Sem riscos operacionais.",
    snapshot: {
      cotaManaus_m: 29.42,
      idn: -0.05,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: 0,
      eta_dias_cruzamento: 160,
    },
  },
  {
    rotulo: "Mai/2020 — sistema em equilíbrio durante La Niña",
    data: "2020-05-15",
    severidade_observada: 1,
    contexto: "Cheia ligeiramente acima da média, sistema sincronizado.",
    snapshot: {
      cotaManaus_m: 28.0,
      idn: 0.05,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: +1,
      eta_dias_cruzamento: 175,
    },
  },
  {
    rotulo: "Jul/2016 — vazante normal",
    data: "2016-07-15",
    severidade_observada: 1,
    contexto: "Vazante padrão, sem anomalias.",
    snapshot: {
      cotaManaus_m: 26.0,
      idn: 0.10,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: 0,
      eta_dias_cruzamento: 90,
    },
  },

  // ─── Casos limítrofes ─────────────────────────────────────────────────────
  {
    rotulo: "Set/2014 — estiagem leve atípica do Madeira",
    data: "2014-09-15",
    severidade_observada: 2,
    contexto: "Madeira em vazante acelerada, mas Negro normal. Driver Sul incipiente.",
    snapshot: {
      cotaManaus_m: 20.0,
      idn: -0.25,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -1,
      eta_dias_cruzamento: 60,
    },
  },
  {
    rotulo: "Nov/2024 — Manaus se recuperando da mega-seca",
    data: "2024-11-15",
    severidade_observada: 3,
    contexto: "Manaus em 13.2m, ainda muito abaixo do gatilho. Itacoatiara em mínima histórica.",
    snapshot: {
      cotaManaus_m: 13.2,
      idn: -0.40,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -2,
      eta_dias_cruzamento: -45,
    },
  },
  {
    rotulo: "Fev/2026 — Negro alto extremamente baixo (início driver Norte)",
    data: "2026-02-15",
    severidade_observada: 3,
    contexto: "SGC abaixo do P10. Sistema antes do colapso de março. Sinal precoce.",
    snapshot: {
      cotaManaus_m: 26.0,
      idn: 0.35,
      severidade_onda: "nenhuma",
      severidade_onda_continua: 0,
      var_onda_m: 0,
      anomalia_pp: -2,
      eta_dias_cruzamento: 240,
    },
  },
];
