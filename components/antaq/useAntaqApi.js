"use client";
import { useEffect, useState } from 'react';

const BASE =
  process.env.NEXT_PUBLIC_ANTAQ_API_URL ||
  'https://antaq-api-production.up.railway.app';

const cache = {};

async function apiFetch(path, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach(x => qs.append(k, String(x)));
    else qs.set(k, String(v));
  }
  const url = `${BASE}${path}?${qs.toString()}`;
  if (cache[url]) return cache[url];
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  const data = await r.json();
  cache[url] = data;
  return data;
}

/**
 * Faz múltiplas chamadas paralelas ao /api/v1/series e retorna um array de respostas.
 *
 * queriesArray: array de objetos de parâmetros, cada um passado como query string.
 * Parâmetros suportados (subset relevante):
 *   natureza, metrica, freq, suavizacao, variacao,
 *   apenas_movimentacao, expurgar_offshore, navegacao,
 *   porto, uf, regiao, data_inicio, data_fim
 *
 * Retorna { data: [resp0, resp1, …], loading, erro }
 */
export function useAntaqSeries(queriesArray) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState(null);

  // chave estável para o useEffect
  const key = JSON.stringify(queriesArray);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);

    Promise.all(queriesArray.map(q => apiFetch('/api/v1/series', q)))
      .then(results => {
        if (!cancelled) { setData(results); setLoading(false); }
      })
      .catch(e => {
        if (!cancelled) { setErro(String(e)); setLoading(false); }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, erro };
}
