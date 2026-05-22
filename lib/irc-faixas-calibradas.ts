// AUTO-GERADO por scripts/otimiza-faixas-irc.mjs em 2026-05-22T14:11:48.153Z
// GIT: b77f6a4 (dirty)
//
// Faixas otimizadas via Youden J multi-classe contra severidade externa (n=112).
// Pesos v3.5 usados na otimização. Não mais "coerência visual" — agora têm
// fundamentação estatística (maximiza sens+esp na separação por severidade).

export const FAIXAS_IRC_CALIBRADAS = {
  verde_amarelo:    21,
  amarelo_laranja:  25,
  laranja_vermelho: 25,
  // Métricas de qualidade dos limiares (Youden J = sens+esp-1, max=1)
  youden_j: {
    verde_amarelo:    0.1856,
    amarelo_laranja:  0.1493,
    laranja_vermelho: 0.2381,
  },
  metodologia:  "Youden J otimizado em dataset expandido (n=112) contra severidade externa",
  n_eventos:    112,
  gerado_em:    "2026-05-22T14:11:48.154Z",
  git_sha:      "b77f6a4f724bb4a3f081fe1d832a53980ef2791f",
  git_dirty:    true,
} as const;
