export function CoinIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-coin font-display font-bold text-gold-foreground shadow-gold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      N
    </span>
  );
}