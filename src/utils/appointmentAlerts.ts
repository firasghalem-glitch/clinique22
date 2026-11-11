import { Appointment } from '../types';
import { getClinicTodayStr } from './clinicDate';

export type ProximityLevel = 'overdue' | 'imminent_30' | 'soon_60' | 'later' | 'completed' | 'cancelled';

export interface AppointmentUrgency {
  level: ProximityLevel;
  minutesDiff: number;
  label: string;
  badgeClass: string;
  rowClass: string;
  isWithin30Min: boolean;
  isOverdue: boolean;
}

export function getAppointmentUrgency(apt: Appointment, referenceDate: Date = new Date()): AppointmentUrgency {
  if (apt.status === 'completed') {
    return {
      level: 'completed',
      minutesDiff: 0,
      label: 'مكتمل',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      rowClass: 'bg-emerald-50/30 hover:bg-emerald-50/60',
      isWithin30Min: false,
      isOverdue: false,
    };
  }
  if (apt.status === 'cancelled') {
    return {
      level: 'cancelled',
      minutesDiff: 0,
      label: 'ملغى',
      badgeClass: 'bg-slate-100 text-slate-500 line-through',
      rowClass: 'opacity-60 bg-slate-50/50',
      isWithin30Min: false,
      isOverdue: false,
    };
  }

  // Parse appointment date & time in clinic timezone (+01:00)
  const timeFormatted = (apt.appointmentTime || '09:00').padStart(5, '0');
  const aptEpoch = Date.parse(`${apt.appointmentDate}T${timeFormatted}:00+01:00`);
  const aptTimestamp = !isNaN(aptEpoch) ? aptEpoch : new Date(`${apt.appointmentDate}T${timeFormatted}`).getTime();

  const diffMs = aptTimestamp - referenceDate.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  const isToday = apt.appointmentDate === getClinicTodayStr(referenceDate);

  if (!isToday) {
    return {
      level: 'later',
      minutesDiff: diffMinutes,
      label: apt.appointmentDate,
      badgeClass: 'bg-slate-100 text-slate-700',
      rowClass: 'hover:bg-slate-50',
      isWithin30Min: false,
      isOverdue: false,
    };
  }

  if (diffMinutes < -15) {
    const lateMins = Math.abs(diffMinutes);
    return {
      level: 'overdue',
      minutesDiff: diffMinutes,
      label: `متأخر منذ ${lateMins} دقيقة`,
      badgeClass: 'bg-amber-50 text-amber-800 font-bold border border-amber-200',
      rowClass: 'hover:bg-slate-50/90',
      isWithin30Min: false,
      isOverdue: true,
    };
  }

  if (diffMinutes <= 0) {
    return {
      level: 'overdue',
      minutesDiff: diffMinutes,
      label: 'حان الموعد الآن',
      badgeClass: 'bg-blue-700 text-white font-bold shadow-xs',
      rowClass: 'hover:bg-slate-50/90',
      isWithin30Min: true,
      isOverdue: true,
    };
  }

  if (diffMinutes <= 30) {
    return {
      level: 'imminent_30',
      minutesDiff: diffMinutes,
      label: `خلال ${diffMinutes} دقيقة`,
      badgeClass: 'bg-blue-50 text-blue-800 font-bold border border-blue-300 shadow-xs',
      rowClass: 'hover:bg-slate-50/90',
      isWithin30Min: true,
      isOverdue: false,
    };
  }

  if (diffMinutes <= 60) {
    return {
      level: 'soon_60',
      minutesDiff: diffMinutes,
      label: `خلال ${diffMinutes} دقيقة`,
      badgeClass: 'bg-slate-100 text-slate-700 font-medium border border-slate-200',
      rowClass: 'hover:bg-slate-50',
      isWithin30Min: false,
      isOverdue: false,
    };
  }

  const hoursRemaining = Math.floor(diffMinutes / 60);
  const minsRemaining = diffMinutes % 60;
  return {
    level: 'later',
    minutesDiff: diffMinutes,
    label: `بعد ${hoursRemaining} ساعة و ${minsRemaining} د`,
    badgeClass: 'bg-slate-100 text-slate-700 font-medium',
    rowClass: 'hover:bg-slate-50',
    isWithin30Min: false,
    isOverdue: false,
  };
}
