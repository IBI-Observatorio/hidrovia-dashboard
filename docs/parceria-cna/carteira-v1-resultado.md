# Carteira de Obras e Medidas Prioritárias: resultado v1 (27/09/2026)

> Rodada sob o pré-registro v1 congelado (`carteira-criterios-preregistro.md`, SHA-256 `28ec73f0…`). Nenhuma regra foi mudada depois de ver o resultado.
> Script e saídas: `carteira-v1/` (`roda_v1.py`, `resultado_v1.json`, `colunaB_v1.json`). Dados de apoio: `carteira-capacidade-maturidade.md`, testes F3, F6, F10, F11, F12 e A15.
> **Não publicar.** É uma rodada interna de validação do método.

## Resultado principal

**Só 2 das 12 obras têm dado suficiente para entrar no ranking.** As outras 10 vão para a lista **"a instruir"**, pela regra de pelo menos 60% do peso coberto. Isso não é defeito do método: é o retrato do dado público disponível hoje.

### Coluna A: obras

| Posição | Obra | Nota (0–1) | Cobertura do peso | Pesos iguais | Sem A6 |
|---|---|---|---|---|---|
| 1 | **Ferrogrão** | 0,71 | 88% | 1 | 1 |
| 2 | **Hidrovia do Madeira** | 0,38 | 65% | 2 | 2 |
| a instruir | Hidrovia do Paraguai | — | 55% | a instruir | 3 |
| a instruir | BR-163 / Miritituba | — | 38% | — | — |
| a instruir | EF-118 | — | 33% | — | — |
| a instruir | FICO | — | 33% | — | — |
| a instruir | FIOL 2-3 | — | 33% | — | — |
| a instruir | Pedral do Lourenço | — | 30% | — | — |
| a instruir | Canal de Paranaguá | — | 28% | — | — |
| a instruir | Malha Sul | — | 28% | — | — |
| a instruir | Transnordestina | — | 28% | — | — |
| a instruir | BR-319 | — | 0% | — | — |

- **Sensibilidade:** o top-2 não muda entre as variantes (pesos iguais; sem A6). Pela regra, a ordem numérica é permitida.
- Com 2 obras ranqueadas, a ordem diz pouco. **O produto real desta rodada é a lista "a instruir", com o que falta em cada obra.**
- **Coincidência de variantes:** como A6 está vazio para todas as obras, a variante "sem A6" só difere da base no denominador da cobertura. É por isso que o Paraguai passa (55% → 65%) apenas nela.

### Valores por critério

| Obra | A1 carga projetada × parcela agro (Mt) | A2 volume exposto (Mt) | A3 limitado por capacidade | A4 criticidade (R$ bi/ano) | A5 risco hídrico (anos) | A6 custo de inação |
|---|---|---|---|---|---|---|
| Ferrogrão | 23,41 (2020; agro não informado) | 15,33 (Tapajós) | sim | ≥ 1,6 | n/a | sem dado |
| Hidrovia do Madeira | 10,41 (13 Mt × 80,1% agro) | 11,08 | não testado | sem dado | 2 (2023, 2024) | sem dado |
| Hidrovia do Paraguai | 9,00 (agro não informado) | 0,26 | não testado | sem dado | sem dado (limiar não definido) | sem dado |
| BR-163 / Miritituba | sem dado (só tráfego em eixos) | 15,33 | sim | ≥ 1,6 | n/a | sem dado |
| EF-118 | 40,00 (longo prazo; agro indireto) | sem dado (corredor não existe) | não testado | sem dado | n/a | sem dado |
| FICO | 12,48 (13 Mt × 96% agro) | sem dado | não testado | sem dado | n/a | sem dado |
| FIOL 2-3 | 4,00 (grãos de Barreiras, 2028) | sem dado | não testado | sem dado | n/a | sem dado |
| Pedral do Lourenço | 20,00 (capacidade estimada em 2016) | sem dado | não testado | sem dado | sem dado | sem dado |
| Canal de Paranaguá | sem dado (só calado) | 13,54 | não testado | sem dado | n/a | sem dado |
| Malha Sul | sem dado (projeção só na imprensa) | 26,29 | não testado | sem dado | n/a | sem dado |
| Transnordestina | sem dado | 0,00 (nenhum CIOT de grão para Pecém em 2025) | não testado | sem dado | n/a | sem dado |
| BR-319 | sem dado | sem dado | não testado | sem dado | n/a | sem dado |

**Regras de aplicação usadas** (mecânicas, dentro das definições congeladas; estão no cabeçalho do script):
- **A1:** valor do ano de início de operação, ou o mais próximo dele que houver em fonte oficial.
  - Malha Sul sai como "sem dado": o número oficial encontrado é da operação de 2019, não é projeção, e a projeção da nova concessão só apareceu na imprensa. Isso **corrige** o que eu tinha listado em `carteira-capacidade-maturidade.md`.
- **A2:** CIOT de grão 2025 com destino nos portos e terminais do corredor **que já existe hoje**. Obra de corredor novo (FICO, FIOL, EF-118, Pedral) fica como "sem dado".
- **A5:** só para hidrovias, e só onde o limiar já estava no pré-registro (Porto Velho, 2,3 m). Paraguai e Tocantins ficam "sem dado".
- **Normalização:** percentil pelo posto médio, calculado só entre as obras com dado.

### O que destrava a lista "a instruir"

Cada lacuna abaixo foi medida, não suposta.

1. **A6, custo de inação (peso 0,15), está vazio nas 12 obras.** Todas as fichas do Livro-Razão estão "em validação", inclusive a Ferrogrão, cujo bloco está reservado para preenchimento a partir do Radar. **É a lacuna mais barata de fechar e a que mais move a cobertura**: com A6, BR-163, EF-118, FICO e Pedral ganham 15 pontos de peso cada.
2. **A4, criticidade (peso 0,20), só existe para o Tapajós.** Os demais corredores exigem o modelo com capacidade da F11 (parceria com ANTAQ, operadores e Infra S.A.).
3. **A1 (peso 0,30) está sem número oficial** para BR-163, BR-319, Paranaguá, Malha Sul e Transnordestina. No caso da Malha Sul, o caderno de demanda da AP 11/2026 existe mas não abriu (o portal exige JavaScript). É lacuna de acesso, não de dado.
4. **A5 sem limiar definido** para Paraguai (Ladário) e Tocantins (Marabá). Definir esses limiares exige a v2 do pré-registro.

### Leitura (para uso interno)

- A Ferrogrão lidera porque é a única obra com os três principais critérios preenchidos: carga projetada, volume exposto e criticidade do corredor. A modificação por "corredor limitado por capacidade" (A3) dobra o peso da carga. Isso é coerente com o achado da F11: o Tapajós está no platô.
- A EF-118 tem a maior carga projetada (40 Mt). Sem a ponderação agro, porém, esse número é majoritariamente mineral. Se um dia ela entrar no ranking, o rótulo "agro indireto" é obrigatório.

## Coluna B: armazenagem (regra B1)

**12 microrregiões elegíveis**, com déficit ≥ 1 Mt e cobertura < 0,6. Déficit somado: **28,7 Mt**.

| Microrregião | Produção (Mt) | Silo (Mt) | Déficit (Mt) | Cobertura |
|---|---|---|---|---|
| Sudoeste de Goiás/GO | 13,3 | 7,9 | 5,4 | 0,59 |
| Norte Araguaia/MT | 8,1 | 3,0 | 5,1 | 0,37 |
| Arinos/MT | 7,0 | 2,7 | 4,3 | 0,39 |
| Entorno de Brasília/GO | 4,3 | 1,5 | 2,7 | 0,36 |
| Aripuanã/MT | 2,7 | 1,0 | 1,7 | 0,38 |
| Paragominas/PA | 2,3 | 0,7 | 1,6 | 0,30 |
| Paranatinga/MT | 3,3 | 1,7 | 1,6 | 0,52 |
| Colíder/MT | 3,1 | 1,5 | 1,5 | 0,50 |
| Alto Parnaíba Piauiense/PI | 3,5 | 1,9 | 1,5 | 0,56 |
| Tesouro/MT | 1,9 | 0,8 | 1,2 | 0,39 |
| Jalapão/TO | 1,2 | 0,2 | 1,1 | 0,15 |
| Goioerê/PR | 2,4 | 1,4 | 1,0 | 0,58 |

- **Não há ranking na coluna B:** o pré-registro v1 não definiu pesos para B1, B2 e B3. A tabela está ordenada só pelo déficit, que é a regra de entrada. Ranquear a coluna B exige a v2.
- B2 (crescimento da safra) não tem série por microrregião: o LSPA e a Conab são por UF.
- **Correção de processo:** a primeira execução deste passo zerou a capacidade de silo por erro de codificação na leitura do script (o filtro "GRANEL SÓLIDO" não casou). O erro foi detectado pelo total de capacidade (0 contra 206,6 Mt esperados) e corrigido antes deste registro.

## Coluna C: medidas regulatórias

Script: `carteira-v1/roda_colC_v1.py`. Instrumentos pesquisados com fonte e trecho, em `carteira-v1/colunaC_pesquisa.md`.

| Posição (pesos iguais) | Medida | Nota | R1 carga afetada (Mt/ano) | R2 simplicidade | R3 evidência | R4 prazo | R5 estágio |
|---|---|---|---|---|---|---|---|
| **1** (1) | **ANTT publicar o valor do frete do CIOT** | 0,75 | 304,7 (rodoviário) | 3 (ato só da ANTT; a lei já obriga o registro do valor) | 2 (ANAC publica tarifas por rota desde 2002) | 3 (julgamento: o dado já é coletado) | não iniciada |
| **2** (2) | **Pedágio free flow** | 0,69 | sem dado | 3 (Res. ANTT 6.079/2026; aditivo por contrato) | 2 (sandbox da BR-101/RJ: 99,97% de detecção) | 2 | implementada parcialmente (52 pórticos, 9 trechos) |
| 3 (4) | Peso por eixo e tolerâncias | 0,42 | 304,7 | 1 (caminho em curso: veto/lei) | 0 | 2 | em tramitação (Veto 43/2026 tranca a pauta desde 06/09; PL 2217/2025) |
| 4 (6) | DT-e | 0,42 | 304,7 | 2 (decreto + estados) | 0 | 1 | aprovada sem implementação |
| 5 (3) | Licenciamento de dragagem/derrocamento | 0,41 | 26,7 (hidroviário) | 3 (IN do Ibama) | 0 | 3 | dragagem de manutenção já dispensada por lei (15.190/2025); derrocamento não |
| 6 (5) | Ferrovias por autorização | 0,38 | 68,3 (ferroviário, ANTT/SIADE 2025) | 3 (ROF 1, Res. 6.088/2026) | 0 | 1 | 45 contratos, 1 em obra |

**Como R1 foi calculado:**
- rodoviário = produção de soja + milho 2024 (PAM) + fertilizante importado 2025 (Comex, capítulo 31);
- ferroviário = TU 2025 de soja, milho, farelo e fertilizantes (ANTT SIADE);
- hidroviário = produção exposta ao Tapajós + Madeira + Paraguai (método da A2).

**R3 conta só o que foi conferido.** Nas medidas 2 a 5 nenhum estudo ou precedente foi aberto, então R3 = 0, por definição.

**Sensibilidade:**
- A maior mudança no top-5 entre base e pesos iguais é de 2 posições. Pela regra, a ordem numérica é permitida.
- **As posições 1 e 2 são estáveis. As posições 3 a 6 estão praticamente empatadas (0,38 a 0,42) e trocam de lugar com os pesos iguais.** Na publicação, recomendo apresentá-las como um bloco.
- Informativo, não pré-registrado: se o peso por eixo fosse feito por resolução do Contran (R2 = 3), ele continuaria em 3º.

**Leitura:** as duas primeiras medidas são as de **menor custo institucional**: ato de um só órgão e precedente brasileiro. A primeira beneficia diretamente o próprio Observatório como usuário do dado. Na apresentação, isso deve ser declarado, pela salvaguarda de neutralidade.
