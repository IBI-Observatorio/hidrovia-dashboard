# Testes rápidos das fichas F3, F6 e F10 (26/09/2026)

Os scripts rodam a partir de um diretório de trabalho que contenha:
- `arm.txt`: cadastro de armazéns da Conab (portaldeinformacoes.conab.gov.br/downloads/arquivos/ArmazensCadastrados.txt).
- `f3/pam2024.json`: SIDRA 1612, v214, 2024, soja+milho, N6. URL: `apisidra.ibge.gov.br/values/t/1612/n6/all/v/214/p/2024/c81/2711,2713`.
- `f3/mun.json`: municípios do IBGE (servicodados.ibge.gov.br/api/v1/localidades/municipios).
- `f6/pam_valor2024.json`: igual ao `f3/pam2024.json`, mas com v215 (valor da produção).
- `bt/ciot_filtrado.csv` e `bt/comex_urf_uf.json`: saídas de `../backtest-ciot-pedagio/baixa.py` e `comex.py`.

Cotas: `data/portovelho_hidroweb.csv`, do próprio repositório.
Resultados: `ideias-novas.md`, seção 3.4.

## F4 (alerta de pico)
- `progresso.py`: monta `progresso_mt.json` (% colhido em MT, soja e milho 2ª, 2022–2026). Fontes:
  - zips históricos da Conab `arquivosportal.conab.gov.br/api/public/dl/<id>/progressodesafra/<ano>.zip`, com links na página "acompanhamento-das-lavouras-2020-a-2024" do portal gov.br/conab; descompactar em `z<ano>/`;
  - `data/conab/progresso-colheita.json`, do repositório.
- `backtest_f4.py`: toneladas colhidas nas últimas 4 semanas contra o frete IMEA Sorriso→Santos e o basis da soja MT (`data/imea`, `data/cepea`). Resultado em `resultado_f4.json`.

## F7 (ficha municipal)
- `ficha.py`: protótipo das fichas dos 500 maiores produtores de soja + milho, gravado em `fichas_top500.json`.
- Insumos: os mesmos de F3 e F6, mais `anp.xlsx`, o levantamento semanal de preços da ANP por posto (relatório "município", semana de 13 a 19/09/2026).

## F9 (custo porteira-ao-porão)
- `custo_rotas.py`: compara o frete IMEA Sorriso→Santos (`data/imea`) com o custo rodoviário do USDA e monta o custo porteira-ao-porto das rotas de Sorriso.
- Insumos:
  - `wc.json`: USDA AgTransport `wcku-8yrp`, via `agtransport.usda.gov/resource/wcku-8yrp.json?$limit=50000`;
  - `ptax.json`: BCB SGS 3698, via `api.bcb.gov.br/dados/serie/bcdata.sgs.3698/dados?formato=json&dataInicial=01/01/2015`.

## F10, 2ª rodada
- `f10b_parse_ana.py`: lê o XML de `telemetriaws1.ana.gov.br/ServiceANA.asmx/HidroSerieHistorica?codEstacao=<cod>&dataInicio=01/01/1995&dataFim=31/12/2026&tipoDados=1&nivelConsistencia=` e gera as cotas mensais. Estações: 15400000 Porto Velho e 17730000 Itaituba.
- `f10b_comex_1997_2014.py`: exportação por URF e UF de 1997 a 2014. Até 2011 a soja usa o NCM 12010090.
- `f10b_rodada2.py`: série longa, Tapajós e desvio contra perda em 2024.

## F12 (criticidade)
- `criticidade.py`: versão mínima de "fechar um arco" para o polo Norte de MT. Usa os custos por trecho do USDA (os mesmos de F9) e os volumes por rota do CIOT (os mesmos de F6). Precisa de `f9/wc.json` e `f9/ptax.json`.

## F11 (modelo de rede)
- `f11_expost.py`: participação de cada porto na exportação de MT (1997–2025) e quebra em 2020 (pavimentação da BR-163/PA).
- `f11_elasticidade.py`: sensibilidade trimestral da escolha de rota ao custo relativo (USDA, 2019–2025).
- Ambos usam as saídas de `f10b_rodada2.py` e `f9/wc.json`.

## A15 (execução orçamentária das obras do Livro-Razão)
- `a15_serie_obras_livro_razao.csv`: série 2014–2026 por obra/ação orçamentária.
  - Colunas `ini`, `atu`, `emp` e `real` (dotação inicial, dotação atualizada, empenhado, "realizado"): arquivo anual de orçamento da despesa do Portal da Transparência (download em massa, sem chave).
  - Coluna `pago_tesouro_gnd45_com_rap`: dataset "investimento-publico" do Tesouro Transparente (pago, incluindo restos a pagar; só GND 4 e 5).
- `a15_get.py`, `a15_num.py`, `a15_tt_agg.py`: scripts do levantamento. Rodam no diretório de trabalho do agente e precisam dos downloads anuais do Portal e do Tesouro.
