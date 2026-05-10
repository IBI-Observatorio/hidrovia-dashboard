# Observatório IBI — Monitor Hidrológico da Bacia do Amazonas

Dashboard de monitoramento hidrológico mantido pelo Observatório de Infraestrutura de Transporte do IBI.

## Desenvolvimento

```bash
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

## Rotas

| Rota | Descrição |
|---|---|
| `/` | Home do Observatório |
| `/monitor` | Monitor hidrológico em tempo real |
| `/caso-2024` | Estudo de caso — estiagem de 2024 |
| `/admin/upload` | Upload de boletins SEMA-AM (senha via `ADMIN_PASSWORD`) |

## Deploy

Railway — redeploy automático a cada push para `main`.

## Variáveis de ambiente

```
ADMIN_PASSWORD=   # senha do painel /admin/upload
DATA_DIR=         # caminho do volume persistente (Railway)
```
