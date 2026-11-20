# Backtest CIOT fertilizante (NCM 31) x entregas ANDA. Hipoteses fixadas antes de rodar.
# Nowcast no dia ~10 de t+1: conhecido CIOT(t), Comex importacao cap.31 (t) e ANDA ate t-2.
import csv, json, math, collections, unicodedata
import numpy as np
from math import erf, sqrt
def norm(s): return ''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.combining(c)).upper().strip()
Y={k:v/1e3 for k,v in json.load(open('anda_entregas.json')).items()}
C=json.load(open('comex_fert_imp.json'))
PORTOS={'PARANAGUA','RIO GRANDE','SANTOS','CUBATAO','GUARUJA','SAO LUIS','BARCARENA','SAO FRANCISCO DO SUL','CANDEIAS','VITORIA','IMBITUBA'}
X=collections.defaultdict(collections.Counter)
for r in csv.DictReader(open('ciot_filtrado.csv',encoding='utf-8')):
    if not r['ncm'].replace('.','').startswith('31'): continue
    c=int(float(r['ciots'])); m=r['mes']
    if r['mun_d']: X['fert_total'][m]+=c
    if norm(r['mun_o']) in PORTOS: X['fert_portos'][m]+=c
    if r['uf_d']=='MT': X['fert_mt'][m]+=c
def sh(m,k):
    y,mm=map(int,m.split('-')); mm+=k
    while mm>12: y+=1; mm-=12
    while mm<1: y-=1; mm+=12
    return f'{y}-{mm:02d}'
def meses(a,b):
    out=[a]
    while out[-1]<b: out.append(sh(out[-1],1))
    return out
def yoy(S,m):
    a,b=S.get(m),S.get(sh(m,-12))
    return math.log(a/b) if a and b else None
ols=lambda A,z: np.linalg.lstsq(A,z,rcond=None)[0]
def feats(t,h,xs,modelo):
    base=[1,yoy(Y,sh(t,-2))]
    if 'C' in modelo: base.append(yoy(C,t))
    if 'X' in modelo: base.append(yoy(xs,t))
    return base
def oos(xs,h,modelo,ini_oos,fim):
    err=[]; rw=[]
    for t in meses(ini_oos, sh(fim,-h)):
        tr=[m for m in meses('2020-01', sh(t,-h)) if None not in feats(m,h,xs,modelo)+[yoy(Y,sh(m,h))]]
        f=feats(t,h,xs,modelo)
        if len(tr)<12 or None in f or yoy(Y,sh(t,h)) is None: continue
        b=ols(np.array([feats(m,h,xs,modelo) for m in tr]),np.array([yoy(Y,sh(m,h)) for m in tr]))
        real=yoy(Y,sh(t,h)); err.append((sh(t,h),real,float(b@f))); rw.append(real-yoy(Y,sh(t,-2)))
    return err,rw
rmse=lambda e: sqrt(np.mean([(r-p)**2 for _,r,p in e]))
def dm(ea,eb):
    d=np.array([(a[1]-a[2])**2-(b[1]-b[2])**2 for a,b in zip(ea,eb)]); z=d.mean()/(d.std(ddof=1)/sqrt(len(d)))
    return round(float(z),2), round(0.5*(1+erf(z/sqrt(2))),3)
R={}
for xn in ['fert_total','fert_portos','fert_mt']:
    xs=X[xn]; ms=[m for m in meses('2021-01','2026-04')]
    cor={}
    for k in (-1,0,1,2):   # k>0: CIOT(t) vs ANDA(t+k)
        p=[(yoy(xs,m),yoy(Y,sh(m,k))) for m in ms if None not in (yoy(xs,m),yoy(Y,sh(m,k))) and sh(m,k)<='2026-04']
        cor[k]=(round(float(np.corrcoef(*zip(*p))[0,1]),2),len(p))
    pc=[(yoy(C,m),yoy(Y,m)) for m in ms if None not in (yoy(C,m),yoy(Y,m))]
    R[xn]={'corr_yoy_ciot_vs_anda(k)':cor,'corr_yoy_comex_vs_anda(0)':round(float(np.corrcoef(*zip(*pc))[0,1]),2)}
    for h in (0,1):
        e1,rw=oos(xs,h,'',   '2023-01','2026-04'); e2,_=oos(xs,h,'C','2023-01','2026-04')
        e3,_=oos(xs,h,'CX','2023-01','2026-04'); e4,_=oos(xs,h,'X','2023-01','2026-04')
        R[xn][f'h{h}']={'n':len(e3),'rmse_ingenuo':round(sqrt(np.mean(np.square(rw))),3),'rmse_AR':round(rmse(e1),3),
            'rmse_AR+comex':round(rmse(e2),3),'rmse_AR+comex+ciot':round(rmse(e3),3),'rmse_AR+ciot':round(rmse(e4),3),
            'razao ciot|comex':round(rmse(e3)/rmse(e2),3),'DM ciot|comex (z,p)':dm(e3,e2),
            'razao ciot|AR':round(rmse(e4)/rmse(e1),3),'DM ciot|AR (z,p)':dm(e4,e1)}
print(json.dumps(R,indent=1,ensure_ascii=False))
json.dump(R,open('resultado_fert.json','w'),ensure_ascii=False,indent=1)
for xn in ['fert_total','fert_portos']:
    print(xn,[(m,X[xn][m]) for m in meses('2025-09','2026-08')])
