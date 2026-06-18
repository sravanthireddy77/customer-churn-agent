export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
      <span className="ml-3">{label}</span>
    </div>
  );
}
