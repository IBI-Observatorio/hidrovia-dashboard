"""T2 (parser) — Extrai de cada captura da página de calados da APS os calados por trecho e por berço.

Entrada: raw/aps_calados/{wayback/*/*.html, atual/*.html, fase0/*.html}
Saídas:
  interim/aps_calados_capturas.parquet   1 linha por captura x item (trecho ou berço), valores como impressos
  interim/aps_calados_capturas_meta.parquet  1 linha por captura: revisão, data impressa, regra de preamar, ofícios
  interim/aps_limites_dwt.parquet        tabela de calado mínimo a vante / trim / imersão por DWT, por captura

Regras:
- valores numéricos são os impressos (vírgula decimal -> ponto); nada é interpolado;
- data de vigência só é preenchida quando o texto diz "entrou/entraram em vigor no dia ...";
- a data de revisão impressa ("Revisão nº N — Data: dd/mm/aaaa") fica em coluna própria;
- a data da captura do Wayback fica em `captura_ts` e nunca é usada como vigência.
Formatos encontrados:
  A  2000–2013  texto: 3 trechos, um calado (preamar com maré >= 1,00 m) + data da batimetria
  B  2014–2018  texto: 5 trechos, calado no Zero DHN "podendo ter acréscimo de até 1,0 m na preamar",
                 com frases de entrada em vigor e carta da Autoridade Portuária
  C  2018–2026  tabelas HTML: canal (BM, ou BM/PM + homologação) e berços (rowspan do trecho)
"""
from __future__ import annotations

import html as H
import re
from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup

from _comum import RAW, INTERIM

DIR = RAW / "aps_calados"
MESES = {m: i + 1 for i, m in enumerate(
    ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro",
     "outubro", "novembro", "dezembro"])}
MESES["marco"] = 3


def num(s):
    if s is None:
        return None
    m = re.search(r"(\d{1,2}),(\d{1,2})", s)
    return float(f"{m.group(1)}.{m.group(2)}") if m else None


def decodifica(b: bytes) -> str:
    cab = b[:4000].lower()
    if b"utf-8" in cab:
        return b.decode("utf-8", errors="replace")
    try:
        return b.decode("utf-8")
    except UnicodeDecodeError:
        return b.decode("latin-1")


def texto(s: str) -> str:
    s = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", " ", s, flags=re.S | re.I)
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def trecho_id(descr: str) -> str | None:
    d = descr.lower()
    m = re.search(r"trecho\s+(iv-?b|iv-?a|iv|iii|ii|i)\b", d)
    if "torre grande até alamoa" in d or "torre grande ate alamoa" in d:
        return "III+IV"
    if m:
        t = m.group(1).upper().replace("IVA", "IV-A").replace("IVB", "IV-B")
        # 2014–2018 o trecho além da Alamoa/BTP é impresso como "(Trecho IV)" duas vezes
        if t == "IV" and re.search(r"^(btp até alamoa|alamoa 02 até final|terminal alamoa até)", d):
            return "IV-B"
        return {"IV-A": "IV"}.get(t, t)
    if d.startswith("barra até entreposto"):
        return "I"
    if d.startswith("entreposto de pesca"):
        return "II"
    return None


def nome_berco(s: str) -> str:
    """Tira marcas de nota de rodapé do rótulo do berço: '(5)', '*', '³', e o '5'/'6' após 'ARM 12-A'."""
    s = re.sub(r"\s*\(\d\)\s*$", "", s).strip()
    s = re.sub(r"\s*[\*¹²³⁴⁵⁶]+$", "", s).strip()
    s = re.sub(r"^(ARM 12-A)\s+\d$", r"\1", s)
    return s


def grade(tabela) -> list[list[str]]:
    """Expande rowspan/colspan de uma <table> numa grade de textos."""
    linhas, pend = [], {}
    for tr in tabela.find_all("tr"):
        lin, col = [], 0
        cels = tr.find_all(["td", "th"])
        k = 0
        while k < len(cels) or col in pend:
            if col in pend:
                txt, rest = pend[col]
                lin.append(txt)
                pend[col] = (txt, rest - 1)
                if pend[col][1] == 0:
                    del pend[col]
                col += 1
                continue
            c = cels[k]; k += 1
            txt = re.sub(r"\s+", " ", c.get_text(" ")).strip()
            rs, cs = int(c.get("rowspan", 1) or 1), int(c.get("colspan", 1) or 1)
            for j in range(cs):
                lin.append(txt)
                if rs > 1:
                    pend[col] = (txt, rs - 1)
                col += 1
        linhas.append(lin)
    return linhas


def data_br(s):
    m = re.search(r"(\d{2})/(\d{2})/(\d{2,4})", s or "")
    if not m:
        return None
    a = int(m.group(3)); a = a + 2000 if a < 100 else a
    return f"{a:04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"


def vigencias(tx: str) -> list[dict]:
    out = []
    for m in re.finditer(r"((?:Trechos?|Calado Máximo Operacional d[oa])[^.]{0,120}?)\s*entr(?:ou|aram) em vigor no dia "
                         r"(\d{1,2}) de (\w+) de (\d{4}),? de acordo com a carta da Autoridade Portuária ([\w\-/\.]+) de (\d{2}/\d{2}/\d{4})",
                         tx, flags=re.I):
        mes = MESES.get(m.group(3).lower())
        if not mes:
            continue
        alvo = m.group(1)
        ts = re.findall(r"\b(IV|III|II|I)\b", alvo.split("Trecho")[-1] if "Trecho" in alvo else alvo)
        if "Armazém 06 até o final Alamoa 02" in alvo:
            ts = ["IV"]
        if re.search(r"Terminal Alamoa até o final|Alamoa 02 até|BTP até Alamoa", alvo):
            ts = ["IV-B"]
        out.append({"trechos": ts, "data_vigencia": f"{int(m.group(4)):04d}-{mes:02d}-{int(m.group(2)):02d}",
                    "carta": m.group(5), "data_carta": data_br(m.group(6)), "frase": m.group(0)})
    return out


def parse(arq: Path, pagina: str, captura_ts: str):
    raw = decodifica(arq.read_bytes())
    tx = texto(raw)
    meta = {"arquivo": arq.relative_to(DIR).as_posix(), "pagina": pagina, "captura_ts": captura_ts,
            "revisao_n": None, "data_revisao_impressa": None, "formato": None, "regra_preamar": None,
            "oficios_cpsp": None, "referencial": None}
    m = re.search(r"Revis[ãa]o n[º°o]?\s*(\d+)\s*(?:–|-)?\s*DATA:?\s*(\d{2}/\d{2}/\d{4})", tx, flags=re.I)
    if m:
        meta["revisao_n"], meta["data_revisao_impressa"] = int(m.group(1)), data_br(m.group(2))
    of = re.findall(r"Ofício n[°º]\s*[\d\.]+/CPSP-MB de \d{1,2} de \w+ de \d{4}", tx)
    meta["oficios_cpsp"] = "; ".join(dict.fromkeys(of)) or None
    for pat in [r"“?Preamar”? apresenta os valores máximos de calado para qualquer altura de preamar ≥ ?1,00 metro",
                r"podendo ter acréscimo de até 1,0 metro na preamar com altura de maré ≥ ?1,0 metro",
                r"Calados Máximos de operação na preamar com altura de maré ≥ ?1,00 metro em relação ao Zero DHN"]:
        mm = re.search(pat, tx, flags=re.I)
        if mm:
            meta["regra_preamar"] = mm.group(0)
            break
    itens, dwt = [], []
    vig = vigencias(tx)

    def item(**k):
        base = {"arquivo": meta["arquivo"], "pagina": pagina, "captura_ts": captura_ts}
        base.update(k)
        itens.append(base)

    soup = BeautifulSoup(raw, "lxml")
    tabelas = soup.find_all("table")
    canal_tab = [t for t in tabelas if "CANAL DE NAVEGA" in t.get_text(" ").upper()]
    berco_tab = [t for t in tabelas if re.search(r"BER[ÇC]OS", t.get_text(" ").upper()) and "CABE" in t.get_text(" ").upper()]

    if "Data da Batimetria" in tx or "Data da batimetria" in tx:
        meta["formato"] = "A"
        for m in re.finditer(r"(Barra até Entreposto de Pesca|Entreposto de Pesca até Torre Grande|Torre Grande até Alamoa|"
                             r"Entreposto de Pesca até Alamoa)\s+(\d{1,2},\d{2})\s+\S+\s+(\w+ de \d{4})", tx):
            item(tipo="trecho", item=trecho_id(m.group(1)), descricao=m.group(1),
                 calado_bm=None, calado_pm=num(m.group(2)) if meta["regra_preamar"] and "preamar" in meta["regra_preamar"].lower() else None,
                 calado_unico_impresso=num(m.group(2)), levantamento=m.group(3), valores_impressos=m.group(0))
    elif canal_tab or berco_tab:
        meta["formato"] = "C"
        for t in canal_tab:
            g = grade(t)
            cab = " ".join(" ".join(r) for r in g[:4]).upper()
            meta["referencial"] = "Zero DHN" if "ZERO DHN" in cab else None
            for r in g:
                if not r or not re.search(r"trecho|barra", r[0], flags=re.I) or r[0].upper().startswith("TRECHO") and len(r) < 2:
                    continue
                vals = [c for c in r[1:] if re.fullmatch(r"\d{1,2},\d{1,2}\s*m?", c)]
                if not vals:
                    continue
                outros = [c for c in r[1:] if c not in vals]
                hom = next((c for c in outros if re.search(r"DIPRE|DP-GD|SPA|GD/", c)), None)
                lev = next((c for c in outros if c is not hom and re.search(r"\d{4}", c)), None)
                item(tipo="trecho", item=trecho_id(r[0]), descricao=r[0],
                     calado_bm=num(vals[0]) if (len(vals) == 2 or meta["referencial"]) else None,
                     calado_pm=num(vals[1]) if len(vals) == 2 else None,
                     calado_unico_impresso=num(vals[0]) if len(vals) == 1 else None,
                     documento_homologacao=hom, data_homologacao=data_br(hom) if hom else None,
                     levantamento=lev, valores_impressos=" | ".join(r[1:]))
        for t in berco_tab:
            g = grade(t)
            cab = " ".join(" ".join(r) for r in g[:2]).upper()
            tem_projeto = "PROJETO" in cab
            for r in g[2:]:
                if len(r) < 4 or not r[0] or r[0].upper().startswith(("BER", "LOCAL")):
                    continue
                trc = next((c for c in r if re.search(r"Trecho", c)), None)
                vals = [c for c in r[3:] if re.fullmatch(r"\d{1,2},\d{1,2}(\s*\d)?", c) or re.fullmatch(r"\(\d\)", c)]
                vals = [c for c in r[3:] if c is not trc][:3 if tem_projeto else 2]
                proj, bm, pm = (vals + [None] * 3)[:3] if tem_projeto else (None, *(vals + [None, None])[:2])
                resto = [c for c in r[3:] if c not in vals and c is not trc]
                notas = re.findall(r"\((\d)\)", " ".join([r[0]] + [c for c in r if re.fullmatch(r"\(\d\)", c)]))
                item(tipo="berco", item=nome_berco(r[0]), descricao=r[0],
                     cabecos=r[1], comprimento_m=num(r[2] + ",0") if re.fullmatch(r"\d+", r[2] or "") else None,
                     profundidade_projeto=num(proj) if proj else None,
                     calado_bm=num(bm) if bm and "," in bm else None, calado_pm=num(pm) if pm and "," in pm else None,
                     remete_nota=bm if bm and bm.startswith("(") else None,
                     notas_rodape=",".join(notas) or None,
                     trecho_impresso=trc, trecho_berco=trecho_id(trc) if trc else None,
                     calado_trecho_bm=num(trc.split()[-1].split("/")[0]) if trc and "/" in trc else (num(trc) if trc else None),
                     calado_trecho_pm=num(trc.split("/")[-1]) if trc and "/" in trc else None,
                     levantamento=next((c for c in resto if re.fullmatch(r"\d{2}/\d{2}/\d{2,4}", c)), None),
                     desenho=next((c for c in resto if "_" in c), None), valores_impressos=" | ".join(r[1:]))
        for t in tabelas:
            g = grade(t)
            if g and "Porte do Navio" in " ".join(g[0]):
                for r in g[1:]:
                    dwt.append({"arquivo": meta["arquivo"], "captura_ts": captura_ts, "porte": r[0],
                                "calado_min_vante": r[1] if len(r) > 1 else None,
                                "trim_max_re": r[2] if len(r) > 2 else None,
                                "imersao_min_propulsor": r[3] if len(r) > 3 else None})
            elif g and re.match(r"ARM", g[0][0] or ""):
                for r in g[1:]:
                    item(tipo="berco_regra_especial", item=g[0][0], descricao=" | ".join(r),
                         calado_bm=num(r[-2]) if len(r) >= 2 else None, calado_pm=num(r[-1]),
                         valores_impressos=" | ".join(g[0]) + " :: " + " | ".join(r))
    elif "CALADOS MÁXIMOS DE OPERAÇÃO NO CANAL" in tx.upper() or "(Trecho I)" in tx:
        meta["formato"] = "B"
        meta["referencial"] = "Zero DHN"
        seg = tx[tx.upper().find("CALADOS MÁXIMOS DE OPERAÇÃO NO CANAL"):]
        for m in re.finditer(r"([A-ZÀ-Úa-zà-ú0-9 ,\.]+?)\s*\((Trecho [IV]+(?:-[ab])?)\)\s*(\d{1,2},\d{2})\s*m\s+([A-ZÇa-zç]+\s+\d{4})", seg):
            d = f"{m.group(1).strip()} ({m.group(2)})"
            item(tipo="trecho", item=trecho_id(d), descricao=d, calado_bm=num(m.group(3)), calado_pm=None,
                 calado_unico_impresso=num(m.group(3)), levantamento=m.group(4), valores_impressos=m.group(0))
    else:
        meta["formato"] = "sem_tabela_de_calado"
    # 2014–2018: o segundo "(Trecho IV)" da mesma captura é o trecho além da Alamoa/BTP
    vistos = set()
    for it in itens:
        if it["tipo"] == "trecho":
            if it["item"] == "IV" and "IV" in vistos:
                it["item"] = "IV-B"
            vistos.add(it["item"])
    # vigência impressa por trecho
    for it in itens:
        if it["tipo"] != "trecho":
            continue
        for v in vig:
            if it["item"] in v["trechos"]:
                it.update(data_vigencia_impressa=v["data_vigencia"], carta_vigencia=v["carta"], data_carta=v["data_carta"])
    meta["n_itens"] = len(itens)
    meta["frases_vigencia"] = " || ".join(v["frase"] for v in vig) or None
    return meta, itens, dwt


def main():
    metas, itens, dwts = [], [], []
    arqs = []
    for f in sorted((DIR / "wayback").glob("*/*.html")):
        arqs.append((f, f.parent.name, f.stem))
    for sub in ("fase0", "atual"):
        for f in sorted((DIR / sub).glob("*.html")):
            arqs.append((f, f"aps_{sub}", f.stem[:8] + "000000"))
    for f, pag, ts in arqs:
        m, its, dw = parse(f, pag, ts)
        metas.append(m); itens += its; dwts += dw
    M = pd.DataFrame(metas); I = pd.DataFrame(itens); W = pd.DataFrame(dwts)
    M.to_parquet(INTERIM / "aps_calados_capturas_meta.parquet", index=False)
    I.to_parquet(INTERIM / "aps_calados_capturas.parquet", index=False)
    W.to_parquet(INTERIM / "aps_limites_dwt.parquet", index=False)
    print(M.groupby(["pagina", "formato"]).size())
    print(I.groupby(["pagina", "tipo"]).size())


if __name__ == "__main__":
    main()
