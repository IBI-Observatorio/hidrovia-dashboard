"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertTriangle, FileText, Loader2, Eye, EyeOff } from "lucide-react";
import type { BoletimSEMA } from "@/lib/sema-parser";

interface ResultadoUpload {
  ok:       boolean;
  boletim?: BoletimSEMA;
  mensagem: string;
  erro?:    string;
}

export default function AdminUploadPage() {
  const [senha,     setSenha]     = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [arquivo,   setArquivo]   = useState<File | null>(null);
  const [enviando,  setEnviando]  = useState(false);
  const [resultado, setResultado] = useState<ResultadoUpload | null>(null);
  const [historico, setHistorico] = useState<BoletimSEMA[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!arquivo || !senha) return;
    setEnviando(true);
    setResultado(null);

    const fd = new FormData();
    fd.append("arquivo", arquivo);

    try {
      const resp = await fetch("/api/sema", {
        method:  "POST",
        headers: { "x-admin-password": senha },
        body:    fd,
      });
      const json = await resp.json();
      setResultado(json);
    } catch (e) {
      setResultado({ ok: false, mensagem: "Erro de rede", erro: String(e) });
    } finally {
      setEnviando(false);
    }
  }

  async function carregarHistorico() {
    const resp = await fetch("/api/sema?todos=1");
    const json = await resp.json();
    setHistorico(json.boletins ?? []);
  }

  return (
    <div className="min-h-screen bg-azul-marinho p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <a href="/" className="text-verde text-sm hover:underline">← Voltar ao dashboard</a>
          <h1 className="text-white font-bold text-2xl mt-2">Upload — Boletins SEMA-AM</h1>
          <p className="text-gray-400 text-sm mt-1">
            Faça upload do PDF do boletim diário da SEMA-AM para atualizar as cotas no dashboard.
            A tabela de estações será extraída automaticamente.
          </p>
        </div>

        {/* Formulário de upload */}
        <div className="bg-azul-medio rounded-lg p-6 flex flex-col gap-5">

          {/* Senha */}
          <div>
            <label className="text-gray-300 text-sm font-semibold block mb-1.5">
              Senha de administrador
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha de acesso"
                className="w-full bg-azul-marinho text-white rounded px-3 py-2 pr-10 text-sm
                           border border-white/10 focus:outline-none focus:border-verde"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {mostrarSenha ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Seleção de arquivo */}
          <div>
            <label className="text-gray-300 text-sm font-semibold block mb-1.5">
              Arquivo PDF do boletim
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${arquivo ? "border-verde bg-verde/5" : "border-white/20 hover:border-verde/50"}`}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              />
              {arquivo ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText size={28} className="text-verde" />
                  <p className="text-white font-semibold text-sm">{arquivo.name}</p>
                  <p className="text-gray-400 text-xs">
                    {(arquivo.size / 1024).toFixed(0)} KB · clique para trocar
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={28} className="text-gray-500" />
                  <p className="text-gray-300 text-sm">
                    Clique para selecionar ou arraste o PDF aqui
                  </p>
                  <p className="text-gray-500 text-xs">Apenas arquivos .pdf</p>
                </div>
              )}
            </div>
          </div>

          {/* Botão */}
          <button
            onClick={handleUpload}
            disabled={!arquivo || !senha || enviando}
            className="flex items-center justify-center gap-2 bg-verde text-azul-marinho
                       font-bold py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed
                       hover:brightness-110 transition-all"
          >
            {enviando ? (
              <><Loader2 size={16} className="animate-spin" /> Processando PDF...</>
            ) : (
              <><Upload size={16} /> Fazer upload e processar</>
            )}
          </button>

          {/* Resultado */}
          {resultado && (
            <div className={`rounded-lg p-4 border ${
              resultado.ok
                ? "bg-verde/10 border-verde/40"
                : "bg-vermelho/10 border-vermelho/40"
            }`}>
              <div className="flex items-start gap-2">
                {resultado.ok
                  ? <CheckCircle size={18} className="text-verde mt-0.5 shrink-0" />
                  : <AlertTriangle size={18} className="text-vermelho mt-0.5 shrink-0" />
                }
                <div>
                  <p className={`font-semibold text-sm ${resultado.ok ? "text-verde" : "text-vermelho"}`}>
                    {resultado.ok ? "Upload concluído" : "Erro no upload"}
                  </p>
                  <p className="text-gray-300 text-sm mt-0.5">{resultado.mensagem}</p>
                </div>
              </div>

              {/* Estações extraídas */}
              {resultado.boletim && resultado.boletim.estacoes.length > 0 && (
                <div className="mt-3">
                  <p className="text-gray-400 text-xs font-semibold mb-2">
                    Estações extraídas ({resultado.boletim.estacoes.length}):
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b border-white/10">
                          <th className="text-left py-1 pr-4">Estação</th>
                          <th className="text-right pr-4">Cota (cm)</th>
                          <th className="text-right pr-4">Var. (cm/dia)</th>
                          <th className="text-right">Δ Ano ant.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.boletim.estacoes.map((e) => (
                          <tr key={e.estacao} className="text-gray-300 border-b border-white/5">
                            <td className="py-1 pr-4 font-semibold text-white">{e.estacao}</td>
                            <td className="text-right pr-4">{e.cota_cm}</td>
                            <td className={`text-right pr-4 ${e.variacao_cm >= 0 ? "text-verde" : "text-vermelho"}`}>
                              {e.variacao_cm >= 0 ? "+" : ""}{e.variacao_cm}
                            </td>
                            <td className={`text-right ${e.delta_ano_cm >= 0 ? "text-verde" : "text-vermelho"}`}>
                              {e.delta_ano_cm >= 0 ? "+" : ""}{e.delta_ano_cm}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Texto bruto para debug */}
                  {resultado.boletim.texto_bruto && (
                    <details className="mt-3">
                      <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-300">
                        Texto extraído do PDF (debug)
                      </summary>
                      <pre className="mt-2 text-gray-500 text-xs bg-azul-marinho rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
                        {resultado.boletim.texto_bruto}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="mt-6">
          <button
            onClick={carregarHistorico}
            className="text-verde text-sm hover:underline flex items-center gap-1"
          >
            <FileText size={14} /> Ver boletins no cache
          </button>

          {historico !== null && (
            <div className="mt-3 bg-azul-medio rounded-lg p-4">
              {historico.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum boletim no cache ainda.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {historico.slice().reverse().map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-white/5 pb-1">
                      <span className="text-white">
                        Boletim {b.numero ?? "?"} — {b.data}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {b.estacoes.length} estações
                        {b.erro && <span className="text-ouro ml-1">⚠</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instrução */}
        <div className="mt-6 bg-azul-medio/50 rounded-lg p-4 text-xs text-gray-400">
          <p className="font-semibold text-gray-300 mb-1">Como usar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Acesse o boletim diário em <span className="text-verde">sema.am.gov.br</span></li>
            <li>Baixe o PDF e faça upload aqui</li>
            <li>O sistema extrai a tabela de cotas automaticamente</li>
            <li>Os dados são salvos e o dashboard é atualizado</li>
          </ol>
          <p className="mt-2">
            Senha padrão de desenvolvimento:{" "}
            <code className="bg-azul-marinho px-1 rounded">ibi2026</code>.
            Configure <code className="bg-azul-marinho px-1 rounded">ADMIN_PASSWORD</code> no <code>.env.local</code> para produção.
          </p>
        </div>
      </div>
    </div>
  );
}
