import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type ToastKind = 'success' | 'error';
type Toast = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<{ showToast: (message: string, kind?: ToastKind) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo(
    () => ({
      showToast: (message: string, kind: ToastKind = 'success') => {
        const id = Date.now();
        setToasts((current) => [...current, { id, message, kind }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3200);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = toast.kind === 'success' ? CheckCircle2 : XCircle;
          return (
            <div key={toast.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg">
              <Icon className={toast.kind === 'success' ? 'h-5 w-5 text-emerald-600' : 'h-5 w-5 text-red-600'} />
              <span className="text-slate-700">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
