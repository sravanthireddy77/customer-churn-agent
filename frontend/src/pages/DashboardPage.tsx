import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckSquare, Gauge, Users } from 'lucide-react';

import { useAnalyses, useCustomers, useTasks } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { RiskBadge } from '../components/RiskBadge';
import { ChurnAnalysisRecord, Customer } from '../types';
import { formatPercent, riskLevel } from '../utils/risk';

const pieColors = ['#0891b2', '#f59e0b', '#f97316', '#dc2626', '#64748b', '#10b981'];

function latestByCustomer(analyses: ChurnAnalysisRecord[]) {
  return analyses.reduce<Record<string, ChurnAnalysisRecord>>((acc, analysis) => {
    const existing = acc[analysis.customer_id];
    if (!existing || new Date(analysis.created_at) > new Date(existing.created_at)) {
      acc[analysis.customer_id] = analysis;
    }
    return acc;
  }, {});
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <Icon className="h-5 w-5 text-cyan-700" />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-normal text-slate-950">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const customersQuery = useCustomers();
  const analysesQuery = useAnalyses();
  const tasksQuery = useTasks();

  if (customersQuery.isLoading || analysesQuery.isLoading || tasksQuery.isLoading) {
    return <LoadingState label="Loading dashboard" />;
  }

  const customers = customersQuery.data ?? [];
  const analyses = latestByCustomer(analysesQuery.data ?? []);
  const tasks = tasksQuery.data ?? [];
  const enriched = customers.map((customer) => ({ customer, analysis: analyses[customer.customer_id] }));
  const scored = enriched.filter((row) => row.analysis);
  const highRisk = scored.filter((row) => row.analysis.churn_score > 0.5).length;
  const average =
    scored.length > 0
      ? scored.reduce((sum, row) => sum + row.analysis.churn_score, 0) / scored.length
      : 0;
  const openTasks = tasks.filter((task) => task.status !== 'completed').length;

  const distribution = ['Low', 'Moderate', 'High', 'Critical'].map((level) => ({
    name: level,
    customers: scored.filter((row) => riskLevel(row.analysis.churn_score) === level).length,
  }));

  const rootCauses = Object.values(analyses).reduce<Record<string, number>>((acc, analysis) => {
    acc[analysis.root_cause] = (acc[analysis.root_cause] ?? 0) + 1;
    return acc;
  }, {});
  const rootCauseData = Object.entries(rootCauses).map(([name, value]) => ({ name, value }));

  const recentHighRisk = enriched
    .filter((row) => row.analysis && row.analysis.churn_score > 0.5)
    .sort((a, b) => (b.analysis?.churn_score ?? 0) - (a.analysis?.churn_score ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Retention risk across Telecom, Banking, and SaaS customers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total customers" value={customers.length} icon={Users} />
        <StatCard title="High-risk customers" value={highRisk} icon={AlertTriangle} />
        <StatCard title="Average churn score" value={formatPercent(average)} icon={Gauge} />
        <StatCard title="Open follow-up tasks" value={openTasks} icon={CheckSquare} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Churn Distribution</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="customers" radius={[6, 6, 0, 0]} fill="#0891b2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Root Cause Breakdown</h2>
          </div>
          {rootCauseData.length === 0 ? (
            <EmptyState title="No churn analyses yet" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rootCauseData} dataKey="value" nameKey="name" outerRadius={88} label>
                    {rootCauseData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-950">Recent High-Risk Customers</h2>
        </div>
        {recentHighRisk.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No high-risk customers" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Domain</th>
                  <th className="px-5 py-3">Risk</th>
                  <th className="px-5 py-3">Root cause</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentHighRisk.map(({ customer, analysis }) => (
                  <tr key={customer.customer_id} className="text-sm">
                    <td className="px-5 py-4">
                      <Link className="font-semibold text-cyan-800 hover:text-cyan-900" to={`/customers/${customer.customer_id}`}>
                        {customer.name}
                      </Link>
                      <p className="text-xs text-slate-500">{customer.customer_id}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{customer.domain}</td>
                    <td className="px-5 py-4">
                      <RiskBadge score={analysis?.churn_score} />
                    </td>
                    <td className="px-5 py-4 text-slate-700">{analysis?.root_cause}</td>
                    <td className="max-w-md px-5 py-4 text-slate-600">{analysis?.recommended_intervention}</td>
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
