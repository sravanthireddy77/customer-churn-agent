import type { ReactNode } from 'react';

export type Domain = 'Telecom' | 'Banking' | 'SaaS';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type AgentRiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'open' | 'in_progress' | 'completed';
export type CampaignType =
  | 'retention_email'
  | 'crm_task'
  | 'notify_account_manager'
  | 'schedule_callback'
  | 'win_back_campaign';

export interface Customer {
  id: number;
  customer_id: string;
  name: string;
  domain: Domain;
  plan: string | null;
  tenure_months: number | null;
  recent_usage: string | null;
  sentiment: string | null;
  complaints: string[];
  billing_issues: string[];
  support_history: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CustomerSignalInput {
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
}

export interface ChurnAnalysis {
  customer_id: string;
  churn_score: number;
  reasoning: string[];
  root_cause: string;
  recommended_intervention: string;
  follow_up_task?: string | null;
}

export interface ChurnAnalysisRecord extends ChurnAnalysis {
  id: number;
  created_at: string;
}

export interface TaskCreate {
  customer_id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  due_date?: string | null;
  status: TaskStatus;
  assigned_to?: string | null;
}

export interface Task extends TaskCreate {
  id: number;
  task_id: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignTriggerRequest {
  customer_id: string;
  campaign_type: CampaignType | string;
  payload: Record<string, unknown>;
}

export interface CampaignEvent extends CampaignTriggerRequest {
  id: number;
  status: string;
  created_at: string;
}

export interface AgentRunRequest {
  goal: string;
  domain: Domain | null;
  customer_ids: string[] | null;
  max_customers: number;
  create_tasks: boolean;
  trigger_campaigns: boolean;
  campaign_type: CampaignType | string;
  assigned_to?: string | null;
  include_low_risk: boolean;
}

export interface AgentAction {
  action_type: 'analyze_customer' | 'create_task' | 'trigger_campaign' | 'monitor';
  customer_id: string;
  status: 'completed' | 'skipped' | 'queued' | 'simulated';
  detail: string;
}

export interface AgentCustomerOutcome {
  customer_id: string;
  name: string;
  domain: Domain;
  risk_level: AgentRiskLevel;
  analysis: ChurnAnalysis;
  action_summary: string;
}

export interface DomainRiskCustomer {
  customer_id: string;
  name: string;
  risk_level: AgentRiskLevel;
  churn_score: number;
  root_cause: string;
  recommended_intervention: string;
}

export interface DomainRiskSummary {
  domain: Domain;
  customers_analyzed: number;
  at_risk_count: number;
  critical_count: number;
  high_count: number;
  average_churn_score: number;
  top_risk_customer: DomainRiskCustomer | null;
  at_risk_customers: DomainRiskCustomer[];
}

export interface AgentRunResponse {
  run_id: string;
  status: 'completed';
  goal: string;
  reasoning_trace: string[];
  customer_outcomes: AgentCustomerOutcome[];
  domain_risk_summary: DomainRiskSummary[];
  actions: AgentAction[];
  created_tasks: Task[];
  campaign_events: CampaignEvent[];
  summary: string;
  next_steps: string[];
}

export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

export type CustomerStatus =
  | 'Pending'
  | 'Contacted'
  | 'Rescue in progress'
  | 'Rescued'
  | 'Lost'
  | 'Healthy';
export type IssueType =
  | 'low_usage'
  | 'feature_confusion'
  | 'pricing'
  | 'technical_issue'
  | 'none';
export type PlanType = 'Basic' | 'Pro' | 'Premium';
export type LegacyRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LegacyCustomer {
  id: number;
  name: string;
  email: string;
  last_login_days: number;
  usage_trend: string;
  issue_type: IssueType;
  plan_type: PlanType;
  risk_level: LegacyRiskLevel;
  suggested_action: string;
  status: CustomerStatus;
  ai_message: string;
}

export interface CustomerStats {
  total: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  pending_actions: number;
}

export interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: 'blue' | 'red' | 'amber' | 'green' | 'gray';
  percentage?: number;
  trend?: 'up' | 'down';
}

export interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

export interface StatusBadgeProps {
  status: CustomerStatus;
  size?: 'sm' | 'md' | 'lg';
}

export interface CustomerTableProps {
  data: LegacyCustomer[];
  isLoading?: boolean;
  onViewDetails: (customer: LegacyCustomer) => void;
  onMarkContacted?: (id: number) => void;
}

export interface CustomerDetailModalProps {
  customer: LegacyCustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkContacted: (id: number) => void;
  onMarkRescued: (id: number) => void;
  onMarkLost?: (id: number) => void;
}

export interface CustomerFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  riskFilter: string;
  onRiskFilterChange: (filter: string) => void;
  issueFilter: string;
  onIssueFilterChange: (filter: string) => void;
}
