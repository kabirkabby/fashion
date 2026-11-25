/**
 * Location-agnostic YYYY-MM-DD calendar date utilities.
 * Uses explicit integer Y/M/D arithmetic to prevent UTC/local timezone drift.
 */

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parsePlainDate(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y || 2026, month: m || 1, day: d || 1 };
}

export function formatPlainDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addDaysIso(iso: string, days: number): string {
  const { year, month, day } = parsePlainDate(iso);
  const utc = Date.UTC(year, month - 1, day + days);
  const dt = new Date(utc);
  return formatPlainDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function diffDaysIso(fromIso: string, toIso: string): number {
  const a = parsePlainDate(fromIso);
  const b = parsePlainDate(toIso);
  const msA = Date.UTC(a.year, a.month - 1, a.day);
  const msB = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((msB - msA) / 86_400_000);
}

export function formatDisplayDate(iso: string, opts?: { includeYear?: boolean; weekday?: boolean }): string {
  if (!iso) return '—';
  const { year, month, day } = parsePlainDate(iso);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: opts?.weekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: opts?.includeYear ? 'numeric' : undefined,
  });
}

export function formatRelativeDate(iso: string, todayIso: string): {
  label: string;
  tone: 'overdue' | 'today' | 'soon' | 'future';
} {
  if (!iso) return { label: 'Not set', tone: 'future' };
  const diff = diffDaysIso(todayIso, iso);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, tone: 'overdue' };
  if (diff === 0) return { label: 'Today', tone: 'today' };
  if (diff === 1) return { label: 'Tomorrow', tone: 'soon' };
  if (diff <= 5) return { label: `In ${diff}d`, tone: 'soon' };
  return { label: formatDisplayDate(iso), tone: 'future' };
}

export function getMonthDaysGrid(year: number, month: number): {
  iso: string;
  day: number;
  inMonth: boolean;
}[] {
  const firstDayWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

  const cells: { iso: string; day: number; inMonth: boolean }[] = [];

  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    cells.push({ iso: formatPlainDate(prevYear, prevMonth, d), day: d, inMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: formatPlainDate(year, month, d), day: d, inMonth: true });
  }

  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    cells.push({ iso: formatPlainDate(nextYear, nextMonth, d), day: d, inMonth: false });
  }

  return cells;
}
