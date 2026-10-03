"""T2 (painel) — Monta o histórico do calado permitido a partir das capturas parseadas (03).

Saídas (processed/):
  calado_permitido_painel.parquet  item (trecho/berço) x período de valores constantes entre capturas
  eventos_revisao_calado.csv       mudanças de calado por trecho do canal (de/para, sentido, vigência impressa)
  caminho_berco.csv                berço APS -> trecho em que está situado -> trechos percorridos desde a barra
  berco_antaq_aps.csv              casamento dos berços da ANTAQ (IDBerco) com os berços da tabela da APS

Regras:
- Um período = sequência de capturas consecutivas com os mesmos valores impressos.
- `data_vigencia_impressa` só vem do texto da APS ("entrou em vigor no dia ..."). Quando não há,
  o início do período fica indeterminado entre `ultima_captura_periodo_anterior` e `primeira_captura`.
- `calado_pm`: impresso quando a APS imprime; nos formatos em que só o Zero DHN é impresso,
  `calado_pm_regra` aplica a regra impressa na mesma página ("acréscimo de até 1,0 m na preamar
  com maré >= 1,0 m") — coluna separada, marcada, nunca misturada ao valor impresso.
- Formato A (até 2013): o valor impresso é o calado na preamar com maré >= 1,00 m (regra impressa).
"""
from __future__ import annotations

import re

import pandas as pd

from _comum import INTERIM, PROC, salva

ORDEM = ["I", "II", "III", "IV", "IV-B"]


def prepara():
    I = pd.read_parquet(INTERIM / "aps_calados_capturas.parquet")
    M = pd.read_parquet(INTERIM / "aps_calados_capturas_meta.parquet")
    I = I.merge(M[["arquivo", "formato", "revisao_n", "data_revisao_impressa", "regra_preamar"]], on="arquivo", how="left")
    I = I.sort_values(["captura_ts", "arquivo"])
    # deduplica capturas do mesmo instante (fase0 = atual no mesmo conteúdo, etc.) mantendo todas as linhas
    for c in ["calado_bm", "calado_pm", "calado_unico_impresso", "calado_trecho_bm", "calado_trecho_pm"]:
        if c not in I:
            I[c] = None
    T = I[I.tipo == "trecho"].copy()
    # formato A: valor único é preamar
    a = T.formato == "A"
    T.loc[a, "calado_pm"] = T.loc[a, "calado_unico_impresso"]
    T["calado_pm_fonte"] = None
    T.loc[T.calado_pm.notna(), "calado_pm_fonte"] = "impresso_tabela_canal"
    # PM impresso na coluna de trecho da tabela de berços da mesma captura
    B = I[(I.tipo == "berco") & I.trecho_impresso.notna()]
    for (arq, rot), g in B.groupby(["arquivo", "trecho_impresso"]):
        bm, pm = g.calado_trecho_bm.iloc[0], g.calado_trecho_pm.iloc[0]
        cand = T[(T.arquivo == arq) & (T.calado_bm == bm) & T.calado_pm.isna()]
        if pd.notna(pm) and len(cand):
            T.loc[cand.index, "calado_pm"] = pm
            T.loc[cand.index, "calado_pm_fonte"] = "impresso_coluna_trecho_tabela_bercos"
    regra = T.regra_preamar.fillna("").str.contains("acréscimo de até 1,0", case=False)
    T["calado_pm_regra"] = None
    T.loc[regra & T.calado_pm.isna() & T.calado_bm.notna(), "calado_pm_regra"] = T.calado_bm + 1.0
    return I, T, M


def periodos(df: pd.DataFrame, chave: list[str], valores: list[str]) -> pd.DataFrame:
    out = []
    for k, g in df.groupby(chave, dropna=False):
        g = g.sort_values("captura_ts")
        sig = g[valores].apply(lambda r: "|".join(str(x) if pd.notna(x) else "" for x in r), axis=1)
        bloco = (sig != sig.shift()).cumsum()
        prev_ult = None
        blocos = list(g.groupby(bloco, sort=True))
        for i, (_, b) in enumerate(blocos):
            ult = b.iloc[-1]
            reg = {c: v for c, v in zip(chave, k if isinstance(k, tuple) else (k,))}
            for v in valores:
                reg[v] = b[v].iloc[0]
            reg.update(descricao=b.descricao.iloc[-1], primeira_captura=b.captura_ts.min(),
                       ultima_captura=b.captura_ts.max(), n_capturas=len(b),
                       ultima_captura_periodo_anterior=prev_ult,
                       primeira_captura_periodo_seguinte=blocos[i + 1][1].captura_ts.min() if i + 1 < len(blocos) else None,
                       revisoes=",".join(str(int(x)) for x in sorted(b.revisao_n.dropna().unique())) or None,
                       data_revisao_impressa_min=b.data_revisao_impressa.dropna().min() if b.data_revisao_impressa.notna().any() else None,
                       formato=",".join(sorted(b.formato.dropna().unique())),
                       arquivos=";".join(b.arquivo))
            for c in ["documento_homologacao", "data_homologacao", "levantamento", "carta_vigencia", "data_carta",
                      "calado_pm_fonte", "profundidade_projeto", "trecho_berco", "notas_rodape", "remete_nota", "comprimento_m"]:
                if c in b:
                    vals = b[c].dropna().astype(str).unique()
                    reg[c] = "; ".join(vals) if len(vals) else None
            out.append(reg)
            prev_ult = ult.captura_ts
    return pd.DataFrame(out)


def main():
    I, T, M = prepara()
    vt = ["calado_bm", "calado_pm", "calado_pm_regra", "calado_unico_impresso", "data_vigencia_impressa"]
    for c in vt:
        if c not in T:
            T[c] = None
    PT = periodos(T, ["tipo", "item"], vt)
    Bc = I[I.tipo == "berco"].copy()
    PB = periodos(Bc, ["tipo", "item"], ["calado_bm", "calado_pm", "remete_nota"]) if len(Bc) else pd.DataFrame()
    Rc = I[I.tipo == "berco_regra_especial"].copy()
    PR = periodos(Rc.assign(item=Rc.item + " :: " + Rc.descricao.str.split(" \\| ").str[0]), ["tipo", "item"],
                  ["calado_bm", "calado_pm"]) if len(Rc) else pd.DataFrame()
    P = pd.concat([PT, PB, PR], ignore_index=True)
    P["ordem_trecho"] = P.item.map({t: i for i, t in enumerate(ORDEM)})
    P = P.sort_values(["tipo", "ordem_trecho", "item", "primeira_captura"]).drop(columns="ordem_trecho")
    salva(P, "calado_permitido_painel")

    # eventos por trecho
    ev = []
    for it, g in PT.sort_values("primeira_captura").groupby("item"):
        g = g.reset_index(drop=True)
        for i in range(1, len(g)):
            a, b = g.iloc[i - 1], g.iloc[i]
            def ref(x):  # valor de referência para comparação: BM; se só houver PM (formato A), PM
                return x.calado_bm if pd.notna(x.calado_bm) else x.calado_pm
            d0, d1 = ref(a), ref(b)
            mudou_val = (str(a.calado_bm), str(a.calado_pm)) != (str(b.calado_bm), str(b.calado_pm))
            mudou_ref = (pd.isna(a.calado_bm)) != (pd.isna(b.calado_bm))
            vig, vig_cap = b.data_vigencia_impressa, (b.primeira_captura if pd.notna(b.data_vigencia_impressa) else None)
            if pd.isna(vig):  # mesma vigência pode só aparecer impressa em captura posterior com os mesmos valores
                for j in range(i + 1, len(g)):
                    c_ = g.iloc[j]
                    if (str(c_.calado_bm), str(c_.calado_unico_impresso)) != (str(b.calado_bm), str(b.calado_unico_impresso)):
                        break
                    if pd.notna(c_.data_vigencia_impressa):
                        vig, vig_cap = c_.data_vigencia_impressa, c_.primeira_captura
                        break
            ev.append({
                "item": it, "descricao": b.descricao,
                "de_bm": a.calado_bm, "de_pm": a.calado_pm, "para_bm": b.calado_bm, "para_pm": b.calado_pm,
                "delta_m": (d1 - d0) if (pd.notna(d0) and pd.notna(d1) and not mudou_ref) else None,
                "sentido": ("mudança de referencial (preamar -> Zero DHN), não comparável" if mudou_ref else
                            ("aumento" if d1 > d0 else "redução" if d1 < d0 else
                             ("só PM" if (mudou_val and pd.notna(a.calado_pm)) else "sem mudança de valor (só vigência/carta/PM passa a ser impresso)"))),
                "data_vigencia_impressa": vig, "vigencia_lida_na_captura": vig_cap, "carta_vigencia": b.get("carta_vigencia"),
                "documento_homologacao": b.get("documento_homologacao"),
                "janela_inicio_captura": a.ultima_captura, "janela_fim_captura": b.primeira_captura,
                "revisoes": b.revisoes,
                "causa_impressa": None,
                "obra_cais_simultanea": None,  # não consta da tabela da APS; exige lista de obras (não conferido)
            })
    E = pd.DataFrame(ev)
    E = E[~E.sentido.str.startswith("sem mudança")].copy()
    E["vigencia_impressa_disponivel"] = E.data_vigencia_impressa.notna()
    salva(E, "eventos_revisao_calado")

    # limites por DWT (calado mínimo a vante, trim, imersão do propulsor), por captura
    W = pd.read_parquet(INTERIM / "aps_limites_dwt.parquet")
    if len(W):
        salva(W, "aps_limites_dwt")

    # caminho berço -> trechos, a partir da captura mais recente de cada berço
    C = pd.DataFrame()
    if len(Bc):
        ult = Bc.sort_values("captura_ts").groupby("item").tail(1)
        cam = []
        for _, r in ult.iterrows():
            tr = r["trecho_berco"]
            # o rótulo "Trecho IV" na tabela de berços pode trazer os valores do IV-b: resolve pelos valores
            canal = T[(T.arquivo == r["arquivo"])]
            alvo = canal[(canal.calado_bm == r["calado_trecho_bm"])]
            if tr and tr.startswith("IV") and len(alvo):
                tr = alvo["item"].iloc[0] if alvo["item"].iloc[0].startswith("IV") else tr
            caminho = ORDEM[:ORDEM.index(tr) + 1] if tr in ORDEM else None
            cam.append({"berco_aps": r["item"], "instalacao": "Santos (Porto Organizado)",
                        "trecho_impresso": r["trecho_impresso"], "trecho_situado": tr,
                        "trechos_percorridos": ",".join(caminho) if caminho else None,
                        "trecho_adicional_fora_tabela_aps": None,
                        "captura_ts": r["captura_ts"], "arquivo": r["arquivo"], "metodo": "impresso_tabela_aps",
                        "regra": "APS: 'os calados nos berços ficam limitados ao calado máximo do trecho do canal no qual "
                                 "estão situados'; ordem dos trechos pela descrição impressa (Barra->Entreposto->Torre "
                                 "Grande->Armazém 06->Alamoa->final do trecho IV)"})
        C = pd.DataFrame(cam)
        # Terminais autorizados (fora da tabela de berços da APS): trecho inferido pelo endereço impresso na
        # NPCP-SP (Anexo 1-B) = mesmo bairro de berços da APS com trecho conhecido. A CONFERIR com APS/praticagem.
        def trecho_de(bercos):
            s = C[C.berco_aps.isin(bercos)].trecho_situado.dropna().unique()
            return s[0] if len(s) == 1 else None
        TUP = [
            ("DP World Santos", ["IB SP", "IB BC", "AGEO 01"], None,
             "NPCP-SP Anexo 1-B: DP World na Ilha Barnabé, mesmo endereço de AGEO (berços AGEO e IB da APS)"),
            ("Sucocítrico Cutrale", ["TEV", "TERMAG"], None,
             "NPCP-SP Anexo 1-B: Av. Santos Dumont, Conceiçãozinha (Guarujá), mesmo bairro de TEV e TERMAG"),
            ("Terminal Marítimo Dow", ["TEV", "TERMAG"], None,
             "NPCP-SP Anexo 1-B: Av. Santos Dumont, Conceiçãozinha (Guarujá), mesmo bairro de TEV e TERMAG"),
            ("Base Logística de Dutos", ["TEV", "TERMAG"], None,
             "berço ANTAQ 'SAIPEM 3' => Saipem; NPCP-SP Anexo 1-B: Av. Santos Dumont, Conceiçãozinha (Guarujá)"),
            ("Terminal Integrador Portuário Luiz Antonio Mesquita - TIPLAM", None, "Canal de Piaçaguera",
             "NPCP-SP 5.1.b.II e 5.14: acesso pelo Canal de Piaçaguera, calado por Portaria específica da CPSP (não coletada)"),
            ("Terminal Marítimo Privativo de Cubatão - TMPC", None, "Canal de Piaçaguera",
             "NPCP-SP 5.1.b.II e 5.14: acesso pelo Canal de Piaçaguera, calado por Portaria específica da CPSP (não coletada)"),
        ]
        tups = []
        for inst, ref, extra, fonte in TUP:
            tr = trecho_de(ref) if ref else "IV-B"
            caminho = ORDEM[:ORDEM.index(tr) + 1] if tr in ORDEM else None
            tups.append({"berco_aps": None, "instalacao": inst, "trecho_impresso": None, "trecho_situado": tr,
                         "trechos_percorridos": ",".join(caminho) if caminho else None,
                         "trecho_adicional_fora_tabela_aps": extra, "captura_ts": None, "arquivo": None,
                         "metodo": "inferido_por_endereco_npcp" if ref else "npcp_canal_piacaguera",
                         "regra": fonte + (f"; berços de referência: {', '.join(ref)}" if ref else
                                           "; percorre todo o canal da APS (I a IV-B) antes de Piaçaguera — a conferir")})
        C = pd.concat([C, pd.DataFrame(tups)], ignore_index=True)
        salva(C, "caminho_berco")

    # casamento ANTAQ -> APS
    esc = pd.read_parquet(PROC / "escalas_santos.parquet", columns=["instalacao", "id_berco", "berco", "terminal", "ano_antaq"])
    bant = esc.groupby(["instalacao", "id_berco", "berco"], dropna=False).agg(
        n_atracacoes=("ano_antaq", "size"), ano_min=("ano_antaq", "min"), ano_max=("ano_antaq", "max"),
        terminal=("terminal", "last")).reset_index()
    aps = sorted(set(Bc.item)) if len(Bc) else []
    norm = lambda s: re.sub(r"[^A-Z0-9]", "", (s or "").upper().replace("ARMAZÉM", "ARM").replace("ARMAZEM", "ARM")
                            .replace("OUTEIRINHOS", "OUT").replace("Ã", "A"))
    na = {norm(a): a for a in aps}
    # equivalências conferidas visualmente entre os rótulos das duas fontes (método = "manual")
    MANUAL = {"ARM 12A": ["ARM 12-A"], "ARM 22 + ARM 23": ["ARM 22/23"], "ARMAZEM 23": ["ARM 22/23"],
              "ARM 35P1": ["ARM 35.1"], "ARM 35P2": ["ARM 35.2"], "ARM FRIG/25": ["ARM 25"],
              "CS 02 + CS 01": ["CS 01", "CS 02"], "CS.2": ["CS 02"],
              "OUTEIRINHOS 2 + OUTEIRINHOS 1": ["OUTEIRINHOS 01(MB)", "OUTEIRINHOS 02(MB)"],
              "OUTEIRINHOS 1": ["OUTEIRINHOS 01(MB)"], "OUTEIRINHOS 3": ["OUTEIRINHOS 03"],
              "ARM 29/30 + ARM 30": ["ARM 29", "ARM 30"], "ARM 31/32 + ARM 32": ["ARM 31", "ARM 32"],
              "ARM 33/34": ["ARM 33", "ARM 34"], "ARMAZÉM 30": ["ARM 30"], "ARMAZÉM 31/32": ["ARM 31", "ARM 32"],
              "ARMAZÉM 37.1": ["37 Pto 1 e 2"], "ARM 37": ["37 Pto 1 e 2"], "ARMAZÉM 38/39": ["ARM 38", "ARM 39"],
              "ARMAZEM 12": ["ARM 12"],
              # a própria APS rotula 'ARM 35P2 (35.1+35.2)': o ARM 35 inteiro do cadastro antigo da ANTAQ
              "ARM 35.0": ["ARM 35P2 (35.1+35.2)"], "ARMAZÉM 37.2": ["37 Pto 1 e 2"]}
    # TUPs registrados no Porto Organizado no cadastro antigo da ANTAQ (2010–2011) -> terminal autorizado atual
    TUP_ANTIGO = {"COSIPA": "Terminal Marítimo Privativo de Cubatão - TMPC",
                  "ULTRAFERTIL": "Terminal Integrador Portuário Luiz Antonio Mesquita - TIPLAM",
                  "TERM.DOW": "Terminal Marítimo Dow", "CUTRALE": "Sucocítrico Cutrale"}
    linhas = []
    for _, r in bant.iterrows():
        alvo, met, tup = None, None, None
        if r.instalacao == "Santos":
            if r.berco in MANUAL:
                alvo, met = [a for a in MANUAL[r.berco] if a in aps] or None, "manual"
            elif norm(r.berco) in na:
                alvo, met = [na[norm(r.berco)]], "nome_normalizado"
            elif r.berco in TUP_ANTIGO:
                tup, met = TUP_ANTIGO[r.berco], "tup_cadastro_antigo"
        else:
            tup, met = r.instalacao, "terminal_autorizado"
        obs = None
        if not alvo and not tup:
            obs = "sem correspondente na tabela da APS (não casado)"
        elif tup:
            obs = "terminal autorizado fora da tabela de berços da APS: caminho em caminho_berco (instalacao)"
        linhas.append({**r.to_dict(), "berco_aps": ";".join(alvo) if alvo else None, "instalacao_caminho": tup,
                       "metodo": met, "observacao": obs})
    BA = pd.DataFrame(linhas)
    salva(BA, "berco_antaq_aps")
    po = BA[BA.instalacao == "Santos"]
    cas = po[po.berco_aps.notna() | po.instalacao_caminho.notna()].n_atracacoes.sum() / po.n_atracacoes.sum()
    tot = BA[BA.berco_aps.notna() | BA.instalacao_caminho.notna()].n_atracacoes.sum() / BA.n_atracacoes.sum()
    print(f"  casamento: {cas:.1%} das atracações do PO e {tot:.1%} do complexo com caminho atribuído")


if __name__ == "__main__":
    main()
