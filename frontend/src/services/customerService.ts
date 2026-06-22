/**
 * Customer Service
 *
 * Contains business logic for customer operations.
 * No React components or UI code here - pure business logic.
 */

import { CustomerStats, LegacyCustomer } from "../types";

/**
 * Calculate risk percentage of a customer
 * Used for analytics
 */
export const calculateRiskPercentage = (
  stats: CustomerStats,
  riskLevel: "HIGH" | "MEDIUM" | "LOW",
): string => {
  if (stats.total === 0) return "0%";

  let count = 0;
  if (riskLevel === "HIGH") count = stats.high_risk;
  if (riskLevel === "MEDIUM") count = stats.medium_risk;
  if (riskLevel === "LOW") count = stats.low_risk;

  const percentage = ((count / stats.total) * 100).toFixed(1);
  return `${percentage}%`;
};

/**
 * Determine urgency based on risk level and last login days
 */
export const getUrgencyScore = (customer: LegacyCustomer): number => {
  let score = 0;

  // Risk level component (0-40)
  if (customer.risk_level === "HIGH") score += 40;
  else if (customer.risk_level === "MEDIUM") score += 20;
  else score += 5;

  // Inactivity component (0-30)
  if (customer.last_login_days > 20) score += 30;
  else if (customer.last_login_days > 10) score += 15;
  else score += 5;

  // Usage trend component (0-30)
  if (customer.usage_trend.includes("70%")) score += 30;
  else if (customer.usage_trend.includes("60%")) score += 25;
  else if (customer.usage_trend.includes("40%")) score += 15;
  else if (customer.usage_trend.includes("30%")) score += 10;
  else score += 5;

  return Math.min(score, 100); // Cap at 100
};

/**
 * Sort customers by urgency
 */
export const sortByUrgency = (customers: LegacyCustomer[]): LegacyCustomer[] => {
  return [...customers].sort((a, b) => {
    return getUrgencyScore(b) - getUrgencyScore(a);
  });
};

/**
 * Get recommended follow-up message based on customer data
 */
export const getFollowUpContext = (customer: LegacyCustomer): string => {
  const parts: string[] = [];

  if (customer.last_login_days > 14) {
    parts.push(`They haven't logged in for ${customer.last_login_days} days`);
  }

  if (customer.usage_trend.includes("down")) {
    parts.push(`Their usage has ${customer.usage_trend}`);
  }

  if (customer.issue_type !== "none") {
    parts.push(`They may be experiencing ${customer.issue_type}`);
  }

  return parts.length > 0
    ? parts.join("; ") + "."
    : "Proactive outreach recommended.";
};

/**
 * Check if customer is actionable (should be contacted)
 */
export const isActionable = (customer: LegacyCustomer): boolean => {
  // HIGH or MEDIUM risk with Pending status are actionable
  if (
    (customer.risk_level === "HIGH" || customer.risk_level === "MEDIUM") &&
    customer.status === "Pending"
  ) {
    return true;
  }
  return false;
};

/**
 * Get action category for bucketing customers
 */
export const getActionCategory = (
  customer: LegacyCustomer,
): "urgent" | "important" | "routine" | "healthy" => {
  if (customer.risk_level === "HIGH" && customer.status === "Pending") {
    return "urgent";
  }
  if (customer.risk_level === "MEDIUM" && customer.status === "Pending") {
    return "important";
  }
  if (customer.risk_level === "LOW" && customer.status === "Pending") {
    return "routine";
  }
  return "healthy";
};
