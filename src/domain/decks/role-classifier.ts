import type { Card } from "@/domain/cards/types";

export type DeckRole = "land" | "ramp" | "draw" | "removal" | "wipe" | "protection" | "recursion" | "payoff" | "utility";

export function classifyRole(card: Card): DeckRole[] {
  const text = `${card.typeLine}\n${card.oracleText}`.toLowerCase();
  const typeLine = card.typeLine.toLowerCase();
  const roles = new Set<DeckRole>();
  if (typeLine.includes("land")) roles.add("land");
  if (text.includes("add ") && (text.includes("mana") || /\{[cwubrg]\}/.test(text) || Boolean(card.producedMana?.length))) roles.add("ramp");
  if (/draw (a|two|three|x|that many|cards?)/.test(text)) roles.add("draw");
  if (/(destroy|exile|counter target|return target).*(creature|artifact|enchantment|spell|permanent)/.test(text)) roles.add("removal");
  if (/(destroy|exile).*(all|each).*(creatures|permanents|artifacts|enchantments)/.test(text)) roles.add("wipe");
  if (/(hexproof|indestructible|protection from|phase out)/.test(text)) roles.add("protection");
  if (/(return target.*from your graveyard|reanimate|flashback|escape)/.test(text)) roles.add("recursion");
  if (/(whenever|tokens?|double|win the game|each opponent loses|combat damage to a player)/.test(text) && !roles.has("land")) roles.add("payoff");
  if (roles.size === 0) roles.add("utility");
  return [...roles];
}
