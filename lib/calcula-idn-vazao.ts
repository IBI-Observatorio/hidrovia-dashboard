// IDN técnico baseado em VAZÃO (m³/s) — para uso em laudos e Notas Técnicas.
// Resultado paralelo ao IDN de cota, mas usa a variável fisicamente correta
// (descarga em vez de altura de lâmina d'água).
//
// IDN_vazão > 0 → Norte mais depleted que o Sul (Driver Norte)
// IDN_vazão < 0 → Sul mais depleted (Driver Sul)

import { PERCENTIS_VAZAO_DOY } from "./percentis-vazao-doy";
import { posicaoSubBaciaVazao, type EstacaoVazao } from "./sub-bacias-vazao";

export function calculaIDNVazao(
  vazoesPorEstacao: Partial<Record<EstacaoVazao, number>>,
  dataISO: string
): {
  idn: number;
  pos_norte: number;
  pos_sul: number;
  estacoes_norte: EstacaoVazao[];
  estacoes_sul:   EstacaoVazao[];
} {
  const norte = posicaoSubBaciaVazao("Norte", vazoesPorEstacao, dataISO, PERCENTIS_VAZAO_DOY);
  const sul   = posicaoSubBaciaVazao("Sul",   vazoesPorEstacao, dataISO, PERCENTIS_VAZAO_DOY);
  const idn = sul.valor - norte.valor;
  return {
    idn: +idn.toFixed(3),
    pos_norte: +norte.valor.toFixed(3),
    pos_sul:   +sul.valor.toFixed(3),
    estacoes_norte: norte.estacoesUsadas,
    estacoes_sul:   sul.estacoesUsadas,
  };
}
