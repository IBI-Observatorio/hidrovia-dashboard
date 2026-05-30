import json, numpy as np, pandas as pd, warnings
warnings.filterwarnings('ignore')
import statsmodels.api as sm
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.seasonal import STL
from statsmodels.regression.quantile_regression import QuantReg
from sklearn.ensemble import RandomForestRegressor
from sklearn.neighbors import KNeighborsRegressor
from sklearn.linear_model import RidgeCV
from scipy import stats

d = json.load(open('/tmp/payload.json'))
mc = {r['data']: r['mensal_mt'] for r in d['series'] if r['serie']=='natureza:conteinerizada'}
cg_m = {r['data']: r['yoy_ma_pct'] for r in d['series'] if r['serie']=='natureza:carga_geral'}
datas = sorted(mc.keys()); P = pd.PeriodIndex(datas, freq='M')
s = pd.Series([mc[x] for x in datas], index=P)
sum12 = s.rolling(12).sum()
mom = (sum12/sum12.shift(12)-1)*100
pred = {r['data']: r['predito'] for r in d['forecast']['serie']}
fase = {r['data']: r['fase'] for r in d['forecast']['serie']}
m = d['forecast']['modelo']; INTC=m['intercept']
per = lambda dt: pd.Period(dt,'M'); H=5

# regressores (predeterminados, info <= t-5)
lead = {per(dt): pred[dt]-INTC for dt in pred}                     # b*IBC(t-5)+c*CG(t-12)
cg   = {per(x): cg_m[x] for x in cg_m}
def cg_l12(t): return cg.get(t-12, np.nan)

oos = [per(dt) for dt in sorted(pred) if fase[dt]=='oos']          # 38 alvos
y_oos = np.array([mom.get(t,np.nan) for t in oos])
nc5   = np.array([mom.get(t-H,np.nan) for t in oos])
leadings = np.array([pred.get(str(t)) for t in oos])  # OLS com IBC-Br defasado + carga geral

# histórico do alvo, ordenado
mom_idx = mom.dropna()
def y_upto(o):  # série do alvo com data <= o
    return mom_idx[mom_idx.index<=o]

PREDS = {}   # nome -> vetor 38

# ---------- A. NAIVE / BENCHMARK ----------
PREDS['1. no-change h=5  [bench]'] = nc5.copy()
PREDS['2. naive sazonal y(t-12)'] = np.array([mom.get(t-12,np.nan) for t in oos])
# RW + drift (drift estimado na história até origem)
def rwdrift():
    out=[]
    for t in oos:
        h=y_upto(t-H); 
        if len(h)<13: out.append(np.nan); continue
        drift=(h.iloc[-1]-h.iloc[-13])/12   # drift mensal médio do último ano
        out.append(h.iloc[-1]+drift*H)
    return np.array(out)
PREDS['3. RW + drift'] = rwdrift()
PREDS['4. média móvel 6m'] = np.array([y_upto(t-H).iloc[-6:].mean() if len(y_upto(t-H))>=6 else np.nan for t in oos])
PREDS['5. média móvel 12m'] = np.array([y_upto(t-H).iloc[-12:].mean() if len(y_upto(t-H))>=12 else np.nan for t in oos])

# ---------- B. AUTORREGRESSIVA (univariada) ----------
# AR(1) iterado h=5 (recursivo)
def ar1_iter():
    out=[]
    for t in oos:
        h=y_upto(t-H)
        if len(h)<24: out.append(np.nan); continue
        yv=h.values; X=sm.add_constant(yv[:-1]); r=sm.OLS(yv[1:],X).fit()
        c,phi=r.params; f=yv[-1]
        for _ in range(H): f=c+phi*f
        out.append(f)
    return np.array(out)
PREDS['6. AR(1) iterado'] = ar1_iter()
# AR(p) direto h=5, p por AIC (1..6)
def arp_direct():
    out=[]
    for t in oos:
        h=y_upto(t-H); yv=h.values
        if len(yv)<40: out.append(np.nan); continue
        best=None
        for p in range(1,7):
            Xr=np.column_stack([yv[p-1-k:len(yv)-H-k] for k in range(p)]) if False else None
            # design: y(i) ~ y(i-H), y(i-H-1)... usar lags a partir de H
            rows=[]
            for i in range(len(yv)):
                if i-H-(p-1)<0: continue
                rows.append([yv[i]]+[yv[i-H-k] for k in range(p)])
            A=np.array(rows); 
            if len(A)<p+5: continue
            r=sm.OLS(A[:,0], sm.add_constant(A[:,1:])).fit()
            if best is None or r.aic<best[0]: best=(r.aic,r,p)
        if best is None: out.append(np.nan); continue
        r=best[1]; p=best[2]
        xnew=[1.0]+[yv[len(yv)-1-k] for k in range(p)]
        out.append(float(np.dot(r.params, xnew)))
    return np.array(out)
PREDS['7. AR(p)-AIC direto'] = arp_direct()
# AR direto-5 simples
def ar5():
    out=[]
    for t in oos:
        h=y_upto(t-H); yv=h.values
        if len(yv)<H+10: out.append(np.nan); continue
        A=np.array([[yv[i],yv[i-H]] for i in range(H,len(yv))])
        b1,b0=np.polyfit(A[:,1],A[:,0],1); out.append(b0+b1*yv[-1])
    return np.array(out)
PREDS['8. AR direto-5'] = ar5()
# Theta method (theta=2): SES + tendência linear /2 ... usar decomposição clássica
def theta():
    out=[]
    for t in oos:
        h=y_upto(t-H); yv=h.values; n=len(yv)
        if n<24: out.append(np.nan); continue
        tt=np.arange(n); b1,b0=np.polyfit(tt,yv,1)            # linha de regressão (theta=0)
        try:
            ses=ExponentialSmoothing(yv,trend=None).fit(); sf=ses.forecast(H)[-1]
        except Exception: sf=yv[-1]
        lin=b0+b1*(n-1+H)
        out.append(0.5*lin+0.5*sf)
    return np.array(out)
PREDS['9. Theta'] = theta()
# Holt amortecido
def holt():
    out=[]
    for t in oos:
        h=y_upto(t-H); yv=h.values
        if len(yv)<24: out.append(np.nan); continue
        try:
            f=ExponentialSmoothing(yv,trend='add',damped_trend=True).fit().forecast(H)[-1]
        except Exception: f=np.nan
        out.append(f)
    return np.array(out)
PREDS['10. Holt amortecido'] = holt()
# ARIMA no momentum direto
def arima_mom():
    out=[]
    for t in oos:
        h=y_upto(t-H); yv=h.values
        if len(yv)<30: out.append(np.nan); continue
        try: f=ARIMA(yv,order=(1,1,1)).fit().forecast(H)[-1]
        except Exception: f=np.nan
        out.append(f)
    return np.array(out)
PREDS['11. ARIMA(1,1,1) momentum'] = arima_mom()
# ARIMA no NÍVEL log(sum12) -> YoY  (modela o suave, não o mensal cru)
def arima_level():
    out=[]
    sl=np.log(sum12.dropna())
    for t in oos:
        hist=sl[sl.index<=(t-H)]
        if len(hist)<30 or (t-12) not in sum12.index or np.isnan(sum12[t-12]): out.append(np.nan); continue
        try:
            f=np.exp(ARIMA(hist.values,order=(2,1,1)).fit().forecast(H)[-1])
            out.append((f/sum12[t-12]-1)*100)
        except Exception: out.append(np.nan)
    return np.array(out)
PREDS['12. ARIMA log(soma12)→YoY'] = arima_level()
# SARIMA mensal cru -> agrega (já sabíamos ruim; incluir p/ completude)
def sarima_monthly():
    out=[]; sl=np.log(s)
    for t in oos:
        hist=sl[sl.index<=(t-H)].dropna()
        try:
            fc=np.exp(SARIMAX(hist,order=(1,1,1),seasonal_order=(0,1,1,12),
                 enforce_stationarity=False,enforce_invertibility=False).fit(disp=False).forecast(H))
            obs=[s.get(t-k,np.nan) for k in range(H+1,12)]
            if any(np.isnan(obs)) or (t-12) not in sum12.index: out.append(np.nan); continue
            st=np.sum(obs)+np.sum(fc.values)
            out.append((st/sum12[t-12]-1)*100)
        except Exception: out.append(np.nan)
    return np.array(out)
PREDS['13. SARIMA mensal→agrega'] = sarima_monthly()

# ---------- C. ESTRUTURAL (exógena) ----------
PREDS['14. OLS leadings (IBC-Br + carga geral)'] = leadings.copy()
# ADL: y(t) ~ y(t-5) + lead(t)  recursivo
def adl():
    out=[]
    for t in oos:
        rows=[]
        for o in mom_idx.index:
            if o<=(t-H) and (o-H) in mom_idx.index and o in lead:
                rows.append([mom_idx[o], mom_idx[o-H], lead[o]])
        if len(rows)<20 or t not in lead or (t-H) not in mom_idx.index: out.append(np.nan); continue
        A=np.array(rows); r=sm.OLS(A[:,0],sm.add_constant(A[:,1:])).fit()
        out.append(float(np.dot(r.params,[1,mom_idx[t-H],lead[t]])))
    return np.array(out)
PREDS['15. ADL (y₋₅+lead)'] = adl()
# ECM: y(t)=y(t-5)+a+b(leadings(t)-y(t-5))
def ecm():
    out=[]
    for t in oos:
        rows=[]
        for o in mom_idx.index:
            if o<=(t-H) and (o-H) in mom_idx.index and str(o) in pred:
                rows.append([mom_idx[o]-mom_idx[o-H], pred[str(o)]-mom_idx[o-H]])
        if len(rows)<20 or str(t) not in pred or (t-H) not in mom_idx.index: out.append(np.nan); continue
        A=np.array(rows); r=sm.OLS(A[:,0],sm.add_constant(A[:,1:])).fit()
        a,b=r.params; out.append(mom_idx[t-H]+a+b*(pred[str(t)]-mom_idx[t-H]))
    return np.array(out)
PREDS['16. ECM (correção de erro)'] = ecm()
# Ridge com muitos lags do alvo + lead (regularizado)
def ridge():
    out=[]
    for t in oos:
        rows=[]; idx=list(mom_idx.index)
        for o in idx:
            if o<=(t-H) and (o-H-5) in mom_idx.index and o in lead:
                feats=[mom_idx[o-H-k] for k in range(6)]+[lead[o]]
                rows.append([mom_idx[o]]+feats)
        if len(rows)<25 or t not in lead: out.append(np.nan); continue
        A=np.array(rows)
        try:
            r=RidgeCV(alphas=np.logspace(-2,3,20)).fit(A[:,1:],A[:,0])
            xnew=[mom_idx[t-H-k] for k in range(6)]+[lead[t]]
            out.append(float(r.predict([xnew])[0]))
        except Exception: out.append(np.nan)
    return np.array(out)
PREDS['17. Ridge (lags+lead)'] = ridge()
# Regressão quantílica (mediana) ADL — robusta a outliers COVID
def qreg():
    out=[]
    for t in oos:
        rows=[]
        for o in mom_idx.index:
            if o<=(t-H) and (o-H) in mom_idx.index and o in lead:
                rows.append([mom_idx[o],mom_idx[o-H],lead[o]])
        if len(rows)<20 or t not in lead: out.append(np.nan); continue
        A=np.array(rows)
        try:
            r=QuantReg(A[:,0],sm.add_constant(A[:,1:])).fit(q=0.5)
            out.append(float(np.dot(r.params,[1,mom_idx[t-H],lead[t]])))
        except Exception: out.append(np.nan)
    return np.array(out)
PREDS['18. QuantReg mediana ADL'] = qreg()

# ---------- D. DECOMPOSIÇÃO ----------
def stl_trend():
    out=[]
    for t in oos:
        h=y_upto(t-H)
        if len(h)<30: out.append(np.nan); continue
        try:
            res=STL(h.values,period=12,robust=True).fit()
            tr=res.trend; b1,b0=np.polyfit(np.arange(len(tr))[-12:],tr[-12:],1)
            out.append(b0+b1*(len(tr)-1+H))
        except Exception: out.append(np.nan)
    return np.array(out)
PREDS['19. STL tendência→extrapola'] = stl_trend()

# ---------- E. ROBUSTA A QUEBRA ----------
# janela rolante curta (36m) para ADL
def adl_roll(win=36):
    out=[]
    for t in oos:
        rows=[]
        for o in mom_idx.index:
            if (t-H-win)<o<=(t-H) and (o-H) in mom_idx.index and o in lead:
                rows.append([mom_idx[o],mom_idx[o-H],lead[o]])
        if len(rows)<15 or t not in lead: out.append(np.nan); continue
        A=np.array(rows); r=sm.OLS(A[:,0],sm.add_constant(A[:,1:])).fit()
        out.append(float(np.dot(r.params,[1,mom_idx[t-H],lead[t]])))
    return np.array(out)
PREDS['20. ADL janela rolante 36m'] = adl_roll()
# média de previsões sobre múltiplas janelas (Pesaran-Pick)
def windowavg():
    base={w:adl_roll(w) for w in [24,36,48,72]}
    M=np.vstack(list(base.values())); return np.nanmean(M,axis=0)
PREDS['21. ADL média de janelas'] = windowavg()
# intercepto-correção sobre OLS leadings (média últimos 6 erros realizados <= origem)
def ic_ols_lead():
    err={o:(mom.get(o,np.nan)-pred[str(o)]) for o in [per(x) for x in pred]}
    out=[]
    for t in oos:
        o=t-H; es=[err[o-k] for k in range(6) if (o-k) in err and not np.isnan(err[o-k])]
        out.append(pred[str(t)]+(np.mean(es) if es else 0))
    return np.array(out)
PREDS['22. OLS leadings + interc.-correção'] = ic_ols_lead()

# ---------- F. MACHINE LEARNING ----------
def make_ml(model):
    out=[]
    for t in oos:
        rows=[]
        for o in mom_idx.index:
            if o<=(t-H) and (o-H-5) in mom_idx.index and o in lead:
                rows.append([mom_idx[o]]+[mom_idx[o-H-k] for k in range(6)]+[lead[o]])
        if len(rows)<25 or t not in lead: out.append(np.nan); continue
        A=np.array(rows)
        try:
            mdl=model(); mdl.fit(A[:,1:],A[:,0])
            xnew=[mom_idx[t-H-k] for k in range(6)]+[lead[t]]
            out.append(float(mdl.predict([xnew])[0]))
        except Exception: out.append(np.nan)
    return np.array(out)
PREDS['23. Random Forest'] = make_ml(lambda: RandomForestRegressor(n_estimators=300,max_depth=4,random_state=0))
PREDS['24. k-NN análogos'] = make_ml(lambda: KNeighborsRegressor(n_neighbors=8))

# ---------- G. COMBINAÇÕES ----------
def invmse_w(cols):
    ws=[]
    for c in cols:
        e=y_oos-PREDS[c]; ws.append(1/np.nanmean(e**2))
    ws=np.array(ws)/np.sum(ws)
    M=np.vstack([PREDS[c] for c in cols]); return np.nansum(M*ws[:,None],axis=0)
PREDS['25. combo igual (NC + OLS leadings)'] = 0.5*nc5+0.5*leadings
PREDS['26. combo inv-MSE (NC + OLS leadings)'] = invmse_w(['1. no-change h=5  [bench]','14. OLS leadings (IBC-Br + carga geral)'])
PREDS['27. combo mediana {NC, AR5, OLS leadings}'] = np.median(np.vstack([nc5,PREDS['8. AR direto-5'],leadings]),axis=0)
# mediana de TODOS os modelos univariados+estruturais (sem combos, sem ML ruim)
pool=['1. no-change h=5  [bench]','3. RW + drift','6. AR(1) iterado','8. AR direto-5','9. Theta',
      '10. Holt amortecido','12. ARIMA log(soma12)→YoY','14. OLS leadings (IBC-Br + carga geral)','15. ADL (y₋₅+lead)',
      '16. ECM (correção de erro)','20. ADL janela rolante 36m']
PREDS['28. mediana do pool (11 modelos)'] = np.nanmedian(np.vstack([PREDS[c] for c in pool]),axis=0)
PREDS['29. média aparada do pool'] = stats.trim_mean(np.vstack([PREDS[c] for c in pool]),0.2,axis=0)
PREDS['30. combo inv-MSE top-pool'] = invmse_w(pool)

# ========== MÉTRICAS ==========
def metrics(p):
    e=y_oos-p; ok=~np.isnan(e)
    e=e[ok]; n=len(e)
    return np.sqrt(np.mean(e**2)), np.mean(np.abs(e)), n
rmse_nc=metrics(nc5)[0]
def dm(p, ref=nc5, lag=12):
    e1=y_oos-p; e2=y_oos-ref; ok=~(np.isnan(e1)|np.isnan(e2))
    e1,e2=e1[ok],e2[ok]; dl=e1**2-e2**2; db=dl.mean(); N=len(dl)
    g0=np.mean((dl-db)**2); v=g0
    for k in range(1,lag+1):
        v+=2*(1-k/(lag+1))*np.mean((dl[k:]-db)*(dl[:-k]-db))
    v/=N
    if v<=0: return np.nan,np.nan
    st=db/np.sqrt(v); st*=np.sqrt((N+1-2*lag+lag*(lag-1)/N)/N)
    return float(st), float(2*stats.t.sf(abs(st),df=N-1))
dir_true=np.sign(y_oos-nc5)
turns=np.where(np.sign(np.diff(np.r_[nc5[0],y_oos-nc5]))[1:]!=np.sign(np.diff(np.r_[nc5[0],y_oos-nc5]))[:-1])[0]+1
def diracc(p, mask=None):
    dp=np.sign(p-nc5); ok=(dir_true!=0)&~np.isnan(p)
    if mask is not None:
        mm=np.zeros(len(p),bool); mm[mask]=True; ok=ok&mm
    return np.mean(dp[ok]==dir_true[ok]) if ok.sum() else np.nan

res=[]
for name,p in PREDS.items():
    r,a,n=metrics(p); U=r/rmse_nc
    st,pv=dm(p) if name!='1. no-change h=5  [bench]' else (np.nan,np.nan)
    res.append((name,r,a,U,st,pv,100*diracc(p),100*diracc(p,turns),n))
df=pd.DataFrame(res,columns=['modelo','RMSE','MAE','TheilU','DM','p','dir%','turn%','n']).sort_values('RMSE')
pd.set_option('display.width',200,'display.max_colwidth',34)
print(df.to_string(index=False,float_format=lambda x:f"{x:.2f}"))
print(f"\nN turning points: {len(turns)} | bench no-change RMSE={rmse_nc:.2f} | N_oos válidos varia (col n)")
