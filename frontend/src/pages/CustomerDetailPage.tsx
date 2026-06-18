import { useParams } from 'react-router-dom';
import { CalendarPlus, MailPlus, RefreshCw } from 'lucide-react';

import {
  useAnalysis,
  useAnalyzeCustomer,
  useCreateTask,
  useCustomer,
  useTasks,
  useTriggerCampaign,
} from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const { showToast } = useToast();
  const customerQuery = useCustomer(customerId);
  const analysisQuery = useAnalysis(customerId);
  const tasksQuery = useTasks(customerId);
  const analyzeMutation = useAnalyzeCustomer();
  const createTaskMutation = useCreateTask();
  const campaignMutation = useTriggerCampaign();

  if (customerQuery.isLoading) {
    return <LoadingState label="Loading customer" />;
  }

  const customer = customerQuery.data;
  const analysis = analysisQuery.data;
  if (!customer) {
    return <EmptyState title="Customer not found" />;
  }

  const runAnalysis = async () => {
    await analyzeMutation.mutateAsync({
      customer_id: customer.customer_id,
      name: customer.name,
      domain: customer.domain,
      recent_usage: customer.recent_usage,
      complaints: customer.complaints,
      billing_issues: customer.billing_issues,
      sentiment: customer.sentiment,
      support_history: customer.support_history,
      plan: customer.plan,
      tenure_months: customer.tenure_months,
      metadata: customer.metadata,
    });
    showToast('Churn analysis refreshed');
  };

  const createFollowUp = async () => {
    if (!analysis) return;
    await createTaskMutation.mutateAsync({
      customer_id: customer.customer_id,
      title: 'Retention follow-up',
      description: analysis.follow_up_task ?? analysis.recommended_intervention,
      priority: analysis.churn_score >= 0.76 ? 'urgent' : analysis.churn_score >= 0.51 ? 'high' : 'medium',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open',
      assigned_to: 'Retention Team',
    });
    showToast('Follow-up task created');
  };

  const triggerOutreach = async () => {
    await campaignMutation.mutateAsync({
      customer_id: customer.customer_id,
      campaign_type: 'retention_email',
      payload: {
        root_cause: analysis?.root_cause,
        recommendation: analysis?.recommended_intervention,
      },
    });
    showToast('Outreach campaign simulated');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">{customer.customer_id}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 dark:text-slate-50">{customer.name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {customer.domain} / {customer.plan ?? 'No plan'} / {customer.tenure_months ?? 0} months
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={runAnalysis} disabled={analyzeMutation.isPending}>
            <RefreshCw className="h-4 w-4" />
            Run analysis
          </button>
          <button className="btn-primary" onClick={createFollowUp} disabled={!analysis || createTaskMutation.isPending}>
            <CalendarPlus className="h-4 w-4" />
            Create Follow-Up Task
          </button>
          <button className="btn-secondary" onClick={triggerOutreach} disabled={campaignMutation.isPending}>
            <MailPlus className="h-4 w-4" />
            Trigger Outreach
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="panel p-5">
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Customer Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Recent usage</dt>
              <dd className="mt-1 font-medium text-slate-800 dark:text-slate-50">{customer.recent_usage ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Sentiment</dt>
              <dd className="mt-1 font-medium text-slate-800 dark:text-slate-50">{customer.sentiment ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Complaints</dt>
              <dd className="mt-1 text-slate-800 dark:text-slate-50">{customer.complaints.length ? customer.complaints.join(', ') : 'None'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Billing issues</dt>
              <dd className="mt-1 text-slate-800 dark:text-slate-50">{customer.billing_issues.length ? customer.billing_issues.join(', ') : 'None'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Support history</dt>
              <dd className="mt-1 text-slate-800 dark:text-slate-50">{customer.support_history.length ? customer.support_history.join(', ') : 'None'}</dd>
            </div>
          </dl>
        </section>

        <section className="panel p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Latest Churn Analysis</h2>
            {analysis && <RiskBadge score={analysis.churn_score} />}
          </div>
          {analysis ? (
            <div className="mt-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">Reasoning</h3>
                <ol className="mt-3 space-y-3">
                  {analysis.reasoning.map((step, index) => (
                    <li key={`${step}-${index}`} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">Root cause</h3>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{analysis.root_cause}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">Recommended intervention</h3>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{analysis.recommended_intervention}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="No churn analysis yet" />
            </div>
          )}
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-5 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Follow-Up Tasks</h2>
        </div>
        {(tasksQuery.data ?? []).length === 0 ? (
          <div className="p-5">
            <EmptyState title="No tasks for this customer" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3">Task</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {(tasksQuery.data ?? []).map((task) => (
                  <tr key={task.task_id} className="text-sm">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-50">{task.title}</p>
                      <p className="mt-1 text-slate-500 dark:text-slate-400">{task.description}</p>
                    </td>
                    <td className="px-5 py-4 capitalize text-slate-700 dark:text-slate-300">{task.priority}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{task.assigned_to ?? 'Unassigned'}</td>
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
