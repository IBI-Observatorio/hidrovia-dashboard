"use client";

import { useState } from "react";
import LogoIBI from "@/components/LogoIBI";
import { navigationCopy } from "@/lib/navigation-copy";

const { header } = navigationCopy;

export default function GlobalHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: "rgba(44, 44, 44, 0.9)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <a
            href={header.brand.href}
            className="flex items-center"
          >
            <LogoIBI className="h-10 w-auto" />
            <span className="ml-2 text-white font-semibold text-lg">
              {header.brand.label}
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-8">
            {header.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium relative group"
              >
                {link.label}
                <span
                  className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-ibi-green to-ibi-blue group-hover:w-full transition-all duration-300"
                />
              </a>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden text-gray-300 hover:text-white transition-colors duration-200"
            aria-label="Abrir menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
          style={{ backgroundColor: "rgba(44, 44, 44, 0.95)" }}
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            {header.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md text-base font-medium w-full text-left transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
