import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Gauge,
  HeartPulse,
  MessageSquareText,
  Radar,
  SearchCheck,
} from 'lucide-react';

import { ChurnAnalysis } from '../types';
import {
  churnProbability,
  customerHealthScore,
  getEarlyWarnings,
  getRootCauseFactors,
  getSentimentSources,
  overallSentiment,
  riskCategory,
  SentimentLabel,
  SignalCustomer,
  WarningSeverity,
} from '../utils/featureInsights';

function metricValue(value: number | null, suffix = '') {
  return value === null ? 'N/A' : `${value}${suffix}`;
}

function severityTone(severity: WarningSeverity) {
  return {
    medium:
      'bg-yellow-50 text-yellow-800 ring-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:ring-yellow-700',
    high:
      'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:ring-orange-700',
    critical:
      'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900 dark:text-red-200 dark:ring-red-700',
  }[severity];
}

function sentimentTone(status: SentimentLabel) {
  return {
    Positive:
      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:ring-emerald-700',
    Neutral:
      'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
    Negative:
      'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:ring-orange-700',
    'Escalation required':
      'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900 dark:text-red-200 dark:ring-red-700',
  }[status];
}

function MiniMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Gauge;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
        {label}
      </div>
      <p className="mt-2 text-xl font-black text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  );
}

export function PredictionEnginePanel({
  customer,
  analysis,
}: {
  customer: SignalCustomer;
  analysis?: ChurnAnalysis | null;
}) {
  const probability = churnProbability(analysis?.churn_score);
  const health = customerHealthScore(analysis?.churn_score);
  const warnings = getEarlyWarnings(customer, analysis);

  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="agent-pill bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950 dark:text-cyan-200 dark:ring-cyan-900">
            <Radar className="h-3.5 w-3.5" />
            Churn Prediction Engine
          </div>
          <h2 className="mt-3 text-base font-semibold text-slate-950 dark:text-slate-50">
            Probability, health, and alerts
          </h2>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Churn probability" value={metricValue(probability, '%')} icon={Gauge} />
        <MiniMetric label="Health score" value={metricValue(health)} icon={HeartPulse} />
        <MiniMetric label="Risk category" value={riskCategory(analysis?.churn_score)} icon={AlertTriangle} />
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <CircleAlert className="h-4 w-4 text-orange-600" />
          Early warning alerts
        </div>
        {warnings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No active early warning alerts from the available signals.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {warnings.map((warning) => (
              <li key={warning.title} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{warning.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${severityTone(warning.severity)}`}>
                    {warning.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{warning.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function RootCauseAnalysisPanel({
  customer,
  analysis,
}: {
  customer: SignalCustomer;
  analysis?: ChurnAnalysis | null;
}) {
  const factors = getRootCauseFactors(customer, analysis);
  const activeFactors = factors.filter((factor) => factor.active);

  return (
    <section className="panel p-5">
      <div className="agent-pill bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900">
        <SearchCheck className="h-3.5 w-3.5" />
        Root Cause Analysis
      </div>
      <h2 className="mt-3 text-base font-semibold text-slate-950 dark:text-slate-50">
        AI-detected churn drivers
      </h2>
      {analysis?.root_cause && (
        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{analysis.root_cause}</p>
      )}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {factors.map((factor) => (
          <div
            key={factor.label}
            className={`rounded-lg border p-3 ${
              factor.active
                ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            <div className="flex items-start gap-2">
              {factor.active ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" />
              ) : (
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{factor.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {factor.description}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                  {factor.evidence}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {activeFactors.length} of {factors.length} root-cause categories active
      </p>
    </section>
  );
}

export function SentimentAnalysisPanel({ customer }: { customer: SignalCustomer }) {
  const sources = getSentimentSources(customer);
  const summary = overallSentiment(customer);

  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="agent-pill bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900">
            <MessageSquareText className="h-3.5 w-3.5" />
            Customer Sentiment Analysis
          </div>
          <h2 className="mt-3 text-base font-semibold text-slate-950 dark:text-slate-50">
            Omnichannel sentiment signals
          </h2>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${sentimentTone(summary)}`}>
          {summary}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {sources.map((source) => (
          <div key={source.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{source.label}</p>
            <span className={`mt-3 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${sentimentTone(source.status)}`}>
              {source.status}
            </span>
            <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {source.evidence}
            </p>
            <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {source.signals} signal{source.signals === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
