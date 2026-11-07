import json,time,urllib.request
out={}
for ano in range(1997,2015):
    body={"flow":"export","monthDetail":True,"period":{"from":f"{ano}-01","to":f"{ano}-12"},
          "filters":[{"filter":"ncm","values":["12019000","12010090","10059010","10059000"]}],"details":["urf","state","ncm"],"metrics":["metricKG"]}
    for t in range(12):
        try:
            d=json.load(urllib.request.urlopen(urllib.request.Request("https://api-comexstat.mdic.gov.br/general",data=json.dumps(body).encode(),headers={"Content-Type":"application/json"}),timeout=120)); break
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(15); continue
            print(e.read()[:300]); raise
    out[ano]=d['data']['list']; print(ano,len(out[ano]),sorted({r['coNcm'] for r in out[ano]}),flush=True); time.sleep(12)
json.dump(out,open('f10b/comex_1997_2014.json','w'))
