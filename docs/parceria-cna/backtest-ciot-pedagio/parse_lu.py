# Extrai tonelagem de fertilizante (importacao) do line-up APPA arquivado no Wayback.
import os,re,json,html as H
cdx={r[0]:r[1] for r in json.load(open('cdx.json'))[1:]}
RXF=re.compile(r'FERT|UREIA|ADUB|CLORETO|SULFATO DE AMONIO|NITRATO|FOSFAT|SUPERFOSF|POTASS|NPK|MAP |DAP|ORTOFOSF',re.I)
SEC=['ATRACADOS','PROGRAMADOS','AO LARGO','ESPERADOS','DESPACHADOS']
def cells(tr): return [re.sub(r'\s+',' ',H.unescape(re.sub(r'<[^>]+>',' ',c))).strip() for c in re.findall(r'<t[dh][^>]*>([\s\S]*?)</t[dh]>',tr,re.I)]
def num(s):
    m=re.search(r'([\d\.]+,\d+)',s); return float(m.group(1).replace('.','').replace(',','.')) if m else None
out=[]; descartados=[]
for f in sorted(os.listdir('snaps')):
    ts=f[:-5]; orig=cdx.get(ts,'')
    if 'Corex' in orig: continue
    b=open('snaps/'+f,'rb').read()
    try: h=b.decode('utf-8')
    except: h=b.decode('latin1')
    m=re.search(r'Emiss[ãa]o:\s*(\d\d)/(\d\d)/(\d{4})',h) or re.search(r'Gerado:?\s*(\d\d)/(\d\d)/(\d{4})',h)
    data=f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else f'{ts[:4]}-{ts[4:6]}-{ts[6:8]}'
    tot={s:{} for s in SEC}; pos=0; ok=False
    for tm in re.finditer(r'<table[\s\S]*?</table>',h,re.I):
        antes=re.sub(r'<[^>]+>',' ',h[max(0,tm.start()-3000):tm.start()]).upper()
        rows=[cells(tr) for tr in re.findall(r'<tr[\s\S]*?</tr>',tm.group(0),re.I)]
        rows=[r for r in rows if r]
        # secao: a ultima palavra-chave antes da tabela ou dentro da primeira linha
        sec=None; txt0=' '.join(rows[0]).upper() if rows else ''
        for s in SEC:
            if s in txt0: sec=s
        if not sec:
            idx=[(antes.rfind(s),s) for s in SEC]; idx=[x for x in idx if x[0]>=0]
            sec=max(idx)[1] if idx else None
        hdr=next((r for r in rows if any(c.upper()=='SENTIDO' for c in r)),None)
        if not sec or not hdr: continue
        H_=[c.upper() for c in hdr]; n=len(H_)
        def col(nome):
            return next((i for i,c in enumerate(H_) if c.startswith(nome)),None)
        iS,iM,iP,iSa,iE=col('SENTIDO'),col('MERCADORIA'),col('PREVISTO'),col('SALDO'),col('EMBARCA')
        if None in (iS,iM,iP): continue
        ok=True; ship=None
        for r in rows[rows.index(hdr)+1:]:
            if len(r)==n: ship=r[iE] if iE is not None else r[0]; rr=r
            elif ship and len(r)<n and len(r)>=n-iS: off=n-len(r); rr=['']*off+r
            else: continue
            if rr[iS].strip().upper()!='IMP' or not RXF.search(rr[iM]): continue
            t=num(rr[iSa]) if (sec=='ATRACADOS' and iSa is not None and iSa<len(rr)) else num(rr[iP])
            if t and t<=100000: tot[sec][ship]=max(tot[sec].get(ship,0),t)
            elif t: descartados.append((data,sec,ship,t))
    if ok:
        out.append({'ts':ts,'data':data,'fonte':orig.split('WCI=')[-1][:25],**{s:round(sum(v.values())/1e3,1) for s,v in tot.items()},**{'n_'+s:len(v) for s,v in tot.items()}})
json.dump(out,open('lineup_fert_hist.json','w'),indent=0)
for o in out: print(o['data'],o['fonte'],'ATR',o['ATRACADOS'],'PROG',o['PROGRAMADOS'],'LARGO',o['AO LARGO'],'ESP',o['ESPERADOS'],'navios',o['n_PROGRAMADOS']+o['n_AO LARGO']+o['n_ESPERADOS'])
print(len(out))
print("descartados (>100 kt/navio):",len(descartados),descartados[:8])
