"use client";
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart, BarChart, LineChart, Line, Bar, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, LabelList,
} from 'recharts';
import { useDashboardData } from '../useDashboardData';
import { useCountUp } from '../../home/metric-utils';
import forecastConteiner from '@/lib/forecast-conteiner.json';
import horseRace       from '@/lib/horse-race-30.json';

// ── Paleta ──────────────────────────────────────────────────────────────────

const COR_OBS    = '#0099D8';  // ibi-blue (observado)
const COR_CHAMP  = '#D4922A';  // ouro (campeão / projeção / banda)
const COR_PRELIM = '#F59E0B';  // âmbar (mês preliminar — carga manual IBI)
const COR_GREEN  = '#00A652';
const COR_GRID   = '#374151';

const COR_ESCOLA = {
  naive:           '#6b7280',
  autorregressiva: '#0099D8',
  estrutural:      '#A0153E',
  decomposicao:    '#8B5CF6',
  ml:              '#EC4899',
  robusta:         '#D97706',
  combinacao:      '#14B8A6',
};
const LABEL_ESCOLA = {
  naive:           'Naïve / benchmark',
  autorregressiva: 'Autorregressiva',
  estrutural:      'Estrutural (exógena)',
  decomposicao:    'Decomposição',
  ml:              'Machine Learning',
  robusta:         'Robusta a quebra',
  combinacao:      'Combinação',
};

// ── Histórico das 4 cargas (mantido) ────────────────────────────────────────

const NATUREZAS = ['granel_solido', 'granel_liquido', 'carga_geral', 'conteinerizada'];
const CORES = {
  granel_solido:  '#00A652',
  granel_liquido: '#c1322f',
  carga_geral:    '#D4922A',
  conteinerizada: '#0099D8',
};
const LABELS = {
  granel_solido:  'Granel Sólido',
  granel_liquido: 'Granel Líquido e Gasoso',
  carga_geral:    'Carga Geral',
  conteinerizada: 'Contêiner',
};

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const fmtMes = (ym) => { if (!ym) return ''; const [y, m] = ym.split('-'); return `${MESES[+m - 1]}/${y.slice(2)}`; };
const fmtNum = (v, d = 1) => v == null || isNaN(v) ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (v, d = 2) => v == null || isNaN(v) ? '—' : (v >= 0 ? '+' : '') + v.toFixed(d).replace('.', ',') + '%';

const tickStyle    = { fill: '#9ca3af', fontSize: 11 };
const gridProps    = { stroke: COR_GRID, strokeDasharray: '3 3' };
const tooltipStyle = { backgroundColor: '#111827', border: '1px solid #4b5563', borderRadius: 8, fontSize: 12 };

// ─── Subcomponente: Nugget de antecipação ───────────────────────────────────

function NuggetCard({ label, valor, sufixo = '', cor, sub, decimais = 1, comSinal = false }) {
  const v = useCountUp(valor, decimais);
  const sinalPrefix = comSinal && valor > 0 ? '+' : '';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl p-4 border"
      style={{ background: `${cor}10`, borderColor: `${cor}40` }}
    >
      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: cor }}>
        {sinalPrefix}{v}{sufixo}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1 leading-snug">{sub}</div>}
    </motion.div>
  );
}

// ─── Subcomponente: Gráfico de forecast 15 anos ─────────────────────────────

function GraficoForecast({ allData, ultObs }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={allData} margin={{ top: 8, right: 20, bottom: 20, left: 4 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="data" tickFormatter={fmtMes} tick={tickStyle} interval={11} />
        <YAxis tick={tickStyle} tickFormatter={(v) => v.toFixed(0) + '%'}
               label={{ value: 'a/a (%)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11, dy: 30 }} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtMes}
                 formatter={(v, n) => [fmtPct(v, 2), n]} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" />
        <ReferenceLine x={ultObs.data} stroke="#9ca3af" strokeDasharray="2 4"
                       label={{ value: 'hoje', position: 'top', fill: '#9ca3af', fontSize: 10 }} />
        {/* Leque 95% (mais externo, mais transparente) */}
        <Area type="monotone" dataKey="lo95"      stackId="ic95"
              fill="transparent" stroke="none" legendType="none" connectNulls />
        <Area type="monotone" dataKey="span95"    stackId="ic95"
              fill="rgba(212,146,42,0.08)" stroke="none" name="IC 95%" connectNulls />
        {/* Leque 80% (interno) */}
        <Area type="monotone" dataKey="lo80"      stackId="ic80"
              fill="transparent" stroke="none" legendType="none" connectNulls />
        <Area type="monotone" dataKey="span80"    stackId="ic80"
              fill="rgba(212,146,42,0.20)" stroke="none" name="IC 80%" connectNulls />
        {/* Linhas históricas e projeção */}
        <Line type="monotone" dataKey="obs"        stroke={COR_OBS}   strokeWidth={2}
              dot={false} connectNulls name="Observado (ANTAQ)" />
        <Line type="monotone" dataKey="champ_back" stroke={COR_CHAMP} strokeWidth={1.5}
              strokeDasharray="4 2" dot={false} connectNulls name="Modelo (backtest)" />
        <Line type="monotone" dataKey="central"    stroke={COR_CHAMP} strokeWidth={2.4}
              dot={{ r: 4, fill: COR_CHAMP }} connectNulls name="Projeção 5m" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── Subcomponente: "O que isso significa" ──────────────────────────────────

function SignificadoBox({ forward, meta }) {
  const c0   = forward[0].central;
  const lo80 = forward[0].lo80;
  const hi80 = forward[0].hi80;
  return (
    <motion.div
      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-5"
    >
      <h3 className="text-base font-semibold text-white mb-2">O que isso significa</h3>
      <div className="space-y-2 text-sm text-gray-300 leading-relaxed">
        <p>
          O ritmo de crescimento do contêiner deve se manter perto de{' '}
          <strong style={{ color: COR_CHAMP }}>{fmtPct(c0, 1)}</strong> a/a nos próximos meses
          (intervalo de 80%: {fmtPct(lo80, 1)} a {fmtPct(hi80, 1)}).
          Não há sinal estatístico de desaceleração brusca.
        </p>
        <p className="text-gray-400">
          O método prevê o agregado liso (soma de 12 meses da tonelagem, que muda devagar e é
          altamente previsível h passos à frente) e deriva o ritmo a/a — em vez de tentar prever
          diretamente a variação, objeto super-diferenciado, ruidoso e frágil a quebras de regime.
        </p>
        <p className="text-xs text-gray-500 mt-3">
          Método: <span className="font-mono text-gray-400">{meta.metodo}</span> ·
          Theil U(h=5) = <strong className="text-gray-300">{meta.theilU_h5.toFixed(2)}</strong> ·
          Viés = <strong className="text-gray-300">{meta.vies > 0 ? '+' : ''}{meta.vies.toFixed(2)} p.p.</strong>
        </p>
      </div>
    </motion.div>
  );
}

// ─── Subcomponente: Ficha técnica do horse-race ─────────────────────────────

function FichaTecnicaHorseRace() {
  const dados = useMemo(() => {
    const rows = horseRace.ranking.map(([nome, rmse, U, escola, label], i) => ({
      posOriginal: i + 1,
      nome,
      rmse,
      U,
      escola,
      label,
      cor: label === 'campeao' ? COR_CHAMP : COR_ESCOLA[escola] || '#6b7280',
    }));
    return rows.sort((a, b) => a.U - b.U);
  }, []);

  const escolasUsadas = [...new Set(dados.map(d => d.escola))];
  const posBench = dados.findIndex(d => d.label === 'bench') + 1;

  return (
    <motion.details
      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="rounded-xl border border-gray-700 bg-gray-900/40 overflow-hidden"
    >
      <summary className="cursor-pointer p-5 text-sm font-semibold text-gray-300 hover:text-white select-none list-none">
        ▶ Ficha técnica — horse-race de 30 abordagens de forecast
      </summary>
      <div className="px-5 pb-5 border-t border-gray-700 pt-4">
        <p className="text-xs text-gray-400 mb-3 max-w-3xl leading-relaxed">
          Cada barra é um modelo testado em walk-forward sobre {horseRace.meta.janela_oos.replace(' a ', ' → ')} ({horseRace.meta.horizonte_meses} meses à frente, recursivo, sem vazamento).
          Quanto menor o <strong>Theil U</strong>, melhor: <strong>1,0 = empate</strong> com o palpite ingênuo de "amanhã = hoje".
          O <span style={{ color: COR_CHAMP }}>campeão</span> corta o erro pela metade. Benchmark naïve (no-change) está na posição {posBench}.
        </p>
        {/* Legenda de escolas */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4 text-xs">
          {escolasUsadas.map(esc => (
            <div key={esc} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: COR_ESCOLA[esc] }} />
              <span className="text-gray-400">{LABEL_ESCOLA[esc] || esc}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: COR_CHAMP }} />
            <span className="text-gray-300 font-medium">campeão</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={dados.length * 20 + 60}>
          <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 60, bottom: 24, left: 4 }}>
            <CartesianGrid {...gridProps} horizontal={false} />
            <XAxis type="number" tick={tickStyle} tickFormatter={(v) => v.toFixed(1)}
                   domain={[0, (max) => Math.ceil(max * 10) / 10]}
                   label={{ value: 'Theil U (menor = melhor; 1,0 = palpite ingênuo)',
                            position: 'insideBottom', offset: -8, fill: '#9ca3af', fontSize: 11 }} />
            <YAxis type="category" dataKey="nome" width={210}
                   tick={{ fill: '#d1d5db', fontSize: 10 }} interval={0} />
            <Tooltip contentStyle={tooltipStyle}
                     formatter={(v, n, p) => {
                       if (n === 'U') return [v.toFixed(3), 'Theil U'];
                       return [v, n];
                     }}
                     labelFormatter={(label, payload) => {
                       const p = payload?.[0]?.payload;
                       if (!p) return label;
                       return `${label}  ·  RMSE=${p.rmse.toFixed(2)}pp  ·  ${LABEL_ESCOLA[p.escola] || p.escola}`;
                     }} />
            <ReferenceLine x={1.0} stroke="#9ca3af" strokeDasharray="3 3"
                           label={{ value: 'palpite ingênuo', position: 'top',
                                    fill: '#9ca3af', fontSize: 10 }} />
            <Bar dataKey="U" radius={[0, 4, 4, 0]} barSize={14}>
              {dados.map((d, i) => <Cell key={i} fill={d.cor} />)}
              <LabelList dataKey="U" position="right"
                         formatter={(v) => v.toFixed(2)}
                         style={{ fill: '#9ca3af', fontSize: 10 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.details>
  );
}

// ─── Bloco: Forecast do contêiner (toda a parte de cima) ────────────────────

function ForecastConteinerBloco() {
  const { meta, historico, backtest, forward } = forecastConteiner;
  const ultPrelim = meta.ult_obs_preliminar === true;
  // meses preliminares presentes no histórico (carga manual IBI), em ordem
  const prelimMeses = (meta.preliminar ?? []).filter(m => historico.some(h => h.data === m)).sort();
  const prelimLabel = prelimMeses.length > 1
    ? `${fmtMes(prelimMeses[0])}–${fmtMes(prelimMeses.at(-1))}`
    : fmtMes(prelimMeses[0] ?? meta.ult_obs.data);

  // Pivot único pro gráfico principal
  const allData = useMemo(() => {
    const map = {};
    for (const p of historico) {
      map[p.data] = { ...map[p.data], data: p.data, obs: p.obs };
    }
    for (const p of backtest) {
      map[p.data] = { ...map[p.data], data: p.data, champ_back: p.champ };
    }
    // Forward + spans para as bandas empilhadas
    for (const p of forward) {
      map[p.data] = {
        ...map[p.data],
        data:    p.data,
        central: p.central,
        lo80:    p.lo80,
        lo95:    p.lo95,
        span80:  p.hi80 - p.lo80,
        span95:  p.hi95 - p.lo95,
      };
    }
    return Object.values(map).sort((a, b) => a.data.localeCompare(b.data));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-base font-semibold text-white mb-1">E o que vem pelos próximos meses?</div>
        <p className="text-xs text-gray-400 leading-relaxed max-w-3xl">
          Projeção do momentum do contêiner brasileiro — variação a/a da média móvel de 12 meses
          da tonelagem (ANTAQ). Modelo campeão de um horse-race de 30 abordagens, validado em
          38 meses fora da amostra.
        </p>
      </div>

      {/* (a) Nuggets de antecipação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <NuggetCard
          label={`Projeção — ${fmtMes(forward[0].data)}`}
          valor={forward[0].central} sufixo="%" cor={COR_CHAMP} decimais={1}
          comSinal sub="Próxima leitura projetada (a/a, MA12)"
        />
        <NuggetCard
          label={ultPrelim
            ? `Último dado — ${fmtMes(meta.ult_obs.data)} (preliminar)`
            : `Último dado ANTAQ — ${fmtMes(meta.ult_obs.data)}`}
          valor={meta.ult_obs.obs} sufixo="%" cor={ultPrelim ? COR_PRELIM : COR_OBS} decimais={2}
          comSinal sub={ultPrelim
            ? 'Estimativa IBI — ANTAQ ainda não publicou o mês'
            : 'Crescimento a/a observado'}
        />
      </div>

      {/* (b) Gráfico principal */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="rounded-xl border border-gray-700 bg-gray-900/60 p-5"
      >
        <h3 className="text-base font-semibold text-white mb-1">
          Momentum do contêiner — observado e projeção
        </h3>
        <p className="text-xs text-gray-400 mb-4 max-w-3xl leading-relaxed">
          Linha azul: observado (ANTAQ). Linha ouro tracejada: backtest do modelo campeão
          sobre o período fora da amostra. Pontos em ouro: projeção 5 meses à frente, com
          leques de 80% e 95%.
        </p>
        <GraficoForecast allData={allData} ultObs={meta.ult_obs} />
        {ultPrelim && (
          <p className="text-[11px] mt-3 leading-relaxed" style={{ color: COR_PRELIM }}>
            ⚠️ {prelimMeses.length > 1 ? `Os últimos ${prelimMeses.length} pontos observados` : 'O último ponto observado'}
            {' '}({prelimLabel}) {prelimMeses.length > 1 ? 'são' : 'é'} <strong>preliminar{prelimMeses.length > 1 ? 'es' : ''}</strong> —
            tonelagem de contêiner carregada manualmente pelo IBI (coleta direta + estimativa do
            agregado nacional), pois a ANTAQ ainda não publicou {prelimMeses.length > 1 ? 'esses meses' : 'o mês'}.
            Entra{prelimMeses.length > 1 ? 'm' : ''} no cálculo do momentum e na base da projeção; pode{prelimMeses.length > 1 ? 'm' : ''} ser
            revisto{prelimMeses.length > 1 ? 's' : ''} quando o dado oficial sair.
          </p>
        )}
      </motion.div>

      {/* (d) O que isso significa */}
      <SignificadoBox forward={forward} meta={meta} />

      {/* (e) Ficha técnica */}
      <FichaTecnicaHorseRace />
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function GraficoMediasMoveis31() {
  // Histórico das 4 cargas (mantém useDashboardData)
  const { data, loading, erro } = useDashboardData(['series-tendencia.json']);
  const [metrica, setMetrica] = useState('ma12_mt');

  const { historicoCargas, momentumAtual } = useMemo(() => {
    if (!data) return {};
    const rawSeries = data['series-tendencia'];
    if (!rawSeries) return {};

    const byDate = {};
    NATUREZAS.forEach(nat => {
      const serie = rawSeries.series?.[nat] || [];
      for (const pt of serie) {
        if (!byDate[pt.data]) byDate[pt.data] = { data: pt.data };
        byDate[pt.data][`ma12_mt_${nat}`] = pt.ma12_mt ?? null;
      }
    });
    const historicoCargas = Object.values(byDate).sort((a, b) => a.data.localeCompare(b.data));

    for (let i = 12; i < historicoCargas.length; i++) {
      for (const nat of NATUREZAS) {
        const curr = historicoCargas[i][`ma12_mt_${nat}`];
        const prev = historicoCargas[i - 12][`ma12_mt_${nat}`];
        historicoCargas[i][`yoy_ma_pct_${nat}`] =
          curr != null && prev != null && prev !== 0 ? ((curr / prev) - 1) * 100 : null;
      }
    }
    let baseValues = {};
    for (const row of historicoCargas) {
      if (NATUREZAS.every(n => (row[`ma12_mt_${n}`] ?? 0) > 0)) {
        baseValues = Object.fromEntries(NATUREZAS.map(n => [n, row[`ma12_mt_${n}`]]));
        break;
      }
    }
    for (const row of historicoCargas) {
      for (const nat of NATUREZAS) {
        const base = baseValues[nat];
        const v    = row[`ma12_mt_${nat}`];
        row[`indice100_${nat}`] = base && v != null ? (v / base * 100) : null;
      }
    }
    const momentumAtual = {};
    for (const nat of NATUREZAS) {
      for (let i = historicoCargas.length - 1; i >= 0; i--) {
        const v = historicoCargas[i][`yoy_ma_pct_${nat}`];
        if (v != null) { momentumAtual[nat] = v; break; }
      }
    }
    return { historicoCargas, momentumAtual };
  }, [data]);

  if (loading) return <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Carregando…</div>;
  if (erro)    return (
    <div className="h-80 flex flex-col items-center justify-center gap-3">
      <p className="text-red-400 text-sm">Erro ao carregar dados: {erro}</p>
      <button onClick={() => window.location.reload()}
              className="px-4 py-1.5 text-xs rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600">
        Tentar novamente
      </button>
    </div>
  );
  if (!historicoCargas) return null;

  const fmtMom  = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + Math.abs(v).toFixed(1) + '%';
  const yKey    = (nat) => metrica === 'indice100'  ? `indice100_${nat}`
                         : metrica === 'yoy_ma_pct' ? `yoy_ma_pct_${nat}`
                         : `ma12_mt_${nat}`;
  const yLabel  = metrica === 'indice100'  ? 'Índice (base 100)'
                : metrica === 'yoy_ma_pct' ? 'Crescimento a/a (%)'
                : 'Mt/mês (média 12m)';

  return (
    <div className="space-y-10">
      {/* ── Forecast (substitui o antigo) ──────────────────────────────────── */}
      <ForecastConteinerBloco />

      {/* ── Histórico das 4 cargas (mantém) ────────────────────────────────── */}
      <div className="border-t border-gray-700 pt-6">
        <div className="text-base font-semibold text-white mb-3">
          Contexto histórico: médias móveis por carga (2011–2026)
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {NATUREZAS.map(nat => (
            <div key={nat} className="rounded-lg p-3"
                 style={{ background: `${CORES[nat]}15`, border: `1px solid ${CORES[nat]}40` }}>
              <div className="text-xs text-gray-400 mb-1">{LABELS[nat]}</div>
              <div className="text-lg font-bold" style={{ color: CORES[nat] }}>
                {fmtMom(momentumAtual[nat])} a/a
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-xs text-gray-400">Como medir:</span>
          {[
            { v: 'ma12_mt',    l: 'Volume (Mt/mês, MM12)' },
            { v: 'indice100',  l: 'Índice base 100' },
            { v: 'yoy_ma_pct', l: 'Crescimento a/a (%)' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setMetrica(v)}
                    className="px-3 py-1 text-xs rounded-md transition-colors"
                    style={{
                      background: metrica === v ? '#0099D8' : '#374151',
                      color:      metrica === v ? '#fff' : '#d1d5db',
                      border:     '1px solid ' + (metrica === v ? '#0099D8' : '#4b5563'),
                    }}>
              {l}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={historicoCargas} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="data" tickFormatter={fmtMes} tick={tickStyle} interval={11} />
            <YAxis tick={tickStyle} tickFormatter={v => fmtNum(v, metrica === 'indice100' ? 0 : 1)}
                   label={{ value: yLabel, angle: -90, position: 'insideLeft',
                            fill: '#9ca3af', fontSize: 11, dy: 60 }} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtMes}
                     formatter={(v, n) => [fmtNum(v, metrica === 'indice100' ? 1 : 2), n]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {metrica === 'indice100'  && <ReferenceLine y={100} stroke="#6b7280" strokeDasharray="4 2" />}
            {metrica === 'yoy_ma_pct' && <ReferenceLine y={0}   stroke="#6b7280" strokeDasharray="4 2" />}
            {NATUREZAS.map(nat => (
              <Line key={nat} type="monotone" dataKey={yKey(nat)} name={LABELS[nat]}
                    stroke={CORES[nat]} strokeWidth={2.2} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-1">
          Cada ponto = média dos 12 meses anteriores — remove sazonalidade e revela tendência real.
          Dados: ANTAQ Estatística Aquaviária · Atualizado mensalmente.
        </p>
      </div>
    </div>
  );
}
