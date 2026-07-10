import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckSquare, Gauge, MessageSquareWarning, SearchCheck, Users } from 'lucide-react';

import { useAnalyses, useCustomers, useTasks } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { RiskBadge } from '../components/RiskBadge';
import { ChurnAnalysisRecord, Customer } from '../types';
import {
  activeRootCauseCount,
  customerHealthScore,
  getEarlyWarnings,
  getRootCauseFactors,
  overallSentiment,
  SentimentLabel,
  warningSeverityRank,
} from '../utils/featureInsights';
import { formatPercent, riskLevel } from '../utils/risk';

const pieColors = ['#0891b2', '#f59e0b', '#f97316', '#dc2626', '#64748b', '#10b981'];

type RootCauseDatum = {
  name: string;
  value: number;
};

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
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <Icon className="h-5 w-5 text-cyan-700" />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-normal text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  );
}

function RootCauseLegend({ data }: { data: RootCauseDatum[] }) {
  return (
    <ul className="grid min-w-0 gap-2 sm:grid-cols-2 2xl:grid-cols-1">
      {data.map((entry, index) => (
        <li key={entry.name} className="flex min-w-0 items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-sm"
            style={{ backgroundColor: pieColors[index % pieColors.length] }}
          />
          <span className="min-w-0 flex-1 break-words leading-5">{entry.name}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            {entry.value}
          </span>
        </li>
      ))}
    </ul>
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
  const averageHealth =
    scored.length > 0
      ? scored.reduce((sum, row) => sum + (customerHealthScore(row.analysis.churn_score) ?? 0), 0) /
        scored.length
      : 0;
  const openTasks = tasks.filter((task) => task.status !== 'completed').length;
  const warningCount = enriched.reduce(
    (sum, row) => sum + getEarlyWarnings(row.customer, row.analysis).length,
    0,
  );
  const criticalWarningCount = enriched.reduce(
    (sum, row) =>
      sum +
      getEarlyWarnings(row.customer, row.analysis).filter(
        (warning) => warningSeverityRank(warning.severity) >= warningSeverityRank('critical'),
      ).length,
    0,
  );

  const distribution = ['Low', 'Medium', 'High', 'Critical'].map((level) => ({
    name: level,
    customers: scored.filter((row) => riskLevel(row.analysis.churn_score) === level).length,
  }));

  const rootCauses = Object.values(analyses).reduce<Record<string, number>>((acc, analysis) => {
    acc[analysis.root_cause] = (acc[analysis.root_cause] ?? 0) + 1;
    return acc;
  }, {});
  const rootCauseData: RootCauseDatum[] = Object.entries(rootCauses).map(([name, value]) => ({ name, value }));
  const rootCauseCategoryData = Object.entries(
    enriched.reduce<Record<string, number>>((acc, row) => {
      getRootCauseFactors(row.customer, row.analysis)
        .filter((factor) => factor.active)
        .forEach((factor) => {
          acc[factor.label] = (acc[factor.label] ?? 0) + 1;
        });
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
  const activeRootCauseSignals = enriched.reduce(
    (sum, row) => sum + activeRootCauseCount(row.customer, row.analysis),
    0,
  );
  const sentimentOrder: SentimentLabel[] = ['Positive', 'Neutral', 'Negative', 'Escalation required'];
  const sentimentCounts = sentimentOrder.map((status) => ({
    status,
    value: enriched.filter((row) => overallSentiment(row.customer) === status).length,
  }));
  const needsEscalation = sentimentCounts.find((entry) => entry.status === 'Escalation required')?.value ?? 0;
  const negativeSentiment = sentimentCounts.find((entry) => entry.status === 'Negative')?.value ?? 0;

  const recentHighRisk = enriched
    .filter((row) => row.analysis && row.analysis.churn_score > 0.5)
    .sort((a, b) => (b.analysis?.churn_score ?? 0) - (a.analysis?.churn_score ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-slate-50">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Retention risk across Telecom, Banking, and SaaS customers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total customers" value={customers.length} icon={Users} />
        <StatCard title="High-risk customers" value={highRisk} icon={AlertTriangle} />
        <StatCard title="Average churn score" value={formatPercent(average)} icon={Gauge} />
        <StatCard title="Open follow-up tasks" value={openTasks} icon={CheckSquare} />
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="agent-label">Core Features</p>
              <h2 className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">
                Churn Prediction Engine
              </h2>
            </div>
            <Gauge className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Average probability</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-slate-50">
                {formatPercent(average)}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Avg health score</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-slate-50">
                {Math.round(averageHealth)}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
            <span className="font-medium text-slate-600 dark:text-slate-300">Early warning alerts</span>
            <span className="font-black text-orange-700 dark:text-orange-300">{warningCount}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">Critical alerts</span>
            <span className="font-black text-red-700 dark:text-red-300">{criticalWarningCount}</span>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="agent-label">Core Features</p>
              <h2 className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">
                Root Cause Analysis
              </h2>
            </div>
            <SearchCheck className="h-5 w-5 text-blue-700 dark:text-blue-300" />
          </div>
          <p className="mt-5 text-2xl font-black text-slate-950 dark:text-slate-50">
            {activeRootCauseSignals}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            active churn driver signals across all industries
          </p>
          <div className="mt-5 space-y-3">
            {rootCauseCategoryData.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No active root-cause categories yet.</p>
            ) : (
              rootCauseCategoryData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{entry.name}</span>
                  <span className="font-black text-blue-700 dark:text-blue-300">{entry.value}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="agent-label">Core Features</p>
              <h2 className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">
                Customer Sentiment Analysis
              </h2>
            </div>
            <MessageSquareWarning className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Negative</p>
              <p className="mt-1 text-2xl font-black text-orange-700 dark:text-orange-300">
                {negativeSentiment}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Escalation required</p>
              <p className="mt-1 text-2xl font-black text-red-700 dark:text-red-300">{needsEscalation}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {sentimentCounts.map((entry) => (
              <div key={entry.status} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{entry.status}</span>
                <span className="font-black text-slate-900 dark:text-slate-50">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel min-w-0 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Churn Distribution</h2>
          </div>
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                <Tooltip />
                <Bar dataKey="customers" radius={[6, 6, 0, 0]} fill="#0891b2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel min-w-0 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Root Cause Breakdown</h2>
          </div>
          {rootCauseData.length === 0 ? (
            <EmptyState title="No churn analyses yet" />
          ) : (
            <div className="grid min-w-0 gap-4 2xl:grid-cols-[240px_minmax(0,1fr)] 2xl:items-center">
              <div className="h-56 min-w-0 sm:h-64 2xl:h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <Pie
                      data={rootCauseData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="48%"
                      outerRadius="78%"
                      paddingAngle={2}
                    >
                      {rootCauseData.map((entry, index) => (
                        <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <RootCauseLegend data={rootCauseData} />
            </div>
          )}
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-5 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Recent High-Risk Customers</h2>
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
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {recentHighRisk.map(({ customer, analysis }) => (
                  <tr key={customer.customer_id} className="text-sm">
                    <td className="px-5 py-4">
                      <Link className="font-semibold text-cyan-800 hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-cyan-200" to={`/customers/${customer.customer_id}`}>
                        {customer.name}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{customer.customer_id}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{customer.domain}</td>
                    <td className="px-5 py-4">
                      <RiskBadge score={analysis?.churn_score} />
                    </td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{analysis?.root_cause}</td>
                    <td className="max-w-md px-5 py-4 text-slate-600 dark:text-slate-300">{analysis?.recommended_intervention}</td>
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
