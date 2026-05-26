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
from sklearn.linear_model import LassoCV, LinearRegression
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
                   lags: dict[str, list[int]]) -> pd.DataFrame:
    """Constrói X (preditores defasados em YoY) e y (alvo em YoY)."""
    df = pd.DataFrame({'y': yoy(target_serie)})
    for name, lag_list in lags.items():
        s_yoy = yoy(predictors[name])
        for lag in lag_list:
            df[f'{name}_lag{lag}'] = s_yoy.shift(lag)
    return df.dropna()


# ──────────────────────────────────────────────────────────────────────────────
# 3. Walk-forward validation + bootstrap conformal
# ──────────────────────────────────────────────────────────────────────────────

def walk_forward(df: pd.DataFrame, min_train: int = 60,
                 use_lasso: bool = True) -> pd.DataFrame:
    """
    Rolling origin: para cada t a partir de min_train, treina em [0, t),
    prevê t. Retorna DataFrame com obs, pred, fase.
    """
    n = len(df)
    feats = [c for c in df.columns if c != 'y']
    out = []
    for t in range(n):
        if t < min_train:
            out.append({'data': df.index[t], 'observado': df['y'].iloc[t],
                        'predito': np.nan, 'fase': 'warmup'})
            continue
        X_train = df[feats].iloc[:t].values
        y_train = df['y'].iloc[:t].values
        X_test = df[feats].iloc[t:t+1].values
        if use_lasso and t >= min_train + 12:
            try:
                model = LassoCV(cv=5, max_iter=20000, n_alphas=50,
                                random_state=42).fit(
                    StandardScaler().fit_transform(X_train), y_train)
                # Reaplica scaler para o teste
                sc = StandardScaler().fit(X_train)
                pred = model.predict(sc.transform(X_test))[0]
            except Exception:
                model = LinearRegression().fit(X_train, y_train)
                pred = model.predict(X_test)[0]
        else:
            model = LinearRegression().fit(X_train, y_train)
            pred = model.predict(X_test)[0]
        out.append({'data': df.index[t], 'observado': df['y'].iloc[t],
                    'predito': float(pred), 'fase': 'oos'})
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

def rodar_segmento(nome: str, target: pd.Series, predictors: dict[str, pd.Series],
                   lags: dict[str, list[int]], spec_humana: str) -> dict:
    print(f'\n━━━ {nome.upper()} ━━━')
    df = build_features(target, predictors, lags)
    print(f'  Dataset: {len(df)} pontos ({df.index[0]:%Y-%m} → {df.index[-1]:%Y-%m})')
    print(f'  Features: {list(df.columns[1:])}')

    # ── 5a. Walk-forward
    wf = walk_forward(df, min_train=60, use_lasso=True)
    obs   = wf['observado'].values
    pred  = wf['predito'].values
    resid = obs - pred
    mask  = ~np.isnan(pred)

    # ── 5b. Métricas
    r_oos    = resid[mask]
    rmse_oos = float(np.sqrt(np.mean(r_oos**2)))
    mae_oos  = float(np.mean(np.abs(r_oos)))
    bias_oos = float(np.mean(r_oos))
    corr_oos = float(np.corrcoef(obs[mask], pred[mask])[0, 1])
    ss_res   = float(np.sum(r_oos**2))
    ss_tot   = float(np.sum((obs[mask] - obs[mask].mean())**2))
    r2_oos   = 1 - ss_res / ss_tot if ss_tot > 0 else float('nan')

    # Métricas em treino final (últimos 60m antes de prever) — só pra exibição
    final_train = df.iloc[-60:]
    sc = StandardScaler().fit(final_train[df.columns[1:]].values)
    Xf = sc.transform(final_train[df.columns[1:]].values)
    yf = final_train['y'].values
    final_model = LassoCV(cv=5, max_iter=20000, n_alphas=50, random_state=42).fit(Xf, yf)
    pred_in = final_model.predict(Xf)
    rmse_in = float(np.sqrt(np.mean((yf - pred_in)**2)))
    r2_in   = float(1 - np.sum((yf - pred_in)**2) / np.sum((yf - yf.mean())**2))

    print(f'  RMSE OOS (walk-forward): {rmse_oos:.2f}pp')
    print(f'  MAE  OOS                : {mae_oos:.2f}pp')
    print(f'  Bias OOS                : {bias_oos:+.2f}pp')
    print(f'  R²   OOS                : {r2_oos:.3f}')
    print(f'  Corr OOS                : {corr_oos:.3f}')
    print(f'  RMSE in-sample (60m)    : {rmse_in:.2f}pp')
    print(f'  R²   in-sample (60m)    : {r2_in:.3f}')

    # ── 5c. Diagnóstico residual
    diag = diagnostico_residuos(r_oos)
    print(f'  Ljung-Box(12) p-valor    : {diag.get("ljung_box_lag12_pvalor", float("nan")):.3f}')
    print(f'  Jarque-Bera   p-valor    : {diag.get("jarque_bera_pvalor", float("nan")):.3f}')

    # ── 5d. Stress test: estabilidade de coeficientes (jackknife)
    coef_amostras = []
    for offset in range(0, 24, 3):  # 8 reestimações pulando 3 em 3 meses
        sub = df.iloc[:-offset] if offset else df
        if len(sub) < 60:
            continue
        sc_j = StandardScaler().fit(sub[df.columns[1:]].iloc[-60:].values)
        Xj = sc_j.transform(sub[df.columns[1:]].iloc[-60:].values)
        yj = sub['y'].iloc[-60:].values
        try:
            mj = LassoCV(cv=5, max_iter=20000, n_alphas=50, random_state=42).fit(Xj, yj)
            coef_amostras.append(mj.coef_)
        except Exception:
            continue
    coef_amostras = np.array(coef_amostras) if coef_amostras else np.zeros((1, len(df.columns) - 1))
    coef_estab = {
        feat: {
            'media':  float(coef_amostras[:, i].mean()),
            'desvio': float(coef_amostras[:, i].std(ddof=1)) if len(coef_amostras) > 1 else 0.0,
            'cv':     float(coef_amostras[:, i].std(ddof=1) / max(abs(coef_amostras[:, i].mean()), 1e-9))
                      if len(coef_amostras) > 1 else 0.0,
        }
        for i, feat in enumerate(df.columns[1:])
    }
    print(f'  Estabilidade coef (CV médio): '
          f'{np.mean([c["cv"] for c in coef_estab.values()]):.2f}')

    # ── 5e. Forecast H=5 — usa últimos preditores observados, defasados
    # Para cada h, monta vetor com preditores na data t+h aplicando lags certos
    last_date = df.index[-1]
    forecast_rows = []
    # Resíduos recentes (últimos 24m) para a banda
    recent_resid = r_oos[-24:] if len(r_oos) >= 24 else r_oos
    rng = np.random.default_rng(42)
    for h in range(1, H + 1):
        target_date = last_date + pd.DateOffset(months=h)
        row = {}
        for feat in df.columns[1:]:
            # feat format: 'name_lagX' — pegamos predictors[name].iloc no índice apropriado
            name, lag_str = feat.rsplit('_lag', 1)
            lag = int(lag_str)
            # YoY do preditor na data (target_date - lag meses)
            pred_yoy = yoy(predictors[name])
            req_date = target_date - pd.DateOffset(months=lag)
            if req_date in pred_yoy.index and not pd.isna(pred_yoy.loc[req_date]):
                row[feat] = pred_yoy.loc[req_date]
            else:
                # Se não tem ainda, usa último disponível (proxy de naïve)
                row[feat] = pred_yoy.dropna().iloc[-1]
        X_new = sc.transform(np.array([[row[f] for f in df.columns[1:]]]))
        central = float(final_model.predict(X_new)[0])
        low_conf, high_conf = conformal_bands(recent_resid, central, alpha=0.20)
        low_boot, high_boot = bootstrap_residual_band(recent_resid, central, alpha=0.20, rng=rng)
        forecast_rows.append({
            'data':         target_date.strftime('%Y-%m'),
            'central_pct':  round(central, 2),
            # Banda conformal (mais robusta para não-normalidade)
            'low_pct':      round(low_conf, 2),
            'high_pct':     round(high_conf, 2),
            # Banda bootstrap como alternativa
            'low_boot_pct':  round(low_boot, 2),
            'high_boot_pct': round(high_boot, 2),
        })

    # ── 5f. Coeficientes finais
    coef_final = {f: float(final_model.coef_[i]) for i, f in enumerate(df.columns[1:])}
    coef_final['intercept'] = float(final_model.intercept_)
    coef_final['alpha_lasso'] = float(final_model.alpha_)

    # ── 5g. Serie histórica observado/predito
    serie = []
    cutoff_treino = wf['data'].iloc[60] if len(wf) > 60 else df.index[0]
    for _, r in wf.iterrows():
        serie.append({
            'data':      r['data'].strftime('%Y-%m'),
            'predito':   None if pd.isna(r['predito']) else round(float(r['predito']), 2),
            'observado': None if pd.isna(r['observado']) else round(float(r['observado']), 2),
            'fase':      r['fase'],
        })

    return {
        'spec_humana':    spec_humana,
        'modelo': {
            'tipo':           'LassoCV (5-fold) sobre features YoY com lags',
            'coeficientes':   coef_final,
            'features':       list(df.columns[1:]),
            'janela_treino_final_meses': 60,
            'horizonte_meses':           H,
        },
        'metricas': {
            'walk_forward': {
                'n':       int(mask.sum()),
                'rmse_pp': round(rmse_oos, 2),
                'mae_pp':  round(mae_oos, 2),
                'bias_pp': round(bias_oos, 2),
                'r2':      round(r2_oos, 3),
                'corr':    round(corr_oos, 3),
            },
            'treino_final_60m': {
                'rmse_pp': round(rmse_in, 2),
                'r2':      round(r2_in, 3),
            },
        },
        'diagnostico_residuos':  {k: (round(v, 4) if isinstance(v, float) else v)
                                  for k, v in diag.items()},
        'estabilidade_coef':     coef_estab,
        'serie':                 serie,
        'forecast':              forecast_rows,
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

    # ── MODELO 1: Cabotagem (drivers domésticos)
    cabotagem = rodar_segmento(
        nome='cabotagem',
        target=antaq['conteinerizada_cabotagem'],
        predictors=predictors,
        lags={
            'ibc_br':      [3, 5],
            'pim_pf':      [3, 6],
            'ipca_diesel': [2, 4],
            'carga_geral': [12],
        },
        spec_humana=(
            'Crescimento a/a do contêiner cabotagem ~ atividade doméstica '
            '(IBC-Br, PIM-PF defasados) + custo do substituto rodoviário '
            '(IPCA diesel) + dinâmica da carga geral.'
        ),
    )

    # ── MODELO 2: Longo Curso (drivers globais)
    longo_curso = rodar_segmento(
        nome='longo_curso',
        target=antaq['conteinerizada_longo_curso'],
        predictors=predictors,
        lags={
            'ibc_br':      [5],
            'cambio':      [3, 6],
            'brent':       [2, 4],
            'cny_usd':     [3, 6],
            'carga_geral': [12],
        },
        spec_humana=(
            'Crescimento a/a do contêiner longo curso ~ atividade BR (IBC-Br lag 5) + '
            'câmbio real BRL/USD (lag 3-6) + Brent (proxy de freight e commodities) + '
            'CNY/USD (proxy de ciclo China) + dinâmica da carga geral.'
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
