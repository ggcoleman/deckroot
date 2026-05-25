import { CardSearch } from "@/components/builder/CardSearch";
import { OwnedListImporter } from "@/components/builder/OwnedListImporter";

type LeftRailProps = {
  seedCardName: string;
  ownedList: string;
  budgetUsd: number;
  targetBracket: number;
  isBusy: boolean;
  importSummary?: string;
  onSeedCardNameChange: (value: string) => void;
  onOwnedListChange: (value: string) => void;
  onBudgetUsdChange: (value: number) => void;
  onTargetBracketChange: (value: number) => void;
  onUseBitterblossom: () => void;
  onBuildDeck: () => void;
  onAnalyzeOwnedList: () => void;
};

export function LeftRail(props: LeftRailProps) {
  return (
    <aside className="leftRail" aria-label="Deck inputs">
      <div className="brandBlock">
        <p className="eyebrow">Deckroot Commander</p>
        <h1>Workbench</h1>
        <p>Build a legal 100-card Commander list from a seed card or the cards already on your table.</p>
      </div>

      <CardSearch
        seedCardName={props.seedCardName}
        onSeedCardNameChange={props.onSeedCardNameChange}
        onUseBitterblossom={props.onUseBitterblossom}
      />

      <section className="railSection railSection--compact" aria-labelledby="constraints-heading">
        <div className="sectionHeader">
          <p className="eyebrow">Limits</p>
          <h2 id="constraints-heading">Table fit</h2>
        </div>
        <div className="controlGrid">
          <label className="fieldLabel" htmlFor="budget-usd">Budget USD</label>
          <input
            id="budget-usd"
            className="textInput"
            type="number"
            min="0"
            step="5"
            value={props.budgetUsd}
            onChange={(event) => props.onBudgetUsdChange(Number(event.target.value))}
          />
          <label className="fieldLabel" htmlFor="target-bracket">Bracket</label>
          <select
            id="target-bracket"
            className="textInput"
            value={props.targetBracket}
            onChange={(event) => props.onTargetBracketChange(Number(event.target.value))}
          >
            <option value="1">1 - Precon</option>
            <option value="2">2 - Tuned casual</option>
            <option value="3">3 - Focused</option>
            <option value="4">4 - Optimized</option>
            <option value="5">5 - cEDH</option>
          </select>
        </div>
        <button className="button button--primary" type="button" onClick={props.onBuildDeck} disabled={props.isBusy}>
          Build deck
        </button>
      </section>

      <OwnedListImporter
        ownedList={props.ownedList}
        onOwnedListChange={props.onOwnedListChange}
        onAnalyzeOwnedList={props.onAnalyzeOwnedList}
        disabled={props.isBusy}
        importSummary={props.importSummary}
      />
    </aside>
  );
}
