import re,json,collections,numpy as np
def serie(f):
    x=open(f,encoding='utf-8').read(); por={}
    for bloco in re.findall(r'<SerieHistorica[^>]*>([\s\S]*?)</SerieHistorica>',x):
        g=lambda t: (re.search(f'<{t}>([^<]*)</{t}>',bloco) or [None,None])[1]
        m=g('DataHora')[:7]; nc=int(g('NivelConsistencia') or 1)
        vals=[float(v) for d in range(1,32) if (v:=g(f'Cota{d:02d}')) not in (None,'')]
        if len(vals)<15: continue
        if m not in por or nc>por[m][0]: por[m]=(nc,np.mean(vals)/100,min(vals)/100)
    return {m:{'media_m':round(v[1],2),'min_m':round(v[2],2),'consistido':v[0]==2} for m,v in sorted(por.items())}
for c,n in (('15400000','portovelho'),('17730000','itaituba')):
    s=serie(f'h{c}.xml'); json.dump(s,open(f'{n}_mensal.json','w'),indent=0)
    ms=sorted(s); print(n,len(ms),ms[0],ms[-1],'consistidos',sum(v['consistido'] for v in s.values()))
    print('  set-out media por ano:',{a:round(np.mean([s[f'{a}-{m}']['media_m'] for m in ('09','10') if f'{a}-{m}' in s]),2) for a in range(1997,2026) if any(f'{a}-{m}' in s for m in ('09','10'))})
