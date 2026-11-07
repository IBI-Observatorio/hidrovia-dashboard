import json, urllib.request
G="n1/all/n2/all/n3/all"
Q={
 "estab":"t/6754/%s/v/183,184/p/all/c829/46302,46304/c221/111195/c12517/113601/c220/110085",
 "conect":"t/6962/%s/v/183/p/all/c836/46531/c12549/46553/c798/all/c220/110085",
 "fin_agente":"t/6895/%s/v/1990/p/all/c829/46302,46304/c12542/all/c218/46502/c12517/113601/c12544/115949/c220/110085",
 "fin_prog":"t/6895/%s/v/1990/p/all/c829/46302/c12542/115947/c218/46502/c12517/113601/c12544/all/c220/110085",
 "vp":"t/6897/%s/v/40,1999/p/all/c829/46302,46304/c12547/114017,111995,111999/c218/46502/c12517/113601",
 "po":"t/6884/%s/v/185/p/all/c829/46302,46304/c2/6794,5/c223/46571/c218/46502/c12517/113601",
}
for k,q in Q.items():
    url="https://apisidra.ibge.gov.br/values/"+(q%G)
    d=json.load(urllib.request.urlopen(url,timeout=180))
    json.dump(d,open(k+".json","w",encoding="utf-8"),ensure_ascii=False)
    print(k,len(d)-1,"linhas")
