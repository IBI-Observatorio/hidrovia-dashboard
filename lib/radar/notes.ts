// Módulo 5 — Notas (boletins datados, tom banco central). Lê content/notes/*.md
// (frontmatter simples + markdown), sem dependência externa. Server-only (fs).

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export interface Nota {
  slug: string;
  date: string;       // YYYY-MM-DD
  title: string;
  assets: string[];   // ids de ativos marcados ("all" = global)
  tag?: string;
  body: string;       // markdown
}

/** Parse de frontmatter `---\nkey: value\n---` + corpo. */
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw.trim() };
  const meta: Record<string, string> = {};
  for (const linha of m[1].split("\n")) {
    const i = linha.indexOf(":");
    if (i > 0) meta[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  }
  return { meta, body: m[2].trim() };
}

/** Lê e ordena os boletins (mais recente primeiro). Vazio se a pasta não existir. */
export function lerNotas(): Nota[] {
  const dir = join(process.cwd(), "content", "notes");
  let arquivos: string[] = [];
  try {
    arquivos = readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const notas = arquivos.map((arq) => {
    const bruto = readFileSync(join(dir, arq), "utf-8").replace(/\r\n/g, "\n");
    const { meta, body } = parseFrontmatter(bruto);
    return {
      slug: arq.replace(/\.md$/, ""),
      date: meta.date ?? "",
      title: meta.title ?? arq,
      assets: (meta.assets ?? "all").split(",").map((s) => s.trim()).filter(Boolean),
      tag: meta.tag,
      body,
    } satisfies Nota;
  });
  return notas.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Notas relevantes a um ativo (as marcadas com o id ou globais "all"). */
export function notasDoAtivo(notas: Nota[], assetId: string): Nota[] {
  return notas.filter((n) => n.assets.includes("all") || n.assets.includes(assetId));
}

// ─────────────────── render markdown mínimo (sem dependência) ───────────────────

export type Bloco =
  | { tipo: "h2"; texto: string }
  | { tipo: "p"; texto: string }
  | { tipo: "ul"; itens: string[] };

/** Quebra o corpo markdown em blocos (## heading, - lista, parágrafo). */
export function parseBlocos(body: string): Bloco[] {
  const blocos: Bloco[] = [];
  for (const bruto of body.split(/\n{2,}/)) {
    const bloco = bruto.trim();
    if (!bloco) continue;
    if (bloco.startsWith("## ")) {
      blocos.push({ tipo: "h2", texto: bloco.slice(3).trim() });
    } else if (bloco.split("\n").every((l) => l.trim().startsWith("- "))) {
      blocos.push({
        tipo: "ul",
        itens: bloco.split("\n").map((l) => l.trim().replace(/^- /, "")),
      });
    } else {
      blocos.push({ tipo: "p", texto: bloco.replace(/\n/g, " ") });
    }
  }
  return blocos;
}

/** Segmenta texto inline em trechos normais/negrito (**bold**). */
export function segmentosInline(texto: string): { b: boolean; t: string }[] {
  return texto.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((s) =>
    s.startsWith("**") && s.endsWith("**")
      ? { b: true, t: s.slice(2, -2) }
      : { b: false, t: s },
  );
}
