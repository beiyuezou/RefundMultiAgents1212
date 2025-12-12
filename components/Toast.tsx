import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-24 right-4 z-[70] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColors = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-slate-800 border-slate-700'
  };

  const icons = {
    success: '✓',
    error: '!',
    info: 'i'
  };

  return (
    <div className={`${bgColors[toast.type]} border-2 text-white pl-4 pr-3 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-pop-in pointer-events-auto min-w-[240px] max-w-sm backdrop-blur-sm bg-opacity-95`}>
      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
        {icons[toast.type]}
      </div>
      <p className="font-bold text-sm flex-1 leading-tight">{toast.message}</p>
      <button 
        onClick={() => onDismiss(toast.id)} 
        className="p-1 hover:bg-white/20 rounded-lg transition-colors opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
};