# EXPLORATORIO (nao pre-registrado): alvo = soma M + M+1, para suavizar o registro da DI no Comex.
exec(open('backtest_lineup_fert.py').read().split('rows=[]')[0])
rows=[]
for d,o in sorted(snaps.items()):
    M=d[:7]
    if sh(M,1) not in I or sh(M,-24) not in I: continue
    y=I[M]+I[sh(M,1)]; b=base(M,M)+base(sh(M,1),M)
    rows.append(dict(ano=d[:4],y=math.log(y),b=math.log(b),qt=math.log(o['ATRACADOS']+o['PROGRAMADOS']+o['AO LARGO']+o['ESPERADOS'])))
eb,ea=[],[]
for ano in sorted({r['ano'] for r in rows}):
    tr=[r for r in rows if r['ano']!=ano]; te=[r for r in rows if r['ano']==ano]
    ba=np.linalg.lstsq(np.array([[1,r['b']] for r in tr]),np.array([r['y'] for r in tr]),rcond=None)[0]
    bb=np.linalg.lstsq(np.array([[1,r['b'],r['qt']] for r in tr]),np.array([r['y'] for r in tr]),rcond=None)[0]
    for r in te: eb.append(r['y']-ba@[1,r['b']]); ea.append(r['y']-bb@[1,r['b'],r['qt']])
rm=lambda e: sqrt(np.mean(np.square(e)))
print('n',len(rows),'corr(qt, log real/base)',round(float(np.corrcoef([r['qt'] for r in rows],[r['y']-r['b'] for r in rows])[0,1]),2),'rmse base %.3f com lineup %.3f razao %.3f'%(rm(eb),rm(ea),rm(ea)/rm(eb)))
