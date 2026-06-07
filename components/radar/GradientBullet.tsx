// Marcador de bullet em gradiente (verde→azul) compartilhado pelas listas de
// drivers do Radar (antes duplicado em MaturationRail e RiskMatrix).

export default function GradientBullet() {
  return (
    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-ibi-green to-ibi-blue" />
  );
}
