'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
} from 'recharts';
import { useDashboardData } from '@/components/antaq/useDashboardData';

// ── types ──────────────────────────────────────────────────────────────────────

type NaturezaKey = 'granel_solido' | 'granel_liquido' | 'carga_geral' | 'conteinerizada';

type Ponto = { data: string; mt: number; est?: boolean };
type PortoSerie = {
  porto: string;
  uf: string | null;
  regiao: string | null;
  vol12m_mt: number;
  naturezas: Record<NaturezaKey, Ponto[]>;
  teu_conteiner?: { data: string; teu: number; est?: boolean }[];
};
type Dataset = {
  gerado_em: string;
  referencia: string;
  fonte: string;
  metrica: string;
  top_n: number;
  portos: PortoSerie[];
  nacional_por_natureza: Record<NaturezaKey, Ponto[]>;
  nacional_conteiner_teu?: { data: string; teu: number; est?: boolean }[];
  meses_preliminares?: string[];
};

interface PontoRegional {
  ano: string;
  sudeste: number;
  arcoNorte: number;
  sul: number;
  nordeste: number;
  centroOeste: number;
  semRegiao: number;
}

interface STLPoint {
  data: string;
  natureza: string;
  observado: number;
  trend: number;
  seasonal: number;
  resid: number;
}

interface SazonalPonto {
  mes: string;
  mesNum: number;
  granel_solido: number;
  granel_liquido: number;
  carga_geral: number;
  conteinerizada: number;
}

// ── constants ──────────────────────────────────────────────────────────────────

const NATUREZAS: { key: NaturezaKey; label: string; short: string; color: string }[] = [
  { key: 'granel_solido',  label: 'Granel Sólido',  short: 'GS',  color: '#0099d8' },
  { key: 'granel_liquido', label: 'Granel Líquido', short: 'GL',  color: '#00a652' },
  { key: 'carga_geral',    label: 'Carga Geral',    short: 'CG',  color: '#D4922A' },
  { key: 'conteinerizada', label: 'Conteinerizada', short: 'CTZ', color: '#8B5CF6' },
];

const UF_ARCO_NORTE = new Set(['AP', 'PA', 'AM', 'RO', 'RR', 'MA', 'TO']);
const UF_SUDESTE = new Set(['ES', 'MG', 'RJ', 'SP']);
const UF_SUL = new Set(['PR', 'RS', 'SC']);
const UF_NORDESTE = new Set(['AL', 'BA', 'CE', 'PB', 'PE', 'PI', 'RN', 'SE']);
const UF_CENTRO_OESTE = new Set(['DF', 'GO', 'MS', 'MT']);

function classificarRegiao(uf: string | null): keyof Omit<PontoRegional, 'ano' | 'semRegiao'> {
  if (!uf) return 'semRegiao' as any;
  if (UF_ARCO_NORTE.has(uf)) return 'arcoNorte';
  if (UF_SUDESTE.has(uf)) return 'sudeste';
  if (UF_SUL.has(uf)) return 'sul';
  if (UF_NORDESTE.has(uf)) return 'nordeste';
  if (UF_CENTRO_OESTE.has(uf)) return 'centroOeste';
  return 'semRegiao' as any;
}

// ── main component ─────────────────────────────────────────────────────────────

export default function NovaAnalisePage() {
  const { data: raw, loading, erro } = useDashboardData(['portos-series.json']);
  const data = (raw as Record<string, unknown> | null)?.['portos-series'] as Dataset | null;

  const [stlData, setStlData] = useState<STLPoint[] | null>(null);
  useEffect(() => {
    fetch('/data/antaq/dashboard/stl.json')
      .then(r => r.json())
      .then(setStlData)
      .catch(() => setStlData(null));
  }, []);

  const serieRegional = useMemo<PontoRegional[]>(() => {
    if (!data) return [];
    const portos = (data.portos || []).filter(
      (p): p is PortoSerie => typeof p === 'object' && p !== null && 'porto' in p
    );

    const anos = Array.from({ length: 16 }, (_, i) => String(2010 + i));
    const resultado: PontoRegional[] = [];

    for (const ano of anos) {
      const totaisPorRegiao = {
        sudeste: 0,
        arcoNorte: 0,
        sul: 0,
        nordeste: 0,
        centroOeste: 0,
        semRegiao: 0,
      };

      for (const p of portos) {
        let totalPortoAno = 0;
        for (const nat of NATUREZAS) {
          const serie = p.naturezas?.[nat.key];
          if (serie) {
            for (const pt of serie) {
              if (pt.data.slice(0, 4) === ano) totalPortoAno += pt.mt;
            }
          }
        }

        if (totalPortoAno <= 0) continue;

        let uf = p.uf;
        if (!uf && p.porto.toLowerCase().includes('paranaguá')) {
          uf = 'PR';
        }

        const regiao = classificarRegiao(uf);
        totaisPorRegiao[regiao] += totalPortoAno;
      }

      const totalNacional = Object.values(totaisPorRegiao).reduce((s, v) => s + v, 0);
      if (totalNacional <= 0) continue;

      resultado.push({
        ano,
        sudeste: (totaisPorRegiao.sudeste / totalNacional) * 100,
        arcoNorte: (totaisPorRegiao.arcoNorte / totalNacional) * 100,
        sul: (totaisPorRegiao.sul / totalNacional) * 100,
        nordeste: (totaisPorRegiao.nordeste / totalNacional) * 100,
        centroOeste: (totaisPorRegiao.centroOeste / totalNacional) * 100,
        semRegiao: (totaisPorRegiao.semRegiao / totalNacional) * 100,
      });
    }

    return resultado;
  }, [data]);

  const assinaturaSazonal = useMemo<SazonalPonto[]>(() => {
    if (!stlData || stlData.length === 0) return [];

    const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const naturezas = ['granel_solido', 'granel_liquido', 'carga_geral', 'conteinerizada'];

    const porNatureza: Record<string, STLPoint[]> = {};
    for (const nat of naturezas) {
      porNatureza[nat] = stlData.filter(r => r.natureza === nat);
    }

    const resultado: SazonalPonto[] = [];

    for (let mes = 1; mes <= 12; mes++) {
      const ponto: any = {
        mes: mesesLabels[mes - 1],
        mesNum: mes,
      };

      for (const nat of naturezas) {
        const registros = porNatureza[nat];
        if (!registros || registros.length === 0) {
          ponto[nat] = 0;
          continue;
        }

        const doMes = registros.filter(r => parseInt(r.data.slice(5, 7)) === mes);
        if (doMes.length === 0) {
          ponto[nat] = 0;
          continue;
        }

        const seasonalMedio = doMes.reduce((s, r) => s + r.seasonal, 0) / doMes.length;
        const mediaObs = registros.reduce((s, r) => s + r.observado, 0) / registros.length;

        ponto[nat] = mediaObs > 0 ? (seasonalMedio / mediaObs) * 100 : 0;
      }

      resultado.push(ponto as SazonalPonto);
    }

    return resultado;
  }, [stlData]);

  if (loading || (!data && !erro)) return <LoadingState />;
  if (erro) return <ErrorState msg={erro} />;
  if (!data) return <ErrorState msg="Dataset de movimentação indisponível." />;

  return (
    <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <div className="space-y-2">
        <a
          href="/portos"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </a>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500 flex-wrap">
          <span>Portos</span>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400">Análises</span>
        </div>
        <h1 className="text-[clamp(1.5rem,2.8vw,2.1rem)] font-bold leading-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-ibi-green to-ibi-blue">
            Nova Análise
          </span>
        </h1>
      </div>

      <div className="flex items-start gap-3 bg-orange-400 border border-white/5 rounded-xl justify-center p-4 ">
        <span className="text-base ">🚧</span>
        <div className="space-y-1">
          <h3>Nova análise está em construção</h3>
        </div>
        <span className="text-base ">🚧</span>
      </div>

      {serieRegional.length > 0 && (
        <section className="bg-azul-medio border border-white/10 rounded-xl p-5 space-y-4">
          <DeslocamentoRegionalChart data={serieRegional} />
        </section>
      )}

      {assinaturaSazonal.length > 0 && (
        <section className="bg-azul-medio border border-white/10 rounded-xl p-5 space-y-4">
          <AssinaturaSazonalChart data={assinaturaSazonal} />
        </section>
      )}
    </main>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────────

function DeslocamentoRegionalChart({ data }: { data: PontoRegional[] }) {
  const regioes = [
    { key: 'sudeste' as const, label: 'Sudeste', color: '#3B82F6', strokeWidth: 3, fillOpacity: 0.30 },
    { key: 'arcoNorte' as const, label: 'Arco Norte', color: '#F59E0B', strokeWidth: 3, fillOpacity: 0.28 },
    { key: 'sul' as const, label: 'Sul', color: '#6B7280', strokeWidth: 1.5, fillOpacity: 0.18 },
    { key: 'nordeste' as const, label: 'Nordeste', color: '#9CA3AF', strokeWidth: 1.5, fillOpacity: 0.14 },
    { key: 'centroOeste' as const, label: 'Centro-Oeste', color: '#D1D5DB', strokeWidth: 1.5, fillOpacity: 0.10 },
  ];

  const pt2010 = data.find(d => d.ano === '2010');
  const pt2019 = data.find(d => d.ano === '2019');
  const ptAtual = data[data.length - 1];

  const shareSudeste2010 = pt2010?.sudeste.toFixed(0) ?? '—';
  const shareSudeste2019 = pt2019?.sudeste.toFixed(0) ?? '—';
  const shareArcoNorte2010 = pt2010?.arcoNorte.toFixed(1) ?? '—';
  const shareArcoNorte2019 = pt2019?.arcoNorte.toFixed(1) ?? '—';
  const shareSudesteAtual = ptAtual?.sudeste.toFixed(0) ?? '—';
  const shareArcoNorteAtual = ptAtual?.arcoNorte.toFixed(1) ?? '—';

  return (
    <div className="w-full">
      <h2 className="text-base font-semibold text-white">
        Deslocamento Regional da Movimentação Portuária
      </h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-1">
        Participação de cada região no total nacional movimentado — 2010 a 2025
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] text-[#3B82F6] font-medium uppercase tracking-wider mb-1.5">
            A Migração Real
          </p>
          <p className="text-sm text-gray-200 leading-snug">
            O deslocamento é <strong className="text-[#3B82F6]">factual, não retórico</strong>.
            Entre 2010 e 2019, o Sudeste caiu de{' '}
            <strong className="text-[#3B82F6]">~{shareSudeste2010}% para ~{shareSudeste2019}%</strong>,
            enquanto o Arco Norte subiu de{' '}
            <strong className="text-[#3B82F6]">~{shareArcoNorte2010}% para ~{shareArcoNorte2019}%</strong>.
            A mudança do eixo logístico está nos dados.
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] text-[#d4922a] font-medium uppercase tracking-wider mb-1.5">
            O Platô — 6 Anos de Estagnação
          </p>
          <p className="text-sm text-gray-200 leading-snug">
            Desde <strong className="text-[#d4922a]">~2019, o avanço estagnou</strong>.
            O Sudeste estabilizou em torno de{' '}
            <strong className="text-[#d4922a]">~{shareSudesteAtual}%</strong> e o Arco Norte oscila em{' '}
            <strong className="text-[#d4922a]">~{shareArcoNorteAtual}%</strong> sem novo salto.
            São seis anos de platô — a leitura menos óbvia e a mais valiosa:{' '}
            <strong className="text-[#d4922a]">o deslocamento perdeu fôlego</strong>.
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] text-[#A0153E] font-medium uppercase tracking-wider mb-1.5">
            A Inferência do IBI — Infraestrutura de Acesso
          </p>
          <p className="text-sm text-gray-200 leading-snug">
            O platô <strong className="text-white">não é saturação de demanda</strong> — é{' '}
            <strong className="text-[#A0153E]">falta de infraestrutura de acesso</strong>.
            Gargalos concretos (hidrovias não concedidas, calado insuficiente na Barra Norte,
            acesso rodoviário precário) travaram o avanço.{' '}
            <strong className="text-[#A0153E]">Destravá-los é o que reativaria a curva</strong>.
          </p>
        </div>
      </div>

      <div style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 24, bottom: 4, left: 4 }}>
            <defs>
              {regioes.map(r => (
                <linearGradient key={r.key} id={`fill-${r.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={r.color} stopOpacity={r.fillOpacity} />
                  <stop offset="100%" stopColor={r.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />

            <XAxis
              dataKey="ano"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#ffffff10' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 80]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />

            <Tooltip
              cursor={{ stroke: '#ffffff20' }}
              contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-[#111827] border border-white/10 rounded-xl p-3 shadow-xl text-sm min-w-[180px]">
                    <p className="font-semibold text-white text-sm">{label}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      {regioes.map(r => {
                        const p = payload.find(item => item.dataKey === r.key);
                        const valor = p?.value as number | undefined;
                        if (valor == null) return null;
                        return (
                          <div key={r.key} className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: r.color }}
                            />
                            <span className="text-gray-400">{r.label}</span>
                            <span className="text-white font-medium ml-auto tabular-nums">{valor.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
            />

            <ReferenceArea
              x1="2019"
              x2={data[data.length - 1]?.ano}
              fill="#ffffff"
              fillOpacity={0.03}
              label={{ value: 'Platô (2019+)', position: 'insideTopLeft', fill: '#6b7280', fontSize: 10, dy: 4, dx: 6 }}
            />

            {regioes.map(r => (
              <Area
                key={r.key}
                type="monotone"
                dataKey={r.key}
                name={r.label}
                stroke={r.color}
                strokeWidth={r.strokeWidth}
                fill={`url(#fill-${r.key})`}
                dot={{ r: r.strokeWidth >= 3 ? 3 : 2, strokeWidth: 0, fill: r.color, fillOpacity: 0.8 }}
                activeDot={{ r: r.strokeWidth >= 3 ? 5 : 3, stroke: '#111827', strokeWidth: 2, fill: r.color }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--muted)]">
        {regioes.map(r => (
          <span key={r.key} className="flex items-center gap-1.5">
            <span
              className="w-3 rounded-full inline-block"
              style={{
                backgroundColor: r.color,
                height: r.strokeWidth >= 3 ? '3px' : '2px',
                opacity: r.strokeWidth >= 3 ? 1 : 0.6,
              }}
            />
            {r.label}
            {r.strokeWidth >= 3 && <span className="text-[10px] opacity-60">(destaque)</span>}
          </span>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-gray-600 leading-relaxed">
        <strong>Arco Norte</strong> = recorte logístico (AP, PA, AM, RO, RR, MA, TO), não a região Norte do IBGE.
        <strong> Paranaguá</strong> corrigido para PR/Sul. Base: top-50 ANTAQ (~91% do nacional).
        O gráfico mede <em>participação</em> (share), não volume absoluto.
      </p>
    </div>
  );
}

function TooltipSazonal({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl p-3 shadow-xl text-sm min-w-[200px]">
      <p className="font-semibold text-white text-sm mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-gray-400">{p.name}</span>
            <span className="text-white font-medium ml-auto">
              {p.value > 0 ? '+' : ''}{p.value?.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssinaturaSazonalChart({ data }: { data: SazonalPonto[] }) {
  const cores: Record<string, { cor: string; largura: number; destaque?: boolean }> = {
    granel_solido:    { cor: '#F59E0B', largura: 3, destaque: true },
    conteinerizada:   { cor: '#3B82F6', largura: 1.5 },
    granel_liquido:   { cor: '#6B7280', largura: 1.5 },
    carga_geral:      { cor: '#9CA3AF', largura: 1.5 },
  };

  const naturezas = [
    { key: 'granel_solido' as const, label: 'Granel Sólido' },
    { key: 'conteinerizada' as const, label: 'Conteinerizada' },
    { key: 'granel_liquido' as const, label: 'Granel Líquido' },
    { key: 'carga_geral' as const, label: 'Carga Geral' },
  ];

  const gsPontos = data.map(d => ({ mes: d.mes, val: d.granel_solido }));
  const picoGS = gsPontos.reduce((a, b) => a.val > b.val ? a : b);
  const valeGS = gsPontos.reduce((a, b) => a.val < b.val ? a : b);
  const amplitudeGS = (picoGS.val - valeGS.val).toFixed(1);

  const ctzPontos = data.map(d => ({ mes: d.mes, val: d.conteinerizada }));
  const picoCTZ = ctzPontos.reduce((a, b) => a.val > b.val ? a : b);

  const cgPontos = data.map(d => ({ mes: d.mes, val: d.carga_geral }));
  const picoCG = cgPontos.reduce((a, b) => a.val > b.val ? a : b);

  return (
    <div className="w-full">
      <div>
        <h2 className="text-base font-semibold text-white">
          Assinatura Sazonal da Movimentação por Tipo de Carga
        </h2>
        <p className="text-xs text-gray-500 mt-0.5 mb-1">
          Desvio de cada mês em relação à média anual — componente sazonal isolado
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] text-[#d4922a] font-medium uppercase tracking-wider mb-1.5">
            A Janela de Safra — Granel Sólido
          </p>
          <p className="text-sm text-gray-200 leading-snug">
            O granel sólido é a carga mais sazonal com amplitude de{' '}
            <strong className="text-[#d4922a]">{amplitudeGS}%</strong>.
            Pico em <strong className="text-[#d4922a]">{picoGS.mes} ({picoGS.val > 0 ? '+' : ''}{picoGS.val.toFixed(1)}%)</strong>,
            vale em <strong className="text-[#d4922a]">{valeGS.mes} ({valeGS.val.toFixed(1)}%)</strong>.
            O platô de safra <strong className="text-[#d4922a]">maio–outubro</strong> concentra a
            movimentação — planejamento de infraestrutura deve antecipar esse ciclo.
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] text-[#0099d8] font-medium uppercase tracking-wider mb-1.5">
            Picos Escalonados
          </p>
          <p className="text-sm text-gray-200 leading-snug">
            As cargas não competem pelo mesmo mês: granel sólido em{' '}
            <strong className="text-[#0099d8]">{picoGS.mes}</strong>,
            contêiner em <strong className="text-[#0099d8]">{picoCTZ.mes}</strong>,
            carga geral em <strong className="text-[#0099d8]">{picoCG.mes}</strong>.
            Fevereiro é o vale comum de todas. Isso{' '}
            <strong className="text-[#0099d8]">distribui a pressão</strong> sobre a infraestrutura
            de acesso ao longo do ano.
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] text-[#00a652] font-medium uppercase tracking-wider mb-1.5">
            O Calendário de Investimento do IBI
          </p>
          <p className="text-sm text-gray-200 leading-snug">
            <strong className="text-[#00a652]">Antecipar a infraestrutura à carga</strong> é o que evita
            gargalo. O calendário de investimento em hidrovias, calado e acesso rodoviário deve mirar{' '}
            <strong className="text-[#00a652]">janeiro–março</strong> (antes da safra de grãos) e{' '}
            <strong className="text-[#00a652]">agosto–setembro</strong> (antes do pico de contêiner).
            A sazonalidade é previsível — o investimento deve ser também.
          </p>
        </div>
      </div>

      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />

            <XAxis
              dataKey="mes"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#ffffff10' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#ffffff10' }}
              tickLine={false}
              tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`}
            />

            <ReferenceLine y={0} stroke="#ffffff" strokeOpacity={0.2} strokeDasharray="6 3" />

            <ReferenceArea
              x1="Mai"
              x2="Out"
              fill="#F59E0B"
              fillOpacity={0.05}
            />
            <ReferenceLine
              x="Jul"
              stroke="#F59E0B"
              strokeOpacity={0.15}
              strokeDasharray="4 4"
              label={{ value: 'Janela de safra', fill: '#d4922a', fontSize: 10, position: 'insideTopRight' }}
            />

            <Tooltip content={<TooltipSazonal />} />

            {naturezas.map(n => (
              <Line
                key={n.key}
                type="monotone"
                dataKey={n.key}
                name={n.label}
                stroke={cores[n.key].cor}
                strokeWidth={cores[n.key].largura}
                dot={{ r: cores[n.key].destaque ? 4 : 2.5, fill: cores[n.key].cor, stroke: '#111827', strokeWidth: 1.5 }}
                activeDot={{ r: cores[n.key].destaque ? 6 : 4, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
        {naturezas.map(n => (
          <span key={n.key} className="flex items-center gap-1.5">
            <span
              className="w-3 rounded-full inline-block"
              style={{
                backgroundColor: cores[n.key].cor,
                height: cores[n.key].largura > 2 ? '3px' : '2px',
              }}
            />
            {n.label}
            {cores[n.key].destaque && <span className="text-[10px] opacity-60">(mais sazonal)</span>}
          </span>
        ))}
      </div>

      <p className="mt-4 text-[10px] text-gray-600 leading-relaxed">
        <strong>Decomposição STL</strong> (Seasonal-Trend decomposition using Loess) separa tendência,
        sazonalidade e ruído. O desvio é relativo à média de cada natureza — não compara magnitudes
        absolutas. Granel sólido = minério + soja + milho + fertilizantes (mistura, não commodity isolada).
        Amplitude: GS 32% · CTZ 21% · GL 16% · CG 14%. Fonte: ANTAQ (2010–2026). Elaboração: Observatório IBI.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-24 flex flex-col items-center gap-4">
      <div className="size-8 rounded-full border-2 border-ibi-blue border-t-transparent animate-spin" />
      <p className="text-gray-500 text-sm">Carregando dados ANTAQ…</p>
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-20 text-center space-y-2">
      <p className="text-[#A0153E] font-semibold">Erro ao carregar dados</p>
      <p className="text-gray-500 text-sm font-mono">{msg}</p>
    </div>
  );
}
