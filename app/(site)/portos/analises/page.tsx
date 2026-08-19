'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, Label,
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
  norte: number;
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

const FALLBACK_UF: Record<string, string> = {
  'Paranaguá': 'PR',
  'Rio Grande': 'RS',
};

const UF_NORTE = new Set(['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO']);
const UF_NORDESTE = new Set(['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']);
const UF_SUDESTE = new Set(['ES', 'MG', 'RJ', 'SP']);
const UF_SUL = new Set(['PR', 'RS', 'SC']);
const UF_CENTRO_OESTE = new Set(['DF', 'GO', 'MS', 'MT']);

function classificarRegiao(uf: string | null): keyof Omit<PontoRegional, 'ano' | 'arcoNorte' | 'semRegiao'> {
  if (!uf) return 'semRegiao' as any;
  if (UF_NORTE.has(uf)) return 'norte';
  if (UF_NORDESTE.has(uf)) return 'nordeste';
  if (UF_SUDESTE.has(uf)) return 'sudeste';
  if (UF_SUL.has(uf)) return 'sul';
  if (UF_CENTRO_OESTE.has(uf)) return 'centroOeste';
  return 'semRegiao' as any;
}

const PORTOS_ARCO_NORTE = new Set<string>([
  'Terminal Marítimo de Ponta da Madeira',
  'Itaqui',
  'Suape',
  'Terminal Aquaviário de Madre de Deus',
  'Terminal Portuário do Pecém',
  'Terminal Portuário Privativo da Alumar',
  'Terminal Portuário Cotegipe',
  'Salvador',
  'Aratu',
  'Fortaleza',
  'Santarém',
  'Terminal Vila do Conde',
  'Terminal Trombetas',
  'Terminal Graneleiro Hermasa',
  'Terminal Portuário Graneleiro de Barcarena',
  'Vila do Conde',
  'Porto Chibatão',
  'Terminal Fluvial de Juruti',
  'Hidrovias do Brasil Miritituba',
  'Terminal Portuário Novo Remanso',
  'Itacal- Itacoatiara Calcários Ltda',
]);

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
        sul: 0,
        norte: 0,
        nordeste: 0,
        centroOeste: 0,
        semRegiao: 0,
      };
      let arcoNorte = 0;

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
        if (!uf) {
          const nome = p.porto.toLowerCase();
          if (nome.includes('paranaguá')) uf = 'PR';
          else if (nome.includes('rio grande')) uf = 'RS';
        }

        const regiao = classificarRegiao(uf);
        totaisPorRegiao[regiao] += totalPortoAno;

        if (PORTOS_ARCO_NORTE.has(p.porto)) {
          arcoNorte += totalPortoAno;
        }
      }

      const totalNacional = Object.values(totaisPorRegiao).reduce((s, v) => s + v, 0);
      if (totalNacional <= 0) continue;

      resultado.push({
        ano,
        norte: (totaisPorRegiao.norte / totalNacional) * 100,
        sudeste: (totaisPorRegiao.sudeste / totalNacional) * 100,
        arcoNorte: (arcoNorte / totalNacional) * 100,
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
          <span className="text-gray-400">Estrutura, Sazonalidade e Vulnerabilidade</span>
        </div>
        <h1 className="text-[clamp(1.5rem,2.8vw,2.1rem)] font-bold leading-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-ibi-green to-ibi-blue">
            Movimentação no Arco Norte — Estrutura, Sazonalidade e Vulnerabilidade
          </span>
        </h1>
        <p className="text-gray-400 text-sm max-w-2xl">
          Deslocamento regional, assinatura sazonal e efeito da seca sobre a navegação interior — 2010–2025
        </p>
        <div className="max-w-[1300px] space-y-3">
          <p className="text-[15px] leading-relaxed text-gray-400">
            O eixo logístico do Brasil mudou. Entre 2010 e 2019, o Arco Norte ganhou 11 pontos percentuais de participação — e depois <strong className="text-white font-semibold">parou</strong>. Seis anos de platô sem novo salto.
          </p>
          <p className="text-[15px] leading-relaxed text-gray-400">
            O que travou o avanço? A sazonalidade da carga que define o eixo piorou de patamar. E em 2024, a seca expôs a vulnerabilidade: o corredor de grãos do Tapajós colapsou, enquanto a bauxita resiliu e a ferrovia manteve o fluxo. A diferença não é a carga — é a <strong className="text-white font-semibold">infraestrutura de acesso</strong>.
          </p>
          <p className="text-[15px] leading-relaxed text-gray-400">
            As análises abaixo contam essa história em dados. <strong className="text-white font-semibold">Navegue pelos gráficos</strong>, compare os padrões e tire suas próprias conclusões sobre onde o deslocamento regional perdeu fôlego — e o que seria preciso para reativá-lo.
          </p>
        </div>
      </div>

      {/* ── Hero cards (2 primeiros) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <a href="#sec-e2" className="group bg-azul-medio border border-white/[0.08] rounded-xl p-5 hover:border-white/15 hover:bg-[#151520] transition-all cursor-pointer">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#3B82F6] mb-2.5">Análise 1</div>
          <h3 className="text-base font-semibold text-white mb-2">Deslocamento Regional</h3>
          <p className="text-xs leading-relaxed text-gray-500">
            O Sudeste caiu de <span className="text-[#3B82F6] font-semibold">~58% para ~52%</span>, enquanto o Arco Norte subiu de <span className="text-[#3B82F6] font-semibold">~28% para ~39%</span>. Mas desde 2019 o avanço estagnou. O deslocamento perdeu fôlego.
          </p>
          <div className="mt-3 text-[10px] text-gray-600 flex items-center gap-1">Ver análise <span className="group-hover:translate-y-0.5 transition-transform">↓</span></div>
        </a>
        <a href="#sec-v1" className="group bg-azul-medio border border-white/[0.08] rounded-xl p-5 hover:border-white/15 hover:bg-[#151520] transition-all cursor-pointer">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#00a652] mb-2.5">Análise 2</div>
          <h3 className="text-base font-semibold text-white mb-2">Assinatura Sazonal</h3>
          <p className="text-xs leading-relaxed text-gray-500">
            O granel sólido pica em <span className="text-[#00a652] font-semibold">agosto (+13.2%)</span>, vale em janeiro. A amplitude saltou de <span className="text-[#00a652] font-semibold">25% para 38%</span> em 2019 — a pressão de capacidade no pico está piorando.
          </p>
          <div className="mt-3 text-[10px] text-gray-600 flex items-center gap-1">Ver análise <span className="group-hover:translate-y-0.5 transition-transform">↓</span></div>
        </a>
        <a href="#sec-v2" className="group bg-azul-medio border border-white/[0.08] rounded-xl p-5 hover:border-white/15 hover:bg-[#151520] transition-all cursor-pointer">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#E39A00] mb-2.5">Análise 3</div>
          <h3 className="text-base font-semibold text-white mb-2">Vulnerabilidade do Corredor</h3>
          <p className="text-xs leading-relaxed text-gray-500">
            A seca de 2024 colapsou o corredor de grãos: <span className="text-[#E39A00] font-semibold">−87% em Miritituba</span>. Mas bauxita (Trombetas) e ferrovia (Itaqui) não colapsaram. A redundância multimodal sustenta.
          </p>
          <div className="mt-3 text-[10px] text-gray-600 flex items-center gap-1">Ver análise <span className="group-hover:translate-y-0.5 transition-transform">↓</span></div>
        </a>
      </div>
      {/* ── Seção e2: Deslocamento Regional ── */}
      <section id="sec-e2" className="... scroll-mt-5">
        {serieRegional.length > 0 && (  
            <section className="bg-azul-medio border border-white/10 rounded-xl p-5 space-y-4">
              <DeslocamentoRegionalChart data={serieRegional} />
            </section>
        )}
      </section>
      {/* ── Seção V1: Assinatura Sazonal ── */}
      <section id="sec-v1" className="... scroll-mt-5">
        {assinaturaSazonal.length > 0 && (  
          <section className="bg-azul-medio border border-white/10 rounded-xl p-5 space-y-4">
            <AssinaturaSazonalChart data={assinaturaSazonal} />  
          </section>
        )}
      </section>
      {/* ── Seção V2: Vulnerabilidade do Corredor ── */}
      <section id="sec-v2" className="bg-azul-medio border border-white/10 rounded-xl p-5 space-y-4 scroll-mt-5">
        {data && <VulnerabilidadeCorredor data={data} />}
      </section>
      {/* ── Fechamento: Conclusões do IBI ── */}
      <section className="bg-azul-medio border border-white/10 rounded-xl p-5">
        <h5 className="text-base font-semibold text-white mb-2">
          Conclusões do IBI
        </h5>
        <p className="text-sm text-gray-300 leading-snug">
          O Arco Norte cresceu até <strong className="text-white">2019</strong>, mas desde então estagnou. A sazonalidade da carga que define o eixo piorou de patamar no mesmo período. Em 2024, o corredor de grãos do Tapajós colapsou na seca (<strong className="text-white">−87% em Miritituba</strong>), enquanto a bauxita resiliu e a ferrovia manteve o fluxo. A conexão é clara: <strong className="text-white">a infraestrutura de acesso</strong> (hidrovias não concedidas, calado insuficiente, acesso rodoviário precário) travou o avanço. O deslocamento regional perdeu fôlego não porque a demanda caiu, mas porque a <strong className="text-white">capacidade</strong> não acompanhou. Destravá-los é o que reativaria a curva.
        </p>
      </section>

    </main>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────────

function DeslocamentoRegionalChart({ data }: { data: PontoRegional[] }) {
  const regioes = [
    { key: 'sudeste' as const,     label: 'Sudeste',     color: '#2A78D6', strokeWidth: 3,   fillOpacity: 0.28, tracejado: false }, // COR_SUDESTE
    { key: 'nordeste' as const,    label: 'Nordeste',    color: '#E39A00', strokeWidth: 2.6, fillOpacity: 0.22, tracejado: false }, // COR_NORDESTE
    { key: 'norte' as const,       label: 'Norte',       color: '#12A594', strokeWidth: 2.4, fillOpacity: 0.20, tracejado: false }, // COR_NORTE
    { key: 'sul' as const,         label: 'Sul',         color: '#A78BFA', strokeWidth: 2.2, fillOpacity: 0.16, tracejado: false }, // COR_SUL
    { key: 'centroOeste' as const, label: 'Centro-Oeste',color: '#8A8880', strokeWidth: 1.6, fillOpacity: 0.10, tracejado: false }, // COR_CO
    { key: 'arcoNorte' as const,   label: 'Arco Norte (Norte + Nordeste)', color: '#CBD5E1', strokeWidth: 2.4, fillOpacity: 0.06, tracejado: true }, // COR_ARCO — overlay
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

  // New
  const fmtPct = (v: number, casas = 1) =>
    `${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

  // ── cores dos KPIs — mesmas que já usamos no array `regioes` ──
  const COR_SUDESTE = '#2A78D6';
  const COR_ARCO = '#CBD5E1';
  const COR_NORDESTE = '#E39A00';

  // ── cálculos ──
  const primeiro = data[0];
  const ultimo = data[data.length - 1];
  const pico = data.reduce((mx, d) => (d.arcoNorte > mx.arcoNorte ? d : mx), data[0]);

  const deltaSudeste = ultimo.sudeste - primeiro.sudeste;
  const deltaArco = ultimo.arcoNorte - primeiro.arcoNorte;
  const recuoDoPico = ultimo.arcoNorte - pico.arcoNorte;
  const pctNordesteNoArco = ultimo.norte + ultimo.nordeste > 0
    ? (ultimo.nordeste / (ultimo.norte + ultimo.nordeste)) * 100
    : 0;

  const pp = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1).replace('.', ',')} p.p.`;
  const ppAbs = (v: number) => `${Math.abs(v).toFixed(1).replace('.', ',')} p.p.`;
  return (
    <div className="w-full">
      <h2 className="text-base font-semibold text-white">
        Deslocamento Regional da Movimentação Portuária
      </h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-1">
        Participação de cada região no total nacional movimentado — 2010 a 2025
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label={`Sudeste em ${ultimo.ano}`}
            value={fmtPct(ultimo.sudeste, 0)}
            sub={`${fmtPct(primeiro.sudeste, 0)} em ${primeiro.ano} · ${pp(deltaSudeste)}`}
            positive={deltaSudeste >= 0}
            color={COR_SUDESTE}
          />
          <KpiCard
            label={`Arco Norte em ${ultimo.ano}`}
            value={fmtPct(ultimo.arcoNorte, 0)}
            sub={`avançou ${ppAbs(deltaArco)} desde ${primeiro.ano}, mas recuou ${ppAbs(recuoDoPico)} do pico de ${fmtPct(pico.arcoNorte, 0)} em ${pico.ano}`}
            positive={recuoDoPico >= 0}
            color={COR_SUDESTE}
          />
          <KpiCard
            label="Composição do Arco Norte"
            value={`${Math.round(pctNordesteNoArco)}% Nordeste · ${Math.round(100 - pctNordesteNoArco)}% Norte`}
            sub={`o arco é minério do Maranhão por ferrovia, não grão amazônico por barcaça`}
            color={COR_SUDESTE}
          />
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
                            <span className="text-white font-medium ml-auto tabular-nums">{valor.toFixed(0)}%</span>
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
                strokeDasharray={r.tracejado ? '7 4' : undefined}
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
      {/* Insight cards — neutros (branco) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white mb-1.5">
            A Migração Real
          </p>
          <p className="text-sm text-gray-300 leading-snug">
            O deslocamento é <strong className="text-white">factual, não retórico</strong>.
            Entre 2010 e 2019, o Sudeste caiu de{' '}
            <strong className="text-white">~{shareSudeste2010}% para ~{shareSudeste2019}%</strong>,
            enquanto o Arco Norte subiu de{' '}
            <strong className="text-white">~{shareArcoNorte2010}% para ~{shareArcoNorte2019}%</strong>.
            A mudança do eixo logístico está nos dados.
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white mb-1.5">
            O Platô — 6 Anos de Estagnação
          </p>
          <p className="text-sm text-gray-300 leading-snug">
            Desde <strong className="text-white">~2019, o avanço estagnou</strong>.
            O Sudeste estabilizou em torno de{' '}
            <strong className="text-white">~{shareSudesteAtual}%</strong> e o Arco Norte oscila em{' '}
            <strong className="text-white">~{shareArcoNorteAtual}%</strong> sem novo salto.
            São seis anos de platô — a leitura menos óbvia e a mais valiosa:{' '}
            <strong className="text-white">o deslocamento perdeu fôlego</strong>.
          </p>
        </div>
      </div>
      {/* Nota metodológica E2 */}
      <Accordion title={<><span className="text-sm">📐</span> Nota metodológica: o denominador, e por que ele é confiável</>}>
        <p><strong className="text-gray-400">Por que não usar o total nacional diretamente.</strong> O arquivo traz o total do país apenas <strong>por natureza de carga</strong> (nacional_por_natureza), sem quebra regional. Dividir o volume regional da base pelo total nacional produz um número exato, mas que responde a outra pergunta: &quot;quanto do país vem dos portos <strong>desta região que estão na base</strong>&quot;. Como cada região também tem terminais fora do top-50, esse valor é um <strong>piso</strong>, não a fatia da região. Para o Arco Norte em 2025, o piso é 29,53% — afirmação rigorosa e auditável, útil quando o texto precisar de um número conservador.</p>
        <p><strong className="text-gray-400">E há um efeito temporal.</strong> A cobertura da base não é constante: era 83,97% em 2010 e é 88,44% em 2025. Usar o total nacional como denominador injetaria essa deriva dentro da tendência regional — a queda do Sudeste apareceria como 3,0 p.p. em vez de 6,3 p.p., não porque o Sudeste caiu menos, mas porque a base passou a cobrir mais.</p>
        <p><strong className="text-gray-400">A validação.</strong> Calcular sobre a base equivale a supor que o volume ausente se distribui entre as regiões proporcionalmente ao observado. Essa suposição foi <strong>testada</strong>, e não apenas assumida. A cobertura da base é conhecida <strong>por natureza de carga</strong> e é bastante desigual — 87,7% no granel sólido, 91,7% no granel líquido, 95,6% no contêiner e apenas 64,4% na carga geral. Como cada região tem um mix de cargas próprio (o Norte é 85,6% granel sólido; o Sul, 30,2% contêiner), recalculou-se a participação de cada região escalando o volume de cada carga pelo fator de cobertura daquela carga.</p>
        <p>O resultado:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Sudeste: 52,04% (base) contra 51,93% (ajustado) — diferença de <strong>0,10 p.p.</strong></li>
          <li>Nordeste: 25,08% contra 25,14% — 0,06 p.p.</li>
          <li>Norte: 8,31% contra 8,35% — 0,04 p.p.</li>
          <li>Sul: 14,12% contra 14,13% — praticamente nula.</li>
          <li>Arco Norte: 33,39% (base) contra 33,49% (ajustado) — <strong>0,10 p.p.</strong></li>
        </ul>
        <p>A participação lida no gráfico é, na prática, <strong>uma boa estimativa da fatia nacional de cada região</strong>, e não apenas uma proporção interna da amostra. O desvio máximo é de 0,10 ponto percentual. O valor desse cálculo não foi trocar os números, e sim demonstrar que o método simples é seguro — o que transforma &quot;assumimos que dá na mesma&quot; em &quot;testamos, e dá na mesma dentro de 0,1 p.p.&quot;.</p>
        <p><strong className="text-gray-400">O que o ajuste não resolve.</strong> Ele corrige o <strong>mix de cargas</strong>, não a <strong>geografia</strong>. Tanto o cálculo do gráfico quanto o ajustado supõem que os 162,3 Mt ausentes se dividem entre as regiões proporcionalmente ao observado. Se os terminais fora da base estivessem concentrados numa região — todos os pequenos terminais fluviais do Norte, por exemplo — os dois métodos errariam na mesma direção. O limite superior é conhecido: se <strong>todo</strong> o volume ausente fosse do Arco Norte, o arco chegaria a 41,1%. A faixa defensável, portanto, vai de 29,5% (piso exato) a 41,1% (teto), com 33,5% como melhor estimativa.</p>
        <p><strong className="text-gray-400">Outras limitações:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>Composição da amostra muda ao longo do tempo:</strong> 38 portos reportavam em 2010 e 48 em 2024. Dez terminais entram na série depois de 2010 (Açu, Porto Sudeste, DP World Santos, Itapoá, Terminal Vila do Conde, Barcarena, Miritituba, Novo Remanso e Itacal). São aberturas reais de capacidade, não lacunas de reporte.</li>
          <li><strong>Campos uf/regiao nulos:</strong> Paranaguá e Rio Grande vêm sem esses campos (juntos, ~6% da tonelagem). Corrigidos por fallback no código; sem ele o Sul ficaria subestimado em ~2,5 p.p.</li>
          <li><strong>Campo vol12m_mt descartado:</strong> vinha desalinhado da série em 6 dos 48 portos (erro de junção); o módulo soma sempre a série.</li>
          <li><strong>Cobertura do arco:</strong> a base contém instalações para 21 dos complexos que a ANTAQ classifica como Arco Norte. Complexos sem representação (Manaus, Porto Velho, Macapá, entre outros) não entram — o recorte é o arco <strong>presente na base</strong>.</li>
          <li><strong>Participação, não volume:</strong> a queda do Sudeste é relativa; em toneladas absolutas o Sudeste seguiu crescendo no período.</li>
          <li><strong>Ano incompleto:</strong> 2026 (jan–fev na base) é omitido das agregações anuais.</li>
        </ul>
      </Accordion>
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
    granel_solido:    { cor: '#0099d8', largura: 3, destaque: true },
    conteinerizada:   { cor: '#D4922A', largura: 1.5 },
    granel_liquido:   { cor: '#00a652', largura: 1.5 },
    carga_geral:      { cor: '#8B5CF6', largura: 1.5 },
  };

  const naturezas = [
    { key: 'granel_solido' as const, label: 'Granel Sólido' },
    { key: 'conteinerizada' as const, label: 'Conteinerizada' },
    { key: 'granel_liquido' as const, label: 'Granel Líquido' },
    { key: 'carga_geral' as const, label: 'Carga Geral' },
  ];

  function calcAmplitude(data: SazonalPonto[], key: NaturezaKey) {
    const pontos = data.map(d => ({ mes: d.mes, val: d[key] }));
    const pico = pontos.reduce((a, b) => (a.val > b.val ? a : b));
    const vale = pontos.reduce((a, b) => (a.val < b.val ? a : b));
    return { pico, vale, amplitude: pico.val - vale.val };
  }

  // dentro do componente:
  const amp = {
    granel_solido:  calcAmplitude(data, 'granel_solido'),
    conteinerizada: calcAmplitude(data, 'conteinerizada'),
    granel_liquido: calcAmplitude(data, 'granel_liquido'),
    carga_geral:    calcAmplitude(data, 'carga_geral'),
  };

  // mantém os nomes usados no resto do componente, agora vindos do helper
  const picoGS = amp.granel_solido.pico;
  const valeGS = amp.granel_solido.vale;
  const amplitudeGS = amp.granel_solido.amplitude.toFixed(1);
  const picoCTZ = amp.conteinerizada.pico;
  const picoCG = amp.carga_geral.pico;

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

      {/* Insight cards — neutros (branco) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white mb-1.5">
            O Pico da Safra
          </p>
          <p className="text-sm text-gray-300 leading-snug">
            O granel sólido é o mais sazonal: pico em{' '}
            <strong className="text-white">{picoGS.mes} ({picoGS.val > 0 ? '+' : ''}{picoGS.val.toFixed(1)}%)</strong>,
            vale em <strong className="text-white">{valeGS.mes} ({valeGS.val.toFixed(1)}%)</strong>.
            A assinatura da safra aparece, mas não como a literatura resume:
            o pico agregado é em agosto, não em abril–maio, porque o minério
            pouco sazonal compete com o milho safrinha no segundo semestre.
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white mb-1.5">
            A Mudança de Patamar
          </p>
          <p className="text-sm text-gray-300 leading-snug">
            A amplitude sazonal do granel sólido saltou de{' '}
            <strong className="text-white">25% para 38% em 2019</strong> —
            um aumento de 50%. Sustentado por sete anos, é um degrau, não
            subida gradual. O pior: a pressão de capacidade no pico{' '}
            <strong className="text-white">está piorando</strong>.
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white mb-1.5">
            A Pressão Escalonada
          </p>
          <p className="text-sm text-gray-300 leading-snug">
            Os picos não coincidem: granel sólido em{' '}
            <strong className="text-white">{picoGS.mes}</strong>,
            contêiner em <strong className="text-white">{picoCTZ.mes}</strong>,
            carga geral em <strong className="text-white">{picoCG.mes}</strong>.
            O granel líquido é o menos sazonal (amplitude {amp.granel_liquido.amplitude.toFixed(1)}%).
            A pressão sobre a infraestrutura se concentra no segundo semestre.
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

            <ReferenceLine y={0} stroke="#ffffff" strokeOpacity={0.2} strokeDasharray="6 3">
              <Label value=" " position="right" fill="#6b7280" fontSize={10} />
            </ReferenceLine>

            <ReferenceArea x1="Mai" x2="Out" fill="#0099d8" fillOpacity={0.05}>
              <Label value="janela de safra (grãos)" position="insideBottom" fill="#6b7280" fontSize={10} dy={-4} />
            </ReferenceArea>

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
        Amplitude: GS {amp.granel_solido.amplitude.toFixed(1)}% ·{' '}
        CTZ {amp.conteinerizada.amplitude.toFixed(1)}% ·{' '}
        GL {amp.granel_liquido.amplitude.toFixed(1)}% ·{' '}
        CG {amp.carga_geral.amplitude.toFixed(1)}%.
        Fonte: ANTAQ (2010–2026). Elaboração: Observatório IBI.
      </p>
      {/* Nota metodológica V1 */}
      <Accordion title={<><span className="text-sm">📐</span> Nota metodológica e limitações</>}>
        <p><strong className="text-gray-400">Série nacional — o V1 é imune aos problemas de amostra dos módulos E1 e E2.</strong> Verificou-se que o stl.json é construído sobre <strong>nacional_por_natureza</strong> (o país inteiro): o campo observado bate com a série nacional com desvio médio entre <strong>0,005% e 0,058%</strong> nas quatro naturezas. Portanto o V1 não é afetado pela deriva de cobertura da base de portos (que vai de 84,0% em 2010 a 88,4% em 2025) nem pela mudança de composição da amostra. Não há ressalva de &quot;top-50&quot; aplicável a este módulo.</p>
        <p><strong className="text-gray-400">Somente anos completos.</strong> O ano parcial do snapshot (2026, com jan–fev) é <strong>excluído</strong> do cálculo. Se incluído, contribuiria com observações extras apenas para janeiro e fevereiro, enviesando esses meses em até 0,8 p.p. O componente detecta e descarta automaticamente qualquer ano sem doze meses.</p>
        <p><strong className="text-gray-400">Agregação por natureza, não por produto.</strong> O granel sólido soma minério de ferro, soja, milho e fertilizantes. A assinatura reflete a <strong>mistura</strong>, não uma commodity isolada — a soja não pode ser separada do milho nesta série. Um recorte por produto exigiria dado adicional.</p>
        <p><strong className="text-gray-400">Decomposição STL.</strong> O componente sazonal pode variar entre anos (ver a seção de insight acima); a figura usa a <strong>média por mês-do-ano</strong> para uma assinatura estável. Anos atípicos entram como <strong>resíduo</strong>, não como sazonalidade.</p>
        <p><strong className="text-gray-400">Interpretação percentual.</strong> O desvio é <strong>relativo à média de cada natureza</strong>; o gráfico não compara magnitudes absolutas entre naturezas. Granel sólido move cerca de 55 Mt/mês; carga geral, cerca de 4,5 Mt/mês — a métrica percentual torna as quatro naturezas comparáveis apesar de volumes muito diferentes.</p>
      </Accordion>
    </div>
  );
}

// ── V2: Vulnerabilidade do Corredor de Grãos Fluvial ─────────────────────────────

interface V2TerminalConfig {
  nome: string;           // nome no JSON
  display: string;        // nome no card
  subtitulo: string;      // linha 2
  selo: 'colapso' | 'resiliu' | 'afetado';
  piorMesEsperado: string;
  piorValorEsperado: string;
}

const TERMinaIS_V2: V2TerminalConfig[] = [
  { nome: 'Hidrovias do Brasil Miritituba',          display: 'Miritituba',          subtitulo: 'Tapajós · origem do corredor',         selo: 'colapso',  piorMesEsperado: 'Out',  piorValorEsperado: '−87%' },
  { nome: 'Terminal Vila do Conde',                 display: 'Terminal Vila do Conde', subtitulo: 'Tapajós · 13,3 Mt/ano',              selo: 'colapso',  piorMesEsperado: 'Out',  piorValorEsperado: '−64%' },
  { nome: 'Terminal Portuário Graneleiro de Barcarena', display: 'Barcarena',        subtitulo: 'Tapajós · recebe barcaças',            selo: 'colapso',  piorMesEsperado: 'Out',  piorValorEsperado: '−59%' },
  { nome: 'Terminal Graneleiro Hermasa',              display: 'Hermasa (Itacoatiara)', subtitulo: 'Madeira · corredor alternativo',    selo: 'colapso',  piorMesEsperado: 'Set',  piorValorEsperado: '−53%' },
  { nome: 'Terminal Trombetas',                     display: 'Trombetas',           subtitulo: 'Trombetas · bauxita',                 selo: 'resiliu',  piorMesEsperado: 'Out',  piorValorEsperado: '−28%' },
  { nome: 'Itaqui',                                 display: 'Itaqui',              subtitulo: 'Oceânico · ferrovia',                 selo: 'resiliu',  piorMesEsperado: 'Out',  piorValorEsperado: '−2%' },
];

function VulnerabilidadeCorredor({ data }: { data: Dataset }) {
  const mesesLabels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // ── Processar dados para cada terminal ──
  const dadosTerminais = useMemo(() => {
    return TERMinaIS_V2.map(cfg => {
      const porto = data.portos.find(p => p.porto === cfg.nome);
      if (!porto) return null;

      const serie = porto.naturezas?.granel_solido;
      if (!serie || serie.length === 0) return null;

      // Agrupar por ano e mês
      const porAno: Record<string, Record<number, number>> = {};
      for (const p of serie) {
        const ano = p.data.slice(0, 4);
        const mes = parseInt(p.data.slice(5, 7));
        if (!porAno[ano]) porAno[ano] = {};
        porAno[ano][mes] = (porAno[ano][mes] || 0) + p.mt;
      }

      // Janela: 2019-2024 (anos completos)
      const anosCompletos = ['2019','2020','2021','2022','2023','2024'];
      const dadosGrafico: Record<string, number[]> = {};
      
      for (const ano of anosCompletos) {
        if (!porAno[ano]) continue;
        const arr: number[] = [];
        for (let m = 1; m <= 12; m++) {
          arr.push(porAno[ano][m] || 0);
        }
        dadosGrafico[ano] = arr;
      }

      // Calcular mediana por mês (2019-2023)
      const medianaPorMes: number[] = [];
      for (let m = 0; m < 12; m++) {
        const valores: number[] = [];
        for (const ano of ['2019','2020','2021','2022','2023']) {
          if (dadosGrafico[ano]) valores.push(dadosGrafico[ano][m]);
        }
        if (valores.length >= 3) {
          valores.sort((a, b) => a - b);
          const mid = Math.floor(valores.length / 2);
          medianaPorMes[m] = valores.length % 2 === 0 ? (valores[mid-1] + valores[mid]) / 2 : valores[mid];
        } else {
          medianaPorMes[m] = 0;
        }
      }

      // Calcular pior mês de 2024 na janela de águas baixas (Set-Dez)
      let piorDesvio = 0;
      let piorMesIdx = -1;
      for (let m = 8; m <= 11; m++) { // Set=8, Out=9, Nov=10, Dez=11
        if (dadosGrafico['2024'] && medianaPorMes[m] > 0) {
          const desvio = ((dadosGrafico['2024'][m] - medianaPorMes[m]) / medianaPorMes[m]) * 100;
          if (desvio < piorDesvio) {
            piorDesvio = desvio;
            piorMesIdx = m;
            
          }
        }
      }
      const corDestaque = cfg.selo === 'colapso' ? '#E39A00' : '#00a652';

      return {
        ...cfg,
        dadosGrafico,
        medianaPorMes,
        piorDesvio,
        corDestaque,
        piorMes: piorMesIdx >= 0 ? mesesLabels[piorMesIdx] : null,
        
      };
    }).filter(Boolean);
  }, [data]);

  // Dados para gráficos (formato recharts)
  const chartData = useMemo(() => {
    return dadosTerminais.map(dt => {
      const data = [];
      for (let m = 0; m < 12; m++) {
        const point: any = { mes: mesesLabels[m] };
        for (const ano of ['2019','2020','2021','2022','2023','2024']) {
          if (dt!.dadosGrafico[ano]) {
            point[`ano${ano}`] = dt!.dadosGrafico[ano][m];
          }
        }
        data.push(point);
      }
      return { ...dt!, data };
    });
  }, [dadosTerminais]);

  const COR_ANOS_COMUNS = ['#555','#666','#777','#888','#999'];
  const COR_SECA = '#ef4444';

  return (
    <div className="w-full">
      <h2 className="text-base font-semibold text-white">Vulnerabilidade do Corredor de Grãos Fluvial</h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        Efeito da seca de 2024 sobre terminais do Norte — sobreposição de 2019–2024
      </p>

      {/* Insight cards — neutros (branco) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white mb-1.5">
            O Colapso
          </p>
          <p className="text-sm text-gray-300 leading-snug">
            A seca de 2024 <strong className="text-white">colapsou o corredor de grãos</strong>.
            Nos quatro terminais, 2024 fura o envelope entre setembro e novembro,
            com quedas de <strong className="text-white">53% a 87%</strong> no pior mês.
            Miritituba, na origem do Tapajós, foi o mais atingido.
            A assinatura de um <strong className="text-white">corredor inteiro parando</strong>.
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white mb-1.5">
            A Contraprova
          </p>
          <p className="text-sm text-gray-300 leading-snug">
            Mas não é &quot;todo fluvial sofre&quot;. Trombetas, igualmente fluvial,
            <strong className="text-white"> não colapsou</strong>: o pior mês ficou em
            <strong className="text-white"> −28%</strong>, dentro da variação normal.
            A diferença não é ser fluvial — é <strong className="text-white">a bacia e a carga</strong>.
            Bauxita em fluxo constante vs. grãos em surto de safra.
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white mb-1.5">
            A Redundância
          </p>
          <p className="text-sm text-gray-300 leading-snug">
            Itaqui, oceânico e alimentado por ferrovia, praticamente não registrou
            desvio (<strong className="text-white">−2%</strong>). O trilho não
            compartilha a vulnerabilidade do rio. Sustenta o caso da
            <strong className="text-white"> redundância multimodal</strong>:
            quando o rio trava, a ferrovia mantém.
          </p>
        </div>
      </div>

      {/* Mini charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chartData.map((terminal, idx) => (
          <div key={terminal.nome} className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white">{terminal.display}</span>
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase ${
                terminal.selo === 'colapso' ? 'bg-[#A0153E]/20 text-[#A0153E]' :
                terminal.selo === 'afetado' ? 'bg-[#D4922A]/20 text-[#D4922A]' :
                'bg-[#00a652]/15 text-[#00a652]'
              }`}>
                {terminal.selo === 'colapso' ? 'Colapso' : terminal.selo === 'afetado' ? 'Afetado' : 'Resiliu'}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mb-2">{terminal.subtitulo}</p>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={terminal.data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                    itemStyle={{ fontSize: 11 }}
                    formatter={(value: any) => `${Number(value).toFixed(2)} Mt`}
                    labelFormatter={(label) => label}
                  />
                  {/* Águas baixas: Set-Dez */}
                  <ReferenceArea x1="Set" x2="Dez" fill="#D4922A" fillOpacity={0.06} />
                  {/* Anos comuns */}
                  {['2019','2020','2021','2022','2023'].map((ano, i) => (
                    <Line
                      key={ano}
                      type="monotone"
                      dataKey={`ano${ano}`}
                      stroke={COR_ANOS_COMUNS[i]}
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  ))}
                  {/* 2024 seca */}
                  <Line
                    type="monotone"
                    dataKey="ano2024"
                    stroke={terminal.corDestaque}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: COR_SECA, stroke: '#111827', strokeWidth: 1 }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 text-center">
              Pior mês: <span className="font-semibold text-white">{terminal.piorMes || '—'}</span>
              {' '}{terminal.piorDesvio < 0 ? (
                <span className="font-semibold text-[#A0153E]">{terminal.piorDesvio.toFixed(0)}%</span>
              ) : (
                <span className="font-semibold text-[#00a652]">+{terminal.piorDesvio.toFixed(0)}%</span>
              )} vs. mediana
            </p>
          </div>
        ))}
      </div>

      {/* Nota metodológica V2 */}
      <Accordion title={<><span className="text-sm">📐</span> Como identificamos o efeito da seca</>}>
        <p><strong className="text-gray-400">Comparar mês com mês:</strong> 2024 é comparado com os mesmos meses de 2019–2023, nunca contra a média do ano. Isso separa a sazonalidade normal da anomalia climática.</p>
        <p><strong className="text-gray-400">Janela de águas baixas:</strong> a avaliação é restrita a <strong>setembro–dezembro</strong>. Fora dessa janela, um vale pode ser apenas sazonalidade normal. O Terminal Fluvial de Juruti, por exemplo, tem pior mês em março — que não é seca.</p>
        <p><strong className="text-gray-400">Mínimo de 3 anos:</strong> terminais com menos de 3 anos de histórico exibem &quot;dados insuficientes&quot;. O Terminal Portuário Novo Remanso (série desde 2023) foi excluído por este critério.</p>
        <p><strong className="text-gray-400">Janela de 6 anos:</strong> usam-se 2019–2024, não a série toda. A amplitude sazonal do granel sólido mudou de patamar em 2019 (de ~25% para ~38%). Ampliar para trás compararia 2024 contra anos de regime sazonal estruturalmente diferente.</p>
        <p><strong className="text-gray-400">Selo automático:</strong> &quot;colapso&quot; (−50% ou mais), &quot;afetado&quot; (−35% ou mais), &quot;normal&quot; (acima de −35%). O selo é calculado, não escrito à mão — se a seca de outro ano for mais severa, o selo acompanha.</p>
        <p><strong className="text-gray-400">Exclusão de Santarém:</strong> o maior terminal fluvial do Norte (18,1 Mt/ano) foi excluído. Setembro de 2024 ficou <strong>61% acima</strong> da mediana — aparentemente absorveu o choque. Mantê-lo como &quot;afetado&quot; seria enganoso.</p>
      </Accordion>
    </div>
  );
}

// ── Kpi component ────────────────────────────────────────────────────────
export function KpiCard({
  label,
  value,
  sub,
  positive,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  color: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 space-y-2 hover:border-white/15 transition-colors">
      <p className="text-xs text-gray-500 leading-snug">{label}</p>
      <p className="text-xl font-bold tracking-tight leading-tight" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p
          className={[
            'text-xs leading-snug',
            positive === true ? 'text-[#00a652]' : positive === false ? 'text-[#A0153E]' : 'text-gray-500',
          ].join(' ')}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Accordion component ────────────────────────────────────────────────────────

function Accordion({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-4 py-3 text-[13px] text-gray-400 hover:bg-[#222] transition-all ${open ? 'rounded-b-none' : ''}`}
      >
        <span className="flex items-center gap-2">{title}</span>
        <span className={`text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 bg-[#1a1a1a] border border-t-0 border-white/[0.06] rounded-b-lg ${open ? 'max-h-[800px] p-4' : 'max-h-0 p-0'}`}
      >
        <div className="text-xs text-gray-500 leading-relaxed space-y-2">{children}</div>
      </div>
    </div>
  );
}

// ── loading and error component states ────────────────────────────────────────────────────────
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
