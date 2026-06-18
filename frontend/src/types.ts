export type Domain = 'Telecom' | 'Banking' | 'SaaS';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type TaskStatus = 'open' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Customer {
  id: number;
  customer_id: string;
  name: string;
  domain: Domain;
  plan?: string | null;
  tenure_months?: number | null;
  recent_usage?: string | null;
  sentiment?: string | null;
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
  follow_up_task: string | null;
}

export interface ChurnAnalysisRecord extends ChurnAnalysis {
  id: number;
  created_at: string;
}

export interface Task {
  id: number;
  task_id: string;
  customer_id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  due_date?: string | null;
  status: TaskStatus;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignEvent {
  id: number;
  customer_id: string;
  campaign_type: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface AgentRunRequest {
  goal: string;
  domain?: Domain | null;
  customer_ids?: string[] | null;
  max_customers: number;
  create_tasks: boolean;
  trigger_campaigns: boolean;
  campaign_type: string;
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
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  analysis: ChurnAnalysis;
  action_summary: string;
}

export interface AgentRunResponse {
  run_id: string;
  status: 'completed';
  goal: string;
  reasoning_trace: string[];
  customer_outcomes: AgentCustomerOutcome[];
  actions: AgentAction[];
  created_tasks: Task[];
  campaign_events: CampaignEvent[];
  summary: string;
  next_steps: string[];
}
