import type { CardView } from "@/components/builder/types";

type CardArtProps = {
  card: Pick<CardView, "name" | "imageUrl">;
  size?: "large" | "medium" | "small";
};

function fallbackInitials(name: string): string {
  const initials = name
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "MTG";
}

export function CardArt({ card, size = "small" }: CardArtProps) {
  const style = card.imageUrl ? { backgroundImage: `url("${card.imageUrl}")` } : undefined;

  return (
    <div className={`cardArtFrame cardArtFrame--${size}`}>
      <div className={`cardArt cardArt--${size}`} role="img" aria-label={`${card.name} card art`} tabIndex={0} style={style}>
        {!card.imageUrl ? <span>{fallbackInitials(card.name)}</span> : null}
      </div>
      <div className="cardArtPreview" aria-hidden="true" style={style}>
        {!card.imageUrl ? <span>{fallbackInitials(card.name)}</span> : null}
        <strong>{card.name}</strong>
      </div>
    </div>
  );
}
