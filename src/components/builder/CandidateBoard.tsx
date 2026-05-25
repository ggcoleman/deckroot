import { Badge } from "@/components/ui/Badge";
import { ManaPip } from "@/components/ui/ManaPip";
import type { CandidateView } from "@/components/builder/types";

type CandidateBoardProps = {
  candidates: CandidateView[];
  selectedCandidateId?: string;
};

export function CandidateBoard({ candidates, selectedCandidateId }: CandidateBoardProps) {
  return (
    <section className="candidateBoard">
      <div className="workspaceHeader">
        <div>
          <p className="eyebrow">Commander routes</p>
          <h2 id="candidate-heading">Ranked builds from owned cards</h2>
        </div>
        <Badge tone="gold">{candidates.length || 0} candidates</Badge>
      </div>

      {candidates.length === 0 ? (
        <div className="emptyState">
          <p>No ranked builds yet.</p>
          <span>Use a seed card, import owned cards, then build to see commander paths.</span>
        </div>
      ) : (
        <div className="candidateList">
          {candidates.map((candidate) => (
            <article className={`candidateItem ${candidate.id === selectedCandidateId ? "candidateItem--selected" : ""}`} key={candidate.id}>
              <div className="candidateItem__top">
                <div>
                  <h3>{candidate.commanderName}</h3>
                  <p>{candidate.theme}</p>
                </div>
                <div className="manaCluster" aria-label={`${candidate.commanderName} color identity`}>
                  {candidate.commander.colorIdentity.length > 0
                    ? candidate.commander.colorIdentity.map((symbol) => <ManaPip key={symbol} symbol={symbol} />)
                    : <ManaPip symbol="C" />}
                </div>
              </div>
              <dl className="candidateStats">
                <div><dt>Score</dt><dd>{Math.round(candidate.score)}</dd></div>
                <div><dt>Owned</dt><dd>{candidate.ownedCount}</dd></div>
                <div><dt>Missing</dt><dd>${candidate.missingEstimatedUsd.toFixed(2)}</dd></div>
              </dl>
              <div className="reasonList">
                {candidate.reasons.map((reason) => <p key={reason}>{reason.replace(candidate.commanderName, "this commander")}</p>)}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


