import { posicaoRelativa } from "./limiares";

export function calculaIDN(
  curicuriari_m: number,
  humaita_m: number
): number {
  const pos_cur = posicaoRelativa(curicuriari_m, "Curicuriari");
  const pos_hum = posicaoRelativa(humaita_m, "Humaita");
  return +(pos_cur - pos_hum).toFixed(3);
}

export function classificaIDN(idn: number): {
  regime: string;
  descricao: string;
  cor: string;
} {
  if (idn > 0.2)
    return {
      regime: "Driver Norte",
      descricao: "Negro alto mais seco — padrão 2026",
      cor: "#D4922A",
    };
  if (idn < -0.2)
    return {
      regime: "Driver Sul",
      descricao: "Madeira mais seco — padrão 2024",
      cor: "#A0153E",
    };
  return {
    regime: "Sincronizado",
    descricao: "Regime normal — bacias equilibradas",
    cor: "#00C04B",
  };
}

export type RiscoDescasamento = "NORMAL" | "MODERADO" | "ELEVADO";

export function riscoDescasamento(
  manaus_m: number,
  itacoatiara_m: number,
  delta_mao_cm: number,
  delta_ita_cm: number
): { nivel: RiscoDescasamento; cor: string } {
  const divergencia = Math.abs(delta_mao_cm - delta_ita_cm);
  if (manaus_m < 17.7 || divergencia > 80)
    return { nivel: "ELEVADO", cor: "#A0153E" };
  if (divergencia > 40 || manaus_m < 19)
    return { nivel: "MODERADO", cor: "#D4922A" };
  return { nivel: "NORMAL", cor: "#00C04B" };
}
