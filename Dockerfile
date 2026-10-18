# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Lidos em runtime via process.cwd() — copiados explicitamente (o trace pode não pegar).
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/data ./data
COPY --from=build --chown=node:node /app/content ./content
# pdf-parse (pdfjs) carrega @napi-rs/canvas via require dinâmico p/ ter DOMMatrix;
# o trace do standalone não pega o binário nativo da plataforma -> sem isso o
# parser de PDF (SGB/SEMA) quebra com "DOMMatrix is not defined".
COPY --from=build --chown=node:node /app/node_modules/@napi-rs ./node_modules/@napi-rs
USER node
EXPOSE 3000
CMD ["node", "server.js"]
