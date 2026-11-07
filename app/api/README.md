# API pública — Relógio & Livro-Razão

Rotas de **leitura, sem autenticação**, com **CORS liberado** e **cache curto**
(`s-maxage=300`, SWR). Todo número deriva do registry (`lib/relogio.ts` e
`lib/livro-razao/registry.ts`) — nada é hardcoded, e nenhuma resposta inventa
valor econômico. Fichas `em_validacao` nunca expõem número.

Cada resposta traz um bloco de proveniência (fonte + tipo; e, no nível da ficha,
`orgao`/`url` estruturados quando existem).

## `GET /api/relogio`

Soma nacional viva do custo evitável.

```json
{
  "taxaPorSegundo": 228.1,
  "equivalenteDiario": 19710000,
  "decomposicao": [
    {
      "modulo": "pavimento",
      "nome": "Pavimento rodoviário",
      "rota": "/pavimento",
      "taxaPorSegundo": 228.1,
      "participacao": 100,
      "fonte": "…",
      "metodologia": "…",
      "tipoProveniencia": "estimativa-ibi"
    }
  ],
  "fontes": [{ "modulo": "pavimento", "fonte": "…", "tipo": "estimativa-ibi" }],
  "atualizadoEm": "2026-07-02T12:00:00.000Z"
}
```

## `GET /api/livro-razao`

Índice das fichas. `total` = nº de fichas no registry; `ativas` = fichas com dado
validado ponta a ponta; `multiploUrgencia` é derivado (`null` em `em_validacao`).

```json
{
  "ativas": 0,
  "total": 15,
  "fichas": [
    { "slug": "ferrograo", "nome": "Ferrogrão (EF-170)", "modal": "ferrovia", "status": "em_validacao", "multiploUrgencia": null }
  ],
  "proveniencia": { "fonte": "…", "metodologia": "…", "tipo": "estimativa-ibi" },
  "atualizadoEm": "2026-07-02T12:00:00.000Z"
}
```

## `GET /api/livro-razao/[slug]`

Ficha completa (só campos públicos). Ficha `ativa` traz `capex`,
`custoInacaoDiario` (piso/teto/memória) e os derivados `taxaPorSegundo`,
`valorAnualPiso`, `multiploUrgencia`. Ficha `em_validacao` traz esses campos como
`null`. Slug inexistente → **404**.

```json
{
  "slug": "ferrograo",
  "nome": "Ferrogrão (EF-170)",
  "modal": "ferrovia",
  "uf": ["MT", "PA"],
  "status": "em_validacao",
  "contexto": "…",
  "fontes": [{ "titulo": "…", "orgao": "…", "ano": 2020, "url": null }],
  "capex": null,
  "custoInacaoDiario": null,
  "multiploUrgencia": null,
  "taxaPorSegundo": null,
  "valorAnualPiso": null,
  "atualizadoEm": "2026-07-02T12:00:00.000Z"
}
```

## Notas

- Métodos: `GET` e `OPTIONS` (preflight). Outros → `405`.
- Sem chave de API, sem escrita. Para os dados brutos, ver `lib/relogio.ts` e
  `lib/livro-razao/`.
