"use client";

import {
  ComposedChart, Line, Scatter, ErrorBar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';

/**
 * Gráfico dedicado ao PortGDP.
 *
 * Mostra o que o indicador realmente é: a var12m do PIM-PF (linha realizada),
 * sobreposta pelas previsões pontuais do IBI (validação histórica e produção)
 * e pela banda conformal IC80 das previsões em produção.
 *
 * Por que dedicado: o `line_dual` genérico plotava dois índices brutos em
 * unidades distintas (PortGDP_imp e PIM-PF nível) e nunca mostrava o produto
 * — a previsão. Senior-stats friendly: previsto vs realizado em pp.
 */
export default function GraficoPortGDP({ indicador }) {
  const dados = indicador.dados || [];
  const trackRecord = (indicador.track_record || []).filter((r) => r.horizonte === 2);
  const cardPrev = indicador.card_previsao_atual;

  // ─── var12m do PIM-PF realizado ────────────────────────────────────────
  const ordenados = [...dados]
    .filter((r) => r.mes && r.pim_pf != null)
    .sort((a, b) => String(a.mes).localeCompare(String(b.mes)));

  const pimByMes = new Map(ordenados.map((r) => [r.mes, r.pim_pf]));
  const ymOffset = (mes, k) => {
    // mes no formato YYYY-MM-DD; soma k meses (k pode ser negativo)
    const [a, m, d] = mes.split('-').map(Number);
    const dt = new Date(Date.UTC(a, m - 1 + k, d || 1));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-01`;
  };

  // Plotamos só de 2018 em diante para focar na janela de validação OOS
  const inicio = '2018-01-01';
  const serieRealizada = ordenados
    .filter((r) => r.mes >= inicio)
    .map((r) => {
      const mes12 = ymOffset(r.mes, -12);
      const pim12 = pimByMes.get(mes12);
      const var12m = pim12 ? ((r.pim_pf / pim12) - 1) * 100 : null;
      return { mes: r.mes, var12m_realizado: var12m };
    });

  // ─── monta ponto-a-ponto: realizado + previsto + bandas ────────────────
  const trMap = new Map();
  trackRecord.forEach((r) => {
    const mes = r.mes_alvo.length === 7 ? `${r.mes_alvo}-01` : r.mes_alvo;
    trMap.set(mes, r);
  });
  if (cardPrev) {
    const mesAlvo = cardPrev.mes_alvo.length === 7 ? `${cardPrev.mes_alvo}-01` : cardPrev.mes_alvo;
    if (!trMap.has(mesAlvo)) {
      trMap.set(mesAlvo, {
        mes_alvo: cardPrev.mes_alvo,
        horizonte: 2,
        previsto_pp: cardPrev.var12m_prevista_pp,
        intervalo_inferior_pp: cardPrev.intervalo_inferior_pp,
        intervalo_superior_pp: cardPrev.intervalo_superior_pp,
        tipo: 'producao',
      });
    }
  }

  // Une as datas e monta dataset para o ComposedChart
  const todasDatas = new Set([
    ...serieRealizada.map((r) => r.mes),
    ...trMap.keys(),
  ]);
  const datasOrdenadas = [...todasDatas].sort();

  const dataPlot = datasOrdenadas.map((mes) => {
    const real = serieRealizada.find((r) => r.mes === mes);
    const tr = trMap.get(mes);
    const isProd = tr?.tipo === 'producao';
    const isVal = tr?.tipo === 'validacao_historica';
    // ErrorBar do Recharts espera offset (errLow, errHigh) ≥ 0 do ponto central.
    const errProd =
      isProd && tr.intervalo_inferior_pp != null && tr.intervalo_superior_pp != null
        ? [
            Math.max(0, tr.previsto_pp - tr.intervalo_inferior_pp),
            Math.max(0, tr.intervalo_superior_pp - tr.previsto_pp),
          ]
        : null;
    return {
      mes,
      var12m_realizado: real?.var12m_realizado ?? null,
      previsto_val: isVal ? tr.previsto_pp : null,
      previsto_prod: isProd ? tr.previsto_pp : null,
      err_prod: errProd,
    };
  });

  // Limites do eixo Y razoáveis (focando em var12m típico ±15 pp)
  const yValores = dataPlot.flatMap((d) => {
    const vals = [d.var12m_realizado, d.previsto_val, d.previsto_prod];
    if (d.previsto_prod != null && d.err_prod) {
      vals.push(d.previsto_prod - d.err_prod[0], d.previsto_prod + d.err_prod[1]);
    }
    return vals;
  }).filter((v) => v != null && Number.isFinite(v));
  const yMin = Math.min(...yValores, -8);
  const yMax = Math.max(...yValores, 8);
  const yPad = (yMax - yMin) * 0.08;

  // Início da janela "produção" para sombreamento leve
  const prodEntries = [...trMap.entries()].filter(([, r]) => r.tipo === 'producao');
  const inicioProd = prodEntries.length
    ? prodEntries.map(([m]) => m).sort()[0]
    : null;
  const fimProd = prodEntries.length
    ? prodEntries.map(([m]) => m).sort().slice(-1)[0]
    : null;

  const fmtMes = (s) => {
    if (!s) return '';
    const [a, m] = String(s).split('-');
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${meses[parseInt(m, 10) - 1]}/${String(a).slice(2)}`;
  };
  const fmtPp = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(2) + ' pp';

  return (
    <div>
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={dataPlot}
            margin={{ top: 12, right: 16, bottom: 28, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="mes"
              tickFormatter={fmtMes}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              minTickGap={36}
            />
            <YAxis
              domain={[yMin - yPad, yMax + yPad]}
              tickFormatter={(v) => v.toFixed(0)}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              label={{
                value: 'var. 12m PIM-PF (pp)',
                angle: -90,
                position: 'insideLeft',
                fill: '#9ca3af',
                fontSize: 12,
              }}
            />
            <Tooltip
              contentStyle={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: 8,
                color: '#e5e7eb',
                fontSize: 12,
              }}
              labelFormatter={fmtMes}
              formatter={(v, name) => {
                if (Array.isArray(v)) return [`${fmtPp(v[0])} a ${fmtPp(v[1])}`, name];
                return [fmtPp(v), name];
              }}
            />
            <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />

            {/* zero line */}
            <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="2 2" />

            {/* janela de produção (sombreamento leve) */}
            {inicioProd && fimProd && (
              <ReferenceArea
                x1={inicioProd}
                x2={fimProd}
                fill="#c1322f"
                fillOpacity={0.05}
                stroke="none"
              />
            )}

            {/* linha realizada (PIM-PF var12m) */}
            <Line
              type="monotone"
              dataKey="var12m_realizado"
              name="PIM-PF realizado (var. 12m)"
              stroke="#9ca3af"
              strokeWidth={1.8}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />

            {/* previsões em validação histórica — pontos */}
            <Scatter
              dataKey="previsto_val"
              name="Previsto IBI (validação histórica)"
              fill="#0099D8"
              shape="circle"
              isAnimationActive={false}
            />

            {/* previsões em produção — pontos + ErrorBar (IC80 conformal) */}
            <Scatter
              dataKey="previsto_prod"
              name="Previsto IBI (produção, IC80)"
              fill="#c1322f"
              shape="diamond"
              isAnimationActive={false}
            >
              <ErrorBar
                dataKey="err_prod"
                width={6}
                strokeWidth={1.5}
                stroke="#c1322f"
                direction="y"
              />
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-gray-500">
        Linha cinza: variação interanual realizada do PIM-PF (calculada de <code>dados[].pim_pf</code>).
        Círculos azuis: previsões do IBI na amostra recente de validação histórica (h=2).
        Losangos vermelhos: previsões em produção (emitidas desde mai/2026), com barras de erro conformais IC 80%
        — note a largura: bandas sobre-conservadoras refletidas em cobertura empírica de 100% em 29 origens de teste.
      </p>
    </div>
  );
}
