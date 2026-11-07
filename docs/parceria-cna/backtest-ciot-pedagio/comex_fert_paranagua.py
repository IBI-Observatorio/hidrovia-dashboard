import json,time,urllib.request
out={}
for ano in range(2015,2027):
    fim='2026-08' if ano==2026 else f'{ano}-12'
    body={"flow":"import","monthDetail":True,"period":{"from":f"{ano}-01","to":fim},"filters":[{"filter":"chapter","values":["31"]},{"filter":"urf","values":["0917800"]}],"details":[],"metrics":["metricKG"]}
    for t in range(12):
        try:
            d=json.load(urllib.request.urlopen(urllib.request.Request("https://api-comexstat.mdic.gov.br/general",data=json.dumps(body).encode(),headers={"Content-Type":"application/json"}),timeout=120));break
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(15); continue
            print(e.read()[:300]); raise
    for r in d['data']['list']: out[f"{r['year']}-{int(r['monthNumber']):02d}"]=int(r['metricKG'])/1e6
    print(ano,len(d['data']['list']),flush=True); time.sleep(12)
json.dump(out,open('comex_fert_paranagua.json','w'))
