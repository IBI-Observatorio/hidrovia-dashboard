# Serie semanal de % colhido em MT (soja e milho 2a) 2022-2026:
# 2022-2024: XLSX 'Plantio e Colheita' dos zips historicos da Conab; 2025-2026: cache do repo (data/conab/progresso-colheita.json).
import openpyxl, warnings, glob, json, datetime, re
warnings.filterwarnings('ignore')
S={}; M={}
def parse(fn):
    ws=openpyxl.load_workbook(fn,data_only=True,read_only=True).worksheets[0]
    cult=None; bloco=None; datas=None
    for r in ws.iter_rows(values_only=True):
        v=[x for x in r if x is not None]
        if not v: continue
        s0=str(v[0])
        if ' - Safra' in s0 or '- Safra' in s0:
            cult='S' if s0.startswith('Soja') else ('M2' if s0.startswith('Milho 2') else None); bloco=None; continue
        if s0.startswith('Colheita'): bloco='C'; continue
        if s0.startswith('Semeadura'): bloco='P'; continue
        if isinstance(v[0],datetime.datetime): datas=v; continue
        if cult and bloco=='C' and s0.strip()=='Mato Grosso' and datas and len(v)>=4:
            d=datas[-1].date().isoformat()
            {'S':S,'M2':M}[cult][d]=float(v[-1])
            # coluna 'mesma semana do ano anterior'
            dp=datas[0].date().isoformat(); {'S':S,'M2':M}[cult].setdefault(dp,float(v[1]))
for fn in sorted(glob.glob('z20*/*/*/PlantioZeZColheita*.xlsx')):
    try: parse(fn)
    except Exception as e: print('erro',fn,e)
c=json.load(open('C:/Dev/Claude/Hidrovias/hidrovia-dashboard/data/conab/progresso-colheita.json',encoding='utf-8'))
for w in c['semanas']:
    d=w['d']
    for k,D in (('S',S),('M2',M)):
        if k in w and 'MT' in w[k]['u']:
            a,m5,ant=w[k]['u']['MT']; D[d]=a
            dp=(datetime.date.fromisoformat(d)-datetime.timedelta(days=364)).isoformat(); D.setdefault(dp,ant)
json.dump({'S':dict(sorted(S.items())),'M2':dict(sorted(M.items()))},open('progresso_mt.json','w'),indent=0)
for k,D in (('soja',S),('milho2',M)):
    anos={}
    for d,v in D.items(): anos.setdefault(d[:4],[]).append(v)
    print(k,len(D),{a:(len(x),round(min(x),2),round(max(x),2)) for a,x in sorted(anos.items())})
