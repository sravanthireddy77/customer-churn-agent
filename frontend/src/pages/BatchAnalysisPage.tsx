import { ChangeEvent, useMemo, useState } from 'react';
import { FileUp, Layers3, Play } from 'lucide-react';

import { useAnalyzeBatch } from '../api/hooks';
import { RiskBadge } from '../components/RiskBadge';
import { useToast } from '../components/ToastProvider';
import { ChurnAnalysis, CustomerSignalInput, Domain } from '../types';

const sampleRecords: CustomerSignalInput[] = [
  {
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
  },
  {
    customer_id: 'BNK-4412B',
    name: 'Avery Morgan',
    domain: 'Banking',
    recent_usage: 'Card transactions down 60% over 2 months',
    complaints: ['Monthly maintenance fees too high'],
    billing_issues: ['Unexpected overdraft fee'],
    sentiment: 'Frustrated after branch visit',
    support_history: ['2 calls and 1 branch complaint'],
    plan: 'Premium Checking',
    tenure_months: 42,
  },
  {
    customer_id: 'SAA-9031C',
    name: 'BrightOps Inc.',
    domain: 'SaaS',
    recent_usage: 'Weekly active users down 55% in 90 days',
    complaints: ['Missing reporting feature', 'Slow support response'],
    billing_issues: [],
    sentiment: 'Neutral to negative in QBR',
    support_history: ['4 unresolved tickets'],
    plan: 'Enterprise',
    tenure_months: 27,
  },
];

function splitList(value?: string) {
  return (value ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsv(text: string): CustomerSignalInput[] {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map((header) => header.trim());
  return lines
    .filter(Boolean)
    .map((line) => {
      const values = line.split(',').map((value) => value.trim());
      const row = headers.reduce<Record<string, string>>((acc, header, index) => {
        acc[header] = values[index] ?? '';
        return acc;
      }, {});
      return {
        customer_id: row.customer_id,
        name: row.name,
        domain: (row.domain || 'SaaS') as Domain,
        recent_usage: row.recent_usage,
        complaints: splitList(row.complaints),
        billing_issues: splitList(row.billing_issues),
        sentiment: row.sentiment,
        support_history: splitList(row.support_history),
        plan: row.plan,
        tenure_months: Number(row.tenure_months) || 0,
        metadata: {},
      };
    });
}

export function BatchAnalysisPage() {
  const { showToast } = useToast();
  const analyzeBatch = useAnalyzeBatch();
  const [records, setRecords] = useState<CustomerSignalInput[]>(sampleRecords);
  const [results, setResults] = useState<ChurnAnalysis[]>([]);

  const rows = useMemo(() => records, [records]);

  const uploadCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setRecords(parsed);
    showToast(`${parsed.length} records loaded`);
  };

  const runBatch = async () => {
    const analyses = await analyzeBatch.mutateAsync(records);
    setResults(analyses);
    showToast('Batch analysis completed');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950">Batch Analysis</h1>
          <p className="mt-1 text-sm text-slate-500">Run churn analysis across selected customer records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn-secondary cursor-pointer">
            <FileUp className="h-4 w-4" />
            Upload CSV
            <input className="sr-only" type="file" accept=".csv" onChange={uploadCsv} />
          </label>
          <button className="btn-secondary" onClick={() => setRecords(sampleRecords)}>
            <Layers3 className="h-4 w-4" />
            Use samples
          </button>
          <button className="btn-primary" onClick={runBatch} disabled={analyzeBatch.isPending || rows.length === 0}>
            <Play className="h-4 w-4" />
            Run batch
          </button>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-950">Selected Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Domain</th>
                <th className="px-5 py-3">Usage</th>
                <th className="px-5 py-3">Sentiment</th>
                <th className="px-5 py-3">Signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((record) => (
                <tr key={record.customer_id} className="text-sm">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{record.name}</p>
                    <p className="font-mono text-xs text-slate-500">{record.customer_id}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{record.domain}</td>
                  <td className="max-w-sm px-5 py-4 text-slate-600">{record.recent_usage}</td>
                  <td className="px-5 py-4 text-slate-600">{record.sentiment}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {record.complaints.length + record.billing_issues.length + record.support_history.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-950">Batch Results</h2>
        </div>
        {results.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No results yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Risk</th>
                  <th className="px-5 py-3">Reasoning</th>
                  <th className="px-5 py-3">Root cause</th>
                  <th className="px-5 py-3">Recommended action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {results.map((result) => (
                  <tr key={result.customer_id} className="align-top text-sm">
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{result.customer_id}</td>
                    <td className="px-5 py-4">
                      <RiskBadge score={result.churn_score} />
                    </td>
                    <td className="max-w-md px-5 py-4 text-slate-600">{result.reasoning.join(' ')}</td>
                    <td className="max-w-xs px-5 py-4 text-slate-700">{result.root_cause}</td>
                    <td className="max-w-md px-5 py-4 text-slate-600">{result.recommended_intervention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
