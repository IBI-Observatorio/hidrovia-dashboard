"""T3 — Calado e IMO por escala na lista "Navios Esperados · Carga" da APS (coleta própria).

Fonte: data/lineup/santos-escalas-calado.json, gravado diariamente por scripts/lineup/santos.ts
(workflow agro-dados, GitHub Actions) desde 30/09/2026. O arquivo é acumulativo (1 linha por DUV,
com 1º e último calado vistos). Cada versão commitada na origin/main é um snapshot bruto: este script
extrai TODAS as versões do histórico do git para raw/aps_lineup/git/ e registra no manifest.

Saídas:
  interim/escalas_calado_aps.parquet           1 linha por DUV (versão mais recente)
  interim/escalas_calado_aps_snapshots.parquet DUV x snapshot (para ver mudança do calado entre dias)
  processed/casamento_lineup_antaq.json        taxa de casamento com a T1 (IMO + data)
"""
from __future__ import annotations

import json
import subprocess

import pandas as pd

from _comum import RAIZ, RAW, INTERIM, PROC, registra, agora, salva

ARQ = "data/lineup/santos-escalas-calado.json"
REF = "origin/main"


def git(*a):
    return subprocess.run(["git", *a], cwd=RAIZ, capture_output=True, check=True).stdout


def main():
    git("fetch", "-q", "origin")
    log = git("log", REF, "--format=%H %cI", "--", ARQ).decode().split("\n")
    snaps = []
    for lin in filter(None, log):
        sha, data = lin.split()
        dst = RAW / "aps_lineup" / "git" / f"{data[:10]}_{sha[:8]}.json"
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists():
            dst.write_bytes(git("show", f"{sha}:{ARQ}"))
            registra(dst, "APS — Navios Esperados · Carga (coleta própria diária, scripts/lineup/santos.ts)",
                     url="https://www.portodesantos.com.br/informacoes-operacionais/operacoes-portuarias/navegacao-e-movimento-de-navios/navios-esperados-carga/",
                     nota=f"versão do commit {sha} ({data}) de {ARQ} na {REF}", coletado_em=data)
        d = json.loads(dst.read_text(encoding="utf-8"))
        for e in d["escalas"]:
            snaps.append({**e, "snapshot_commit": sha[:8], "snapshot_data": data[:10],
                          "operacoes": ",".join(e.get("operacoes") or []),
                          "mercadorias": ",".join(e.get("mercadorias") or [])})
    S = pd.DataFrame(snaps)
    S.to_parquet(INTERIM / "escalas_calado_aps_snapshots.parquet", index=False)
    ult = S.sort_values("snapshot_data").groupby("duv").tail(1).copy()
    ult["imo"] = ult.imo.str.lstrip("0").str.zfill(7)
    ult["chegada"] = pd.to_datetime(ult.chegada, errors="coerce")
    ult.to_parquet(INTERIM / "escalas_calado_aps.parquet", index=False)
    salva(ult, "escalas_calado_aps")

    esc = pd.read_parquet(PROC / "escalas_santos.parquet", columns=["imo", "data_chegada", "data_atracacao"])
    max_antaq = esc.data_atracacao.max()
    imos_t1 = set(esc.imo.dropna())
    # casamento por IMO + data: chegada APS dentro de +-3 dias da chegada ANTAQ
    m = ult.dropna(subset=["imo", "chegada"]).merge(esc.dropna(subset=["imo"]), on="imo", how="left")
    m["dif_d"] = (m.data_chegada - m.chegada).dt.days.abs()
    casadas = m[m.dif_d <= 3].duv.nunique()
    res = {
        "gerado_em": agora(), "snapshots": int(S.snapshot_commit.nunique()),
        "datas_snapshot": sorted(S.snapshot_data.unique().tolist()),
        "escalas_duv": int(len(ult)), "com_imo": int(ult.imo.notna().sum()),
        "com_calado": int(ult.calado_m.notna().sum()),
        "duv_com_calado_alterado_entre_snapshots": int((ult.calado_m != ult.calado_primeiro_m).sum()),
        "fim_da_T1_antaq": str(max_antaq),
        "casadas_imo_e_data_T1": int(casadas),
        "taxa_casamento_imo_e_data": casadas / len(ult) if len(ult) else None,
        "imo_ja_visto_em_santos_na_T1": int(ult.imo.isin(imos_t1).sum()),
        "taxa_imo_ja_visto_na_T1": float(ult.imo.isin(imos_t1).mean()),
        "nota": ("A T1 (ANTAQ) termina em fev/2026 e a coleta começa em 30/09/2026: não há sobreposição de datas, "
                 "então o casamento escala a escala é zero por construção até a ANTAQ publicar mar/2026 em diante. "
                 "O casamento por IMO (navio já visto em Santos) é informativo."),
    }
    (PROC / "casamento_lineup_antaq.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
