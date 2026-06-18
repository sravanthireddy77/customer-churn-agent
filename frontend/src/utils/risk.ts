import { RiskLevel } from '../types';

export function riskLevel(score?: number | null): RiskLevel {
  if (score === undefined || score === null) return 'Low';
  if (score <= 0.25) return 'Low';
  if (score <= 0.5) return 'Moderate';
  if (score <= 0.75) return 'High';
  return 'Critical';
}

export function riskTone(score?: number | null): string {
  const level = riskLevel(score);
  return {
    Low: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Moderate: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
    High: 'bg-orange-50 text-orange-800 ring-orange-200',
    Critical: 'bg-red-50 text-red-700 ring-red-200',
  }[level];
}

export function riskBar(score?: number | null): string {
  const level = riskLevel(score);
  return {
    Low: 'bg-emerald-500',
    Moderate: 'bg-yellow-500',
    High: 'bg-orange-500',
    Critical: 'bg-red-500',
  }[level];
}

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null) return 'N/A';
  return `${Math.round(value * 100)}%`;
}
