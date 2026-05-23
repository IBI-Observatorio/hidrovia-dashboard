"use client";
import { useEffect, useState } from 'react';

const BASE = '/data/antaq/dashboard';
const cache = {};

async function fetchJson(file) {
  if (cache[file]) return cache[file];
  const r = await fetch(`${BASE}/${file}`);
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${file}`);
  const data = await r.json();
  cache[file] = data;
  return data;
}

/**
 * Carrega os JSONs do dashboard de médias móveis.
 * files: array de nomes de arquivo (sem caminho), ex. ['series_mensais.json', 'forecast.json']
 * Retorna { data: { series_mensais, forecast, ... }, loading, erro }
 */
export function useDashboardData(files) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);
    Promise.all(files.map(f => fetchJson(f).then(d => [f.replace('.json',''), d])))
      .then(pairs => {
        if (!cancelled) {
          setData(Object.fromEntries(pairs));
          setLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) { setErro(String(e)); setLoading(false); }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.join(',')]);

  return { data, loading, erro };
}
