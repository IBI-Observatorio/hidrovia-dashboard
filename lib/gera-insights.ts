// Lógica pura de geração de insights — sem JSX, usada pelo componente e pela API
import type { DadosEstacao } from "./dados-historicos";
import { calculaIDN } from "./calcula-idn";

export interface InsightData {
  tipo:    "critico" | "alerta" | "info" | "positivo";
  titulo:  string;
  texto:   string;
  estacao?: string;
}

export function geraInsights(dados: Record<string, DadosEstacao>): InsightData[] {
  const cur = dados.Curicuriari;
  const hum = dados.Humaita;
  const mao = dados.Manaus;
  const ita = dados.Itacoatiara;
  const pvo = dados.PortoVelho;

  if (!cur || !hum || !mao || !ita) return [];

  const idn       = calculaIDN(cur.cota_m, hum.cota_m);
  const divergencia = Math.abs(mao.delta_2025 - ita.delta_2025);
  const insights: InsightData[] = [];

  // Colapso histórico do Negro alto
  if (cur.cota_m < 7.96) {
    insights.push({
      tipo:    "critico",
      titulo:  "Colapso histórico do Negro alto",
      texto:   `Curicuriari em ${(cur.cota_m * 100).toFixed(0)} cm — abaixo do P10 histórico (796 cm). Em 17/mar/2026 atingiu 620 cm, 927 cm abaixo do mesmo dia de 2024. Padrão sem precedente na série.`,
      estacao: "Curicuriari",
    });
  }

  // Manaus abaixo do gatilho LWS
  if (mao.cota_m < 17.7) {
    insights.push({
      tipo:    "critico",
      titulo:  "Manaus abaixo do gatilho LWS — restrições de calado ativas",
      texto:   `Manaus em ${mao.cota_m.toFixed(2)} m (gatilho: 17,7 m). Em 2024, Manaus ficou 109 dias abaixo do gatilho. Verificar impacto operacional no Tabocal/Itacoatiara.`,
      estacao: "Manaus",
    });
  }

  // Divergência crescente Manaus–Itacoatiara
  if (divergencia > 40) {
    insights.push({
      tipo:    "alerta",
      titulo:  `Divergência Manaus–Itacoatiara: ${divergencia} cm`,
      texto:   `Em 2024, divergência similar antecedeu um lag de 22 dias nas mínimas — Itacoatiara continuou caindo enquanto Manaus já subia. Monitorar Tabocal.`,
      estacao: "Itacoatiara",
    });
  }

  // Dessincronização Norte-Sul alta
  if (idn > 0.3) {
    insights.push({
      tipo:    "alerta",
      titulo:  `Dessincronização Norte-Sul: IDN = +${idn.toFixed(2)} (Driver Norte)`,
      texto:   `Negro alto dramaticamente mais depleted que o Madeira. Curicuriari ${cur.delta_2025} cm abaixo de 2025; Humaitá ${hum.delta_2025 >= 0 ? "+" : ""}${hum.delta_2025} cm vs 2025. Padrão inédito em 2026.`,
    });
  } else if (idn < -0.3) {
    insights.push({
      tipo:    "alerta",
      titulo:  `Dessincronização Norte-Sul: IDN = ${idn.toFixed(2)} (Driver Sul)`,
      texto:   `Madeira mais depleted que o Negro alto — padrão similar a 2024. Monitorar Humaitá e Porto Velho.`,
    });
  }

  // Manaus se aproximando do gatilho (mas ainda acima)
  if (mao.cota_m >= 17.7 && mao.cota_m < 20) {
    const distancia = (mao.cota_m - 17.7).toFixed(2);
    insights.push({
      tipo:    "alerta",
      titulo:  `Manaus a ${distancia} m do gatilho LWS`,
      texto:   `Manaus em ${mao.cota_m.toFixed(2)} m. Se a queda atual (${mao.variacao_24h} cm/24h) persistir, o gatilho pode ser atingido em breve. Verificar previsão SGB.`,
      estacao: "Manaus",
    });
  }

  // Madeira acima da média (positivo)
  if (hum.delta_2025 > 0 && hum.cota_m > 11.68) {
    insights.push({
      tipo:    "positivo",
      titulo:  "Madeira acima da referência 2025",
      texto:   `Humaitá em ${hum.cota_m.toFixed(2)} m (+${hum.delta_2025} cm vs 2025). O Madeira sustenta a calha principal, mas não compensa o colapso do Negro alto.`,
      estacao: "Humaita",
    });
  }

  // Porto Velho em destaque
  if (pvo && pvo.delta_2025 > 50) {
    insights.push({
      tipo:    "info",
      titulo:  `Porto Velho ${pvo.delta_2025} cm acima de 2025`,
      texto:   `Excedente hídrico no Madeira superior está sustentando os níveis a jusante. Monitorar para descarga na calha principal.`,
      estacao: "PortoVelho",
    });
  }

  return insights;
}
