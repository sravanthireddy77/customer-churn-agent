import { RiskLevel } from '../types';

export function riskLevel(score?: number | null): RiskLevel {
  if (score === undefined || score === null) return 'Low';
  if (score <= 0.25) return 'Low';
  if (score <= 0.5) return 'Medium';
  if (score <= 0.75) return 'High';
  return 'Critical';
}

export function riskTone(score?: number | null): string {
  const level = riskLevel(score);
  return {
    Low: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:ring-emerald-700',
    Medium: 'bg-yellow-50 text-yellow-800 ring-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:ring-yellow-700',
    High: 'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:ring-orange-700',
    Critical: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900 dark:text-red-300 dark:ring-red-700',
  }[level];
}

export function riskBar(score?: number | null): string {
  const level = riskLevel(score);
  return {
    Low: 'bg-emerald-500',
    Medium: 'bg-yellow-500',
    High: 'bg-orange-500',
    Critical: 'bg-red-500',
  }[level];
}

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null) return 'N/A';
  return `${Math.round(value * 100)}%`;
}
