import json,time,urllib.request
out={}
for ano in range(2018,2027):
    fim='2026-08' if ano==2026 else f'{ano}-12'
    body={"flow":"import","monthDetail":True,"period":{"from":f"{ano}-01","to":fim},"filters":[{"filter":"chapter","values":["31"]}],"details":[],"metrics":["metricKG"]}
    for t in range(12):
        try:
            req=urllib.request.Request("https://api-comexstat.mdic.gov.br/general",data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
            d=json.load(urllib.request.urlopen(req,timeout=120));break
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(15); continue
            print(e.read()[:300]); raise
    for r in d['data']['list']: out[f"{r['year']}-{int(r['monthNumber']):02d}"]=int(r['metricKG'])/1e3
    print(ano,len(d['data']['list']),flush=True); time.sleep(12)
json.dump(out,open('comex_fert_imp.json','w'))
