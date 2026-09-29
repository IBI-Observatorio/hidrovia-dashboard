"""Extrai a estrutura do PNL 2050 (objetivos, eixos, empreendimentos) do PDF oficial.

Uso:
    python scripts/pnl2050/extrai_pnl2050.py [caminho_do_pdf]

Saída: public/data/pnl2050/pnl2050.json

O script FALHA (exit 1) se a extração não bater com os totais declarados no próprio
PDF: 112 objetivos por categoria e a "Qtd. de intervenções estruturantes" de cada
eixo. Divergências conferidas à mão entram em EXCECOES_QTD com a justificativa.
Ver docs/pnl2050-spec.md.
"""

from __future__ import annotations

import collections
import datetime as dt
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

from pypdf import PdfReader

PDF_PADRAO = Path(
    r"C:\Users\bruno\OneDrive\Documents\IBI\Observatório\PNL2050"
    r"\Plano-Nacional-de-Logistica-2050-Relatorio-Completo-1a-Edicao-Agosto-2026.pdf"
)
SAIDA = Path(__file__).resolve().parents[2] / "public" / "data" / "pnl2050" / "pnl2050.json"

# Categoria → (rótulo, quantidade declarada no PNL)
CATEGORIAS = {
    "EXP": ("Problemas de cargas para exportação", 18),
    "DOM": ("Problemas de cargas para o mercado doméstico", 23),
    "ABA": ("Problemas de cargas para abastecimento interno", 13),
    "PSAT": ("Passageiros — saturação de eixos consolidados", 3),
    "PEXC": ("Passageiros — exclusão e acessibilidade", 5),
    "ABR": ("Problemas abrangentes do transporte", 17),
    "DEM": ("Demandas emergentes por transporte", 12),
    "OPP": ("Oportunidades — produções regionais específicas", 8),
    "OPR": ("Oportunidades — crescimento econômico regional", 13),
}

# Cabeçalhos de categoria como aparecem nas fichas de eixo (ordem importa: mais longo antes).
CABECALHOS = [
    (r"Problemas (?:(?:específicos|abrangentes) )?do transporte de passageiros: saturação", "PSAT"),
    (r"Problemas (?:específicos )?do transporte de passageiros: exclusão e acessibilidade", "PEXC"),
    (r"Problemas específicos do transporte de cargas para exportação", "EXP"),
    (r"Problemas específicos do transporte de cargas para o mercado doméstico", "DOM"),
    (r"Problemas específicos do transporte de cargas para abastecimento interno", "ABA"),
    (r"Problemas abrangentes do transporte", "ABR"),
    (r"Demandas emergentes por transporte", "DEM"),
    (r"Oportunidades de desenvolvimento de produções regionais específicas", "OPP"),
    (r"Oportunidades de desenvolvimento econômico regional", "OPR"),
]

NIVEIS = {"muito alto": "Muito alto", "alto": "Alto", "médio": "Médio", "baixo": "Baixo"}

MODAL_POR_PREFIXO = {"1": "rodovia", "2": "ferrovia", "3": "hidrovia", "4": "porto", "5": "aeroporto"}

TIPOS = (
    r"Impl(?:antação|atanção)\s*[-–]?\s*(?:[Gg]reenfield|[Bb]rownfield)|Expansão|Manutenção|Melhoria|"
    r"Consolidação|Em obras"
)
JURISDICOES = r"(?:Federal|Estadual|Municipal|Internacional|Privad[oa])"
BITOLAS = r"(?:(?:Larga|Métrica|Métrida|Mista|A definir)(?:\s*\((?:prevista|projetada)\))?)"

# Eixos cuja contagem de IDs únicos diverge da "Qtd." declarada, conferidos à mão.
# formato: "A001": "justificativa"
EXCECOES_QTD: dict[str, str] = {
    "R007": (
        "Conferido na imagem das págs. 436–437 do PDF em 27/09/2026: as tabelas listam "
        "21 IDs rodoviários + 4 complexos portuários = 25; o cabeçalho da ficha declara 24. "
        "Inconsistência do próprio PNL; mantemos as 25 listadas."
    ),
}


def limpa(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]", "", s).strip()


def le_paginas(pdf: Path) -> list[str]:
    r = PdfReader(str(pdf))
    # índice 0 vazio para que paginas[n] = página n do PDF (1-based)
    return [""] + [limpa(p.extract_text() or "") for p in r.pages]


# --------------------------------------------------------------------------- objetivos


def extrai_objetivos(pg: list[str]) -> list[dict]:
    objs: list[dict] = []

    def add(cat, i, enunciado, pagina):
        objs.append({"chave": f"{cat}-{i}", "categoria": cat, "id": i,
                     "enunciado": limpa(enunciado), "pagina_pdf": pagina})

    # Exportação e mercado doméstico: "Problema nº N - texto PÁG" e "Demanda emergente nº N - texto PÁG"
    for paginas, cat in (((27, 28), "EXP"), ((100, 101), "DOM")):
        txt = " ".join(pg[p] for p in paginas)
        for m in re.finditer(r"Problema n[º°] (\d+) - (.+?) (\d{2,3})(?= |$)", txt):
            add(cat, int(m.group(1)), m.group(2), int(m.group(3)) + 1)
        for m in re.finditer(r"Demanda emergente n[º°] (\d+) - (.+?) (\d{2,3})(?= |$)", txt):
            add("DEM", int(m.group(1)), m.group(2), int(m.group(3)) + 1)

    for m in re.finditer(r"Problema n[º°] (\d+) - (.+?) (\d{3})(?= |$)", pg[172]):
        add("ABA", int(m.group(1)), m.group(2), int(m.group(3)) + 1)

    pas = pg[215]
    sat, exc = pas.split("Exclusão e acessibilidade", 1)
    for bloco, cat in ((sat.split("Saturação de eixos consolidados", 1)[1], "PSAT"), (exc, "PEXC")):
        for m in re.finditer(r"(\d) (.+?) (\d{3})(?= |$)", bloco):
            add(cat, int(m.group(1)), m.group(2), int(m.group(3)) + 1)

    abr = pg[243].split("Enunciado Pág.", 1)[1]
    for m in re.finditer(r"(\d{1,2}) (.+?) (\d{3})(?= |$)", abr):
        add("ABR", int(m.group(1)), m.group(2), int(m.group(3)) + 1)

    op = pg[306]
    esp, cre = op.split("Fomento ao crescimento econômico regional", 1)
    esp = esp.split("Estímulo a produções regionais específicas", 1)[1]
    for bloco, cat in ((esp, "OPP"), (cre, "OPR")):
        for m in re.finditer(r"(\d{1,2}) (.+?) (\d{3})(?= |$)", bloco):
            add(cat, int(m.group(1)), m.group(2), int(m.group(3)) + 1)

    # dedup (demandas emergentes podem repetir) e checagem de contagem
    unicos = {o["chave"]: o for o in objs}
    objs = sorted(unicos.values(), key=lambda o: (list(CATEGORIAS).index(o["categoria"]), o["id"]))
    erros = []
    for cat, (_, n) in CATEGORIAS.items():
        ids = sorted(o["id"] for o in objs if o["categoria"] == cat)
        if ids != list(range(1, n + 1)):
            erros.append(f"objetivos {cat}: esperado 1..{n}, extraído {ids}")
    if erros:
        sys.exit("FALHA na lista-mestre de objetivos:\n  " + "\n  ".join(erros))
    return objs


# --------------------------------------------------------------------------- eixos


def localiza_eixos(pg: list[str]) -> list[tuple[str, str, int, int, int]]:
    """(codigo, nome, qtd_declarada, pagina_inicio, pagina_fim_exclusiva)"""
    achados = []
    for i in range(351, 538):
        m = re.search(r"Nome do eixo (.+?) Código do eixo ((?:BP|[AFRI])\d{3}) Qtd\. de intervenções estruturantes (\d+)", pg[i])
        if m and not any(a[1] == m.group(2) for a in achados):
            achados.append((i, m.group(2), limpa(m.group(1)), int(m.group(3))))
    fins = [a[0] for a in achados[1:]]
    # fim de cada bloco: início do próximo eixo, ou o fim da seção (cenário-meta termina na 492; banco na 537)
    saida = []
    for (ini, cod, nome, qtd), fim in zip(achados, fins + [538]):
        if not cod.startswith("BP") and fim > 493:
            fim = 493
        saida.append((cod, nome, qtd, ini, fim))
    return saida


VERBOS_LINHA = (
    r"(?:Requalificação|Ampliação|Implantação|Pavimentação|Expansão|Melhoria|Consolidação|"
    r"Adequação|Duplicação|Aumento de capacidade|Construção|Recuperação|Manutenção)"
)


def extrai_intervencoes(txt: str) -> list[dict]:
    """Tabelas de empreendimentos de uma ficha → intervenções estruturantes.

    Uma intervenção começa numa linha com jurisdição (Federal/Estadual/...) e agrupa
    os IDs seguintes sem jurisdição (ex.: um complexo portuário com um ID por grupo
    de carga; uma BR com vários trechos). É essa unidade que a ficha conta em
    "Qtd. de intervenções estruturantes".
    """
    intervencoes: list[dict] = []
    vistos: set[int] = set()
    # segmentos de tabela começam em "Tipo de intervenção" (com ou sem "Bitola")
    for seg in re.split(r"Tipo (?:de )?intervenção(?: Bitola)?", txt)[1:]:
        cursor = 0
        atual = None
        for m in re.finditer(rf"(?<!\d)([1-5]\d{{3}})(?!\d)\s*({TIPOS})?", seg):
            nome = seg[cursor:m.start()].strip()
            cursor = m.end()
            nome = re.sub(rf"^{BITOLAS}\s*", "", nome).strip()
            if len(nome) > 200 or not nome:
                break  # saiu da tabela (texto corrido)
            mj = re.match(rf"({JURISDICOES}) (.*)", nome)
            if mj:
                jur, nome = mj.group(1), mj.group(2)
                # "Requalificação da BR-101 Requalificação BR-101/RS/SC (...)": grupo + 1º trecho
                partes = re.split(rf" (?={VERBOS_LINHA}\b)", nome, maxsplit=1)
                grupo, detalhe = (partes[0], partes[1]) if len(partes) == 2 else (nome, None)
                atual = {"nome": limpa(grupo), "jurisdicao": jur, "empreendimentos": []}
                intervencoes.append(atual)
            else:
                detalhe = nome
                if atual is None:
                    break
                # ID sem jurisdição e sem tipo só é válido como sub-linha de porto
                # ("Aumento de capacidade em GSA 4005"); fora disso é número solto
                # do texto corrido (ex.: o ano 2050) e a tabela acabou.
                if not m.group(2) and not re.match(r"(?:Aumento|Implantação) d[ae] capacidade", nome):
                    break
            eid = int(m.group(1))
            if eid in vistos:
                continue
            vistos.add(eid)
            atual["empreendimentos"].append({
                "id": eid,
                "modal": MODAL_POR_PREFIXO[str(eid)[0]],
                "detalhe": limpa(detalhe) if detalhe else None,
                "tipo": limpa(m.group(2)).replace("–", "-") if m.group(2) else None,
            })
    # mesma intervenção pode reaparecer em outra página da ficha: funde por nome
    fundidas: dict[str, dict] = {}
    for iv in intervencoes:
        if not iv["empreendimentos"]:
            continue
        k = norm(iv["nome"])
        if k in fundidas:
            fundidas[k]["empreendimentos"] += iv["empreendimentos"]
        else:
            fundidas[k] = iv
    for iv in fundidas.values():
        modais = {e["modal"] for e in iv["empreendimentos"]}
        iv["modal"] = modais.pop() if len(modais) == 1 else "misto"
    return list(fundidas.values())


def conta_intervencoes(intervencoes: list[dict]) -> int:
    """Regra de contagem do PNL: complexo/terminal portuário = 1 intervenção
    (um ID por grupo de carga); nos demais modos cada ID é uma intervenção
    (ex.: 'Requalificação da BR-101' com 2 trechos = 2)."""
    return sum(1 if iv["modal"] == "porto" else len(iv["empreendimentos"]) for iv in intervencoes)


def extrai_contribuicoes(txt: str) -> list[dict]:
    """Itens 'N descrição Nível' sob o cabeçalho de categoria mais próximo."""
    marcas = []
    for padrao, cat in CABECALHOS:
        for m in re.finditer(padrao, txt):
            marcas.append((m.start(), m.end(), cat))
    # no mesmo início, o cabeçalho mais longo vence: 'Problemas abrangentes do transporte'
    # é prefixo de 'Problemas abrangentes do transporte de passageiros: saturação'
    # (grafia do próprio PDF em uma ficha).
    marcas.sort(key=lambda mk: (mk[0], -mk[1]))
    filtradas = []
    for mk in marcas:
        if filtradas and mk[0] < filtradas[-1][1]:
            continue
        filtradas.append(mk)

    itens = []
    padrao_item = re.compile(r"(?<![\d/])(\d{1,2}) ([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\d]{4,220}?) (Muito [Aa]lto|Alto|Médio|Baixo)(?![a-zà-ú])")
    for k, (ini, fim, cat) in enumerate(filtradas):
        limite = filtradas[k + 1][0] if k + 1 < len(filtradas) else len(txt)
        bloco = txt[fim:limite]
        pos = 0
        for m in padrao_item.finditer(bloco):
            if m.start() - pos > 3:  # itens são contíguos; texto corrido encerra o bloco
                break
            pos = m.end() + 1
            itens.append({"categoria": cat, "id": int(m.group(1)),
                          "descricao": limpa(m.group(2)), "nivel": NIVEIS[m.group(3).lower()]})
    return itens


def main() -> None:
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else PDF_PADRAO
    pg = le_paginas(pdf)
    sha = hashlib.sha256(pdf.read_bytes()).hexdigest()

    objetivos = extrai_objetivos(pg)
    validos = {o["chave"] for o in objetivos}

    eixos = []
    todas_contrib = []
    for cod, nome, qtd, ini, fim in localiza_eixos(pg):
        txt = " ".join(pg[i] for i in range(ini, fim))
        intervencoes = extrai_intervencoes(txt)
        contrib = extrai_contribuicoes(txt)
        for c in contrib:
            c["eixo"] = cod
        todas_contrib += contrib
        eixos.append({
            "codigo": cod, "nome": nome,
            "cenario": "banco" if cod.startswith("BP") else "meta",
            "tipo": {"A": "aquaviario", "F": "ferroviario", "R": "rodoviario", "I": "intermodal", "B": "banco"}[cod[0]],
            "qtd_declarada": qtd, "pagina_pdf": ini,
            "intervencoes": intervencoes, "objetivos": [],
        })

    # Um item pode cair sob o cabeçalho errado — por intercalação na extração de texto
    # ou por erro do próprio PDF (ficha A004, pág. 369: "13 Melhora o acesso aos
    # portos" e "15 Reduz o custo logístico para a sociobiodiversidade" aparecem no
    # bloco de Oportunidades, que só vai até 8; são ABR-13 e ABR-15). A descrição de cada objetivo é padronizada entre fichas, então
    # a atribuição (categoria, id) mais frequente por descrição prevalece.
    votos: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for c in todas_contrib:
        votos[norm(c["descricao"])][(c["categoria"], c["id"])] += 1
    reatribuidos = []
    por_eixo = collections.defaultdict(dict)
    for c in todas_contrib:
        cat, i = votos[norm(c["descricao"])].most_common(1)[0][0]
        if cat == c["categoria"]:
            i = c["id"]  # dentro da mesma categoria o ID da ficha prevalece
        if (cat, i) != (c["categoria"], c["id"]):
            reatribuidos.append(f"{c['eixo']}: {c['categoria']}-{c['id']} → {cat}-{i} ({c['descricao'][:50]})")
        chave = f"{cat}-{i}"
        if chave not in validos:
            reatribuidos.append(f"{c['eixo']}: chave inexistente {chave} ({c['descricao'][:50]}) — descartada")
            continue
        atual = por_eixo[c["eixo"]].get(chave)
        ordem = ["Baixo", "Médio", "Alto", "Muito alto"]
        if not atual or ordem.index(c["nivel"]) > ordem.index(atual["nivel"]):
            por_eixo[c["eixo"]][chave] = {"chave": chave, "nivel": c["nivel"], "descricao": c["descricao"]}

    erros = []
    for e in eixos:
        e["objetivos"] = sorted(por_eixo[e["codigo"]].values(), key=lambda o: o["chave"])
        n = conta_intervencoes(e["intervencoes"])
        e["qtd_extraida"] = n
        if n != e["qtd_declarada"] and e["codigo"] not in EXCECOES_QTD:
            nomes = "; ".join(iv["nome"][:40] for iv in e["intervencoes"])
            erros.append(f"{e['codigo']}: {n} intervenções extraídas ≠ Qtd. declarada {e['qtd_declarada']} [{nomes}]")
        if not e["objetivos"]:
            erros.append(f"{e['codigo']}: nenhum objetivo extraído")

    n_meta = sum(1 for e in eixos if e["cenario"] == "meta")
    n_banco = sum(1 for e in eixos if e["cenario"] == "banco")
    if (n_meta, n_banco) != (31, 11):
        erros.append(f"eixos: esperado 31 meta + 11 banco, extraído {n_meta} + {n_banco}")

    if reatribuidos:
        print("Reatribuições por voto de descrição (conferir):")
        for r in reatribuidos:
            print("  ", r)
    if erros:
        print("\nFALHAS:")
        for er in erros:
            print("  ", er)
        sys.exit(1)

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps({
        "fonte": {
            "titulo": "Plano Nacional de Logística 2050 — Relatório Completo, 1ª edição",
            "orgao": "Ministério dos Transportes / Ministério de Portos e Aeroportos",
            "data": "2026-08",
            "arquivo": pdf.name,
            "sha256": sha,
        },
        "gerado_em": dt.date.today().isoformat(),
        "categorias": {k: {"rotulo": v[0], "quantidade": v[1]} for k, v in CATEGORIAS.items()},
        "objetivos": objetivos,
        "eixos": eixos,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK: {len(objetivos)} objetivos, {n_meta}+{n_banco} eixos, "
          f"{sum(e['qtd_extraida'] for e in eixos if e['cenario'] == 'meta')} intervenções no cenário-meta → {SAIDA}")


if __name__ == "__main__":
    main()
