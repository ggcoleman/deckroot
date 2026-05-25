"use client";

import { useState } from "react";
import { BuyRail } from "@/components/builder/BuyRail";
import { CandidateBoard } from "@/components/builder/CandidateBoard";
import { DeckWorkspace } from "@/components/builder/DeckWorkspace";
import { LeftRail } from "@/components/builder/LeftRail";
import type { BuildResponseView, ImportResponseView } from "@/components/builder/types";

export function BuilderShell() {
  const [seedCardName, setSeedCardName] = useState("Bitterblossom");
  const [ownedList, setOwnedList] = useState("");
  const [budgetUsd, setBudgetUsd] = useState(80);
  const [targetBracket, setTargetBracket] = useState(2);
  const [buildResult, setBuildResult] = useState<BuildResponseView | null>(null);
  const [importSummary, setImportSummary] = useState<string>();
  const [status, setStatus] = useState("Ready to build from a seed card or owned pile.");
  const [isBusy, setIsBusy] = useState(false);
  const statusChip = isBusy ? "Working" : buildResult?.deck ? "Complete" : "Ready";

  async function buildDeck(options: { seed?: string; ownedCardNames?: string[] } = {}) {
    setIsBusy(true);
    setStatus("Building commander routes...");
    try {
      const response = await fetch("/api/deck/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedCardName: (options.seed ?? seedCardName).trim(),
          ownedCardNames: options.ownedCardNames ?? [],
          targetBracket,
          budgetUsd,
        }),
      });
      const payload = await response.json() as BuildResponseView;
      setBuildResult(payload);
      setStatus(payload.deck ? "Build complete. Review the commander, curve, buy list, and export options." : "No legal commander route found.");
    } catch {
      setStatus("Deck build failed. Check the input and try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function analyzeOwnedList() {
    setIsBusy(true);
    setStatus("Resolving owned cards...");
    try {
      const importResponse = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: ownedList }),
      });
      const imported = await importResponse.json() as ImportResponseView;
      const ownedCardNames = imported.resolved.cards.flatMap((row) => Array.from({ length: row.quantity }, () => row.card.name));
      const unresolvedCount = imported.resolved.unresolved.length;
      setImportSummary(`${imported.resolved.cards.length} rows resolved${unresolvedCount ? `, ${unresolvedCount} unresolved` : ""}.`);
      await buildDeck({ seed: "", ownedCardNames });
    } catch {
      setStatus("Owned list analysis failed. Check the list format and try again.");
      setIsBusy(false);
    }
  }

  const selectedCandidateId = buildResult?.candidates[0]?.id;

  return (
    <main className="builderShell">
      <LeftRail
        seedCardName={seedCardName}
        ownedList={ownedList}
        budgetUsd={budgetUsd}
        targetBracket={targetBracket}
        isBusy={isBusy}
        importSummary={importSummary}
        onSeedCardNameChange={setSeedCardName}
        onOwnedListChange={setOwnedList}
        onBudgetUsdChange={(value) => setBudgetUsd(Number.isFinite(value) ? value : 0)}
        onTargetBracketChange={(value) => setTargetBracket(value)}
        onUseSeed={() => void buildDeck({ seed: seedCardName })}
        onBuildDeck={() => void buildDeck()}
        onAnalyzeOwnedList={() => void analyzeOwnedList()}
      />

      <section className="centerStack" aria-label="Deck build workspace">
        <div className="statusStrip">
          <span>{statusChip}</span>
          <p>{status}</p>
        </div>
        <CandidateBoard candidates={buildResult?.candidates ?? []} selectedCandidateId={selectedCandidateId} />
        <DeckWorkspace deck={buildResult?.deck ?? null} analysis={buildResult?.analysis ?? null} targetBracket={targetBracket} />
      </section>

      <BuyRail buyList={buildResult?.buyList ?? null} budgetUsd={budgetUsd} />
    </main>
  );
}
