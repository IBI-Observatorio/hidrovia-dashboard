"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Star, Database, Beaker, BookOpen, Calendar, MapPin, TrendingUp, FileText, Archive, RefreshCw, AlertTriangle, ExternalLink, BarChart3 } from 'lucide-react';
import IndicadorInterativo from '@/components/antaq/IndicadorInterativo';
import { CORES_CLUSTER, DATA_BASE } from '@/components/antaq/cores';

export default function IndicadorPage() {
  const { cluster: slugCluster, slug } = useParams();
  const [indicador, setIndicador] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    setIndicador(null);
    setErro(null);
    fetch(`${DATA_BASE}/manifest.json`)
      .then((r) => r.json())
      .then((m) => {
        setManifest(m);
        const meta = m.indicadores.find(
          (i) => i.cluster === slugCluster && i.slug === slug,
        );
        if (!meta) {
          setErro(`Indicador não encontrado: ${slug}`);
          return;
        }
        return fetch(`${DATA_BASE}/indicadores/${meta.id}-${meta.slug}.json`)
          .then((r) => r.json())
          .then(setIndicador);
      })
      .catch((e) => setErro(String(e)));
  }, [slug, slugCluster]);

  if (erro) {
    return (
      <div className="min-h-screen bg-gray-900 pt-40 text-center">
        <p className="text-red-400">{erro}</p>
        <Link href="/portos" className="mt-4 inline-flex items-center gap-2 text-ibi-blue">
          <ArrowLeft className="h-4 w-4" /> Todos os indicadores
        </Link>
      </div>
    );
  }
  if (!indicador || !manifest) {
    return (
      <div className="min-h-screen bg-gray-900 pt-40 text-center text-gray-400">
        Carregando…
      </div>
    );
  }

  const cluster = manifest.clusters.find((c) => c.slug === slugCluster);
  const cor = CORES_CLUSTER[slugCluster] || '#0099D8';
  const tiposAutossuficientes = ['medias_moveis_31','medias_moveis_32','medias_moveis_33'];
  const usaInterativo =
    indicador.grafico && (
      (indicador.dados?.length > 0) ||
      tiposAutossuficientes.includes(indicador.grafico?.tipo)
    );
  const temBlocos = !!indicador.o_que_e;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <section className="border-b border-gray-800 bg-gradient-to-br
                          from-gray-900 via-ibi-dark to-gray-900 pt-12 pb-10">
        <div className="container mx-auto px-6">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </a>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-lg px-2.5 py-1 text-xs font-mono"
                  style={{ backgroundColor: `${cor}25`, color: cor }}>
              {cluster?.nome || indicador.cluster}
            </span>
            {indicador.destaque && (
              <span className="inline-flex items-center gap-1 rounded-full
                                bg-yellow-400/10 px-2.5 py-1 text-xs text-yellow-400">
                <Star className="h-3 w-3" fill="currentColor" /> Inédito IBI
              </span>
            )}
            <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs
                              text-gray-400 capitalize">
              {indicador.granularidade}
            </span>
            {indicador.cobertura && (
              <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-400">
                {indicador.cobertura.inicio}–{indicador.cobertura.fim}
              </span>
            )}
            {indicador.badge && (
              <span className="inline-flex items-center gap-1 rounded-full
                                bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300
                                border border-red-500/30">
                {indicador.badge}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {indicador.titulo}
          </h1>

          {indicador.subtitulo && (
            <p className="mt-2 max-w-3xl text-base text-gray-400">
              {indicador.subtitulo}
            </p>
          )}

          {!temBlocos && (
            <p className="mt-4 max-w-3xl text-gray-300 leading-relaxed">
              <Markdown source={indicador.descricao} />
            </p>
          )}
        </div>
      </section>

      <section className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Database className="h-5 w-5 text-ibi-blue" />
                {usaInterativo ? 'Gráfico interativo' : 'Visualização'}
              </h2>
              {usaInterativo ? (
                <IndicadorInterativo indicador={indicador} />
              ) : (
                indicador.imagem && (
                  <img
                    src={`${DATA_BASE}/${indicador.imagem}`}
                    alt={indicador.titulo}
                    className="w-full rounded-lg bg-white"
                  />
                )
              )}
            </div>

            {/* Blocos editoriais (pirâmide invertida) — só quando o_que_e existe */}
            {temBlocos && (
              <>
                <BlocoOQueE data={indicador.o_que_e} />
                {indicador.como_funciona && (
                  <BlocoComoFunciona data={indicador.como_funciona} />
                )}
                {indicador.por_que_bimestral && (
                  <BlocoPorQueBimestral data={indicador.por_que_bimestral} />
                )}
              </>
            )}

            {indicador.card_previsao_atual && (
              <CardPrevisaoAtual card={indicador.card_previsao_atual} />
            )}

            {indicador.diagnosticos_estatisticos && (
              <BlocoDiagnosticos data={indicador.diagnosticos_estatisticos} />
            )}

            {indicador.track_record?.length > 0 && (
              <TrackRecord
                registros={indicador.track_record}
                metricas={indicador.metricas_producao}
              />
            )}

            {indicador.disclaimer_vintage && (
              <DisclaimerVintage texto={indicador.disclaimer_vintage} />
            )}

            {indicador.links_transparencia && (
              <BlocoTransparencia links={indicador.links_transparencia} />
            )}

            {temBlocos && (
              <>
                {indicador.detalhes_tecnicos && (
                  <BlocoDetalhesTecnicos data={indicador.detalhes_tecnicos} />
                )}
                {indicador.limitacoes && (
                  <BlocoLimitacoes data={indicador.limitacoes} />
                )}
                {indicador.reprodutibilidade && (
                  <BlocoReprodutibilidade data={indicador.reprodutibilidade} />
                )}
              </>
            )}

            {!temBlocos && indicador.achados?.length > 0 && (
              <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <BookOpen className="h-5 w-5 text-ibi-green" /> Achados
                </h2>
                <ul className="space-y-2 text-sm">
                  {indicador.achados.map((a, i) => (
                    <li key={i} className="flex gap-2 text-gray-300">
                      <span className="text-ibi-blue">·</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!temBlocos && indicador.dados?.length > 0 && (
              <TabelaDados dados={indicador.dados} />
            )}
          </div>

          <aside className="space-y-6">
            <Bloco titulo="Metodologia" icon={Beaker}>
              <Markdown source={indicador.metodologia} />
            </Bloco>
            <Bloco titulo="Fonte" icon={MapPin}>
              <p className="text-sm text-gray-400">{indicador.fonte}</p>
            </Bloco>
            {indicador.premissas && (
              <Bloco titulo="Premissas" icon={Database}>
                <p className="text-sm text-gray-400">{indicador.premissas}</p>
              </Bloco>
            )}
            <Bloco titulo="Atualização" icon={Calendar}>
              <p className="text-sm text-gray-400">
                Última geração:{' '}
                <span className="text-gray-200">{indicador.ultima_atualizacao}</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Atualizado mensalmente quando a ANTAQ publica novos dados.
              </p>
            </Bloco>
          </aside>
        </div>
      </section>
    </div>
  );
}

// ─── Card destacado: Previsão atual em produção ──────────────────────────
function CardPrevisaoAtual({ card }) {
  const fmtPp = (v) => (v >= 0 ? '+' : '') + Number(v).toFixed(2) + ' pp';
  const fmtMes = (s) => {
    const [a, m] = String(s).split('-');
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${meses[parseInt(m,10)-1]}/${a}`;
  };
  const dirCor = card.var12m_prevista_pp >= 0 ? '#16a34a' : '#dc2626';

  return (
    <div className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-br
                    from-red-950/30 via-gray-900/60 to-gray-900/60 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="h-5 w-5 text-red-400" />
          Previsão em vigor
        </h2>
        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
          h = {card.horizonte}
        </span>
      </div>

      {card.headline_texto && (
        <p className="mb-4 text-sm leading-relaxed text-gray-200">
          <Markdown source={card.headline_texto} />
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Mês alvo
          </div>
          <div className="mt-0.5 text-2xl font-bold text-white">
            {fmtMes(card.mes_alvo)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Var. 12m prevista
          </div>
          <div className="mt-0.5 text-2xl font-bold tabular-nums" style={{ color: dirCor }}>
            {fmtPp(card.var12m_prevista_pp)}
          </div>
          <div className="text-xs text-gray-400 tabular-nums">
            IC 80%: [{fmtPp(card.intervalo_inferior_pp)}, {fmtPp(card.intervalo_superior_pp)}]
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-400">
        <div>
          <div className="text-[10px] uppercase text-gray-500">Última obs. PIM-PF</div>
          <div className="text-gray-300">{card.ultima_obs_pim_pf}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-gray-500">Emitida em</div>
          <div className="text-gray-300">{card.data_emissao}</div>
        </div>
        {card.peso_dfm != null && (
          <div>
            <div className="text-[10px] uppercase text-gray-500">Peso DFM</div>
            <div className="text-gray-300 tabular-nums">{(card.peso_dfm * 100).toFixed(1)}%</div>
          </div>
        )}
        <div>
          <div className="text-[10px] uppercase text-gray-500">Modelo</div>
          <div className="font-mono text-gray-300">{card.modelo_dfm}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Diagnósticos estatísticos (público sênior) ──────────────────────────
function BlocoDiagnosticos({ data }) {
  if (!data?.metricas?.length) return null;
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
        <BarChart3 className="h-5 w-5 text-ibi-blue" /> Diagnósticos estatísticos
      </h2>
      {(data.n_origens_oos || data.janela) && (
        <p className="mb-3 text-xs leading-relaxed text-gray-400">
          {data.introducao} {data.n_origens_oos && (
            <span className="text-gray-300">
              n = {data.n_origens_oos} origens · janela {data.janela}.
            </span>
          )}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="px-3 py-2 font-medium w-[28%]">Métrica</th>
              <th className="px-3 py-2 font-medium w-[22%]">Valor</th>
              <th className="px-3 py-2 font-medium w-[20%]">Comparação</th>
              <th className="px-3 py-2 font-medium">Leitura</th>
            </tr>
          </thead>
          <tbody>
            {data.metricas.map((m, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 align-top">
                <td className="px-3 py-2 text-gray-200 font-medium">{m.label}</td>
                <td className="px-3 py-2 text-gray-100 tabular-nums">{m.valor}</td>
                <td className="px-3 py-2 text-gray-400 tabular-nums">{m.comparacao || '—'}</td>
                <td className="px-3 py-2 text-gray-300 leading-relaxed">{m.leitura}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.nota_amostra_recente && (
        <p className="mt-3 rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2 text-[11px] leading-relaxed text-gray-400">
          <span className="font-semibold text-gray-300">Nota.</span> {data.nota_amostra_recente}
        </p>
      )}
    </div>
  );
}

// ─── Tabela de track record (validação histórica + produção) ──────────────
function TrackRecord({ registros, metricas }) {
  const fmtMes = (s) => {
    const [a, m] = String(s).split('-');
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${meses[parseInt(m,10)-1]}/${a}`;
  };
  const fmtPp = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(2);

  // Defensivo: filtramos h=2 (o indicador não é publicado em h=1).
  const h2 = registros.filter((r) => r.horizonte === 2);
  const valHist = h2.filter((r) => r.tipo === 'validacao_historica');
  const prod    = h2.filter((r) => r.tipo === 'producao');

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <BookOpen className="h-5 w-5 text-ibi-green" /> Track record
      </h2>
      <p className="mb-4 text-xs text-gray-400 leading-relaxed">
        Tabela mostra duas coisas distintas: <span className="text-gray-200 font-medium">
        amostra recente de validação histórica</span> (6 origens jul–dez/2025, h=2,
        recortadas das 95 origens completas reportadas em &quot;Diagnósticos
        estatísticos&quot;) e <span className="text-gray-200 font-medium">
        previsões em produção</span> (emitidas desde mai/2026, ainda sem
        realizado disponível).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="px-3 py-2 font-medium">Mês alvo</th>
              <th className="px-3 py-2 font-medium">Previsto (pp)</th>
              <th className="px-3 py-2 font-medium">Realizado (pp)</th>
              <th className="px-3 py-2 font-medium">|Erro| (pp)</th>
              <th className="px-3 py-2 font-medium">Dentro IC 80%?</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {valHist.map((r, i) => (
              <tr key={'v'+i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-3 py-1.5 text-gray-300">{fmtMes(r.mes_alvo)}</td>
                <td className="px-3 py-1.5 text-gray-300 tabular-nums">{fmtPp(r.previsto_pp)}</td>
                <td className="px-3 py-1.5 text-gray-300 tabular-nums">{fmtPp(r.realizado_pp)}</td>
                <td className="px-3 py-1.5 text-gray-300 tabular-nums">
                  {r.erro_abs_pp == null ? '—' : Number(r.erro_abs_pp).toFixed(2)}
                </td>
                <td className="px-3 py-1.5">
                  {r.dentro_intervalo === true ? (
                    <span className="text-green-400">✓</span>
                  ) : r.dentro_intervalo === false ? (
                    <span className="text-red-400">✗</span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-xs text-gray-500">validação</td>
              </tr>
            ))}
            {valHist.length > 0 && prod.length > 0 && (
              <tr className="border-b border-red-500/30">
                <td colSpan={6} className="px-3 py-2 text-center text-[11px]
                                            uppercase tracking-wider
                                            text-red-300/80 bg-red-950/20">
                  ───   abaixo: previsões em produção (emitidas mensalmente)   ───
                </td>
              </tr>
            )}
            {prod.map((r, i) => (
              <tr key={'p'+i} className="border-b border-gray-800/50 hover:bg-gray-800/30
                                          bg-red-950/10">
                <td className="px-3 py-1.5 text-gray-200 font-medium">{fmtMes(r.mes_alvo)}</td>
                <td className="px-3 py-1.5 text-gray-200 tabular-nums">{fmtPp(r.previsto_pp)}</td>
                <td className="px-3 py-1.5 text-gray-200 tabular-nums">{fmtPp(r.realizado_pp)}</td>
                <td className="px-3 py-1.5 text-gray-200 tabular-nums">
                  {r.erro_abs_pp == null ? <span className="text-gray-500 italic">aguardando</span> : Number(r.erro_abs_pp).toFixed(2)}
                </td>
                <td className="px-3 py-1.5">
                  {r.dentro_intervalo === true ? (
                    <span className="text-green-400">✓</span>
                  ) : r.dentro_intervalo === false ? (
                    <span className="text-red-400">✗</span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-xs text-red-300">produção</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {metricas && (
        <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-gray-500">
            Métricas em produção
          </div>
          {metricas.mensagem ? (
            <p className="text-sm text-gray-400 italic">{metricas.mensagem}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase text-gray-500">N produção</div>
                <div className="text-gray-200 font-medium">{metricas.n_previsoes}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-gray-500">MAE 12m (pp)</div>
                <div className="text-gray-200 font-medium tabular-nums">
                  {Number(metricas.mae_rolling_12m_pp).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-gray-500">Cobertura empírica</div>
                <div className="text-gray-200 font-medium tabular-nums">
                  {(metricas.cobertura_empirica * 100).toFixed(1)}%
                </div>
              </div>
              <div className="col-span-2 sm:col-span-3 mt-2 text-[11px] text-gray-500">
                Comparação: MAE em validação histórica =
                {' '}<span className="text-gray-300">{Number(metricas.mae_validacao_historica_pp).toFixed(2)} pp</span>.
                Diferença esperada de 10–25% em produção pelo vintage IBGE
                (ver disclaimer abaixo).
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Disclaimer de vintage ────────────────────────────────────────────────
function DisclaimerVintage({ texto }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" />
        <div>
          <div className="text-xs uppercase tracking-wider text-amber-300 font-medium">
            Disclaimer — vintage IBGE
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{texto}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Bloco de transparência (3 links) ─────────────────────────────────────
function BlocoTransparencia({ links }) {
  const itens = [
    { chave: 'nota_tecnica',       label: 'Nota técnica completa',           Icon: FileText },
    { chave: 'h1_arquivado',       label: 'Por que não publicamos em h=1',   Icon: Archive },
    { chave: 'compromisso_retest', label: 'Compromisso de re-test mai/2028', Icon: RefreshCw },
  ];
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-5">
      <div className="mb-3 text-xs uppercase tracking-wider text-gray-500">
        Transparência metodológica
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {itens.map(({ chave, label, Icon }) => links[chave] ? (
          <a
            key={chave}
            href={`https://github.com/IBI-Observatorio/IBI-Observatorio/blob/main/${links[chave]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/40
                        px-3 py-2 text-xs text-gray-300 transition-all
                        hover:border-ibi-blue hover:text-ibi-blue"
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{label}</span>
          </a>
        ) : null)}
      </div>
    </div>
  );
}

// ── Blocos editoriais (pirâmide invertida) ────────────────────────────────

function BlocoOQueE({ data }) {
  const items = [
    { label: 'O que é.', texto: data.o_que_e },
    { label: 'Para que serve.', texto: data.para_que_serve },
    { label: 'Quão bom é.', texto: data.quao_bom },
    { label: 'O que ele não faz.', texto: data.o_que_nao_faz },
  ];
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6 space-y-4">
      {items.map(({ label, texto }) => (
        <p key={label} className="text-sm text-gray-300 leading-relaxed">
          <strong className="text-gray-100">{label}</strong>{' '}{texto}
        </p>
      ))}
    </div>
  );
}

function BlocoComoFunciona({ data }) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6">
      <h3 className="mb-3 text-base font-semibold">Como funciona</h3>
      <p className="text-sm text-gray-400 mb-4">{data.introducao}</p>
      <ol className="space-y-3 mb-4">
        {data.fontes?.map((f) => (
          <li key={f.numero} className="flex gap-3 text-sm text-gray-300">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400
                             text-xs flex items-center justify-center font-bold mt-0.5">
              {f.numero}
            </span>
            <span>
              <strong className="text-gray-100">{f.titulo}.</strong>{' '}{f.descricao}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-gray-400">{data.pesos}</p>
    </div>
  );
}

function BlocoPorQueBimestral({ data }) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6">
      <h3 className="mb-3 text-base font-semibold">Por que apenas em horizonte de 2 meses</h3>
      <p className="text-sm text-gray-300 leading-relaxed">{data.texto}</p>
      {data.link_arquivado && (
        <a href={data.link_arquivado}
           className="mt-3 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
          <ExternalLink className="h-3 w-3" /> Ver análise arquivada h=1
        </a>
      )}
    </div>
  );
}

function BlocoDetalhesTecnicos({ data }) {
  if (!data) return null;
  const secoes = [
    { label: 'Especificação',            key: 'especificacao' },
    { label: 'Validação',                key: 'validacao' },
    { label: 'Encompassing test',        key: 'encompassing_test' },
    { label: 'Pesos rolling OOS',        key: 'pesos_rolling' },
    { label: 'Intervalos de previsão',   key: 'intervalos_previsao' },
    { label: 'Diagnósticos de resíduo',  key: 'diagnosticos_residuo' },
    { label: 'Critério de publicação',   key: 'criterio_publicacao' },
  ];
  return (
    <details className="rounded-2xl border border-gray-700 bg-gray-900/60 overflow-hidden">
      <summary className="cursor-pointer select-none p-6 text-sm font-semibold
                          text-gray-400 hover:text-gray-200 transition-colors list-none">
        ▶ {data.label}
      </summary>
      <div className="border-t border-gray-700 px-6 pb-6 pt-4 space-y-5">
        {secoes.map(({ label, key }) =>
          data[key] ? (
            <div key={key}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {label}
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">{data[key]}</p>
            </div>
          ) : null,
        )}
      </div>
    </details>
  );
}

function BlocoLimitacoes({ data }) {
  if (!data?.items?.length) return null;
  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-yellow-300">
        <AlertTriangle className="h-4 w-4" /> Limitações e disclaimers
      </h3>
      <ul className="space-y-3">
        {data.items.map((item) => (
          <li key={item.label} className="text-sm text-gray-300 leading-relaxed">
            <strong className="text-gray-100">{item.label}.</strong>{' '}{item.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlocoReprodutibilidade({ data }) {
  if (!data?.links?.length) return null;
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <FileText className="h-4 w-4 text-blue-400" /> Reprodutibilidade e transparência
      </h3>
      <ul className="space-y-2">
        {data.links.map((link) => (
          <li key={link.label}>
            {link.href ? (
              <a href={link.href}
                 className="inline-flex items-center gap-2 text-sm text-blue-400 hover:underline">
                <span>{link.emoji}</span> {link.label}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                <span>{link.emoji}</span> {link.label}
                <span className="text-xs text-gray-600">(em breve)</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Componentes de suporte ─────────────────────────────────────────────────

function Bloco({ titulo, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
        <Icon className="h-4 w-4 text-ibi-blue" /> {titulo}
      </h3>
      <div className="text-sm text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

/** Markdown minimalista — só **bold** e `code`. */
function Markdown({ source }) {
  if (!source) return null;
  const html = source
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-gray-800 px-1.5 py-0.5 text-xs">$1</code>')
    .replace(/\n\n/g, '<br/><br/>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function TabelaDados({ dados }) {
  const colunas = Object.keys(dados[0] || {});
  const limite = 50;

  // Para séries temporais, ordenar do mais recente para o mais antigo.
  const colTemporal = ['mes', 'Mes', 'data', 'Ano', 'ano']
    .find((c) => colunas.includes(c));
  const ordenados = colTemporal
    ? [...dados].sort((a, b) => {
        const av = a[colTemporal], bv = b[colTemporal];
        if (av == null) return 1;
        if (bv == null) return -1;
        return String(bv).localeCompare(String(av));
      })
    : dados;
  const visiveis = ordenados.slice(0, limite);
  const truncado = dados.length > limite;

  const fmt = (v) => {
    if (v == null) return '—';
    if (typeof v === 'number') {
      if (Math.abs(v) >= 1e6) return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      if (Number.isInteger(v)) return v.toLocaleString('pt-BR');
      return v.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
    }
    return String(v);
  };

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5 text-ibi-blue" /> Dados
        </h2>
        <span className="text-xs text-gray-500">
          {dados.length} registros
          {truncado && (
            colTemporal
              ? ` · mostrando os ${limite} mais recentes`
              : ` · mostrando ${limite}`
          )}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              {colunas.map((c) => (
                <th key={c} className="px-3 py-2 font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((row, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                {colunas.map((c) => (
                  <td key={c} className="px-3 py-1.5 text-gray-300 whitespace-nowrap">
                    {fmt(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
