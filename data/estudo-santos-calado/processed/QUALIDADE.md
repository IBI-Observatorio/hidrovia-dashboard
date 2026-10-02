# Relatório de qualidade — base do estudo Custo do calado perdido em Santos

Gerado em 2026-10-02T23:36:14Z por `90_documenta.py`. Só contagens; nenhuma estimativa.

## T1 — Escalas ANTAQ do complexo de Santos

- Atracações no Porto Organizado, 2010–fev/2026: **81,241** (esperado ~81 mil: confere).
- Complexo (PO + 7 terminais autorizados): 96,908.
- Peso bruto por TEU cheio, 2025: **13.41 t/TEU no complexo** (confere com 13,41); 13.56 só no Porto Organizado. O 13,41 do TR é do complexo (inclui DP World).
- IMO preenchido em 2025: 99.2% no PO; 99.2% no complexo (confere ~99%).
- IMO com dígito verificador válido (todas as escalas com IMO): 99.88%.
- Duplicatas: IDAtracacao duplicado = 0; tempos duplicados = 0; mesmo IMO + mesma data/hora de atracação + mesmo berço = 88.

### Cobertura por ano (ano de referência ANTAQ = desatracação)

| ano | atracacoes | atr_po | pct_imo | pct_imo_valido | mt_emb | mt_desemb | mteu | t_por_teu_cheio | pct_tempos | atr_sem_carga |
|---|---|---|---|---|---|---|---|---|---|---|
| 2010 | 6949 | 6512 | 100 | 99.90 | 64 | 37.80 | 2.72 | 13.81 | 98.90 | 360 |
| 2011 | 6650 | 6188 | 100 | 99.70 | 61.50 | 36.20 | 2.99 | 13.54 | 99.30 | 343 |
| 2012 | 6144 | 5666 | 100 | 99.80 | 70.20 | 30.90 | 2.96 | 13.46 | 98.20 | 311 |
| 2013 | 5985 | 5373 | 98.20 | 97.90 | 76.60 | 33.90 | 3.39 | 13.45 | 97 | 245 |
| 2014 | 5897 | 4954 | 98.90 | 98.60 | 73.70 | 33.60 | 3.57 | 13.78 | 98.80 | 243 |
| 2015 | 5962 | 4966 | 98.10 | 98.10 | 85.20 | 30.70 | 3.65 | 14.24 | 99.20 | 255 |
| 2016 | 5472 | 4667 | 99.50 | 99.30 | 79.80 | 30.70 | 3.39 | 14.68 | 98.60 | 148 |
| 2017 | 5789 | 4904 | 99.30 | 99.20 | 91.20 | 34.20 | 3.58 | 14.46 | 98.40 | 192 |
| 2018 | 5753 | 4820 | 99.50 | 99.40 | 91.60 | 36.90 | 3.84 | 14.25 | 98.10 | 193 |
| 2019 | 5580 | 4489 | 99.50 | 99.40 | 91 | 38.50 | 3.90 | 13.98 | 98.20 | 152 |
| 2020 | 5556 | 4324 | 100 | 100 | 103.40 | 38.30 | 3.90 | 14.35 | 98.30 | 83 |
| 2021 | 5438 | 4214 | 100 | 99.90 | 99.80 | 42.20 | 4.39 | 13.69 | 97.60 | 45 |
| 2022 | 5853 | 4640 | 99.90 | 99.90 | 114.40 | 41.50 | 4.45 | 13.61 | 97.20 | 72 |
| 2023 | 6082 | 4716 | 99.80 | 99.80 | 126.50 | 41.20 | 4.28 | 13.96 | 98.30 | 169 |
| 2024 | 6292 | 4960 | 99.60 | 99.60 | 126.90 | 45.40 | 4.84 | 13.83 | 98.70 | 376 |
| 2025 | 6510 | 5078 | 99.20 | 99.20 | 132.60 | 46.10 | 5.19 | 13.60 | 99.50 | 326 |
| 2026 | 996 | 770 | 97.20 | 97.20 | 17.40 | 7.50 | 0.82 | 13.41 | 99.50 | 71 |

### Inconsistências e outliers (contagem, não corrigidos)

| atracacao_antes_chegada | desatracacao_antes_atracacao | estadia_negativa | estadia_maior_60d | t_por_teu_emb_maior_35 | t_por_teu_emb_menor_2 | imo_digito_invalido |
|---|---|---|---|---|---|---|
| 0 | 0 | 0 | 2 | 9 | 4 | 111 |

Notas: 2026 cobre só jan–fev. 'Sentido Não Informado' (~5 Mt/ano) são linhas de Safamento. O peso bruto da ANTAQ inclui a tara do contêiner.

## T2 — Calado permitido (APS)

- Capturas usadas: 132 (Wayback + captura própria em 2026-10-02); 10 sem tabela de calado (páginas de 1998–2000 só com profundidades, e stubs de redirecionamento de 288 bytes).
- Períodos de trecho do canal: 57; de berço: 214.
- Eventos de revisão por trecho: 24, dos quais 17 com data de vigência impressa.
- Berços ANTAQ do Porto Organizado casados com a tabela da APS: 56/79 (95.6% das atracações do PO). Os 7 terminais autorizados (DP World, TIPLAM, TMPC, Dow, Cutrale, Base de Dutos) não constam da tabela de berços da APS: para eles só o calado dos trechos do canal, e o trecho de cada um não foi atribuído (lacuna).

### Capturas por ano e formato

| ano | pagina | formato | capturas |
|---|---|---|---|
| 1998 | calado_html_1998 | sem_tabela_de_calado | 2 |
| 1999 | calado_html_1998 | sem_tabela_de_calado | 1 |
| 2000 | authority_infra_2000 | sem_tabela_de_calado | 1 |
| 2001 | authority_infra_2000 | A | 1 |
| 2002 | authority_infra_2000 | A | 1 |
| 2003 | authority_infra_2000 | A | 1 |
| 2007 | authority_infra_2000 | A | 2 |
| 2008 | authority_infra_2000 | A | 1 |
| 2009 | calado_php_2009 | A | 2 |
| 2010 | calado_php_2009 | A | 3 |
| 2011 | calado_php_2009 | A | 7 |
| 2012 | calado_php_2009 | A | 4 |
| 2013 | calado_php_2009 | A | 1 |
| 2014 | calado_php_2009 | A | 2 |
| 2014 | calado_php_2009 | C | 2 |
| 2015 | calado_php_2009 | C | 9 |
| 2016 | calado_php_2009 | C | 12 |
| 2017 | calado_php_2009 | C | 16 |
| 2018 | calado_maximo_operacional_2018 | C | 13 |
| 2018 | calado_maximo_operacional_2018 | sem_tabela_de_calado | 2 |
| 2018 | calado_php_2009 | C | 8 |
| 2019 | calado_maximo_operacional_2018 | C | 9 |
| 2019 | calado_maximo_operacional_2018 | sem_tabela_de_calado | 1 |
| 2020 | calado_maximo_operacional_2018 | C | 5 |
| 2021 | calados_operacionais_2021 | C | 9 |
| 2022 | calados_operacionais_2021 | C | 5 |
| 2023 | calados_operacionais_2021 | C | 2 |
| 2024 | calados_operacionais_2021 | C | 2 |
| 2025 | calados_operacionais_2021 | C | 4 |
| 2026 | aps_atual | C | 1 |
| 2026 | aps_fase0 | C | 1 |
| 2026 | calados_operacionais_2021 | C | 2 |

### Períodos por trecho do canal

| item | calado_bm | calado_pm | calado_pm_regra | calado_unico_impresso | data_vigencia_impressa | primeira_captura | ultima_captura | n_capturas |
|---|---|---|---|---|---|---|---|---|
| I |  | 12.80 |  | 12.80 |  | 20070214043531 | 20070602101756 | 2 |
| I |  | 13.10 |  | 13.10 |  | 20080928214953 | 20080928214953 | 1 |
| I |  | 13.30 |  | 13.30 |  | 20091223112559 | 20140313164458 | 19 |
| I | 13.20 |  | 14.20 | 13.20 | 2014-07-03 | 20140905223439 | 20150411075504 | 5 |
| I | 13.20 |  | 14.20 | 13.20 | 2014-12-09 | 20150710045928 | 20160504214832 | 9 |
| I | 13.20 |  | 14.20 | 13.20 | 2016-06-06 | 20160620151505 | 20170209174908 | 10 |
| I | 13.20 |  |  | 13.20 | 2017-02-14 | 20170409063048 | 20170621212229 | 6 |
| I | 12.60 |  | 13.60 | 12.60 | 2017-07-07 | 20170723112612 | 20170731165057 | 2 |
| I | 13 |  | 14 | 13 | 2017-08-04 | 20170823183723 | 20170924215552 | 3 |
| I | 13.20 |  | 14.20 | 13.20 | 2017-10-20 | 20171026151943 | 20180102034016 | 5 |
| I | 13.20 |  | 14.20 | 13.20 | 2018-01-15 | 20180202164732 | 20180712092121 | 8 |
| I | 13.50 |  | 14.50 | 13.50 | 2018-07-12 | 20180715010646 | 20190822000545 | 20 |
| I | 13.50 | 14.50 |  | 13.50 |  | 20191004100011 | 20210116144927 | 7 |
| I | 13.50 | 14.50 |  |  |  | 20210302013408 | 20261002000000 | 25 |
| II |  | 12.80 |  | 12.80 |  | 20070214043531 | 20070602101756 | 2 |
| II |  | 13.10 |  | 13.10 |  | 20080928214953 | 20080928214953 | 1 |
| II |  | 13.30 |  | 13.30 |  | 20091223112559 | 20140313164458 | 19 |
| II | 13 |  | 14 | 13 | 2014-07-03 | 20140905223439 | 20150411075504 | 5 |
| II | 13.20 |  | 14.20 | 13.20 | 2014-12-09 | 20150710045928 | 20160504214832 | 9 |
| II | 13.20 |  | 14.20 | 13.20 | 2016-06-06 | 20160620151505 | 20170209174908 | 10 |
| II | 13.20 |  |  | 13.20 | 2017-02-14 | 20170409063048 | 20170621212229 | 6 |
| II | 13.20 |  | 14.20 | 13.20 | 2017-02-14 | 20170723112612 | 20170924215552 | 5 |
| II | 13.20 |  | 14.20 | 13.20 | 2017-09-28 | 20171026151943 | 20180202164732 | 6 |
| II | 13.20 |  | 14.20 | 13.20 | 2018-02-26 | 20180307151520 | 20180712092121 | 7 |
| II | 13.50 |  | 14.50 | 13.50 | 2018-07-12 | 20180715010646 | 20190822000545 | 20 |
| II | 13.50 | 14.50 |  | 13.50 |  | 20191004100011 | 20210116144927 | 7 |
| II | 13.50 | 14.50 |  |  |  | 20210302013408 | 20261002000000 | 25 |
| III | 12.70 |  | 13.70 | 12.70 | 2014-07-03 | 20140905223439 | 20150411075504 | 5 |
| III | 13.20 |  | 14.20 | 13.20 | 2014-12-09 | 20150710045928 | 20160504214832 | 9 |
| III | 12.70 |  | 13.70 | 12.70 | 2016-06-06 | 20160620151505 | 20170209174908 | 10 |
| III | 13.20 |  |  | 13.20 | 2017-03-16 | 20170409063048 | 20170621212229 | 6 |
| III | 13.20 |  | 14.20 | 13.20 | 2017-03-16 | 20170723112612 | 20170924215552 | 5 |
| III | 13.20 |  | 14.20 | 13.20 | 2017-09-28 | 20171026151943 | 20180202164732 | 6 |
| III | 13.20 |  | 14.20 | 13.20 | 2018-02-26 | 20180307151520 | 20180712092121 | 7 |
| III | 13.50 |  | 14.50 | 13.50 | 2018-07-12 | 20180715010646 | 20190822000545 | 20 |
| III | 13.50 | 14.50 |  | 13.50 |  | 20191004100011 | 20210116144927 | 7 |
| III | 13.50 | 14.50 |  |  |  | 20210302013408 | 20261002000000 | 25 |
| IV | 12.60 |  | 13.60 | 12.60 |  | 20140905223439 | 20150411075504 | 5 |
| IV | 13.20 |  | 14.20 | 13.20 | 2015-01-16 | 20150710045928 | 20160504214832 | 9 |
| IV | 12.70 |  | 13.70 | 12.70 | 2016-06-06 | 20160620151505 | 20170209174908 | 10 |
| IV | 13.20 |  |  | 13.20 | 2017-03-16 | 20170409063048 | 20170621212229 | 6 |
| IV | 13.20 |  | 14.20 | 13.20 | 2017-03-16 | 20170723112612 | 20170924215552 | 5 |
| IV | 13.20 |  | 14.20 | 13.20 | 2017-09-28 | 20171026151943 | 20180712092121 | 13 |
| IV | 13.50 |  | 14.50 | 13.50 | 2018-07-12 | 20180715010646 | 20190822000545 | 20 |
| IV | 13.50 | 14.50 |  | 13.50 | 2017-09-28 | 20191004100011 | 20201024141308 | 6 |
| IV | 13.50 | 14.50 |  | 13.50 |  | 20210116144927 | 20210116144927 | 1 |
| IV | 13.50 | 14.50 |  |  |  | 20210302013408 | 20261002000000 | 25 |
| IV-B | 11.20 |  | 12.20 | 11.20 |  | 20140905223439 | 20170209174908 | 24 |
| IV-B | 12.20 |  |  | 12.20 |  | 20170409063048 | 20170621212229 | 6 |
| IV-B | 12.20 |  | 13.20 | 12.20 |  | 20170723112612 | 20170924215552 | 5 |
| IV-B | 12.70 |  | 13.70 | 12.70 |  | 20171026151943 | 20180712092121 | 13 |
| IV-B | 12.70 |  | 13.70 | 12.70 | 2017-09-28 | 20180715010646 | 20190822000545 | 20 |
| IV-B | 12.70 | 13.70 |  | 12.70 |  | 20191004100011 | 20210116144927 | 7 |
| IV-B | 12.70 | 13.70 |  |  |  | 20210302013408 | 20250516013825 | 19 |
| IV-B | 13.20 | 14.20 |  |  |  | 20250622213429 | 20261002000000 | 6 |
| III+IV |  | 12 |  | 12 |  | 20070214043531 | 20070214043531 | 1 |
| III+IV |  | 12.20 |  | 12.20 |  | 20070602101756 | 20140313164458 | 21 |

### Ressalvas

- Formato A (até 2013): um só valor, impresso como calado na preamar com maré ≥ 1,00 m; a partir de 2014 o valor impresso é o Zero DHN (baixa-mar) com 'acréscimo de até 1,0 m na preamar'. A troca de referencial não é variação de calado — os eventos marcam isso.
- Antes de 2014 a página trata 'Torre Grande até Alamoa' como um trecho só (III+IV).
- O trecho além da Alamoa/BTP muda de descrição ao longo do tempo ('BTP até Alamoa', 'Alamoa 02 até final trecho IV', 'Terminal Alamoa até o final trecho IV' = IV-b): tratado como IV-B, mas a equivalência física não foi conferida.
- Datas de captura do Wayback nunca entram como vigência. Sem data impressa, a mudança fica numa janela entre capturas.
- Tabela de berços só existe a partir da Rev. 221 (16/07/2019, captura de out/2019); antes disso, o calado por berço não tem histórico público (lacuna).

## T3 — Calado × IMO da lista de esperados (coleta própria)

- Coleta diária rodando no GitHub Actions (workflow agro-dados): snapshots 2026-09-30, 2026-10-01, 2026-10-02.
- 321 escalas (DUV), 321 com IMO, 321 com calado; 0 com calado alterado entre snapshots.
- Casamento com a T1 por IMO + data (±3 dias): **0** — zero por construção: a ANTAQ vai até 2026-02-28 e a coleta começa em 30/09/2026. IMO já visto em Santos na T1: 81.6%.

## T4 — Cadastro de navios

- 12,798 IMOs únicos; perfil de carga (ANTAQ): granel_solido 7,370, granel_liquido 2,091, conteiner 1,627, carga_geral 1,556, sem_carga 154.
- A ANTAQ não traz tipo, DWT nem calado de projeto: **lacuna** até a consulta manual (Equasis) ou a base licenciada.
- Amostra de validação: 150 IMOs em 12 estratos (perfil × tercil de t/escala, PPS por nº de escalas, semente fixa).
- `parametros_ned.json`: conferido contra o PDF do Apêndice H baixado da USACE Digital Library (não estava em `referencias/`).

## T5 — Comex Stat

| produto | inicio | fim | linhas | mt |
|---|---|---|---|---|
| acucar | 2010 | 2026 | 6745 | 453.90 |
| farelo_soja | 2010 | 2026 | 4308 | 286.60 |
| milho | 2010 | 2026 | 6601 | 481.10 |
| soja | 2010 | 2026 | 10013 | 1162.50 |
| total_todas_mercadorias | 2010 | 2026 | 57309 | 11112.70 |

- Peso casado a um porto do mapa: 94.5% (resto: URFs de petróleo/fronteira fora do recorte).
- Conferência: soja por Santos (URF 0817800) em 2024 = 27.96 Mt (Fase 0: 27,96 Mt).
- **Lacuna**: 'total de carga em contêiner' — o Comex Stat não tem indicador de contêiner; usar ANTAQ (T1) para contêiner.
- ALF Belém despacha também Barcarena/Vila do Conde: não separável por URF.

## T6 — Calado dos concorrentes

| porto | autoridade | url | capturas_cdx | baixadas | atual_ok |
|---|---|---|---|---|---|
| Paranaguá | APPA / Portos do Paraná | www.portosdoparana.pr.gov.br/Operacional/Pagina/Calados | 17 | 18 | True |
| Rio Grande | Portos RS | www.portosrs.com.br/site/public/uploads/site/normativas/259.pdf | 0 | 1 | True |
| São Francisco do Sul | SCPar / APSFS | portosaofrancisco.com.br/caracteristicas/ | 3 | 4 | True |
| Itaqui | EMAP | www.portodoitaqui.com.br/porto-do-itaqui/infraestrutura | 0 | 1 | True |
| Itaqui | EMAP | www.portodoitaqui.com.br/_files/arquivos/manual-porto-do-itaqui.pdf | 0 | 1 | True |

- Paranaguá: extrator específico do canal (`regra_extracao = canal_paranagua`): 12,50 m (Canal da Galheta, 2019–jun/2023) → 12,80 (ago/2023) → 13,10 (mar/2025) → 13,30 (fev/2026), datas = capturas, não vigência.
- Demais portos: só documento atual/Fase 0 (Rio Grande normativa 259, S. Francisco do Sul, Itaqui) com extração genérica (número após 'calado'), não revisada. Sem histórico no Wayback para Rio Grande e Itaqui; Vila do Conde só PDF da Fase 0. Histórico com data de vigência: lacuna.

## T7 — Controles

- USDA GTR: j6ns-hzra (frete marítimo) e j7xv-dz9h (custos; `xtb3-iudz` é só uma visualização sobre essa tabela).
- CONAB: levantamentos 2017→2025/26 e série histórica 1976→2025/26 por UF; **não há produção mensal** (só estimativas por levantamento).
- Preço: soja = FMI/FRED PSOYBUSDM (futuro de Chicago); milho = PMAIZMTUSDM (FOB Golfo) — sem série CBOT de milho de fonte pública baixável (lacuna).
- ANTT: sem série histórica de pisos em dados abertos (lacuna); piso vigente e modelo IBI já documentados no repo.

## T8 — NPCP-SP e marés

- **Nenhuma das edições da NPCP-SP (2016 e 3ª Rev. 2026) fixa valor numérico de folga sob a quilha para Santos**: o calado máximo de operação é delegado à APS; o 'fator de segurança' é descrito só qualitativamente. Portarias específicas (canal de Piaçaguera, navios de 340–370 m, TRSP) não foram coletadas (lacuna).
- CHM: site atrás de desafio anti-robô (não contornado). Tábuas de Santos (previsão) só via Wayback, ver `chm_mares_fontes.csv`; duas cópias vieram truncadas (1 MiB). Sem série observada de maré (lacuna).

## Lacunas registradas (não preenchidas)

- Calado de entrada/saída por escala (nomeação APS): não público — rascunho de pedido em `RASCUNHO_pedido_APS.md` (T9).
- Histórico de calado por berço antes da Rev. 221 (jul/2019) e vigência das revisões sem frase de vigência: pedir à APS.
- Obra de cais simultânea a cada revisão: não consta da tabela da APS.
- DWT, calado de projeto, TEU nominal por IMO: base licenciada (S&P/Clarksons) ou Equasis manual.
- Serviços de contêiner e navios por rota (estudo 5.2): Alphaliner (licenciado).
- Calado medido nas manobras: Praticagem de São Paulo (via NORA).
