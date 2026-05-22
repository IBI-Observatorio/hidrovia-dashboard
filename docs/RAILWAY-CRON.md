# Cron do Briefing Semanal — Railway

## Quando

Toda quarta-feira às **09:00 (horário de Manaus, UTC-4)** = **13:00 UTC**.

A quarta-feira é o dia ideal por dois motivos:
- O SGB publica o boletim semanal toda terça → temos os dados oficiais frescos
- Dá tempo para o parser SGB ingerir o PDF antes do briefing rodar

## Como configurar

### Passo 1 — Gerar o secret

```bash
openssl rand -hex 32
```

Guarde a string gerada — vai como `CRON_SECRET` em **duas variáveis** distintas
(Web service e Cron service do Railway).

### Passo 2 — Configurar o secret no Railway

No service Web (o que serve o dashboard):

1. Abra o projeto no Railway
2. Vá no service web (o que tem domínio público)
3. **Variables** → New Variable:
   - `CRON_SECRET` = `<o hex gerado>`
4. Redeploy

### Passo 3 — Criar o Cron Service

No mesmo projeto Railway:

1. **New Service** → **Empty Service**
2. Nome: `cron-briefing-semanal`
3. **Settings** → **Cron Schedule**:
   - `0 13 * * 3` (quarta 13:00 UTC = 09:00 Manaus)
4. **Settings** → **Custom Start Command**:

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://$RAILWAY_PUBLIC_DOMAIN/api/cron/briefing"
```

5. **Variables**:
   - `CRON_SECRET` = mesmo valor do web service
   - `RAILWAY_PUBLIC_DOMAIN` = domínio público (ex: `hidrovias.up.railway.app`)
6. Deploy

### Passo 4 — Testar manualmente

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://$RAILWAY_PUBLIC_DOMAIN/api/cron/briefing"
```

Resposta esperada:

```json
{
  "ok": true,
  "mensagem": "Briefing da semana 21/2026 regenerado: \"...\"",
  "arquivo": "2026-21.json",
  "manchete": "...",
  "alerta": "..."
}
```

## Persistência

Os briefings são salvos em `data/briefings/YYYY-WW.json` (até 52 mantidos —
1 ano de histórico). No Railway, esse diretório deve apontar para um **volume
persistente** (`DATA_DIR` env var). Se não houver volume, o arquivo é perdido
no próximo deploy — mas a rota `/briefing-semanal` ainda funciona porque
regenera tudo a cada visita via `revalidate=86400`.

## Observabilidade

- O endpoint retorna JSON com `manchete` e `alerta` — útil para enviar para
  Slack/Discord via webhook depois do cron.
- Logs do cron service mostram o exit code do curl. Erros HTTP retornam não-zero.
- Sem `CRON_SECRET` configurado: o endpoint retorna 401. Segurança fail-closed.

## Por que não Vercel Cron

Vercel Cron é mais simples, mas o projeto roda no Railway (decisão do produto
— ver `MEMORY.md` "Preferências de deploy"). Railway oferece cron via service
dedicado, o que ainda é simples e funciona em produção.
