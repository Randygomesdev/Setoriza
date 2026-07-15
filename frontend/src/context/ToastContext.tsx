import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? 4000;
    
    setToasts((prev) => [...prev, { ...toast, id, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 md:px-0">
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'border-emerald-200 dark:border-emerald-900/60 bg-white/90 dark:bg-slate-900/90 text-emerald-800 dark:text-emerald-400',
            error: 'border-rose-200 dark:border-rose-900/60 bg-white/90 dark:bg-slate-900/90 text-rose-800 dark:text-rose-400',
            info: 'border-blue-200 dark:border-blue-900/60 bg-white/90 dark:bg-slate-900/90 text-blue-800 dark:text-blue-400',
            warning: 'border-amber-200 dark:border-amber-900/60 bg-white/90 dark:bg-slate-900/90 text-amber-800 dark:text-amber-400',
          };

          const Icon = {
            success: CheckCircle,
            error: AlertCircle,
            info: Info,
            warning: AlertTriangle,
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-in slide-in-from-right duration-200 ${typeStyles[toast.type]}`}
              role="alert"
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h5 className="font-bold text-xs leading-normal text-slate-800 dark:text-slate-100 mb-0.5">
                    {toast.title}
                  </h5>
                )}
                <p className="text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
