#!/usr/bin/env python3
"""
Gerador do forecast de momentum do CONTÊINER — Observatório IBI.

MÉTODO CAMPEÃO (vencedor de um horse-race de 30 abordagens, validado em 38 meses OOS):
    ARIMA(1,1,1) em log(soma móvel de 12 meses da tonelagem) -> deriva o YoY.

    Em vez de prever o YoY-da-MA12 diretamente (objeto super-diferenciado, ruidoso,
    frágil a regressor externo que quebra no regime pós-2022), prevê-se o AGREGADO LISO
    (a soma de 12 meses, que muda devagar e é altamente previsível h passos à frente) e
    deriva-se a razão. É forecasting indireto por agregação temporal.

DESEMPENHO (OOS jan/2023..fev/2026, recursivo, info <= t-h):
    Theil U (RMSE/RMSE_no-change) = 0,50 em h=5 ; vence em TODOS os horizontes
    (U: 0,39 / 0,41 / 0,44 / 0,48 / 0,51 para h=1..5).
    DM vs no-change p=0,088 (margem importante mas no limiar de significância).
    Robusto à ordem (U 0,50–0,55 em (1,1,0)/(1,1,1)/(2,1,1)/(2,1,2)/(1,2,1)).
    Sem vazamento: cada alvo só treina com dados <= t-h. Viés +0,9 p.p.

ENTRADA  : série mensal de tonelagem de carga conteinerizada (ANTAQ Estatística Aquaviária).
           Por padrão lê o payload do protótipo (PAYLOAD.series, serie=='natureza:conteinerizada').
SAÍDA    : lib/forecast-conteiner.json  (consumido pelo componente do dashboard).

Rodar quando a ANTAQ divulgar um novo mês:
    python scripts/forecast_conteiner.py --payload caminho/para/payload.json --out lib/forecast-conteiner.json
"""
import json, argparse, warnings
import numpy as np, pandas as pd
warnings.filterwarnings("ignore")
from statsmodels.tsa.arima.model import ARIMA

ORDEM = (1, 1, 1)   # ordem campeã
H_MAX = 5           # horizonte do produto (meses à frente)
CORTE_TREINO = "2022-12"   # fim do treino p/ o backtest OOS (regime pré-quebra)


def carrega_mensal_do_payload(path):
    """Extrai a tonelagem mensal de contêiner do payload do protótipo."""
    d = json.load(open(path, encoding="utf-8"))
    mc = {r["data"]: r["mensal_mt"] for r in d["series"]
          if r["serie"] == "natureza:conteinerizada"}
    return mc


def constroi(mensal: dict):
    P = pd.PeriodIndex(sorted(mensal), freq="M")
    s = pd.Series([mensal[str(p)] for p in P], index=P)
    sum12 = s.rolling(12).sum()
    mom = (sum12 / sum12.shift(12) - 1) * 100   # = yoy_ma_pct
    return s, sum12, mom


def champ_at(sl, sum12, t, h):
    """Previsão recursiva do momentum no mês t, usando só info <= t-h."""
    hist = sl[sl.index <= (t - h)]
    if len(hist) < 30 or (t - 12) not in sum12.index or np.isnan(sum12[t - 12]):
        return np.nan
    f = np.exp(ARIMA(hist.values, order=ORDEM).fit().forecast(h)[-1])
    return (f / sum12[t - 12] - 1) * 100


def gera(mensal: dict):
    s, sum12, mom = constroi(mensal)
    sl = np.log(sum12.dropna())
    per = lambda x: pd.Period(x, "M")

    # janela OOS = meses após o corte de treino até o último observado
    obs_idx = mom.dropna().index
    oos = [t for t in obs_idx if t > per(CORTE_TREINO)]

    # RMSE por horizonte (para o leque) + Theil U em h=5
    rmse_h = {}
    for h in range(1, H_MAX + 1):
        e = [mom[t] - champ_at(sl, sum12, t, h) for t in oos]
        e = np.array([x for x in e if not np.isnan(x)])
        rmse_h[h] = float(np.sqrt(np.mean(e ** 2)))
    e5 = np.array([mom[t] - champ_at(sl, sum12, t, H_MAX) for t in oos])
    enc = np.array([mom[t] - mom[t - H_MAX] for t in oos])
    U = float(np.sqrt(np.nanmean(e5 ** 2)) / np.sqrt(np.nanmean(enc ** 2)))

    # backtest (previsão do campeão sobre o OOS, p/ plotar contra o observado)
    backtest = [{"data": str(t), "obs": round(float(mom[t]), 2),
                 "champ": round(float(champ_at(sl, sum12, t, H_MAX)), 2)} for t in oos]

    # previsão real (treina com tudo) + leque 80% e 95%
    ult = obs_idx[-1]
    fut = [ult + i for i in range(1, H_MAX + 1)]
    fc = np.exp(ARIMA(sl.values, order=ORDEM).fit().forecast(H_MAX))
    forward = []
    for i, t in enumerate(fut):
        den = sum12.get(t - 12, np.nan)
        c = float((fc[i] / den - 1) * 100)
        r = rmse_h[i + 1]
        forward.append({"data": str(t), "central": round(c, 2),
                        "lo80": round(c - 1.28 * r, 2), "hi80": round(c + 1.28 * r, 2),
                        "lo95": round(c - 1.96 * r, 2), "hi95": round(c + 1.96 * r, 2)})

    historico = [{"data": str(t), "obs": round(float(mom[t]), 2)} for t in obs_idx]

    return {
        "meta": {
            "indicador": "Momentum do contêiner (YoY da média móvel de 12 meses)",
            "metodo": f"ARIMA{ORDEM} em log(soma 12m) -> YoY",
            "fonte": "ANTAQ — Estatística Aquaviária",
            "theilU_h5": round(U, 2),
            "rmse_h": {str(k): round(v, 2) for k, v in rmse_h.items()},
            "ult_obs": historico[-1],
            "corte_treino": CORTE_TREINO,
            "vies": round(float(np.nanmean(e5)), 2),
        },
        "historico": historico,
        "backtest": backtest,
        "forward": forward,
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--payload", required=True, help="JSON com series ANTAQ (formato do protótipo)")
    ap.add_argument("--out", default="lib/forecast-conteiner.json")
    ap.add_argument("--preliminar", default="",
                    help="meses YYYY-MM (vírgula) ainda não publicados pela ANTAQ — "
                         "carga manual IBI. Marcados em meta.preliminar; o dashboard "
                         "sinaliza o ponto como estimativa, não dado oficial.")
    a = ap.parse_args()
    dados = gera(carrega_mensal_do_payload(a.payload))

    prelim = [m.strip() for m in a.preliminar.split(",") if m.strip()]
    dados["meta"]["preliminar"] = prelim
    dados["meta"]["ult_obs_preliminar"] = dados["meta"]["ult_obs"]["data"] in prelim

    json.dump(dados, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    flag = " (PRELIMINAR)" if dados["meta"]["ult_obs_preliminar"] else ""
    print(f"OK -> {a.out}  | Theil U(h5)={dados['meta']['theilU_h5']}  "
          f"| ult_obs={dados['meta']['ult_obs']['data']}{flag}  "
          f"| forward[0]={dados['forward'][0]['data']}={dados['forward'][0]['central']}%  "
          f"| n_hist={len(dados['historico'])}")
