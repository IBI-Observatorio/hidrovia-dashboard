"use client";

import GraficoBar from './graficos/GraficoBar';
import GraficoBarHorizontal from './graficos/GraficoBarHorizontal';
import GraficoLine from './graficos/GraficoLine';
import GraficoLineDual from './graficos/GraficoLineDual';
import GraficoHeatmap from './graficos/GraficoHeatmap';
import GraficoMediasMoveis31 from './graficos/GraficoMediasMoveis31';
import GraficoMediasMoveis32 from './graficos/GraficoMediasMoveis32';
import GraficoMediasMoveis33 from './graficos/GraficoMediasMoveis33';
import GraficoPortGDP from './graficos/GraficoPortGDP';
import { DATA_BASE } from './cores';

/**
 * Renderiza um gráfico interativo conforme spec.tipo do JSON do indicador.
 * Fallback para a imagem PNG se o tipo for desconhecido ou os dados estiverem
 * vazios.
 */
export default function IndicadorInterativo({ indicador }) {
  const spec = indicador.grafico;
  const dados = indicador.dados || [];

  // Tipos autossuficientes não precisam de dados embutidos no JSON do indicador
  const autossuficiente = ['medias_moveis_31','medias_moveis_32','medias_moveis_33','portgdp_forecast'];
  if (!spec || (dados.length === 0 && !autossuficiente.includes(spec.tipo))) {
    return indicador.imagem ? (
      <img
        src={`${DATA_BASE}/${indicador.imagem}`}
        alt={indicador.titulo}
        className="w-full rounded-lg bg-white"
      />
    ) : null;
  }

  switch (spec.tipo) {
    case 'bar':              return <GraficoBar dados={dados} spec={spec} />;
    case 'bar_horizontal':   return <GraficoBarHorizontal dados={dados} spec={spec} />;
    case 'line':             return <GraficoLine dados={dados} spec={spec} />;
    case 'line_dual':        return <GraficoLineDual dados={dados} spec={spec} />;
    case 'heatmap':          return <GraficoHeatmap dados={dados} spec={spec} />;
    // Médias móveis ANTAQ — dashboards autossuficientes (buscam /data/antaq/dashboard/)
    case 'medias_moveis_31': return <GraficoMediasMoveis31 />;
    case 'medias_moveis_32': return <GraficoMediasMoveis32 />;
    case 'medias_moveis_33': return <GraficoMediasMoveis33 />;
    case 'portgdp_forecast': return <GraficoPortGDP indicador={indicador} />;
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
