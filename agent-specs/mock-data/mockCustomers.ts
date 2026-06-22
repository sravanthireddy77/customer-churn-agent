/**
 * Mock Customer Data
 *
 * This file contains sample customer data for the MVP demo.
 * Can be replaced with API calls in Phase 2.
 *
 * Usage:
 * import { mockCustomers } from './mockCustomers';
 *
 * const [customers, setCustomers] = useState(mockCustomers);
 */

export interface Customer {
  id: number;
  name: string;
  email: string;
  last_login_days: number;
  usage_trend: string;
  issue_type:
    | "low_usage"
    | "feature_confusion"
    | "pricing"
    | "technical_issue"
    | "none";
  plan_type: "Basic" | "Pro" | "Premium";
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  suggested_action: string;
  status:
    | "Pending"
    | "Contacted"
    | "Rescue in progress"
    | "Rescued"
    | "Lost"
    | "Healthy";
  ai_message: string;
}

export const mockCustomers: Customer[] = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul@example.com",
    last_login_days: 18,
    usage_trend: "down 60%",
    issue_type: "low_usage",
    plan_type: "Pro",
    risk_level: "HIGH",
    suggested_action: "Send tutorial or onboarding guide",
    status: "Pending",
    ai_message:
      "Hi Rahul, we noticed you have not been active lately. Many users find our quick tutorials helpful to get more value. Would you like a short walkthrough to get started again?",
  },
  {
    id: 2,
    name: "Priya Verma",
    email: "priya@example.com",
    last_login_days: 5,
    usage_trend: "stable",
    issue_type: "none",
    plan_type: "Basic",
    risk_level: "LOW",
    suggested_action: "Send engagement tips",
    status: "Healthy",
    ai_message:
      "Hi Priya, thanks for staying active. Here are a few quick tips to help you get even more value from your current plan.",
  },
  {
    id: 3,
    name: "Amit Patel",
    email: "amit@example.com",
    last_login_days: 12,
    usage_trend: "down 40%",
    issue_type: "feature_confusion",
    plan_type: "Pro",
    risk_level: "MEDIUM",
    suggested_action: "Offer demo call",
    status: "Pending",
    ai_message:
      "Hi Amit, we noticed your usage has reduced recently. If any feature feels unclear, we would be happy to walk you through it in a quick demo.",
  },
  {
    id: 4,
    name: "Neha Gupta",
    email: "neha@example.com",
    last_login_days: 25,
    usage_trend: "down 70%",
    issue_type: "pricing",
    plan_type: "Premium",
    risk_level: "HIGH",
    suggested_action: "Provide discount or plan downgrade option",
    status: "Pending",
    ai_message:
      "Hi Neha, we understand pricing can be an important factor. We can help review your current plan and suggest a better-fit option. Would you like to discuss this?",
  },
  {
    id: 5,
    name: "Karan Mehta",
    email: "karan@example.com",
    last_login_days: 10,
    usage_trend: "down 30%",
    issue_type: "technical_issue",
    plan_type: "Basic",
    risk_level: "MEDIUM",
    suggested_action: "Assign support agent immediately",
    status: "Pending",
    ai_message:
      "Hi Karan, we noticed there may be a technical issue affecting your experience. Our support team can help resolve it quickly. Would you like us to assist?",
  },
];

/**
 * Utility functions for working with mock data
 */

/**
 * Get summary statistics from customer list
 */
export const getCustomerStats = (customers: Customer[]) => {
  return {
    total: customers.length,
    high_risk: customers.filter((c) => c.risk_level === "HIGH").length,
    medium_risk: customers.filter((c) => c.risk_level === "MEDIUM").length,
    low_risk: customers.filter((c) => c.risk_level === "LOW").length,
    pending_actions: customers.filter((c) => c.status === "Pending").length,
  };
};

/**
 * Get risk explanation for a customer
 */
export const getRiskExplanation = (customer: Customer): string => {
  if (customer.risk_level === "HIGH") {
    return `${customer.name} is at high risk because they have been inactive for ${customer.last_login_days} days and their usage has ${customer.usage_trend}. This significant drop in engagement combined with their inactivity suggests they may be considering churning.`;
  }

  if (customer.risk_level === "MEDIUM") {
    return `${customer.name} needs attention. Their usage has ${customer.usage_trend} and they are experiencing: ${customer.issue_type.replace(/_/g, " ")}. While not critical, addressing this issue promptly can prevent further disengagement.`;
  }

  return `${customer.name} is currently healthy with stable engagement and no major churn signals. Consider sending engagement tips to increase usage further.`;
};

/**
 * Format issue type for display
 */
export const formatIssueType = (issueType: string): string => {
  const issueMap: Record<string, string> = {
    low_usage: "Low Usage",
    feature_confusion: "Feature Confusion",
    pricing: "Pricing Concern",
    technical_issue: "Technical Issue",
    none: "No Major Issue",
  };
  return issueMap[issueType] || issueType;
};

/**
 * Filter customers based on search and filters
 */
export const filterCustomers = (
  customers: Customer[],
  searchTerm: string,
  riskFilter: string,
  issueFilter: string,
): Customer[] => {
  return customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk =
      riskFilter === "ALL" || customer.risk_level === riskFilter;
    const matchesIssue =
      issueFilter === "ALL" || customer.issue_type === issueFilter;

    return matchesSearch && matchesRisk && matchesIssue;
  });
};
