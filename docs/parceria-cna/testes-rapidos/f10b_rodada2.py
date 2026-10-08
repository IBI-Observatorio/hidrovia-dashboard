# F10, 2a rodada: (1) serie longa 1997-2025 (limiar), (2) Tapajos, (3) desvio x perda em 2024.
# Metodo de evento (igual a 1a rodada): esperado(ago-nov) = exp(jan-jul) * razao mediana ago-nov/jan-jul dos anos "normais"
# (cota set-out >= 2,5 m na estacao da rota), excluindo o proprio ano avaliado.
import json,collections,numpy as np,csv,unicodedata
EXP=collections.defaultdict(collections.Counter)   # (urf_grupo) -> mes -> mil t ; tambem por UF de origem
EXPUF=collections.defaultdict(collections.Counter)
def grp(u):
    u=u.upper()
    for k,g in (('MANAUS','ita'),('SANTAREM','stm'),('BEL','bel'),('SAO LUIS','slz'),('SANTOS','sts'),('PARANAGUA','pgu'),('SANTANA','stn'),('VITORIA','vix'),('RIO GRANDE','rig'),('SAO FRANCISCO','sfs'),('SALVADOR','ssa')):
        if k in u: return g
    return 'outros'
UFS={'Mato Grosso':'MT','Rondônia':'RO','Rondonia':'RO'}
for f in ('f10b/comex_1997_2014.json','bt/comex_urf_uf.json'):
    for a,rows in json.load(open(f)).items():
        if f.startswith('bt') and int(a)<2015: continue
        for r in rows:
            m=f"{r['year']}-{int(r['monthNumber']):02d}"; kg=int(r['metricKG'])/1e6; g=grp(r['urf'])
            EXP[g][m]+=kg
            uf=UFS.get(r['state'])
            if uf: EXPUF[(uf,g)][m]+=kg
pv=json.load(open('f10b/portovelho_mensal.json')); it=json.load(open('f10b/itaituba_mensal.json'))
def so(s,a): v=[s[f'{a}-{m}']['media_m'] for m in ('09','10') if f'{a}-{m}' in s]; return np.mean(v) if v else None
JJ=[f'{i:02d}' for i in range(1,8)]; AN=['08','09','10','11']
def soma(Z,a,mm): return sum(Z.get(f'{a}-{m}',0) for m in mm)
def evento(Z,cota,anos,minjj=200):
    out={}
    for a in anos:
        if soma(Z,a,JJ)<minjj or cota(a) is None: continue
        normais=[b for b in anos if b!=a and cota(b) is not None and cota(b)>=2.5 and soma(Z,b,JJ)>=minjj]
        r=np.median([soma(Z,b,AN)/soma(Z,b,JJ) for b in normais]); esp=soma(Z,a,JJ)*r; real=soma(Z,a,AN)
        out[a]=(round(cota(a),2),round(esp),round(real),round(real/esp-1,2))
    return out
print('=== (1) Itacoatiara (URF Manaus) x cota set-out Porto Velho, 1998-2025')
e1=evento(EXP['ita'],lambda a: so(pv,a),range(1998,2026))
for a,v in sorted(e1.items(),key=lambda x:x[1][0]): print(f'  {a}: cota {v[0]:.2f} m | esperado {v[1]} | real {v[2]} mil t | desvio {v[3]:+.0%}')
dev=[v[3] for v in e1.values() if v[0]>=2.5]; print(f'  anos com cota>=2,5 m: desvio p10/p50/p90 = {np.percentile(dev,10):+.0%}/{np.percentile(dev,50):+.0%}/{np.percentile(dev,90):+.0%} (n={len(dev)})')
print('\n=== (2) Tapajos: Santarem+Belem (URF) x cota set-out Itaituba, 2015-2025 (Miritituba operando)')
nb=collections.Counter(); 
for g in ('stm','bel'):
    for m,v in EXP[g].items(): nb[m]+=v
e2=evento(nb,lambda a: so(it,a),range(2015,2026))
for a,v in sorted(e2.items(),key=lambda x:x[1][0]): print(f'  {a}: cota Itaituba {v[0]:.2f} m | esperado {v[1]} | real {v[2]} | desvio {v[3]:+.0%}')
# CIOT MT->Itaituba ago-nov
def norm(s): return ''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.combining(c)).upper().strip()
ci=collections.Counter()
for r in csv.DictReader(open('bt/ciot_filtrado.csv',encoding='utf-8')):
    if r['ncm'].replace('.','')[:4] in('1201','1005') and norm(r['mun_d'])=='ITAITUBA' and r['uf_d']=='PA': ci[r['mes']]+=int(float(r['ciots']))
e3=evento(ci,lambda a: so(it,a),range(2020,2026),minjj=1000)
print('  CIOT de grao com destino Itaituba, ago-nov:')
for a,v in sorted(e3.items()): print(f'    {a}: cota {v[0]:.2f} | esperado {v[1]} | real {v[2]} CIOTs | desvio {v[3]:+.0%}')
print('\n=== (3) 2024: desvio x perda. Exportacao de soja+milho com origem MT e RO, ago-nov/2024, por porto')
normais=[a for a in range(2016,2026) if so(pv,a)>=2.5 and a!=2024]
tot_esp=tot_real=0
for uf in ('MT','RO'):
    for g in ('ita','stm','bel','slz','sts','pgu','vix','rig','sfs','stn','outros'):
        Z=EXPUF[(uf,g)]
        if soma(Z,2024,JJ)+soma(Z,2024,AN)<50: continue
        rs=[soma(Z,b,AN)/soma(Z,b,JJ) for b in normais if soma(Z,b,JJ)>30]
        if not rs: continue
        esp=soma(Z,2024,JJ)*np.median(rs); real=soma(Z,2024,AN); tot_esp+=esp; tot_real+=real
        print(f'  {uf}->{g}: esperado {esp:6.0f} | real {real:6.0f} | dif {real-esp:+6.0f} mil t')
print(f'  TOTAL MT+RO: esperado {tot_esp:.0f} | real {tot_real:.0f} | dif {tot_real-tot_esp:+.0f} mil t ({tot_real/tot_esp-1:+.0%})')
