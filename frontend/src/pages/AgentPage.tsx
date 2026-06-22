import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ClipboardPlus,
  MailPlus,
  Play,
  RadioTower,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { useCustomers, useRunAgent } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { RiskBadge } from '../components/RiskBadge';
import { useToast } from '../components/ToastProvider';
import { AgentRunResponse, Domain } from '../types';
import { formatPercent, riskBar } from '../utils/risk';

const defaultGoal =
  'Find customers most likely to churn, explain the signals, recommend rescue actions, and prepare follow-up work for the retention team.';

const campaignTypes = [
  { value: 'retention_email', label: 'Retention email' },
  { value: 'crm_task', label: 'CRM task' },
  { value: 'notify_account_manager', label: 'Notify manager' },
  { value: 'schedule_callback', label: 'Schedule callback' },
  { value: 'win_back_campaign', label: 'Win-back campaign' },
];

function actionTone(status: string) {
  if (status === 'completed' || status === 'queued') return 'text-emerald-700 bg-emerald-50 ring-emerald-200 dark:text-emerald-200 dark:bg-emerald-900 dark:ring-emerald-700';
  if (status === 'simulated') return 'text-cyan-700 bg-cyan-50 ring-cyan-200 dark:text-cyan-200 dark:bg-cyan-900 dark:ring-cyan-700';
  return 'text-slate-600 bg-slate-50 ring-slate-200 dark:text-slate-200 dark:bg-slate-700 dark:ring-slate-600';
}

export function AgentPage() {
  const { showToast } = useToast();
  const customersQuery = useCustomers();
  const runAgent = useRunAgent();
  const [goal, setGoal] = useState(defaultGoal);
  const [domain, setDomain] = useState<Domain | 'all'>('all');
  const [maxCustomers, setMaxCustomers] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createTasks, setCreateTasks] = useState(true);
  const [triggerCampaigns, setTriggerCampaigns] = useState(false);
  const [includeLowRisk, setIncludeLowRisk] = useState(false);
  const [campaignType, setCampaignType] = useState('retention_email');
  const [result, setResult] = useState<AgentRunResponse | null>(null);

  const customers = customersQuery.data ?? [];
  const scopedCustomers = useMemo(
    () => customers.filter((customer) => domain === 'all' || customer.domain === domain),
    [customers, domain],
  );

  const toggleCustomer = (customerId: string) => {
    setSelectedIds((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId],
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await runAgent.mutateAsync({
      goal,
      domain: domain === 'all' ? null : domain,
      customer_ids: selectedIds.length ? selectedIds : null,
      max_customers: maxCustomers,
      create_tasks: createTasks,
      trigger_campaigns: triggerCampaigns,
      campaign_type: campaignType,
      assigned_to: 'Retention Team',
      include_low_risk: includeLowRisk,
    });
    setResult(response);
    showToast('Agent run completed');
  };

  const clearAgentQuery = () => {
    setGoal('');
    setDomain('all');
    setMaxCustomers(10);
    setSelectedIds([]);
    setCreateTasks(true);
    setTriggerCampaigns(false);
    setIncludeLowRisk(false);
    setCampaignType('retention_email');
    setResult(null);
    showToast('Agent query cleared');
  };

  if (customersQuery.isLoading) {
    return <LoadingState label="Loading agent workspace" />;
  }

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border-b border-slate-200 p-6 xl:border-b-0 xl:border-r dark:border-slate-700">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 ring-1 ring-cyan-200 dark:bg-cyan-900 dark:text-cyan-100 dark:ring-cyan-700">
                  <Bot className="h-3.5 w-3.5" />
                  ChurnRescueAgent
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-normal text-slate-950 dark:text-slate-50">
                  AI agent command center
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                  Give the agent a retention goal. It will inspect customer signals, reason through churn risk,
                  rank accounts, and prepare the next-best actions.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                <RadioTower className="h-4 w-4 text-cyan-700" />
                Live API orchestration
              </div>
            </div>

            <form className="mt-6 space-y-5" onSubmit={submit}>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Agent goal
                <textarea
                  className="field mt-2 min-h-28"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="Describe what you want the churn rescue agent to do."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Domain scope
                  <select className="field mt-2" value={domain} onChange={(event) => setDomain(event.target.value as Domain | 'all')}>
                    <option value="all">All domains</option>
                    <option value="Telecom">Telecom</option>
                    <option value="Banking">Banking</option>
                    <option value="SaaS">SaaS</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Max customers
                  <input
                    className="field mt-2"
                    type="number"
                    min={1}
                    max={100}
                    value={maxCustomers}
                    onChange={(event) => setMaxCustomers(Number(event.target.value))}
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Outreach simulation
                  <select className="field mt-2" value={campaignType} onChange={(event) => setCampaignType(event.target.value)}>
                    {campaignTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-2">
                    <ClipboardPlus className="h-4 w-4 text-cyan-700" />
                    Create tasks
                  </span>
                  <input type="checkbox" checked={createTasks} onChange={(event) => setCreateTasks(event.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-2">
                    <MailPlus className="h-4 w-4 text-cyan-700" />
                    Trigger outreach
                  </span>
                  <input type="checkbox" checked={triggerCampaigns} onChange={(event) => setTriggerCampaigns(event.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-700" />
                    Include low risk
                  </span>
                  <input type="checkbox" checked={includeLowRisk} onChange={(event) => setIncludeLowRisk(event.target.checked)} />
                </label>
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedIds.length ? `${selectedIds.length} customers selected` : `${scopedCustomers.length} customers in scope`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={clearAgentQuery} disabled={runAgent.isPending}>
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </button>
                  <button className="btn-primary" disabled={runAgent.isPending || goal.trim().length < 5}>
                    <Play className="h-4 w-4" />
                    Run rescue agent
                  </button>
                </div>
              </div>
            </form>
          </div>

          <aside className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-950 dark:text-slate-50">Customer scope</h2>
              <button className="text-xs font-semibold text-cyan-800 dark:text-cyan-300" onClick={() => setSelectedIds([])}>
                Use all
              </button>
            </div>
            <div className="mt-4 max-h-[520px] space-y-2 overflow-auto pr-1">
              {scopedCustomers.map((customer) => (
                <label
                  key={customer.customer_id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={selectedIds.includes(customer.customer_id)}
                    onChange={() => toggleCustomer(customer.customer_id)}
                  />
                  <span
                    aria-hidden="true"
                    className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-400 bg-white text-transparent transition peer-checked:border-cyan-600 peer-checked:bg-cyan-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-200 dark:border-slate-400 dark:bg-white"
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">{customer.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {customer.customer_id} / {customer.domain}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {runAgent.isPending && (
        <section className="panel p-5">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <Sparkles className="h-5 w-5 animate-pulse text-cyan-700" />
            Agent is inspecting signals, scoring churn risk, and preparing actions.
          </div>
        </section>
      )}

      {result ? <AgentRunResult result={result} /> : <EmptyState title="Run the agent to generate a rescue plan" />}
    </div>
  );
}

function AgentRunResult({ result }: { result: AgentRunResponse }) {
  return (
    <div className="space-y-6">
      <section className="panel p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-800 dark:text-cyan-200">{result.run_id}</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">Agent reasoning trace</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{result.goal}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:ring-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </span>
        </div>
        <ol className="mt-5 space-y-3">
          {result.reasoning_trace.map((step, index) => (
            <li key={`${step}-${index}`} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
                {index + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="panel p-5">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <p className="mt-3 text-2xl font-bold">{result.customer_outcomes.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Customers analyzed</p>
        </section>
        <section className="panel p-5">
          <ClipboardPlus className="h-5 w-5 text-cyan-700" />
          <p className="mt-3 text-2xl font-bold">{result.created_tasks.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tasks created</p>
        </section>
        <section className="panel p-5">
          <MailPlus className="h-5 w-5 text-cyan-700" />
          <p className="mt-3 text-2xl font-bold">{result.campaign_events.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Outreach events</p>
        </section>
      </div>

      <DomainRiskMap summaries={result.domain_risk_summary} />

      <section className="panel p-5">
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">Conclusion</h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{result.summary}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {result.next_steps.map((step) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">Customer rescue plans</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reasoning appears before root cause and recommended intervention.</p>
        </div>
        {result.customer_outcomes.map((outcome) => (
          <article key={outcome.customer_id} className="panel p-5">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
              <div>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{outcome.customer_id}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">{outcome.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{outcome.domain}</p>
              </div>
              <RiskBadge score={outcome.analysis.churn_score} />
            </div>

            <div className="mt-5 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={`h-2 rounded-full ${riskBar(outcome.analysis.churn_score)}`}
                style={{ width: formatPercent(outcome.analysis.churn_score) }}
              />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reasoning</h4>
                <ol className="mt-3 space-y-2">
                  {outcome.analysis.reasoning.map((reason, index) => (
                    <li key={`${reason}-${index}`} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {index + 1}
                      </span>
                      {reason}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Root cause</h4>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{outcome.analysis.root_cause}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recommended intervention</h4>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{outcome.analysis.recommended_intervention}</p>
                </div>
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900 dark:border-cyan-700 dark:bg-cyan-900 dark:text-cyan-100">
                  {outcome.action_summary}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-5 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">Agent action ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-900">
              {result.actions.map((action, index) => (
                <tr key={`${action.customer_id}-${action.action_type}-${index}`} className="text-sm">
                  <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{action.customer_id}</td>
                  <td className="px-5 py-4 capitalize text-slate-700 dark:text-slate-300">{action.action_type.replace('_', ' ')}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${actionTone(action.status)}`}>
                      {action.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{action.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DomainRiskMap({ summaries }: { summaries: AgentRunResponse['domain_risk_summary'] }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">At-risk users by domain</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          High and critical churn scores are grouped so each domain owner can act on the right accounts.
        </p>
      </div>

      {summaries.length ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {summaries.map((summary) => (
            <article key={summary.domain} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-slate-50">{summary.domain}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {summary.at_risk_count} of {summary.customers_analyzed} users at risk
                  </p>
                </div>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:ring-orange-700">
                  {summary.critical_count} critical / {summary.high_count} high
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Average churn score</span>
                  <span>{formatPercent(summary.average_churn_score)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className={`h-2 rounded-full ${riskBar(summary.average_churn_score)}`}
                    style={{ width: formatPercent(summary.average_churn_score) }}
                  />
                </div>
              </div>

              {summary.top_risk_customer ? (
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                    Highest risk
                  </p>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {summary.top_risk_customer.name}
                      </p>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {summary.top_risk_customer.customer_id}
                      </p>
                    </div>
                    <RiskBadge score={summary.top_risk_customer.churn_score} />
                  </div>
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                    {summary.top_risk_customer.root_cause}
                  </p>
                </div>
              ) : (
                <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No high or critical at-risk users identified in this domain.
                </p>
              )}

              {summary.at_risk_customers.length > 1 && (
                <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                    Additional at-risk users
                  </p>
                  {summary.at_risk_customers.slice(1).map((customer) => (
                    <div key={customer.customer_id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{customer.name}</p>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{customer.customer_id}</p>
                      </div>
                      <RiskBadge score={customer.churn_score} />
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No domain risk summary available" />
      )}
    </section>
  );
}
