import { formatPercent, riskLevel, riskTone } from '../utils/risk';

export function RiskBadge({ score }: { score?: number | null }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${riskTone(score)}`}>
      {riskLevel(score)} Risk
      <span className="font-medium opacity-80">{formatPercent(score)}</span>
    </span>
  );
}
