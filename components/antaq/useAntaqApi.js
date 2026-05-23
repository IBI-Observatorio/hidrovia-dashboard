"use client";
import { useEffect, useState, useCallback } from 'react';

const BASE =
  process.env.NEXT_PUBLIC_ANTAQ_API_URL ||
  'https://antaq-api-production.up.railway.app';

const cache = {};

async function apiFetch(path, params, attempt = 0) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach(x => qs.append(k, String(x)));
    else qs.set(k, String(v));
  }
  const url = `${BASE}${path}?${qs.toString()}`;
  if (cache[url]) return cache[url];

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    cache[url] = data;
    return data;
  } catch (e) {
    // Retry uma vez após 1,5s (cobre cold starts do Railway)
    if (attempt === 0) {
      await new Promise(res => setTimeout(res, 1500));
      return apiFetch(path, params, 1);
    }
    throw e;
  }
}

/**
 * Faz múltiplas chamadas paralelas ao /api/v1/series e retorna um array de respostas.
 * Inclui retry automático (1×) para cobrir cold starts ou falhas transientes.
 *
 * Retorna { data: [resp0, resp1, …], loading, erro, retry }
 *   - retry(): função para forçar nova tentativa manual
 */
export function useAntaqSeries(queriesArray) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState(null);
  const [tick, setTick]       = useState(0);   // força re-execução no retry manual

  const key = JSON.stringify(queriesArray) + tick;

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

  const retry = useCallback(() => {
    // Limpa cache das URLs afetadas e força re-fetch
    const qs0 = new URLSearchParams();
    for (const [k, v] of Object.entries(queriesArray[0] || {})) {
      if (v == null) continue;
      if (Array.isArray(v)) v.forEach(x => qs0.append(k, String(x)));
      else qs0.set(k, String(v));
    }
    Object.keys(cache).forEach(k => { if (k.startsWith(BASE)) delete cache[k]; });
    setTick(t => t + 1);
  }, [queriesArray]);

  return { data, loading, erro, retry };
}
