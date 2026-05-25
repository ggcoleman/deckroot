import { Badge } from "@/components/ui/Badge";
import { Meter } from "@/components/ui/Meter";
import { ManaPip } from "@/components/ui/ManaPip";
import { ExportMenu } from "@/components/builder/ExportMenu";
import type { AnalysisView, DeckEntryView, DeckView } from "@/components/builder/types";
import type { DeckRole } from "@/domain/decks/role-classifier";

type DeckWorkspaceProps = {
  deck: DeckView | null;
  analysis: AnalysisView | null;
  targetBracket: number;
};

const roleTargets: Partial<Record<DeckRole, number>> = {
  land: 37,
  ramp: 10,
  draw: 10,
  removal: 8,
  wipe: 2,
  protection: 4,
  payoff: 12,
  utility: 12,
};

const featuredRoles: DeckRole[] = ["land", "ramp", "draw", "removal", "wipe", "protection", "payoff", "utility"];

export function DeckWorkspace({ deck, analysis, targetBracket }: DeckWorkspaceProps) {
  const cardCount = deck?.cards.reduce((total, entry) => total + entry.quantity, 0) ?? 0;
  const commander = deck?.commander;
  const topRows = deck?.cards.filter((entry) => entry.card.name !== commander?.name).slice(0, 12) ?? [];

  return (
    <section className="deckWorkspace" aria-labelledby="deck-heading">
      <div className="workspaceHeader">
        <div>
          <p className="eyebrow">Active list</p>
          <h2 id="deck-heading">Deck workspace</h2>
        </div>
        <div className="deckCount" aria-label={`${cardCount} cards`}>{cardCount || 0} cards</div>
      </div>

      {!deck || !analysis ? (
        <div className="emptyState emptyState--large">
          <p>Build a deck to fill the table.</p>
          <span>The workspace will show the commander, 100 cards, curve rows, role meters, bracket estimate, Rule Zero notes, and export actions.</span>
        </div>
      ) : (
        <>
          <section className="commanderPlate" aria-label="Selected commander">
            <div>
              <p className="eyebrow">Commander</p>
              <h3>Selected commander</h3>
              <p>{deck.commander.typeLine}</p>
            </div>
            <div className="manaCluster">
              {deck.commander.colorIdentity.length > 0
                ? deck.commander.colorIdentity.map((symbol) => <ManaPip key={symbol} symbol={symbol} />)
                : <ManaPip symbol="C" />}
            </div>
          </section>

          <div className="workspaceGrid">
            <section className="analysisPanel" aria-labelledby="curve-heading">
              <div className="workspaceHeader workspaceHeader--tight">
                <h3 id="curve-heading">Curve rows</h3>
                <Badge tone="neutral">Avg MV {analysis.averageManaValue}</Badge>
              </div>
              <div className="curveRows">
                {Object.entries(analysis.curve).sort(([left], [right]) => Number(left) - Number(right)).map(([manaValue, count]) => (
                  <div className="curveRow" key={manaValue}>
                    <span>{manaValue}</span>
                    <div><i style={{ width: `${Math.min(100, count * 4)}%` }} /></div>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="analysisPanel" aria-labelledby="roles-heading">
              <div className="workspaceHeader workspaceHeader--tight">
                <h3 id="roles-heading">Role meters</h3>
                <Badge tone="gold">${analysis.estimatedPriceUsd.toFixed(2)}</Badge>
              </div>
              <div className="roleMeters">
                {featuredRoles.map((role) => (
                  <Meter key={role} label={role} value={analysis.roles[role] ?? 0} max={roleTargets[role] ?? 10} />
                ))}
              </div>
            </section>
          </div>

          <section className="ruleZeroPanel" aria-labelledby="rule-zero-heading">
            <div>
              <p className="eyebrow">Rule Zero</p>
              <h3 id="rule-zero-heading">Bracket {analysis.bracket.recommended}</h3>
              <p>Target bracket {targetBracket}; confidence {analysis.bracket.confidence}. {analysis.gameChangerCount} Game Changer cards detected.</p>
            </div>
            <ul>
              {analysis.bracket.ruleZeroNotes.map((note) => <li key={note}>{note}</li>)}
              {analysis.bracket.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </section>

          <section className="deckTable" aria-label="Deck preview">
            {topRows.map((entry, index) => <DeckRow key={`${entry.card.name}-${index}`} entry={entry} />)}
          </section>

          <ExportMenu deck={deck} />
        </>
      )}
    </section>
  );
}

function DeckRow({ entry }: { entry: DeckEntryView }) {
  return (
    <div className="deckRow">
      <strong>{entry.quantity} {entry.card.name}</strong>
      <span>{entry.role.join(" / ")}</span>
      <em>{entry.ownedQuantity > 0 ? "owned" : "missing"}</em>
    </div>
  );
}


