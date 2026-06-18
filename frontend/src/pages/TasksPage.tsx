import { useMemo, useState } from 'react';
import { CheckCircle2, ListTodo } from 'lucide-react';

import { useTasks, useUpdateTask } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';
import { TaskStatus } from '../types';

export function TasksPage() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const tasksQuery = useTasks();
  const updateTask = useUpdateTask();

  const tasks = useMemo(() => {
    return (tasksQuery.data ?? []).filter((task) => status === 'all' || task.status === status);
  }, [status, tasksQuery.data]);

  const updateStatus = async (taskId: string, nextStatus: TaskStatus) => {
    await updateTask.mutateAsync({ taskId, status: nextStatus });
    showToast('Task updated');
  };

  if (tasksQuery.isLoading) {
    return <LoadingState label="Loading tasks" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">Retention work queue for follow-up actions.</p>
        </div>
        <select className="field w-full sm:w-56" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | 'all')}>
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <ListTodo className="h-5 w-5 text-cyan-700" />
          <p className="mt-3 text-2xl font-bold">{(tasksQuery.data ?? []).filter((task) => task.status === 'open').length}</p>
          <p className="text-sm text-slate-500">Open</p>
        </div>
        <div className="panel p-5">
          <ListTodo className="h-5 w-5 text-yellow-700" />
          <p className="mt-3 text-2xl font-bold">{(tasksQuery.data ?? []).filter((task) => task.status === 'in_progress').length}</p>
          <p className="text-sm text-slate-500">In progress</p>
        </div>
        <div className="panel p-5">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          <p className="mt-3 text-2xl font-bold">{(tasksQuery.data ?? []).filter((task) => task.status === 'completed').length}</p>
          <p className="text-sm text-slate-500">Completed</p>
        </div>
      </div>

      <section className="panel overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No tasks found" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3">Task</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Due date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Assigned</th>
                  <th className="px-5 py-3">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tasks.map((task) => (
                  <tr key={task.task_id} className="align-top text-sm">
                    <td className="max-w-md px-5 py-4">
                      <p className="font-semibold text-slate-800">{task.title}</p>
                      <p className="mt-1 text-slate-500">{task.description}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{task.customer_id}</td>
                    <td className="px-5 py-4 capitalize text-slate-700">{task.priority}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-600">{task.assigned_to ?? 'Unassigned'}</td>
                    <td className="px-5 py-4">
                      <select
                        className="field min-w-36"
                        value={task.status}
                        onChange={(event) => updateStatus(task.task_id, event.target.value as TaskStatus)}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
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
