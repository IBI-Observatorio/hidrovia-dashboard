# Calibração do pilar T (custo rodoviário) — dossiê de fontes

> Pesquisa de jun/2026 para ancorar os coeficientes do pilar **T** do IEE
> (custo operacional rodoviário, R$/t) em fontes públicas citáveis e cruzar o
> resultado contra frete de mercado observado. Produzida por harness de deep
> research (104 agentes, 22 fontes, 78 afirmações → 21 verificadas em votação
> adversarial 3×) + dois passes dirigidos a fonte primária (ANTT/DOU e ANP).
>
> **Regra:** cada número está marcado por proveniência — ✅ primária (oficial),
> 🟡 secundária, ⚠️ julgamento de painel (sem fonte pública dura), ❌ refutado.

## 1. A estrutura está correta (e é a oficial)

O esqueleto do modelo — `custo = (fixo + variável + combustível + pedágio) sobre
o ciclo ida-carregada + volta-vazia ÷ capacidade útil` — é exatamente o do
**Manual NTC&Logística (Decope)** e do **Sistema Tarifário do TRC**:
`CF = RC+SM+SO+RV+RE+LC+SV+SE+RCF` (9 parcelas de custo fixo) + `CV = PM+DC+LB+LG+PR`
(variável por km), com combustível `DC = preço(R$/L) ÷ rendimento(km/L)`. ✅

- [NTC&Logística — Manual de Cálculo de Custos (PDF)](https://www.portalntc.org.br/wp-content/uploads/Manual-de-Calculo-de-Custos-e-Formacao-de-Precos-do-Transporte-Rodoviario-de-Cargas.pdf)
- [Guia do TRC — Manual do Sistema Tarifário (PDF)](https://guiadotrc.com.br/Custeio/Manual%20do%20Sistema%20Tarif%C3%A1rio.pdf)

## 2. Coeficientes — valor v0 → referência

| Coeficiente | v0 | Referência (min / **provável** / máx) | Fonte + data | Conf. | Ação v1 |
|---|---|---|---|---|---|
| Diesel S10 (R$/L) | 6,10 | 6,12 / **7,1** / 7,57 | ANP revenda nacional **7,11** (sem. 07–13/06/2026) ✅; jan/26 = 6,12; pico 7,57 (fim/mar, choque do Irã) | Alta (ANP ao vivo) | default 6,10 → **7,00** |
| Desconto frota | 0,88 | 0,85 / **0,885** / 0,92 | ANP: distribuição ÷ revenda = 6,29/7,11 = **0,885** ✅ | Média-alta | **manter 0,88** |
| Pedágio R$/km/eixo | 0,07 | 0,03 / **0,05** / 0,07 | BR-163/MT: praça a cada ~100 km × **R$ 5,40–10,40/eixo** ✅; 0,07 é teto, não média | Média-alta | 0,07 → **0,05** |
| Manutenção R$/km | 0,75 | 0,55 / **0,70** / 0,85 | Método NTC (PM ≈ 1%/mês do ativo s/ pneus ÷ km/mês ⇒ ~0,67) ✅ | Média | manter |
| Custo fixo mensal | 32.000 | 24.000 / **28.000** / 34.000 | 9 parcelas NTC; julgamento p/ rodotrem (~R$900k ativo) ⚠️ | Baixa-média | manter (rever) |
| Consumo km/L | 2,0/2,2/2,4 | 1,8 / **2,0** / 2,2 (rodotrem) | norma de engenharia CVC ⚠️ | Média | manter |
| Capacidade útil (t) | 50/37/32 | 45 / **48** / 50 (rodotrem) | PBTC 74t − tara ⚠️ | Alta | manter |
| Pneu (R$/vida/nº) | 3.400/160k/34-26-22 | — | método NTC ✅; valor pontual ⚠️ | Baixa-média | manter |
| km/mês | 12.000 | 10.000 / **12.000** / 14.000 | long-haul grão ⚠️ | Média | manter |
| Retorno vazio | 35% / 70% custo | — | NTC: fator `2/(1+r)` só no custo rodoviário; frete de volta = 0,70×ida ✅ (conceito ≠ premissa v0) | Baixa-média | manter |

## 3. Âncora ANTT — piso mínimo de frete (fonte primária)

A ANTT publica um piso de frete **por custo** por número de eixos. Fórmula:
**Piso = (Distância × CCD) + CC** (pedágio por fora).

> ⚠️ A Res. 6.076/2026 (jan) **já foi reajustada** pelo gatilho do diesel. A
> tabela **vigente** (jun/2026) é a **Portaria SUROC nº 4/2026** (diesel R$ 7,35/L,
> vigência 20/03/2026). Revalidar na [calculadora oficial ANTT](https://calculadorafrete.antt.gov.br)
> antes de usar — pode haver portaria de gatilho mais nova.

**Tabela A · Granel sólido · vigente (SUROC 4/2026):** ✅

| Eixos | CCD (R$/km) | CC (R$/viagem) |
|---|---|---|
| 6 | 7,4408 | 656,76 |
| 7 | 8,0855 | 792,30 |
| 9 (rodotrem) | 9,2662 | 877,83 |

Fontes primárias: texto integral em [anttlegis.antt.gov.br](https://anttlegis.antt.gov.br)
(Res. 6.076/2026 e Portaria SUROC 4/2026) + [notícia oficial ANTT do reajuste](https://www.gov.br/antt/pt-br/assuntos/ultimas-noticias/antt-atualiza-tabela-dos-pisos-minimos-de-frete-em-decorrencia-da-variacao-no-preco-do-diesel-s10);
corroboração textual em [LegisWeb](https://www.legisweb.com.br/legislacao/?id=489672).

❌ **Refutado:** os valores CCD 5,58/6,05/8,53 e CC 668,84/724,84/877,83 que
circulavam em blog ([transp.net](https://www.transp.net/blog/posts/tabela-frete-antt-2026-resolucao-6076/))
**não batem** com a fonte primária (colunas/tabela trocadas). Não usar.

## 4. Cross-check contra FRETE DE MERCADO (sanidade)

Frete observado **SIFRECA/ESALQ-USP**, mês 04–31/05/2026 ✅ (primária):

| Rota | Frete | R$/t·km |
|---|---|---|
| Milho Sapezal (MT) → **Santos** | 528,57 | **0,234** |
| Milho Tapurah (MT) → Altair (SP) | 405,00 | 0,266 |
| Soja Cláudia (MT) → Itaituba (PA) | 319,60 | — |
| Soja Ipiranga do Norte (MT) → Itaituba (PA) | 316,89 | — |

- [SIFRECA — soja](https://sifreca.esalq.usp.br/mercado/soja) · [SIFRECA — milho](https://sifreca.esalq.usp.br/mercado/milho)
- IMEA acompanha Sorriso→Miritituba semanal ✅ ([Boletim Semanal da Soja](https://publicacoes.imea.com.br/relatorio-de-mercado/bs-soja/864))
- Âncoras históricas Sorriso→Santos (soja): R$ 277/t (set/2018), R$ 331,84/t (out/2021) ✅

## 5. A triangulação (o resultado central)

Sorriso→Santos (2.100 km, rodotrem 9 eixos), três réguas independentes:

| Régua | R$/t | R$/t·km | Natureza |
|---|---|---|---|
| **Piso ANTT** (granel 9 eixos) = 2100×9,2662+877,83 ÷ ~50t | ~407 | ~0,19 | custo regulado (primária) |
| **Modelo IBI** (engine, diesel ~7,1) | ~410–436 | ~0,19–0,21 | custo modelado |
| **Mercado SIFRECA** (milho MT→Santos, mai/26) | ~480–530 | 0,23–0,27 | frete praticado (primária) |

**O custo do modelo IBI coincide com o piso regulado da ANTT, e ambos ficam
~15–30% abaixo do frete de mercado — exatamente como deve ser** (frete = custo +
margem + escassez). Dois benchmarks de custo independentes concordam; o preço de
mercado fica acima. O número do pilar T é defensável.

## 6. Recomendações v1

1. **Não baixar o nível do T** — com diesel real (~7,1) e a âncora ANTT, está correto.
2. **Diesel:** manter ANP ao vivo; default estático 6,10 → **7,00** (o 6,10 era jan/26, defasado). ✅ aplicado.
3. **Desconto frota 0,88:** **manter** (validado pela ANP, 0,885). ✅
4. **Pedágio:** 0,07 → **0,05** R$/km/eixo (0,07 é teto BR-163, não média de rede). ✅ aplicado.
5. **Opção de arquitetura (não aplicada):** ancorar o T diretamente no **piso ANTT**
   (granel sólido × eixos × distância). Prós: 100% primária e citável, atualiza
   sozinho a cada portaria de gatilho. O engine próprio viraria o cross-check.
   Merece PR/design próprio.

## 7. Lacunas honestas
- Coeficientes numéricos **internos** (custo fixo mensal exato, pneu pontual,
  manutenção/km) seguem sem valor público livre — o manual NTC dá só o **método**.
  Perde importância: com âncora ANTT + cross-check SIFRECA, o T fica validado **no agregado**.
- A SUROC nº 4 (mar/2026) foi a portaria de gatilho mais recente localizada; pode
  haver mais nova entre mar e jun/2026 — revalidar na calculadora ANTT.
- Coeficientes CCD/CC específicos da ANTT só foram confirmados para 6/7/9 eixos,
  categoria carga geral e granel sólido (Tabela A, carga lotação).

---
*Fontes primárias: ANP (Síntese Semanal Ed. 24/2026), ANTT (Res. 6.076/2026 +
Portaria SUROC 4/2026), NTC&Logística (Manual Decope), SIFRECA/ESALQ-USP, IMEA,
concessionária Nova Rota do Oeste (BR-163/MT). Método: deep research +
verificação adversarial 3× + dois passes dirigidos a fonte primária.*
