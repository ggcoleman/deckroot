type OwnedListImporterProps = {
  ownedList: string;
  onOwnedListChange: (value: string) => void;
  onAnalyzeOwnedList: () => void;
  disabled?: boolean;
  importSummary?: string;
};

export function OwnedListImporter({ ownedList, onOwnedListChange, onAnalyzeOwnedList, disabled = false, importSummary }: OwnedListImporterProps) {
  return (
    <section className="railSection" aria-labelledby="owned-heading">
      <div className="sectionHeader">
        <p className="eyebrow">Collection</p>
        <h2 id="owned-heading">Owned list</h2>
      </div>
      <label className="fieldLabel" htmlFor="owned-cards">Owned cards</label>
      <textarea
        id="owned-cards"
        className="textArea"
        value={ownedList}
        onChange={(event) => onOwnedListChange(event.target.value)}
        placeholder={"Commander: Alela, Artful Provocateur\n1 Sol Ring\n1 Arcane Signet"}
      />
      <button className="button button--secondary" type="button" onClick={onAnalyzeOwnedList} disabled={disabled}>
        Analyze owned list
      </button>
      {importSummary ? <p className="statusText">{importSummary}</p> : <p className="utilityCopy">Paste text or CSV. We resolve owned cards first, then rank commanders by legal overlap.</p>}
    </section>
  );
}
