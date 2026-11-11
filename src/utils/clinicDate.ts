/**
 * Clinic Date & Time Utility
 * Standardizes all date and time operations to the clinic's local timezone (Africa/Algiers - UTC+1).
 * Completely immune to client/server timezone discrepancies.
 */

export const CLINIC_TIMEZONE = 'Africa/Algiers';

/**
 * Returns YYYY-MM-DD in the clinic's local timezone.
 */
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

/**
 * Returns YYYY in the clinic's local timezone.
 */
export function getClinicYear(d: Date | string | number = new Date()): number {
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  const str = getClinicTodayStr(dt);
  return parseInt(str.slice(0, 4), 10);
}

/**
 * Returns YYYY-MM in the clinic's local timezone.
 */
export function getClinicMonthPrefix(d: Date | string | number = new Date()): string {
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  return getClinicTodayStr(dt).slice(0, 7);
}

/**
 * Returns HH:mm in the clinic's local timezone (24-hour format).
 */
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

/**
 * Returns YYYY-MM-DD for tomorrow in clinic's local timezone.
 */
export function getClinicTomorrowStr(): string {
  return getClinicDateOffsetStr(1);
}

/**
 * Returns YYYY-MM-DD for yesterday in clinic's local timezone.
 */
export function getClinicYesterdayStr(): string {
  return getClinicDateOffsetStr(-1);
}

/**
 * Adds/subtracts days to a clinic date string (or current date) in clinic timezone.
 */
export function getClinicDateOffsetStr(daysOffset: number, baseDateStr?: string): string {
  const base = baseDateStr ? new Date(`${baseDateStr}T12:00:00Z`) : new Date();
  const target = new Date(base.getTime() + daysOffset * 86400000);
  return getClinicTodayStr(target);
}

/**
 * Checks if a given date string (YYYY-MM-DD) matches today in clinic local time.
 */
export function isClinicToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dateStr.slice(0, 10) === getClinicTodayStr();
}

/**
 * Checks if a given date string (YYYY-MM-DD) matches tomorrow in clinic local time.
 */
export function isClinicTomorrow(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dateStr.slice(0, 10) === getClinicTomorrowStr();
}

/**
 * Arabic months used in Algeria
 */
export const ALGERIAN_ARABIC_MONTHS = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const ARABIC_WEEKDAYS: Record<string, string> = {
  Sat: 'السبت',
  Sun: 'الأحد',
  Mon: 'الإثنين',
  Tue: 'الثلاثاء',
  Wed: 'الأربعاء',
  Thu: 'الخميس',
  Fri: 'الجمعة',
};

/**
 * Formats a date string (YYYY-MM-DD or ISO) into Arabic text in clinic timezone.
 * Example: "الجمعة 30 أكتوبر 2026"
 */
export function formatClinicDate(
  dateInput?: string | Date,
  options?: { includeWeekday?: boolean; useAlgerianMonths?: boolean }
): string {
  if (!dateInput) return '—';
  const cleanDateStr = typeof dateInput === 'string' ? dateInput.slice(0, 10) : getClinicTodayStr(dateInput);
  const [yearStr, monthStr, dayStr] = cleanDateStr.split('-');
  if (!yearStr || !monthStr || !dayStr) return String(dateInput);

  const monthIdx = parseInt(monthStr, 10) - 1;
  const dayNum = parseInt(dayStr, 10);
  const monthName = ALGERIAN_ARABIC_MONTHS[monthIdx] || monthStr;

  let weekdayName = '';
  if (options?.includeWeekday) {
    const dt = new Date(`${cleanDateStr}T12:00:00Z`);
    const shortWd = new Intl.DateTimeFormat('en-US', { timeZone: CLINIC_TIMEZONE, weekday: 'short' }).format(dt);
    weekdayName = ARABIC_WEEKDAYS[shortWd] ? `${ARABIC_WEEKDAYS[shortWd]}، ` : '';
  }

  return `${weekdayName}${dayNum} ${monthName} ${yearStr}`;
}

/**
 * Formats a full ISO timestamp into date + time in clinic timezone.
 * Example: "30 أكتوبر 2026 - 19:15"
 */
export function formatClinicDateTime(isoString?: string | Date): string {
  if (!isoString) return '—';
  const dt = typeof isoString === 'string' ? new Date(isoString) : isoString;
  if (isNaN(dt.getTime())) return String(isoString);

  const dateStr = getClinicTodayStr(dt);
  const timeStr = getClinicTimeStr(dt);
  const formattedDate = formatClinicDate(dateStr);
  return `${formattedDate} - ${timeStr}`;
}

/**
 * Returns the current clinic week range (Saturday through Friday).
 */
export function getClinicWeekRange(referenceDate: Date = new Date()): {
  saturdayStr: string;
  fridayStr: string;
} {
  // Determine weekday in clinic timezone (0=Sun, 1=Mon, ..., 6=Sat)
  const weekdayShort = new Intl.DateTimeFormat('en-US', { timeZone: CLINIC_TIMEZONE, weekday: 'short' }).format(referenceDate);
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const currentDayOfWeek = weekdayMap[weekdayShort] ?? 0;

  // Days since last Saturday (Saturday = 0, Sunday = 1, ..., Friday = 6)
  const daysSinceSaturday = (currentDayOfWeek + 1) % 7;

  // Calculate Saturday date string
  const currentClinicDate = getClinicTodayStr(referenceDate);
  const saturdayStr = getClinicDateOffsetStr(-daysSinceSaturday, currentClinicDate);
  const fridayStr = getClinicDateOffsetStr(6, saturdayStr);

  return { saturdayStr, fridayStr };
}
