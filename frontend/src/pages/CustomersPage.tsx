import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

import { useAnalyses, useCustomers } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { RiskBadge } from '../components/RiskBadge';
import { ChurnAnalysisRecord, Domain, RiskLevel } from '../types';
import { riskLevel } from '../utils/risk';

function latestByCustomer(analyses: ChurnAnalysisRecord[]) {
  return analyses.reduce<Record<string, ChurnAnalysisRecord>>((acc, analysis) => {
    if (!acc[analysis.customer_id] || new Date(analysis.created_at) > new Date(acc[analysis.customer_id].created_at)) {
      acc[analysis.customer_id] = analysis;
    }
    return acc;
  }, {});
}

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState<Domain | 'all'>('all');
  const [risk, setRisk] = useState<RiskLevel | 'all'>('all');
  const customersQuery = useCustomers();
  const analysesQuery = useAnalyses();

  const analysisMap = useMemo(() => latestByCustomer(analysesQuery.data ?? []), [analysesQuery.data]);

  const rows = useMemo(() => {
    return (customersQuery.data ?? [])
      .map((customer) => ({ customer, analysis: analysisMap[customer.customer_id] }))
      .filter(({ customer, analysis }) => {
        const matchesSearch =
          customer.name.toLowerCase().includes(search.toLowerCase()) ||
          customer.customer_id.toLowerCase().includes(search.toLowerCase());
        const matchesDomain = domain === 'all' || customer.domain === domain;
        const matchesRisk = risk === 'all' || riskLevel(analysis?.churn_score) === risk;
        return matchesSearch && matchesDomain && matchesRisk;
      });
  }, [analysisMap, customersQuery.data, domain, risk, search]);

  if (customersQuery.isLoading || analysesQuery.isLoading) {
    return <LoadingState label="Loading customers" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor customer signals, churn scores, and retention actions.</p>
        </div>
        <Link to="/analyze" className="btn-primary">
          Analyze customer
        </Link>
      </div>

      <section className="panel p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className="field pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customers"
            />
          </label>
          <select className="field" value={domain} onChange={(event) => setDomain(event.target.value as Domain | 'all')}>
            <option value="all">All domains</option>
            <option value="Telecom">Telecom</option>
            <option value="Banking">Banking</option>
            <option value="SaaS">SaaS</option>
          </select>
          <select className="field" value={risk} onChange={(event) => setRisk(event.target.value as RiskLevel | 'all')}>
            <option value="all">All risk levels</option>
            <option value="Low">Low</option>
            <option value="Moderate">Moderate</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </section>

      <section className="panel overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No customers match the filters" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3">Customer ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Domain</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Recent usage</th>
                  <th className="px-5 py-3">Sentiment</th>
                  <th className="px-5 py-3">Complaints</th>
                  <th className="px-5 py-3">Billing</th>
                  <th className="px-5 py-3">Support</th>
                  <th className="px-5 py-3">Churn score</th>
                  <th className="px-5 py-3">Root cause</th>
                  <th className="px-5 py-3">Recommended action</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map(({ customer, analysis }) => (
                  <tr key={customer.customer_id} className="align-top text-sm">
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{customer.customer_id}</td>
                    <td className="px-5 py-4">
                      <Link className="font-semibold text-cyan-800 hover:text-cyan-900" to={`/customers/${customer.customer_id}`}>
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{customer.domain}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.plan ?? 'N/A'}</td>
                    <td className="max-w-xs px-5 py-4 text-slate-600">{customer.recent_usage ?? 'N/A'}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.sentiment ?? 'N/A'}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.complaints.length}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.billing_issues.length}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.support_history.length}</td>
                    <td className="px-5 py-4">
                      <RiskBadge score={analysis?.churn_score} />
                    </td>
                    <td className="max-w-xs px-5 py-4 text-slate-700">{analysis?.root_cause ?? 'Pending analysis'}</td>
                    <td className="max-w-md px-5 py-4 text-slate-600">{analysis?.recommended_intervention ?? 'N/A'}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {(analysis?.churn_score ?? 0) > 0.5 ? 'Needs outreach' : 'Monitor'}
                    </td>
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
