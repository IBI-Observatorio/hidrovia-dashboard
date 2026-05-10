import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Observatório IBI — Hidrologia da bacia do Amazonas",
  description:
    "Monitoramento e estudos sobre a hidrologia da bacia amazônica. Mantido pelo Instituto Brasileiro de Infraestrutura.",
  openGraph: {
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body className="min-h-screen bg-azul-marinho text-white antialiased">
        {children}
      </body>
    </html>
  );
}
