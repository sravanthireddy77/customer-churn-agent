import { Inbox } from 'lucide-react';

export function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-800">
      <Inbox className="h-8 w-8 text-slate-400 dark:text-slate-500" />
      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
    </div>
  );
}
