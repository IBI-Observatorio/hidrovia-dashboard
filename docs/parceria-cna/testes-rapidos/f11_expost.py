# F11 (1): ex post da pavimentacao da BR-163/PA (concluida em nov/2019).
# Participacao dos portos do Tapajos (URF Santarem + Belem/Barcarena) na exportacao de soja+milho com origem MT, anual 2005-2025.
# Teste: quebra de nivel/tendencia a partir de 2020, contra a tendencia 2012-2019, controlando a agua (cota set-out Itaituba).
import json,collections,numpy as np
exec(open('f10b/rodada2.py').read().split("pv=json.load")[0])
it=json.load(open('f10b/itaituba_mensal.json'))
anual=collections.defaultdict(collections.Counter)
for (uf,g),Z in EXPUF.items():
    if uf!='MT': continue
    for m,v in Z.items(): anual[int(m[:4])][g]+=v
print('ano | total MT (Mt) | Tapajos (stm+bel) | Madeira (ita) | Itaqui (slz) | Santos | Paranagua')
S={}
for a in range(2005,2026):
    t=sum(anual[a].values()); tap=anual[a]['stm']+anual[a]['bel']
    S[a]=tap/t
    print(f"{a} | {t/1e3:5.1f} | {tap/t:5.1%} | {anual[a]['ita']/t:5.1%} | {anual[a]['slz']/t:5.1%} | {anual[a]['sts']/t:5.1%} | {anual[a]['pgu']/t:5.1%}")
# tendencia pre (2012-2019) projetada para 2020-2025
pre=list(range(2012,2020)); pos=list(range(2020,2026))
b=np.polyfit(pre,[S[a] for a in pre],1)
print('\ntendencia pre-2020: +%.1f p.p./ano' % (100*b[0]))
for a in pos: print(f'  {a}: observado {S[a]:.1%} | tendencia pre {np.polyval(b,a):.1%} | excesso {100*(S[a]-np.polyval(b,a)):+.1f} p.p.')
# regressao com quebra: share ~ a + b*t + c*pos + d*(t-2019)*pos + e*cota_itaituba
Y=[];X=[]
def cota(a):
    v=[it[f'{a}-{m}']['media_m'] for m in ('09','10') if f'{a}-{m}' in it]; return np.mean(v) if v else np.nan
for a in range(2012,2026):
    p=1 if a>=2020 else 0; Y.append(S[a]); X.append([1,a-2019,p,(a-2019)*p,cota(a)])
X=np.array(X);Y=np.array(Y); ok=~np.isnan(X).any(1); X,Y=X[ok],Y[ok]
c,*_=np.linalg.lstsq(X,Y,rcond=None); e=Y-X@c; s2=e@e/(len(Y)-X.shape[1]); se=np.sqrt(np.diag(s2*np.linalg.inv(X.T@X)))
for n,v,s in zip(['const','tendencia','degrau 2020+','mud. tendencia','cota Itaituba (m)'],c,se): print(f'  {n:18s} {v:+.3f} (ep {s:.3f})')
