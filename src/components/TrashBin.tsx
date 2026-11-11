import React, { useState, useEffect, useMemo } from 'react';
import { Patient } from '../types';
import { clinicApi } from '../services/api';
import {
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  Clock,
  UserCheck,
  ShieldAlert,
  Calendar,
  X,
  Phone,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface TrashBinProps {
  onRefreshAllData: () => Promise<void>;
  onShowToast?: (message: string) => void;
}

export const TrashBin: React.FC<TrashBinProps> = ({
  onRefreshAllData,
  onShowToast,
}) => {
  const [trashedPatients, setTrashedPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientToPurge, setPatientToPurge] = useState<Patient | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [restoringPatientId, setRestoringPatientId] = useState<string | null>(null);

  const fetchTrashed = async () => {
    setIsLoading(true);
    try {
      const data = await clinicApi.getTrashedPatients();
      setTrashedPatients(data || []);
    } catch (err: any) {
      console.error('Failed to fetch trashed patients:', err);
      onShowToast?.(err?.message || 'تعذر تحميل سلة المحذوفات.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashed();
  }, []);

  const calculateDaysRemaining = (deletedAt?: string) => {
    if (!deletedAt) return 30;
    const deletedTime = new Date(deletedAt).getTime();
    const elapsedMs = Date.now() - deletedTime;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const remainingMs = thirtyDaysMs - elapsedMs;
    const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  };

  const formatDeletionDate = (dateStr?: string) => {
    if (!dateStr) return 'غير محدد';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-DZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleRestore = async (patient: Patient) => {
    setRestoringPatientId(patient.id);
    try {
      await clinicApi.restorePatient(patient.id);
      onShowToast?.(`تم استرجاع المريض "${patient.fullName}" وكافة سجلاته بنجاح.`);
      await fetchTrashed();
      await onRefreshAllData();
    } catch (err: any) {
      onShowToast?.(err?.message || 'تعذر استرجاع المريض.');
    } finally {
      setRestoringPatientId(null);
    }
  };

  const handlePurge = async () => {
    if (!patientToPurge) return;
    setIsPurging(true);
    try {
      await clinicApi.purgePatient(patientToPurge.id);
      onShowToast?.(`تم الحذف النهائي لملف المريض "${patientToPurge.fullName}" وجميع مرفقاته بنجاح.`);
      setPatientToPurge(null);
      await fetchTrashed();
      await onRefreshAllData();
    } catch (err: any) {
      onShowToast?.(err?.message || 'تعذر الحذف النهائي للمريض.');
    } finally {
      setIsPurging(false);
    }
  };

  const filteredPatients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return trashedPatients;
    return trashedPatients.filter(
      p =>
        p.fullName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.deletedBy && p.deletedBy.toLowerCase().includes(q))
    );
  }, [trashedPatients, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading">
                سلة المحذوفات (حذف مؤقت للمرضى)
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-mono">
                {trashedPatients.length} {trashedPatients.length === 1 ? 'مريض' : 'مرضى'} في السلة
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              تُحفظ ملفات المرضى المحذوفين لمدة 30 يوماً قبل الحذف النهائي التلقائي. يمكنك استرجاع أي مريض في أي وقت.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTrashed}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs text-amber-900 font-sans leading-relaxed">
        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">نظام الحماية والاسترجاع: </span>
          عند نقل المريض إلى سلة المحذوفات، تبقى جميع مواعيده السابقة، وفواتيره، وتشخيصاته، ومرفقاته وصوره الشعاعية محفوظة ومشفّرة محلياً دون أي فقدان. لا تظهر المواعيد المجدولة في التقويم ولا تُرسل لها تذكيرات طالما أن المريض في السلة. وبمجرد النقر على <strong>&quot;استرجاع&quot;</strong>، يعود الملف بالكامل وبكافة سجلاته فورياً.
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في سلة المحذوفات بالاسم، رقم الهاتف، المعرف، أو اسم من حذفه..."
            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Trashed Patients List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-8 h-8 border-3 border-rose-500/30 border-t-rose-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">جارٍ تحميل محتويات سلة المحذوفات...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 font-heading">
            {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'سلة المحذوفات فارغة تماماً'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-sans">
            {searchQuery
              ? 'جرّب كتابة اسم آخر أو رقم هاتف مختلف للبحث في السلة.'
              : 'لا يوجد أي مريض محذوف مؤقتاً في السلة حالياً. جميع ملفات المرضى نشطة وفي مكانها الآمن.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPatients.map((patient) => {
            const daysLeft = calculateDaysRemaining(patient.deletedAt);
            const isCritical = daysLeft <= 3;
            const isMedium = daysLeft > 3 && daysLeft <= 10;
            const isRestoring = restoringPatientId === patient.id;

            return (
              <div
                key={patient.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                      {patient.id}
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">
                      {patient.fullName}
                    </h4>
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{patient.phone}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 font-sans pt-1">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>تاريخ الحذف:</span>
                      <strong className="text-slate-700">{formatDeletionDate(patient.deletedAt)}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>حُذف بواسطة:</span>
                      <strong className="text-slate-800">{patient.deletedBy || 'طبيب العيادة'}</strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>المتبقي قبل الحذف النهائي:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-[11px] font-sans ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                            : isMedium
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {daysLeft === 0
                          ? 'وشيك الحذف النهائي اليوم'
                          : daysLeft === 1
                          ? 'يوم واحد متبقٍ'
                          : `${daysLeft} أيام متبقية`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={() => handleRestore(patient)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
                    title="استرجاع المريض بكامل مواعيده وفواتيره وملفاته"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                    <span>{isRestoring ? 'جارٍ الاسترجاع...' : 'استرجاع'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPatientToPurge(patient)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="حذف نهائي لا رجعة فيه"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>حذف نهائي</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal: Permanent Purge */}
      {patientToPurge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">
                  تأكيد الحذف النهائي للمريض
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  تحذير: هذه العملية نهائية ولا يمكن التراجع عنها أبداً
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed space-y-2">
              <p>
                هل أنت متأكد من رغبتك في حذف ملف المريض التالي بشكل نهائي من سلة المحذوفات؟
              </p>
              <div className="font-bold text-sm text-slate-900 bg-white/90 p-2.5 rounded-lg border border-rose-200">
                {patientToPurge.fullName} ({patientToPurge.id})
              </div>
              <p className="text-[11px] text-rose-700">
                ⚠️ سيتم محو المريض، وجميع مواعيده، وفواتيره، وسجلاته السريرية، وصوره الشعاعية وملفاته المحفوظة على القرص بشكل دائم.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isPurging}
                onClick={() => setPatientToPurge(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                disabled={isPurging}
                onClick={handlePurge}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isPurging ? 'جارٍ الحذف النهائي...' : 'نعم، حذف نهائي الآن'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
