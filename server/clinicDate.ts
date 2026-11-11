/**
 * Server-side Clinic Date & Time Utility
 * Standardizes all date and time operations to the clinic's local timezone (Africa/Algiers - UTC+1).
 */

export const CLINIC_TIMEZONE = 'Africa/Algiers';

export function getClinicTodayStr(d: Date | string | number = new Date()): string {
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(dt.getTime())) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: CLINIC_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt);
}

export function getClinicTimeStr(d: Date | string | number = new Date()): string {
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '09:00';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dt);
}

export function getClinicTomorrowStr(): string {
  return getClinicDateOffsetStr(1);
}

export function getClinicDateOffsetStr(daysOffset: number, baseDateStr?: string): string {
  const base = baseDateStr ? new Date(`${baseDateStr}T12:00:00Z`) : new Date();
  const target = new Date(base.getTime() + daysOffset * 86400000);
  return getClinicTodayStr(target);
}

export function getClinicYear(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
  }).formatToParts(d);
  const yearPart = parts.find(p => p.type === 'year')?.value;
  return yearPart ? parseInt(yearPart, 10) : d.getFullYear();
}

export function getClinicMonthPrefix(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d);
  const yearPart = parts.find(p => p.type === 'year')?.value;
  const monthPart = parts.find(p => p.type === 'month')?.value;
  return `${yearPart}-${monthPart}`;
}

export function getClinicWeekRange(referenceDate: Date = new Date()): {
  saturdayStr: string;
  fridayStr: string;
} {
  const weekdayShort = new Intl.DateTimeFormat('en-US', { timeZone: CLINIC_TIMEZONE, weekday: 'short' }).format(referenceDate);
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const currentDayOfWeek = weekdayMap[weekdayShort] ?? 0;
  const daysSinceSaturday = (currentDayOfWeek + 1) % 7;

  const currentClinicDate = getClinicTodayStr(referenceDate);
  const saturdayStr = getClinicDateOffsetStr(-daysSinceSaturday, currentClinicDate);
  const fridayStr = getClinicDateOffsetStr(6, saturdayStr);

  return { saturdayStr, fridayStr };
}
