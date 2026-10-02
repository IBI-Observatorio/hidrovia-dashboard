"""T1 — Escalas do complexo portuário de Santos (ANTAQ Estatístico Aquaviário).

Fonte: cópia local do EA em parquet (ANTAQ_PARQUET_DIR, padrão C:\\Dev\\Github\\ANTAQ\\parquet),
tabelas Atracacao, Carga, CargaConteinerizada e TemposAtracacao, 2010 -> fev/2026.
O parquet local é o bruto: não é copiado para o repo, mas cada arquivo usado tem SHA-256
registrado no manifest (externo_ao_repo = true).

Universo: "Complexo Portuário" = 'Santos' na ANTAQ = Porto Organizado (BRSSZ, margens Santos e
Guarujá) + 7 terminais autorizados no estuário, que usam o mesmo canal de acesso.

Saídas (processed/):
  universo_terminais.csv          instalações incluídas e critério
  escalas_santos.parquet          1 linha por atracação (wide)
  escalas_santos_carga.parquet    atracação x sentido x natureza x operação x SH4 x origem/destino
  escalas_santos_conteiner_sh4.parquet  conteúdo dos contêineres (peso líquido) por atracação x sentido x SH4
  escalas_brasil_mesmos_imo.parquet     todas as atracações no Brasil dos IMOs vistos em Santos
  checagens_t1.json               reprodução das checagens pedidas
Nada é estimado aqui.
"""
from __future__ import annotations

import json

import duckdb

from _comum import ANTAQ_PARQUET, PROC, INTERIM, registra, salva, agora

TABELAS = ["Atracacao", "Carga", "CargaConteinerizada", "TemposAtracacao"]


def registra_brutos():
    for t in TABELAS:
        for f in sorted((ANTAQ_PARQUET / t).glob("*.parquet")):
            registra(f, "ANTAQ — Estatístico Aquaviário (cópia local em parquet)",
                     url="https://web3.antaq.gov.br/ea/sense/download.html (download público fora do ar em 30/09/2026)",
                     nota=f"tabela {t}; cópia local consolidada pelo repo ANTAQ (consolidar_antaq.py); data da coleta = mtime do arquivo",
                     coletado_em=None, externo=True)
    for f in sorted((ANTAQ_PARQUET / "cadastro").glob("*.parquet")):
        registra(f, "ANTAQ — Estatístico Aquaviário, tabelas de cadastro", externo=True)


def main():
    registra_brutos()
    P = str(ANTAQ_PARQUET).replace("\\", "/")
    c = duckdb.connect()
    for t in TABELAS:
        c.sql(f"create view {t} as select * from read_parquet('{P}/{t}/*.parquet', union_by_name=true)")
    c.sql(f"create view merc as select * from read_parquet('{P}/cadastro/Mercadoria.parquet')")
    # dígito verificador do IMO: soma(d_i * (7..2)) mod 10 = d_7
    c.sql("""create macro imo_valido(x) as length(x) = 7 and regexp_matches(x, '^[0-9]{7}$') and
             ((cast(x[1] as int)*7 + cast(x[2] as int)*6 + cast(x[3] as int)*5 + cast(x[4] as int)*4
               + cast(x[5] as int)*3 + cast(x[6] as int)*2) % 10) = cast(x[7] as int)""")

    # ---------- atracações do complexo ----------
    c.sql("""
    create temp table at_s as
    select IDAtracacao as id_atracacao,
           case when "Nº do IMO" is null or "Nº do IMO" <= 0 then null
                else lpad(cast(cast("Nº do IMO" as bigint) as varchar), 7, '0') end as imo,
           "Porto Atracação" as instalacao, "Tipo da Autoridade Portuária" as tipo_instalacao,
           CDTUP as cdtup, IDBerco as id_berco, "Berço" as berco, Terminal as terminal,
           "Apelido Instalação Portuária" as apelido_instalacao, "Município" as municipio,
           "Data Chegada" as data_chegada, "Data Atracação" as data_atracacao,
           "Data Início Operação" as data_inicio_operacao, "Data Término Operação" as data_termino_operacao,
           "Data Desatracação" as data_desatracacao, Ano as ano_antaq, Mes as mes_antaq,
           "Tipo de Operação" as tipo_operacao_atracacao, "Tipo de Navegação da Atracação" as tipo_navegacao_atracacao,
           "Nacionalidade do Armador" as nacionalidade_armador_cod, FlagMCOperacaoAtracacao as flag_mc_operacao,
           "Nº da Capitania" as n_capitania, Coordenadas as coordenadas
    from Atracacao where "Complexo Portuário" = 'Santos'
    """)

    uni = c.sql("""select instalacao, tipo_instalacao, cdtup, string_agg(distinct municipio, '; ') municipios,
                   count(*) atracacoes, min(ano_antaq) ano_min, max(ano_antaq) ano_max
                   from at_s group by 1,2,3 order by atracacoes desc""").df()
    uni["criterio"] = ("ANTAQ 'Complexo Portuário' = 'Santos' (Porto Organizado + terminais autorizados "
                       "no estuário de Santos, todos acessados pelo canal de acesso do Porto Organizado)")
    uni.to_csv(PROC / "universo_terminais.csv", index=False, encoding="utf-8")

    # ---------- carga das atracações do complexo (linha a linha) ----------
    c.sql("""
    create temp table car_s as
    select k.IDCarga as id_carga, k.IDAtracacao as id_atracacao, k.Sentido as sentido,
           k."Natureza da Carga" as natureza, k."Tipo Operação da Carga" as tipo_operacao_carga,
           k."Tipo Navegação" as tipo_navegacao_carga, k.ConteinerEstado as conteiner_estado,
           k.FlagConteinerTamanho as conteiner_tamanho, k.CDMercadoria as sh4,
           left(k.CDMercadoria, 2) as sh2, k.Origem as origem, k.Destino as destino,
           k.VLPesoCargaBruta as t_bruta, k.TEU as teu, k.QTCarga as qt
    from Carga k join at_s a on a.id_atracacao = k.IDAtracacao
    """)

    # ---------- tempos ----------
    c.sql("""
    create temp table tmp_s as
    select IDAtracacao as id_atracacao,
           try_cast(replace(TEsperaAtracacao, ',', '.') as double) as h_espera_atracacao,
           try_cast(replace(TEsperaInicioOp, ',', '.') as double) as h_espera_inicio_op,
           try_cast(replace(TOperacao, ',', '.') as double) as h_operacao,
           try_cast(replace(TEsperaDesatracacao, ',', '.') as double) as h_espera_desatracacao,
           try_cast(replace(TAtracado, ',', '.') as double) as h_atracado,
           try_cast(replace(TEstadia, ',', '.') as double) as h_estadia
    from TemposAtracacao where IDAtracacao in (select id_atracacao from at_s)
    """)
    n_tmp_dup = c.sql("select count(*) - count(distinct id_atracacao) from tmp_s").fetchone()[0]

    # ---------- wide: 1 linha por atracação ----------
    def s(cond, col="t_bruta"):
        return f"sum(case when {cond} then {col} else 0 end)"
    E, D = "sentido='Embarcados'", "sentido='Desembarcados'"
    GS, GL, CG, CT = ("natureza='Granel Sólido'", "natureza='Granel Líquido e Gasoso'",
                      "natureza='Carga Geral'", "natureza='Carga Conteinerizada'")
    CH, VZ = "conteiner_estado='Cheio'", "conteiner_estado='Vazio'"
    LC = "tipo_navegacao_carga='Longo Curso'"
    agg = f"""
    create temp table agg_s as select id_atracacao,
      count(*) as n_linhas_carga,
      {s(E)} as t_emb_total, {s(D)} as t_desemb_total,
      {s("sentido not in ('Embarcados','Desembarcados') or sentido is null")} as t_sentido_nao_informado,
      {s(E+' and '+GS)} as t_emb_granel_solido, {s(D+' and '+GS)} as t_desemb_granel_solido,
      {s(E+' and '+GL)} as t_emb_granel_liquido, {s(D+' and '+GL)} as t_desemb_granel_liquido,
      {s(E+' and '+CG)} as t_emb_carga_geral, {s(D+' and '+CG)} as t_desemb_carga_geral,
      {s(E+' and '+CT)} as t_emb_conteiner_bruto, {s(D+' and '+CT)} as t_desemb_conteiner_bruto,
      {s(E+' and '+LC)} as t_emb_longo_curso, {s(D+' and '+LC)} as t_desemb_longo_curso,
      {s("tipo_operacao_carga ilike '%baldea%'")} as t_baldeacao,
      {s(E+' and '+CH, 'teu')} as teu_cheio_emb, {s(D+' and '+CH, 'teu')} as teu_cheio_desemb,
      {s(E+' and '+VZ, 'teu')} as teu_vazio_emb, {s(D+' and '+VZ, 'teu')} as teu_vazio_desemb,
      {s(E+' and '+CH)} as t_bruta_cheio_emb, {s(D+' and '+CH)} as t_bruta_cheio_desemb,
      {s(E+' and '+GS+" and sh4='1201'")} as t_emb_soja_1201,
      {s(E+' and '+GS+" and sh4='1005'")} as t_emb_milho_1005,
      {s(E+' and '+GS+" and sh4='2304'")} as t_emb_farelo_2304,
      {s(E+' and '+GS+" and sh4='1701'")} as t_emb_acucar_1701,
      arg_max(sh4, t_bruta) filter (where sentido='Embarcados') as sh4_principal_emb,
      arg_max(sh4, t_bruta) filter (where sentido='Desembarcados') as sh4_principal_desemb
    from car_s group by 1
    """
    c.sql(agg)
    esc = c.sql("""
    select a.*, imo_valido(a.imo) as imo_valido, extract(year from a.data_desatracacao) as ano_desatracacao,
           coalesce(g.n_linhas_carga, 0) as n_linhas_carga,
           g.* exclude (id_atracacao, n_linhas_carga),
           case when g.teu_cheio_emb > 0 then g.t_bruta_cheio_emb / g.teu_cheio_emb end as t_por_teu_cheio_emb,
           case when g.teu_cheio_desemb > 0 then g.t_bruta_cheio_desemb / g.teu_cheio_desemb end as t_por_teu_cheio_desemb,
           t.* exclude (id_atracacao)
    from at_s a left join agg_s g using (id_atracacao)
    left join (select * from tmp_s qualify row_number() over (partition by id_atracacao) = 1) t using (id_atracacao)
    order by a.data_atracacao, a.id_atracacao
    """).df()
    salva(esc, "escalas_santos")

    # ---------- long: carga por SH4 / rota ----------
    longa = c.sql("""
    select id_atracacao, sentido, natureza, tipo_operacao_carga, tipo_navegacao_carga,
           conteiner_estado, conteiner_tamanho, sh2, sh4, m."Grupo de Mercadoria" as grupo_mercadoria_antaq,
           origem, destino, count(*) as n_linhas, sum(t_bruta) as t_bruta, sum(teu) as teu, sum(qt) as qt
    from car_s left join (select distinct CDNCMSH2, "Grupo de Mercadoria" from merc) m on m.CDNCMSH2 = car_s.sh2
    group by all order by id_atracacao
    """).df()
    salva(longa, "escalas_santos_carga")

    cont = c.sql("""
    select k.id_atracacao, k.sentido, cc.CDMercadoriaConteinerizada as sh4_conteudo,
           sum(cc.VLPesoCargaConteinerizada) as t_liquida_conteudo, count(*) as n_linhas
    from CargaConteinerizada cc join car_s k on k.id_carga = cc.IDCarga
    group by all order by 1
    """).df()
    salva(cont, "escalas_santos_conteiner_sh4")

    # ---------- mesmos IMO em todo o Brasil ----------
    c.sql("""
    create temp table at_br as
    select IDAtracacao as id_atracacao,
           lpad(cast(cast("Nº do IMO" as bigint) as varchar), 7, '0') as imo,
           "Porto Atracação" as instalacao, "Complexo Portuário" as complexo, "Tipo da Autoridade Portuária" as tipo_instalacao,
           CDTUP as cdtup, IDBerco as id_berco, "Berço" as berco, SGUF as uf,
           "Data Chegada" as data_chegada, "Data Atracação" as data_atracacao, "Data Desatracação" as data_desatracacao,
           "Tipo de Operação" as tipo_operacao_atracacao, "Tipo de Navegação da Atracação" as tipo_navegacao_atracacao,
           ("Complexo Portuário" = 'Santos') as em_santos
    from Atracacao
    where "Nº do IMO" > 0 and lpad(cast(cast("Nº do IMO" as bigint) as varchar), 7, '0')
          in (select distinct imo from at_s where imo is not null)
    """)
    br = c.sql("""
    with g as (
      select k.IDAtracacao as id_atracacao,
        sum(case when Sentido='Embarcados' then VLPesoCargaBruta else 0 end) as t_emb_total,
        sum(case when Sentido='Desembarcados' then VLPesoCargaBruta else 0 end) as t_desemb_total,
        sum(case when Sentido='Embarcados' and "Natureza da Carga"='Granel Sólido' then VLPesoCargaBruta else 0 end) as t_emb_granel_solido,
        sum(case when Sentido='Embarcados' and "Tipo Navegação"='Longo Curso' then VLPesoCargaBruta else 0 end) as t_emb_longo_curso,
        sum(case when Sentido='Embarcados' and ConteinerEstado='Cheio' then TEU else 0 end) as teu_cheio_emb,
        sum(case when Sentido='Desembarcados' and ConteinerEstado='Cheio' then TEU else 0 end) as teu_cheio_desemb,
        sum(case when Sentido='Embarcados' and ConteinerEstado='Cheio' then VLPesoCargaBruta else 0 end) as t_bruta_cheio_emb,
        arg_max(CDMercadoria, VLPesoCargaBruta) filter (where Sentido='Embarcados') as sh4_principal_emb
      from Carga k where k.IDAtracacao in (select id_atracacao from at_br) group by 1)
    select a.*, g.* exclude (id_atracacao),
           row_number() over (partition by a.imo order by a.data_atracacao, a.id_atracacao) as seq_imo
    from at_br a left join g using (id_atracacao)
    order by imo, data_atracacao
    """).df()
    salva(br, "escalas_brasil_mesmos_imo")

    # ---------- checagens ----------
    q = lambda s_: c.sql(s_).fetchall()
    po = "tipo_instalacao='Porto Organizado'"
    chk = {
        "gerado_em": agora(),
        "atracacoes_porto_organizado_2010_fev2026": q(f"select count(*) from at_s where {po}")[0][0],
        "atracacoes_complexo_2010_fev2026": q("select count(*) from at_s")[0][0],
        "id_atracacao_duplicado": q("select count(*) - count(distinct id_atracacao) from at_s")[0][0],
        "tempos_duplicados_por_atracacao": n_tmp_dup,
        "t_por_teu_cheio_2025_complexo": q("""select sum(t_bruta)/sum(teu) from car_s k join at_s a using(id_atracacao)
                                             where a.ano_antaq=2025 and conteiner_estado='Cheio' and teu>0""")[0][0],
        "t_por_teu_cheio_2025_porto_organizado": q(f"""select sum(t_bruta)/sum(teu) from car_s k join at_s a using(id_atracacao)
                                             where a.ano_antaq=2025 and a.{po} and conteiner_estado='Cheio' and teu>0""")[0][0],
        "imo_preenchido_2025_porto_organizado": q(f"select avg((imo is not null)::int) from at_s where ano_antaq=2025 and {po}")[0][0],
        "imo_com_digito_verificador_valido_complexo": q("select avg(imo_valido(imo)::int) from at_s where imo is not null")[0][0],
        "imo_preenchido_2025_complexo": q("select avg((imo is not null)::int) from at_s where ano_antaq=2025")[0][0],
        "nota": "ano_antaq = ano de referência da ANTAQ (ano da desatracação). Peso bruto ANTAQ inclui tara do contêiner.",
    }
    (PROC / "checagens_t1.json").write_text(json.dumps(chk, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(chk, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
