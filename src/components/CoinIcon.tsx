import coinImg from "@/assets/njx-coin.png";

export function CoinIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={coinImg}
        alt="NJX coin"
        width={size}
        height={size}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}