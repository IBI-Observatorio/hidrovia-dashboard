"""T8 — Regras de trânsito (NPCP-SP) e marés (CHM) para Santos.

NPCP-SP: PDFs já em raw/npcp/ (Portaria CPSP 113/2026 + NPCP 3ª Rev. Mod. 1; e 1ª Rev. 2016).
  Extrai o texto por página (interim/npcp_texto_por_pagina.parquet) e, por palavras-chave, as passagens
  sobre calado, folga sob a quilha/fator de segurança, maré, cruzamento, dimensões (processed/npcp_regras.csv).
  Achado: nenhuma das duas edições fixa um valor numérico de folga sob a quilha para o canal de Santos —
  o calado máximo de operação é delegado à APS (5.1.b.I da 3ª Rev.; 5.1.e.1 da 2016).
CHM: o site da Marinha (marinha.mil.br/chm) está atrás de desafio anti-robô do Cloudflare em 02/10/2026;
  NÃO é contornado. As tábuas de Santos e os arquivos 'historico_*santos*.txt' são baixados das capturas
  do Wayback Machine (última captura de cada arquivo distinto).
"""
from __future__ import annotations

import json
import re
import urllib.parse

import pandas as pd

from _comum import RAW, INTERIM, PROC, baixa

PALAVRAS = {
    "calado_maximo": r"calado m[áa]ximo|calados m[áa]ximos|calado operacional",
    "folga_quilha": r"folga (sob|abaixo d)a quilha|fator de seguran[çc]a|squat",
    "mare": r"preamar|baixa-?mar|altura de mar[ée]|enchente de mar[ée]|vazante",
    "cruzamento_ultrapassagem": r"cruzamento|ultrapassagem",
    "dimensoes": r"comprimento total superior|LOA|boca (m[áa]xima|superior)|340 e 370 metros",
    "portaria_especifica": r"Portaria (\(s\) )?espec[íi]fica",
    "piacaguera": r"Piaçaguera|Piacaguera",
}


def npcp():
    import pypdf
    pags, regras = [], []
    for arq, edicao in [("portaria_cpsp_113_2026_npcp_sp_rev3_mod1.pdf", "NPCP-SP 3ª Rev. Mod.1 (Portaria CPSP 113/2026, vigor 23/04/2026)"),
                        ("npcp_sp_2016_rev1.pdf", "NPCP-SP 1ª Rev. (2016)")]:
        p = RAW / "npcp" / arq
        if not p.exists():
            continue
        for i, pg in enumerate(pypdf.PdfReader(p).pages):
            t = pg.extract_text() or ""
            pags.append({"edicao": edicao, "arquivo": arq, "pagina_pdf": i + 1, "texto": t})
            tt = re.sub(r"\s+", " ", t)
            for tema, rx in PALAVRAS.items():
                for m in re.finditer(rx, tt, flags=re.I):
                    regras.append({"edicao": edicao, "pagina_pdf": i + 1, "tema": tema,
                                   "trecho": tt[max(0, m.start() - 250): m.end() + 350]})
    pd.DataFrame(pags).to_parquet(INTERIM / "npcp_texto_por_pagina.parquet", index=False)
    R = pd.DataFrame(regras).drop_duplicates(["edicao", "pagina_pdf", "tema"])
    R.to_csv(PROC / "npcp_regras.csv", index=False, encoding="utf-8")
    print(f"  npcp_regras.csv: {len(R)} passagens")


def chm():
    out = []
    for padrao in ["marinha.mil.br/chm/sites/www.marinha.mil.br.chm/files/dados_de_mare/*",
                   "marinha.mil.br/chm/sites/www.marinha.mil.br.chm/files/historico*"]:
        q = urllib.parse.urlencode({"url": padrao, "output": "json", "filter": "statuscode:200",
                                    "fl": "timestamp,original,digest,mimetype"})
        nome = "dados_de_mare" if "dados" in padrao else "historico"
        cdx = baixa(f"https://web.archive.org/cdx/search/cdx?{q}", RAW / "chm" / f"cdx_{nome}_20261002.json",
                    "Internet Archive — API CDX (arquivos da CHM)", pausa=2)
        if not cdx:
            continue
        L = json.loads(cdx.read_text(encoding="utf-8") or "[]")
        regs = [dict(zip(L[0], r)) for r in L[1:]] if L else []
        regs = [r for r in regs if re.search(r"santos", r["original"], flags=re.I)
                and not re.search(r"todos_os_santos|bacia-de-santos", r["original"], flags=re.I)]
        ult = {}
        for r in regs:  # última captura de cada arquivo
            k = r["original"].split("?")[0].lower()
            if k not in ult or r["timestamp"] > ult[k]["timestamp"]:
                ult[k] = r
        for k, r in sorted(ult.items()):
            fn = r["original"].split("/")[-1].split("?")[0]
            p = baixa(f"https://web.archive.org/web/{r['timestamp']}id_/{r['original']}", RAW / "chm" / f"{r['timestamp']}_{fn}",
                      "CHM/Marinha — tábua de marés / histórico (via Wayback Machine)",
                      nota=f"captura {r['timestamp']} de {r['original']}", pausa=1.5)
            out.append({"arquivo_original": r["original"], "captura_ts": r["timestamp"], "baixado": bool(p),
                        "local": str(p.name) if p else None, "bytes": p.stat().st_size if p else None})
    F = pd.DataFrame(out)
    def avalia(r):
        if not r.local:
            return pd.Series({"conteudo": None, "completo": None})
        b = (RAW / "chm" / r.local).read_bytes()
        if r.local.endswith(".pdf"):
            ok = b"%%EOF" in b[-2048:]
            return pd.Series({"conteudo": "tábua de marés (previsão)", "completo": ok})
        cab = b[:200].decode("latin-1")
        tipo = "boia meteoceanográfica (não é maré)" if "Wvht" in cab or "swvht" in cab else "texto"
        return pd.Series({"conteudo": tipo, "completo": r.bytes != 1048576})
    F = pd.concat([F, F.apply(avalia, axis=1)], axis=1)
    F["obs"] = F.completo.map({False: "captura truncada no Wayback (1 MiB) ou sem %%EOF — inutilizável sem nova cópia", True: None})
    F.to_csv(PROC / "chm_mares_fontes.csv", index=False, encoding="utf-8")
    print(F.to_string())


if __name__ == "__main__":
    npcp()
    chm()
