#!/usr/bin/env python3
# scripts/cepea/gera-basis.py
# Gera data/cepea/basis-semanal.json — insumo do pilar BASIS da v3 (H1).
#
#   BASIS = preco porto - preco interior (soja), R$/saca, por semana.
#   Quando o grao nao escoa, o interior cai vs o porto -> basis ABRE. E o sinal
#   de aperto de escoamento revelado por mercado (ver docs/pre-registro-iee-v3-desenho.md).
#
# FONTES (arquivos commitados em data/cepea/, baixados manualmente):
#   - Porto:    CEPEA/B3 - Indicador da Soja Paranagua ('A vista R$'),
#               data/cepea/cepea-soja-paranagua.xls (serie diaria 2016->).
#   - Interior: IMEA - 'Preco soja disponivel compra' (MT, R$/saca),
#               data/cepea/imea-soja-mt.xls (serie diaria 2023->).
#
# Corredor 'santos': interior MT vs porto Paranagua como referencia de paridade
#   de exportacao (precos de soja em Santos e Paranagua sao quase identicos;
#   o que importa e o spread porto-interior). Documentado.
#
# SAIDA: { fonte, metodo, geradoEm, status:'ok',
#          corredores: { santos: [["2023-01-09", 22.9], ...] } }  # [segunda ISO, basis R$/sc]
#
# Requer: pandas + python-calamine (le .xls legado OLE2 que o xlrd recusa).

import os, sys, json, datetime
import pandas as pd

AQUI = os.path.dirname(os.path.abspath(__file__))
DADOS = os.path.join(AQUI, "..", "..", "data", "cepea")
PORTO_XLS = os.path.join(DADOS, "cepea-soja-paranagua.xls")
INTERIOR_XLS = os.path.join(DADOS, "imea-soja-mt.xls")


def num(s):
    return pd.to_numeric(
        s.astype(str).str.replace(".", "", regex=False).str.replace(",", ".", regex=False),
        errors="coerce",
    )


def semanal(df, col):
    """media por semana ISO (rotulada na segunda-feira)."""
    return (df.set_index("data").sort_index()[col]
            .resample("W-MON", label="left", closed="left").mean().dropna())


def serie_porto():
    raw = pd.read_excel(PORTO_XLS, header=None, engine="calamine")
    h = raw.index[raw[0] == "Data"][0]  # cabecalho 'Data | A vista R$ | A vista US$'
    df = raw.iloc[h + 1:][[0, 1]].dropna()
    df.columns = ["data", "porto"]
    df["data"] = pd.to_datetime(df["data"], format="%d/%m/%Y", errors="coerce")
    df["porto"] = num(df["porto"])
    return semanal(df.dropna(), "porto")


def serie_interior():
    df = pd.read_excel(INTERIOR_XLS, sheet_name="Dados", engine="calamine")
    df = df[(df["Indicador"] == "Preço soja disponível compra") & (df["Unidade"] == "Reais por saca")]
    df = df[["Data", "Valor"]].rename(columns={"Data": "data", "Valor": "interior"})
    df["data"] = pd.to_datetime(df["data"])
    return semanal(df, "interior")


def main():
    for f in (PORTO_XLS, INTERIOR_XLS):
        if not os.path.exists(f):
            sys.stderr.write(f"[basis] arquivo ausente: {f}\n  baixe do CEPEA/IMEA (ver cabecalho).\n")
            return 1
    porto, interior = serie_porto(), serie_interior()
    b = pd.concat([porto, interior], axis=1).dropna()
    b["basis"] = (b["porto"] - b["interior"]).round(2)
    santos = [[d.strftime("%Y-%m-%d"), float(v)] for d, v in b["basis"].items()]

    out = {
        "fonte": "CEPEA/B3 (Indicador Soja Paranaguá, à vista R$) − IMEA (preço soja disponível compra, MT)",
        "metodo": "basis = porto − interior (R$/saca 60kg); média por semana ISO (segunda). Paranaguá como referência de paridade de exportação p/ o corredor de Santos (preço soja Santos≈Paranaguá).",
        "geradoEm": datetime.date.today().isoformat(),
        "status": "ok",
        "corredores": {"santos": santos},
    }
    os.makedirs(DADOS, exist_ok=True)
    with open(os.path.join(DADOS, "basis-semanal.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print(f"[basis] OK — santos: {len(santos)} semanas ({santos[0][0]} -> {santos[-1][0]}) · "
          f"basis medio {b['basis'].mean():.1f} R$/sc")
    return 0


if __name__ == "__main__":
    sys.exit(main())
