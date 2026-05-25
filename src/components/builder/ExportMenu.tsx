"use client";

import { useState } from "react";
import type { DeckView } from "@/components/builder/types";

type ExportMenuProps = {
  deck: DeckView | null;
};

type ExportFormat = "text" | "csv";

export function ExportMenu({ deck }: ExportMenuProps) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("Choose an export format when the list is ready.");

  async function exportDeck(format: ExportFormat) {
    if (!deck) {
      setStatus("Build a deck before exporting.");
      return;
    }

    setStatus(`Preparing ${format.toUpperCase()} export...`);
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deck, format }),
    });
    const payload = await response.json() as { content: string };
    setContent(payload.content);
    setStatus(`${format.toUpperCase()} export ready.`);
  }

  return (
    <section className="exportMenu" aria-labelledby="export-heading">
      <div className="workspaceHeader workspaceHeader--tight">
        <div>
          <p className="eyebrow">Move list</p>
          <h3 id="export-heading">Export deck</h3>
        </div>
        <div className="buttonPair">
          <button className="button button--quiet" type="button" onClick={() => exportDeck("text")} disabled={!deck}>Text</button>
          <button className="button button--quiet" type="button" onClick={() => exportDeck("csv")} disabled={!deck}>CSV</button>
        </div>
      </div>
      <p className="utilityCopy">Export to text for deck sites or CSV for collection tracking.</p>
      <textarea className="exportOutput" readOnly value={content} placeholder={status} aria-label="Exported deck content" />
    </section>
  );
}
