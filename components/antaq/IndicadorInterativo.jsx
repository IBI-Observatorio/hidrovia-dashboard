"use client";

import GraficoBar from './graficos/GraficoBar';
import GraficoBarHorizontal from './graficos/GraficoBarHorizontal';
import GraficoLine from './graficos/GraficoLine';
import GraficoLineDual from './graficos/GraficoLineDual';
import GraficoHeatmap from './graficos/GraficoHeatmap';
import { DATA_BASE } from './cores';

/**
 * Renderiza um gráfico interativo conforme spec.tipo do JSON do indicador.
 * Fallback para a imagem PNG se o tipo for desconhecido ou os dados estiverem
 * vazios.
 */
export default function IndicadorInterativo({ indicador }) {
  const spec = indicador.grafico;
  const dados = indicador.dados || [];

  if (!spec || dados.length === 0) {
    return indicador.imagem ? (
      <img
        src={`${DATA_BASE}/${indicador.imagem}`}
        alt={indicador.titulo}
        className="w-full rounded-lg bg-white"
      />
    ) : null;
  }

  switch (spec.tipo) {
    case 'bar':            return <GraficoBar dados={dados} spec={spec} />;
    case 'bar_horizontal': return <GraficoBarHorizontal dados={dados} spec={spec} />;
    case 'line':           return <GraficoLine dados={dados} spec={spec} />;
    case 'line_dual':      return <GraficoLineDual dados={dados} spec={spec} />;
    case 'heatmap':        return <GraficoHeatmap dados={dados} spec={spec} />;
    default:
      return indicador.imagem ? (
        <img
          src={`${DATA_BASE}/${indicador.imagem}`}
          alt={indicador.titulo}
          className="w-full rounded-lg bg-white"
        />
      ) : null;
  }
}
