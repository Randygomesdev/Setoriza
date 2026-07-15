import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'primary';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((confirmOptions: ConfirmOptions) => {
    setOptions(confirmOptions);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback((value: boolean) => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
  }, []);

  const getHeaderIcon = () => {
    if (!options) return null;
    const iconClass = {
      danger: 'bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30',
      warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-250 dark:border-amber-500/20',
      primary: 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50',
    }[options.type || 'primary'];

    const Icon = options.type === 'primary' ? HelpCircle : AlertTriangle;

    return (
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${iconClass}`}>
        <Icon size={20} />
      </div>
    );
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => handleClose(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Top padding */}
            <div className="p-6 pb-4 flex gap-4">
              {getHeaderIcon()}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug">
                  {options.title}
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed font-medium">
                  {options.message}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="py-2 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-slate-850 transition-all cursor-pointer"
              >
                {options.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`py-2 px-4 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer ${
                  options.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/10'
                    : options.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/10'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/10'
                }`}
              >
                {options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
