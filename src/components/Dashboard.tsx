import React, { useState, useEffect, useMemo } from 'react';
import {
  Appointment,
  Patient,
  DashboardStats,
  DateStats,
  NetworkInfo,
  DentalCondition,
  ClinicalNote,
  PatientFile,
  ClinicSettings,
  FollowUpOverview,
} from '../types';
import {
  Calendar,
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  Phone,
  Download,
  Wifi,
  TrendingUp,
  BarChart3,
  LineChart,
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CalendarCheck,
  XCircle,
  Sparkles,
  HardDrive,
  Folder,
  FolderCheck,
  FolderOpen,
  Edit3,
  Save,
  Check,
  RefreshCw,
  FileArchive,
  ArrowDownToLine,
  PieChart as PieChartLucide,
  UserCheck,
} from 'lucide-react';
import { clinicApi } from '../services/api';
import {
  getClinicTodayStr,
  getClinicDateOffsetStr,
  formatClinicDate,
  isClinicToday,
} from '../utils/clinicDate';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { localPatientStorageService, LocalFolderInfo } from '../utils/localPatientStorage';

interface DashboardProps {
  stats: DashboardStats;
  patients: Patient[];
  appointments?: Appointment[];
  conditions?: DentalCondition[];
  notes?: ClinicalNote[];
  files?: PatientFile[];
  settings?: ClinicSettings;
  onOpenPatientDossier: (patientId: string) => void;
  onAddNewPatient: () => void;
  onBookAppointment: (targetDate?: string) => void;
  onQuickBackup: () => void;
  onCompleteAppointment: (appointmentId: string) => void;
  networkInfo: NetworkInfo;
  onAddAppointment?: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<void>;
  onShowToast?: (message: string) => void;
  onNavigateToFollowUp?: (category?: 'all' | 'followUp' | 'notReturned' | 'topDiseases') => void;
  refreshTrigger?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  patients,
  appointments,
  conditions,
  notes,
  files,
  settings,
  onOpenPatientDossier,
  onAddNewPatient,
  onBookAppointment,
  onQuickBackup,
  onCompleteAppointment,
  networkInfo,
  onShowToast,
  onNavigateToFollowUp,
  refreshTrigger,
}) => {
  const [followUpOverview, setFollowUpOverview] = useState<FollowUpOverview | null>(null);

  useEffect(() => {
    clinicApi.getFollowUpOverview(30)
      .then(data => setFollowUpOverview(data))
      .catch(() => {});
  }, [patients.length, appointments?.length, conditions?.length, refreshTrigger]);

  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [folderInfo, setFolderInfo] = useState<LocalFolderInfo>(() => localPatientStorageService.getFolderInfo());
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderInputVal, setFolderInputVal] = useState(
    folderInfo.folderName || folderInfo.customPath || settings?.storagePath || 'C:\\ClinicData'
  );
  const [modalSelectedDrive, setModalSelectedDrive] = useState<string>('D:\\');
  const [modalCustomSubfolder, setModalCustomSubfolder] = useState<string>('ClinicData');
  const hiddenFolderPickerRef = React.useRef<HTMLInputElement | null>(null);
  const hiddenFilePickerRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (settings?.storagePath && !folderInfo.folderName) {
      localPatientStorageService.setFolderDirectly(settings.storagePath);
      setFolderInfo(localPatientStorageService.getFolderInfo());
      setFolderInputVal(settings.storagePath);
    }
  }, [settings?.storagePath]);

  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [patientPeriod, setPatientPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [expandedCard, setExpandedCard] = useState<'new' | 'returning' | 'appointments' | null>(null);

  // Single source of truth for total registered patients (independent of period filter)
  const [dbTotalPatients, setDbTotalPatients] = useState<number>(() => stats?.totalPatientsCount ?? patients.length);

  // Card 4: Interactive Calendar & Date-specific stats
  const initialTodayStr = useMemo(() => getClinicTodayStr(), []);
  const [selectedCardDate, setSelectedCardDate] = useState<string>(initialTodayStr);
  const [remoteDateStats, setRemoteDateStats] = useState<DateStats | null>(null);

  // Sync date-specific stats from backend database
  useEffect(() => {
    let isMounted = true;
    clinicApi.getDateStats(selectedCardDate)
      .then(res => {
        if (isMounted && res) {
          setRemoteDateStats(res);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [selectedCardDate, appointments?.length, patients.length, refreshTrigger]);

  // Reactive date stats (instant 0ms response from loaded appointments & patients, merged with remote stats)
  const cardDateStats = useMemo(() => {
    const targetDate = selectedCardDate || initialTodayStr;

    // Filter appointments for targetDate (unique by id)
    const aptsMap = new Map<string, Appointment>();
    for (const a of appointments || []) {
      if (a.appointmentDate === targetDate) {
        aptsMap.set(a.id, a);
      }
    }
    const dayAppointments = Array.from(aptsMap.values());
    const totalAppointments = dayAppointments.length;
    const completedAppointments = dayAppointments.filter(a => a.status === 'completed').length;
    const scheduledAppointments = dayAppointments.filter(a => a.status === 'scheduled').length;
    const cancelledAppointments = dayAppointments.filter(a => a.status === 'cancelled').length;

    // Filter new patients registered on targetDate in Africa/Algiers timezone (unique by id)
    const ptsMap = new Map<string, Patient>();
    for (const p of patients || []) {
      if (p.createdAt && getClinicTodayStr(p.createdAt) === targetDate) {
        ptsMap.set(p.id, p);
      }
    }
    const dayNewPatients = Array.from(ptsMap.values());
    const newPatientsCount = dayNewPatients.length;

    return {
      date: targetDate,
      isToday: isClinicToday(targetDate),
      totalAppointments,
      completedAppointments,
      scheduledAppointments,
      cancelledAppointments,
      newPatientsCount,
      dayAppointments: dayAppointments.sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || '')),
      dayNewPatients,
    };
  }, [selectedCardDate, initialTodayStr, appointments, patients]);

  useEffect(() => {
    if (typeof stats?.totalPatientsCount === 'number') {
      setDbTotalPatients(stats.totalPatientsCount);
    }
  }, [stats?.totalPatientsCount]);

  useEffect(() => {
    let isMounted = true;
    clinicApi.getDashboardStats()
      .then(freshStats => {
        if (isMounted && freshStats && typeof freshStats.totalPatientsCount === 'number') {
          setDbTotalPatients(freshStats.totalPatientsCount);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [refreshTrigger, patients.length]);

  const getPatient = (id: string) => patients.find(p => p.id === id);

  const formatDateDZ = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const currentYear = stats.currentYear || new Date().getFullYear();
  const arabicMonths = [
    'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
    'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const now = new Date();
  const localY = now.getFullYear();
  const localM = String(now.getMonth() + 1).padStart(2, '0');
  const localD = String(now.getDate()).padStart(2, '0');
  const todayStr = `${localY}-${localM}-${localD}`;

  // Robust date parser that handles ISO strings, timestamps, and date strings
  const parsePatientDate = (val?: string): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  // Checks whether a date string falls on today (local time or UTC match)
  const isSameDayToday = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const n = new Date();
    const lY = n.getFullYear();
    const lM = String(n.getMonth() + 1).padStart(2, '0');
    const lD = String(n.getDate()).padStart(2, '0');
    const lTodayPrefix = `${lY}-${lM}-${lD}`;

    const uY = n.getUTCFullYear();
    const uM = String(n.getUTCMonth() + 1).padStart(2, '0');
    const uD = String(n.getUTCDate()).padStart(2, '0');
    const uTodayPrefix = `${uY}-${uM}-${uD}`;

    if (dateStr.startsWith(lTodayPrefix) || dateStr.startsWith(uTodayPrefix)) {
      return true;
    }

    const d = parsePatientDate(dateStr);
    if (!d) return false;

    const matchLocal = (
      d.getFullYear() === lY &&
      d.getMonth() === n.getMonth() &&
      d.getDate() === n.getDate()
    );
    const matchUtc = (
      d.getUTCFullYear() === uY &&
      d.getUTCMonth() === n.getUTCMonth() &&
      d.getUTCDate() === n.getUTCDate()
    );
    return matchLocal || matchUtc;
  };

  const getPatientRegistrationHour = (dateStr?: string): number => {
    if (!dateStr) return -1;
    const d = parsePatientDate(dateStr);
    if (!d) return -1;
    return d.getHours();
  };

  const getWeekRange = () => {
    const d = new Date();
    const day = d.getDay();
    const daysSinceSat = (day + 1) % 7;
    const sat = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceSat);
    const startY = sat.getFullYear();
    const startM = String(sat.getMonth() + 1).padStart(2, '0');
    const startD = String(sat.getDate()).padStart(2, '0');
    const startStr = `${startY}-${startM}-${startD}`;

    const fri = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 6);
    const endY = fri.getFullYear();
    const endM = String(fri.getMonth() + 1).padStart(2, '0');
    const endD = String(fri.getDate()).padStart(2, '0');
    const endStr = `${endY}-${endM}-${endD}`;
    return { startStr, endStr };
  };

  const weekRange = getWeekRange();
  const currentMonthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentYearPrefix = `${new Date().getFullYear()}`;

  const periodData = useMemo(() => {
    const allApts = (appointments && appointments.length > 0)
      ? appointments
      : (stats.todayAppointmentsList || []);

    const isInPeriod = (dateStr?: string) => {
      if (!dateStr) return false;
      if (patientPeriod === 'today') return isSameDayToday(dateStr);
      const d = dateStr.slice(0, 10);
      if (patientPeriod === 'week') return d >= weekRange.startStr && d <= weekRange.endStr;
      if (patientPeriod === 'month') return d.startsWith(currentMonthPrefix);
      if (patientPeriod === 'year') return d.startsWith(currentYearPrefix);
      return false;
    };

    let newPatientsList = patients.filter(p => isInPeriod(p.createdAt));
    let newCount = newPatientsList.length;
    if (patientPeriod === 'month' && newCount === 0 && stats.newPatientsThisMonth > 0) {
      newCount = stats.newPatientsThisMonth;
      newPatientsList = patients.filter(p => p.patientType === 'new');
    }

    const aptsInPeriod = allApts.filter(a => isInPeriod(a.appointmentDate));
    const ptIdsInApts = Array.from(new Set(aptsInPeriod.map(a => a.patientId)));

    // Active intentional follow-up patients (مرضى المتابعة السريرية المقررة)
    const activeFollowUpItems = followUpOverview?.followUp?.list || [];
    const activeFollowUpPatients = activeFollowUpItems
      .map(item => patients.find(p => p.id === item.id))
      .filter((p): p is Patient => !!p);

    const returningMap = new Map<string, Patient>();

    // 1. All patients currently in active follow-up
    activeFollowUpPatients.forEach(p => returningMap.set(p.id, p));

    // 2. Also include returning patients with appointments in this period
    ptIdsInApts
      .map(id => patients.find(p => p.id === id))
      .filter((p): p is Patient => !!p && (p.patientType === 'returning' || !isInPeriod(p.createdAt)))
      .forEach(p => returningMap.set(p.id, p));

    // 3. Overall returning patient status
    if (patientPeriod === 'year' || patientPeriod === 'month') {
      patients.filter(p => p.patientType === 'returning').forEach(p => returningMap.set(p.id, p));
    } else if (patientPeriod === 'today') {
      const todayReturningApts = stats.todayAppointmentsList?.filter(a => {
        const p = patients.find(pt => pt.id === a.patientId);
        return p && p.patientType === 'returning';
      }) || [];
      todayReturningApts.forEach(a => {
        const p = patients.find(pt => pt.id === a.patientId);
        if (p) returningMap.set(p.id, p);
      });
    }

    let returningPatientsList = Array.from(returningMap.values());
    let returningCount = returningPatientsList.length;

    if (activeFollowUpItems.length > 0 && returningCount < activeFollowUpItems.length) {
      returningCount = activeFollowUpItems.length;
    }

    const totalPatientIds = new Set([
      ...newPatientsList.map(p => p.id),
      ...returningPatientsList.map(p => p.id)
    ]);
    let totalInPeriod = totalPatientIds.size;
    if (totalInPeriod === 0) {
      totalInPeriod = newCount + returningCount;
    }
    if (patientPeriod === 'year') {
      totalInPeriod = Math.max(totalInPeriod, patients.length);
    }

    const periodLabels = {
      today: { title: 'اليوم (24/24)', desc: `إحصائيات اليوم على مدار 24 ساعة كاملة (${formatDateDZ(todayStr)})`, tag: '24/24 ساعة' },
      week: { title: 'هذا الأسبوع', desc: `من السبت ${formatDateDZ(weekRange.startStr)} إلى الجمعة ${formatDateDZ(weekRange.endStr)}`, tag: 'هذا الأسبوع' },
      month: { title: `هذا الشهر (${arabicMonths[new Date().getMonth()]})`, desc: `شهر ${arabicMonths[new Date().getMonth()]} ${new Date().getFullYear()}`, tag: 'هذا الشهر' },
      year: { title: `هذه السنة ${currentYear}`, desc: `كامل سنة ${currentYear}`, tag: 'هذه السنة' },
    };

    return {
      newCount,
      newPatientsList,
      returningCount,
      returningPatientsList,
      totalInPeriod,
      totalClinicOverall: patients.length,
      appointmentsCount: aptsInPeriod.length,
      label: periodLabels[patientPeriod],
    };
  }, [patients, appointments, stats, patientPeriod, todayStr, weekRange.startStr, weekRange.endStr, currentMonthPrefix, currentYearPrefix, currentYear, followUpOverview]);

  const [chartTimeframe, setChartTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('year');

  const chartData = useMemo(() => {
    if (chartTimeframe === 'today') {
      // Find all patients registered today
      const todayPatients = patients.filter(p => isSameDayToday(p.createdAt));

      // Strictly 24 hours on 24 hours (00:00 to 23:00) continuous day coverage
      const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

      const data = hoursList.map(h => {
        const hourNum = parseInt(h, 10);
        const count = todayPatients.filter(p => {
          let regHour = getPatientRegistrationHour(p.createdAt);
          if (regHour === -1) {
            regHour = 12;
          }
          return regHour === hourNum;
        }).length;

        return {
          key: h,
          shortLabel: `${h}:00`,
          tooltipTitle: `الساعة ${h}:00 اليوم`,
          newPatients: count,
        };
      });

      const total = data.reduce((sum, d) => sum + d.newPatients, 0);
      const maxItem = data.reduce((max, curr) => curr.newPatients > max.newPatients ? curr : max, data[0]);

      return {
        data,
        total,
        maxLabel: maxItem && maxItem.newPatients > 0 ? maxItem.shortLabel : '-',
        maxCount: maxItem ? maxItem.newPatients : 0,
        avg: (total / 24).toFixed(1),
        avgUnit: 'مريض/ساعة',
        title: `مخطط توافد المرضى الجدد اليوم (${formatDateDZ(todayStr)})`,
        subtitle: 'توزيع تسجيل وتوافد المرضى على مدار 24 ساعة كاملة (24/24 من 00:00 إلى 23:00)',
        totalLabel: 'إجمالي المسجلين اليوم (24/24)',
        peakLabel: 'ساعة الذروة',
      };
    }

    if (chartTimeframe === 'week') {
      const now = new Date();
      const day = now.getDay();
      const daysSinceSat = (day + 1) % 7;
      const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceSat);

      const arabicDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
      const data = [];

      for (let i = 0; i < 7; i++) {
        const cur = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + i);
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;
        const dateFormatted = `${d}/${m}`;

        const count = patients.filter(p => {
          if (!p.createdAt) return false;
          if (p.createdAt.startsWith(dStr)) return true;
          const pd = parsePatientDate(p.createdAt);
          if (!pd) return false;
          const isLocal = pd.getFullYear() === y && (pd.getMonth() + 1) === Number(m) && pd.getDate() === Number(d);
          const isUtc = pd.getUTCFullYear() === y && (pd.getUTCMonth() + 1) === Number(m) && pd.getUTCDate() === Number(d);
          return isLocal || isUtc;
        }).length;

        data.push({
          key: dStr,
          shortLabel: `${arabicDays[i]} (${dateFormatted})`,
          tooltipTitle: `${arabicDays[i]} (${formatDateDZ(dStr)})`,
          newPatients: count,
        });
      }

      const total = data.reduce((sum, d) => sum + d.newPatients, 0);
      const maxItem = data.reduce((max, curr) => curr.newPatients > max.newPatients ? curr : max, data[0]);

      return {
        data,
        total,
        maxLabel: maxItem && maxItem.newPatients > 0 ? maxItem.shortLabel : '-',
        maxCount: maxItem ? maxItem.newPatients : 0,
        avg: (total / 7).toFixed(1),
        avgUnit: 'مريض/يوم',
        title: `مخطط توافد المرضى الجدد هذا الأسبوع`,
        subtitle: `من السبت ${formatDateDZ(weekRange.startStr)} إلى الجمعة ${formatDateDZ(weekRange.endStr)}`,
        totalLabel: 'إجمالي المسجلين هذا الأسبوع',
        peakLabel: 'اليوم الأكثر توافداً',
      };
    }

    if (chartTimeframe === 'month') {
      const now = new Date();
      const yr = now.getFullYear();
      const m = now.getMonth();
      const daysInMonth = new Date(yr, m + 1, 0).getDate();
      const moStr = String(m + 1).padStart(2, '0');
      const data = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const fullDateStr = `${yr}-${moStr}-${dayStr}`;

        const count = patients.filter(p => {
          if (!p.createdAt) return false;
          if (p.createdAt.startsWith(fullDateStr)) return true;
          const pd = parsePatientDate(p.createdAt);
          if (!pd) return false;
          const isLocal = pd.getFullYear() === yr && pd.getMonth() === m && pd.getDate() === day;
          const isUtc = pd.getUTCFullYear() === yr && pd.getUTCMonth() === m && pd.getUTCDate() === day;
          return isLocal || isUtc;
        }).length;

        data.push({
          key: fullDateStr,
          shortLabel: `${day}`,
          tooltipTitle: `يوم ${day} ${arabicMonths[m]} ${yr}`,
          newPatients: count,
        });
      }

      const total = data.reduce((sum, d) => sum + d.newPatients, 0);
      const maxItem = data.reduce((max, curr) => curr.newPatients > max.newPatients ? curr : max, data[0]);

      return {
        data,
        total,
        maxLabel: maxItem && maxItem.newPatients > 0 ? `يوم ${maxItem.shortLabel}` : '-',
        maxCount: maxItem ? maxItem.newPatients : 0,
        avg: (total / daysInMonth).toFixed(1),
        avgUnit: 'مريض/يوم',
        title: `مخطط توافد المرضى الجدد خلال شهر ${arabicMonths[m]} ${yr}`,
        subtitle: `توزيع تسجيل المرضى على مدار أيام الشهر (${daysInMonth} يوماً)`,
        totalLabel: 'إجمالي المسجلين هذا الشهر',
        peakLabel: 'اليوم الأكثر توافداً',
      };
    }

    // Default: 'year' - Always computed from live patients array for immediate reactivity
    const data = arabicMonths.map((mName, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const prefix = `${currentYear}-${monthNum}`;

      const count = patients.filter(p => {
        if (!p.createdAt) return false;
        if (p.createdAt.startsWith(prefix)) return true;
        const pd = parsePatientDate(p.createdAt);
        if (!pd) return false;
        const isLocal = pd.getFullYear() === currentYear && pd.getMonth() === idx;
        const isUtc = pd.getUTCFullYear() === currentYear && pd.getUTCMonth() === idx;
        return isLocal || isUtc;
      }).length;

      return {
        key: monthNum,
        shortLabel: mName,
        tooltipTitle: `شهر ${mName} ${currentYear}`,
        newPatients: count,
      };
    });

    const total = data.reduce((acc, curr) => acc + curr.newPatients, 0);
    const maxItem = data.reduce((max, curr) => curr.newPatients > max.newPatients ? curr : max, data[0]);

    return {
      data,
      total,
      maxLabel: maxItem && maxItem.newPatients > 0 ? maxItem.shortLabel : '-',
      maxCount: maxItem ? maxItem.newPatients : 0,
      avg: (total / 12).toFixed(1),
      avgUnit: 'مريض/شهر',
      title: `مخطط توافد المرضى الجدد خلال شهور سنة ${currentYear}`,
      subtitle: `توزيع تسجيل المرضى الجدد على مدار الـ 12 شهراً`,
      totalLabel: 'إجمالي المرضى الجدد',
      peakLabel: 'الشهر الأنشط',
    };
  }, [chartTimeframe, patients, todayStr, weekRange, currentMonthPrefix, currentYear, arabicMonths]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[160px] text-right">
          <div className="font-bold text-blue-300 mb-1">
            {data.tooltipTitle}
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-200">
            <span>المرضى الجدد:</span>
            <span className="font-bold font-mono text-emerald-400 tabular-nums">
              {payload[0].value} {payload[0].value === 1 ? 'مريض' : payload[0].value === 2 ? 'مريضان' : 'مرضى'}
            </span>
          </div>
          {chartData.total > 0 && (
            <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-800 pt-1 flex items-center justify-between">
              <span>النسبة:</span>
              <span className="font-mono text-blue-400">
                {((payload[0].value / chartData.total) * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const PIE_COLORS = [
    '#2563eb', // Blue 600
    '#0284c7', // Sky 600
    '#4f46e5', // Indigo 600
    '#06b6d4', // Cyan 500
    '#3b82f6', // Blue 500
    '#6366f1', // Indigo 500
    '#0ea5e9', // Sky 500
    '#1d4ed8', // Blue 700
    '#8b5cf6', // Violet 500
    '#0d9488', // Teal 600
    '#10b981', // Emerald 500
    '#64748b', // Slate 500
  ];

  const pieData = useMemo(() => {
    const activeItems = chartData.data.filter(d => d.newPatients > 0);
    if (activeItems.length === 0) return [];
    return activeItems.map((item, idx) => {
      const pct = chartData.total > 0
        ? ((item.newPatients / chartData.total) * 100).toFixed(1)
        : '0';
      return {
        name: item.shortLabel,
        tooltipTitle: item.tooltipTitle,
        value: item.newPatients,
        percentage: pct,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      };
    });
  }, [chartData]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[150px] text-right">
          <div className="font-bold text-blue-300 mb-1">
            {data.tooltipTitle || data.name}
          </div>
          <div className="flex items-center justify-between gap-3 text-slate-200">
            <span>المرضى الجدد:</span>
            <span className="font-bold font-mono text-emerald-400 tabular-nums">
              {data.value} {data.value === 1 ? 'مريض' : data.value === 2 ? 'مريضان' : 'مرضى'}
            </span>
          </div>
          {chartData.total > 0 && (
            <div className="text-[10px] text-slate-400 mt-1.5 border-t border-slate-800 pt-1.5 flex items-center justify-between">
              <span>النسبة المئوية:</span>
              <span className="font-mono text-blue-400 font-bold">
                {data.percentage}%
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const handleApplyFolder = async (pathStr: string) => {
    const clean = pathStr.trim();
    if (!clean) return;
    localPatientStorageService.setFolderDirectly(clean);
    setFolderInfo(localPatientStorageService.getFolderInfo());
    setFolderInputVal(clean);
    setIsFolderModalOpen(false);
    if (onShowToast) {
      onShowToast(`تم اعتماد المجلد بنجاح: "${clean}"`);
    }
    setExportFeedback(`تم اعتماد وتعيين المجلد المحلي بنجاح: "${clean}".`);
    try {
      await clinicApi.updateSettings({ storagePath: clean });
    } catch (e) {
      // client update still effective
    }
  };

  const handleSelectFolder = async () => {
    // 1. Try modern browser directory picker (File System Access API)
    try {
      const res = await localPatientStorageService.selectLocalFolder();
      if (res.success) {
        setFolderInfo(localPatientStorageService.getFolderInfo());
        setFolderInputVal(res.folderName);
        if (onShowToast) onShowToast(res.message);
        setExportFeedback(`تم ربط المجلد المحلي بنجاح: "${res.folderName}".`);
        try {
          await clinicApi.updateSettings({ storagePath: res.folderName });
        } catch (e) {}
        return;
      }
    } catch (e) {
      // ignore and fallback
    }

    // 2. Open interactive selector modal or native dialog
    if (hiddenFolderPickerRef.current) {
      hiddenFolderPickerRef.current.click();
    } else {
      setIsFolderModalOpen(true);
    }
  };

  const handleNativeFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relativePath = (firstFile as any).webkitRelativePath || '';
      const folder = relativePath.split('/')[0] || firstFile.name;
      if (folder) {
        handleApplyFolder(folder);
      }
    } else {
      // If folder was empty, open the modal so user can confirm path
      setIsFolderModalOpen(true);
    }
    if (e.target) e.target.value = '';
  };

  const handleNativeFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const relPath = (file as any).webkitRelativePath || '';
      let folder = relPath ? relPath.split('/')[0] : '';
      if (!folder && file.name) {
        folder = `D:\\ClinicData`;
      }
      if (folder) {
        handleApplyFolder(folder);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleToggleAutoSave = () => {
    const nextState = !folderInfo.autoSaveEnabled;
    localPatientStorageService.setAutoSave(nextState);
    setFolderInfo(localPatientStorageService.getFolderInfo());
    if (onShowToast) {
      onShowToast(nextState ? 'تم تفعيل الحفظ المحلي التلقائي.' : 'تم إيقاف الحفظ المحلي التلقائي.');
    }
  };

  const handleSaveAllPatientsInOneFile = async () => {
    setIsExportingAll(true);
    setExportFeedback(null);
    try {
      const res = await localPatientStorageService.saveAllPatientsInOneFile(
        patients,
        appointments || [],
        conditions || [],
        notes || [],
        files || [],
        settings
      );
      const msg = `تم بنجاح تصدير جميع ملفات المرضى (${res.patientCount} مريض) في ملف أرشيف موحد (${res.fileName})`;
      setExportFeedback(msg);
      if (onShowToast) onShowToast(msg);
    } catch (e: any) {
      setExportFeedback(`خطأ أثناء التصدير: ${e.message}`);
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner for Empty / Brand New Clinic */}
      {patients.length === 0 && (
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-emerald-900 rounded-2xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden border border-blue-700/50">
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>مرحباً بك في منظومة عيادتك الجديدة!</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-white">
                مساحة بيانات عيادتك جاهزة ومستقلة بالكامل
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
                عيادتك حالياً فارغة وجاهزة لاستقبال أول مريض. يمكنك البدء بإضافة ملف أول مريض، أو إضافة موظفيك من قسم &quot;إدارة الفريق&quot; لمساعدتك في حجز المواعيد وإدارة الملفات.
              </p>
            </div>
            <button
              type="button"
              onClick={onAddNewPatient}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold font-heading text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4 text-blue-200" />
              <span>إضافة أول مريض للعيادة</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
            لوحة تحكم وإحصائيات العيادة
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-sans leading-relaxed">
            متابعة فورية للمواعيد، المرضى الجدد والمتابعين، والملفات المحفوظة
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onAddNewPatient}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مريض</span>
          </button>
          <button
            onClick={() => onBookAppointment()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>حجز موعد</span>
          </button>
          <button
            onClick={onQuickBackup}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="تصدير نسخة احتياطية ZIP سريعة"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>نسخ احتياطي</span>
          </button>
        </div>
      </div>

      {/* Patient Follow-up Quick Summary Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-900 font-heading">
              متابعة المرضى والعلاجات
            </span>
            <span className="text-[11px] text-slate-500 block">
              نظرة سريعة على المتابعة والغياب (اضغط على أي رقم لفتح قائمة المتابعة)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigateToFollowUp?.('all')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            title="عرض كل المرضى في صفحة متابعة المرضى"
          >
            <span className="text-slate-500 font-normal">مرضى:</span>
            <span className="font-mono text-slate-900 tabular-nums">
              {followUpOverview?.allPatients.count ?? patients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToFollowUp?.('followUp')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-800 transition-colors cursor-pointer"
            title="عرض المرضى في المتابعة"
          >
            <span className="text-blue-600 font-normal">متابعة المريض:</span>
            <span className="font-mono text-blue-700 tabular-nums">
              {followUpOverview?.followUp.count ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToFollowUp?.('notReturned')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 transition-colors cursor-pointer"
            title="عرض المرضى الذين لم يعودوا أكثر من شهر"
          >
            <span className="text-rose-600 font-normal">لم يعودوا أكثر من شهر:</span>
            <span className="font-mono text-rose-700 tabular-nums">
              {followUpOverview?.notReturned.count ?? 0}
            </span>
          </button>
        </div>
      </div>

      {/* Patient Period Statistics Control & Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
                إحصائيات توافد المرضى على العيادة
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              حساب دقيق لعدد المرضى الجدد والمتابعين ({periodData.label.desc})
            </p>
          </div>

          <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-blue-200/80 shadow-xs gap-1">
            {(['today', 'week', 'month', 'year'] as const).map(pKey => {
              const labelMap = {
                today: 'اليوم (24 س)',
                week: 'هذا الأسبوع',
                month: 'هذا الشهر',
                year: 'هذه السنة',
              };
              const isSelected = patientPeriod === pKey;
              return (
                <button
                  key={pKey}
                  type="button"
                  onClick={() => {
                    setPatientPeriod(pKey);
                    setExpandedCard(null);
                  }}
                  className={`px-4 py-1.5 text-xs font-extrabold rounded-xl transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]'
                      : 'text-slate-600 hover:text-blue-950 hover:bg-white/80'
                  }`}
                >
                  {labelMap[pKey]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. New Patients */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-white p-5 rounded-2xl border-2 border-blue-200 shadow-xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between group">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500"></div>
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold font-heading text-blue-950">مرضى جدد</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold font-mono shadow-2xs">
                    {periodData.label.tag}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-blue-950 tabular-nums font-heading tracking-tight">
                  {periodData.newCount}
                </span>
                <span className="text-xs text-blue-800 font-bold font-heading px-2 py-0.5 bg-blue-100/90 rounded-md border border-blue-200">
                  {periodData.newCount === 1 ? 'مريض جديد' : 'مرضى جدد'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-200/70 flex items-center justify-between text-xs text-blue-900 font-sans">
              <span className="font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                أول زيارة لهم
              </span>
              {periodData.newPatientsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpandedCard(expandedCard === 'new' ? null : 'new')}
                  className="text-[11px] font-extrabold text-blue-800 hover:text-blue-950 bg-blue-100/80 hover:bg-blue-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-blue-300 shadow-2xs cursor-pointer"
                >
                  <span>عرض القائمة ({periodData.newPatientsList.length})</span>
                  {expandedCard === 'new' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          {/* 2. Returning Patients */}
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-500/15 via-blue-500/5 to-white p-5 rounded-2xl border-2 border-sky-300/90 shadow-xs hover:shadow-md hover:border-sky-400 transition-all flex flex-col justify-between group">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-sky-500 via-blue-400 to-cyan-500"></div>
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold font-heading text-sky-950">مرضى متابعون</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-600 text-white font-bold font-mono shadow-2xs">
                    {periodData.label.tag}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-sky-950 tabular-nums font-heading tracking-tight">
                  {periodData.returningCount}
                </span>
                <span className="text-xs text-sky-800 font-bold font-heading px-2 py-0.5 bg-sky-100/90 rounded-md border border-sky-200">
                  مريض متابع
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-sky-200/70 flex items-center justify-between text-xs text-sky-900 font-sans">
              <span className="font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                جلسات متابعة مستمرة
              </span>
              {periodData.returningPatientsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpandedCard(expandedCard === 'returning' ? null : 'returning')}
                  className="text-[11px] font-extrabold text-blue-800 hover:text-blue-950 bg-blue-100/80 hover:bg-blue-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-blue-300 shadow-2xs cursor-pointer"
                >
                  <span>عرض القائمة ({periodData.returningPatientsList.length})</span>
                  {expandedCard === 'returning' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          {/* 3. Total Registered Patients (إجمالي المرضى المسجلين في النظام) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-white p-5 rounded-2xl border-2 border-indigo-200 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between group">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-500"></div>
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold font-heading text-indigo-950">إجمالي المرضى</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-700 text-white font-bold font-mono shadow-2xs">
                    في النظام
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-indigo-950 tabular-nums font-heading tracking-tight">
                  {dbTotalPatients}
                </span>
                <span className="text-xs text-indigo-800 font-bold font-heading px-2 py-0.5 bg-indigo-100/90 rounded-md border border-indigo-200">
                  {dbTotalPatients === 1 ? 'مريض مسجل' : dbTotalPatients === 2 ? 'مريضان مسجلان' : 'مرضى مسجلين'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-indigo-200/70 flex items-center justify-between text-xs text-indigo-900 font-sans">
              <span className="font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                سجلات فريدة بدون تكرار
              </span>
              <span className="text-[11px] font-sans px-2 py-0.5 rounded-md bg-blue-100/90 border border-blue-200 text-blue-900 font-bold">
                السجل الطبي العام
              </span>
            </div>
          </div>

          {/* 4. Today / Selected Date Appointments & Calendar Link */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/15 via-violet-500/6 to-white p-5 rounded-2xl border-2 border-indigo-300/90 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between group">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-400 to-indigo-500"></div>
            <div>
              {/* Header: Title, Date indicator, Return to Today & Calendar picker */}
              <div className="flex items-center justify-between gap-1.5 mb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-extrabold font-heading text-indigo-950">
                    {cardDateStats.isToday ? 'مواعيد اليوم' : 'مواعيد اليوم المحدد'}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono shadow-2xs ${
                      cardDateStats.isToday
                        ? 'bg-indigo-700 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {cardDateStats.isToday ? 'اليوم' : formatDateDZ(selectedCardDate)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Return to Today Button */}
                  {!cardDateStats.isToday && (
                    <button
                      type="button"
                      onClick={() => setSelectedCardDate(getClinicTodayStr())}
                      title="العودة إلى تاريخ اليوم"
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-3 h-3 text-indigo-600" />
                      <span>اليوم</span>
                    </button>
                  )}

                  {/* Calendar Date Picker Trigger */}
                  <label
                    htmlFor="card-calendar-date-input"
                    className="relative w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-all cursor-pointer"
                    title="انقر لاختيار أي تاريخ من التقويم"
                  >
                    <Calendar className="w-4 h-4 pointer-events-none" />
                    <input
                      id="card-calendar-date-input"
                      type="date"
                      value={selectedCardDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedCardDate(e.target.value);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>

              {/* Day Navigation Bar: Previous Day [<] - Current Date Text - Next Day [>] */}
              <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100/90 rounded-xl px-2 py-1 mb-2.5 text-[11px] font-sans">
                <button
                  type="button"
                  onClick={() => setSelectedCardDate(getClinicDateOffsetStr(-1, selectedCardDate))}
                  className="text-indigo-700 hover:text-indigo-950 hover:bg-indigo-100/80 p-1 rounded-md transition-colors cursor-pointer"
                  title="اليوم السابق"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <label
                  htmlFor="card-calendar-date-input"
                  className="font-bold text-indigo-950 flex items-center gap-1 cursor-pointer hover:text-indigo-700 transition-colors"
                  title="انقر لتغيير التاريخ من التقويم"
                >
                  <Clock className="w-3 h-3 text-indigo-500" />
                  <span>{formatClinicDate(selectedCardDate, { includeWeekday: true })}</span>
                </label>

                <button
                  type="button"
                  onClick={() => setSelectedCardDate(getClinicDateOffsetStr(1, selectedCardDate))}
                  className="text-indigo-700 hover:text-indigo-950 hover:bg-indigo-100/80 p-1 rounded-md transition-colors cursor-pointer"
                  title="اليوم التالي"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Main Metric: Total Appointments on Selected Date */}
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-indigo-950 tabular-nums font-heading tracking-tight">
                  {cardDateStats.totalAppointments}
                </span>
                <span className="text-xs text-indigo-800 font-bold font-heading px-2 py-0.5 bg-indigo-100/90 rounded-md border border-indigo-200">
                  {cardDateStats.totalAppointments === 1
                    ? 'موعد مسجل'
                    : cardDateStats.totalAppointments === 2
                    ? 'موعدان مسجلان'
                    : 'مواعيد مسجلة'}
                </span>
              </div>

              {/* Distinct Breakdown: Completed, Scheduled, Cancelled */}
              <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-indigo-100 text-[11px] font-sans">
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg px-2 py-1 flex flex-col items-center">
                  <span className="text-[10px] text-emerald-800 font-bold">مكتملة</span>
                  <span className="font-extrabold font-mono text-emerald-900 text-xs">
                    {cardDateStats.completedAppointments}
                  </span>
                </div>
                <div className="bg-blue-50/80 border border-blue-200 rounded-lg px-2 py-1 flex flex-col items-center">
                  <span className="text-[10px] text-blue-800 font-bold">قادمة</span>
                  <span className="font-extrabold font-mono text-blue-900 text-xs">
                    {cardDateStats.scheduledAppointments}
                  </span>
                </div>
                <div className="bg-rose-50/80 border border-rose-200 rounded-lg px-2 py-1 flex flex-col items-center">
                  <span className="text-[10px] text-rose-800 font-bold">ملغاة</span>
                  <span className="font-extrabold font-mono text-rose-900 text-xs">
                    {cardDateStats.cancelledAppointments}
                  </span>
                </div>
              </div>

              {/* Section 4: Distinct New Patients registered on this date (COMPLETELY SEPARATE) */}
              <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-violet-50/90 border border-violet-200/80 flex items-center justify-between text-xs text-violet-950">
                <span className="flex items-center gap-1.5 font-bold text-[11px]">
                  <UserPlus className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                  مرضى جدد مسجلون:
                </span>
                <span className="font-extrabold font-mono text-violet-900 bg-white px-2 py-0.5 rounded-md border border-violet-200 shadow-2xs text-[11px]">
                  {cardDateStats.newPatientsCount} {cardDateStats.newPatientsCount === 1 ? 'مريض' : 'مرضى'}
                </span>
              </div>
            </div>

            {/* Footer: Toggle List & Book Appointment */}
            <div className="mt-3 pt-3 border-t border-indigo-200/70 flex items-center justify-between text-xs text-indigo-950 font-sans">
              {cardDateStats.totalAppointments > 0 || cardDateStats.newPatientsCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setExpandedCard(expandedCard === 'appointments' ? null : 'appointments')}
                  className="text-[11px] font-extrabold text-indigo-800 hover:text-indigo-950 bg-indigo-100/80 hover:bg-indigo-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-indigo-300 shadow-2xs cursor-pointer"
                >
                  <span>عرض التفاصيل ({cardDateStats.totalAppointments})</span>
                  {expandedCard === 'appointments' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              ) : (
                <span className="text-[11px] text-indigo-800 font-medium">لا توجد مواعيد</span>
              )}

              <button
                type="button"
                onClick={() => onBookAppointment(selectedCardDate)}
                className="text-[11px] font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-3 py-1.5 rounded-lg transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1"
                title={`حجز موعد بتاريخ ${selectedCardDate}`}
              >
                <span>+ حجز</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Details Tray */}
        {expandedCard && (
          <div className={`mt-4 p-5 rounded-2xl border animate-in fade-in duration-200 shadow-xs ${
            expandedCard === 'new'
              ? 'bg-gradient-to-br from-blue-50/80 to-sky-50/40 border-blue-300'
              : expandedCard === 'returning'
              ? 'bg-gradient-to-br from-sky-50/80 to-blue-50/40 border-sky-300'
              : 'bg-gradient-to-br from-indigo-50/80 to-violet-50/40 border-indigo-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  expandedCard === 'new'
                    ? 'bg-blue-600 text-white'
                    : expandedCard === 'returning'
                    ? 'bg-sky-600 text-white'
                    : 'bg-indigo-600 text-white'
                }`}>
                  {expandedCard === 'appointments' ? <Calendar className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <h3 className={`text-sm font-extrabold font-heading ${
                  expandedCard === 'new'
                    ? 'text-blue-950'
                    : expandedCard === 'returning'
                    ? 'text-sky-950'
                    : 'text-indigo-950'
                }`}>
                  {expandedCard === 'new' && `قائمة المرضى الجدد (${periodData.label.desc})`}
                  {expandedCard === 'returning' && `قائمة المرضى المتابعين (${periodData.label.desc})`}
                  {expandedCard === 'appointments' && `تفاصيل مواعيد وتوافد ${formatClinicDate(selectedCardDate, { includeWeekday: true })}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExpandedCard(null)}
                className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
              >
                إغلاق القائمة
              </button>
            </div>

            {expandedCard === 'appointments' ? (
              <div className="space-y-4">
                {/* Appointments list for the day */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    المواعيد المسجلة ({cardDateStats.dayAppointments.length}):
                  </h4>
                  {cardDateStats.dayAppointments.length === 0 ? (
                    <p className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-dashed border-slate-200">
                      لا توجد مواعيد مسجلة في هذا اليوم.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {cardDateStats.dayAppointments.map(apt => {
                        const pt = getPatient(apt.patientId);
                        return (
                          <div
                            key={apt.id}
                            className="bg-white p-3.5 rounded-xl border border-indigo-200/90 shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-extrabold text-xs text-slate-900 truncate">
                                  {pt?.fullName || apt.patientId}
                                </p>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                    apt.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : apt.status === 'cancelled'
                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                      : 'bg-blue-50 text-blue-800 border-blue-200'
                                  }`}
                                >
                                  {apt.status === 'completed' ? 'مكتمل' : apt.status === 'cancelled' ? 'ملغي' : 'قادم'}
                                </span>
                              </div>
                              <p className="text-[11px] font-sans text-slate-600 mt-0.5 truncate">{apt.procedure}</p>
                              <p className="text-[10px] font-mono text-indigo-600 font-bold mt-0.5">{apt.appointmentTime}</p>
                            </div>

                            <div className="flex items-center gap-1">
                              {apt.status === 'scheduled' && onCompleteAppointment && (
                                <button
                                  type="button"
                                  onClick={() => onCompleteAppointment(apt.id)}
                                  title="تعليم كمكتمل"
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenPatientDossier(apt.patientId)}
                                className="px-2.5 py-1 text-[11px] font-extrabold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap shadow-xs transition-colors cursor-pointer"
                              >
                                الملف
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* New Patients created on this date */}
                {cardDateStats.dayNewPatients.length > 0 && (
                  <div className="pt-3 border-t border-indigo-200/70">
                    <h4 className="text-xs font-bold text-violet-900 mb-2 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-violet-600" />
                      مرضى جدد تم فتح ملفاتهم بهذا التاريخ ({cardDateStats.dayNewPatients.length}):
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {cardDateStats.dayNewPatients.map(pt => (
                        <div
                          key={pt.id}
                          className="bg-white p-3 rounded-xl border border-violet-200 shadow-2xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs text-slate-900 truncate">{pt.fullName}</p>
                            <p className="text-[11px] font-mono text-slate-500">{pt.phone || 'بدون هاتف'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenPatientDossier(pt.id)}
                            className="px-2.5 py-1 text-[11px] font-extrabold rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-xs transition-colors cursor-pointer"
                          >
                            الملف
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(expandedCard === 'new' ? periodData.newPatientsList : periodData.returningPatientsList).map(pt => (
                  <div
                    key={pt.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-slate-900 truncate">{pt.fullName}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <p className="text-[11px] font-mono text-slate-500 tabular-nums">{pt.phone || 'بدون هاتف'}</p>
                        {expandedCard === 'returning' && (() => {
                          const flw = followUpOverview?.followUp?.list?.find(f => f.id === pt.id);
                          return flw ? (
                            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded border border-sky-200">
                              متابعة: {flw.followUpReason || 'سريرية نشطة'}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPatientDossier(pt.id)}
                      className="px-3 py-1.5 text-[11px] font-extrabold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shadow-xs transition-colors cursor-pointer"
                    >
                      الملف الطبي
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-Timeframe Patient Influx Chart (Day / Week / Month / Year) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
                {chartData.title}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              {chartData.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Timeframe Switcher Tabs (اليوم / الأسبوع / الشهر / السنة) */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-blue-200/80 shadow-2xs gap-1">
              {[
                { id: 'today', label: 'اليوم (24 ساعة)' },
                { id: 'week', label: 'الأسبوع' },
                { id: 'month', label: 'الشهر' },
                { id: 'year', label: 'السنة' },
              ].map(tf => {
                const isSelected = chartTimeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setChartTimeframe(tf.id as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs font-heading'
                        : 'text-slate-600 hover:text-blue-900 hover:bg-white/80'
                    }`}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>

            {/* Chart Type (Bar / Line) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="مخطط أعمدة"
              >
                <BarChart3 className={`w-3.5 h-3.5 ${chartType === 'bar' ? 'text-white' : 'text-blue-600'}`} />
                <span>أعمدة</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="مخطط بياني متصل"
              >
                <LineChart className={`w-3.5 h-3.5 ${chartType === 'area' ? 'text-white' : 'text-blue-600'}`} />
                <span>منحنى</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Key Indicators */}
        <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
          <span>{chartData.totalLabel}: <strong className="font-mono tabular-nums text-slate-900 font-bold">{chartData.total}</strong> مريض</span>
          <span>•</span>
          <span>المعدل: <strong className="font-mono tabular-nums text-slate-900 font-bold">{chartData.avg}</strong> {chartData.avgUnit}</span>
          <span>•</span>
          <span>{chartData.peakLabel}: <strong className="text-blue-700 font-bold">{chartData.maxLabel}</strong> ({chartData.maxCount} مريض)</span>
        </div>

        {/* Two-Half Grid: Half for Bar/Curve & Half for Proportional Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1 items-stretch">
          {/* Half 1: Bar / Curve Chart */}
          <div className="flex flex-col bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                {chartType === 'bar' ? (
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                ) : (
                  <LineChart className="w-4 h-4 text-blue-600" />
                )}
                <span className="text-xs sm:text-sm font-bold text-slate-800 font-heading">
                  مخطط {chartType === 'bar' ? 'الأعمدة البيانية' : 'المنحنى المتصل'}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                توزيع التوافد الزمني
              </span>
            </div>

            <div className="w-full h-72 sm:h-80 pt-1" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart
                    data={chartData.data}
                    margin={{ top: 15, right: 15, left: -15, bottom: 15 }}
                  >
                    <defs>
                      <linearGradient id="patientBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.65} />
                      </linearGradient>
                      <linearGradient id="activeBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1d4ed8" stopOpacity={1} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      stroke="#94a3b8"
                      fontSize={chartTimeframe === 'month' || chartTimeframe === 'today' ? 10 : 11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tick={{ fill: '#64748b', fontWeight: 500 }}
                      interval={chartTimeframe === 'month' ? 2 : chartTimeframe === 'today' ? 1 : 0}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tick={{ fill: '#64748b' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
                    <Bar
                      dataKey="newPatients"
                      name="المرضى الجدد"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={chartTimeframe === 'month' ? 16 : chartTimeframe === 'today' ? 22 : 40}
                      fill="url(#patientBarGrad)"
                    >
                      {chartData.data.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.newPatients === chartData.maxCount && entry.newPatients > 0 ? 'url(#activeBarGrad)' : 'url(#patientBarGrad)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <AreaChart
                    data={chartData.data}
                    margin={{ top: 15, right: 15, left: -15, bottom: 15 }}
                  >
                    <defs>
                      <linearGradient id="patientAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      stroke="#94a3b8"
                      fontSize={chartTimeframe === 'month' || chartTimeframe === 'today' ? 10 : 11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tick={{ fill: '#64748b', fontWeight: 500 }}
                      interval={chartTimeframe === 'month' ? 2 : chartTimeframe === 'today' ? 1 : 0}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tick={{ fill: '#64748b' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="newPatients"
                      name="المرضى الجدد"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#patientAreaGrad)"
                      activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Half 2: Proportional Pie / Donut Chart */}
          <div className="flex flex-col bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <PieChartLucide className="w-4 h-4 text-blue-600" />
                <span className="text-xs sm:text-sm font-bold text-slate-800 font-heading">
                  الدائرة النسبية لتوزيع المرضى
                </span>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200/60 font-mono shadow-2xs">
                النسب المئوية %
              </span>
            </div>

            {pieData.length === 0 ? (
              <div className="h-72 sm:h-80 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-3 bg-white">
                  <PieChartLucide className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  لا توجد تسجيلات مرضى في هذه الفترة
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  عند تسجيل مرضى جدد في {chartData.title}، سيتم حساب النسب المئوية وتوزيع الحصص تلقائياً داخل الدائرة النسبية.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
                {/* Donut Chart with Center Summary */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex-shrink-0" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={pieData.length > 1 ? 2.5 : 0}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center of Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl sm:text-3xl font-black text-slate-800 font-mono tabular-nums leading-none">
                      {chartData.total}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 font-bold mt-1">
                      إجمالي المرضى
                    </span>
                  </div>
                </div>

                {/* Slices Legend / Breakdown List */}
                <div className="flex-1 w-full max-h-64 sm:max-h-72 overflow-y-auto pr-1 pl-1 space-y-1.5 custom-scrollbar">
                  {pieData.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-2xs transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-black/5"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-bold text-slate-800 truncate" title={item.tooltipTitle || item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0 mr-2">
                        <span className="text-slate-600 font-mono text-[11px] tabular-nums">
                          {item.value} {item.value === 1 ? 'مريض' : item.value === 2 ? 'مريضان' : 'مرضى'}
                        </span>
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/70 tabular-nums">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointments Lists & LAN Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Appointments Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
                    مواعيد وجلسات اليوم ({new Date().toLocaleDateString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-mono font-bold border border-blue-200">
                    {stats.todayAppointmentsList.length} مواعيد
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-sans">
                  قائمة المرضى المسجلين لزيارة العيادة اليوم
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onBookAppointment()}
                  className="text-xs text-white bg-blue-600 hover:bg-blue-700 font-bold font-heading flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <span>+ حجز موعد</span>
                </button>
              </div>
            </div>

            {stats.todayAppointmentsList.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold font-heading text-slate-700">لا توجد مواعيد مجدولة لهذا اليوم</p>
                <p className="text-xs text-slate-400 mt-1">يمكنك إضافة مواعيد جديدة بالضغط على زر &quot;حجز موعد&quot;</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-heading font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 font-heading font-bold">التوقيت</th>
                      <th className="py-3.5 px-4 font-heading font-bold">اسم المريض</th>
                      <th className="py-3.5 px-4 font-heading font-bold">الهاتف</th>
                      <th className="py-3.5 px-4 font-heading font-bold">نوع الإجراء الطبي</th>
                      <th className="py-3.5 px-4 font-heading font-bold">الحالة</th>
                      <th className="py-3.5 px-4 font-heading font-bold text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.todayAppointmentsList.map(apt => {
                      const patient = getPatient(apt.patientId);
                      const isCompleted = apt.status === 'completed';
                      const isCancelled = apt.status === 'cancelled';
                      return (
                        <tr
                          key={apt.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 tabular-nums text-sm">
                            {apt.appointmentTime}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => onOpenPatientDossier(apt.patientId)}
                              className="font-bold text-blue-700 hover:text-blue-950 hover:underline text-right block cursor-pointer"
                            >
                              {patient ? patient.fullName : 'مريض غير مسجل'}
                            </button>
                            {patient && (
                              <span className="text-[11px] text-slate-500">
                                {patient.patientType === 'new' ? 'مريض جديد' : 'مريض متابع'}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600">
                            {patient?.phone ? (
                              <a
                                href={`tel:${patient.phone}`}
                                className="flex items-center gap-1 hover:text-blue-600"
                                title="اتصال هاتفي"
                              >
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{patient.phone}</span>
                              </a>
                            ) : '-'}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800">
                            {apt.procedure}
                          </td>
                          <td className="py-3.5 px-4">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                مكتمل
                              </span>
                            ) : isCancelled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700">
                                ملغى
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                <Clock className="w-3 h-3 text-slate-500" />
                                مجدول
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!isCompleted && !isCancelled && (
                                <button
                                  onClick={() => onCompleteAppointment(apt.id)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition-colors whitespace-nowrap shadow-xs cursor-pointer"
                                  title="تحديد الموعد كمكتمل"
                                >
                                  إتمام
                                </button>
                              )}
                              <button
                                onClick={() => onOpenPatientDossier(apt.patientId)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
                              >
                                الملف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
                المواعيد القادمة للأيام القادمة
              </h2>
              <span className="text-xs text-slate-500 font-sans mt-0.5 block">
                استعراض جدول الأعمال للأيام المقبلة
              </span>
            </div>
            {stats.upcomingAppointmentsList.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                لا توجد مواعيد قادمة مجدولة بعد اليوم.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-heading font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-heading font-bold">التاريخ</th>
                      <th className="py-3 px-4 font-heading font-bold">الوقت</th>
                      <th className="py-3 px-4 font-heading font-bold">اسم المريض</th>
                      <th className="py-3 px-4 font-heading font-bold">الإجراء الطبي</th>
                      <th className="py-3 px-4 font-heading font-bold text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.upcomingAppointmentsList.map(apt => {
                      const patient = getPatient(apt.patientId);
                      return (
                        <tr key={apt.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-700 tabular-nums">
                            {formatDateDZ(apt.appointmentDate)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                            {apt.appointmentTime}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {patient ? patient.fullName : 'مريض غير مسجل'}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {apt.procedure}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => onOpenPatientDossier(apt.patientId)}
                              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                            >
                              عرض الملف
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Info Cards */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-5 h-5 text-blue-300" />
              <h3 className="text-sm font-bold">
                ربط الأجهزة على شبكة العيادة (LAN)
              </h3>
            </div>
            <p className="text-xs text-blue-100 leading-relaxed mb-4">
              يمكن لجميع أجهزة العيادة (كمبيوتر المساعد، التابلت، اللابتوب) الدخول إلى لوحة التحكم من خلال الرابط الداخلي:
            </p>
            <div className="bg-blue-950/80 p-3 rounded-lg border border-blue-700/60 font-mono text-xs text-blue-200 select-all mb-3 text-center" dir="ltr">
              {networkInfo.networkUrls[0] || `http://${networkInfo.primaryLanIp}:3000`}
            </div>
            <div className="text-[11px] text-blue-200 space-y-1">
              <p>• يعمل بالكامل على الراوتر الداخلي (WiFi أو كابل LAN).</p>
              <p>• تزامن لحظي بين جهاز الطبيب وجهاز الاستقبال.</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800">
              توجيهات النسخ الاحتياطي اليومي:
            </div>
            <p>• يتم حفظ كافة البيانات محلياً داخل مجلد العيادة على القرص الصلب.</p>
            <p>• احرص على الضغط على زر &quot;نسخ احتياطي&quot; يومياً بنهاية العمل.</p>
            <p>• احتفظ بملف الـ ZIP على فلاش ديسك USB خارجي لحماية البيانات.</p>
          </div>
        </div>
      </div>

      {/* Local Storage on Device & Master Export Hub */}
      <div className="bg-white rounded-2xl border-2 border-blue-200/90 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <HardDrive className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
                مركز التخزين المحلي الآمن والأرشيف الموحد
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-300">
                حفظ محلي 100%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              حفظ ملفات المرضى محلياً داخل مجلد مخصص على جهاز الكمبيوتر الخاص بك لحماية البيانات الطبية
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors">
              <input
                type="checkbox"
                checked={folderInfo.autoSaveEnabled}
                onChange={handleToggleAutoSave}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">
                الحفظ التلقائي عند التعديل
              </span>
            </label>
          </div>
        </div>

        {exportFeedback && (
          <div className="p-3 bg-blue-50 border border-blue-300 rounded-xl text-xs font-bold text-blue-900 flex items-center justify-between animate-in fade-in">
            <span>{exportFeedback}</span>
            <button
              onClick={() => setExportFeedback(null)}
              className="text-blue-700 hover:text-blue-950 font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Select Storage Folder */}
          <div className="bg-gradient-to-br from-blue-50/70 to-slate-50 p-4 sm:p-5 rounded-xl border-2 border-blue-200/90 flex flex-col justify-between space-y-3.5 shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-heading text-blue-950 flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-blue-600" />
                  مجلد الحفظ المحلي المعتمد
                </span>
                {folderInfo.folderName ? (
                  <span className="text-[11px] px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-full border border-blue-300 flex items-center gap-1 shadow-2xs">
                    <Check className="w-3 h-3" />
                    مجلد نشط ومعتمد
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 bg-slate-200 text-slate-700 font-bold rounded-full">
                    المجلد الافتراضي
                  </span>
                )}
              </div>

              {/* Direct interactive editable input with instant confirm */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-blue-600">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      dir="ltr"
                      value={folderInputVal}
                      onChange={(e) => setFolderInputVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyFolder(folderInputVal);
                      }}
                      placeholder="مثال: D:\ClinicData أو C:\DentalClinic"
                      className="w-full pl-3 pr-9 py-2 bg-white border-2 border-blue-300 hover:border-blue-400 focus:border-blue-500 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner transition-all"
                      title="اكتب أو عدل مسار المجلد مباشرة ثم اضغط اعتماد"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyFolder(folderInputVal)}
                    title="حفظ واعتماد هذا المسار"
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>اعتماد</span>
                  </button>
                </div>

                {/* Quick 1-click presets right on the card */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  <span className="text-[10px] font-bold text-slate-500">مجلدات سريعة:</span>
                  {[
                    { label: 'القرص D', path: 'D:\\ClinicData' },
                    { label: 'القرص C', path: 'C:\\ClinicData' },
                    { label: 'المستندات', path: 'Documents\\DentalClinic' },
                    { label: 'سطح المكتب', path: 'Desktop\\ClinicData' },
                  ].map(chip => (
                    <button
                      key={chip.path}
                      type="button"
                      onClick={() => handleApplyFolder(chip.path)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all border cursor-pointer ${
                        folderInputVal === chip.path
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                          : 'bg-white hover:bg-blue-50 text-slate-700 border-blue-200 hover:border-blue-300'
                      }`}
                      title={`اعتماد ${chip.path} مباشرة`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
                  يتم حفظ نسخ رقمية من ملفات المرضى، التقارير الطبية والنسخ الاحتياطية داخل هذا المجلد المعتمد.
                </p>
              </div>
            </div>

            {/* Hidden native directory input */}
            <input
              type="file"
              ref={hiddenFolderPickerRef}
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple={false}
              className="hidden"
              onChange={handleNativeFolderSelected}
            />
            {/* Hidden native file input fallback */}
            <input
              type="file"
              ref={hiddenFilePickerRef}
              className="hidden"
              onChange={handleNativeFileSelected}
            />

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(true)}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="فتح نافذة خيارات وتحديد المجلدات"
              >
                <FolderCheck className="w-4 h-4" />
                <span>اختيار / تغيير المجلد</span>
              </button>

              <button
                type="button"
                onClick={handleSelectFolder}
                className="py-2.5 px-3 bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 hover:border-blue-400 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="فتح مستعرض ملفات الجهاز لتحديد مجلد"
              >
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span>استعراض جهازك 📂</span>
              </button>
            </div>
          </div>

          {/* Card 2: Save All in One File */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 p-4 sm:p-5 rounded-xl border border-indigo-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-heading text-indigo-950 flex items-center gap-1.5">
                  <FileArchive className="w-4 h-4 text-indigo-600" />
                  أرشيف شامل لجميع المرضى
                </span>
                <span className="text-[11px] px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold font-mono rounded-full border border-indigo-300">
                  {patients.length} مريض
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                تجميع وتنزيل كافة سجلات العيادة، المرضى، المواعيد، وحالات الأسنان في ملف واحد مضغوط (ZIP) للاحتفاظ بنسخة خارجية.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                disabled={isExportingAll || patients.length === 0}
                onClick={handleSaveAllPatientsInOneFile}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-700/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isExportingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ حزم {patients.length} مريض...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>تنزيل أرشيف المرضى الشامل (ZIP موحد)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FOLDER SELECTION MODAL */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Folder className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900">
                    تحديد مجلد الحفظ المحلي المعتمد
                  </h3>
                  <p className="text-xs text-slate-500">
                    اختر أي قرص ومجلد على جهازك لحفظ تقارير وبيانات المرضى
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="text-slate-400 hover:text-blue-600 font-bold p-1 rounded-md cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Option 1: Fast Visual Drive & Subfolder Builder */}
              <div className="p-3.5 bg-gradient-to-br from-blue-50/80 to-slate-50 border border-blue-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5 font-heading">
                    <HardDrive className="w-4 h-4 text-blue-700" />
                    الخيار 1: اختيار القرص والمجلد فوراً
                  </span>
                  <span className="text-[10px] text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 font-bold">
                    سريع ومباشر
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">اختر القرص:</span>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs font-mono">
                    {[
                      { drive: 'D:\\', label: 'القرص D:' },
                      { drive: 'C:\\', label: 'القرص C:' },
                      { drive: 'E:\\', label: 'القرص E:' },
                      { drive: 'Documents\\', label: 'المستندات' },
                      { drive: 'Desktop\\', label: 'سطح المكتب' },
                    ].map(d => (
                      <button
                        key={d.drive}
                        type="button"
                        onClick={() => {
                          setModalSelectedDrive(d.drive);
                          const combined = `${d.drive}${modalCustomSubfolder}`;
                          setFolderInputVal(combined);
                        }}
                        className={`p-1.5 rounded-lg border text-center font-bold transition-all cursor-pointer ${
                          modalSelectedDrive === d.drive
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 block">اسم المجلد المطلوب:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      dir="ltr"
                      value={modalCustomSubfolder}
                      onChange={(e) => {
                        const val = e.target.value;
                        setModalCustomSubfolder(val);
                        setFolderInputVal(`${modalSelectedDrive}${val}`);
                      }}
                      placeholder="ClinicData أو DentalClinic"
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyFolder(`${modalSelectedDrive}${modalCustomSubfolder}`)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>اعتماد هذا المجلد</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-blue-900 bg-white/90 p-2 rounded-lg border border-blue-200 font-mono truncate" dir="ltr">
                  المسار المختار: <strong className="text-blue-700">{modalSelectedDrive}{modalCustomSubfolder}</strong>
                </div>
              </div>

              {/* Option 2: Native OS Browser / File Selector */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                    الخيار 2: استعراض مجلدات نظام التشغيل
                  </span>
                  <span className="text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                    مستكشف الملفات
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (hiddenFolderPickerRef.current) {
                        hiddenFolderPickerRef.current.click();
                      } else {
                        handleSelectFolder();
                      }
                    }}
                    className="py-2 px-3 bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 hover:border-blue-400 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
                  >
                    <FolderOpen className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span>تصفح مجلدات جهازك 📂</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (hiddenFilePickerRef.current) {
                        hiddenFilePickerRef.current.click();
                      }
                    }}
                    className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="اختر أي ملف داخل المجلد المطلوب لاستخراجه"
                  >
                    <Save className="w-4 h-4 text-slate-600" />
                    <span>تحديد ملف داخل المجلد 📄</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Custom Text Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block font-heading">
                  الخيار 3: كتابة أو لصق المسار كاملاً:
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={folderInputVal}
                  onChange={(e) => setFolderInputVal(e.target.value)}
                  placeholder="مثال: D:\DentalClinic أو C:\ClinicData"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-bold"
                />
              </div>

              {/* Option 4: Fast Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">
                  أو اختر أحد المجلدات المقترحة بنقرة واحدة:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'القرص D (بيانات العيادة)', path: 'D:\\ClinicData' },
                    { label: 'القرص C (بيانات العيادة)', path: 'C:\\ClinicData' },
                    { label: 'المستندات (Documents)', path: 'Documents\\DentalClinic' },
                    { label: 'سطح المكتب (Desktop)', path: 'Desktop\\ClinicData' },
                    { label: 'القرص E (ملفات المرضى)', path: 'E:\\DentalClinic' },
                    { label: 'المجلد الافتراضي للعيادة', path: 'clinic_data/patient_files' },
                  ].map(item => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        setFolderInputVal(item.path);
                        handleApplyFolder(item.path);
                      }}
                      className={`p-2 rounded-lg border text-right transition-all cursor-pointer font-sans ${
                        folderInputVal === item.path
                          ? 'bg-blue-100 border-blue-400 text-blue-950 font-bold'
                          : 'bg-slate-50 hover:bg-blue-50/60 border-slate-200 text-slate-700 text-[11px]'
                      }`}
                    >
                      <div className="font-bold truncate">{item.label}</div>
                      <div className="font-mono text-[10px] text-slate-400 truncate" dir="ltr">{item.path}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleApplyFolder(folderInputVal)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد واعتماد هذا المجلد</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
