"""
Parser ANTAQ — extrai tonelagem mensal do cluster Tabocal (2010-2025).

GAP #1 do IRC: rótulo operacional para calibração. Substitui severidade
hidrológica (P_DOY de cotas) por severidade operacional (anomalia de
tonelagem efetivamente transportada).

Cluster Tabocal: portos cuja operação depende do CMR do canal de Tabocal:
  - Manaus (Amazonas)
  - Itacoatiara (Amazonas) — porto crítico
  - Itaituba (Pará, Tapajós-Amazonas)
  - Santarém (Pará)
  - Juruti (Pará, bauxita)

Saída: data/antaq/tonelagem_tabocal_mensal.csv com colunas:
  ano,mes,porto,tonelagem_t,n_atracacoes
"""

import os, sys, zipfile, csv, io
from collections import defaultdict
from datetime import datetime

DADOS_ANTAQ = r"C:\Users\bruno\OneDrive\Documents\GitHub\ANTAQ\dados"
OUT_DIR     = r"C:\Users\bruno\OneDrive\Documents\Claude\Hidrovias\hidrovia-dashboard\data\antaq"
os.makedirs(OUT_DIR, exist_ok=True)

PORTOS_TABOCAL = {"Manaus", "Itacoatiara", "Itaituba", "Santarém", "Juruti"}

def parse_decimal(s):
    """ANTAQ usa virgula como decimal."""
    if not s or s == "":
        return 0.0
    try:
        return float(s.replace(",", "."))
    except:
        return 0.0

def parse_ano(ano):
    """Processa um ano: retorna lista de (ano, mes, porto, tonelagem_t)."""
    atracacao_zip = os.path.join(DADOS_ANTAQ, str(ano), "Atracacao.zip")
    carga_zip     = os.path.join(DADOS_ANTAQ, str(ano), "Carga.zip")
    if not os.path.exists(atracacao_zip) or not os.path.exists(carga_zip):
        return []

    # ── 1. Lê Atracacao.txt, filtra cluster Tabocal + Interior ────────────
    # Mapeia IDAtracacao → (mes, porto)
    atrac_filtered = {}
    with zipfile.ZipFile(atracacao_zip) as zf:
        nome = [n for n in zf.namelist() if n.endswith(".txt")][0]
        with zf.open(nome) as f:
            reader = csv.reader(io.TextIOWrapper(f, encoding="utf-8-sig"), delimiter=";")
            header = next(reader)
            # Indices
            i_id  = header.index("IDAtracacao")
            i_mun = header.index("Município")
            i_nav = header.index("Tipo de Navegação da Atracação")
            i_dat = header.index("Data Atracação")
            i_mes = header.index("Mes")
            for row in reader:
                if len(row) <= max(i_id, i_mun, i_nav, i_dat, i_mes):
                    continue
                mun = row[i_mun].strip()
                nav = row[i_nav].strip()
                if mun not in PORTOS_TABOCAL: continue
                if nav != "Interior": continue
                data_atrac = row[i_dat].strip()
                # Data Atracação formato DD/MM/YYYY HH:MM:SS
                try:
                    dt = datetime.strptime(data_atrac.split()[0], "%d/%m/%Y")
                    mes_num = dt.month
                except:
                    continue
                atrac_filtered[row[i_id]] = (mes_num, mun)

    if not atrac_filtered:
        print(f"  {ano}: nenhuma atracação Tabocal+Interior")
        return []

    # ── 2. Lê Carga.txt, joina com atracações filtradas ──────────────────
    # Soma VLPesoCargaBruta por (mes, porto)
    agg = defaultdict(lambda: {"ton": 0.0, "n": 0})
    with zipfile.ZipFile(carga_zip) as zf:
        nome = [n for n in zf.namelist() if n.endswith(".txt")][0]
        with zf.open(nome) as f:
            reader = csv.reader(io.TextIOWrapper(f, encoding="utf-8-sig"), delimiter=";")
            header = next(reader)
            i_atrac = header.index("IDAtracacao")
            i_peso  = header.index("VLPesoCargaBruta")
            for row in reader:
                if len(row) <= max(i_atrac, i_peso):
                    continue
                id_atrac = row[i_atrac]
                if id_atrac not in atrac_filtered: continue
                peso = parse_decimal(row[i_peso])
                mes, porto = atrac_filtered[id_atrac]
                key = (mes, porto)
                agg[key]["ton"] += peso
                agg[key]["n"]   += 1

    resultados = []
    for (mes, porto), v in sorted(agg.items()):
        resultados.append((ano, mes, porto, v["ton"], v["n"]))
    return resultados

# ── Main ────────────────────────────────────────────────────────────────
ANOS = list(range(2010, 2026))
todos = []
for ano in ANOS:
    print(f"Processando {ano}...", end=" ", flush=True)
    r = parse_ano(ano)
    print(f"{len(r)} (mes, porto) com dado")
    todos.extend(r)

# Escreve CSV
out_path = os.path.join(OUT_DIR, "tonelagem_tabocal_mensal.csv")
with open(out_path, "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    w.writerow(["ano", "mes", "porto", "tonelagem_t", "n_atracacoes"])
    for ano, mes, porto, ton, n in todos:
        w.writerow([ano, mes, porto, f"{ton:.0f}", n])

print(f"\n✓ Gerado: {out_path}")
print(f"  {len(todos)} linhas totais")

# Resumo por ano (total tonelagem)
ano_total = defaultdict(float)
for ano, mes, porto, ton, n in todos:
    ano_total[ano] += ton
print("\nResumo (tonelagem total cluster Tabocal):")
for ano in sorted(ano_total):
    print(f"  {ano}: {ano_total[ano]/1e6:.2f} mi t")
