import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard Hidrológico — Bacia do Amazonas | IBI",
  description:
    "Monitor em tempo real das cotas fluviométricas da Bacia do Amazonas. " +
    "Dessincronização Norte-Sul 2026, comparação histórica e alertas LWS/ANTAQ. " +
    "Instituto Brasileiro de Infraestrutura — Observatório de Transportes.",
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
