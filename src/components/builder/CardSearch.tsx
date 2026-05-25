type CardSearchProps = {
  seedCardName: string;
  onSeedCardNameChange: (value: string) => void;
  onUseBitterblossom: () => void;
};

export function CardSearch({ seedCardName, onSeedCardNameChange, onUseBitterblossom }: CardSearchProps) {
  return (
    <section className="railSection" aria-labelledby="seed-heading">
      <div className="sectionHeader">
        <p className="eyebrow">Seed</p>
        <h2 id="seed-heading">Start point</h2>
      </div>
      <label className="fieldLabel" htmlFor="card-or-commander">Card or commander</label>
      <input
        id="card-or-commander"
        className="textInput"
        value={seedCardName}
        onChange={(event) => onSeedCardNameChange(event.target.value)}
        placeholder="Bitterblossom, Sol Ring, Alela..."
      />
      <button className="button button--quiet" type="button" onClick={onUseBitterblossom}>
        Use Bitterblossom
      </button>
      <p className="utilityCopy">Pick one card you want the deck to honor. Commander suggestions will bias toward legal synergy.</p>
    </section>
  );
}
