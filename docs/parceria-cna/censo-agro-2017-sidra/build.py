import json, pandas as pd
def load(k):
    d=json.load(open(k+".json",encoding="utf-8")); h=d[0]
    df=pd.DataFrame(d[1:]).rename(columns={c:h[c] for c in h})
    df["val"]=pd.to_numeric(df["Valor"].replace({"-":0,"X":None,"..":None,"...":None}),errors="coerce")
    df["loc"]=df["Brasil, Grande Região e Unidade da Federação"]; df["nivel"]=df["Nível Territorial"]
    return df
out=pd.DataFrame()
e=load("estab"); 
p=e.pivot_table(index=["nivel","loc"],columns=["Variável","Tipologia"],values="val",aggfunc="sum")
out["estab"]=p[("Número de estabelecimentos agropecuários","Total")]
out["area_ha"]=p[("Área dos estabelecimentos agropecuários","Total")]
out["estab_fam"]=p[("Número de estabelecimentos agropecuários","Agricultura familiar - sim")]
out["area_fam"]=p[("Área dos estabelecimentos agropecuários","Agricultura familiar - sim")]
c=load("conect").pivot_table(index=["nivel","loc"],columns="Telefone, e-mail e internet",values="val",aggfunc="sum")
out["internet"]=c["Acesso à internet - sim"]; out["banda_larga"]=c["Tipo de conexão à internet - banda larga"]; out["movel"]=c["Tipo de conexão à internet - internet móvel"]
fa=load("fin_agente"); fa=fa[fa["Tipologia"]=="Total"].pivot_table(index=["nivel","loc"],columns="Agente financeiro responsável pelo financiamento",values="val",aggfunc="sum")
out["financiados"]=fa["Total"]; out["fin_bancos"]=fa["Bancos"]; out["fin_coop"]=fa["Cooperativas de crédito"]
fam=load("fin_agente"); fam=fam[(fam["Tipologia"]!="Total")&(fam["Agente financeiro responsável pelo financiamento"]=="Total")].set_index(["nivel","loc"])["val"]
out["financiados_fam"]=fam
fp=load("fin_prog").pivot_table(index=["nivel","loc"],columns="Recursos provenientes de programas governamentais de crédito",values="val",aggfunc="sum")
out["fin_pronaf"]=[fp[c] for c in fp.columns if "PRONAF" in c][0]
out["fin_programa"]=fp["São provenientes de programas de crédito"]
v=load("vp").pivot_table(index=["nivel","loc"],columns=["Variável","Tipologia","Tipo de produção"],values="val",aggfunc="sum")
VP="Valor da produção dos estabelecimentos agropecuários"
out["vp_mil"]=v[(VP,"Total","Total")]; out["vp_fam_mil"]=v[(VP,"Agricultura familiar - sim","Total")]
out["vp_animal"]=v[(VP,"Total","Animal")]; out["vp_vegetal"]=v[(VP,"Total","Vegetal")]
po=load("po").pivot_table(index=["nivel","loc"],columns=["Tipologia","Sexo"],values="val",aggfunc="sum")
out["pessoal"]=po[("Total","Total")]; out["pessoal_fam"]=po[("Agricultura familiar - sim","Total")]; out["pessoal_mulheres"]=po[("Total","Mulheres")]
o=out.reset_index()
o["pct_fam_estab"]=o.estab_fam/o.estab*100; o["pct_fam_area"]=o.area_fam/o.area_ha*100; o["pct_fam_vp"]=o.vp_fam_mil/o.vp_mil*100
o["area_media"]=o.area_ha/o.estab; o["pct_internet"]=o.internet/o.estab*100; o["pct_banda_larga"]=o.banda_larga/o.estab*100
o["pct_financ"]=o.financiados/o.estab*100; o["pct_fin_fam"]=o.financiados_fam/o.estab_fam*100
o["pct_fin_bancos"]=o.fin_bancos/o.financiados*100; o["pct_fin_coop"]=o.fin_coop/o.financiados*100; o["pct_fin_pronaf"]=o.fin_pronaf/o.financiados*100
o["vp_por_estab_mil"]=o.vp_mil/o.estab; o["vp_por_ha"]=o.vp_mil*1000/o.area_ha; o["vp_por_pessoa"]=o.vp_mil*1000/o.pessoal
o["pct_animal"]=o.vp_animal/o.vp_mil*100; o["pct_mulheres"]=o.pessoal_mulheres/o.pessoal*100
o.to_csv("censo_agro_2017_uf.csv",index=False,encoding="utf-8-sig")
pd.set_option("display.width",250); pd.set_option("display.max_columns",40)
cols=["loc","estab","area_media","pct_fam_estab","pct_fam_area","pct_fam_vp","pct_internet","pct_banda_larga","pct_financ","pct_fin_fam","pct_fin_coop","pct_fin_pronaf","vp_por_estab_mil","vp_por_ha","vp_por_pessoa","pct_animal","pct_mulheres"]
for n in ["Brasil","Grande Região","Unidade da Federação"]:
    print(o[o.nivel==n][cols].sort_values("estab",ascending=False).round(1).to_string(index=False))
print(o[o.nivel=="Brasil"][["estab","area_ha","pessoal","vp_mil","financiados","internet"]].to_string())
