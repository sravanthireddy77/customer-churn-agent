import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
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
  if (status === 'completed' || status === 'queued') return 'text-emerald-700 bg-emerald-50 ring-emerald-200';
  if (status === 'simulated') return 'text-cyan-700 bg-cyan-50 ring-cyan-200';
  return 'text-slate-600 bg-slate-50 ring-slate-200';
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
          <div className="border-b border-slate-200 p-6 xl:border-b-0 xl:border-r">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 ring-1 ring-cyan-200">
                  <Bot className="h-3.5 w-3.5" />
                  ChurnRescueAgent
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-normal text-slate-950">
                  AI agent command center
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Give the agent a retention goal. It will inspect customer signals, reason through churn risk,
                  rank accounts, and prepare the next-best actions.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <RadioTower className="h-4 w-4 text-cyan-700" />
                Live API orchestration
              </div>
            </div>

            <form className="mt-6 space-y-5" onSubmit={submit}>
              <label className="block text-sm font-semibold text-slate-700">
                Agent goal
                <textarea
                  className="field mt-2 min-h-28"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="Describe what you want the churn rescue agent to do."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700">
                  Domain scope
                  <select className="field mt-2" value={domain} onChange={(event) => setDomain(event.target.value as Domain | 'all')}>
                    <option value="all">All domains</option>
                    <option value="Telecom">Telecom</option>
                    <option value="Banking">Banking</option>
                    <option value="SaaS">SaaS</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
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
                <label className="text-sm font-semibold text-slate-700">
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
                <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <ClipboardPlus className="h-4 w-4 text-cyan-700" />
                    Create tasks
                  </span>
                  <input type="checkbox" checked={createTasks} onChange={(event) => setCreateTasks(event.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <MailPlus className="h-4 w-4 text-cyan-700" />
                    Trigger outreach
                  </span>
                  <input type="checkbox" checked={triggerCampaigns} onChange={(event) => setTriggerCampaigns(event.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-700" />
                    Include low risk
                  </span>
                  <input type="checkbox" checked={includeLowRisk} onChange={(event) => setIncludeLowRisk(event.target.checked)} />
                </label>
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-500">
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
              <h2 className="text-sm font-semibold text-slate-950">Customer scope</h2>
              <button className="text-xs font-semibold text-cyan-800" onClick={() => setSelectedIds([])}>
                Use all
              </button>
            </div>
            <div className="mt-4 max-h-[520px] space-y-2 overflow-auto pr-1">
              {scopedCustomers.map((customer) => (
                <label
                  key={customer.customer_id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedIds.includes(customer.customer_id)}
                    onChange={() => toggleCustomer(customer.customer_id)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{customer.name}</span>
                    <span className="text-xs text-slate-500">
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
          <div className="flex items-center gap-3 text-sm text-slate-600">
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
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-800">{result.run_id}</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">Agent reasoning trace</h2>
            <p className="mt-2 text-sm text-slate-600">{result.goal}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </span>
        </div>
        <ol className="mt-5 space-y-3">
          {result.reasoning_trace.map((step, index) => (
            <li key={`${step}-${index}`} className="flex gap-3 text-sm text-slate-700">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-800">
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
          <p className="text-sm text-slate-500">Customers analyzed</p>
        </section>
        <section className="panel p-5">
          <ClipboardPlus className="h-5 w-5 text-cyan-700" />
          <p className="mt-3 text-2xl font-bold">{result.created_tasks.length}</p>
          <p className="text-sm text-slate-500">Tasks created</p>
        </section>
        <section className="panel p-5">
          <MailPlus className="h-5 w-5 text-cyan-700" />
          <p className="mt-3 text-2xl font-bold">{result.campaign_events.length}</p>
          <p className="text-sm text-slate-500">Outreach events</p>
        </section>
      </div>

      <section className="panel p-5">
        <h2 className="text-lg font-bold text-slate-950">Conclusion</h2>
        <p className="mt-2 text-sm text-slate-700">{result.summary}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {result.next_steps.map((step) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Customer rescue plans</h2>
          <p className="mt-1 text-sm text-slate-500">Reasoning appears before root cause and recommended intervention.</p>
        </div>
        {result.customer_outcomes.map((outcome) => (
          <article key={outcome.customer_id} className="panel p-5">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
              <div>
                <p className="font-mono text-xs text-slate-500">{outcome.customer_id}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">{outcome.name}</h3>
                <p className="text-sm text-slate-500">{outcome.domain}</p>
              </div>
              <RiskBadge score={outcome.analysis.churn_score} />
            </div>

            <div className="mt-5 h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${riskBar(outcome.analysis.churn_score)}`}
                style={{ width: formatPercent(outcome.analysis.churn_score) }}
              />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Reasoning</h4>
                <ol className="mt-3 space-y-2">
                  {outcome.analysis.reasoning.map((reason, index) => (
                    <li key={`${reason}-${index}`} className="flex gap-3 text-sm text-slate-700">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {index + 1}
                      </span>
                      {reason}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Root cause</h4>
                  <p className="mt-2 text-sm text-slate-700">{outcome.analysis.root_cause}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Recommended intervention</h4>
                  <p className="mt-2 text-sm text-slate-700">{outcome.analysis.recommended_intervention}</p>
                </div>
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                  {outcome.action_summary}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-950">Agent action ledger</h2>
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
            <tbody className="divide-y divide-slate-100 bg-white">
              {result.actions.map((action, index) => (
                <tr key={`${action.customer_id}-${action.action_type}-${index}`} className="text-sm">
                  <td className="px-5 py-4 font-mono text-xs text-slate-600">{action.customer_id}</td>
                  <td className="px-5 py-4 capitalize text-slate-700">{action.action_type.replace('_', ' ')}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${actionTone(action.status)}`}>
                      {action.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{action.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
