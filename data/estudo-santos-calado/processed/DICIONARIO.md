# Dicionário de dados — estudo Custo do calado perdido em Santos (IBI × NORA)

Gerado por `scripts/estudo-santos-calado/90_documenta.py` em 2026-10-03T00:12:29Z. Proveniência dos brutos em `../manifest.json`.

## `escalas_santos.parquet` (96,908 linhas)

Fonte: ANTAQ Estatístico Aquaviário (parquet local). 1 linha por atracação no complexo de Santos (Complexo Portuário = 'Santos').

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `id_atracacao` | int | - | IDAtracacao da ANTAQ (chave) |
| `imo` | str(7) | - | Nº do IMO com zeros à esquerda; nulo se ausente ou <= 0 |
| `imo_valido` | bool | - | dígito verificador do IMO confere |
| `instalacao / tipo_instalacao / cdtup` | str | - | Porto Atracação, Tipo da Autoridade Portuária, CDTUP |
| `id_berco / berco / terminal / apelido_instalacao / municipio` | str | - | campos da ANTAQ sem alteração |
| `data_chegada ... data_desatracacao` | timestamp | hora local | datas da ANTAQ (chegada, atracação, início/fim de operação, desatracação) |
| `ano_antaq / mes_antaq` | int/str | - | ano/mês de referência da ANTAQ (= desatracação) |
| `tipo_operacao_atracacao / tipo_navegacao_atracacao` | str | - | campos da ANTAQ |
| `n_linhas_carga` | int | - | nº de linhas na tabela Carga |
| `t_emb_total / t_desemb_total` | float | t | soma de VLPesoCargaBruta por Sentido |
| `t_sentido_nao_informado` | float | t | linhas com Sentido 'Não Informado' (sobretudo Safamento) |
| `t_{emb,desemb}_{granel_solido,granel_liquido,carga_geral,conteiner_bruto}` | float | t | por Natureza da Carga; contêiner = peso bruto com tara |
| `t_{emb,desemb}_longo_curso` | float | t | Tipo Navegação = Longo Curso |
| `t_baldeacao` | float | t | Tipo Operação da Carga contém 'Baldeação' (ambos os sentidos) |
| `teu_{cheio,vazio}_{emb,desemb}` | float | TEU | TEU por ConteinerEstado e Sentido |
| `t_bruta_cheio_{emb,desemb}` | float | t | peso bruto (com tara) dos contêineres cheios |
| `t_por_teu_cheio_{emb,desemb}` | float | t/TEU | t_bruta_cheio / teu_cheio; nulo se teu_cheio = 0 |
| `t_emb_{soja_1201,milho_1005,farelo_2304,acucar_1701}` | float | t | granel sólido embarcado por SH4 (CDMercadoria) |
| `sh4_principal_{emb,desemb}` | str | - | SH4 de maior peso no sentido |
| `h_espera_atracacao ... h_estadia` | float | h | TemposAtracacao (vírgula decimal convertida) |

## `escalas_santos_carga.parquet` (1,759,872 linhas)

Fonte: ANTAQ Estatístico Aquaviário (parquet local). atracação × sentido × natureza × operação × navegação × estado/tamanho do contêiner × SH4 × origem × destino.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `id_atracacao` | int | - | chave para escalas_santos |
| `sentido, natureza, tipo_operacao_carga, tipo_navegacao_carga` | str | - | campos da Carga |
| `conteiner_estado, conteiner_tamanho` | str | - | Cheio/Vazio; 20/40 |
| `sh2, sh4` | str | - | CDMercadoria (SH4) e seus 2 primeiros dígitos |
| `grupo_mercadoria_antaq` | str | - | cadastro Mercadoria da ANTAQ via SH2 |
| `origem, destino` | str | - | códigos de porto de origem/destino da ANTAQ (rota) |
| `n_linhas, t_bruta, teu, qt` | int/float | -, t, TEU, un | somas das linhas agrupadas |

## `escalas_santos_conteiner_sh4.parquet` (6,101,032 linhas)

Fonte: ANTAQ Estatístico Aquaviário (parquet local). conteúdo dos contêineres (CargaConteinerizada) por atracação × sentido × SH4.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `id_atracacao, sentido` | int, str | - | chaves |
| `sh4_conteudo` | str | - | CDMercadoriaConteinerizada |
| `t_liquida_conteudo` | float | t | VLPesoCargaConteinerizada (peso da mercadoria, sem tara) |

## `escalas_brasil_mesmos_imo.parquet` (401,551 linhas)

Fonte: ANTAQ Estatístico Aquaviário (parquet local). todas as atracações no Brasil dos IMOs vistos em Santos (topping-off, mesmo navio em vários portos).

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `id_atracacao, imo, instalacao, complexo, tipo_instalacao, cdtup, id_berco, berco, uf` | - | - | campos da ANTAQ |
| `data_chegada, data_atracacao, data_desatracacao` | timestamp | - | datas da ANTAQ |
| `em_santos` | bool | - | Complexo Portuário = 'Santos' |
| `t_emb_total, t_desemb_total, t_emb_granel_solido, t_emb_longo_curso` | float | t | como em escalas_santos |
| `teu_cheio_emb/desemb, t_bruta_cheio_emb` | float | TEU, t | como em escalas_santos |
| `seq_imo` | int | - | ordem da atracação na história do IMO (por data de atracação) |

## `calado_permitido_painel.parquet` (332 linhas)

Fonte: APS — tabela de calados (página atual + Wayback). item (trecho do canal, berço ou regra especial) × período de valores constantes.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `tipo` | str | - | trecho | berco | berco_regra_especial |
| `item` | str | - | trecho canônico (I, II, III, IV, IV-B, III+IV) ou berço como impresso pela APS |
| `descricao` | str | - | texto impresso do item na última captura do período |
| `calado_bm` | float | m | calado máximo na baixa-mar / Zero DHN, impresso |
| `calado_pm` | float | m | calado máximo na preamar (maré ≥ 1,00 m), impresso |
| `calado_pm_fonte` | str | - | impresso_tabela_canal | impresso_coluna_trecho_tabela_bercos |
| `calado_pm_regra` | float | m | só formato B: Zero DHN + 1,0 m pela regra impressa na mesma página; NÃO é valor impresso |
| `calado_unico_impresso` | float | m | quando a APS imprime um só valor (formatos A e B; canal em 2018–2021) |
| `data_vigencia_impressa` | date | - | só quando o texto diz 'entrou em vigor no dia' |
| `carta_vigencia, data_carta` | str, date | - | carta da Autoridade Portuária citada na frase de vigência |
| `documento_homologacao, data_homologacao` | str, date | - | coluna Homologação (formato C recente) |
| `levantamento` | str | - | data/mês do levantamento hidrográfico impresso (não é vigência) |
| `revisoes, data_revisao_impressa_min` | str, date | - | nº e data impressos da revisão da tabela |
| `primeira_captura, ultima_captura` | str AAAAMMDDhhmmss | - | datas das capturas (Wayback/própria) — NÃO são vigência |
| `ultima_captura_periodo_anterior, primeira_captura_periodo_seguinte` | str | - | janela em que a mudança ocorreu |
| `n_capturas, formato, arquivos` | - | - | proveniência |

## `comex_export_uf_urf_sh4.parquet` (84,976 linhas)

Fonte: Comex Stat (MDIC), API /general. exportação mensal por UF de origem × URF × via × SH4, 2010 → ago/2026.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `produto, sh4` | str | - | soja 1201, milho 1005, farelo_soja 2304, acucar 1701, total_todas_mercadorias (sem filtro de SH4; sh4 nulo) |
| `ano, mes` | int | - | período Comex Stat |
| `uf_origem` | str | - | UF do produto declarada (distorções conhecidas; conferir contra produção — TR §5.3) |
| `urf, urf_codigo` | str | - | URF de embarque |
| `via` | str | - | MARITIMA ou FLUVIAL (filtro vias 01 e 02) |
| `fob_usd, kg` | float | US$, kg | metricFOB, metricKG |
| `porto, grupo` | str | - | via mapa_urf_porto.csv; nulo = URF não portuária ou fora do recorte |

## `gtr_frete_maritimo_soja_brasil.parquet` (744 linhas)

Fonte: USDA AMS GTR, Socrata j6ns-hzra. frete marítimo de soja por porto brasileiro → Alemanha/China, trimestral.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `quarter_ending_date, year, quarter, year_quarter` | str | - | trimestre |
| `port, destination` | str | - | porto de origem e destino |
| `rate` | str→num | US$/t | frete |

## `gtr_custo_transporte_soja_brasil_china.parquet` (908 linhas)

Fonte: USDA AMS GTR, Socrata j7xv-dz9h (tabela de origem da visualização xtb3-iudz). custo de transporte e landed cost por rota, trimestral.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `port` | str | - | rota origem–porto (ex.: North MT - Santos) |
| `destination` | str | - | destino |
| `truck, rail, barge, ocean, total_transportation_costs, farm_value, landed_cost` | str→num | US$/t | componentes do custo |

## `conab_levantamentos_graos.parquet` (54,812 linhas)

Fonte: CONAB, LevantamentoGraos.txt. estimativas de cada levantamento mensal por UF × produto × safra (2017 → 2025/26). Não é produção mensal.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `ano_agricola, safra, uf, produto, id_levantamento, dsc_levantamento` | str | - | campos da CONAB |
| `area_plantada_mil_ha, producao_mil_t, produtividade_mil_ha_mil_t` | float | mil ha, mil t | como publicado |

## `conab_serie_historica_graos.parquet` (28,447 linhas)

Fonte: CONAB, SerieHistoricaGraos.txt. série histórica (1976 → 2025/26), último levantamento de cada safra, UF × produto.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `ano_agricola, dsc_safra_previsao, uf, produto` | str | - | campos da CONAB |
| `area_plantada_mil_ha, producao_mil_t, produtividade_mil_ha_mil_t` | str | mil ha, mil t | como publicado (texto) |

## `precos_internacionais_mensal.parquet` (830 linhas)

Fonte: FRED / FMI Primary Commodity Prices. preço mensal US$/t.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `serie` | str | - | PSOYBUSDM (soja: futuro de Chicago, 1º vencimento) | PMAIZMTUSDM (milho: FOB Golfo, NÃO é CBOT) |
| `data, usd_t` | date, float | US$/t | como publicado |

## `calado_concorrentes_painel.parquet` (219 linhas)

Fonte: páginas/documentos de calado das autoridades portuárias + Wayback. valor de calado impresso e contexto, por porto × captura (extração automática, revisado = False).

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `porto, autoridade, url, captura_ts, tipo_captura, arquivo` | str | - | proveniência; captura_ts não é vigência |
| `calado_m` | float | m | número 'NN,NN m' até 160 caracteres após 'calado' |
| `contexto` | str | - | texto em volta do valor, para identificar trecho/berço |
| `datas_vigencia_impressas` | str | - | datas após 'vigência/em vigor/a partir de' na mesma captura |
| `regra_extracao` | str | - | generica | canal_paranagua |
| `revisado, classe, local, nota_revisao` | bool, str | - | revisão manual via data/estudo-santos-calado/revisao_calado_concorrentes.csv; classe = canal_acesso | canal_interno | canal_secundario | porto_operacional | fundeio | manobra | berco_terminal | outro |

## `eventos_revisao_calado.parquet` (24 linhas)

Fonte: APS — tabela de calados (página atual + Wayback). mudanças de calado por trecho do canal entre períodos consecutivos.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `item, descricao` | str | - | trecho canônico e descrição impressa |
| `de_bm, de_pm, para_bm, para_pm` | float | m | valores impressos antes/depois |
| `delta_m` | float | m | para − de no mesmo referencial; nulo na troca preamar→Zero DHN |
| `sentido` | str | - | aumento | redução | só PM | mudança de referencial (não comparável) |
| `data_vigencia_impressa, vigencia_lida_na_captura, carta_vigencia` | date, str | - | vigência só quando impressa; pode ter sido lida em captura posterior com os mesmos valores |
| `documento_homologacao` | str | - | coluna Homologação (formato recente) |
| `janela_inicio_captura, janela_fim_captura` | str | - | última captura com o valor antigo e primeira com o novo |
| `obra_cais_simultanea, causa_impressa` | - | - | vazios: não constam da fonte |

## `caminho_berco.parquet` (65 linhas)

Fonte: APS — tabela de calados (página atual + Wayback) + NPCP-SP Anexo 1-B. berço da APS ou terminal autorizado → trecho em que está situado → trechos percorridos desde a barra.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `berco_aps / instalacao` | str | - | berço como impresso pela APS; para terminais autorizados, a instalação da ANTAQ |
| `trecho_impresso, trecho_situado` | str | - | rótulo da coluna 'Calado máximo por trecho' (rowspan) e trecho canônico resolvido pelos valores |
| `trechos_percorridos` | str | - | trechos de I até o trecho situado (ordem das descrições impressas) |
| `trecho_adicional_fora_tabela_aps` | str | - | 'Canal de Piaçaguera' para TIPLAM/TMPC (calado por Portaria CPSP não coletada) |
| `metodo` | str | - | impresso_tabela_aps | inferido_por_endereco_npcp (A CONFERIR) | npcp_canal_piacaguera |
| `regra` | str | - | fonte e regra de atribuição |

## `berco_antaq_aps.parquet` (97 linhas)

Fonte: ANTAQ Estatístico Aquaviário (parquet local) × APS — tabela de calados (página atual + Wayback). casamento de cada IDBerco da ANTAQ com o(s) berço(s) da APS ou com o caminho do terminal autorizado.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `instalacao, id_berco, berco, terminal, n_atracacoes, ano_min, ano_max` | - | - | da ANTAQ |
| `berco_aps` | str | - | berço(s) da APS separados por ';' (berço composto aponta para todos) |
| `instalacao_caminho` | str | - | terminal autorizado cujo caminho está em caminho_berco (inclui TUPs do cadastro antigo da ANTAQ) |
| `metodo` | str | - | nome_normalizado | manual | tup_cadastro_antigo | terminal_autorizado |
| `observacao` | str | - | motivo quando não casado |

## `aps_limites_dwt.parquet` (84 linhas)

Fonte: APS — tabela de calados (página atual + Wayback). tabela de calado mínimo a vante, trim máximo a ré e imersão mínima do propulsor por faixa de DWT, por captura.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `porte, calado_min_vante, trim_max_re, imersao_min_propulsor` | str | - | como impresso |
| `arquivo, captura_ts` | str | - | proveniência |

## `escalas_calado_aps.parquet` (321 linhas)

Fonte: APS — Navios Esperados · Carga (coleta própria diária). 1 linha por DUV, versão mais recente do arquivo acumulado.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `duv, imo, navio, bandeira, secao, terminal` | str | - | como na lista da APS (IMO normalizado a 7 dígitos) |
| `comprimento_m, calado_m, calado_primeiro_m` | float | m | coluna 'Cal/Draft' (significado não documentado pela APS); último e primeiro valor vistos |
| `chegada, visto_primeiro, visto_ultimo, snapshot_data` | date | - | datas da lista e da coleta |
| `operacoes, mercadorias, peso_t` | str, float | -, t | como na lista |

## `npcp_regras.parquet` (110 linhas)

Fonte: Capitania dos Portos de SP — NPCP-SP. passagens das edições 2016 e 3ª Rev. 2026 por tema.

| coluna | tipo | unidade | regra de construção |
|---|---|---|---|
| `edicao, pagina_pdf` | str, int | - | edição e página do PDF |
| `tema` | str | - | calado_maximo | folga_quilha | mare | cruzamento_ultrapassagem | dimensoes | portaria_especifica | piacaguera |
| `trecho` | str | - | texto em volta da palavra-chave |

## Arquivos auxiliares (CSV/JSON/MD)

| arquivo | conteúdo |
|---|---|
| `universo_terminais.csv` | instalações do complexo incluídas, nº de atracações e critério |
| `casamento_lineup_antaq.json` | T3: taxa de casamento da lista de esperados da APS com a T1 |
| `imos_santos.csv` | T4: IMOs únicos de Santos, nº de escalas, perfil de carga ANTAQ (não é tipo de navio), primeiro/último ano |
| `amostra_validacao_equasis.csv` | T4: 150 IMOs para consulta MANUAL no Equasis (colunas `*_equasis` vazias para preencher) |
| `parametros_ned.json` | T4: regressões da Figure H-8 do NED Manual (a, b, R², erro-padrão) |
| `mapa_urf_porto.csv` | T5: URF → porto/grupo (regex sobre o nome; aeroportos excluídos) |
| `custo_terrestre_referencias.json` | T7: onde estão o piso ANTT vigente e o modelo de custo rodoviário do IBI; lacuna da série histórica |
| `calado_concorrentes_fontes.csv` | T6: URLs consultadas, capturas no CDX e baixadas |
| `../revisao_calado_concorrentes.csv` | T6: regras da revisão manual (porto, valor, trecho do contexto, classe, local, nota) |
| `chm_mares_fontes.csv` | T8: tábuas de maré de Santos obtidas via Wayback, com completude |
| `RASCUNHO_pedido_APS.md` | T9: pedido à APS — NÃO enviado |
| `checagens_t1.json` | reprodução das checagens pedidas (81.241 atracações; 13,41 t/TEU; IMO 99%) |
