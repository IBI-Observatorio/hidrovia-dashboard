// Calibração operacional: CMR (Calado Máximo Recomendado, Itacoatiara/Capitania)
// -> cabotagem conteinerizada. Substitui o eixo Manaus/17,7m pelo eixo do calado.
//   node --import tsx scripts/calibra-cmr-cabotagem.mts
import { cmrDeItacoatiara, CMR_OBSERVADO } from "../lib/cmr-itacoatiara";
import { RECESSAO_ITACOATIARA_CALIBRADA as RI } from "../lib/recessao-itacoatiara-calibrada";
import { projetaRecessaoItacoatiara, projetaCruzamentoCalado } from "../lib/recessao-itacoatiara";
import { readFileSync, writeFileSync } from "node:fs";

const cargo = JSON.parse(readFileSync("data/calibracao-transferencia-teu.json", "utf8"));
const tab = cargo.tabela_pareada as Array<{ano:number,teu:number,residuo:number,outnov:number|null,onRatio:number|null}>;
const rn = cargo.regime_normal;                 // residuo_medio, residuo_sd, outnov_ratio_medio, outnov_nivel_normal
const base2025 = cargo.base_2025_teu;
const CALADO_ALVO = 11.0;

// CMR mínimo por ano = curva oficial aplicada à mínima anual de Itacoatiara
const cmrAno: Record<number, number> = {};
for (const a of RI.ajustes_por_ano) cmrAno[a.ano] = +cmrDeItacoatiara(a.h_min).toFixed(2);

const byAno: Record<number, any> = {};
for (const t of tab) byAno[t.ano] = t;

// Penalidade rel. ao regime normal (mesmos resíduos; eixo agora é CMR)
const pen = (ano:number) => byAno[ano].residuo - rn.residuo_medio;
const penOn = (ano:number) => byAno[ano].onRatio != null ? byAno[ano].onRatio - rn.outnov_ratio_medio : null;
const ancNorm = { cmr: 9.0, pen: 0, penOn: 0 };
const sevAnos = [2023, 2024];
const ancSev = {
  cmr: sevAnos.reduce((s,a)=>s+cmrAno[a],0)/sevAnos.length,
  pen: sevAnos.reduce((s,a)=>s+pen(a),0)/sevAnos.length,
  penOn: sevAnos.reduce((s,a)=>s+(penOn(a)??0),0)/sevAnos.length,
};
const interp = (cmr:number, k:"pen"|"penOn") => {
  if (cmr >= ancNorm.cmr) return ancNorm[k];
  if (cmr <= ancSev.cmr) return ancSev[k];
  const f = (ancNorm.cmr - cmr) / (ancNorm.cmr - ancSev.cmr);
  return ancNorm[k] + f * (ancSev[k] - ancNorm[k]);
};

// Projeção 2026 (recessão Itacoatiara, pico SGB 13,73 m)
const PICO = 13.73, PICO_DATA = "2026-06-20";
const rec = projetaRecessaoItacoatiara(PICO, PICO_DATA, 250, -10);
const minC = Math.min(...rec.pontos.map(p=>p.cota_central));
const minLo = Math.min(...rec.pontos.map(p=>p.cota_ic80_min));
const minHi = Math.min(...rec.pontos.map(p=>p.cota_ic80_max));
const cmr = (ita:number)=>+cmrDeItacoatiara(ita).toFixed(2);
const cruzaCalado = projetaCruzamentoCalado(PICO, PICO_DATA, CALADO_ALVO);
const onNivel = rn.outnov_nivel_normal;

function cenario(nome:string, cmrMin:number, prob:number|null, usa2023=false){
  const pA = usa2023 ? pen(2023) : interp(cmrMin,"pen");
  const pO = usa2023 ? (penOn(2023) ?? 0) : interp(cmrMin,"penOn");
  const teu = base2025*(1+pA);
  return { nome, cmr_min: +cmrMin.toFixed(2), prob,
    delta_pct_2025:+(teu/base2025-1).toFixed(4), teu:Math.round(teu),
    outnov:Math.round(onNivel*(1+pO)),
    margem_calado:+(cmrMin-CALADO_ALVO).toFixed(2) };
}
// Projeção 2026 do CMR vem do MODELO MULTI-DRIVER (formadores), não da recessão univariada
const md = JSON.parse(readFileSync("data/projecao-multidriver-itacoatiara.json", "utf8"));
const P = md.projecao_cmr_2026;   // { otimista, central, pessimista } em CMR (m)
const cenarios = [
  cenario("Otimista", P.otimista, 0.25),
  cenario("Central",  P.central,  0.50),
  cenario("Pessimista", P.pessimista, 0.25),
  cenario("Cauda — repete 2023", cmrAno[2023], null, true),
];
const comP = cenarios.filter(c=>c.prob);
const ev = { delta: comP.reduce((s,c)=>s+(c.prob!*c.delta_pct_2025),0), teu: Math.round(comP.reduce((s,c)=>s+c.prob!*c.teu,0)) };

// Restrição (CMR<11m): datas vêm do MODELO MULTI-DRIVER; contexto atual do /api/irc
const COTA_ITA_HOJE = md.vivo_2026?.ITA ?? 13.71;  // cota viva de Itacoatiara (do modelo multi-driver)
let eta:any = { fonte:"multi-driver", p50:md.cruzamento_cmr11.central, p10:md.cruzamento_cmr11.cedo, p90:md.cruzamento_cmr11.tarde, prob:1, ano_analogo:md.analogos_top?.[0]?.ano,
  cmr_atual:+cmrDeItacoatiara(COTA_ITA_HOJE).toFixed(2), cota_ita_atual:COTA_ITA_HOJE, irc_tabocal:32.3, irc_tabocal_faixa:"amarelo" };
try {
  const j:any = await (await fetch("https://hidrovia-dashboard-production.up.railway.app/api/irc", { signal: AbortSignal.timeout(30000) })).json();
  eta.cmr_atual = j.cmr_metros; eta.cota_ita_atual = j.eta_analogos?.cota_atual_m; eta.cota_alvo = j.eta_analogos?.cota_alvo_m;
  eta.irc_tabocal = j.irc_tabocal; eta.irc_tabocal_faixa = j.irc_tabocal_faixa;
  eta.prob = j.eta_analogos?.prob_cruzamento ?? 1; eta.analogos_dashboard_p50 = j.eta_analogos?.data_p50;
} catch(e){ /* mantém só multi-driver */ }

const out = {
  fonte_cmr: CMR_OBSERVADO.fonte, calado_alvo_m: CALADO_ALVO, cmr_min_oficial: CMR_OBSERVADO.cmr_min, cmr_max_oficial: CMR_OBSERVADO.cmr_max,
  conversao_nota: "Curva oficial Capitania cota_Itacoatiara→CMR; cada metro de calado perdido reduz a carga por viagem proporcionalmente.",
  pico_itacoatiara_2026: PICO, base_2025_teu: base2025,
  cmr_min_por_ano: cmrAno,
  regime: { normal_cmr_ge: ancNorm.cmr, severo_cmr_le: +ancSev.cmr.toFixed(2), penalidade_severa: +ancSev.pen.toFixed(3) },
  projecao_2026_cmr: P,
  projecao_univariada_ref: { central:cmr(minC), pessimista:cmr(minLo), otimista:cmr(minHi) },  // p/ comparação
  drivers: { metodo: md.metodo, pesos: md.pesos_driver, z_2026: md.z_2026, analogos_top: md.analogos_top },
  restricao_calado: eta,           // quando CMR<11m (multi-driver)
  cenarios_2026: cenarios,
  serie_cmr: md.serie_cmr,
  esperanca_ponderada: { delta_pct_2025:+ev.delta.toFixed(4), teu: ev.teu },
  tabela_cmr_carga: tab.map(t=>({ano:t.ano, cmr_min:cmrAno[t.ano] ?? null, teu:t.teu, outnov:t.outnov, onRatio:t.onRatio})),
};
writeFileSync("data/calibracao-cmr-cabotagem.json", JSON.stringify(out,null,2), "utf8");

console.log("CMR<11m (restrição):", eta.p50, "| prob", eta.prob, "| análogo", eta.ano_analogo, "| CMR hoje", eta.cmr_atual);
console.log("Projeção CMR 2026 (multi-driver): central", P.central, "| pess", P.pessimista, "| otim", P.otimista, "(univariado:", cmr(minC), ")");
console.log("\ncenário | CMRmin | margem vs 11m | Δ% carga | TEU | out+nov");
for(const c of cenarios) console.log(`${c.nome.padEnd(20)} | ${c.cmr_min} | ${c.margem_calado} | ${(c.delta_pct_2025*100).toFixed(1)}% | ${c.teu.toLocaleString("pt-BR")} | ${Math.round(c.outnov/1000)} mil`);
console.log(`\nEsperança ponderada: ${(ev.delta*100).toFixed(1)}% (${ev.teu.toLocaleString("pt-BR")} TEU)`);
console.log("OK -> data/calibracao-cmr-cabotagem.json");
