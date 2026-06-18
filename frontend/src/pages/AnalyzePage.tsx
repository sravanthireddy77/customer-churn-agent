import { FormEvent, useState } from 'react';
import { Braces, Sparkles } from 'lucide-react';

import { useAnalyzeCustomer } from '../api/hooks';
import { RiskBadge } from '../components/RiskBadge';
import { useToast } from '../components/ToastProvider';
import { ChurnAnalysis, CustomerSignalInput, Domain } from '../types';

const sample: CustomerSignalInput = {
  customer_id: 'TEL-7824A',
  name: 'Jordan Lee',
  domain: 'Telecom',
  recent_usage: 'down 45% in past 3 months',
  complaints: ['Slow data speeds', 'Dropped calls'],
  billing_issues: ['Overcharged $30 last cycle'],
  sentiment: 'Negative in last support call',
  support_history: ['3 calls in 2 months'],
  plan: 'Unlimited 5G',
  tenure_months: 18,
  metadata: {},
};

function toLines(items: string[]) {
  return items.join('\n');
}

function fromLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AnalyzePage() {
  const { showToast } = useToast();
  const analyzeMutation = useAnalyzeCustomer();
  const [result, setResult] = useState<ChurnAnalysis | null>(null);
  const [form, setForm] = useState({
    ...sample,
    complaints: toLines(sample.complaints),
    billing_issues: toLines(sample.billing_issues),
    support_history: toLines(sample.support_history),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload: CustomerSignalInput = {
      customer_id: form.customer_id,
      name: form.name,
      domain: form.domain,
      recent_usage: form.recent_usage,
      complaints: fromLines(form.complaints),
      billing_issues: fromLines(form.billing_issues),
      sentiment: form.sentiment,
      support_history: fromLines(form.support_history),
      plan: form.plan,
      tenure_months: Number(form.tenure_months) || 0,
      metadata: {},
    };
    const analysis = await analyzeMutation.mutateAsync(payload);
    setResult(analysis);
    showToast('Churn analysis completed');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-slate-50">Analyze Customer</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Generate score, reasoning, root cause, and next-best action.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <form className="panel grid gap-4 p-5 md:grid-cols-2" onSubmit={submit}>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Customer ID
            <input className="field mt-1" value={form.customer_id} onChange={(event) => setForm({ ...form, customer_id: event.target.value })} required />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Name
            <input className="field mt-1" value={form.name ?? ''} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Domain
            <select className="field mt-1" value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value as Domain })}>
              <option value="Telecom">Telecom</option>
              <option value="Banking">Banking</option>
              <option value="SaaS">SaaS</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Plan
            <input className="field mt-1" value={form.plan ?? ''} onChange={(event) => setForm({ ...form, plan: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Tenure months
            <input className="field mt-1" type="number" min={0} value={form.tenure_months ?? 0} onChange={(event) => setForm({ ...form, tenure_months: Number(event.target.value) })} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Sentiment
            <input className="field mt-1" value={form.sentiment ?? ''} onChange={(event) => setForm({ ...form, sentiment: event.target.value })} />
          </label>
          <label className="md:col-span-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Recent usage
            <input className="field mt-1" value={form.recent_usage ?? ''} onChange={(event) => setForm({ ...form, recent_usage: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Complaints
            <textarea className="field mt-1 min-h-28" value={form.complaints} onChange={(event) => setForm({ ...form, complaints: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Billing issues
            <textarea className="field mt-1 min-h-28" value={form.billing_issues} onChange={(event) => setForm({ ...form, billing_issues: event.target.value })} />
          </label>
          <label className="md:col-span-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Support history
            <textarea className="field mt-1 min-h-24" value={form.support_history} onChange={(event) => setForm({ ...form, support_history: event.target.value })} />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button className="btn-primary" disabled={analyzeMutation.isPending}>
              <Sparkles className="h-4 w-4" />
              Analyze churn
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Result Summary</h2>
              {result && <RiskBadge score={result.churn_score} />}
            </div>
            {result ? (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-100">Reasoning</p>
                  <ol className="mt-2 space-y-2 text-slate-600 dark:text-slate-300">
                    {result.reasoning.map((step, index) => (
                      <li key={`${step}-${index}`}>{index + 1}. {step}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-100">Root cause</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{result.root_cause}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-100">Recommended intervention</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{result.recommended_intervention}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No result yet</p>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-slate-50">
              <Braces className="h-4 w-4 text-cyan-700" />
              JSON
            </h2>
            <pre className="mt-4 max-h-[420px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
              {result ? JSON.stringify(result, null, 2) : '{}'}
            </pre>
          </section>
        </aside>
      </div>
    </div>
  );
}
