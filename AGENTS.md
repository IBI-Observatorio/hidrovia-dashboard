<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Dados são JSONs estáticos gerados na mão

As páginas leem JSONs em `public/data/` (não chamam API em request). Cada JSON é
gerado por um script rodado manualmente. **Antes de mexer em dados de um dashboard
ou achar que um número está "errado", leia `docs/RUNBOOK-DADOS.md`** — mapeia qual
script gera qual JSON, a fonte, e a cadência. Ao criar/renomear um gerador,
atualize esse runbook.
<!-- END:nextjs-agent-rules -->
