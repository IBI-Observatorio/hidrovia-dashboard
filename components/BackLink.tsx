import Link from "next/link";

/**
 * Link "← Voltar" padrão das páginas internas do Observatório.
 * Por padrão volta para a home; passe `href`/`label` para outro destino.
 */
export default function BackLink({
  href = "/",
  label = "Voltar",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-1"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}
