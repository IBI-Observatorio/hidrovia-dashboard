exec(open('backtest.py').read().split('R=[]')[0])
from math import erf, sqrt
def detalhe(xn,yn,ini,fim,oos_ini,h=1,xs=None):
    x=xs or X[xn]; y=Y[yn]; rows=[]
    for t in meses(oos_ini, sh(fim,-h)):
        tr=[m for m in meses(ini, sh(t,-h)) if None not in (yoy(y,m),yoy(x,m),yoy(y,sh(m,h)))]
        if len(tr)<12 or None in (yoy(y,t),yoy(x,t)): continue
        A=np.array([[1,yoy(y,m)] for m in tr]); B=np.array([[1,yoy(y,m),yoy(x,m)] for m in tr]); z=np.array([yoy(y,sh(m,h)) for m in tr])
        pb=ols(A,z)@[1,yoy(y,t)]; ba=ols(B,z); pa=ba@[1,yoy(y,t),yoy(x,t)]
        real=yoy(y,sh(t,h))
        rows.append((sh(t,h),real,pb,pa,ba[2]))
    return rows
def dm(rows):
    d=np.array([(r[1]-r[3])**2-(r[1]-r[2])**2 for r in rows if r[1] is not None])
    s=d.std(ddof=1)/sqrt(len(d)); z=d.mean()/s; p=0.5*(1+erf(z/sqrt(2)))
    return round(z,2), round(p,3)   # p unilateral: H1 = com X melhor
for xn,yn in [('ciot_mir','norte'),('ciot_an','an')]:
    rows=detalhe(xn,yn,'2020-01','2026-04','2023-01')
    print(xn,yn,'DM z,p =',dm(rows), 'coef X ultimo=%.2f'%rows[-1][4])
    for ano in ('2023','2024','2025','2026'):
        rr=[r for r in rows if r[0].startswith(ano)]
        if rr:
            f=lambda i: sqrt(np.mean([(r[1]-r[i])**2 for r in rr]))
            print('  ',ano,'n=%d rmse base %.3f com_x %.3f razao %.2f'%(len(rr),f(2),f(3),f(3)/f(2)))
# participacao (robusta a mudanca de cobertura): Itaituba / total soja+milho CIOT
tot=collections.Counter()
for r in csv.DictReader(open('ciot_filtrado.csv',encoding='utf-8')):
    if r['ncm'].replace('.','')[:4] in('1201','1005') and r['mun_d']: tot[r['mes']]+=int(float(r['ciots']))
# pos-quebra: modelo treinado ate abr/2026, prevendo jun-set/2026 (set/2026 = previsao real, Comex ainda nao publicou)
x,y=X['ciot_mir'],Y['norte']; h=1
tr=[m for m in meses('2020-01','2026-03') if None not in (yoy(y,m),yoy(x,m),yoy(y,sh(m,h)))]
B=np.array([[1,yoy(y,m),yoy(x,m)] for m in tr]); z=np.array([yoy(y,sh(m,h)) for m in tr]); ba=ols(B,z)
A=np.array([[1,yoy(y,m)] for m in tr]); bb=ols(A,z)
print('coef (const, yoyY, yoyX)=',np.round(ba,2))
for t in ['2026-04','2026-05','2026-06','2026-07','2026-08']:
    alvo=sh(t,1); pa=ba@[1,yoy(y,t),yoy(x,t)]; pb=bb@[1,yoy(y,t)]
    real=yoy(y,alvo)
    prev_mt = y[sh(alvo,-12)]*math.exp(pa)
    print(f'info {t} -> alvo {alvo}: yoyX={yoy(x,t):+.2f} prev_com_x={pa:+.2f} ({prev_mt:,.0f} mil t) base={pb:+.2f} real={"n/d" if real is None else f"{real:+.2f} ({y[alvo]:,.0f} mil t)"}')
print('ciot_mir yoy 2026:',[(m,round(yoy(x,m),2)) for m in meses('2026-01','2026-08')])
print('ciot total c/destino yoy 2026:',[(m,round(math.log(tot[m]/tot[sh(m,-12)]),2)) for m in meses('2026-01','2026-08')])
