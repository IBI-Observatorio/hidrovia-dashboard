import dados from "@/public/data/calado-capitania.json";
import CaladoCapitaniaChart, { type PontoCMR, type PontoHist } from "./CaladoCapitaniaChart";

// Calado oficial da Capitania (CFAOC) — número publicado, sem modelo.
// Gerado por scripts/gera-calado-capitania.py a partir do boletim colado à mão.

const fmtM = (v: number | null | undefined, sinal = false) =>
  v == null ? "—" : `${sinal && v > 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")} m`;
const fmtData = (iso: string) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };
const fmtDM = (iso: string) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };

// Dias entre a data do boletim e hoje (fuso Manaus)
function diasDesde(iso: string): number {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Manaus" });
  return Math.round((Date.parse(hoje) - Date.parse(iso)) / 86_400_000);
}

export default function CaladoCapitania() {
  const u = dados.ultimo;
  const atraso = diasDesde(u.data);

  return (
    <div className="bg-azul-medio rounded-lg p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <div>
          <h2 className="text-white font-bold text-lg">Calado oficial — Itacoatiara / Tabocal</h2>
          <p className="text-gray-400 text-sm max-w-2xl">
            Calado Máximo Recomendado publicado pela Capitania Fluvial da Amazônia Ocidental.
            É o limite que vale para o navio: já desconta a folga de segurança sob a quilha.
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          atraso > 3 ? "bg-ouro/10 border-ouro/30 text-ouro" : "bg-verde/10 border-verde/30 text-verde"
        }`}>
          Boletim de {fmtData(u.data)}{atraso > 3 ? ` · ${atraso} dias atrás` : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-azul-marinho/60 rounded-lg p-4 border border-white/5">
          <p className="text-gray-400 text-xs mb-1">Demais cargas (granel, contêiner)</p>
          <p className="text-white text-3xl font-extrabold">{fmtM(u.demais)}</p>
          <p className="text-gray-500 text-[11px] mt-1">folga descontada: {fmtM(u.faq_demais)}</p>
        </div>
        <div className="bg-azul-marinho/60 rounded-lg p-4 border border-white/5">
          <p className="text-gray-400 text-xs mb-1">Petróleo e gás</p>
          <p className="text-white text-3xl font-extrabold">{fmtM(u.petroleo)}</p>
          <p className="text-gray-500 text-[11px] mt-1">folga descontada: {fmtM(u.faq_petroleo)}</p>
        </div>
        <div className="bg-azul-marinho/60 rounded-lg p-4 border border-white/5">
          <p className="text-gray-400 text-xs mb-1">Ritmo (demais cargas)</p>
          <p className={`text-2xl font-extrabold ${(u.variacao_24h_m ?? 0) < 0 ? "text-vermelho" : "text-verde"}`}>
            {fmtM(u.variacao_24h_m, true)} <span className="text-sm font-medium text-gray-400">em 24h</span>
          </p>
          <p className="text-gray-500 text-[11px] mt-1">
            média de 7 dias: {fmtM(u.ritmo_7d_m_dia, true)}/dia
          </p>
        </div>
      </div>

      {dados.previsao_capitania.length > 0 && (
        <div className="mb-5">
          <p className="text-gray-400 text-xs font-semibold mb-2">Previsão publicada pela Capitania</p>
          <div className="overflow-x-auto">
            <table className="text-xs text-gray-300 min-w-full">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left font-medium pr-4 py-1">Carga</th>
                  {dados.previsao_capitania.map((p) => (
                    <th key={p.data} className="text-right font-medium px-2 py-1">{fmtDM(p.data)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="pr-4 py-1">Demais cargas</td>
                  {dados.previsao_capitania.map((p) => (
                    <td key={p.data} className="text-right px-2 py-1 text-white">{fmtM(p.demais)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="pr-4 py-1">Petróleo e gás</td>
                  {dados.previsao_capitania.map((p) => (
                    <td key={p.data} className="text-right px-2 py-1">{fmtM(p.petroleo)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-gray-400 text-xs font-semibold mb-2">
        2026 × anos anteriores (demais cargas, mesma data)
      </p>
      <CaladoCapitaniaChart
        serie2026={dados.serie as PontoCMR[]}
        historico={dados.historico as Record<string, PontoHist[]>}
      />
      <p className="text-gray-500 text-[11px] mt-2 leading-relaxed">
        Fonte:{" "}
        <a href={dados.fonte_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
          CFAOC/Marinha do Brasil
        </a>
        , boletins diários. As séries de 2024 e 2025 vêm de boletins compilados pelo IBI e não
        identificam a categoria de carga; 2025 cobre só out–dez.
      </p>
    </div>
  );
}
