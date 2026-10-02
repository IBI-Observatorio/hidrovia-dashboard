# Dicionário de dados — estudo Custo do calado perdido em Santos (IBI × NORA)

Gerado por `scripts/estudo-santos-calado/90_documenta.py` em 2026-10-02T21:02:33Z. Proveniência dos brutos em `../manifest.json`.

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

## `calado_permitido_painel.parquet` (355 linhas)

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

## Tabelas CSV auxiliares

| arquivo | conteúdo |
|---|---|
| `universo_terminais.csv` | instalações do complexo incluídas, nº de atracações e critério |
| `eventos_revisao_calado.csv` | mudanças de calado por trecho: de/para (BM/PM), delta, sentido, vigência impressa, janela entre capturas; `obra_cais_simultanea` vazio (não consta da fonte) |
| `caminho_berco.csv` | berço da APS → trecho em que está situado (coluna 'Calado máximo por trecho' da APS, rowspan) → trechos percorridos desde a barra |
| `berco_antaq_aps.csv` | casamento IDBerco ANTAQ → berço(s) da APS; método `nome_normalizado` ou `manual`; berço composto (ex.: 'CS 02 + CS 01') aponta para todos |
| `checagens_t1.json` | reprodução das checagens pedidas (81.241 atracações; 13,41 t/TEU; IMO 99%) |
