import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { ToastType } from '../../services/notification';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (e: any) => {
      const { message, type = 'warning', duration = 3200, id } = e.detail;
      const newToast: ToastItem = { id, message, type };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };

    window.addEventListener('studyos-toast', handleToast);
    return () => window.removeEventListener('studyos-toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-9999 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let bgClass = 'bg-[#FFF3C4] text-amber-950'; // warning
        let Icon = AlertCircle;

        if (toast.type === 'error') {
          bgClass = 'bg-[#FFCDD2] text-rose-950';
          Icon = XCircle;
        } else if (toast.type === 'success') {
          bgClass = 'bg-[#C8E6C9] text-emerald-950';
          Icon = CheckCircle2;
        } else if (toast.type === 'info') {
          bgClass = 'bg-[#E0E7FF] text-[#312E81]';
          Icon = Info;
        }

        return (
          <div
            key={toast.id}
            dir="auto"
            className={`pointer-events-auto border-2 border-black rounded-2xl p-3.5 shadow-[3px_3px_0px_0px_#000] flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 fade-in duration-200 ${bgClass}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="w-5 h-5 shrink-0 stroke-[2.5]" />
              <span className="text-xs font-vazir font-bold leading-relaxed truncate-2-lines">
                {toast.message}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-black/40 hover:text-black p-0.5 cursor-pointer shrink-0 font-bold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;