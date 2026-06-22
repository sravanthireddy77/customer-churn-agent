import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ClipboardPlus,
  Eye,
  FileCheck2,
  MailPlus,
  MessageSquareText,
  Play,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wand2,
  Zap,
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

const workflowSteps = [
  { id: 1, label: 'Segment' },
  { id: 2, label: 'Trigger' },
  { id: 3, label: 'Offer' },
  { id: 4, label: 'Message' },
  { id: 5, label: 'Approval' },
];

function actionTone(status: string) {
  if (status === 'completed' || status === 'queued') return 'text-emerald-700 bg-emerald-50 ring-emerald-200 dark:text-emerald-200 dark:bg-emerald-900 dark:ring-emerald-700';
  if (status === 'simulated') return 'text-cyan-700 bg-cyan-50 ring-cyan-200 dark:text-cyan-200 dark:bg-cyan-900 dark:ring-cyan-700';
  return 'text-slate-600 bg-slate-50 ring-slate-200 dark:text-slate-200 dark:bg-slate-700 dark:ring-slate-600';
}

function campaignLabel(value: string) {
  return campaignTypes.find((type) => type.value === value)?.label ?? value;
}

function buildOfferPackage(domain: Domain | 'all', campaignType: string, createTasks: boolean, triggerCampaigns: boolean) {
  const base =
    domain === 'Banking'
      ? ['6-month fee review', 'relationship manager callback', 'priority complaint closure']
      : domain === 'Telecom'
        ? ['network diagnostics slot', 'temporary bill credit', 'priority service callback']
        : domain === 'SaaS'
          ? ['success enablement session', 'adoption review', 'plan optimization offer']
          : ['targeted retention offer', 'success manager callback', 'priority support review'];

  if (triggerCampaigns) {
    base.push(campaignLabel(campaignType).toLowerCase());
  }

  if (createTasks) {
    base.push('follow-up task queue');
  }

  return base.slice(0, 5);
}

function buildMessageDraft(variant: number, customerName: string, offerPackage: string[]) {
  const firstOffer = offerPackage[0] ?? 'a targeted rescue package';
  const secondOffer = offerPackage[1] ?? 'priority support';

  if (variant === 1) {
    return {
      label: 'Email draft',
      subject: "We're here to help",
      body: `Hi ${customerName},\nwe noticed recent friction in your experience and want to resolve it quickly. Your rescue package includes ${firstOffer} and ${secondOffer}.\n\nReply here and the retention team will pick this up today.`,
    };
  }

  if (variant === 2) {
    return {
      label: 'Manager note',
      subject: 'Priority rescue callback',
      body: `${customerName} is ready for white-glove outreach. Lead with empathy, acknowledge the churn signal, and offer ${firstOffer} before asking for a callback window.`,
    };
  }

  return {
    label: 'SMS draft',
    subject: 'Quick support check-in',
    body: `Hi ${customerName}, we prepared ${firstOffer} for your account. Can our retention team contact you today to close this out?`,
  };
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
  const [searchTerm, setSearchTerm] = useState('');
  const [region, setRegion] = useState('India');
  const [activeStep, setActiveStep] = useState(3);
  const [messageVariant, setMessageVariant] = useState(1);
  const [approvalSubmitted, setApprovalSubmitted] = useState(false);
  const [previewAudience, setPreviewAudience] = useState(false);
  const [result, setResult] = useState<AgentRunResponse | null>(null);

  const customers = customersQuery.data ?? [];
  const scopedCustomers = useMemo(
    () => customers.filter((customer) => domain === 'all' || customer.domain === domain),
    [customers, domain],
  );
  const visibleCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return scopedCustomers;

    return scopedCustomers.filter((customer) =>
      [
        customer.customer_id,
        customer.name,
        customer.domain,
        customer.plan ?? '',
        customer.sentiment ?? '',
        customer.recent_usage ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [scopedCustomers, searchTerm]);
  const selectedCustomers = customers.filter((customer) => selectedIds.includes(customer.customer_id));
  const previewCustomer = selectedCustomers[0] ?? visibleCustomers[0] ?? scopedCustomers[0] ?? customers[0];
  const offerPackage = useMemo(
    () => buildOfferPackage(domain, campaignType, createTasks, triggerCampaigns),
    [campaignType, createTasks, domain, triggerCampaigns],
  );
  const messageDraft = buildMessageDraft(messageVariant, previewCustomer?.name ?? '{{customer_name}}', offerPackage);
  const audienceCount = selectedIds.length || Math.min(scopedCustomers.length, maxCustomers);
  const saveImpact = includeLowRisk
    ? { label: 'Balanced', width: '58%' }
    : selectedIds.length > 0 || domain !== 'all'
      ? { label: 'High', width: '78%' }
      : { label: 'Strong', width: '70%' };

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
    setActiveStep(5);
    showToast('Agent run completed');
  };

  const clearAgentQuery = () => {
    setGoal(defaultGoal);
    setDomain('all');
    setMaxCustomers(10);
    setSelectedIds([]);
    setCreateTasks(true);
    setTriggerCampaigns(false);
    setIncludeLowRisk(false);
    setCampaignType('retention_email');
    setSearchTerm('');
    setRegion('India');
    setActiveStep(3);
    setMessageVariant(1);
    setApprovalSubmitted(false);
    setPreviewAudience(false);
    setResult(null);
    showToast('Agent query cleared');
  };

  const submitApproval = () => {
    setApprovalSubmitted(true);
    setActiveStep(5);
    showToast('Campaign approval submitted');
  };

  const generateVariant = () => {
    setMessageVariant((current) => (current === 3 ? 1 : current + 1));
    setActiveStep(4);
    showToast('Message variant generated');
  };

  const selectVisibleCustomers = () => {
    setSelectedIds(visibleCustomers.slice(0, maxCustomers).map((customer) => customer.customer_id));
    setActiveStep(1);
  };

  if (customersQuery.isLoading) {
    return <LoadingState label="Loading agent workspace" />;
  }

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={submit}>
        <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="agent-pill bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900">
              <Bot className="h-3.5 w-3.5" />
              ChurnRescueAgent
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-normal text-slate-950 dark:text-slate-50">
              Rescue Campaign Builder
            </h1>
            <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">
              Create targeted retention journeys with AI-generated offers, tasks, outreach, and approval routing.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <label className="relative min-w-0 flex-1 xl:w-72">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                className="field rounded-full py-3 pl-11"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search customer / segment"
              />
            </label>
            <button className="btn-primary rounded-full px-5" disabled={runAgent.isPending || goal.trim().length < 5}>
              <Play className="h-4 w-4" />
              Run Rescue
            </button>
          </div>
        </section>

        <section className="flex gap-3 overflow-x-auto pb-1">
          {workflowSteps.map((step) => {
            const isActive = step.id === activeStep;
            const isComplete = step.id < activeStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`inline-flex min-w-36 shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-black transition ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : isComplete
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-300 text-white dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {step.id} {step.label}
              </button>
            );
          })}
        </section>

        <div className="grid gap-6 min-[1400px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(0,0.9fr)]">
          <section className="panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">Audience</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {audienceCount} customers queued from {scopedCustomers.length} in scope
                </p>
              </div>
              <span className="agent-pill bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950 dark:text-cyan-200 dark:ring-cyan-900">
                <Users className="h-3.5 w-3.5" />
                Live
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Industry segment
                <select className="field mt-2" value={domain} onChange={(event) => setDomain(event.target.value as Domain | 'all')}>
                  <option value="all">All industries</option>
                  <option value="Telecom">Telecom customers</option>
                  <option value="Banking">Banking customers</option>
                  <option value="SaaS">SaaS customers</option>
                </select>
              </label>
              <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Risk level
                <select
                  className="field mt-2"
                  value={includeLowRisk ? 'all' : 'at_risk'}
                  onChange={(event) => setIncludeLowRisk(event.target.value === 'all')}
                >
                  <option value="at_risk">High and critical</option>
                  <option value="all">Include low risk</option>
                </select>
              </label>
              <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Customer cap
                <input
                  className="field mt-2"
                  type="number"
                  min={1}
                  max={100}
                  value={maxCustomers}
                  onChange={(event) => setMaxCustomers(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
                />
              </label>
              <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Region
                <input className="field mt-2" value={region} onChange={(event) => setRegion(event.target.value)} />
              </label>
              <label className="sm:col-span-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                Channel
                <select className="field mt-2" value={campaignType} onChange={(event) => setCampaignType(event.target.value)}>
                  {campaignTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-5 block text-sm font-bold text-slate-600 dark:text-slate-300">
              Agent goal
              <textarea
                className="field mt-2 min-h-28"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Describe the rescue campaign objective."
              />
            </label>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-2">
                  <ClipboardPlus className="h-4 w-4 text-blue-600" />
                  Tasks
                </span>
                <input type="checkbox" checked={createTasks} onChange={(event) => setCreateTasks(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-2">
                  <MailPlus className="h-4 w-4 text-blue-600" />
                  Outreach
                </span>
                <input type="checkbox" checked={triggerCampaigns} onChange={(event) => setTriggerCampaigns(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Low risk
                </span>
                <input type="checkbox" checked={includeLowRisk} onChange={(event) => setIncludeLowRisk(event.target.checked)} />
              </label>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="agent-label">Customer scope</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {selectedIds.length ? `${selectedIds.length} selected` : 'Using automatic segment'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary px-3 py-2" onClick={() => setSelectedIds([])}>
                    Use all
                  </button>
                  <button type="button" className="btn-primary px-3 py-2" onClick={selectVisibleCustomers}>
                    Select visible
                  </button>
                  <button type="button" className="btn-secondary px-3 py-2" onClick={clearAgentQuery} disabled={runAgent.isPending}>
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
                {visibleCustomers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No customers match this segment.
                  </div>
                ) : (
                  visibleCustomers.map((customer) => (
                    <label
                      key={customer.customer_id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
                    >
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={selectedIds.includes(customer.customer_id)}
                        onChange={() => toggleCustomer(customer.customer_id)}
                      />
                      <span
                        aria-hidden="true"
                        className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-400 bg-white text-transparent transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-200 dark:border-slate-400 dark:bg-white"
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-950 dark:text-slate-50">{customer.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {customer.customer_id} / {customer.domain} / {customer.plan ?? 'No plan'}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">AI Recommended Offer</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {domain === 'all' ? 'Cross-domain rescue package' : `${domain} rescue package`}
                </p>
              </div>
              <span className="agent-pill bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950 dark:text-orange-200 dark:ring-orange-900">
                <Zap className="h-3.5 w-3.5" />
                Offer
              </span>
            </div>

            <div className="mt-7">
              <p className="agent-label">Offer package</p>
              <ul className="mt-3 space-y-2 text-lg font-semibold leading-6 text-slate-950 dark:text-slate-50">
                {offerPackage.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-blue-600">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <p className="agent-label">Expected save impact</p>
                <span className="text-sm font-black text-emerald-600">{saveImpact.label}</span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-3 rounded-full bg-emerald-500" style={{ width: saveImpact.width }} />
              </div>
            </div>

            <div className="mt-8">
              <p className="agent-label">Compliance</p>
              <span
                className={`mt-3 inline-flex rounded-full px-4 py-2 text-sm font-black ${
                  approvalSubmitted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-orange-500 text-white'
                }`}
              >
                {approvalSubmitted ? 'Submitted' : 'Needs approval'}
              </span>
            </div>

            <div className="mt-8 space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                  <Target className="h-4 w-4 text-blue-600" />
                  Segment
                </span>
                <span className="text-right text-slate-500 dark:text-slate-400">
                  {domain === 'all' ? 'All industries' : domain} / {region || 'Global'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                  <Send className="h-4 w-4 text-blue-600" />
                  Channel
                </span>
                <span className="text-right text-slate-500 dark:text-slate-400">{campaignLabel(campaignType)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                  <FileCheck2 className="h-4 w-4 text-blue-600" />
                  Work queue
                </span>
                <span className="text-right text-slate-500 dark:text-slate-400">{createTasks ? 'Tasks on' : 'Monitor only'}</span>
              </div>
            </div>
          </section>

          <section className="panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">Message Preview</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{previewCustomer?.customer_id ?? 'No audience selected'}</p>
              </div>
              <span className="agent-pill bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-900">
                <MessageSquareText className="h-3.5 w-3.5" />
                v{messageVariant}
              </span>
            </div>

            <div className="mt-7 min-h-72 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-black text-blue-600">{messageDraft.label}</p>
              <p className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Subject: {messageDraft.subject}
              </p>
              <p className="mt-5 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-300">{messageDraft.body}</p>
            </div>

            {previewAudience && (
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
                <p className="text-xs font-black uppercase tracking-normal text-blue-700 dark:text-blue-200">Audience preview</p>
                <div className="mt-3 space-y-2">
                  {(selectedCustomers.length ? selectedCustomers : visibleCustomers.slice(0, 3)).slice(0, 3).map((customer) => (
                    <div key={customer.customer_id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{customer.name}</span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{customer.customer_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <button type="button" className="btn-tertiary" onClick={generateVariant}>
                <Wand2 className="h-4 w-4" />
                Generate Variants
              </button>
              <button type="button" className="btn-secondary" onClick={() => setPreviewAudience((current) => !current)}>
                <Eye className="h-4 w-4" />
                Preview Audience
              </button>
              <button type="button" className="btn-primary" onClick={submitApproval}>
                <ShieldCheck className="h-4 w-4" />
                Submit Approval
              </button>
            </div>
          </section>
        </div>
      </form>

      {runAgent.isPending && (
        <section className="panel p-5">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <Sparkles className="h-5 w-5 animate-pulse text-blue-700" />
            Agent is inspecting signals, scoring churn risk, and preparing actions.
          </div>
        </section>
      )}

      {result ? (
        <AgentRunResult result={result} />
      ) : (
        <section className="panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-cyan-300 dark:bg-slate-800">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-slate-50">Agent run console</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Awaiting rescue execution.</p>
              </div>
            </div>
            <span className="agent-pill bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              {audienceCount} queued
            </span>
          </div>
        </section>
      )}
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
