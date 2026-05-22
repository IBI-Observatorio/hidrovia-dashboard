import { posicaoRelativaRaw } from "./limiares";
import { PERCENTIS_DOY, diaDoAno } from "./percentis-doy";
import { posicaoSubBacia, type EstacaoComDOY } from "./sub-bacias";
import { CALIBRACAO_IDN } from "./limiares-idn";

// IDN > 0 → Sub-bacia Norte (Negro) mais depleted → Driver Norte (padrão 2026).
// IDN < 0 → Sub-bacia Sul (Madeira) mais depleted → Driver Sul (padrão 2024).
// Pode extrapolar ±1 em regimes extremos — é o sinal de ineditismo. Quando
// |IDN| > 1 o componente `extrapolado` vira true: a interface deve sinalizar
// que o valor está fora da banda histórica de calibração (HMM treinado em
// IDN ∈ [-0,9; +0,9], aproximadamente).

// Cálculo agregado por sub-bacia (média ponderada das posições DOY).
// Recebe um mapa { estacao: cota_m } e a data de referência.
export interface ResultadoIDN {
  idn:            number;
  pos_norte:      number;
  pos_sul:        number;
  estacoes_norte: string[];
  estacoes_sul:   string[];
  extrapolado:    boolean;   // |idn| > 1 → fora da banda de calibração
  fora_da_banda: "norte_extremo" | "sul_extremo" | "dentro";
}

export function calculaIDN(
  cotasPorEstacao: Partial<Record<EstacaoComDOY, number>>,
  dataISO: string
): ResultadoIDN {
  const norte = posicaoSubBacia("Norte", cotasPorEstacao, dataISO, PERCENTIS_DOY, diaDoAno);
  const sul   = posicaoSubBacia("Sul",   cotasPorEstacao, dataISO, PERCENTIS_DOY, diaDoAno);

  // IDN = (quanto o Sul está acima do normal) − (quanto o Norte está acima)
  const idn = sul.valor - norte.valor;
  const extrapolado = Math.abs(idn) > 1;

  return {
    idn: +idn.toFixed(3),
    pos_norte: +norte.valor.toFixed(3),
    pos_sul:   +sul.valor.toFixed(3),
    estacoes_norte: norte.estacoesUsadas,
    estacoes_sul:   sul.estacoesUsadas,
    extrapolado,
    fora_da_banda:
      idn >  1 ? "norte_extremo" :
      idn < -1 ? "sul_extremo"   :
      "dentro",
  };
}

// Função simples (apenas o número) para call-sites que só querem o IDN.
export function calculaIDNSimples(
  cotasPorEstacao: Partial<Record<EstacaoComDOY, number>>,
  dataISO: string
): number {
  return calculaIDN(cotasPorEstacao, dataISO).idn;
}

// Versão fallback (baseline anual) — usar quando não houver data ou percentis DOY.
export function calculaIDNFallback(sgc_m: number, humaita_m: number): number {
  return +(
    posicaoRelativaRaw(humaita_m, "Humaita") -
    posicaoRelativaRaw(sgc_m, "SGC")
  ).toFixed(3);
}

// Fronteiras vêm do GMM calibrado sobre série histórica (2016-2023).
// Para K=3: [Sul × Neutro, Neutro × Norte].
const FRONTEIRA_SUL   = CALIBRACAO_IDN.fronteiras[0];
const FRONTEIRA_NORTE = CALIBRACAO_IDN.fronteiras[1];

export function classificaIDN(idn: number): {
  regime: string;
  descricao: string;
  cor: string;
} {
  if (idn > FRONTEIRA_NORTE)
    return {
      regime: "Driver Norte",
      descricao: "Negro/Branco mais depleted — padrão 2026",
      cor: "#D4922A",
    };
  if (idn < FRONTEIRA_SUL)
    return {
      regime: "Driver Sul",
      descricao: "Madeira/Purus mais depleted — padrão 2024",
      cor: "#A0153E",
    };
  return {
    regime: "Sincronizado",
    descricao: "Regime normal — bacias equilibradas",
    cor: "#00C04B",
  };
}

export type RiscoDescasamento = "NORMAL" | "MODERADO" | "ELEVADO";

// Limiares deste indicador são REGULATÓRIOS, não estatísticos:
//   - 17,7 m é o gatilho LWS da ANTAQ (Low Water Season) em Manaus
//   - 40 cm e 80 cm de divergência são ordens de magnitude que, em 2024,
//     antecederam o lag de 22 dias entre mínimas Manaus e Itacoatiara
// Diferente das fronteiras do IDN (calibradas via GMM), aqui o valor regulatório
// é prescritivo — não cabe substituir por percentis sem alterar o significado.
// Limiares documentados em CLAUDE.md, seção "Alerta LWS".
const GATILHO_LWS_MANAUS_M = 17.7;
const DIVERGENCIA_ELEVADA_CM = 80;
const DIVERGENCIA_MODERADA_CM = 40;
const MANAUS_PROXIMO_GATILHO_M = 19.0;

export function riscoDescasamento(
  manaus_m: number,
  itacoatiara_m: number,
  delta_mao_cm: number,
  delta_ita_cm: number
): { nivel: RiscoDescasamento; cor: string } {
  const divergencia = Math.abs(delta_mao_cm - delta_ita_cm);
  if (manaus_m < GATILHO_LWS_MANAUS_M || divergencia > DIVERGENCIA_ELEVADA_CM)
    return { nivel: "ELEVADO", cor: "#A0153E" };
  if (divergencia > DIVERGENCIA_MODERADA_CM || manaus_m < MANAUS_PROXIMO_GATILHO_M)
    return { nivel: "MODERADO", cor: "#D4922A" };
  return { nivel: "NORMAL", cor: "#00C04B" };
}
