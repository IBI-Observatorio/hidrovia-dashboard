#!/usr/bin/env python3
# scripts/imea/gera-frete.py
# Gera data/imea/frete-semanal.json — insumo do pilar APERTO da v3 (H2).
#
#   Frete rodoviario observado Sorriso (MT) -> Santos (SP), soja, R$/tonelada.
#   Fonte: IMEA - "Preco disponivel do Frete de Graos" (Serie Historica,
#   exportada manualmente; arquivo em data/imea/frete-sorriso-santos.xls).
#   SIFRECA (ESALQ) seria pago; o IMEA cobre a mesma rota, free.
#
#   Aperto = (frete_observado - custo_modelo) / custo_modelo  (ver backtest).
#
# SAIDA: { fonte, metodo, geradoEm, status:'ok',
#          corredores: { santos: [["2023-01-09", 442.7], ...] } }  # [segunda ISO, R$/t]
#
# Requer: pandas + python-calamine (le .xls legado).

import os, sys, json, datetime
import pandas as pd

AQUI = os.path.dirname(os.path.abspath(__file__))
DADOS = os.path.join(AQUI, "..", "..", "data", "imea")
XLS = os.path.join(DADOS, "frete-sorriso-santos.xls")


def main():
    if not os.path.exists(XLS):
        sys.stderr.write(f"[frete] ausente: {XLS}\n  exporte do IMEA (Serie Historica > 'Preco disponivel do Frete de Graos', rota Sorriso->Santos).\n")
        return 1
    df = pd.read_excel(XLS, sheet_name="Dados", engine="calamine")
    # colunas: Cadeia|Indicador|Estado|Macrorregiao|Cidade|Data|Valor|Unidade|...
    df = df[["Data", "Valor"]].rename(columns={"Data": "data", "Valor": "frete"})
    df["data"] = pd.to_datetime(df["data"])
    df = df.dropna()
    w = df.set_index("data").sort_index()["frete"].resample("W-MON", label="left", closed="left").mean().dropna()
    santos = [[d.strftime("%Y-%m-%d"), round(float(v), 2)] for d, v in w.items()]

    out = {
        "fonte": "IMEA — Preço disponível do Frete de Grãos (Sorriso→Santos, soja, R$/t)",
        "metodo": "frete rodoviário observado por semana ISO (segunda), média das cotações da semana",
        "geradoEm": datetime.date.today().isoformat(),
        "status": "ok",
        "corredores": {"santos": santos},
    }
    os.makedirs(DADOS, exist_ok=True)
    with open(os.path.join(DADOS, "frete-semanal.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print(f"[frete] OK — santos: {len(santos)} semanas ({santos[0][0]} -> {santos[-1][0]}) · medio {w.mean():.0f} R$/t")
    return 0


if __name__ == "__main__":
    sys.exit(main())
