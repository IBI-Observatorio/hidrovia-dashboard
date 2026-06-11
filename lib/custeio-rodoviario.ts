// custeio-rodoviario.ts
// Engine PRÓPRIA de custo operacional rodoviário do Observatório IBI.
//
// O QUE É: replica a ESTRUTURA das metodologias públicas de custeio de
// transporte rodoviário de carga (cf. referenciais de custos da ANTT para
// o TRC e a literatura clássica de custeio: custos FIXOS rateados por km
// + custos VARIÁVEIS por km + pedágio por eixo + capacidade do veículo).
//
// O QUE NÃO É: não é frete de mercado, não é dado SIFRECA/Esalq-Log nem
// qualquer série proprietária. TODOS os coeficientes vêm de
// ParametrosCusteio (lib/iee-params.ts) — premissas IBI declaradas,
// versionadas e calibráveis. Nenhum número mágico no corpo das funções.
//
// Modelo (v0, documentado também em /agro/metodologia):
//   kmCiclo      = dist × (1 + fracaoRetornoVazio)        [retorno parcial vazio]
//   combustível  = (precoDiesel × descontoFrota / consumo) por km carregado;
//                  km vazio consome custoRelativoKmVazio do km carregado
//   variável     = pneus + manutenção + lubrificante (R$/km), mesmo rateio
//   fixo         = custoFixoMensal / kmRodadoMes, aplicado a TODO o ciclo
//   pedágio      = pedagioRSporKmPorEixo × eixos, aplicado a todo o ciclo
//   custo R$/t   = custo do ciclo ÷ capacidade útil do veículo

import type { ParametrosCusteio, PerfilVeiculo } from "./iee-params";

/** Decomposição exibível do custo da rota (R$/t). */
export interface DecomposicaoCusto {
  combustivel: number;
  variavel: number;
  fixo: number;
  pedagio: number;
}

export interface ResultadoCustoRota {
  /** custo operacional total (R$/t) */
  custoPorT: number;
  /** custo unitário (R$/t·km, sobre a distância carregada) */
  custoPorTKm: number;
  decomposicao: DecomposicaoCusto;
}

/**
 * Custo operacional de rodar a rota (R$/t), com decomposição.
 *
 * @param distanciaKm   distância rodoviária carregada (origem→porto)
 * @param perfil        perfil do veículo (capacidade, consumo, eixos, pneus)
 * @param parametros    coeficientes de custeio (premissas IBI declaradas;
 *                      precoDieselRS deve vir do último dado ANP)
 */
export function calculaCustoRota({
  distanciaKm,
  perfil,
  parametros,
}: {
  distanciaKm: number;
  perfil: PerfilVeiculo;
  parametros: ParametrosCusteio;
}): ResultadoCustoRota {
  const p = parametros;
  const kmVazio = distanciaKm * p.fracaoRetornoVazio;

  // R$/km de cada bloco (km carregado)
  const dieselFrota = p.precoDieselRS * p.descontoDieselFrota;
  const combustivelKm = dieselFrota / perfil.consumoKmL;
  const variavelKm =
    (p.custoPneuRS * perfil.pneus) / p.vidaUtilPneuKm +
    p.manutencaoRSporKm +
    p.lubrificanteRSporKm;
  const fixoKm = p.custoFixoMensalRS / p.kmRodadoMes;
  const pedagioKm = p.pedagioRSporKmPorEixo * perfil.eixos;

  // custo do ciclo (carregado + retorno vazio rateado)
  const fatorVazio = p.custoRelativoKmVazio;
  const custoCombustivel = combustivelKm * (distanciaKm + kmVazio * fatorVazio);
  const custoVariavel = variavelKm * (distanciaKm + kmVazio * fatorVazio);
  const custoFixo = fixoKm * (distanciaKm + kmVazio);
  const custoPedagio = pedagioKm * (distanciaKm + kmVazio);

  const total = custoCombustivel + custoVariavel + custoFixo + custoPedagio;
  const porT = total / perfil.capacidadeT;

  return {
    custoPorT: +porT.toFixed(2),
    custoPorTKm: +(porT / distanciaKm).toFixed(4),
    decomposicao: {
      combustivel: +(custoCombustivel / perfil.capacidadeT).toFixed(2),
      variavel: +(custoVariavel / perfil.capacidadeT).toFixed(2),
      fixo: +(custoFixo / perfil.capacidadeT).toFixed(2),
      pedagio: +(custoPedagio / perfil.capacidadeT).toFixed(2),
    },
  };
}
