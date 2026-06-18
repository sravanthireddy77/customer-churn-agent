export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent dark:border-cyan-500" />
      <span className="ml-3">{label}</span>
    </div>
  );
}
