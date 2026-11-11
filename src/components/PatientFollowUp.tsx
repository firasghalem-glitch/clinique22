import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FollowUpOverview,
  FollowUpPatientItem,
  FollowUpRecord,
  FollowUpPriority,
  FollowUpStatus,
  Patient,
} from '../types';
import { clinicApi } from '../services/api';
import { FollowUpModal } from './FollowUpModal';
import {
  Users,
  Clock,
  UserX,
  Activity,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  Award,
  Plus,
  CheckCircle2,
  Edit3,
  XCircle,
  Check,
  CalendarCheck,
  AlertTriangle,
  History,
} from 'lucide-react';

interface PatientFollowUpProps {
  onOpenPatientDossier: (patientId: string) => void;
  initialCategory?: 'all' | 'followUp' | 'notReturned' | 'topDiseases';
  refreshTrigger?: number;
  onFollowUpChanged?: () => void;
}

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizePhone(phoneStr: string): string {
  if (!phoneStr) return '';
  return phoneStr.replace(/[^0-9]/g, '').replace(/^213/, '0').replace(/^00213/, '0');
}

export const PatientFollowUp: React.FC<PatientFollowUpProps> = ({
  onOpenPatientDossier,
  initialCategory = 'followUp',
  refreshTrigger = 0,
  onFollowUpChanged,
}) => {
  const [noReturnDays, setNoReturnDays] = useState<number>(30);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'followUp' | 'notReturned' | 'topDiseases'>(initialCategory);
  const [followUpSubFilter, setFollowUpSubFilter] = useState<'allActive' | 'due' | 'overdue' | 'completed'>('allActive');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overview, setOverview] = useState<FollowUpOverview | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [followUpsList, setFollowUpsList] = useState<FollowUpRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalEditRecord, setModalEditRecord] = useState<FollowUpRecord | null>(null);
  const [modalPreSelectedPatientId, setModalPreSelectedPatientId] = useState<string | undefined>(undefined);

  // Accordion state for viewing patients belonging to a specific disease
  const [expandedDisease, setExpandedDisease] = useState<string | null>(null);

  // Reference to scroll smoothly to the table section when clicking a card
  const tableSectionRef = useRef<HTMLDivElement | null>(null);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Sync category if initialCategory changes from outside navigation
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  const fetchOverview = async (days: number, isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const [overviewData, patientsData, followUpsData] = await Promise.all([
        clinicApi.getFollowUpOverview(days),
        clinicApi.getPatients(),
        clinicApi.getFollowUps(),
      ]);
      setOverview(overviewData);
      setPatients(patientsData || []);
      setFollowUpsList(followUpsData || []);
    } catch (err: any) {
      console.error('Failed to load follow-up overview:', err);
      setError(err.message || 'تعذر تحميل بيانات متابعة المرضى');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview(noReturnDays);
  }, [noReturnDays, refreshTrigger]);

  // Active intentional follow-up records
  const activeFollowUps = useMemo(() => {
    return followUpsList.filter(f => ['pending', 'due', 'overdue'].includes(f.status));
  }, [followUpsList]);

  // Main active list for current selected card category
  const activeList = useMemo((): FollowUpPatientItem[] => {
    if (!overview) return [];
    if (selectedCategory === 'all') return overview.allPatients.list;
    if (selectedCategory === 'notReturned') return overview.notReturned.list;

    if (selectedCategory === 'followUp') {
      const activeItems = overview.followUp.list;
      const completedItems = overview.completedFollowUps?.list || [];

      if (followUpSubFilter === 'due') {
        return activeItems.filter(item => item.followUpStatus === 'due');
      }
      if (followUpSubFilter === 'overdue') {
        return activeItems.filter(item => item.followUpStatus === 'overdue');
      }
      if (followUpSubFilter === 'completed') {
        return completedItems;
      }
      return activeItems;
    }

    return [];
  }, [overview, selectedCategory, followUpSubFilter]);

  // Filtered patients for search
  const filteredList = useMemo((): FollowUpPatientItem[] => {
    const q = searchQuery.trim();
    if (!q) return activeList;

    const normQ = normalizeArabic(q);
    const numQ = normalizePhone(q);

    return activeList.filter(item => {
      const normName = normalizeArabic(item.fullName);
      const matchName = normName.includes(normQ);

      const normPh = normalizePhone(item.phone);
      const matchPhone = numQ && normPh ? normPh.includes(numQ) : item.phone.includes(q);

      const normDisease = normalizeArabic(item.diseaseCondition || '');
      const matchDisease = normDisease.includes(normQ);

      const normReason = normalizeArabic(item.followUpReason || item.reason || '');
      const matchReason = normReason.includes(normQ);

      const normNextProc = normalizeArabic(item.nextProcedure || '');
      const matchNextProc = normNextProc.includes(normQ);

      return matchName || matchPhone || matchDisease || matchReason || matchNextProc;
    });
  }, [activeList, searchQuery]);

  // Sub-counts for followUp tabs
  const subCounts = useMemo(() => {
    if (!overview) return { allActive: 0, due: 0, overdue: 0, completed: 0 };
    const list = overview.followUp.list;
    const completedList = overview.completedFollowUps?.list || [];
    return {
      allActive: list.length,
      due: list.filter(item => item.followUpStatus === 'due').length,
      overdue: list.filter(item => item.followUpStatus === 'overdue').length,
      completed: completedList.length,
    };
  }, [overview]);

  const categoryTitles: Record<'all' | 'followUp' | 'notReturned' | 'topDiseases', { title: string; badge: string; desc: string }> = {
    all: {
      title: 'قائمة كل المرضى',
      badge: 'العدد الكلي',
      desc: 'جميع ملفات المرضى المسجلين في العيادة، مع إمكانية إضافة أي مريض للمتابعة بنقرة واحدة',
    },
    followUp: {
      title: 'قائمة متابعة المرضى',
      badge: 'في المتابعة',
      desc: 'المرضى الذين حدد الطبيب ضرورة متابعتهم سريرياً مع بيان الإجراء وتاريخ المتابعة',
    },
    notReturned: {
      title: 'قائمة المرضى المتأخرين عن العودة أكثر من شهر',
      badge: 'تأخر العودة',
      desc: 'مرضى غابوا أكثر من المهلة المحددة بدون مراجعة أو إكمال المتابعة',
    },
    topDiseases: {
      title: 'جدول أكثر الأمراض والتشخيصات شيوعاً',
      badge: 'إحصائيات الأمراض',
      desc: 'ترتيب جميع الأمراض والتشخيصات السريرية المسجلة حسب عدد المرضى وتكرارها بالعيادة',
    },
  };

  const currentCategoryInfo = categoryTitles[selectedCategory];

  const formatDateDZ = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const getPriorityBadge = (p?: FollowUpPriority) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>مستعجلة</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>مهمة</span>
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            عادية
          </span>
        );
    }
  };

  const getFollowUpStatusBadge = (status?: FollowUpStatus) => {
    switch (status) {
      case 'due':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-500 text-white shadow-2xs animate-pulse">
            <Clock className="w-3 h-3 text-white" />
            <span>حان موعد المتابعة</span>
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-600 text-white shadow-2xs">
            <AlertTriangle className="w-3 h-3 text-white" />
            <span>متأخر عن المتابعة</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>قيد المتابعة</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>مكتملة</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-400" />
            <span>ملغاة</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getDiseaseStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">نشط</span>;
      case 'under_treatment':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">قيد العلاج</span>;
      case 'urgent':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">حالة طارئة</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">مكتمل</span>;
      case 'stable':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">مستقر</span>;
      default:
        return null;
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
          <span>🥇 الأول</span>
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-200 text-slate-800 border border-slate-300">
          <span>🥈 الثاني</span>
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
          <span>🥉 الثالث</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
        #{index + 1}
      </span>
    );
  };

  // Open Add Follow-Up Modal
  const handleOpenAddModal = (patientId?: string) => {
    setModalEditRecord(null);
    setModalPreSelectedPatientId(patientId);
    setIsModalOpen(true);
  };

  // Open Edit Follow-Up Modal
  const handleOpenEditModal = (item: FollowUpPatientItem) => {
    if (!item.followUpId) {
      handleOpenAddModal(item.id);
      return;
    }
    const foundRecord = followUpsList.find(f => f.id === item.followUpId);
    if (foundRecord) {
      setModalEditRecord(foundRecord);
      setModalPreSelectedPatientId(item.id);
      setIsModalOpen(true);
    } else {
      // Re-create temporary record to edit
      setModalEditRecord({
        id: item.followUpId,
        clinicId: '',
        patientId: item.id,
        reason: item.followUpReason || item.reason || 'استكمال علاج',
        nextProcedure: item.nextProcedure || '',
        targetDate: item.targetDate,
        priority: item.priority || 'normal',
        status: item.followUpStatus || 'pending',
        notes: item.followUpNotes,
        createdAt: item.createdAt,
      });
      setModalPreSelectedPatientId(item.id);
      setIsModalOpen(true);
    }
  };

  // Mark Follow-Up as Completed
  const handleCompleteFollowUp = async (followUpId: string, patientName: string) => {
    try {
      await clinicApi.updateFollowUp(followUpId, {
        status: 'completed',
      });
      showNotification(`تم تسجيل اكتمال متابعة المريض "${patientName}" بنجاح وحفظها في السجلات السابقة.`);
      fetchOverview(noReturnDays, true);
      onFollowUpChanged?.();
    } catch (err: any) {
      alert(err.message || 'فشل تحديث حالة المتابعة.');
    }
  };

  // Cancel Follow-Up
  const handleCancelFollowUp = async (followUpId: string, patientName: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في إلغاء متابعة المريض "${patientName}"؟`)) {
      return;
    }
    try {
      await clinicApi.updateFollowUp(followUpId, {
        status: 'cancelled',
      });
      showNotification(`تم إلغاء متابعة المريض "${patientName}".`);
      fetchOverview(noReturnDays, true);
      onFollowUpChanged?.();
    } catch (err: any) {
      alert(err.message || 'فشل إلغاء المتابعة.');
    }
  };

  // Extract patients diagnosed with a specific disease
  const getPatientsForDisease = (diseaseName: string): FollowUpPatientItem[] => {
    if (!overview || !overview.allPatients.list) return [];
    const targetNorm = normalizeArabic(diseaseName);
    return overview.allPatients.list.filter(p => {
      if (!p.diseaseCondition) return false;
      return normalizeArabic(p.diseaseCondition) === targetNorm;
    });
  };

  const totalDiagnosedPatients = useMemo(() => {
    if (!overview || !overview.topDiseases) return 0;
    return overview.topDiseases.reduce((acc, curr) => acc + curr.count, 0);
  }, [overview]);

  const filteredDiseasesList = useMemo(() => {
    if (!overview || !overview.topDiseases) return [];
    const q = searchQuery.trim();
    if (!q) return overview.topDiseases;
    const normQ = normalizeArabic(q);
    return overview.topDiseases.filter(d => normalizeArabic(d.name).includes(normQ));
  }, [overview, searchQuery]);

  const handleCardClick = (category: 'all' | 'followUp' | 'notReturned' | 'topDiseases') => {
    setSelectedCategory(category);
    // Smooth scroll down to table section for immediate visibility
    setTimeout(() => {
      tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {successToast && (
        <div className="fixed bottom-5 left-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-in slide-in-from-bottom-5 duration-200">
          <Check className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-xs font-bold font-sans">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
              نظام متابعة المرضى (Patient Follow-Up)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 font-heading">
              متابعة مقصودة وسريرية
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-sans leading-relaxed">
            مراقبة الحالات التي قرر الطبيب ضرورة متابعتها، مع تحديد سبب المتابعة والإجراء المطلوب وتاريخ المراجعة.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة مريض للمتابعة</span>
          </button>

          <button
            type="button"
            onClick={() => fetchOverview(noReturnDays, true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            title="تحديث البيانات فوراً"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TOP 4 LARGE CARDS IN ONE ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: مرضى */}
        <button
          type="button"
          onClick={() => handleCardClick('all')}
          className={`bg-white rounded-2xl p-5 border text-right transition-all cursor-pointer flex flex-col justify-between ${
            selectedCategory === 'all'
              ? 'ring-2 ring-blue-600 border-blue-600 shadow-md bg-blue-50/20'
              : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-600 font-heading">مرضى</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">
              {isLoading && !overview ? (
                <span className="inline-block w-12 h-8 bg-slate-100 animate-pulse rounded"></span>
              ) : (
                overview?.allPatients.count ?? 0
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-sans mt-3 border-t border-slate-100 pt-2.5 leading-relaxed">
            جميع المرضى المسجلين بالعيادة
          </p>
        </button>

        {/* CARD 2: متابعة المريض */}
        <button
          type="button"
          onClick={() => handleCardClick('followUp')}
          className={`bg-white rounded-2xl p-5 border text-right transition-all cursor-pointer flex flex-col justify-between ${
            selectedCategory === 'followUp'
              ? 'ring-2 ring-blue-600 border-blue-600 shadow-md bg-blue-50/20'
              : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-600 font-heading">متابعة المريض</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-blue-700 font-mono tracking-tight tabular-nums">
              {isLoading && !overview ? (
                <span className="inline-block w-12 h-8 bg-slate-100 animate-pulse rounded"></span>
              ) : (
                overview?.followUp.count ?? 0
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-sans mt-3 border-t border-slate-100 pt-2.5 leading-relaxed">
            مرضى مسجلون في المتابعة بقرار الطبيب
          </p>
        </button>

        {/* CARD 3: لم يعودوا أكثر من شهر */}
        <button
          type="button"
          onClick={() => handleCardClick('notReturned')}
          className={`rounded-2xl p-5 border text-right transition-all cursor-pointer flex flex-col justify-between bg-rose-50/80 border-rose-200 text-rose-800 ${
            selectedCategory === 'notReturned'
              ? 'ring-2 ring-rose-500 border-rose-500 shadow-md'
              : 'hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-rose-800 font-heading">لم يعودوا أكثر من شهر</span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-rose-600 font-mono tracking-tight tabular-nums">
              {isLoading && !overview ? (
                <span className="inline-block w-12 h-8 bg-rose-100 animate-pulse rounded"></span>
              ) : (
                overview?.notReturned.count ?? 0
              )}
            </div>
          </div>
          <p className="text-[11px] text-rose-700/90 font-sans mt-3 border-t border-rose-200/70 pt-2.5 leading-relaxed">
            غياب متواصل وتأخر عن العودة أكثر من {noReturnDays} يوماً
          </p>
        </button>

        {/* CARD 4: أكثر مرض */}
        <button
          type="button"
          onClick={() => handleCardClick('topDiseases')}
          className={`rounded-2xl p-5 border text-right transition-all cursor-pointer flex flex-col justify-between group ${
            selectedCategory === 'topDiseases'
              ? 'ring-2 ring-indigo-600 border-indigo-600 shadow-md bg-indigo-50/20'
              : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-xs'
          }`}
          title="انقر لفتح جدول أكثر الأمراض تلقائياً في الصفحة"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-slate-600 font-heading">أكثر مرض</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                  selectedCategory === 'topDiseases'
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-700 bg-indigo-50 group-hover:bg-indigo-100 border border-indigo-200'
                }`}>
                  <span>عرض بالجدول ↓</span>
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <div
                className="text-lg font-extrabold text-slate-900 font-heading truncate"
                title={overview?.topDisease.name}
              >
                {isLoading && !overview ? (
                  <span className="inline-block w-24 h-6 bg-slate-100 animate-pulse rounded"></span>
                ) : (
                  overview?.topDisease.name || 'لا توجد بيانات'
                )}
              </div>
              <div className="text-xs font-mono font-bold text-indigo-700 tabular-nums mt-0.5">
                {overview && overview.topDisease.count > 0 ? (
                  `${overview.topDisease.count} ${overview.topDisease.count === 1 ? 'مريض' : 'مرضى'}`
                ) : (
                  '0 مرضى'
                )}
              </div>
            </div>
          </div>

          {/* Top 5 Diseases Bars Preview */}
          <div className="mt-3 border-t border-slate-100 pt-2.5 space-y-1.5">
            {overview && overview.topDiseases.length > 0 ? (
              overview.topDiseases.slice(0, 5).map((d, idx) => {
                const maxCount = overview.topDisease.count || 1;
                const pct = Math.round((d.count / maxCount) * 100);
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                      <span className="truncate max-w-[130px]" title={d.name}>
                        {d.name}
                      </span>
                      <span className="font-mono text-indigo-700 tabular-nums shrink-0 mr-1">
                        {d.count}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-[11px] text-slate-400 py-2 text-center">
                لا توجد أمراض مسجلة
              </div>
            )}
          </div>

          <p className="text-[11px] text-indigo-600 font-sans mt-3 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>انقر للعرض التلقائي في جدول الصفحة</span>
            <span className="font-mono font-bold text-indigo-700">({overview?.topDiseases.length || 0})</span>
          </p>
        </button>
      </div>

      {/* TABLE SECTION */}
      <div
        ref={tableSectionRef}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all"
      >
        {/* Table Header with Search, Days Filter, and Category Title */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-7 rounded-full shrink-0 ${
              selectedCategory === 'notReturned'
                ? 'bg-rose-500'
                : selectedCategory === 'followUp'
                ? 'bg-emerald-500'
                : selectedCategory === 'topDiseases'
                ? 'bg-indigo-600'
                : 'bg-blue-600'
            }`} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">
                  {currentCategoryInfo.title}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold tabular-nums ${
                  selectedCategory === 'notReturned'
                    ? 'bg-rose-100 text-rose-800'
                    : selectedCategory === 'topDiseases'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedCategory === 'topDiseases'
                    ? `${filteredDiseasesList.length} مرض`
                    : `${filteredList.length} ${filteredList.length === 1 ? 'مريض' : 'مرضى'}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentCategoryInfo.desc}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Days Filter Input (shown for notReturned category) */}
            {selectedCategory === 'notReturned' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-3 py-1.5 rounded-xl text-xs shadow-2xs">
                <label htmlFor="noReturnDaysInput" className="text-slate-600 font-bold whitespace-nowrap text-[11px]">
                  حد الغياب (أيام):
                </label>
                <input
                  id="noReturnDaysInput"
                  type="number"
                  min="1"
                  max="365"
                  value={noReturnDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setNoReturnDays(!isNaN(val) && val > 0 ? val : 30);
                  }}
                  className="w-14 px-1.5 py-0.5 text-center font-mono font-bold text-slate-900 border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Quick Add Button inside table toolbar */}
            {selectedCategory === 'followUp' && (
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مريض للمتابعة</span>
              </button>
            )}

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  selectedCategory === 'topDiseases'
                    ? 'ابحث في قائمة الأمراض والتشخيصات...'
                    : 'بحث بالاسم، الهاتف، سبب المتابعة، الإجراء...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 placeholder:text-slate-400 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SUB-FILTER TABS FOR FOLLOW-UP CATEGORY */}
        {selectedCategory === 'followUp' && (
          <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setFollowUpSubFilter('allActive')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                followUpSubFilter === 'allActive'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <span>جميع المتابعات النشطة</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                followUpSubFilter === 'allActive' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {subCounts.allActive}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFollowUpSubFilter('due')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                followUpSubFilter === 'due'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>حان موعدها</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                followUpSubFilter === 'due' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                {subCounts.due}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFollowUpSubFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                followUpSubFilter === 'overdue'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-800 hover:bg-rose-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>متأخرة</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                followUpSubFilter === 'overdue' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-900'
              }`}>
                {subCounts.overdue}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFollowUpSubFilter('completed')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                followUpSubFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>المكتملة والسابقة</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                followUpSubFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
              }`}>
                {subCounts.completed}
              </span>
            </button>
          </div>
        )}

        {/* STATS BOXES FOR TOP DISEASES */}
        {selectedCategory === 'topDiseases' && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/70 via-slate-50/60 to-amber-50/60 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  إجمالي الأمراض المسجلة
                </span>
                <div className="text-2xl font-extrabold text-indigo-900 font-mono tabular-nums">
                  {overview?.topDiseases.length || 0}
                  <span className="text-xs font-bold text-indigo-600 font-sans mr-1.5">مرضاً مصنفاً</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs flex items-center justify-between">
              <div className="min-w-0 pr-1">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  أكثر مرض انتشاراً
                </span>
                <div
                  className="text-base sm:text-lg font-extrabold text-amber-950 font-heading truncate max-w-[220px]"
                  title={overview?.topDisease.name}
                >
                  {overview?.topDisease.name || 'لا توجد بيانات'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                    {overview?.topDisease.count || 0} {overview?.topDisease.count === 1 ? 'مريض' : 'مرضى'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                <Award className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-2xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  إجمالي المرضى المشخصين
                </span>
                <div className="text-2xl font-extrabold text-emerald-900 font-mono tabular-nums">
                  {totalDiagnosedPatients}
                  <span className="text-xs font-bold text-emerald-600 font-sans mr-1.5">مريض</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {/* TABLE CONTAINER WITH HORIZONTAL SCROLL */}
        <div className="overflow-x-auto">
          {isLoading && !overview ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">جارٍ تحميل بيانات المتابعة...</p>
            </div>
          ) : selectedCategory === 'topDiseases' ? (
            /* DISEASES RANKED TABLE IN PAGE */
            filteredDiseasesList.length === 0 ? (
              <div className="py-16 text-center text-slate-500 px-4 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Filter className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">لا توجد نتائج مطابقة</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery ? `لم يتم العثور على أي مرض يطابق "${searchQuery}".` : 'لا توجد أمراض مسجلة حالياً.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold whitespace-nowrap">
                    <th className="py-3 px-4 w-24 text-center">المرتبة</th>
                    <th className="py-3 px-4">اسم المرض / التشخيص السريري</th>
                    <th className="py-3 px-4 text-center">عدد المرضى</th>
                    <th className="py-3 px-4 min-w-[200px]">نسبة الانتشار</th>
                    <th className="py-3 px-4 text-center">المرضى المصابون</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDiseasesList.map((disease, idx) => {
                    const patientsWithDisease = getPatientsForDisease(disease.name);
                    const isExpanded = expandedDisease === disease.name;
                    const maxCount = overview?.topDisease.count || 1;
                    const pctOfTop = Math.round((disease.count / maxCount) * 100);
                    const pctOfTotal = totalDiagnosedPatients > 0
                      ? Math.round((disease.count / totalDiagnosedPatients) * 100)
                      : 0;

                    return (
                      <React.Fragment key={disease.name + idx}>
                        <tr className={`hover:bg-indigo-50/40 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {getRankBadge(idx)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-heading">{disease.name}</span>
                              {idx === 0 && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold font-sans">
                                  الأكثر تسجيلاً
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="font-mono font-extrabold text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
                              {disease.count} {disease.count === 1 ? 'مريض' : 'مرضى'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                                <span>{pctOfTotal}% من مجموع المرضى المشخصين</span>
                                <span className="text-slate-400">({disease.count} من {totalDiagnosedPatients})</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(6, pctOfTop)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setExpandedDisease(isExpanded ? null : disease.name)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isExpanded
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                              }`}
                            >
                              <span>{isExpanded ? 'إخفاء المرضى' : `استعراض المرضى (${patientsWithDisease.length})`}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="p-0 bg-slate-50/70 border-b border-indigo-100">
                              <div className="p-4 sm:p-5 space-y-3">
                                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                  <Users className="w-4 h-4 text-indigo-600" />
                                  <span>قائمة المرضى المشخصين بـ &quot;{disease.name}&quot; ({patientsWithDisease.length}):</span>
                                </h4>
                                {patientsWithDisease.length === 0 ? (
                                  <p className="text-xs text-slate-400 py-2">لا توجد بيانات تفصيلية للمرضى بهذا التشخيص.</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {patientsWithDisease.map((pt) => (
                                      <div
                                        key={pt.id}
                                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between gap-2"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <p className="font-bold text-slate-900 text-xs">{pt.fullName}</p>
                                            <p className="font-mono text-slate-600 text-[11px] mt-0.5" dir="ltr">
                                              {pt.phone || '-'}
                                            </p>
                                          </div>
                                          {getDiseaseStatusBadge(pt.diseaseStatus)}
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-500">
                                          <span>آخر زيارة: {formatDateDZ(pt.lastVisitDate)}</span>
                                          <button
                                            type="button"
                                            onClick={() => onOpenPatientDossier(pt.id)}
                                            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>فتح الملف</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : selectedCategory === 'followUp' ? (
            /* ============================================================== */
            /* DEDICATED INTENTIONAL FOLLOW-UP TABLE                           */
            /* ============================================================== */
            filteredList.length === 0 ? (
              <div className="py-16 text-center text-slate-500 px-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {followUpSubFilter === 'completed'
                    ? 'لا توجد سجلات متابعة مكتملة حالياً'
                    : 'لا يوجد مرضى في قائمة المتابعة حالياً'}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {searchQuery
                    ? 'لم يتم العثور على أي نتيجة مطابقة لكلمة البحث.'
                    : 'إضافة المريض للمتابعة عملية مقصودة يقوم بها الطبيب. انقر على زر "إضافة مريض للمتابعة" أعلاه لإدراج مريض ومتابعة علاجه.'}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة مريض للمتابعة الآن</span>
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold whitespace-nowrap">
                    <th className="py-3 px-4">المريض</th>
                    <th className="py-3 px-4">رقم الهاتف</th>
                    <th className="py-3 px-4">سبب المتابعة</th>
                    <th className="py-3 px-4">الإجراء القادم المطلوب</th>
                    <th className="py-3 px-4">تاريخ المتابعة القادمة</th>
                    <th className="py-3 px-4">آخر زيارة</th>
                    <th className="py-3 px-4 text-center">الأولوية</th>
                    <th className="py-3 px-4 text-center">حالة المتابعة</th>
                    <th className="py-3 px-4 text-center min-w-[140px]">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((pt) => {
                    const isCompleted = pt.followUpStatus === 'completed';
                    return (
                      <tr
                        key={pt.followUpId || pt.id}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          pt.followUpStatus === 'due'
                            ? 'bg-amber-50/30'
                            : pt.followUpStatus === 'overdue'
                            ? 'bg-rose-50/20'
                            : ''
                        }`}
                      >
                        {/* Name & File No */}
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <button
                            type="button"
                            onClick={() => onOpenPatientDossier(pt.id)}
                            className="hover:text-blue-600 transition-colors text-right cursor-pointer block font-heading text-xs"
                          >
                            {pt.fullName}
                          </button>
                          <span className="text-[10px] font-mono text-slate-400 font-normal">
                            ملف #{pt.id.slice(-6)}
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-slate-700 font-semibold text-xs tabular-nums block" dir="ltr">
                            {pt.phone || '-'}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-4 font-medium text-slate-800">
                          <span className="inline-block bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            {pt.followUpReason || pt.reason || 'متابعة سريرية'}
                          </span>
                        </td>

                        {/* Next Procedure */}
                        <td className="py-3 px-4 font-semibold text-blue-900 max-w-[200px] truncate" title={pt.nextProcedure}>
                          {pt.nextProcedure || '-'}
                        </td>

                        {/* Target Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {pt.targetDate ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{formatDateDZ(pt.targetDate)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">غير محدد</span>
                          )}
                        </td>

                        {/* Last Visit */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {formatDateDZ(pt.lastVisitDate)}
                          <span className="text-[10px] text-slate-400 block font-sans">
                            (منذ {pt.daysSinceLastVisit} يوم)
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {getPriorityBadge(pt.priority)}
                        </td>

                        {/* Follow-up Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {getFollowUpStatusBadge(pt.followUpStatus)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Complete Action (if not already completed) */}
                            {!isCompleted && pt.followUpId && (
                              <button
                                type="button"
                                onClick={() => handleCompleteFollowUp(pt.followUpId!, pt.fullName)}
                                title="تسجيل أن المتابعة تمت بنجاح"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تمت</span>
                              </button>
                            )}

                            {/* Edit Action */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(pt)}
                              title="تعديل بيانات وتاريخ المتابعة"
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-slate-200"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Open Dossier */}
                            <button
                              type="button"
                              onClick={() => onOpenPatientDossier(pt.id)}
                              title="فتح الملف الطبي للمريض"
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-slate-200"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            {/* Cancel Follow-Up */}
                            {!isCompleted && pt.followUpId && (
                              <button
                                type="button"
                                onClick={() => handleCancelFollowUp(pt.followUpId!, pt.fullName)}
                                title="إلغاء المتابعة"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            /* ============================================================== */
            /* PATIENTS TABLE FOR all and notReturned                          */
            /* ============================================================== */
            filteredList.length === 0 ? (
              <div className="py-16 text-center text-slate-500 px-4 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Filter className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">لا يوجد مرضى في هذه الخانة</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? 'لم يتم العثور على نتائج مطابقة لكلمة البحث.'
                    : selectedCategory === 'notReturned'
                    ? `ممتاز! لا يوجد أي مريض متأخر عن العودة أكثر من ${noReturnDays} يوماً.`
                    : 'القائمة فارغة حالياً وفق المعايير المحددة.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold whitespace-nowrap">
                    <th className="py-3 px-4">المريض</th>
                    <th className="py-3 px-4">رقم الهاتف</th>
                    <th className="py-3 px-4">آخر زيارة</th>
                    <th className="py-3 px-4">الغياب</th>
                    <th className="py-3 px-4">المرض والتشخيص</th>
                    <th className="py-3 px-4">حالة المتابعة الحالية</th>
                    <th className="py-3 px-4 text-center min-w-[160px]">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((pt) => {
                    const isLongAbsence = selectedCategory === 'notReturned' || pt.daysSinceLastVisit > noReturnDays;
                    const hasActiveFollowUp = Boolean(pt.followUpId);

                    return (
                      <tr
                        key={pt.id}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        {/* Name & ID */}
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <button
                            type="button"
                            onClick={() => onOpenPatientDossier(pt.id)}
                            className="hover:text-blue-600 transition-colors text-right cursor-pointer block font-heading"
                          >
                            {pt.fullName}
                          </button>
                          <span className="text-[10px] font-mono text-slate-400 font-normal">
                            مسجل: {formatDateDZ(pt.createdAt?.slice(0, 10))}
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-slate-700 font-semibold text-xs tabular-nums block" dir="ltr">
                            {pt.phone || '-'}
                          </span>
                        </td>

                        {/* Last Visit Date */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono tabular-nums">
                              {formatDateDZ(pt.lastVisitDate)}
                            </span>
                          </div>
                        </td>

                        {/* Days Since Last Visit */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-mono font-bold tabular-nums px-2 py-0.5 rounded text-[11px] inline-block ${
                              isLongAbsence
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {pt.daysSinceLastVisit} يوماً
                          </span>
                        </td>

                        {/* Disease */}
                        <td className="py-3.5 px-4 font-medium text-slate-800 max-w-[180px] truncate" title={pt.diseaseCondition}>
                          {pt.diseaseCondition || '-'}
                        </td>

                        {/* Status & Reason */}
                        <td className="py-3.5 px-4">
                          {hasActiveFollowUp ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <Clock className="w-3 h-3 text-blue-600" />
                                <span>في المتابعة: {pt.followUpReason || pt.reason}</span>
                              </span>
                              {pt.targetDate && (
                                <span className="block text-[10px] text-slate-500 font-mono">
                                  موعدها: {formatDateDZ(pt.targetDate)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getDiseaseStatusBadge(pt.diseaseStatus)}
                              <span className="text-[11px] text-slate-500 font-sans">
                                {pt.reason}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Intentional Follow-up Trigger */}
                            {hasActiveFollowUp ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(pt)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
                                title="تعديل المتابعة الحالية"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل المتابعة</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenAddModal(pt.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-blue-200"
                                title="إضافة المريض للمتابعة بقرار الطبيب"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ متابعة</span>
                              </button>
                            )}

                            {/* Open Patient Dossier */}
                            <button
                              type="button"
                              onClick={() => onOpenPatientDossier(pt.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="فتح الملف الطبي الكامل"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>الملف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      {/* Follow-Up Modal */}
      <FollowUpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(_record, msg) => {
          showNotification(msg);
          fetchOverview(noReturnDays, true);
          setSelectedCategory('followUp');
          onFollowUpChanged?.();
        }}
        editRecord={modalEditRecord}
        preSelectedPatientId={modalPreSelectedPatientId}
        patients={patients}
        activeFollowUps={activeFollowUps}
        onOpenPatientDossier={onOpenPatientDossier}
      />
    </div>
  );
};
