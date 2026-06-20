// Calendário LWS 2026 — projeção forward da recessão pós-pico de Manaus.
// Mostra cota projetada dia a dia até dezembro/2026 com banda IC80 e marca a
// data esperada de cruzamento do gatilho 17,7m (LWS/ANTAQ).

import { type CalendarioLWS, diasPorMes, formataDataCurta, type DiaCalendarioLWS } from "@/lib/calendario-lws";

const MES_NOME: Record<number, string> = {
  1: "JAN", 2: "FEV", 3: "MAR", 4: "ABR", 5: "MAI", 6: "JUN",
  7: "JUL", 8: "AGO", 9: "SET", 10: "OUT", 11: "NOV", 12: "DEZ",
};

const COR_BANDA: Record<DiaCalendarioLWS["banda_central"], string> = {
  azul:     "bg-azul-medio border-azul-medio",         // bem acima da mediana
  verde:    "bg-verde/30 border-verde/40",             // faixa normal
  amarela:  "bg-ouro/30 border-ouro/50",               // zona de atenção
  vermelha: "bg-vermelho/40 border-vermelho/60",       // abaixo do gatilho LWS
};

export default function CalendarioLWS2026({ calendario }: { calendario: CalendarioLWS }) {
  const porMes = diasPorMes(calendario);
  const meses = [...porMes.keys()].sort((a, b) => a - b);

  return (
    <div className="bg-azul-medio rounded-lg p-5 border border-white/10">
      {/* Cabeçalho com cruzamento previsto */}
      <div className="grid sm:grid-cols-4 gap-4 mb-5">
        <div className="bg-azul-marinho rounded p-3 border border-white/10">
          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Pico previsto</p>
          <p className="text-white font-bold text-lg">{calendario.pico_cota_m.toFixed(2)} m</p>
          <p className="text-gray-500 text-[11px]">{formataDataCurta(calendario.pico_data)}/{calendario.ano}</p>
        </div>
        <div className="bg-azul-marinho rounded p-3 border border-vermelho/30">
          <p className="text-vermelho text-[10px] uppercase tracking-wider mb-1">
            ETA cruzamento 17,7m
          </p>
          <p className="text-vermelho font-bold text-lg">
            {formataDataCurta(calendario.data_cruzamento_central)}
          </p>
          <p className="text-gray-500 text-[11px]">central · modelo IBI</p>
        </div>
        <div className="bg-azul-marinho rounded p-3 border border-white/10">
          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Banda IC80</p>
          <p className="text-white font-bold text-sm">
            {formataDataCurta(calendario.data_cruzamento_pessimista)} – {formataDataCurta(calendario.data_cruzamento_otimista)}
          </p>
          <p className="text-gray-500 text-[11px]">precoce – tardia</p>
        </div>
        <div className="bg-azul-marinho rounded p-3 border border-white/10">
          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
            Dias acima do gatilho
          </p>
          <p className="text-verde font-bold text-lg">{calendario.dias_acima_gatilho}</p>
          <p className="text-gray-500 text-[11px]">a partir do pico</p>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mb-4 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-azul-medio border border-white/30" />
          ≥ 25 m
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-verde/30 border border-verde/40" />
          20-25 m
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-ouro/30 border border-ouro/50" />
          17,7-20 m
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-vermelho/40 border border-vermelho/60" />
          &lt; 17,7 m (LWS)
        </span>
      </div>

      {/* Grid de meses */}
      <div className="space-y-3">
        {meses.map((mes) => {
          const dias = porMes.get(mes) ?? [];
          return (
            <div key={mes} className="flex items-start gap-3">
              <div className="w-12 shrink-0 text-gray-400 text-[11px] font-bold uppercase tracking-wider pt-1">
                {MES_NOME[mes]}
              </div>
              <div className="flex flex-wrap gap-[3px] flex-1">
                {dias.map((d) => (
                  <div
                    key={d.data}
                    title={`${d.data.split("-").reverse().join("/")}: ${d.cota_central.toFixed(2)} m (IC80: ${d.cota_ic80_min.toFixed(2)}–${d.cota_ic80_max.toFixed(2)})`}
                    className={`w-3 h-5 rounded-sm border ${COR_BANDA[d.banda_central]} ${
                      d.cruzou_central ? "ring-2 ring-white" : ""
                    } ${d.pico ? "ring-2 ring-verde" : ""}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fonte */}
      <p className="text-gray-500 text-[11px] mt-5 leading-relaxed">
        Modelo de recessão pós-pico calibrado em dados históricos de Manaus 2016–2023
        ({Math.round(0.018 * 1000) / 1000} 1/d ± 15%). Pico de cheia do{" "}
        <span className={calendario.fonte_pico_dinamica ? "text-verde" : "text-gray-400"}>
          {calendario.fonte_pico}
        </span>. ETA central considera assíntota de ~16,8m;
        banda IC80 cobre cenários rápido/lento (k ± 1,28σ).
      </p>
    </div>
  );
}
