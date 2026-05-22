"""
Re-rotula os 112 eventos do dataset expandido com severidade OPERACIONAL
baseada em anomalia de tonelagem ANTAQ (gap #1).

Metodologia:
  Para cada (porto, mês), ajustar regressão linear ton = a + b·ano nos demais
  anos (deixar o ano-alvo de fora). Resíduo padronizado = (ton_obs - prev) / σ_res.
  Anomalia operacional do evento = mediana dos resíduos padronizados dos
  4 portos principais (Manaus, Itacoatiara, Santarém, Itaituba).

  Severidade 1-5 via quantis empíricos da distribuição de anomalias:
    P00-P20  → sev 1 (saudável)
    P20-P40  → sev 2
    P40-P60  → sev 3
    P60-P80  → sev 4
    P80-P100 → sev 5 (queda extrema)
"""

import os, csv, json, statistics
from collections import defaultdict
from datetime import datetime

ROOT = r"C:\Users\bruno\OneDrive\Documents\Claude\Hidrovias\hidrovia-dashboard"
TON_PATH = os.path.join(ROOT, "data", "antaq", "tonelagem_tabocal_mensal.csv")

PORTOS_FOCO = ["Manaus", "Itacoatiara", "Santarém", "Itaituba"]

# ── 1. Carrega tonelagem mensal ─────────────────────────────────────────
ton = defaultdict(lambda: defaultdict(float))   # ton[porto][(ano,mes)] = tonelagem
with open(TON_PATH, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        ano = int(row["ano"]); mes = int(row["mes"])
        porto = row["porto"]; t = float(row["tonelagem_t"])
        ton[porto][(ano, mes)] = t

# ── 2. Calcula resíduos padronizados por (porto, mes) ───────────────────
# Para cada (porto, mes), ajustar OLS ton = a + b·ano usando TODOS os anos
# disponíveis. Resíduo = ton_obs - previsto. Padronizado = resíduo / σ_res.
residuos = defaultdict(dict)  # residuos[porto][(ano,mes)] = z-score

for porto in PORTOS_FOCO:
    for mes in range(1, 13):
        pares = [(ano, t) for (a, m), t in ton[porto].items() if m == mes for ano in [a]]
        # corrigir: itera diretamente
        pares = [(a, t) for (a, m), t in ton[porto].items() if m == mes]
        if len(pares) < 5:
            continue
        anos = [p[0] for p in pares]; ts = [p[1] for p in pares]
        ma = sum(anos) / len(anos); mt = sum(ts) / len(ts)
        num = sum((a - ma) * (t - mt) for a, t in pares)
        den = sum((a - ma) ** 2 for a in anos)
        b = num / den if den > 0 else 0
        a_int = mt - b * ma
        # Resíduos
        res = [(a, t - (a_int + b * a)) for a, t in pares]
        sigma_res = statistics.stdev([r for _, r in res]) if len(res) >= 2 else 1e-9
        if sigma_res < 1e-6:
            sigma_res = 1e-6
        for ano, r in res:
            residuos[porto][(ano, mes)] = r / sigma_res

# ── 3. Carrega 112 eventos expandidos ───────────────────────────────────
EXP_PATH = os.path.join(ROOT, "lib", "eventos-tabocal-expandidos.ts")
with open(EXP_PATH, "r", encoding="utf-8") as f:
    raw = f.read()
import re
m = re.search(r"EVENTOS_TABOCAL_EXPANDIDOS:\s*EventoTabocalExpandido\[\]\s*=\s*(\[[\s\S]*?\]);", raw)
eventos = json.loads(m.group(1))

# ── 4. Atribui anomalia operacional a cada evento ───────────────────────
# anomalia = -mediana dos z-scores dos 4 portos (negativo porque queremos
# "queda" como anomalia POSITIVA, ie sev alta = z baixo = ton abaixo do esperado)
n_cobertos = 0
anomalias_listadas = []
for e in eventos:
    ano = e["ano"]; mes = e["mes"]
    zs = []
    for porto in PORTOS_FOCO:
        if (ano, mes) in residuos[porto]:
            zs.append(residuos[porto][(ano, mes)])
    if len(zs) < 2:
        e["anomalia_operacional"] = None
        e["zscores_portos"] = None
        continue
    # Mediana negativa: queda = anomalia alta (severidade alta)
    anom = -statistics.median(zs)
    e["anomalia_operacional"] = round(anom, 3)
    e["zscores_portos"] = {p: round(residuos[p].get((ano, mes), float("nan")), 3) for p in PORTOS_FOCO if (ano, mes) in residuos[p]}
    anomalias_listadas.append((anom, e))
    n_cobertos += 1

print(f"Eventos cobertos por ANTAQ: {n_cobertos} / {len(eventos)}")

# ── 5. Mapeia para severidade 1-5 via quantis ──────────────────────────
anomalias_sorted = sorted([a for a, _ in anomalias_listadas])
n = len(anomalias_sorted)
limiares = [
    anomalias_sorted[int(n * 0.20)],
    anomalias_sorted[int(n * 0.40)],
    anomalias_sorted[int(n * 0.60)],
    anomalias_sorted[int(n * 0.80)],
]
print(f"Limiares severidade (anomalia operacional):")
for i, l in enumerate(limiares):
    print(f"  P{(i+1)*20}: {l:+.3f}")

def sev_de_anomalia(a):
    if a <= limiares[0]: return 1
    if a <= limiares[1]: return 2
    if a <= limiares[2]: return 3
    if a <= limiares[3]: return 4
    return 5

for e in eventos:
    if e.get("anomalia_operacional") is not None:
        e["sevOp"] = sev_de_anomalia(e["anomalia_operacional"])
    else:
        e["sevOp"] = None

# ── 6. Compara sev_externa (P_DOY) vs sev_operacional ──────────────────
cobertos = [e for e in eventos if e["sevOp"] is not None]
def spearman(x, y):
    from statistics import mean
    n = len(x)
    rxs = [sorted(x).index(v) + 1 for v in x]  # quick & dirty (com empates)
    rys = [sorted(y).index(v) + 1 for v in y]
    mx, my = mean(rxs), mean(rys)
    num = sum((rxs[i]-mx)*(rys[i]-my) for i in range(n))
    dx  = sum((rxs[i]-mx)**2 for i in range(n))
    dy  = sum((rys[i]-my)**2 for i in range(n))
    return num / (dx*dy)**0.5 if dx>0 and dy>0 else 0

sev_ext = [e["sevExt"] for e in cobertos]
sev_op  = [e["sevOp"]  for e in cobertos]
rho = spearman(sev_ext, sev_op)
print(f"\nρ(sev_externa, sev_operacional): {rho:.3f}")
print(f"  Se ρ alto → as duas rotulagens batem (gap #1 confirma gap atual)")
print(f"  Se ρ baixo → as duas rotulagens divergem (gap #1 abre nova realidade)")

# Distribuição
from collections import Counter
print(f"\nDistribuição sev_op: {sorted(Counter(sev_op).items())}")
print(f"Distribuição sev_ext (entre cobertos): {sorted(Counter(sev_ext).items())}")

# ── 7. Salva artefato ──────────────────────────────────────────────────
import subprocess
try:
    git_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT).decode().strip()
    git_dirty = len(subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT).decode().strip()) > 0
except:
    git_sha = "unknown"; git_dirty = False

out = {
    "metodologia": "Anomalia operacional = -mediana dos z-scores (residuos OLS ton = a + b*ano) nos 4 portos do cluster Tabocal. Severidade 1-5 via quantis empiricos.",
    "n_eventos": len(eventos),
    "n_cobertos_antaq": n_cobertos,
    "rho_sev_externa_vs_operacional": round(rho, 4),
    "portos_foco": PORTOS_FOCO,
    "limiares_quantis": [round(l, 3) for l in limiares],
    "eventos": eventos,
    "git_sha": git_sha,
    "git_dirty": git_dirty,
    "gerado_em": datetime.utcnow().isoformat() + "Z",
}

OUT_PATH = os.path.join(ROOT, "data", "antaq", "eventos-tabocal-sevop.json")
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f"\n[OK] Gerado: {OUT_PATH}")
