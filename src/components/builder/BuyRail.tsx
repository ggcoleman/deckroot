import { Badge } from "@/components/ui/Badge";
import type { BuyListItemView, BuyListView } from "@/components/builder/types";

type BuyRailProps = {
  buyList: BuyListView | null;
  budgetUsd: number;
};

export function BuyRail({ buyList, budgetUsd }: BuyRailProps) {
  const items = buyList?.items.slice(0, 10) ?? [];

  return (
    <aside className="buyRail" aria-labelledby="buy-heading">
      <div className="workspaceHeader">
        <div>
          <p className="eyebrow">Acquisitions</p>
          <h2 id="buy-heading">Buy first</h2>
        </div>
        <Badge tone="green">${(buyList?.totalSelectedUsd ?? 0).toFixed(2)} / ${budgetUsd}</Badge>
      </div>

      {items.length === 0 ? (
        <div className="emptyState">
          <p>No buy list yet.</p>
          <span>Build a deck to rank missing cards by priority and budget fit.</span>
        </div>
      ) : (
        <div className="buyList">
          {items.map((item, index) => <BuyItem key={`${item.card.name}-${index}`} item={item} />)}
        </div>
      )}
    </aside>
  );
}

function BuyItem({ item }: { item: BuyListItemView }) {
  const purchaseLinks = Object.entries(item.card.purchaseUris).filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <article className="buyItem">
      <div className="buyItem__top">
        <h3>{item.quantity} {item.card.name}</h3>
        <strong>${item.estimatedUsd.toFixed(2)}</strong>
      </div>
      <p>{item.priority}</p>
      <Badge tone={item.selectedWithinBudget ? "green" : "neutral"}>
        {item.selectedWithinBudget ? "Selected within budget" : "Outside current budget"}
      </Badge>
      <div className="purchaseLinks" aria-label={`Purchase links for ${item.card.name}`}>
        {purchaseLinks.length > 0
          ? purchaseLinks.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer">{name}</a>)
          : <span>No purchase links</span>}
      </div>
    </article>
  );
}
