import Link from "next/link";
import LogoIBI from "@/components/LogoIBI";
import { navigationCopy } from "@/lib/navigation-copy";

const { footer } = navigationCopy;

export default function GlobalFooter() {
  return (
    <footer className="bg-azul-medio border-t border-white/10 mt-16">
      <div className="max-w-screen-xl mx-auto px-4 py-10">

        {/* Columns */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand column */}
          <div>
            <LogoIBI className="h-8 w-auto mb-3 opacity-80" />
            <p className="text-gray-500 text-xs leading-relaxed">
              {footer.institutional.description}
            </p>
          </div>

          {footer.columns.map((col) => (
            <div key={col.title}>
              <p className="text-gray-300 text-xs font-semibold uppercase tracking-widest mb-3">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal bar */}
        <div className="border-t border-white/10 pt-5 flex flex-wrap items-center justify-between gap-3 text-gray-600 text-xs">
          <p>{footer.legal.copyright}</p>
          <Link
            href={footer.legal.methodologyHref}
            className="hover:text-gray-400 transition-colors"
          >
            {footer.legal.methodologyLabel}
          </Link>
        </div>

      </div>
    </footer>
  );
}
