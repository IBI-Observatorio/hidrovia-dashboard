"""T7 — Controles e custos: frete marítimo (USDA GTR), safra (CONAB), preço internacional, custo terrestre.

Fontes:
- USDA AMS Grain Transportation Report (Socrata agtransport.usda.gov):
    j6ns-hzra  frete marítimo de soja por porto brasileiro -> Alemanha/China, trimestral
    xtb3-iudz  custo de transporte e "landed cost" Norte do MT -> Santos -> China, trimestral
- CONAB Portal de Informações: LevantamentoGraos.txt (estimativa por levantamento mensal, UF x produto x safra).
  A CONAB não publica produção por mês: o "mês" disponível é o do levantamento (estimativa), registrado como tal.
- Preço internacional (FRED, séries do FMI/IMF Primary Commodity Prices, mensal, US$/t):
    PSOYBUSDM  Soja — descrição do FMI: contrato futuro de Chicago (CBOT), 1º vencimento
    PMAIZMTUSDM Milho — descrição do FMI: U.S. No.2 Yellow, FOB Golfo do México (NÃO é CBOT: registrado assim)
- Custo terrestre: o frete de referência da ANTT (piso mínimo) não tem série em dados abertos
  (dados.antt.gov.br só traz autos de infração); o piso vigente e o modelo de custo rodoviário do IBI
  já estão no repo (lib/iee-params.ts, docs/calibracao-T-frete.md) — registrados como referência, sem recálculo.
"""
from __future__ import annotations

import io
import json

import pandas as pd

from _comum import RAW, PROC, RAIZ, baixa, salva, agora

D = RAW / "controles"
HOJE = "20261002"


def gtr():
    out = {}
    # xtb3-iudz é uma visualização (gráfico); a tabela de origem (modifyingViewUid) é j7xv-dz9h
    for ds, nome in [("j6ns-hzra", "gtr_frete_maritimo_soja_brasil"), ("j7xv-dz9h", "gtr_custo_transporte_soja_brasil_china")]:
        p = baixa(f"https://agtransport.usda.gov/resource/{ds}.json?$limit=50000", D / f"{ds}_{HOJE}.json",
                  f"USDA AMS — Grain Transportation Report, Socrata {ds}")
        meta = baixa(f"https://agtransport.usda.gov/api/views/{ds}.json", D / f"{ds}_metadados_{HOJE}.json",
                     f"USDA AMS — metadados Socrata {ds}")
        df = pd.DataFrame(json.loads(p.read_text(encoding="utf-8")))
        nm = json.loads(meta.read_text(encoding="utf-8")).get("name")
        df["dataset"] = ds
        df["dataset_nome"] = nm
        salva(df, nome)
        out[ds] = {"linhas": len(df), "colunas": list(df.columns), "nome": nm}
    return out


def conab():
    p = baixa("https://portaldeinformacoes.conab.gov.br/downloads/arquivos/LevantamentoGraos.txt",
              D / f"conab_LevantamentoGraos_{HOJE}.txt", "CONAB — Portal de Informações, LevantamentoGraos.txt")
    txt = p.read_bytes()
    try:
        s = txt.decode("utf-8")
    except UnicodeDecodeError:
        s = txt.decode("latin-1")
    df = pd.read_csv(io.StringIO(s), sep=";", dtype=str)
    df.columns = [c.strip().lower() for c in df.columns]
    for c in ("area_plantada_mil_ha", "producao_mil_t"):
        if c in df:
            df[c] = pd.to_numeric(df[c].str.replace(",", "."), errors="coerce")
    df["ano_agricola"] = df.ano_agricola.str.strip()
    salva(df, "conab_levantamentos_graos")
    # série histórica (safras anteriores a 2017, último levantamento de cada safra)
    p2 = baixa("https://portaldeinformacoes.conab.gov.br/downloads/arquivos/SerieHistoricaGraos.txt",
               D / f"conab_SerieHistoricaGraos_{HOJE}.txt", "CONAB — Portal de Informações, SerieHistoricaGraos.txt")
    b = p2.read_bytes()
    try:
        s2 = b.decode("utf-8")
    except UnicodeDecodeError:
        s2 = b.decode("latin-1")
    h = pd.read_csv(io.StringIO(s2), sep=";", dtype=str)
    h.columns = [c.strip().lower() for c in h.columns]
    h = h.apply(lambda c: c.str.strip())
    salva(h, "conab_serie_historica_graos")
    return {"linhas": len(df), "colunas": list(df.columns),
            "anos_agricolas": sorted(df.ano_agricola.dropna().unique().tolist())[:1] + sorted(df.ano_agricola.dropna().unique().tolist())[-1:]}


def precos():
    out = {}
    linhas = []
    for sid, prod, desc in [("PSOYBUSDM", "soja", "FMI: Soybeans, U.S. soybeans, Chicago Soybean futures contract (first contract forward) No. 2 yellow and par, US$/t"),
                            ("PMAIZMTUSDM", "milho", "FMI: Maize (corn), U.S. No.2 Yellow, FOB Gulf of Mexico, U.S. price, US$/t — não é cotação CBOT")]:
        p = baixa(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}", D / f"fred_{sid}_{HOJE}.csv",
                  f"FRED (St. Louis Fed) — série {sid} (IMF Primary Commodity Prices)", nota=desc)
        if not p:
            out[sid] = "falhou"
            continue
        df = pd.read_csv(p)
        df.columns = ["data", "usd_t"]
        df["usd_t"] = pd.to_numeric(df.usd_t, errors="coerce")
        df["serie"], df["produto"], df["descricao"] = sid, prod, desc
        linhas.append(df)
        out[sid] = {"de": str(df.data.min()), "ate": str(df.data.max()), "n": len(df)}
    if linhas:
        salva(pd.concat(linhas), "precos_internacionais_mensal")
    return out


def custo_terrestre():
    ref = {"gerado_em": agora(),
           "frete_referencia_antt": {
               "situacao": "sem série histórica em dados abertos (dados.antt.gov.br: só autos de infração, consultado em 02/10/2026)",
               "vigente_documentado_no_repo": "docs/calibracao-T-frete.md §3 — piso mínimo ANTT (Res. 6.076/2026, Portaria SUROC 4/2026), fórmula CCD×km + CC por nº de eixos",
               "calculadora_oficial": "https://calculadorafrete.antt.gov.br",
               "lacuna": "série histórica dos pisos 2018–2026 (resoluções ANTT) não coletada nesta etapa"},
           "modelo_custo_rodoviario_ibi": {
               "codigo": "lib/iee-params.ts (PARAMETROS_CUSTEIO_V0, PERFIS_VEICULO, ROTAS_T)",
               "documentacao": "docs/calibracao-T-frete.md",
               "nota": "custo MODELADO (não frete de mercado); mudar parâmetros exige novo pré-registro do IEE (hash) e backtest"}}
    existe = all((RAIZ / x).exists() for x in ["lib/iee-params.ts", "docs/calibracao-T-frete.md"])
    ref["arquivos_conferidos_no_repo"] = existe
    (PROC / "custo_terrestre_referencias.json").write_text(json.dumps(ref, ensure_ascii=False, indent=1), encoding="utf-8")
    return ref


if __name__ == "__main__":
    D.mkdir(parents=True, exist_ok=True)
    res = {"gtr": gtr(), "conab": conab(), "precos": precos(), "custo_terrestre": "ver custo_terrestre_referencias.json"}
    custo_terrestre()
    print(json.dumps(res, ensure_ascii=False, indent=1, default=str))
