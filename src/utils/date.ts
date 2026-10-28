// همه تاریخ‌های روزانه بر اساس ساعت محلی سیستم (نه UTC) و به فرمت YYYY-MM-DD

export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return toLocalDateString(new Date());
}

// new Date('YYYY-MM-DD') تاریخ را UTC فرض می‌کند؛ این تابع آن را محلی می‌خواند
export function parseLocalDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr) ?? new Date();
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}
