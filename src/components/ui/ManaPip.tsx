import type { Color } from "@/domain/cards/types";

type ManaPipProps = {
  symbol: Color | "C";
  label?: string;
};

const labels: Record<Color | "C", string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
};

export function ManaPip({ symbol, label }: ManaPipProps) {
  return (
    <span className={`manaPip manaPip--${symbol.toLowerCase()}`} aria-label={label ?? labels[symbol]} title={label ?? labels[symbol]}>
      {symbol}
    </span>
  );
}
