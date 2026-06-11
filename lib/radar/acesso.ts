// Controle de acesso do Radar — Radar atualmente público (sem cookie obrigatório).
//
// Cliente configurado: VLI. Se auth for re-habilitada no futuro, o cookie
// `ibi_assinante` e o token ASS-VALE-<segredo> ainda existem; o prefixo do token
// resolve o nome de cliente via nomeClienteDoToken (ver lib/auth-assinante).

import { tokenAssinanteAtual, nomeClienteDoToken } from "@/lib/auth-assinante";

/** Clientes liberados para o Radar (env `IBI_RADAR_CLIENTES`, default VLI+Ibi). */
export function clientesRadar(): string[] {
  const raw = process.env.IBI_RADAR_CLIENTES ?? "VLI,Ibi";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Nome do cliente logado SE ele puder ver o Radar; senão null.
 * (token de assinante válido + cliente na allowlist do Radar.)
 */
export async function clienteRadarAtual(): Promise<string | null> {
  const token = await tokenAssinanteAtual();
  const cliente = nomeClienteDoToken(token);
  return cliente && clientesRadar().includes(cliente) ? cliente : null;
}
