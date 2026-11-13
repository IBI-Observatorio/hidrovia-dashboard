# Backtest CIOT e pedagio x exportacao (Comex Stat), mensal. Hipoteses fixadas antes de rodar.
import csv, json, math, collections, unicodedata
import numpy as np
def norm(s): return ''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.combining(c)).upper().strip()
def ym(s):  # varios formatos -> 'YYYY-MM'
    s=s.strip()
    if len(s)==7 and s[4]=='-': return s
    p=s.split('/')
    return f'{p[-1]}-{int(p[-2]):02d}'
# ---------- Y: Comex
cx=json.load(open('comex_urf_uf.json'))
Y=collections.defaultdict(lambda: collections.Counter())
URF={'SANTAREM':'stm','BEL':'bel','SAO LUIS':'slz','MANAUS':'mao','SANTANA':'stn'}
for a,rows in cx.items():
    for r in rows:
        m=f"{r['year']}-{int(r['monthNumber']):02d}"; kg=int(r['metricKG'])/1e6  # mil t
        u=r['urf'].upper()
        for k,v in URF.items():
            if k in u: Y[v][m]+=kg
        if r['state']=='Mato Grosso': Y['mt'][m]+=kg
Y['norte']={m:Y['stm'][m]+Y['bel'][m] for m in set(Y['stm'])|set(Y['bel'])}
Y['ama']={m:Y['mao'][m]+Y['stm'][m] for m in set(Y['mao'])|set(Y['stm'])}
Y['an']={m:sum(Y[k][m] for k in ['stm','bel','slz','mao','stn']) for m in set(Y['stm'])|set(Y['slz'])}
# ---------- X: CIOT
X=collections.defaultdict(collections.Counter)
AN={'ITAITUBA','PORTO VELHO','SAO LUIS','BARCARENA','SANTAREM','PORTO NACIONAL','PALMEIRANTE','PORTO FRANCO'}
for r in csv.DictReader(open('ciot_filtrado.csv',encoding='utf-8')):
    if r['ncm'].replace('.','')[:4] not in('1201','1005'): continue
    c=int(float(r['ciots'])); d=norm(r['mun_d']); m=r['mes']
    if d=='ITAITUBA' and r['uf_d']=='PA': X['ciot_mir'][m]+=c
    if d=='PORTO VELHO' and r['uf_d']=='RO': X['ciot_pvh'][m]+=c
    if d in AN: X['ciot_an'][m]+=c
# ---------- X: pedagio (comercial >=5 eixos)
import re
for r in csv.DictReader(open('pedagio_filtrado.csv',encoding='utf-8')):
    if r['tipo_veiculo'].strip()!='Comercial': continue
    e=re.search(r'(\d+)', r['categoria']); 
    if not e: continue
    eix=int(e.group(1))
    if 'Acima' in r['categoria']: eix=11
    if eix<5: continue
    m=ym(r['data']); v=float(r['volume'].replace('.','').replace(',','.'))
    k=r['concessionaria'].strip().upper()
    if k in('CRO','NOVA ROTA DO OESTE'): X['ped_cro'][m]+=v
    if k=='VIA BRASIL':
        X['ped_vb'][m]+=v
        if 'Trair' in r['praca']: X['ped_trairao'][m]+=v
# ---------- analise
def meses(a,b):
    y,mm=map(int,a.split('-')); out=[]
    while f'{y}-{mm:02d}'<=b:
        out.append(f'{y}-{mm:02d}'); mm+=1
        if mm==13: y+=1; mm=1
    return out
def sh(m,k):
    y,mm=map(int,m.split('-')); mm+=k
    while mm>12: y+=1; mm-=12
    while mm<1: y-=1; mm+=12
    return f'{y}-{mm:02d}'
def yoy(S,m):
    a,b=S.get(m),S.get(sh(m,-12))
    return math.log(a/b) if a and b and a>0 and b>0 else None
def ols(Xm,y):
    b,*_=np.linalg.lstsq(Xm,y,rcond=None); return b
def run(xn,yn,ini,fim,oos_ini):
    x,y=X[xn],Y[yn]; res={'par':f'{xn} -> {yn}','janela':f'{ini}..{fim}'}
    ms=[m for m in meses(ini,fim) if x.get(m) and y.get(m)]
    # correlacao em nivel (sazonal) e em yoy por defasagem k
    for k in (0,1,2):
        pl=[(x[m],y[sh(m,k)]) for m in ms if y.get(sh(m,k)) and sh(m,k)<=fim]
        py=[(yoy(x,m),yoy(y,sh(m,k))) for m in ms if sh(m,k)<=fim]
        py=[p for p in py if None not in p]
        res[f'r_nivel_k{k}']=round(float(np.corrcoef(*zip(*pl))[0,1]),2)
        res[f'r_yoy_k{k}']=(round(float(np.corrcoef(*zip(*py))[0,1]),2),len(py))
    # OOS: prever yoy_Y(t+h) com info em t (Y(t) e X(t) publicados ~dia 10 de t+1)
    for h in (1,2):
        e_rw,e_b,e_a,hit=[],[],[],[]
        for t in meses(oos_ini, sh(fim,-h)):
            tr=[m for m in meses(ini, sh(t,-h)) if None not in (yoy(y,m),yoy(x,m),yoy(y,sh(m,h)))]
            if len(tr)<12 or None in (yoy(y,t),yoy(x,t),yoy(y,sh(t,h))): continue
            A=np.array([[1,yoy(y,m)] for m in tr]); B=np.array([[1,yoy(y,m),yoy(x,m)] for m in tr]); z=np.array([yoy(y,sh(m,h)) for m in tr])
            bb=ols(A,z); ba=ols(B,z); real=yoy(y,sh(t,h))
            pb=bb@[1,yoy(y,t)]; pa=ba@[1,yoy(y,t),yoy(x,t)]
            e_rw.append(real-yoy(y,t)); e_b.append(real-pb); e_a.append(real-pa); hit.append((pa>0)==(real>0))
        if e_a:
            r=lambda e: math.sqrt(np.mean(np.square(e)))
            res[f'oos_h{h}']={'n':len(e_a),'rmse_base':round(r(e_b),3),'rmse_com_x':round(r(e_a),3),
                'razao_com_x/base':round(r(e_a)/r(e_b),3),'razao_com_x/ingenuo':round(r(e_a)/r(e_rw),3),'acerto_sinal':round(np.mean(hit),2)}
    return res
R=[]
R.append(run('ciot_mir','norte','2020-01','2026-04','2023-01'))
R.append(run('ciot_pvh','ama','2020-01','2026-04','2023-01'))
R.append(run('ciot_an','an','2020-01','2026-04','2023-01'))
R.append(run('ped_cro','mt','2015-09','2026-07','2019-01'))
R.append(run('ped_cro','an','2015-09','2026-07','2019-01'))
R.append(run('ped_vb','norte','2023-02','2026-07','2025-01'))
R.append(run('ped_trairao','norte','2023-02','2026-07','2025-01'))
for r in R: print(json.dumps(r,ensure_ascii=False))
json.dump(R,open('resultado.json','w'),ensure_ascii=False,indent=1)
# series p/ inspecao
for k in ['ped_vb','ped_cro']:
    print(k,[ (m,int(X[k][m])) for m in sorted(X[k])][-10:])
print('ciot_mir',[ (m,X['ciot_mir'][m]) for m in sorted(X['ciot_mir'])][-8:])
print('Y norte',[ (m,round(Y['norte'][m])) for m in sorted(Y['norte'])][-8:])
