// Propagação de incerteza Monte Carlo no IRC.
//
// Cada componente tem incerteza intrínseca:
//   - LWS atual: cota observada tem ruído telemétrico ±2cm (desprezível)
//   - LWS projetado: ETA tem IC80 ±~50 dias do modelo de recessão
//   - HMM extremo: classificação de estado é probabilística (incerteza no IDN)
//   - Onda Branco: variação 7d depende da janela exata (ponto perdido = ±0.3m)
//   - Anomalia PP: categorial discreta (incerteza categórica)
//
// Estratégia: roda N amostras Monte Carlo perturbando os inputs com ruído
// calibrado, devolve média + desvio-padrão + IC80.

import { calculaIRC, type SnapshotIRC } from "./irc";
import { LAG_BRANCO_MANAUS } from "./lag-branco-manaus";

export interface IRCComIncerteza {
  irc_central:  number;
  irc_media:    number;
  irc_sigma:    number;
  irc_ic80_lo:  number;
  irc_ic80_hi:  number;
  ic80_largura: number;   // hi − lo
  n_amostras:   number;
  // Probabilidade de cada faixa entre as amostras MC
  prob_faixa: {
    verde:    number;
    amarelo:  number;
    laranja:  number;
    vermelho: number;
  };
}

// Amostragem de N(0, sigma) via Box-Muller
function gauss(mu: number, sigma: number): number {
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mu + sigma * z;
}

// Quantil empírico
function quantil(arr: number[], q: number): number {
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor(s.length * q)));
  return s[idx];
}

export function calculaIRCMonteCarlo(
  snap: SnapshotIRC,
  n_amostras = 1000,
): IRCComIncerteza {
  // Ruídos calibrados por componente:
  const SIGMA_COTA     = 0.02;                              // m — telemetria
  const SIGMA_IDN      = 0.10;                              // ±0.10 — agregação sub-bacia
  const SIGMA_VAR_ONDA = 0.30;                              // m — janela 7d
  const SIGMA_ETA      = 50;                                // d — IC80 da recessão
  const SIGMA_LAG      = LAG_BRANCO_MANAUS.sigma_estimado;  // d — IC80 bootstrap do lag

  const central = calculaIRC(snap);
  const amostras: number[] = [];
  const faixas = { verde: 0, amarelo: 0, laranja: 0, vermelho: 0 };

  for (let i = 0; i < n_amostras; i++) {
    const cota_pert = snap.cotaManaus_m + gauss(0, SIGMA_COTA);
    const idn_pert  = snap.idn + gauss(0, SIGMA_IDN);
    const var_pert  = Math.max(0, snap.var_onda_m + gauss(0, SIGMA_VAR_ONDA));
    const eta_pert  = snap.eta_dias_cruzamento != null
      ? Math.round(snap.eta_dias_cruzamento + gauss(0, SIGMA_ETA))
      : null;
    // Anomalia PP é categórica — não perturba
    const r = calculaIRC({
      ...snap,
      cotaManaus_m:        cota_pert,
      idn:                 idn_pert,
      var_onda_m:          var_pert,
      eta_dias_cruzamento: eta_pert,
      // severidade_onda_continua será re-derivada externamente; aqui mantemos
      severidade_onda_continua: snap.severidade_onda_continua,
    });
    amostras.push(r.irc);
    faixas[r.faixa]++;
  }

  const media = amostras.reduce((a, b) => a + b, 0) / amostras.length;
  const variance = amostras.reduce((a, b) => a + (b - media) ** 2, 0) / amostras.length;
  const sigma = Math.sqrt(variance);
  const ic80_lo = quantil(amostras, 0.10);
  const ic80_hi = quantil(amostras, 0.90);

  return {
    irc_central:  central.irc,
    irc_media:    +media.toFixed(1),
    irc_sigma:    +sigma.toFixed(1),
    irc_ic80_lo:  +ic80_lo.toFixed(1),
    irc_ic80_hi:  +ic80_hi.toFixed(1),
    ic80_largura: +(ic80_hi - ic80_lo).toFixed(1),
    n_amostras,
    prob_faixa: {
      verde:    +(faixas.verde    / n_amostras).toFixed(3),
      amarelo:  +(faixas.amarelo  / n_amostras).toFixed(3),
      laranja:  +(faixas.laranja  / n_amostras).toFixed(3),
      vermelho: +(faixas.vermelho / n_amostras).toFixed(3),
    },
  };
}
