import React, { useState, useEffect, useMemo } from 'react';
import {
  Patient,
  FollowUpRecord,
  FollowUpReason,
  FollowUpPriority,
  FollowUpStatus,
} from '../types';
import {
  X,
  Clock,
  Calendar,
  AlertCircle,
  AlertTriangle,
  User,
  Activity,
  FileText,
  BookmarkCheck,
  CheckCircle2,
  CalendarPlus,
} from 'lucide-react';
import { clinicApi } from '../services/api';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (record: FollowUpRecord, message: string) => void;
  onSaved?: () => void;
  // If provided, the modal operates in Edit mode for this record
  editRecord?: FollowUpRecord | null;
  initialRecord?: FollowUpRecord | null;
  // If pre-selected (e.g. opened from Patient Dossier or Appointment completion)
  preSelectedPatientId?: string;
  // All registered patients to select from
  patients: Patient[];
  // Existing active follow-ups to check for duplicates
  activeFollowUps?: FollowUpRecord[];
  onOpenPatientDossier?: (patientId: string) => void;
  onShowToast?: (message: string) => void;
}

const REASONS: { label: FollowUpReason; desc: string }[] = [
  { label: 'استكمال علاج', desc: 'متابعة لإكمال خطة العلاج المعتمدة' },
  { label: 'علاج متعدد الجلسات', desc: 'علاج جذور، تبييض، أو جلسات متعددة' },
  { label: 'مراقبة بعد عملية', desc: 'فحص التئام الجرح بعد خلع أو جراحة' },
  { label: 'مراجعة بعد العلاج', desc: 'فحص الحشوات أو التركيبات بعد التركيب' },
  { label: 'أسباب أخرى', desc: 'حالة طبية أو فحص دوري خاص' },
];

const PRIORITIES: { id: FollowUpPriority; label: string; color: string; badge: string }[] = [
  { id: 'normal', label: 'عادية', color: 'border-slate-300 text-slate-700 hover:bg-slate-50', badge: 'bg-slate-100 text-slate-700' },
  { id: 'high', label: 'مهمة', color: 'border-amber-400 text-amber-800 hover:bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
  { id: 'urgent', label: 'مستعجلة', color: 'border-rose-400 text-rose-800 hover:bg-rose-50', badge: 'bg-rose-100 text-rose-800' },
];

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSaved,
  editRecord,
  initialRecord,
  preSelectedPatientId,
  patients,
  activeFollowUps = [],
  onOpenPatientDossier,
  onShowToast,
}) => {
  const currentRecord = editRecord || initialRecord || null;
  const isEdit = Boolean(currentRecord);

  const [patientId, setPatientId] = useState<string>(
    currentRecord?.patientId || preSelectedPatientId || ''
  );
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [reason, setReason] = useState<FollowUpReason | string>(
    editRecord?.reason || 'استكمال علاج'
  );
  const [customReason, setCustomReason] = useState<string>('');
  const [nextProcedure, setNextProcedure] = useState<string>(
    editRecord?.nextProcedure || ''
  );
  const [targetDate, setTargetDate] = useState<string>(
    editRecord?.targetDate || ''
  );
  const [priority, setPriority] = useState<FollowUpPriority>(
    editRecord?.priority || 'normal'
  );
  const [status, setStatus] = useState<FollowUpStatus>(
    editRecord?.status || 'pending'
  );
  const [notes, setNotes] = useState<string>(
    editRecord?.notes || ''
  );
  const [createAppointment, setCreateAppointment] = useState<boolean>(false);
  const [appointmentTime, setAppointmentTime] = useState<string>('10:00');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when currentRecord or preSelectedPatientId changes
  useEffect(() => {
    if (currentRecord) {
      setPatientId(currentRecord.patientId);
      const isKnownReason = REASONS.some(r => r.label === currentRecord.reason);
      if (isKnownReason) {
        setReason(currentRecord.reason);
        setCustomReason('');
      } else {
        setReason('أسباب أخرى');
        setCustomReason(currentRecord.reason);
      }
      setNextProcedure(currentRecord.nextProcedure || '');
      setTargetDate(currentRecord.targetDate || '');
      setPriority(currentRecord.priority || 'normal');
      setStatus(currentRecord.status || 'pending');
      setNotes(currentRecord.notes || '');
      setCreateAppointment(false);
    } else {
      setPatientId(preSelectedPatientId || '');
      setReason('استكمال علاج');
      setCustomReason('');
      setNextProcedure('');
      setTargetDate('');
      setPriority('normal');
      setStatus('pending');
      setNotes('');
      setCreateAppointment(false);
      setAppointmentTime('10:00');
    }
    setErrorMessage(null);
  }, [currentRecord, preSelectedPatientId, isOpen]);

  // Selected patient object
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === patientId);
  }, [patients, patientId]);

  // Check if chosen patient already has an active follow-up (in create mode)
  const existingActiveFollowUp = useMemo(() => {
    if (isEdit || !patientId) return null;
    return activeFollowUps.find(
      f => f.patientId === patientId && ['pending', 'due', 'overdue'].includes(f.status)
    );
  }, [isEdit, patientId, activeFollowUps]);

  // Filtered patients for dropdown search
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 50);
    return patients
      .filter(p =>
        p.fullName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.diseaseCondition && p.diseaseCondition.toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [patients, patientSearch]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!patientId) {
      setErrorMessage('يرجى اختيار المريض.');
      return;
    }

    const finalReason = reason === 'أسباب أخرى' && customReason.trim()
      ? customReason.trim()
      : reason;

    if (!finalReason) {
      setErrorMessage('يرجى تحديد سبب المتابعة.');
      return;
    }

    if (!nextProcedure.trim()) {
      setErrorMessage('يرجى كتابة الإجراء المطلوب في الزيارة القادمة.');
      return;
    }

    if (existingActiveFollowUp) {
      setErrorMessage('تنبيه: هذا المريض لديه متابعة نشطة بالفعل. لا يمكن تكرار تسجيله في المتابعة.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && currentRecord) {
        const updated = await clinicApi.updateFollowUp(currentRecord.id, {
          reason: finalReason,
          nextProcedure: nextProcedure.trim(),
          targetDate: targetDate || undefined,
          priority,
          status,
          notes: notes.trim() || undefined,
        });
        if (onSuccess) onSuccess(updated, 'تم تحديث بيانات متابعة المريض بنجاح');
        if (onSaved) onSaved();
        if (onShowToast) onShowToast('تم تحديث بيانات متابعة المريض بنجاح');
        onClose();
      } else {
        const created = await clinicApi.createFollowUp({
          patientId,
          reason: finalReason,
          nextProcedure: nextProcedure.trim(),
          targetDate: targetDate || undefined,
          priority,
          status: 'pending',
          notes: notes.trim() || undefined,
          createAppointment: createAppointment && Boolean(targetDate),
          appointmentTime: createAppointment ? appointmentTime : undefined,
        });
        if (onSuccess) onSuccess(created, 'تمت إضافة المريض إلى قائمة المتابعة بنجاح');
        if (onSaved) onSaved();
        if (onShowToast) onShowToast('تمت إضافة المريض إلى قائمة المتابعة بنجاح');
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ سجل المتابعة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-xs border border-white/15">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-heading tracking-tight">
                {isEdit ? 'تعديل بيانات متابعة المريض' : 'إضافة مريض للمتابعة'}
              </h2>
              <p className="text-xs text-blue-100 font-sans mt-0.5">
                متابعة مقصودة للحالات السريرية التي تتطلب مراجعة أو استكمال علاج
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs text-slate-800">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs font-semibold leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* 1. Patient Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              1. المريض: <span className="text-rose-500">*</span>
            </label>

            {isEdit || preSelectedPatientId ? (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      {selectedPatient?.fullName || 'المريض المحدد'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500" dir="ltr">
                      {selectedPatient?.phone || '-'}
                    </span>
                  </div>
                </div>
                {selectedPatient && onOpenPatientDossier && (
                  <button
                    type="button"
                    onClick={() => onOpenPatientDossier(selectedPatient.id)}
                    className="text-blue-700 hover:text-blue-900 text-xs font-bold underline cursor-pointer"
                  >
                    عرض الملف
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="ابحث عن مريض بالاسم أو الهاتف..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                />
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- اختر مريضاً من القائمة ({patients.length}) --</option>
                  {filteredPatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} - {p.phone} {p.diseaseCondition ? `(${p.diseaseCondition})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Duplicate active follow-up warning */}
            {existingActiveFollowUp && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2.5 mt-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>تنبيه تكرار:</strong> هذا المريض لديه متابعة نشطة مسبقاً (
                  <span className="font-bold">{existingActiveFollowUp.reason}</span>
                  {existingActiveFollowUp.targetDate && ` - موعدها: ${existingActiveFollowUp.targetDate}`}
                  ). لا يسمح بتسجيله مرتين في نفس الوقت.
                </div>
              </div>
            )}
          </div>

          {/* 2. Reason for Follow-Up */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              2. سبب المتابعة: <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASONS.map(r => (
                <label
                  key={r.label}
                  className={`p-2.5 rounded-xl border text-right cursor-pointer flex items-start gap-2 transition-all ${
                    reason === r.label
                      ? 'bg-blue-50/80 border-blue-500 shadow-2xs ring-1 ring-blue-500 text-blue-900 font-bold'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="followUpReason"
                    value={r.label}
                    checked={reason === r.label}
                    onChange={() => setReason(r.label)}
                    className="mt-0.5 text-blue-600 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs">{r.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal leading-tight block mt-0.5">
                      {r.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {reason === 'أسباب أخرى' && (
              <input
                type="text"
                placeholder="أدخل سبب المتابعة المخصص..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
                required={reason === 'أسباب أخرى'}
              />
            )}
          </div>

          {/* 3. Next Procedure Required */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              3. الإجراء المطلوب في الزيارة القادمة: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: حشوة ضوئية نهائية للضرس 16، فك القطب، قياس مقاس الجسر..."
              value={nextProcedure}
              onChange={(e) => setNextProcedure(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-blue-500 focus:outline-none font-medium shadow-2xs"
            />
          </div>

          {/* 4. Target Follow-Up Date & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">
                4. تاريخ المتابعة القادمة: <span className="text-slate-400 font-normal">(اختياري)</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">
                5. الأولوية: <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      priority === p.id
                        ? `${p.badge} ring-2 ring-offset-1 ring-blue-500 shadow-xs border-transparent`
                        : p.color
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Option to link/create an appointment in schedule */}
          {!isEdit && targetDate && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-indigo-950 font-bold text-xs select-none">
                <input
                  type="checkbox"
                  checked={createAppointment}
                  onChange={(e) => setCreateAppointment(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
                <CalendarPlus className="w-4 h-4 text-indigo-600" />
                <span>حجز موعد للمريض في جدول المواعيد في هذا التاريخ تلقائياً</span>
              </label>
              {createAppointment && (
                <div className="flex items-center gap-2 pr-6">
                  <span className="text-slate-600 text-[11px] font-semibold">توقيت الموعد:</span>
                  <input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-indigo-900"
                  />
                </div>
              )}
            </div>
          )}

          {/* Edit Mode: Status selector */}
          {isEdit && (
            <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block font-bold text-slate-700">
                حالة المتابعة:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FollowUpStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="pending">قيد المتابعة (جارية)</option>
                <option value="due">حان موعد المتابعة</option>
                <option value="overdue">متأخر عن المتابعة</option>
                <option value="completed">مكتملة (تمت المتابعة)</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </div>
          )}

          {/* 6. Optional Note */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              6. ملاحظات إضافية: <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <textarea
              rows={2}
              placeholder="أي توصيات أو تفاصيل سريرية تفيد في المتابعة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(existingActiveFollowUp)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isEdit ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isEdit ? 'حفظ التعديلات' : 'تأكيد إضافة المريض للمتابعة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
