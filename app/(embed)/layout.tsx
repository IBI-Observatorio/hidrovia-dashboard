// Route group (embed): irmão de (site), portanto SEM GlobalHeader/GlobalFooter.
// O fundo escuro vem do <body> (root layout + globals.css); aqui o tornamos
// transparente para o widget enquadrado em iframe externo.
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`body{background:transparent !important}`}</style>
      {children}
    </>
  );
}
