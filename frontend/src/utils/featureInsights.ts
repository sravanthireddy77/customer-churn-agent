import { ChurnAnalysis, CustomerSignalInput, Domain } from '../types';
import { riskLevel } from './risk';

export type SignalCustomer = {
  customer_id: string;
  name?: string | null;
  domain: Domain;
  recent_usage?: string | null;
  complaints: string[];
  billing_issues: string[];
  sentiment?: string | null;
  support_history: string[];
  plan?: string | null;
  tenure_months?: number | null;
  metadata?: Record<string, unknown>;
};

export type WarningSeverity = 'medium' | 'high' | 'critical';
export type SentimentLabel = 'Positive' | 'Neutral' | 'Negative' | 'Escalation required';

export type EarlyWarning = {
  title: string;
  detail: string;
  severity: WarningSeverity;
};

export type RootCauseFactor = {
  label: string;
  description: string;
  active: boolean;
  evidence: string;
};

export type SentimentSource = {
  label: string;
  status: SentimentLabel;
  evidence: string;
  signals: number;
};

const ROOT_CAUSE_DEFINITIONS = [
  {
    label: 'Price concerns',
    description: 'Fees, plan value, discounts, or perceived account cost.',
    keywords: ['price', 'pricing', 'fee', 'fees', 'cost', 'costs', 'expensive', 'maintenance'],
  },
  {
    label: 'Poor service experience',
    description: 'Reliability, speed, branch, network, or service quality friction.',
    keywords: ['service', 'slow', 'dropped', 'network', 'speed', 'branch', 'failed'],
  },
  {
    label: 'Product issues',
    description: 'Feature gaps, digital product defects, roadmap misses, or adoption blockers.',
    keywords: ['product', 'feature', 'missing', 'roadmap', 'app', 'adoption', 'bug'],
  },
  {
    label: 'Competitor activity',
    description: 'Signals that the customer is evaluating or mentioning alternatives.',
    keywords: ['competitor', 'alternative', 'switching to', 'switch', 'vendor evaluation'],
  },
  {
    label: 'Low usage',
    description: 'Recent decline in usage, transactions, activity, or engagement.',
    keywords: ['usage', 'active users', 'transactions', 'volume', 'down', 'drop', 'decline', 'reduced'],
  },
  {
    label: 'Billing disputes',
    description: 'Overcharges, disputed charges, refunds, bill credits, or account charge issues.',
    keywords: ['billing', 'bill', 'overcharged', 'charge', 'refund', 'credit', 'dispute', 'overdraft'],
  },
  {
    label: 'Support dissatisfaction',
    description: 'Repeated support contacts, unresolved tickets, delays, or escalation pressure.',
    keywords: ['support', 'ticket', 'tickets', 'unresolved', 'calls', 'complaint', 'response'],
  },
] as const;

const SOURCE_DEFINITIONS = [
  {
    label: 'Emails',
    keys: ['emails', 'email', 'email_messages'],
  },
  {
    label: 'Support tickets',
    keys: ['support_tickets', 'tickets'],
  },
  {
    label: 'Chat conversations',
    keys: ['chat_conversations', 'chats', 'chat'],
  },
  {
    label: 'Social media mentions',
    keys: ['social_media_mentions', 'social_mentions', 'social'],
  },
  {
    label: 'Survey responses',
    keys: ['survey_responses', 'surveys', 'nps_comments', 'qbr_notes'],
  },
] as const;

const ESCALATION_TERMS = [
  'cancel',
  'cancellation',
  'escalat',
  'urgent',
  'legal',
  'fraud',
  'unresolved',
  'outage',
  'overcharged',
  'refund',
  'angry',
  'furious',
  'dropped calls',
  'branch complaint',
];

const NEGATIVE_TERMS = [
  'negative',
  'frustrated',
  'complaint',
  'complaints',
  'slow',
  'failed',
  'dispute',
  'issue',
  'issues',
  'missing',
  'dropped',
  'too high',
  'down',
  'decline',
  'reduced',
  'concerned',
  'unresolved',
];

const POSITIVE_TERMS = [
  'positive',
  'happy',
  'satisfied',
  'resolved',
  'stable',
  'up',
  'cooperative',
  'healthy',
  'renew',
];

export function churnProbability(score?: number | null) {
  if (score === undefined || score === null) return null;
  return Math.round(score * 100);
}

export function customerHealthScore(score?: number | null) {
  const probability = churnProbability(score);
  if (probability === null) return null;
  return Math.max(0, 100 - probability);
}

export function riskCategory(score?: number | null) {
  return `${riskLevel(score)} Risk`;
}

export function getEarlyWarnings(
  customer: SignalCustomer,
  analysis?: ChurnAnalysis | null,
): EarlyWarning[] {
  const warnings: EarlyWarning[] = [];
  const text = combinedSignalText(customer, analysis);
  const usageDrop = usageDeclinePercent(customer.recent_usage ?? '');
  const score = analysis?.churn_score;

  if (score !== undefined && score !== null && score > 0.75) {
    warnings.push({
      title: 'Critical churn probability',
      detail: `${churnProbability(score)}% churn probability requires same-day retention review.`,
      severity: 'critical',
    });
  } else if (score !== undefined && score !== null && score > 0.5) {
    warnings.push({
      title: 'High churn probability',
      detail: `${churnProbability(score)}% churn probability is above the outreach threshold.`,
      severity: 'high',
    });
  }

  if (usageDrop !== null && usageDrop >= 40) {
    warnings.push({
      title: 'Sharp usage decline',
      detail: `Usage is down ${usageDrop}%, showing a severe engagement drop.`,
      severity: 'critical',
    });
  } else if (usageDrop !== null && usageDrop >= 20) {
    warnings.push({
      title: 'Usage decline',
      detail: `Usage is down ${usageDrop}%, an early warning of reduced engagement.`,
      severity: 'high',
    });
  } else if (mentionsDecline(customer.recent_usage ?? '')) {
    warnings.push({
      title: 'Usage concern',
      detail: customer.recent_usage ?? 'Recent activity indicates lower engagement.',
      severity: 'medium',
    });
  }

  if (classifyText([customer.sentiment ?? '']) === 'Negative') {
    warnings.push({
      title: 'Negative sentiment',
      detail: customer.sentiment ?? 'Recent sentiment has turned negative.',
      severity: 'high',
    });
  }

  if (customer.complaints.length >= 2) {
    warnings.push({
      title: 'Repeated complaints',
      detail: `${customer.complaints.length} complaint signals indicate recurring friction.`,
      severity: 'high',
    });
  } else if (customer.complaints.length === 1) {
    warnings.push({
      title: 'Complaint signal',
      detail: customer.complaints[0],
      severity: 'medium',
    });
  }

  if (customer.billing_issues.length > 0) {
    warnings.push({
      title: 'Billing dispute',
      detail: customer.billing_issues[0],
      severity: 'high',
    });
  }

  if (customer.support_history.length >= 2 || hasAny(text, ['unresolved', 'repeated', 'tickets', 'calls'])) {
    warnings.push({
      title: 'Support dissatisfaction',
      detail: customer.support_history[0] ?? 'Support history suggests repeated or unresolved interactions.',
      severity: 'high',
    });
  }

  if (hasAny(text, ['competitor', 'switching to', 'alternative'])) {
    warnings.push({
      title: 'Competitor activity',
      detail: 'Customer signals mention alternatives or competitor evaluation.',
      severity: 'high',
    });
  }

  if (hasAny(text, ['cancel', 'cancellation', 'downgrade'])) {
    warnings.push({
      title: 'Cancellation intent',
      detail: 'Cancellation or downgrade language appears in customer signals.',
      severity: 'critical',
    });
  }

  return dedupeWarnings(warnings).slice(0, 6);
}

export function getRootCauseFactors(
  customer: SignalCustomer,
  analysis?: ChurnAnalysis | null,
): RootCauseFactor[] {
  const text = combinedSignalText(customer, analysis);

  return ROOT_CAUSE_DEFINITIONS.map((definition) => {
    const active = hasAny(text, definition.keywords) || factorSignalActive(definition.label, customer);
    return {
      label: definition.label,
      description: definition.description,
      active,
      evidence: active
        ? factorEvidence(definition.label, customer, analysis)
        : 'No strong evidence captured yet.',
    };
  });
}

export function getSentimentSources(customer: SignalCustomer): SentimentSource[] {
  return SOURCE_DEFINITIONS.map((definition) => {
    const metadataSignals = metadataTextValues(customer.metadata, definition.keys);
    const fallbackSignals = fallbackSourceSignals(definition.label, customer);
    const signals = [...metadataSignals, ...fallbackSignals].filter(Boolean);
    const status = classifyText(signals);

    return {
      label: definition.label,
      status,
      evidence: signals[0] ?? 'No negative source signal captured.',
      signals: signals.length,
    };
  });
}

export function overallSentiment(customer: SignalCustomer): SentimentLabel {
  const statuses = getSentimentSources(customer).map((source) => source.status);
  if (statuses.includes('Escalation required')) return 'Escalation required';
  if (statuses.includes('Negative')) return 'Negative';
  if (statuses.includes('Positive')) return 'Positive';
  return 'Neutral';
}

export function activeRootCauseCount(customer: SignalCustomer, analysis?: ChurnAnalysis | null) {
  return getRootCauseFactors(customer, analysis).filter((factor) => factor.active).length;
}

export function warningSeverityRank(severity: WarningSeverity) {
  return { medium: 1, high: 2, critical: 3 }[severity];
}

function fallbackSourceSignals(label: string, customer: SignalCustomer): string[] {
  if (label === 'Emails') return customer.sentiment ? [customer.sentiment] : [];
  if (label === 'Support tickets') {
    return [...customer.support_history, ...customer.complaints, ...customer.billing_issues];
  }
  if (label === 'Chat conversations') return customer.support_history;
  if (label === 'Survey responses') return customer.sentiment ? [customer.sentiment] : [];
  return [];
}

function factorSignalActive(label: string, customer: SignalCustomer) {
  if (label === 'Low usage') return mentionsDecline(customer.recent_usage ?? '');
  if (label === 'Billing disputes') return customer.billing_issues.length > 0;
  if (label === 'Support dissatisfaction') return customer.support_history.length >= 2;
  if (label === 'Price concerns') {
    return hasAny([...customer.complaints, ...customer.billing_issues].join(' '), ['fee', 'cost', 'price']);
  }
  return false;
}

function factorEvidence(
  label: string,
  customer: SignalCustomer,
  analysis?: ChurnAnalysis | null,
) {
  if (label === 'Low usage' && customer.recent_usage) return customer.recent_usage;
  if (label === 'Billing disputes' && customer.billing_issues.length) return customer.billing_issues[0];
  if (label === 'Support dissatisfaction' && customer.support_history.length) {
    return customer.support_history[0];
  }
  if (label === 'Product issues' && customer.complaints.length) return customer.complaints[0];
  if (label === 'Poor service experience' && customer.complaints.length) return customer.complaints[0];
  if (label === 'Price concerns' && customer.billing_issues.length) return customer.billing_issues[0];
  if (label === 'Competitor activity') return 'Competitor or alternative evaluation found in signal text.';
  return analysis?.root_cause ?? 'Detected from customer signal text.';
}

function classifyText(signals: string[]): SentimentLabel {
  const text = signals.join(' ').toLowerCase();
  if (!text.trim()) return 'Neutral';
  if (hasAny(text, ESCALATION_TERMS)) return 'Escalation required';

  const negativeCount = countMatches(text, NEGATIVE_TERMS);
  const positiveCount = countMatches(text, POSITIVE_TERMS);
  if (negativeCount > positiveCount) return 'Negative';
  if (positiveCount > negativeCount) return 'Positive';
  return 'Neutral';
}

function combinedSignalText(customer: SignalCustomer, analysis?: ChurnAnalysis | null) {
  return [
    customer.recent_usage,
    customer.sentiment,
    customer.plan,
    customer.complaints.join(' '),
    customer.billing_issues.join(' '),
    customer.support_history.join(' '),
    analysis?.root_cause,
    analysis?.recommended_intervention,
    ...(analysis?.reasoning ?? []),
    JSON.stringify(customer.metadata ?? {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function usageDeclinePercent(text: string) {
  if (!mentionsDecline(text)) return null;
  const match = text.toLowerCase().match(/(\d{1,3})\s*%/);
  if (!match) return null;
  return Math.min(Number(match[1]), 100);
}

function mentionsDecline(text: string) {
  return hasAny(text, ['down', 'declin', 'drop', 'reduced', 'decrease']);
}

function metadataTextValues(metadata: Record<string, unknown> | undefined, keys: readonly string[]) {
  if (!metadata) return [];
  return keys.flatMap((key) => unknownToStrings(metadata[key]));
}

function unknownToStrings(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
  if (Array.isArray(value)) return value.flatMap(unknownToStrings);
  if (typeof value === 'object') return Object.values(value).flatMap(unknownToStrings);
  return [];
}

function hasAny(text: string, keywords: readonly string[]) {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => keywordMatches(lowerText, keyword));
}

function countMatches(text: string, keywords: readonly string[]) {
  const lowerText = text.toLowerCase();
  return keywords.reduce((count, keyword) => count + (keywordMatches(lowerText, keyword) ? 1 : 0), 0);
}

function keywordMatches(lowerText: string, keyword: string) {
  const lowerKeyword = keyword.toLowerCase();
  if (['declin', 'escalat'].includes(lowerKeyword)) {
    return lowerText.includes(lowerKeyword);
  }
  if (lowerKeyword.includes(' ')) {
    return lowerText.includes(lowerKeyword);
  }
  return new RegExp(`\\b${escapeRegExp(lowerKeyword)}\\b`).test(lowerText);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dedupeWarnings(warnings: EarlyWarning[]) {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = warning.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function toSignalCustomer(customer: SignalCustomer | CustomerSignalInput): SignalCustomer {
  return {
    ...customer,
    complaints: customer.complaints ?? [],
    billing_issues: customer.billing_issues ?? [],
    support_history: customer.support_history ?? [],
    metadata: customer.metadata ?? {},
  };
}
