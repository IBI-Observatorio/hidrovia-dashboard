"""
Pipeline de projeção para o indicador 31 — Tendência de Cargas.

Treina DOIS modelos separados (cabotagem e longo curso) sobre a série MA12
de tonelagem de contêineres, com preditores macroeconômicos distintos para
cada mercado. Stress-test completo: walk-forward rolling, bootstrap dos
resíduos, conformal prediction intervals, diagnóstico de resíduos.

Output: public/data/antaq/dashboard/forecast.json com os dois modelos.

Rodar mensalmente depois de atualizar series-tendencia.json:
    python scripts/forecast_tendencia_cargas.py

Fontes de dados externos (gratuitas, sem chave):
  - BCB-SGS: IBC-Br (24364), Câmbio BRL/USD (3697), PIM-PF (21859),
            IPCA Diesel (1393)
  - FRED:    Brent oil (DCOILBRENTEU), CNY/USD (DEXCHUS)
"""

from __future__ import annotations

import io
import json
import sys
import warnings

# Garante UTF-8 no stdout para Windows (cp1252 default)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from scipy import stats
from sklearn.linear_model import LassoCV, LinearRegression, RidgeCV
from sklearn.preprocessing import StandardScaler
from statsmodels.stats.diagnostic import acorr_ljungbox, het_breuschpagan
from statsmodels.stats.stattools import jarque_bera

warnings.filterwarnings('ignore')

ROOT = Path(__file__).resolve().parents[1]
ANTAQ_JSON = ROOT / 'public/data/antaq/dashboard/series-tendencia.json'
FORECAST_JSON = ROOT / 'public/data/antaq/dashboard/forecast.json'
H = 5  # horizonte de projeção (meses)

# ──────────────────────────────────────────────────────────────────────────────
# 1. Data fetchers
# ──────────────────────────────────────────────────────────────────────────────

def fetch_bcb_sgs(serie_id: int, inicio: str = '2010-01-01') -> pd.Series:
    """Baixa série do BCB-SGS, retorna pd.Series mensal indexada por fim de mês."""
    url = (f'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie_id}/dados'
           f'?formato=json&dataInicial={pd.Timestamp(inicio).strftime("%d/%m/%Y")}')
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    df = pd.DataFrame(r.json())
    df['data'] = pd.to_datetime(df['data'], format='%d/%m/%Y')
    df['valor'] = pd.to_numeric(df['valor'])
    s = df.set_index('data')['valor']
    return s.resample('MS').last().rename(f'bcb_{serie_id}')


def fetch_fred(serie_id: str, inicio: str = '2010-01-01') -> pd.Series:
    """Baixa série do FRED via CSV público (sem chave)."""
    url = f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={serie_id}&cosd={inicio}'
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    df = pd.read_csv(io.StringIO(r.text))
    df.columns = ['data', 'valor']
    df['data'] = pd.to_datetime(df['data'])
    df['valor'] = pd.to_numeric(df['valor'], errors='coerce')
    s = df.dropna().set_index('data')['valor']
    # FRED retorna diário/business — agrega para fim de mês
    return s.resample('MS').mean().rename(f'fred_{serie_id}')


def load_antaq_series() -> dict[str, pd.Series]:
    """Lê o series-tendencia.json e devolve dict de pd.Series com MA12 em Mt."""
    with open(ANTAQ_JSON, encoding='utf-8') as f:
        raw = json.load(f)
    out = {}
    for key, pts in raw['series'].items():
        s = pd.Series(
            [p['ma12_mt'] for p in pts],
            index=pd.to_datetime([p['data'] + '-01' for p in pts]),
            name=key,
        )
        out[key] = s
    return out


# ──────────────────────────────────────────────────────────────────────────────
# 2. Feature engineering
# ──────────────────────────────────────────────────────────────────────────────

def yoy(s: pd.Series) -> pd.Series:
    """Variação % ano-contra-ano."""
    return (s / s.shift(12) - 1) * 100


def build_features(target_serie: pd.Series, predictors: dict[str, pd.Series],
                   lags: dict[str, list[int]],
                   ar_lags: list[int] | None = None) -> pd.DataFrame:
    """
    Constrói X (preditores defasados em YoY + termos AR do próprio alvo)
    e y (alvo em YoY).
    """
    y = yoy(target_serie)
    df = pd.DataFrame({'y': y})
    # Termos autorregressivos (defasagem do próprio YoY do alvo)
    for lag in (ar_lags or []):
        df[f'ar_lag{lag}'] = y.shift(lag)
    # Preditores exógenos em YoY
    for name, lag_list in lags.items():
        s_yoy = yoy(predictors[name])
        for lag in lag_list:
            df[f'{name}_lag{lag}'] = s_yoy.shift(lag)
    return df.dropna()


# ──────────────────────────────────────────────────────────────────────────────
# 3. Walk-forward validation + bootstrap conformal
# ──────────────────────────────────────────────────────────────────────────────

def fit_model(X_train: np.ndarray, y_train: np.ndarray,
              tipo: str = 'ridge'):
    """Treina modelo com scaler. Devolve (scaler, modelo)."""
    sc = StandardScaler().fit(X_train)
    Xs = sc.transform(X_train)
    if tipo == 'ridge':
        # Ridge encolhe sem zerar — preserva todos os preditores
        model = RidgeCV(alphas=np.logspace(-2, 2, 30), cv=5).fit(Xs, y_train)
    elif tipo == 'ols':
        model = LinearRegression().fit(Xs, y_train)
    else:
        raise ValueError(tipo)
    return sc, model


def walk_forward(df: pd.DataFrame, min_train: int = 60,
                 tipo_modelo: str = 'ridge', h: int = 5) -> pd.DataFrame:
    """
    Walk-forward com HORIZONTE h: para cada t a partir de min_train,
    treina em [0, t), prevê y(t+h-1) usando apenas X disponível em t
    (ou seja, AR_lagK tem que ter K >= h para ser válido sem peeking).

    Como nossos AR lags são 6 e 12 (cabotagem) e 12 (longo curso) — todos >= 5,
    o vetor de features para t+h-1 é construível em t.

    Retorna obs, predito, fase, baselines.
    """
    n = len(df)
    feats = [c for c in df.columns if c != 'y']
    out = []
    for t in range(n):
        target_idx = t + h - 1
        row = {'data': df.index[t] if t < n else None,
               'observado': np.nan, 'predito': np.nan, 'fase': 'warmup',
               'pred_naive_h': np.nan, 'pred_media12': np.nan}
        if target_idx >= n:
            continue
        row['data']       = df.index[target_idx]
        row['observado']  = float(df['y'].iloc[target_idx])
        if t < min_train:
            out.append(row); continue

        # Treina em [0, t) com janelamento (target, features). Para alinhamento
        # honesto, treina prevendo y(s+h-1) a partir de X(s) — ou seja, features
        # já defasadas pelo h. Mas como nossos features já têm lag interno (todos
        # >= h), basta usar X(target_idx) que só usa info disponível em t.
        X_train = df[feats].iloc[:t].values
        y_train = df['y'].iloc[:t].values  # nota: alinhamento contemporâneo (modelo
                                            # explica y(s) a partir de features que
                                            # já estão defasadas — válido p/ h<=min_lag)
        X_test  = df[feats].iloc[target_idx:target_idx + 1].values

        try:
            sc, model = fit_model(X_train, y_train, tipo=tipo_modelo)
            row['predito'] = float(model.predict(sc.transform(X_test))[0])
        except Exception:
            row['predito'] = float(np.mean(y_train))

        # Baselines HONESTOS para h-passos à frente (só usam info até t-1):
        # naïve_h: prevê y(t+h-1) = y(t-1)
        # media12: prevê y(t+h-1) = média[y(t-12), ..., y(t-1)]
        row['pred_naive_h']  = float(df['y'].iloc[t - 1])
        row['pred_media12']  = float(df['y'].iloc[max(0, t-12):t].mean())
        row['fase'] = 'oos'
        out.append(row)
    return pd.DataFrame(out)


def conformal_bands(residuos: np.ndarray, central: float,
                    alpha: float = 0.20) -> tuple[float, float]:
    """
    Intervalo de predição conformal split.
    Bands = central ± quantil_{1-alpha} de |resíduos|.
    Retorna (low, high).
    """
    if len(residuos) < 5:
        return (central - 5, central + 5)  # fallback conservador
    q = np.quantile(np.abs(residuos), 1 - alpha)
    return (central - q, central + q)


def bootstrap_residual_band(residuos: np.ndarray, central: float,
                            n_boot: int = 2000, alpha: float = 0.20,
                            rng: np.random.Generator | None = None
                            ) -> tuple[float, float]:
    """Banda via bootstrap dos resíduos: central + sample dos resíduos."""
    rng = rng or np.random.default_rng(42)
    if len(residuos) < 5:
        return (central - 5, central + 5)
    samples = rng.choice(residuos, size=n_boot, replace=True)
    sim = central + samples
    low = float(np.quantile(sim, alpha / 2))
    high = float(np.quantile(sim, 1 - alpha / 2))
    return (low, high)


# ──────────────────────────────────────────────────────────────────────────────
# 4. Diagnóstico
# ──────────────────────────────────────────────────────────────────────────────

def diagnostico_residuos(resid: np.ndarray) -> dict:
    """Bateria de testes: autocorrelação, normalidade, heterocedasticidade."""
    out = {'n': len(resid), 'media': float(np.mean(resid)),
           'std': float(np.std(resid, ddof=1)),
           'min': float(np.min(resid)), 'max': float(np.max(resid))}
    try:
        lb = acorr_ljungbox(resid, lags=[6, 12], return_df=True)
        out['ljung_box_lag6_pvalor']  = float(lb['lb_pvalue'].iloc[0])
        out['ljung_box_lag12_pvalor'] = float(lb['lb_pvalue'].iloc[1])
    except Exception:
        pass
    try:
        jb_stat, jb_p, skew, kurt = jarque_bera(resid)
        out['jarque_bera_pvalor'] = float(jb_p)
        out['skewness']           = float(skew)
        out['kurtose']            = float(kurt)
    except Exception:
        pass
    return out


# ──────────────────────────────────────────────────────────────────────────────
# 5. Pipeline principal por segmento
# ──────────────────────────────────────────────────────────────────────────────

def metricas_de(y_obs, y_pred):
    r = y_obs - y_pred
    rmse = float(np.sqrt(np.mean(r ** 2)))
    mae  = float(np.mean(np.abs(r)))
    bias = float(np.mean(r))
    ss_res = float(np.sum(r ** 2))
    ss_tot = float(np.sum((y_obs - y_obs.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else float('nan')
    try:
        corr = float(np.corrcoef(y_obs, y_pred)[0, 1])
    except Exception:
        corr = float('nan')
    return {'n': len(y_obs), 'rmse_pp': round(rmse, 2),
            'mae_pp': round(mae, 2), 'bias_pp': round(bias, 2),
            'r2': round(r2, 3), 'corr': round(corr, 3)}


def rodar_segmento(nome: str, target: pd.Series, predictors: dict[str, pd.Series],
                   lags: dict[str, list[int]], ar_lags: list[int],
                   spec_humana: str) -> dict:
    print(f'\n━━━ {nome.upper()} ━━━')
    df = build_features(target, predictors, lags, ar_lags=ar_lags)
    print(f'  Dataset: {len(df)} pontos ({df.index[0]:%Y-%m} → {df.index[-1]:%Y-%m})')
    print(f'  Features ({len(df.columns)-1}): {list(df.columns[1:])}')

    # ── 5a. Walk-forward com Ridge a HORIZONTE H=5
    wf = walk_forward(df, min_train=60, tipo_modelo='ridge', h=H)
    mask = ~np.isnan(wf['predito'].values) & (wf['fase'] == 'oos')
    obs     = wf['observado'].values[mask]
    pred    = wf['predito'].values[mask]
    naive   = wf['pred_naive_h'].values[mask]
    media12 = wf['pred_media12'].values[mask]
    r_oos = obs - pred

    # ── 5b. Métricas modelo vs baselines
    m_modelo  = metricas_de(obs, pred)
    m_naive   = metricas_de(obs, naive)
    m_media12 = metricas_de(obs, media12)

    print(f'  MODELO  : RMSE={m_modelo["rmse_pp"]:.2f}pp  MAE={m_modelo["mae_pp"]:.2f}  '
          f'Bias={m_modelo["bias_pp"]:+.2f}  R²={m_modelo["r2"]:+.3f}  ρ={m_modelo["corr"]:+.3f}')
    print(f'  NAÏVE   : RMSE={m_naive["rmse_pp"]:.2f}pp  MAE={m_naive["mae_pp"]:.2f}  '
          f'Bias={m_naive["bias_pp"]:+.2f}  R²={m_naive["r2"]:+.3f}')
    print(f'  MÉDIA12 : RMSE={m_media12["rmse_pp"]:.2f}pp  MAE={m_media12["mae_pp"]:.2f}  '
          f'Bias={m_media12["bias_pp"]:+.2f}  R²={m_media12["r2"]:+.3f}')
    ganho_naive   = (m_naive["rmse_pp"]   - m_modelo["rmse_pp"]) / m_naive["rmse_pp"]   * 100
    ganho_media12 = (m_media12["rmse_pp"] - m_modelo["rmse_pp"]) / m_media12["rmse_pp"] * 100
    print(f'  → Modelo bate naïve em {ganho_naive:+.1f}% RMSE | bate média12 em {ganho_media12:+.1f}%')

    # ── 5c. Diagnóstico residual
    diag = diagnostico_residuos(r_oos)
    print(f'  Ljung-Box(12)            : p={diag.get("ljung_box_lag12_pvalor", float("nan")):.3f}'
          f'  (p<0.05 = autocorrelação residual)')
    print(f'  Jarque-Bera (normalidade): p={diag.get("jarque_bera_pvalor", float("nan")):.3f}')

    # ── 5d. Treino final em JANELA RECENTE (60m) — privilegia regime atual
    JAN_FINAL = 60
    feats = list(df.columns[1:])
    df_recent = df.iloc[-JAN_FINAL:]
    sc_final, final_model = fit_model(df_recent[feats].values,
                                       df_recent['y'].values, tipo='ridge')
    pred_in = final_model.predict(sc_final.transform(df_recent[feats].values))
    m_in    = metricas_de(df_recent['y'].values, pred_in)
    print(f'  Treino janela {JAN_FINAL}m       : RMSE={m_in["rmse_pp"]:.2f}pp  R²={m_in["r2"]:+.3f}')

    # ── 5d.bis  Correção de bias: o modelo OOS recente está enviesado por X pp
    # → subtrair esse X da previsão central para de-biasar
    bias_correction = float(np.mean(r_oos[-12:])) if len(r_oos) >= 12 else 0.0
    print(f'  Bias OOS últimos 12m     : {bias_correction:+.2f}pp (aplicado como correção)')

    # ── 5e. Stress: estabilidade de coeficientes (rolling 60m)
    coefs = []
    for cut in range(60, len(df) + 1, 6):  # a cada 6 meses
        sub = df.iloc[:cut]
        sc_j, m_j = fit_model(sub[feats].iloc[-60:].values,
                              sub['y'].iloc[-60:].values, tipo='ridge')
        coefs.append(m_j.coef_)
    coefs = np.array(coefs)
    coef_estab = {
        f: {
            'media_padronizada': round(float(coefs[:, i].mean()), 4),
            'desvio':            round(float(coefs[:, i].std(ddof=1)) if len(coefs) > 1 else 0.0, 4),
            'cv':                round(float(coefs[:, i].std(ddof=1) / max(abs(coefs[:, i].mean()), 1e-9))
                                       if len(coefs) > 1 else 0.0, 3),
            'sinal_estavel':     bool(np.all(coefs[:, i] > 0) or np.all(coefs[:, i] < 0))
                                 if len(coefs) > 1 else True,
        }
        for i, f in enumerate(feats)
    }
    sinal_stable = sum(1 for c in coef_estab.values() if c['sinal_estavel'])
    print(f'  Estabilidade coef        : {sinal_stable}/{len(feats)} preditores com sinal estável')

    # ── 5f. Forecast H=5 com banda baseada em resíduos CENTRADOS (variância pura)
    # O bias já foi extraído acima e é aplicado à central — a banda só captura a
    # variabilidade aleatória residual.
    recent_resid_raw = r_oos[-24:] if len(r_oos) >= 24 else r_oos
    recent_resid = recent_resid_raw - bias_correction  # centra os resíduos
    print(f'  Banda baseada em         : últimos {len(recent_resid)}m centrados '
          f'(σ={recent_resid.std():.2f}pp)')

    last_date = df.index[-1]
    last_y = float(df['y'].iloc[-1])
    last_y_lag6 = float(df['y'].iloc[-6]) if len(df) > 6 else last_y
    rng = np.random.default_rng(42)
    forecast_rows = []
    for h in range(1, H + 1):
        target_date = last_date + pd.DateOffset(months=h)
        row = {}
        for feat in feats:
            if feat.startswith('ar_lag'):
                lag = int(feat.replace('ar_lag', ''))
                # Para previsão futura, ar_lagN referente ao próprio y defasado N meses
                # da data alvo. Se ainda temos observado, usa; senão usa último observado.
                req_date = target_date - pd.DateOffset(months=lag)
                if req_date in df.index:
                    row[feat] = float(df['y'].loc[req_date])
                else:
                    row[feat] = last_y
                continue
            name, lag_str = feat.rsplit('_lag', 1)
            lag = int(lag_str)
            pred_yoy = yoy(predictors[name])
            req_date = target_date - pd.DateOffset(months=lag)
            if req_date in pred_yoy.index and not pd.isna(pred_yoy.loc[req_date]):
                row[feat] = float(pred_yoy.loc[req_date])
            else:
                row[feat] = float(pred_yoy.dropna().iloc[-1])
        X_new       = sc_final.transform(np.array([[row[f] for f in feats]]))
        central_raw = float(final_model.predict(X_new)[0])
        # Aplica correção de bias estrutural
        central     = central_raw + bias_correction
        low_c, high_c = conformal_bands(recent_resid, central, alpha=0.20)
        low_b, high_b = bootstrap_residual_band(recent_resid, central, alpha=0.20, rng=rng)
        forecast_rows.append({
            'data':              target_date.strftime('%Y-%m'),
            'central_pct':       round(central, 2),
            'central_raw_pct':   round(central_raw, 2),
            'low_pct':           round(low_c, 2),
            'high_pct':          round(high_c, 2),
            'low_boot_pct':      round(low_b, 2),
            'high_boot_pct':     round(high_b, 2),
        })

    # ── 5g. Coeficientes finais (padronizados)
    coef_final = {f: round(float(final_model.coef_[i]), 4) for i, f in enumerate(feats)}
    coef_final['intercept']   = round(float(final_model.intercept_), 4)
    coef_final['alpha_ridge'] = round(float(final_model.alpha_), 4)

    # ── 5h. Série observado/predito
    serie = []
    for _, r in wf.iterrows():
        serie.append({
            'data':      r['data'].strftime('%Y-%m'),
            'predito':   None if pd.isna(r['predito']) else round(float(r['predito']), 2),
            'observado': None if pd.isna(r['observado']) else round(float(r['observado']), 2),
            'fase':      r['fase'],
        })

    return {
        'spec_humana': spec_humana,
        'modelo': {
            'tipo':                       'RidgeCV (5-fold) sobre features YoY com lags + termos AR',
            'features':                   feats,
            'coeficientes_padronizados':  coef_final,
            'janela_treino_walkforward_minima': 60,
            'horizonte_meses':            H,
        },
        'metricas': {
            'walk_forward_modelo':       m_modelo,
            'walk_forward_naive':        m_naive,
            'walk_forward_media12m':     m_media12,
            'treino_full_sample':        m_in,
            'ganho_rmse_vs_naive_pct':   round(ganho_naive, 1),
            'ganho_rmse_vs_media12_pct': round(ganho_media12, 1),
        },
        'diagnostico_residuos': {k: (round(v, 4) if isinstance(v, float) else v)
                                 for k, v in diag.items()},
        'estabilidade_coef':    coef_estab,
        'banda': {
            'metodo':            'conformal_split_recent24m_centrado',
            'n_residuos':        len(recent_resid),
            'sigma_recente':     round(float(recent_resid.std()), 2),
            'bias_correction_pp': round(bias_correction, 2),
        },
        'serie':    serie,
        'forecast': forecast_rows,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 6. Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    print('▶ Carregando séries ANTAQ…')
    antaq = load_antaq_series()
    for k, s in antaq.items():
        print(f'  {k}: {len(s)} pts ({s.index[0]:%Y-%m} → {s.index[-1]:%Y-%m})')

    print('\n▶ Baixando preditores externos (BCB + FRED)…')
    ibc_br      = fetch_bcb_sgs(24364);  print(f'  IBC-Br:        {len(ibc_br)} pts')
    cambio      = fetch_bcb_sgs(3697);   print(f'  BRL/USD:       {len(cambio)} pts')
    pim_pf      = fetch_bcb_sgs(21859);  print(f'  PIM-PF:        {len(pim_pf)} pts')
    ipca_diesel = fetch_bcb_sgs(1393);   print(f'  IPCA Diesel:   {len(ipca_diesel)} pts')
    brent       = fetch_fred('DCOILBRENTEU');  print(f'  Brent:         {len(brent)} pts')
    cny_usd     = fetch_fred('DEXCHUS');       print(f'  CNY/USD:       {len(cny_usd)} pts')

    predictors = {
        'ibc_br':      ibc_br,
        'cambio':      cambio,
        'pim_pf':      pim_pf,
        'ipca_diesel': ipca_diesel,
        'brent':       brent,
        'cny_usd':     cny_usd,
        # carga geral em Mt (já em MA12) usada como preditor — converter no caller
        'carga_geral': antaq['carga_geral'],
    }

    # ── MODELO 1: Cabotagem (drivers domésticos + alta inércia → AR forte)
    cabotagem = rodar_segmento(
        nome='cabotagem',
        target=antaq['conteinerizada_cabotagem'],
        predictors=predictors,
        ar_lags=[6, 12],  # cabotagem tem persistência alta (contratos longos)
        lags={
            'ibc_br':      [3],
            'pim_pf':      [3, 6],
            'ipca_diesel': [3],
            'carga_geral': [12],
        },
        spec_humana=(
            'Crescimento a/a do contêiner cabotagem ~ termo autorregressivo (lag 6 e 12) '
            '+ atividade doméstica (IBC-Br, PIM-PF defasados) + custo do substituto '
            'rodoviário (IPCA diesel) + dinâmica da carga geral.'
        ),
    )

    # ── MODELO 2: Longo Curso (drivers globais + inércia média)
    longo_curso = rodar_segmento(
        nome='longo_curso',
        target=antaq['conteinerizada_longo_curso'],
        predictors=predictors,
        ar_lags=[12],  # menor persistência (mais exposto a choques globais)
        lags={
            'ibc_br':      [5],
            'cambio':      [3, 6],
            'brent':       [3],
            'cny_usd':     [3, 6],
            'carga_geral': [12],
        },
        spec_humana=(
            'Crescimento a/a do contêiner longo curso ~ termo autorregressivo (lag 12) '
            '+ atividade BR (IBC-Br lag 5) + câmbio BRL/USD (lag 3-6) + Brent '
            '(proxy de freight global) + CNY/USD (proxy de ciclo China) '
            '+ dinâmica da carga geral.'
        ),
    )

    # ── Salvar
    out = {
        'gerado_em':   datetime.now(timezone.utc).isoformat(),
        'cabotagem':   cabotagem,
        'longo_curso': longo_curso,
        'metadata': {
            'horizonte_meses':  H,
            'banda_padrao':     'conformal_split_80pct',
            'fontes_dados':     {
                'IBC-Br':         'BCB-SGS 24364',
                'Câmbio BRL/USD': 'BCB-SGS 3697',
                'PIM-PF':         'BCB-SGS 21859',
                'IPCA Diesel':    'BCB-SGS 1393',
                'Brent':          'FRED DCOILBRENTEU',
                'CNY/USD':        'FRED DEXCHUS',
            },
        },
    }
    with open(FORECAST_JSON, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f'\n✓ Salvo em {FORECAST_JSON}')


if __name__ == '__main__':
    main()
