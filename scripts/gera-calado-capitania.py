"""
Calado Máximo Recomendado (CMR) publicado pela Capitania Fluvial da Amazônia
Ocidental (CFAOC) — série diária oficial, sem modelo.

Entrada: planilha colada à mão a partir do boletim da Capitania
(https://www.marinha.mil.br/cfaoc/node/119 — site bloqueia coleta automática).
Formato esperado: blocos com cabeçalho "DATA | CMR (Petróleo e Gás, Demais
cargas) | FAQ (Petróleo e Gás, Demais cargas)"; linhas de dado têm data na
1ª coluna. Blocos de meses diferentes podem estar empilhados na mesma aba.

Saídas:
  data/calado_capitania.csv            — acumulado (merge idempotente por data)
  public/data/calado-capitania.json    — lido pelo /monitor

Regra de merge: um boletim mais novo (--publicacao maior ou igual) sobrescreve
a mesma data. Datas posteriores à publicação ficam marcadas como previsão da
Capitania e são substituídas quando o boletim daquele dia chegar.

Uso:
  python scripts/gera-calado-capitania.py [caminho.xlsx] [--publicacao AAAA-MM-DD]
  (padrão: ../data/CMR2026.xlsx, publicação = hoje)
"""

import argparse
import json
import sys
from datetime import date, datetime
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
CSV_ACUM = RAIZ / "data" / "calado_capitania.csv"
JSON_OUT = RAIZ / "public" / "data" / "calado-capitania.json"
HIST_CSV = RAIZ / "data" / "cmr_itacoatiara.csv"  # temporadas 2024-25 e 2025-26
COLS = ["data", "cmr_demais", "cmr_petroleo", "faq_demais", "faq_petroleo", "previsao", "publicado_em"]


def le_planilha(caminho: Path, publicacao: str) -> pd.DataFrame:
    bruto = pd.read_excel(caminho, header=None)
    datas = pd.to_datetime(bruto[0], errors="coerce", format="mixed")
    linhas = bruto[datas.notna()].copy()
    if linhas.empty:
        sys.exit(f"Nenhuma linha com data em {caminho}")
    # Colunas: DATA | CMR P&G | CMR demais | FAQ P&G | FAQ demais
    df = pd.DataFrame({
        "data": datas[datas.notna()].dt.strftime("%Y-%m-%d"),
        "cmr_petroleo": pd.to_numeric(linhas[1], errors="coerce"),
        "cmr_demais": pd.to_numeric(linhas[2], errors="coerce"),
        "faq_petroleo": pd.to_numeric(linhas[3], errors="coerce"),
        "faq_demais": pd.to_numeric(linhas[4], errors="coerce"),
    })
    faltando = df[df[["cmr_petroleo", "cmr_demais"]].isna().any(axis=1)]
    if not faltando.empty:
        sys.exit(f"CMR vazio/não numérico em: {', '.join(faltando.data)}")
    # Sanidade: calado de petróleo e gás é sempre menor que o de demais cargas
    invertido = df[df.cmr_petroleo > df.cmr_demais]
    if not invertido.empty:
        sys.exit(f"CMR petróleo > demais cargas em: {', '.join(invertido.data)} — colunas trocadas?")
    df["previsao"] = (df.data > publicacao).astype(int)
    df["publicado_em"] = publicacao
    return df.drop_duplicates("data", keep="last")[COLS]


def merge(novo: pd.DataFrame) -> pd.DataFrame:
    if CSV_ACUM.exists():
        antigo = pd.read_csv(CSV_ACUM, dtype={"data": str, "publicado_em": str})
        base = pd.concat([antigo, novo]).sort_values(["data", "publicado_em"])
        base = base.drop_duplicates("data", keep="last")  # boletim mais novo vence
    else:
        base = novo
    return base.sort_values("data").reset_index(drop=True)[COLS]


def r2(x):
    return None if pd.isna(x) else round(float(x), 2)


def historico() -> dict:
    """Temporadas anteriores (categoria de carga não identificada na fonte)."""
    h = pd.read_csv(HIST_CSV, parse_dates=["data"]).sort_values("data")
    out = {}
    for ano in (2024, 2025):
        # Só set–dez: jan/2025 pertence à estiagem de 2024 e cairia fora do eixo
        s = h[(h.data.dt.year == ano) & (h.data.dt.month >= 9)]
        out[str(ano)] = [{"md": d.strftime("%m-%d"), "cmr": r2(v)} for d, v in zip(s.data, s.cmr_m)]
    return out


def gera_json(acum: pd.DataFrame) -> dict:
    obs = acum[acum.previsao == 0]
    prev = acum[acum.previsao == 1]
    if obs.empty:
        sys.exit("Nenhum dia observado (todas as linhas são previsão).")
    ult = obs.iloc[-1]
    ant = obs[obs.data < ult.data]
    var_24h = r2(ult.cmr_demais - ant.iloc[-1].cmr_demais) if not ant.empty else None
    # Ritmo médio dos últimos 7 dias observados (m/dia), por diferença de datas
    jan = obs.tail(8)
    dias = (pd.to_datetime(jan.data.iloc[-1]) - pd.to_datetime(jan.data.iloc[0])).days
    ritmo = r2((jan.cmr_demais.iloc[-1] - jan.cmr_demais.iloc[0]) / dias) if dias > 0 else None
    ponto = lambda r: {
        "data": r.data,
        "demais": r2(r.cmr_demais),
        "petroleo": r2(r.cmr_petroleo),
        "previsao": bool(r.previsao),
    }
    return {
        "gerado_em": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "fonte": "Capitania Fluvial da Amazônia Ocidental (CFAOC) — Calado Máximo Recomendado",
        "fonte_url": "https://www.marinha.mil.br/cfaoc/node/119",
        "publicado_em": acum.publicado_em.max(),
        "ultimo": {
            **ponto(ult),
            "faq_demais": r2(ult.faq_demais),
            "faq_petroleo": r2(ult.faq_petroleo),
            "variacao_24h_m": var_24h,
            "ritmo_7d_m_dia": ritmo,
        },
        "previsao_capitania": [ponto(r) for r in prev.itertuples()],
        "serie": [ponto(r) for r in acum.itertuples()],
        "historico": historico(),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx", nargs="?", default=str(RAIZ.parent / "data" / "CMR2026.xlsx"))
    ap.add_argument("--publicacao", default=date.today().isoformat())
    a = ap.parse_args()
    novo = le_planilha(Path(a.xlsx), a.publicacao)
    acum = merge(novo)
    acum.to_csv(CSV_ACUM, index=False)
    JSON_OUT.write_text(json.dumps(gera_json(acum), ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(novo)} linhas lidas ({novo.previsao.sum()} previsão) -> {len(acum)} dias em {CSV_ACUM.name}")
    print(f"JSON: {JSON_OUT.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
