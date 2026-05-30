"""
Parser dos boletins SACE/SGB (PDFs já baixados) -> JSON estruturado.

Cada bacia tem layout próprio:
  - Amazonas, Madeira, Branco: pdfplumber.extract_tables() funciona bem.
  - Acre: tabela achatada — parse via regex no texto.
  - Xingu: sem tabela extraível; parse via regex no texto.

Saída:
  public/data/sace/boletins/dados.json
  public/data/sace/boletins/{bacia}/{YYYYMMDD}.json
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "data" / "sace" / "boletins"


@dataclass
class Estacao:
    rio: str | None
    estacao: str
    municipio: str | None = None
    nivel_cm: int | None = None
    variacao_cm: int | None = None
    variacao_periodo: str | None = None      # "24h" ou "7d"
    data_medicao: str | None = None          # ISO
    hora_medicao: str | None = None          # HH:MM
    cota_inundacao_cm: int | None = None
    cota_mediana_cm: int | None = None
    chuva_24h_mm: float | None = None
    chuva_96h_mm: float | None = None
    previsao: str | None = None
    observacoes: str | None = None


@dataclass
class BoletimParsed:
    bacia: str
    data: str                       # YYYY-MM-DD
    numero: str | None
    titulo: str | None
    pdf_path: str
    sintese: str | None             # texto resumido
    estacoes: list[Estacao] = field(default_factory=list)


# ----------------------------- helpers ---------------------------------

def to_int(s: str | None) -> int | None:
    if s is None: return None
    s = s.strip().replace(",", ".")
    if not s or s in {"-", "#", "*", "///", "**"}: return None
    try:
        return int(float(s))
    except ValueError:
        return None


def to_float(s: str | None) -> float | None:
    if s is None: return None
    s = s.strip().replace(",", ".")
    if not s or s in {"-", "#", "*", "///"}: return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_data_hora_br(s: str | None) -> tuple[str | None, str | None]:
    """'26/05/2026 07:15' -> ('2026-05-26', '07:15')."""
    if not s: return None, None
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?", s)
    if not m: return None, None
    d, mo, y = m.group(1), m.group(2), m.group(3)
    hora = f"{int(m.group(4)):02d}:{m.group(5)}" if m.group(4) else None
    return f"{y}-{mo}-{d}", hora


def clean_cell(s: str | None) -> str | None:
    if s is None: return None
    s = s.replace("\n", " ").strip()
    return s or None


# --------------------------- parsers por bacia --------------------------

def parse_amazonas(pdf_path: Path) -> list[Estacao]:
    """Tabela 01: Rio | Município/Estação | Nível atual | Var 24h | Data | Máx | Mín."""
    estacoes: list[Estacao] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table or len(table) < 2: continue
                header = " ".join((c or "") for c in table[0]).lower()
                if "rio" not in header or "n" not in header: continue
                for row in table[1:]:
                    if len(row) < 5: continue
                    rio       = clean_cell(row[0])
                    estacao   = clean_cell(row[1])
                    nivel     = to_int(row[2])
                    var24h    = to_int(row[3])
                    data, _   = parse_data_hora_br(row[4])
                    if not estacao or nivel is None: continue
                    estacoes.append(Estacao(
                        rio=rio, estacao=estacao, nivel_cm=nivel,
                        variacao_cm=var24h, variacao_periodo="24h",
                        data_medicao=data,
                    ))
    return estacoes


def parse_madeira(pdf_path: Path) -> list[Estacao]:
    """Tabela: Estação | Curso d'água | Município | Horário | Nível | Var 7d | Mediana | Previsão."""
    estacoes: list[Estacao] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table or len(table) < 3: continue
                header = " ".join((c or "") for c in table[0]).lower()
                if "esta" not in header or ("nível" in header or "n" in header) is False:
                    pass
                if "esta" not in header: continue
                # Linha [0] = header, [1..n] = continuação de header + dados
                for row in table[1:]:
                    if not row or all(c is None or not str(c).strip() for c in row): continue
                    nome = clean_cell(row[0])
                    if not nome or nome.lower().startswith(("nome", "cota", "(cm)")): continue
                    if len(row) < 7: continue
                    rio       = clean_cell(row[1])
                    municipio = clean_cell(row[2])
                    data, hora = parse_data_hora_br(row[3])
                    nivel     = to_int(row[4])
                    var7d     = to_int(row[5])
                    mediana   = to_int(row[6])
                    previsao_cota = clean_cell(row[7]) if len(row) > 7 else None
                    if nivel is None: continue
                    estacoes.append(Estacao(
                        rio=rio, estacao=nome, municipio=municipio,
                        nivel_cm=nivel, variacao_cm=var7d, variacao_periodo="7d",
                        data_medicao=data, hora_medicao=hora,
                        cota_mediana_cm=mediana, previsao=previsao_cota,
                    ))
    return estacoes


def parse_branco(pdf_path: Path) -> list[Estacao]:
    """Tabela: Estação | Rio | Município | Horário | Nível | Var 24h | Observações."""
    estacoes: list[Estacao] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table or len(table) < 3: continue
                header = " ".join((c or "") for c in table[0]).lower()
                if "esta" not in header: continue
                for row in table[1:]:
                    if not row or all(c is None or not str(c).strip() for c in row): continue
                    nome = clean_cell(row[0])
                    if not nome or nome.lower().startswith(("nome", "(cm)")): continue
                    if len(row) < 6: continue
                    rio       = clean_cell(row[1])
                    municipio = clean_cell(row[2])
                    data, hora = parse_data_hora_br(row[3])
                    nivel     = to_int(row[4])
                    var24h    = to_int(row[5])
                    obs       = clean_cell(row[6]) if len(row) > 6 else None
                    cota_inund = None
                    if obs:
                        m = re.search(r"inunda[çc][ãa]o\s*[:=]?\s*(\d+)", obs, re.I)
                        if m: cota_inund = int(m.group(1))
                    if nivel is None: continue
                    estacoes.append(Estacao(
                        rio=rio, estacao=nome, municipio=municipio,
                        nivel_cm=nivel, variacao_cm=var24h, variacao_periodo="24h",
                        data_medicao=data, hora_medicao=hora,
                        cota_inundacao_cm=cota_inund, observacoes=obs,
                    ))
    return estacoes


# Acre: tabela achatada. Estações conhecidas (estacao, municipio).
# Match pelo prefixo da linha após `re.sub("/\n", "/", texto)`.
ESTACOES_ACRE = [
    ("ASSIS BRASIL",                "ASSIS BRASIL"),
    ("BRASILÉIA / EPITACIOLÂNDIA",  "BRASILÉIA"),
    ("XAPURI",                      "XAPURI"),
    ("RIO BRANCO",                  "RIO BRANCO"),
]

RE_ACRE_LINHA = re.compile(
    r"(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})\s+"  # data hora
    r"([\d,]+|\*)\s+([\d,]+|\*)\s+"            # chuva 24h, 96h (mm)
    r"(-?\d+|\*|#)\s+(-?\d+|\*|#)\s+"          # nível, var 24h (cm)
    r"(\d+|\*|#)"                              # cota de inundação (cm)
)


def parse_acre(pdf_path: Path, txt_path: Path) -> list[Estacao]:
    """
    PDF do Acre tem layout que pdfplumber achata em linhas tipo:
      ASSIS BRASIL ASSIS BRASIL 19/05/2026 04:15 2,8 2,8 449 -26 1250
      BRASILÉIA /
      BRASILÉIA 19/05/2026 04:15 0,6 7,2 258 71 1140  ← data line
      EPITACIOLÂNDIA
      XAPURI XAPURI 19/05/2026 04:30 ...
      RIO BRANCO RIO BRANCO 19/05/2026 04:45 ...

    Estratégia: para cada linha com data+hora, parseia números e usa o
    PREFIXO (texto antes da data) para identificar a estação via lookup.
    """
    if not txt_path.exists(): return []
    texto = txt_path.read_text(encoding="utf-8")

    PREFIXO_PARA_ESTACAO = {
        # chave: prefixo normalizado (uppercased, sem espaços múltiplos) → (estacao, mun)
        "ASSIS BRASIL ASSIS BRASIL":     ("ASSIS BRASIL",               "ASSIS BRASIL"),
        "BRASILÉIA":                      ("BRASILÉIA / EPITACIOLÂNDIA", "BRASILÉIA"),
        "XAPURI XAPURI":                  ("XAPURI",                     "XAPURI"),
        "RIO BRANCO RIO BRANCO":          ("RIO BRANCO",                 "RIO BRANCO"),
    }

    RE_LINHA = re.compile(
        r"^(.+?)\s+(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})\s+"
        r"([\d,]+|\*)\s+([\d,]+|\*)\s+"
        r"(-?\d+|\*|#)\s+(-?\d+|\*|#)\s+"
        r"(\d+|\*|#)\s*$",
        re.MULTILINE,
    )

    estacoes: list[Estacao] = []
    for m in RE_LINHA.finditer(texto):
        prefix_raw, data, hora, ch24, ch96, nivel, var, ci = m.groups()
        prefix = " ".join(prefix_raw.upper().split())
        if prefix not in PREFIXO_PARA_ESTACAO: continue
        est, mun = PREFIXO_PARA_ESTACAO[prefix]
        data_iso, _ = parse_data_hora_br(f"{data} {hora}")
        estacoes.append(Estacao(
            rio="Acre", estacao=est, municipio=mun,
            data_medicao=data_iso, hora_medicao=hora,
            chuva_24h_mm=to_float(ch24), chuva_96h_mm=to_float(ch96),
            nivel_cm=to_int(nivel), variacao_cm=to_int(var),
            variacao_periodo="24h", cota_inundacao_cm=to_int(ci),
        ))
    return estacoes


# Xingu: parse via síntese textual. Estações conhecidas: Altamira (Xingu),
# Pedra do Ó (Iriri), Boa Esperança (Fresco), Boa Sorte (São Félix do Xingu).
RE_XINGU_VAR = re.compile(
    r"(redu[çc][ãa]o|eleva[çc][ãa]o|elevou|reduziu)[^.]*?(\d+)\s*cm",
    re.IGNORECASE,
)


def parse_xingu(pdf_path: Path, txt_path: Path) -> list[Estacao]:
    """Extrai variação semanal por estação a partir da síntese textual."""
    estacoes: list[Estacao] = []
    texto = txt_path.read_text(encoding="utf-8") if txt_path.exists() else ""

    # Padrões de extração baseados na síntese
    # [\s\S]*? em vez de [^.]*? para atravessar pontuação (parágrafo segmentado)
    patterns = [
        ("Xingu",  "Altamira",       "Altamira",            r"esta[çc][ãa]o de Altamira[\s\S]*?(ELEVOU|REDUZ|redu[çc][ãa]o)[\s\S]{0,80}?(\d+)\s*cm"),
        ("Iriri",  "Pedra do Ó",     None,                   r"Pedra do Ó[\s\S]{0,300}?(redu[çc][ãa]o|eleva[çc][ãa]o)[\s\S]{0,30}?de\s+(\d+)\s*cm"),
        ("Fresco", "Boa Esperança",  None,                   r"Boa Esperan[çc]a[\s\S]{0,300}?(redu[çc][ãa]o|eleva[çc][ãa]o)[\s\S]{0,30}?de\s+(\d+)\s*cm"),
        ("Xingu",  "Boa Sorte",      "São Félix do Xingu",   r"Boa Sorte[\s\S]{0,300}?(reduziu|elevou)\s+(\d+)\s*cm"),
    ]
    for rio, est, mun, pat in patterns:
        m = re.search(pat, texto, re.IGNORECASE)
        if not m: continue
        verbo, valor = m.group(1).lower(), int(m.group(2))
        sinal = -1 if "redu" in verbo else 1
        estacoes.append(Estacao(
            rio=rio, estacao=est, municipio=mun,
            variacao_cm=sinal * valor, variacao_periodo="7d",
            observacoes="Variação extraída da síntese textual (tabela não estruturada no PDF).",
        ))
    return estacoes


# ------------------------------ síntese ---------------------------------

def extrair_sintese(txt_path: Path) -> str | None:
    if not txt_path.exists(): return None
    texto = txt_path.read_text(encoding="utf-8")
    # Pega o primeiro parágrafo do "Resumo:" ou "SÍNTESE" ou após "1. Resumo"
    for marker in ("SÍNTESE DO BOLETIM", "Síntese do Boletim", "Resumo:", "1. Resumo"):
        idx = texto.find(marker)
        if idx >= 0:
            trecho = texto[idx + len(marker): idx + len(marker) + 1200]
            # Corta na próxima seção/figura
            trecho = re.split(r"\n(?:--- PAG ---|Tabela|Figura|Legenda)", trecho)[0]
            return re.sub(r"\s+", " ", trecho).strip(" :\n\t") or None
    return None


# ------------------------------ main ------------------------------------

PARSERS = {
    "amazonas": parse_amazonas,
    "madeira":  parse_madeira,
    "branco":   parse_branco,
}

def main() -> None:
    indice_path = OUT_DIR / "index.json"
    indice = json.loads(indice_path.read_text(encoding="utf-8"))

    resultados: list[BoletimParsed] = []
    for b in indice["boletins"]:
        bacia_lower = b["bacia"].lower()
        pdf_path = ROOT / b["pdf_path"]
        txt_path = ROOT / b["txt_path"]

        if bacia_lower in PARSERS:
            estacoes = PARSERS[bacia_lower](pdf_path)
        elif bacia_lower == "acre":
            estacoes = parse_acre(pdf_path, txt_path)
        elif bacia_lower == "xingu":
            estacoes = parse_xingu(pdf_path, txt_path)
        else:
            estacoes = []

        parsed = BoletimParsed(
            bacia=b["bacia"],
            data=b["data"],
            numero=b.get("numero"),
            titulo=b.get("titulo"),
            pdf_path=b["pdf_path"],
            sintese=extrair_sintese(txt_path),
            estacoes=estacoes,
        )
        resultados.append(parsed)

        # Salva JSON por boletim
        per_bol = OUT_DIR / bacia_lower / f"{b['data'].replace('-', '')}.json"
        per_bol.write_text(
            json.dumps(asdict(parsed), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"  {b['bacia']:10} {b['data']}  {len(estacoes):>3} estacoes")

    # Salva JSON consolidado
    consolidado = {
        "mes": indice["mes"],
        "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "total_boletins": len(resultados),
        "total_estacoes": sum(len(r.estacoes) for r in resultados),
        "boletins": [asdict(r) for r in resultados],
    }
    out = OUT_DIR / "dados.json"
    out.write_text(json.dumps(consolidado, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n-> {consolidado['total_estacoes']} medicoes em {consolidado['total_boletins']} boletins")
    print(f"-> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
