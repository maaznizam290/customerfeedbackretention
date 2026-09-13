interface CoinBadgeProps {
  amount: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-sm px-2.5 py-1 gap-1",
  md: "text-base px-3.5 py-1.5 gap-1.5",
  lg: "text-2xl px-5 py-2.5 gap-2",
};

export function CoinBadge({ amount, size = "md", className = "" }: CoinBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r from-atharx-gold/20 to-amber-200/30 font-bold text-amber-800 ring-1 ring-inset ring-amber-300 ${sizeClasses[size]} ${className}`}
    >
      <span aria-hidden="true">🪙</span>
      <span>
        {amount.toLocaleString()} {amount === 1 ? "Coin" : "Coins"}
      </span>
    </span>
  );
}
