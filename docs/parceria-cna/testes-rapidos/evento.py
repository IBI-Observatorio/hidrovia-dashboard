# EXPLORATORIO: perda por evento. Esperado(ago-nov, ano X) = exp(jan-jul, X) * razao mediana [ago-nov / jan-jul] nos anos
# em que a cota media de set-out em Porto Velho ficou acima de 2 m (anos "normais").
import json,collections,numpy as np
exec(open('f10/aguabaixa.py').read().split('ms=sorted')[0])
S=collections.Counter(); 
for a,rows in cx.items():
    for r in rows:
        if 'SANTAREM' in r['urf'].upper(): S[f"{r['year']}-{int(r['monthNumber']):02d}"]+=int(r['metricKG'])/1e6
def soma(Z,a,mm): return sum(Z.get(f'{a}-{m}',0) for m in mm)
JJ=[f'{i:02d}' for i in range(1,8)]; AN=['08','09','10','11']
cota={a:np.mean([pv.get(f'{a}-09',np.nan),pv.get(f'{a}-10',np.nan)]) for a in range(2016,2026)}
normais=[a for a in range(2016,2026) if cota[a]>2]
print('cota media set-out PVH:',{a:round(c,2) for a,c in cota.items()}); print('anos normais:',normais)
for nome,Z in (('Itacoatiara (URF Manaus)',Y),('Santarem',S)):
    r=np.median([soma(Z,a,AN)/soma(Z,a,JJ) for a in normais])
    print(f'\n{nome}: razao normal ago-nov/jan-jul = {r:.2f}')
    for a in (2023,2024):
        esp=soma(Z,a,JJ)*r; real=soma(Z,a,AN)
        print(f'  {a}: esperado {esp:,.0f} mil t, realizado {real:,.0f} mil t, diferenca {real-esp:+,.0f} mil t ({real/esp-1:+.0%})')
