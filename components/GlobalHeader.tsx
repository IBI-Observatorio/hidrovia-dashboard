"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoIBI from "@/components/LogoIBI";
import { navigationCopy } from "@/lib/navigation-copy";

const { header } = navigationCopy;

export default function GlobalHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-azul-medio border-b border-white/10 sticky top-0 z-50 shadow-lg">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-6">

        {/* Brand */}
        <Link href={header.brand.href} className="flex items-center gap-3 shrink-0">
          <LogoIBI className="h-7 w-auto" />
          <div className="hidden sm:block leading-none">
            <p className="text-white text-sm font-bold">{header.brand.label}</p>
            <p className="text-gray-500 text-[11px] mt-0.5">{header.brand.caption}</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {header.links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-verde/10 text-verde"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
