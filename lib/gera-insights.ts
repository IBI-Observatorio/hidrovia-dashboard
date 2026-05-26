// Lógica pura de geração de insights — sem JSX, usada pelo componente e pela API
import type { DadosEstacao } from "./dados-historicos";
import { calculaIDNSimples } from "./calcula-idn";
import { CALIBRACAO_IDN } from "./limiares-idn";

// Limiares calibrados empiricamente (GMM-3 sobre 2916 dias 2016-2023).
// Usa as mesmas fronteiras do classificaIDN para consistência interna.
const FRONTEIRA_SUL   = CALIBRACAO_IDN.fronteiras[0]; // ≈ -0.18
const FRONTEIRA_NORTE = CALIBRACAO_IDN.fronteiras[1]; // ≈ +0.49

export interface InsightData {
  tipo:    "critico" | "alerta" | "info" | "positivo";
  titulo:  string;
  texto:   string;
  estacao?: string;
}

export function geraInsights(dados: Record<string, DadosEstacao>): InsightData[] {
  const sgc = dados.SGC;
  const hum = dados.Humaita;
  const mao = dados.Manaus;
  const ita = dados.Itacoatiara;
  const pvo = dados.PortoVelho;

  if (!sgc || !hum || !mao || !ita) return [];

  const idn = calculaIDNSimples(
    {
      SGC:        sgc.cota_m,
      Humaita:    hum.cota_m,
      PortoVelho: pvo?.cota_m,
      Borba:      dados.Borba?.cota_m,
    },
    sgc.ultima_atualizacao
  );
  const divergencia = Math.abs(mao.delta_2025 - ita.delta_2025);
  const insights: InsightData[] = [];

  // Colapso histórico do Negro alto — só dispara com dado fresco (< 14 dias)
  const diasSGC = Math.round(
    (Date.now() - new Date(sgc.ultima_atualizacao).getTime()) / 86400000
  );
  if (sgc.cota_m < 7.96 && diasSGC < 14) {
    insights.push({
      tipo:    "critico",
      titulo:  "Colapso histórico do Negro alto",
      texto:   `São Gabriel da Cachoeira em ${(sgc.cota_m * 100).toFixed(0)} cm — abaixo do P10 histórico (796 cm). Em 17/mar/2026 atingiu 620 cm, 927 cm abaixo do mesmo dia de 2024. Padrão sem precedente na série.`,
      estacao: "SGC",
    });
  }

  // Manaus abaixo de 17,7 m
  if (mao.cota_m < 17.7) {
    insights.push({
      tipo:    "critico",
      titulo:  "Manaus abaixo de 17,7 m — referência histórica de baixas águas",
      texto:   `Manaus em ${mao.cota_m.toFixed(2)} m. Em 2024, Manaus ficou 109 dias abaixo dessa marca. Monitorar Itacoatiara — em 2024 a mínima ali veio 22 dias depois da mínima em Manaus.`,
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

  // Dessincronização Norte-Sul alta (limiares calibrados GMM)
  if (idn > FRONTEIRA_NORTE) {
    const intensidade = idn > FRONTEIRA_NORTE * 2 ? "inédita" : "expressiva";
    insights.push({
      tipo:    "alerta",
      titulo:  `Dessincronização Norte-Sul ${intensidade}: IDN = +${idn.toFixed(2)} (Driver Norte)`,
      texto:   `IDN supera fronteira calibrada de +${FRONTEIRA_NORTE.toFixed(2)} (GMM/2016-2023). Negro+Branco dramaticamente mais depleted que o Madeira+Purus. SGC ${sgc.delta_2025} cm abaixo de 2025; Humaitá ${hum.delta_2025 >= 0 ? "+" : ""}${hum.delta_2025} cm vs 2025.`,
    });
  } else if (idn < FRONTEIRA_SUL) {
    insights.push({
      tipo:    "alerta",
      titulo:  `Dessincronização Norte-Sul: IDN = ${idn.toFixed(2)} (Driver Sul)`,
      texto:   `IDN abaixo da fronteira calibrada de ${FRONTEIRA_SUL.toFixed(2)} (GMM/2016-2023). Madeira+Purus mais depleted que o Negro+Branco — padrão similar a 2024. Monitorar Humaitá e Porto Velho.`,
    });
  }

  // Manaus se aproximando de 17,7 m (mas ainda acima)
  if (mao.cota_m >= 17.7 && mao.cota_m < 20) {
    const distancia = (mao.cota_m - 17.7).toFixed(2);
    insights.push({
      tipo:    "alerta",
      titulo:  `Manaus a ${distancia} m da referência de baixas águas (17,7 m)`,
      texto:   `Manaus em ${mao.cota_m.toFixed(2)} m. Se a queda atual (${mao.variacao_24h} cm/24h) persistir, o nível de referência pode ser atingido em breve. Verificar previsão SGB.`,
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
