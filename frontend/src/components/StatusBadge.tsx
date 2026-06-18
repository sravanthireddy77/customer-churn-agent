import { TaskStatus } from '../types';

const labels: Record<TaskStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  completed: 'Completed',
};

const tones: Record<TaskStatus, string> = {
  open: 'bg-sky-50 text-sky-700 ring-sky-200',
  in_progress: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tones[status]}`}>
      {labels[status]}
    </span>
  );
}
