// سیستم سراسری مدیریت اعلان‌های نئوبروتال
export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastPayload {
  message: string;
  type?: ToastType;
  duration?: number;
}

export function showToast(message: string, type: ToastType = 'warning', duration: number = 3200) {
  const event = new CustomEvent('studyos-toast', {
    detail: { message, type, duration, id: Date.now() + Math.random() },
  });
  window.dispatchEvent(event);
}

// جایگزین امن برای alert های قدیمی در کل پروژه
if (typeof window !== 'undefined') {
  (window as any).notify = showToast;
}