import React, { useState, useEffect, useMemo } from 'react';
import {
  FinancialStats,
  Appointment,
  Patient,
  ClinicSettings,
  Invoice,
  InvoicePayment,
} from '../types';
import { clinicApi } from '../services/api';
import {
  getClinicTodayStr,
  getClinicYear,
  getClinicMonthPrefix,
  getClinicWeekRange,
  getClinicDateOffsetStr,
  ALGERIAN_ARABIC_MONTHS,
} from '../utils/clinicDate';
import {
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  Receipt,
  BarChart3,
  Printer,
  RefreshCw,
  Search,
  Check,
  X,
  FileSpreadsheet,
  FileDown,
  ChevronDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  Wallet,
  CreditCard,
  Plus,
  Eye,
  PieChart as PieChartIcon,
  User,
  Phone,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  Building2,
  Layers,
  Banknote,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface FinancialReportProps {
  patients: Patient[];
  appointments: Appointment[];
  settings: ClinicSettings;
  onOpenPatientDossier: (patientId: string) => void;
  onUpdateAppointment?: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onRefreshAllData: () => Promise<void>;
  financialRefreshKey?: number;
}

type PeriodFilterType = 'month' | 'week' | 'today' | 'year' | 'all' | 'custom';
type TabType = 'overview' | 'revenues' | 'debts' | 'detailed';

// Standard colors matching the SaaS Healthcare design
const TREATMENT_COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#64748b'];
const PAYMENT_METHOD_COLORS: Record<string, string> = {
  cash: '#10b981',      // Emerald / Cash
  baridimob: '#3b82f6', // Blue / Card / BaridiMob
  check: '#f59e0b',     // Amber / Check
};

interface RevenueEvolutionChartProps {
  data: Array<{ name: string; revenue: number; count: number }>;
  chartType: 'area' | 'bar';
  formatDZD: (amount: number) => string;
}

const RevenueEvolutionChart: React.FC<RevenueEvolutionChartProps> = ({
  data,
  chartType,
  formatDZD,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 650;
  const height = 240;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 32;
  const paddingBottom = 42;

  const plotLeft = paddingLeft;
  const plotRight = width - paddingRight;
  const plotTop = paddingTop;
  const plotBottom = height - paddingBottom;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  // Max Revenue & Y Ticks (matches user screenshot exactly when max is 0: [0, 1000, 2000, 3000])
  const maxRevenue = useMemo(() => {
    return Math.max(0, ...data.map((d) => d.revenue || 0));
  }, [data]);

  const yTicksConfig = useMemo(() => {
    if (maxRevenue <= 0) {
      return {
        max: 3000,
        ticks: [0, 1000, 2000, 3000],
      };
    }
    const rawStep = maxRevenue / 3;
    const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / power;
    let niceFraction = 1;
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 2.5) niceFraction = 2.5;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;

    const step = niceFraction * power;
    let niceMax = Math.ceil(maxRevenue / step) * step;
    if (niceMax <= maxRevenue) {
      niceMax += step;
    }

    const ticks: number[] = [];
    for (let v = 0; v <= niceMax + step * 0.01; v += step) {
      ticks.push(Math.round(v));
    }
    return { max: niceMax, ticks };
  }, [maxRevenue]);

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(val, yTicksConfig.max));
    return plotBottom - (clamped / yTicksConfig.max) * plotHeight;
  };

  const N = Math.max(1, data.length);
  const deltaX = plotWidth / N;

  const points = useMemo(() => {
    return data.map((item, idx) => {
      const x = plotLeft + (idx + 1) * deltaX;
      const y = getY(item.revenue || 0);
      return {
        ...item,
        x,
        y,
        idx,
      };
    });
  }, [data, deltaX, yTicksConfig.max, plotLeft, plotBottom, plotHeight]);

  const originX = plotLeft;

  // Smooth spline path for Area / Line curve
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };

    const allPts = [{ x: originX, y: plotBottom }, ...points.map((p) => ({ x: p.x, y: p.y }))];

    if (allPts.length === 1) {
      return { linePath: `M ${allPts[0].x} ${allPts[0].y}`, areaPath: '' };
    }

    let d = `M ${allPts[0].x.toFixed(1)} ${allPts[0].y.toFixed(1)}`;
    for (let i = 0; i < allPts.length - 1; i++) {
      const p0 = allPts[i === 0 ? 0 : i - 1];
      const p1 = allPts[i];
      const p2 = allPts[i + 1];
      const p3 = allPts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const lastX = allPts[allPts.length - 1].x;
    const firstX = allPts[0].x;
    const aPath = `${d} L ${lastX.toFixed(1)} ${plotBottom} L ${firstX.toFixed(1)} ${plotBottom} Z`;

    return { linePath: d, areaPath: aPath };
  }, [points, originX, plotBottom]);

  return (
    <div className="relative w-full h-full select-none" dir="ltr">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="blueRevGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
            <stop offset="90%" stopColor="#2563eb" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* 1. Horizontal Grid Lines & Y-Axis Ticks */}
        {yTicksConfig.ticks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={`y-tick-${tick}`}>
              {/* Horizontal gridline (for ticks above 0) */}
              {tick > 0 && (
                <line
                  x1={plotLeft}
                  y1={y}
                  x2={plotRight + 18}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1.2"
                />
              )}
              {/* Y-axis tick mark */}
              <line
                x1={plotLeft - 6}
                y1={y}
                x2={plotLeft}
                y2={y}
                stroke="#0f172a"
                strokeWidth="1.6"
              />
              {/* Y-axis tick number label */}
              <text
                x={plotLeft - 10}
                y={y + 4.5}
                textAnchor="end"
                fill="#0f172a"
                fontSize="12.5"
                fontFamily="sans-serif"
                fontWeight="500"
              >
                {tick.toLocaleString('en-US')}
              </text>
            </g>
          );
        })}

        {/* 2. Top Currency Label (د.ج) above Y-Axis */}
        <text
          x={plotLeft - 2}
          y={plotTop - 12}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="13"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          د.ج
        </text>

        {/* 3. Y-Axis Solid Vertical Line */}
        <line
          x1={plotLeft}
          y1={plotTop - 5}
          x2={plotLeft}
          y2={plotBottom}
          stroke="#0f172a"
          strokeWidth="1.8"
        />

        {/* 4. X-Axis Solid Horizontal Line */}
        <line
          x1={plotLeft}
          y1={plotBottom}
          x2={plotRight + 18}
          y2={plotBottom}
          stroke="#0f172a"
          strokeWidth="1.8"
        />

        {/* 5. Origin Tick & Label (0) right at the intersection */}
        <g>
          <line
            x1={plotLeft}
            y1={plotBottom}
            x2={plotLeft}
            y2={plotBottom + 6}
            stroke="#0f172a"
            strokeWidth="1.6"
          />
          <text
            x={plotLeft}
            y={plotBottom + 23}
            textAnchor="middle"
            fill="#0f172a"
            fontSize="14"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            0
          </text>
        </g>

        {/* 6. X-Axis Ticks & Period Labels for data items */}
        {points.map((p) => (
          <g key={`x-tick-${p.idx}`}>
            <line
              x1={p.x}
              y1={plotBottom}
              x2={p.x}
              y2={plotBottom + 6}
              stroke="#0f172a"
              strokeWidth="1.6"
            />
            <text
              x={p.x}
              y={plotBottom + 23}
              textAnchor="middle"
              fill="#0f172a"
              fontSize="12.5"
              fontWeight="600"
              fontFamily="sans-serif"
            >
              {p.name}
            </text>
          </g>
        ))}

        {/* 7. Hover Guide Vertical Line */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <line
            x1={points[hoveredIndex].x}
            y1={plotTop}
            x2={points[hoveredIndex].x}
            y2={plotBottom}
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        {/* 8. Data Representation: Area / Curve or Bar */}
        {chartType === 'area' ? (
          <>
            {/* Shaded Area fill if there is non-zero revenue */}
            {maxRevenue > 0 && areaPath && (
              <path d={areaPath} fill="url(#blueRevGradient)" />
            )}

            {/* Continuous Blue Curve line */}
            <path
              d={linePath}
              fill="none"
              stroke="#0066ff"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Blue Circular Dots ONLY on the data points. NO DOT AT 0! */}
            {points.map((p) => {
              const isHovered = hoveredIndex === p.idx;
              return (
                <circle
                  key={`dot-${p.idx}`}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 7.5 : 5.5}
                  fill="#0066ff"
                  stroke={maxRevenue > 0 ? '#ffffff' : '#0066ff'}
                  strokeWidth={maxRevenue > 0 ? 2.5 : 0}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(p.idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </>
        ) : (
          /* Bar Chart Mode */
          points.map((p) => {
            const barWidth = Math.min(42, Math.max(22, deltaX * 0.45));
            const barHeight = Math.max(0, plotBottom - p.y);
            const isHovered = hoveredIndex === p.idx;
            return (
              <rect
                key={`bar-${p.idx}`}
                x={p.x - barWidth / 2}
                y={p.y}
                width={barWidth}
                height={barHeight || 3}
                fill={isHovered ? '#2563eb' : '#3b82f6'}
                rx="6"
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(p.idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })
        )}
      </svg>

      {/* Floating Interactive Tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-xl text-xs backdrop-blur-sm border border-slate-700/60 transition-all duration-150"
          style={{
            left: `${(points[hoveredIndex].x / width) * 100}%`,
            top: `${(points[hoveredIndex].y / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
          }}
          dir="rtl"
        >
          <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">
            {points[hoveredIndex].name}
          </div>
          <div className="font-extrabold text-blue-400 font-mono text-sm">
            {formatDZD(points[hoveredIndex].revenue)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {points[hoveredIndex].count} دفعة مسجلة
          </div>
        </div>
      )}
    </div>
  );
};

export const FinancialReport: React.FC<FinancialReportProps> = ({
  patients,
  appointments,
  settings,
  onOpenPatientDossier,
  onUpdateAppointment,
  onRefreshAllData,
  financialRefreshKey,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'baridimob' | 'check'>('all');

  // Quick Payment Modal State
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'baridimob' | 'check'>('cash');
  const [paymentDate, setPaymentDate] = useState<string>(getClinicTodayStr());
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Receipt Voucher Print Modal State
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<InvoicePayment | null>(null);

  // Fetch invoices and stats from API
  const loadFinancialData = async () => {
    try {
      const [fetchedInvoices, stats] = await Promise.all([
        clinicApi.getInvoices(),
        clinicApi.getFinancialStats(),
      ]);
      setInvoices(fetchedInvoices || []);
      setFinancialStats(stats);
    } catch (err) {
      console.error('Failed to load financial records:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [appointments, financialRefreshKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshAllData();
    await loadFinancialData();
  };

  const formatDZD = (amount: number): string => {
    const formatted = new Intl.NumberFormat('fr-DZ', {
      maximumFractionDigits: 0,
    }).format(amount || 0);
    return `${formatted} د.ج`;
  };

  const formatDateDZ = (dateStr?: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getPatient = (id: string): Patient | undefined => {
    return patients.find(p => p.id === id);
  };

  // 1. Unified Reactive Period Range Calculation
  const periodRange = useMemo(() => {
    const now = new Date();
    const todayStr = getClinicTodayStr(now);
    const { saturdayStr, fridayStr } = getClinicWeekRange(now);
    const currentYearStr = String(getClinicYear(now));
    const currentMonthPrefix = getClinicMonthPrefix(now);

    const yearNum = parseInt(currentMonthPrefix.slice(0, 4), 10);
    const monthNum = parseInt(currentMonthPrefix.slice(5, 7), 10);
    const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();
    const monthStart = `${currentMonthPrefix}-01`;
    const monthEnd = `${currentMonthPrefix}-${String(lastDayOfMonth).padStart(2, '0')}`;

    let start = '1970-01-01';
    let end = '2099-12-31';

    if (periodFilter === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (periodFilter === 'week') {
      start = saturdayStr;
      end = fridayStr;
    } else if (periodFilter === 'month') {
      start = monthStart;
      end = monthEnd;
    } else if (periodFilter === 'year') {
      start = `${currentYearStr}-01-01`;
      end = `${currentYearStr}-12-31`;
    } else if (periodFilter === 'custom') {
      const s = customStartDate || `${currentMonthPrefix}-01`;
      const e = customEndDate || todayStr;
      if (s <= e) {
        start = s;
        end = e;
      } else {
        start = e;
        end = s;
      }
    } else {
      // all
      start = '1970-01-01';
      end = '2099-12-31';
    }

    return {
      start,
      end,
      todayStr,
      saturdayStr,
      fridayStr,
      currentYearStr,
      currentMonthPrefix,
      lastDayOfMonth,
      yearNum,
      monthNum,
    };
  }, [periodFilter, customStartDate, customEndDate]);

  // Helper to test if a date string falls in the selected range
  const isDateInPeriod = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const d = dateStr.slice(0, 10);
    return d >= periodRange.start && d <= periodRange.end;
  };

  // Flattened Payment Transactions
  interface PaymentTransactionItem {
    id: string;
    invoiceId: string;
    patientId: string;
    patientName: string;
    patientPhone?: string;
    treatmentDescription: string;
    date: string;
    amount: number;
    paymentMethod: 'cash' | 'baridimob' | 'check';
    note?: string;
    recordedBy?: string;
    createdAt: string;
    invoiceTotal: number;
    invoiceRemaining: number;
  }

  const allTransactions = useMemo<PaymentTransactionItem[]>(() => {
    const list: PaymentTransactionItem[] = [];
    for (const inv of invoices) {
      const p = getPatient(inv.patientId);
      const patientName = p?.fullName || 'مريض غير مسجل';
      const patientPhone = p?.phone || '';

      if (Array.isArray(inv.payments) && inv.payments.length > 0) {
        for (const pay of inv.payments) {
          list.push({
            id: pay.id,
            invoiceId: inv.id,
            patientId: inv.patientId,
            patientName,
            patientPhone,
            treatmentDescription: inv.description,
            date: pay.date || inv.date,
            amount: pay.amount || 0,
            paymentMethod: pay.paymentMethod || inv.paymentMethod || 'cash',
            note: pay.note,
            recordedBy: pay.recordedBy,
            createdAt: pay.createdAt,
            invoiceTotal: inv.totalAmount,
            invoiceRemaining: inv.remainingAmount,
          });
        }
      } else if (inv.paidAmount > 0) {
        list.push({
          id: `pay-seed-${inv.id}`,
          invoiceId: inv.id,
          patientId: inv.patientId,
          patientName,
          patientPhone,
          treatmentDescription: inv.description,
          date: inv.date,
          amount: inv.paidAmount,
          paymentMethod: inv.paymentMethod || 'cash',
          note: inv.notes,
          createdAt: inv.createdAt,
          invoiceTotal: inv.totalAmount,
          invoiceRemaining: inv.remainingAmount,
        });
      }
    }
    return list.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  }, [invoices, patients]);

  // Invoices created in this period
  const periodInvoices = useMemo(() => {
    return invoices.filter(inv => isDateInPeriod(inv.date));
  }, [invoices, periodRange]);

  // Actual Payments received in this period
  const periodPayments = useMemo(() => {
    return allTransactions.filter(t => isDateInPeriod(t.date));
  }, [allTransactions, periodRange]);

  // Financial KPI Metrics (The 4 Stat Cards)
  const metrics = useMemo(() => {
    const totalBilled = periodInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalCollected = periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalDebts = periodInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
    const allTimeDebts = invoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);

    const collectionRate = totalBilled > 0
      ? Math.round((totalCollected / totalBilled) * 100)
      : (totalCollected > 0 ? 100 : 0);

    const invoicesCount = periodInvoices.length;
    const paymentsCount = periodPayments.length;
    const unpaidInvoicesCount = periodInvoices.filter(i => (i.remainingAmount || 0) > 0).length;

    const averagePerInvoice = invoicesCount > 0
      ? Math.round(totalBilled / invoicesCount)
      : (paymentsCount > 0 ? Math.round(totalCollected / paymentsCount) : 0);

    return {
      totalBilled,
      totalCollected,
      totalDebts,
      allTimeDebts,
      collectionRate,
      invoicesCount,
      paymentsCount,
      unpaidInvoicesCount,
      averagePerInvoice,
    };
  }, [periodInvoices, periodPayments, invoices]);

  // Revenue Evolution Trend Chart Data
  const trendChartData = useMemo(() => {
    const arabicDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    // 1. TODAY: Show operational working hours of the day
    if (periodFilter === 'today') {
      const timeSlots = [
        { label: '08:00 - 10:00', startH: 8, endH: 10 },
        { label: '10:00 - 12:00', startH: 10, endH: 12 },
        { label: '12:00 - 14:00', startH: 12, endH: 14 },
        { label: '14:00 - 16:00', startH: 14, endH: 16 },
        { label: '16:00 - 18:00', startH: 16, endH: 18 },
        { label: '18:00 - 20:00', startH: 18, endH: 20 },
      ];

      const chart = timeSlots.map(slot => {
        const slotPays = periodPayments.filter(p => {
          if (!p.createdAt) return false;
          try {
            const h = new Date(p.createdAt).getHours();
            return h >= slot.startH && h < slot.endH;
          } catch {
            return false;
          }
        });
        return {
          name: slot.label,
          revenue: slotPays.reduce((sum, p) => sum + p.amount, 0),
          count: slotPays.length,
        };
      });

      // Ensure that if any payment occurred today without a matching hour slot, it is accounted for
      const sumSlotRev = chart.reduce((s, c) => s + c.revenue, 0);
      if (metrics.totalCollected > sumSlotRev) {
        chart[chart.length - 1].revenue += (metrics.totalCollected - sumSlotRev);
      }
      return chart;
    }

    // 2. WEEK: 7 days of the week from Saturday to Friday
    if (periodFilter === 'week') {
      return arabicDays.map((dayName, idx) => {
        const dStr = getClinicDateOffsetStr(idx, periodRange.saturdayStr);
        const dayPays = periodPayments.filter(p => p.date === dStr);
        const dayRev = dayPays.reduce((sum, p) => sum + p.amount, 0);
        const parts = dStr.split('-');
        return {
          name: `${dayName} (${parts[2]}/${parts[1]})`,
          revenue: dayRev,
          count: dayPays.length,
        };
      });
    }

    // 3. MONTH: 4 weekly intervals covering the month, anchored at 0 at the origin
    if (periodFilter === 'month') {
      const lastDay = periodRange.lastDayOfMonth;

      const intervals = [
        { startDay: 1, endDay: 7, label: 'الأسبوع 1' },
        { startDay: 8, endDay: 14, label: 'الأسبوع 2' },
        { startDay: 15, endDay: 21, label: 'الأسبوع 3' },
        { startDay: 22, endDay: lastDay, label: 'الأسبوع 4' },
      ];

      const weeks = intervals.map(inter => {
        const interPays = periodPayments.filter(p => {
          const day = parseInt(p.date.slice(8, 10), 10);
          return day >= inter.startDay && day <= inter.endDay;
        });
        const rev = interPays.reduce((sum, p) => sum + p.amount, 0);
        return {
          name: inter.label,
          revenue: rev,
          count: interPays.length,
        };
      });

      return weeks;
    }

    // 4. YEAR: 12 months (January to December)
    if (periodFilter === 'year') {
      return ALGERIAN_ARABIC_MONTHS.map((monthName, idx) => {
        const monthNum = String(idx + 1).padStart(2, '0');
        const prefix = `${periodRange.currentYearStr}-${monthNum}`;
        const mPays = periodPayments.filter(p => p.date.startsWith(prefix));
        const rev = mPays.reduce((sum, p) => sum + p.amount, 0);
        return {
          name: monthName,
          revenue: rev,
          count: mPays.length,
        };
      });
    }

    // 5. CUSTOM: Between customStartDate and customEndDate
    if (periodFilter === 'custom') {
      const start = periodRange.start;
      const end = periodRange.end;

      const [sY, sM, sD] = start.split('-').map(Number);
      const [eY, eM, eD] = end.split('-').map(Number);
      const startUtc = Date.UTC(sY, sM - 1, sD);
      const endUtc = Date.UTC(eY, eM - 1, eD);
      const diffDays = Math.max(1, Math.round((endUtc - startUtc) / 86400000) + 1);

      // Single-day points if <= 10 days, otherwise up to 6 contiguous non-overlapping intervals
      const numChunks = diffDays <= 10 ? diffDays : Math.min(6, diffDays);
      const chart = [];

      for (let c = 0; c < numChunks; c++) {
        const startDayIdx = Math.round((c * diffDays) / numChunks);
        const endDayIdx = Math.round(((c + 1) * diffDays) / numChunks) - 1;
        const cStart = getClinicDateOffsetStr(startDayIdx, start);
        const cEnd = getClinicDateOffsetStr(endDayIdx, start);

        const [y1, m1, day1] = cStart.split('-');
        const [y2, m2, day2] = cEnd.split('-');

        // Format label strictly as [Start Date – End Date] using Unicode LTR embedding to prevent RTL reversal
        let label: string;
        if (cStart === cEnd) {
          label = `${day1}/${m1}`;
        } else if (y1 !== y2) {
          label = `\u200E\u202A${day1}/${m1}/${y1.slice(-2)} \u2013 ${day2}/${m2}/${y2.slice(-2)}\u202C\u200E`;
        } else {
          label = `\u200E\u202A${day1}/${m1} \u2013 ${day2}/${m2}\u202C\u200E`;
        }

        const cPays = periodPayments.filter(p => {
          const d = p.date.slice(0, 10);
          return d >= cStart && d <= cEnd;
        });

        chart.push({
          name: label,
          revenue: cPays.reduce((sum, p) => sum + (p.amount || 0), 0),
          count: cPays.length,
        });
      }

      return chart;
    }

    // 6. ALL: Group by the 12 months with all historical payments
    return ALGERIAN_ARABIC_MONTHS.map((monthName, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const mPays = allTransactions.filter(p => p.date.slice(5, 7) === monthNum);
      const rev = mPays.reduce((sum, p) => sum + p.amount, 0);
      return {
        name: monthName,
        revenue: rev,
        count: mPays.length,
      };
    });
  }, [periodFilter, periodPayments, allTransactions, periodRange, metrics.totalCollected]);


  // Treatment Category Breakdown (Donut Chart)
  const treatmentBreakdown = useMemo(() => {
    const categoryMap: Record<string, { revenue: number; count: number }> = {
      'معالجة الأسنان': { revenue: 0, count: 0 },
      'تقويم الأسنان': { revenue: 0, count: 0 },
      'زراعة وتركيبات': { revenue: 0, count: 0 },
      'جراحة وخلع': { revenue: 0, count: 0 },
      'تبييض وتجميل': { revenue: 0, count: 0 },
      'علاجات أخرى': { revenue: 0, count: 0 },
    };

    for (const p of periodPayments) {
      const desc = p.treatmentDescription.toLowerCase();
      let cat = 'علاجات أخرى';

      if (desc.includes('تقويم') || desc.includes('ortho')) {
        cat = 'تقويم الأسنان';
      } else if (desc.includes('زراع') || desc.includes('تاج') || desc.includes('جسر') || desc.includes('تركيب') || desc.includes('implant')) {
        cat = 'زراعة وتركيبات';
      } else if (desc.includes('تبييض') || desc.includes('فينير') || desc.includes('هوليوود') || desc.includes('bleach') || desc.includes('veneer')) {
        cat = 'تبييض وتجميل';
      } else if (desc.includes('خلع') || desc.includes('جراح') || desc.includes('عقل') || desc.includes('surgery')) {
        cat = 'جراحة وخلع';
      } else if (desc.includes('حشو') || desc.includes('عصب') || desc.includes('سوس') || desc.includes('تنظيف') || desc.includes('كشف') || desc.includes('علاج')) {
        cat = 'معالجة الأسنان';
      }

      categoryMap[cat].revenue += p.amount;
      categoryMap[cat].count += 1;
    }

    const totalRev = Object.values(categoryMap).reduce((sum, c) => sum + c.revenue, 0);

    return Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        count: data.count,
        percentage: totalRev > 0 ? Math.round((data.revenue / totalRev) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodPayments]);

  // Payment Methods Breakdown (Donut Chart)
  const paymentMethodsBreakdown = useMemo(() => {
    let cashRev = 0;
    let cardRev = 0;
    let checkRev = 0;

    for (const p of periodPayments) {
      if (p.paymentMethod === 'baridimob') cardRev += p.amount;
      else if (p.paymentMethod === 'check') checkRev += p.amount;
      else cashRev += p.amount;
    }

    const total = cashRev + cardRev + checkRev;

    return [
      {
        name: 'نقداً',
        key: 'cash',
        amount: cashRev,
        color: PAYMENT_METHOD_COLORS.cash,
        percentage: total > 0 ? Math.round((cashRev / total) * 100) : 0,
      },
      {
        name: 'بطاقة / بريدي موب',
        key: 'baridimob',
        amount: cardRev,
        color: PAYMENT_METHOD_COLORS.baridimob,
        percentage: total > 0 ? Math.round((cardRev / total) * 100) : 0,
      },
      {
        name: 'صك بنكي',
        key: 'check',
        amount: checkRev,
        color: PAYMENT_METHOD_COLORS.check,
        percentage: total > 0 ? Math.round((checkRev / total) * 100) : 0,
      },
    ];
  }, [periodPayments]);

  // Filtered Invoices Table for the Operations Ledger
  const filteredOperations = useMemo(() => {
    return periodInvoices.filter(inv => {
      const patient = getPatient(inv.patientId);
      const patientName = patient?.fullName.toLowerCase() || '';
      const desc = inv.description.toLowerCase();
      const idStr = inv.id.toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesQuery = !query ||
        patientName.includes(query) ||
        desc.includes(query) ||
        idStr.includes(query) ||
        inv.date.includes(query);

      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesMethod = methodFilter === 'all' || inv.paymentMethod === methodFilter;

      return matchesQuery && matchesStatus && matchesMethod;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [periodInvoices, searchQuery, statusFilter, methodFilter, patients]);

  // Outstanding Debtors List (Tab: Debts)
  const outstandingDebtors = useMemo(() => {
    const debtorMap = new Map<string, {
      patient: Patient;
      invoices: Invoice[];
      totalCost: number;
      totalPaid: number;
      remainingDebt: number;
      lastInvoiceDate: string;
    }>();

    for (const inv of invoices) {
      if (inv.remainingAmount > 0) {
        const p = getPatient(inv.patientId);
        if (!p) continue;

        const current = debtorMap.get(p.id) || {
          patient: p,
          invoices: [],
          totalCost: 0,
          totalPaid: 0,
          remainingDebt: 0,
          lastInvoiceDate: inv.date,
        };

        current.invoices.push(inv);
        current.totalCost += inv.totalAmount;
        current.totalPaid += inv.paidAmount;
        current.remainingDebt += inv.remainingAmount;
        if (inv.date > current.lastInvoiceDate) {
          current.lastInvoiceDate = inv.date;
        }

        debtorMap.set(p.id, current);
      }
    }

    return Array.from(debtorMap.values()).sort((a, b) => b.remainingDebt - a.remainingDebt);
  }, [invoices, patients]);

  // Handle Quick Payment Submission
  const handleOpenPaymentModal = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentAmount(String(invoice.remainingAmount || ''));
    setPaymentMethod(invoice.paymentMethod || 'cash');
    setPaymentDate(getClinicTodayStr());
    setPaymentNote('');
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoiceForPayment) return;
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('يرجى إدخال مبلغ دفعة صحيح أكبر من الصفر.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const updatedInvoice = await clinicApi.recordInvoicePayment(
        selectedInvoiceForPayment.id,
        amountNum,
        paymentMethod,
        paymentNote || undefined,
        paymentDate || undefined
      );

      // Refresh data
      await loadFinancialData();
      await onRefreshAllData();

      // Show receipt voucher print modal
      const latestPayment = updatedInvoice.payments?.[updatedInvoice.payments.length - 1] || {
        id: `pay-${Date.now()}`,
        date: paymentDate,
        amount: amountNum,
        paymentMethod,
        note: paymentNote,
        createdAt: new Date().toISOString(),
      };
      setReceiptInvoice(updatedInvoice);
      setReceiptPayment(latestPayment);
      setSelectedInvoiceForPayment(null);
    } catch (err: any) {
      alert(err.message || 'فشل تسجيل الدفعة.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Export to Excel (CSV with UTF-8 BOM for perfect Arabic display)
  const handleExportExcel = () => {
    const headers = [
      'رقم الفاتورة',
      'التاريخ',
      'اسم المريض',
      'رقم الهاتف',
      'البيان والعلاج',
      'المبلغ الكلي (د.ج)',
      'المبلغ المدفوع (د.ج)',
      'المبلغ المتبقي (د.ج)',
      'طريقة الدفع',
      'حالة السداد',
    ];

    const rows = filteredOperations.map(inv => {
      const p = getPatient(inv.patientId);
      const statusLabel = inv.status === 'paid' ? 'مكتمل' : inv.status === 'partial' ? 'دفع جزئي' : 'غير مدفوع (دين)';
      const methodLabel = inv.paymentMethod === 'baridimob' ? 'بريدي موب / بطاقة' : inv.paymentMethod === 'check' ? 'صك بنكي' : 'نقداً';
      return [
        inv.id,
        inv.date,
        `"${p?.fullName || 'مريض غير مسجل'}"`,
        `"${p?.phone || ''}"`,
        `"${inv.description || ''}"`,
        inv.totalAmount,
        inv.paidAmount,
        inv.remainingAmount,
        methodLabel,
        statusLabel,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `التقرير_المالي_عيادة_الأسنان_${getClinicTodayStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to PDF / Print
  const handleExportPDF = () => {
    window.print();
  };

  const getMethodBadge = (method?: 'cash' | 'baridimob' | 'check') => {
    switch (method) {
      case 'baridimob':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <CreditCard className="w-3.5 h-3.5" />
            بريدي موب / بطاقة
          </span>
        );
      case 'check':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Receipt className="w-3.5 h-3.5" />
            صك بنكي
          </span>
        );
      case 'cash':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Banknote className="w-3.5 h-3.5" />
            نقداً
          </span>
        );
    }
  };

  const getStatusBadge = (status: 'paid' | 'partial' | 'unpaid') => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            مكتمل
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            جزئي
          </span>
        );
      case 'unpaid':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            غير مدفوع (دين)
          </span>
        );
    }
  };

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'today':
        return `اليوم (${formatDateDZ(periodRange.todayStr)})`;
      case 'week':
        return `هذا الأسبوع (${formatDateDZ(periodRange.saturdayStr)} - ${formatDateDZ(periodRange.fridayStr)})`;
      case 'month':
        return `هذا الشهر (${ALGERIAN_ARABIC_MONTHS[periodRange.monthNum - 1]} ${periodRange.currentYearStr})`;
      case 'year':
        return `هذه السنة (${periodRange.currentYearStr})`;
      case 'custom':
        return `فترة مخصصة (${formatDateDZ(periodRange.start)} إلى ${formatDateDZ(periodRange.end)})`;
      case 'all':
      default:
        return 'جميع الفترات';
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-blue-500 selection:text-white" dir="rtl">
      {/* ================= 1. HEADER BANNER (Matching Visual Style) ================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-indigo-50/60 p-6 sm:p-8 border border-sky-100/80 shadow-sm print:hidden">
        {/* Soft Background Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-sky-300/10 rounded-full blur-2xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Visual Identity & Title */}
          <div className="flex items-center gap-5">
            {/* Visual Icon Art representing Dental Health & Financial Growth */}
            <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-md border border-sky-100 flex items-center justify-center overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-sky-400/10 to-indigo-500/10" />
              {/* Tooth SVG with Financial Chart Art */}
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 relative z-10" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 6C18 6 12 10 12 18C12 24 15 28 17 38C18 42 21 42 22 36C22.8 31 23.5 28 24 28C24.5 28 25.2 31 26 36C27 42 30 42 31 38C33 28 36 24 36 18C36 10 30 6 24 6Z"
                  fill="url(#toothGrad)"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Rising bars inside/beside */}
                <path d="M28 22V16M33 24V12M38 26V8" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M26 18L33 11L40 6" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="toothGrad" x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#e0f2fe" />
                    <stop offset="1" stopColor="#bae6fd" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>التقارير المالية</span>
                  <BarChart3 className="w-7 h-7 text-blue-600 inline-block" />
                </h1>
              </div>
              <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">
                نظرة شاملة ومحدثة على الأداء المالي للعيادة، متابعة الإيرادات المحصلة، الفواتير والديون
              </p>
            </div>
          </div>

          {/* Top Controls: Refresh, Export PDF, Export Excel, Period Dropdown */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Period Selector Dropdown */}
            <div className="relative inline-block text-right">
              <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-sm hover:border-blue-400 transition-all cursor-pointer">
                <Calendar className="w-4 h-4 text-blue-600" />
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as PeriodFilterType)}
                  className="bg-transparent font-bold text-sm text-slate-700 outline-none cursor-pointer pr-1"
                >
                  <option value="month">هذا الشهر ({periodFilter === 'month' ? 'افتراضي' : ''})</option>
                  <option value="week">هذا الأسبوع</option>
                  <option value="today">اليوم</option>
                  <option value="year">هذه السنة ({periodRange.currentYearStr})</option>
                  <option value="all">جميع الأوقات</option>
                  <option value="custom">فترة مخصصة...</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Custom Date Range Selectors if selected */}
            {periodFilter === 'custom' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-sm">
                <input
                  type="date"
                  value={customStartDate || periodRange.start}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-50 px-2 py-1 rounded border border-slate-200 text-slate-700"
                  placeholder="من"
                />
                <span className="text-slate-400">إلى</span>
                <input
                  type="date"
                  value={customEndDate || periodRange.end}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 px-2 py-1 rounded border border-slate-200 text-slate-700"
                  placeholder="إلى"
                />
              </div>
            )}

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-sm font-semibold transition-all shadow-sm active:scale-95"
              title="تصدير جدول الفواتير والعمليات إلى Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير Excel</span>
            </button>

            {/* Export PDF / Print Button */}
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-sm font-semibold transition-all shadow-sm active:scale-95"
              title="تصدير أو طباعة التقرير كملف PDF"
            >
              <FileDown className="w-4 h-4 text-rose-600" />
              <span>تصدير PDF</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Pill Bar */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-sky-100/80 pt-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>النظرة العامة</span>
          </button>

          <button
            onClick={() => setActiveTab('revenues')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              activeTab === 'revenues'
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>سجل الإيرادات والمدفوعات</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
              {metrics.paymentsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              activeTab === 'debts'
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>الفواتير والديون المستحقة</span>
            {outstandingDebtors.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                {outstandingDebtors.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('detailed')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              activeTab === 'detailed'
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <PieChartIcon className="w-4 h-4 text-indigo-500" />
            <span>التقارير التفصيلية للعلاجات</span>
          </button>
        </div>
      </div>

      {/* ================= 2. PRINTABLE CLINIC HEADER (Print mode only) ================= */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{settings.clinicName || 'عيادة طب وجراحة الأسنان'}</h1>
            <p className="text-sm text-slate-600">الدكتور: {settings.doctorName || 'طبيب العيادة'}</p>
            <p className="text-xs text-slate-500">{settings.address} | هاتف: {settings.phone}</p>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-slate-800">تقرير الأداء المالي للعيادة</h2>
            <p className="text-xs text-slate-500">الفترة: {getPeriodLabel()} | تاريخ الطباعة: {formatDateDZ(periodRange.todayStr)}</p>
          </div>
        </div>
      </div>

      {/* ================= 3. STAT CARDS ROW (Exact KPIs as Requested) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: إجمالي الفواتير */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">إجمالي الفواتير</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {formatDZD(metrics.totalBilled)}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500 font-medium">
                {metrics.invoicesCount} فاتورة مسجلة
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                <ArrowUp className="w-3.5 h-3.5" />
                قيمة الأعمال
              </span>
            </div>
          </div>
          {/* Subtle sparkline visual accent */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-500 rounded-b-2xl" />
        </div>

        {/* Card 2: الأموال المحصلة */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-800">الأموال المحصلة (الإيراد)</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
              {formatDZD(metrics.totalCollected)}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500 font-medium">
                {metrics.paymentsCount} دفعة فعلية
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Check className="w-3 h-3" />
                نسبة التحصيل {metrics.collectionRate}%
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-500 rounded-b-2xl" />
        </div>

        {/* Card 3: إجمالي الديون المستحقة */}
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-800">إجمالي الديون</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono tracking-tight">
              {formatDZD(metrics.totalDebts)}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500 font-medium">
                {metrics.unpaidInvoicesCount} مبالغ مؤجلة
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {outstandingDebtors.length} مرضى مدينين
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-amber-500 rounded-b-2xl" />
        </div>

        {/* Card 4: متوسط قيمة الفاتورة */}
        <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-purple-800">متوسط قيمة المعاملة</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-700 font-mono tracking-tight">
              {formatDZD(metrics.averagePerInvoice)}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500 font-medium">
                لكل جلسة علاجية
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                كفاءة التحصيل {metrics.collectionRate}%
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-purple-500 rounded-b-2xl" />
        </div>
      </div>

      {/* ================= 4. TAB 1: OVERVIEW & CHARTS ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Charts Row: Treatments Donut (Left/Right) | Revenue Trend Line (Center) | Payment Methods Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 1: Revenue Evolution Over Time (Center - 6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <span>تطور الإيرادات المحصلة ({getPeriodLabel()})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">الدفعات الفعلية المسجلة في صندوق العيادة</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setChartType('area')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      chartType === 'area' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    منحنى
                  </button>
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      chartType === 'bar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    أعمدة
                  </button>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <RevenueEvolutionChart
                  data={trendChartData}
                  chartType={chartType}
                  formatDZD={formatDZD}
                />
              </div>
            </div>

            {/* Chart 2: Revenue Distribution by Treatment Type (3 cols) */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-indigo-600" />
                  <span>توزيع الإيراد حسب العلاج</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">النسبة المئوية لحجم الإيرادات</p>
              </div>

              <div className="h-44 w-full relative my-2 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={treatmentBreakdown.filter(t => t.revenue > 0)}
                      dataKey="revenue"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {treatmentBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={TREATMENT_COLORS[index % TREATMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatDZD(Number(val)), 'المبلغ']}
                      contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {treatmentBreakdown.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                    لا توجد بيانات
                  </div>
                )}
              </div>

              {/* Legend with percentages */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs pr-1">
                {treatmentBreakdown.slice(0, 5).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-slate-700">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TREATMENT_COLORS[idx % TREATMENT_COLORS.length] }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 3: Payment Methods Distribution (3 cols) */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span>طرق الدفع</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">توزيع قنوات التحصيل المالي</p>
              </div>

              <div className="h-44 w-full relative my-2 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsBreakdown.filter(m => m.amount > 0)}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {paymentMethodsBreakdown.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatDZD(Number(val)), 'المبلغ']}
                      contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with Method Amounts */}
              <div className="space-y-2 text-xs">
                {paymentMethodsBreakdown.map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="font-medium">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-500 font-semibold">{entry.percentage}%</span>
                      <span className="font-bold text-slate-900">{formatDZD(entry.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= 5. RECENT FINANCIAL OPERATIONS TABLE ================= */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Table Header Controls */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <span>أحدث العمليات المالية والفواتير</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  عرض جميع الفواتير الصادرة والدفعات المرتبطة بها للفترة المحددة ({filteredOperations.length} عملية)
                </p>
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، الفاتورة، العلاج..."
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setStatusFilter('paid')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'paid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    مكتمل
                  </button>
                  <button
                    onClick={() => setStatusFilter('partial')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'partial' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    جزئي
                  </button>
                  <button
                    onClick={() => setStatusFilter('unpaid')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'unpaid' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ديون
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">التاريخ</th>
                    <th className="py-3.5 px-4">رقم الفاتورة</th>
                    <th className="py-3.5 px-4">المريض</th>
                    <th className="py-3.5 px-4">البيان / العلاج</th>
                    <th className="py-3.5 px-4 font-mono">المبلغ الكلي</th>
                    <th className="py-3.5 px-4 font-mono">المدفوع (المحصل)</th>
                    <th className="py-3.5 px-4 font-mono">المتبقي (الدين)</th>
                    <th className="py-3.5 px-4">طريقة الدفع</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-600">لا توجد عمليات مالية مطابقة للفترة المحددة</p>
                        <p className="text-xs text-slate-400 mt-1">جرّب تغيير خيارات البحث أو مرشح الفترة الزمنية</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map((inv) => {
                      const patient = getPatient(inv.patientId);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Date */}
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                            {formatDateDZ(inv.date)}
                          </td>

                          {/* Invoice Number */}
                          <td className="py-3.5 px-4 text-xs font-mono font-bold text-blue-600 whitespace-nowrap">
                            #{inv.id}
                          </td>

                          {/* Patient Name */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <button
                              onClick={() => onOpenPatientDossier(inv.patientId)}
                              className="font-bold text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1.5 text-right"
                            >
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{patient?.fullName || 'مريض غير مسجل'}</span>
                            </button>
                            {patient?.phone && (
                              <span className="text-[11px] text-slate-400 font-mono block">
                                {patient.phone}
                              </span>
                            )}
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 text-slate-700 text-xs font-medium max-w-xs truncate">
                            {inv.description}
                          </td>

                          {/* Total Amount */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                            {formatDZD(inv.totalAmount)}
                          </td>

                          {/* Paid Amount */}
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 text-sm whitespace-nowrap">
                            {inv.paidAmount > 0 ? `+${formatDZD(inv.paidAmount)}` : '0 د.ج'}
                          </td>

                          {/* Remaining Debt */}
                          <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                            {inv.remainingAmount > 0 ? (
                              <span className="text-amber-600">-{formatDZD(inv.remainingAmount)}</span>
                            ) : (
                              <span className="text-slate-400 text-xs">0 د.ج</span>
                            )}
                          </td>

                          {/* Payment Method Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {getMethodBadge(inv.paymentMethod)}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {getStatusBadge(inv.status)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* If invoice has remaining debt: Record Payment Button */}
                              {inv.remainingAmount > 0 && (
                                <button
                                  onClick={() => handleOpenPaymentModal(inv)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all shadow-xs"
                                  title="تسجيل دفعة جديدة لهذا المريض"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>قبض دفعة</span>
                                </button>
                              )}

                              {/* Print Receipt Voucher Button */}
                              {inv.paidAmount > 0 && (
                                <button
                                  onClick={() => {
                                    setReceiptInvoice(inv);
                                    setReceiptPayment(inv.payments?.[inv.payments.length - 1] || null);
                                  }}
                                  className="inline-flex items-center gap-1 p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="طباعة وصل استلام"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              )}

                              {/* Open Patient Dossier */}
                              <button
                                onClick={() => onOpenPatientDossier(inv.patientId)}
                                className="inline-flex items-center gap-1 p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="فتح ملف المريض"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. TAB 2: REVENUES & PAYMENTS LEDGER ================= */}
      {activeTab === 'revenues' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span>سجل الإيرادات والدفعات الفعلية المحصلة</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  توثيق جميع حركات المقبوضات النقدية والتحويلات المسجلة في صندوق العيادة ({periodPayments.length} دفعة)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-600">إجمالي المحصل في الفترة:</span>
                <span className="text-xl font-black font-mono text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  {formatDZD(metrics.totalCollected)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4">تاريخ الدفعة</th>
                    <th className="py-3 px-4">اسم المريض</th>
                    <th className="py-3 px-4">البيان / الفاتورة المرتبطة</th>
                    <th className="py-3 px-4 font-mono">مبلغ الدفعة</th>
                    <th className="py-3 px-4">طريقة التحصيل</th>
                    <th className="py-3 px-4">المستلم / الطبيب</th>
                    <th className="py-3 px-4">ملاحظات الدفعة</th>
                    <th className="py-3 px-4 text-center">وصل الاستلام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        لا توجد دفعات محصلة مسجلة في هذه الفترة
                      </td>
                    </tr>
                  ) : (
                    periodPayments.map((p) => {
                      const inv = invoices.find(i => i.id === p.invoiceId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-xs text-slate-600 font-mono whitespace-nowrap">
                            {formatDateDZ(p.date)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <button
                              onClick={() => onOpenPatientDossier(p.patientId)}
                              className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                            >
                              {p.patientName}
                            </button>
                            {p.patientPhone && (
                              <span className="block text-[11px] text-slate-400 font-mono">{p.patientPhone}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs truncate">
                            {p.treatmentDescription} <span className="font-mono text-slate-400">({p.invoiceId})</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-emerald-600 text-sm whitespace-nowrap">
                            +{formatDZD(p.amount)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {getMethodBadge(p.paymentMethod)}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                            {p.recordedBy || settings.doctorName || 'طبيب العيادة'}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 italic max-w-xs truncate">
                            {p.note || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                if (inv) {
                                  setReceiptInvoice(inv);
                                  setReceiptPayment({
                                    id: p.id,
                                    date: p.date,
                                    amount: p.amount,
                                    paymentMethod: p.paymentMethod,
                                    note: p.note,
                                    createdAt: p.createdAt,
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition-all text-slate-700"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>وصل</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. TAB 3: INVOICES & DEBTS LEDGER ================= */}
      {activeTab === 'debts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span>دفتر الديون والمبالغ المستحقة على المرضى</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  قائمة بجميع المرضى الذين لديهم فواتير غير مسددة بالكامل ({outstandingDebtors.length} مريض مدين)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-600">إجمالي الديون القائمة:</span>
                <span className="text-xl font-black font-mono text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                  {formatDZD(metrics.allTimeDebts)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {outstandingDebtors.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="text-base font-bold text-slate-800">ممتاز! لا توجد أي ديون مستحقة على المرضى حالياً</p>
                  <p className="text-xs text-slate-400 mt-1">جميع الفواتير والخدمات العلاجية مسددة بالكامل</p>
                </div>
              ) : (
                outstandingDebtors.map((item) => (
                  <div
                    key={item.patient.id}
                    className="p-4 rounded-xl border border-amber-200/70 bg-gradient-to-br from-white to-amber-50/30 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            onClick={() => onOpenPatientDossier(item.patient.id)}
                            className="font-extrabold text-slate-900 text-base hover:text-blue-600 hover:underline"
                          >
                            {item.patient.fullName}
                          </button>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            {item.patient.phone ? (
                              <a
                                href={`tel:${item.patient.phone}`}
                                className="inline-flex items-center gap-1 font-mono text-blue-600 hover:underline"
                              >
                                <Phone className="w-3 h-3" />
                                {item.patient.phone}
                              </a>
                            ) : (
                              <span>بدون هاتف</span>
                            )}
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {item.invoices.length} فواتير
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-amber-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block">إجمالي التكلفة:</span>
                          <span className="font-mono font-bold text-slate-800">{formatDZD(item.totalCost)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">المبلغ المدفوع:</span>
                          <span className="font-mono font-bold text-emerald-600">{formatDZD(item.totalPaid)}</span>
                        </div>
                      </div>

                      <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900">المبلغ المتبقي (الدين):</span>
                        <span className="font-mono font-black text-amber-700 text-base">
                          {formatDZD(item.remainingDebt)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          const firstUnpaid = item.invoices.find(i => i.remainingAmount > 0);
                          if (firstUnpaid) handleOpenPaymentModal(firstUnpaid);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>تحصيل دفعة</span>
                      </button>

                      <button
                        onClick={() => onOpenPatientDossier(item.patient.id)}
                        className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        <span>الملف</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. TAB 4: DETAILED REPORTS ================= */}
      {activeTab === 'detailed' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-indigo-600" />
                  <span>التقرير التفصيلي حسب نوع الإجراء والعلاج الطبي</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحليل مردودية كل علاج، عدد المرضى المعالجين، وإجمالي المداخيل المحققة للفترة المحددة
                </p>
              </div>

              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة هذا التقرير التفصيلي</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                    <th className="py-3.5 px-4">نوع الإجراء / العلاج</th>
                    <th className="py-3.5 px-4 text-center">عدد الجلسات / الحالات</th>
                    <th className="py-3.5 px-4 font-mono">الإيراد المحصل (د.ج)</th>
                    <th className="py-3.5 px-4 font-mono">متوسط سعر الجلسة</th>
                    <th className="py-3.5 px-4 text-center">نسبة المساهمة في الدخل</th>
                    <th className="py-3.5 px-4">مؤشر الإقبال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {treatmentBreakdown.map((item, index) => {
                    const avg = item.count > 0 ? Math.round(item.revenue / item.count) : 0;
                    return (
                      <tr key={item.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: TREATMENT_COLORS[index % TREATMENT_COLORS.length] }}
                          />
                          <span>{item.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                          {item.count}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-emerald-600">
                          {formatDZD(item.revenue)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-800">
                          {formatDZD(avg)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-600">
                          {item.percentage}%
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, item.percentage * 2)}%`,
                                backgroundColor: TREATMENT_COLORS[index % TREATMENT_COLORS.length],
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 9. QUICK PAYMENT MODAL ================= */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">تسجيل دفعة مالية جديدة</h3>
                  <p className="text-xs text-slate-500 font-mono">فاتورة #{selectedInvoiceForPayment.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient & Invoice Summary Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">المريض:</span>
                <span className="font-bold text-slate-900">
                  {getPatient(selectedInvoiceForPayment.patientId)?.fullName || 'مريض غير مسجل'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">العلاج / البيان:</span>
                <span className="font-medium text-slate-800">{selectedInvoiceForPayment.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">إجمالي الفاتورة:</span>
                <span className="font-mono font-bold text-slate-900">{formatDZD(selectedInvoiceForPayment.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المدفوع سابقاً:</span>
                <span className="font-mono font-bold text-emerald-600">{formatDZD(selectedInvoiceForPayment.paidAmount)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
                <span className="font-bold text-amber-900">المبلغ المتبقي المطلوب:</span>
                <span className="font-mono font-black text-amber-600">
                  {formatDZD(selectedInvoiceForPayment.remainingAmount)}
                </span>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مبلغ الدفعة المقبوضة (د.ج) *
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="أدخل المبلغ المقبوض..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-lg text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  autoFocus
                />
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-slate-400">يمكن دفع جزء من المبلغ أو المبلغ كاملاً</span>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(selectedInvoiceForPayment.remainingAmount))}
                    className="text-emerald-600 font-bold hover:underline"
                  >
                    دفع كامل المبلغ المتبقي
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  طريقة الدفع *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>نقداً</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('baridimob')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'baridimob'
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>بريدي موب / بطاقة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('check')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'check'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>صك بنكي</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ القبض
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-700 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظة على الدفعة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="مثال: دفعة جلسة 2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-700 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                disabled={isSubmittingPayment}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد تسجيل الدفعة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 10. RECEIPT VOUCHER MODAL (وصل استلام) ================= */}
      {receiptInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <span>وصل استلام دفعة مالية</span>
              </h3>
              <button
                onClick={() => {
                  setReceiptInvoice(null);
                  setReceiptPayment(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Voucher Content (Formatted for print) */}
            <div id="receipt-voucher-print-area" className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3 font-sans">
              <div className="text-center pb-2 border-b border-slate-200">
                <h4 className="font-black text-slate-900 text-sm">{settings.clinicName || 'عيادة طب وجراحة الأسنان'}</h4>
                <p className="text-[11px] text-slate-500">الدكتور: {settings.doctorName || 'طبيب الأسنان'}</p>
                <p className="text-[10px] text-slate-400">{settings.phone}</p>
              </div>

              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>رقم الوصل: <span className="font-mono text-slate-800 font-bold">{receiptPayment?.id || receiptInvoice.id}</span></span>
                <span>التاريخ: <span className="font-mono text-slate-800 font-bold">{formatDateDZ(receiptPayment?.date || receiptInvoice.date)}</span></span>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">اسم المريض:</span>
                  <span className="font-bold text-slate-900">
                    {getPatient(receiptInvoice.patientId)?.fullName || 'مريض غير مسجل'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">البيان:</span>
                  <span className="font-medium text-slate-800">{receiptInvoice.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">طريقة الدفع:</span>
                  <span>{getMethodBadge(receiptPayment?.paymentMethod || receiptInvoice.paymentMethod)}</span>
                </div>
              </div>

              {/* Paid Amount Highlight */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 block">المبلغ المقبوض:</span>
                <span className="font-mono font-black text-emerald-700 text-xl block">
                  {formatDZD(receiptPayment?.amount || receiptInvoice.paidAmount)}
                </span>
              </div>

              <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200">
                <span className="text-slate-500">إجمالي الفاتورة:</span>
                <span className="font-mono font-bold text-slate-800">{formatDZD(receiptInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">المبلغ المتبقي:</span>
                <span className="font-mono font-bold text-amber-700">
                  {receiptInvoice.remainingAmount > 0 ? formatDZD(receiptInvoice.remainingAmount) : '0 د.ج (مسدد بالكامل)'}
                </span>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-400">
                شكراً لثقتكم بعيادتنا - نتمنى لكم دوام الصحة والعافية
              </div>
            </div>

            {/* Print & Close */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setReceiptInvoice(null);
                  setReceiptPayment(null);
                }}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الوصل</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
