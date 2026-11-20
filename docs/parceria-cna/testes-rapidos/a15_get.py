import json,time,urllib.request,urllib.error,sys
def get(url,tries=30):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url,timeout=120) as r: return r.status,json.load(r)
        except urllib.error.HTTPError as e:
            if e.code!=429: return e.code,e.read()[:300]
            time.sleep(8+2*i)
        except Exception as e: time.sleep(10)
    return 429,None
if __name__=='__main__':
    for u in sys.argv[1:]:
        s,d=get(u);print('##',s,u);print(json.dumps(d,ensure_ascii=False)[:3000] if not isinstance(d,bytes) else d);time.sleep(10)
