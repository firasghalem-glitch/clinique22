import React, { useState, useEffect } from 'react';
import { Appointment, Patient } from '../types';
import {
  Calendar as CalendarIcon,
  List,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { getAppointmentUrgency } from '../utils/appointmentAlerts';
import { getClinicTodayStr, getClinicTomorrowStr, getClinicDateOffsetStr } from '../utils/clinicDate';
import { FollowUpModal } from './FollowUpModal';

interface AppointmentsProps {
  appointments: Appointment[];
  patients: Patient[];
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onOpenPatientDossier: (patientId: string) => void;
  initialDateFilter?: string;
  onRefresh?: () => Promise<void>;
}

export const Appointments: React.FC<AppointmentsProps> = ({
  appointments,
  patients,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onOpenPatientDossier,
  initialDateFilter,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'tomorrow' | 'week'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string>(initialDateFilter || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const [formPatientId, setFormPatientId] = useState('');
  const [formDate, setFormDate] = useState(getClinicTodayStr());
  const [formTime, setFormTime] = useState('09:00');
  const [formProcedure, setFormProcedure] = useState('كشف وتشخيص عام');
  const [formStatus, setFormStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [aptToDelete, setAptToDelete] = useState<Appointment | null>(null);
  const [isDeletingApt, setIsDeletingApt] = useState(false);
  const [followUpPatientId, setFollowUpPatientId] = useState<string | null>(null);
  const [completedNoticePatient, setCompletedNoticePatient] = useState<Patient | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (initialDateFilter) {
      setSelectedCustomDate(initialDateFilter);
      setFormDate(initialDateFilter);
    }
  }, [initialDateFilter]);

  const todayStr = getClinicTodayStr();
  const tomorrowStr = getClinicTomorrowStr();

  const getPatient = (id: string) => patients.find(p => p.id === id);

  const formatDateDZ = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const checkCollision = (date: string, time: string, excludeId?: string) => {
    return appointments.find(a =>
      a.appointmentDate === date &&
      a.appointmentTime === time &&
      a.status !== 'cancelled' &&
      a.id !== excludeId
    );
  };

  const handleOpenAdd = (prefilledDate?: string) => {
    setEditingAppointment(null);
    setFormPatientId(patients[0]?.id || '');
    setFormDate(prefilledDate || todayStr);
    setFormTime('09:00');
    setFormProcedure('كشف وتشخيص عام');
    setFormStatus('scheduled');
    setFormNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (apt: Appointment) => {
    setEditingAppointment(apt);
    setFormPatientId(apt.patientId);
    setFormDate(apt.appointmentDate);
    setFormTime(apt.appointmentTime);
    setFormProcedure(apt.procedure);
    setFormStatus(apt.status);
    setFormNotes(apt.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formPatientId) {
      setFormError('يرجى اختيار المريض.');
      return;
    }
    if (!formDate || !formTime) {
      setFormError('يرجى تحديد تاريخ ووقت الموعد.');
      return;
    }

    if (formStatus !== 'cancelled') {
      const collision = checkCollision(formDate, formTime, editingAppointment?.id);
      if (collision) {
        const p = getPatient(collision.patientId);
        setFormError(`يوجد تعارض في الموعد (${formTime} يوم ${formatDateDZ(formDate)}) محجوز مسبقاً للمريض "${p ? p.fullName : 'آخر'}". يرجى اختيار توقيت آخر.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingAppointment) {
        await onUpdateAppointment(editingAppointment.id, {
          patientId: formPatientId,
          appointmentDate: formDate,
          appointmentTime: formTime,
          procedure: formProcedure,
          status: formStatus,
          notes: formNotes,
        });
      } else {
        await onAddAppointment({
          patientId: formPatientId,
          appointmentDate: formDate,
          appointmentTime: formTime,
          procedure: formProcedure,
          status: formStatus,
          notes: formNotes,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء حفظ الموعد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (searchQuery) {
      const p = getPatient(apt.patientId);
      const name = p ? p.fullName.toLowerCase() : '';
      const phone = p ? p.phone : '';
      const q = searchQuery.toLowerCase();
      if (!name.includes(q) && !phone.includes(q) && !apt.procedure.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && apt.status !== statusFilter) {
      return false;
    }
    if (selectedCustomDate) {
      return apt.appointmentDate === selectedCustomDate;
    }
    if (timeFilter === 'today') {
      return apt.appointmentDate === todayStr;
    } else if (timeFilter === 'tomorrow') {
      return apt.appointmentDate === tomorrowStr;
    } else if (timeFilter === 'week') {
      const nextWeek = getClinicDateOffsetStr(7, todayStr);
      return apt.appointmentDate >= todayStr && apt.appointmentDate <= nextWeek;
    }
    return true;
  });

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startOffset = (firstDayOfMonth + 1) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
  const resetToToday = () => setCalendarDate(new Date());

  const monthNames = [
    'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
    'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const commonProcedures = [
    'كشف وتشخيص عام',
    'تنظيف الجير (Détartrage)',
    'حشوة كمبوزيت (Composite)',
    'علاج عصب وجذور (Endodontie)',
    'قلع سن بسيط',
    'قلع ضرس جراحي',
    'تركيب تاج خزفي (Couronne)',
    'جلسة تقويم أسنان (Orthodontie)',
    'غرس زرعة سنية (Implantologie)',
    'تبييض الأسنان (Blanchiment)',
    'فحص دوري ومتابعة'
  ];

  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shadow-2xs shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
                جدول ومواعيد العيادة
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100/80 text-blue-800 font-heading tabular-nums">
                {appointments.length} موعد
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans leading-relaxed">
              إدارة مواعيد الكشف والعمليات السريرية، ومنع تضارب الأوقات، والتذكير التلقائي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4 text-blue-600" />
              <span>قائمة</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>تقويم شهري</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>حجز موعد جديد</span>
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => { setTimeFilter('all'); setSelectedCustomDate(''); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  timeFilter === 'all' && !selectedCustomDate
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                جميع المواعيد
              </button>
              <button
                onClick={() => { setTimeFilter('today'); setSelectedCustomDate(''); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  timeFilter === 'today' && !selectedCustomDate
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                مواعيد اليوم
              </button>
              <button
                onClick={() => { setTimeFilter('tomorrow'); setSelectedCustomDate(''); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  timeFilter === 'tomorrow' && !selectedCustomDate
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                مواعيد الغد
              </button>
              <button
                onClick={() => { setTimeFilter('week'); setSelectedCustomDate(''); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  timeFilter === 'week' && !selectedCustomDate
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                الأسبوع القادم
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>تاريخ محدد:</span>
                <input
                  type="date"
                  value={selectedCustomDate}
                  onChange={(e) => {
                    setSelectedCustomDate(e.target.value);
                    setTimeFilter('all');
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">كل الحالات</option>
                <option value="scheduled">مجدول</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغى</option>
              </select>

              <input
                type="text"
                placeholder="بحث بالمريض أو الإجراء..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
              />
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium">لا توجد مواعيد مسجلة مطابقة للبحث</p>
              <button
                onClick={() => handleOpenAdd()}
                className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium cursor-pointer"
              >
                + حجز موعد جديد
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/90 text-slate-700 font-heading font-bold border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-3 px-4 font-bold font-heading">تاريخ الموعد</th>
                    <th className="py-3 px-4 font-bold font-heading">الوقت والتوقيت</th>
                    <th className="py-3 px-4 font-bold font-heading">اسم المريض</th>
                    <th className="py-3 px-4 font-bold font-heading">نوع الإجراء الطبي</th>
                    <th className="py-3 px-4 font-bold font-heading">الحالة</th>
                    <th className="py-3 px-4 font-bold font-heading">ملاحظات</th>
                    <th className="py-3 px-4 text-center font-bold font-heading">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.map(apt => {
                    const patient = getPatient(apt.patientId);
                    const isToday = apt.appointmentDate === todayStr;
                    const urgency = getAppointmentUrgency(apt, currentTime);

                    return (
                      <tr
                        key={apt.id}
                        className={`transition-colors ${isToday ? urgency.rowClass : 'hover:bg-slate-50/70'}`}
                      >
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 tabular-nums">
                          <span className={isToday ? 'font-bold text-blue-700' : ''}>
                            {formatDateDZ(apt.appointmentDate)}
                          </span>
                          {isToday && (
                            <span className="mr-1.5 px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded">
                              اليوم
                            </span>
                          )}
                          {apt.appointmentDate === tomorrowStr && (
                            <span className="mr-1.5 px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded font-sans">
                              غداً
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 tabular-nums">
                              {apt.appointmentTime}
                            </span>
                            {isToday && apt.status === 'scheduled' && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono whitespace-nowrap ${urgency.badgeClass}`}>
                                {urgency.label}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => onOpenPatientDossier(apt.patientId)}
                            className="font-bold text-blue-700 hover:underline block text-right cursor-pointer"
                          >
                            {patient ? patient.fullName : 'مريض غير مسجل'}
                          </button>
                          {patient && (
                            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                              {patient.phone}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-800">
                          {apt.procedure}
                        </td>

                        <td className="py-3 px-4">
                          {apt.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              مكتمل
                            </span>
                          ) : apt.status === 'cancelled' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700">
                              <XCircle className="w-3 h-3" />
                              ملغى
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              <Clock className="w-3 h-3 text-slate-500" />
                              مجدول
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {apt.notes || '-'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {apt.status === 'scheduled' && (
                              <button
                                onClick={async () => {
                                  await onUpdateAppointment(apt.id, { status: 'completed' });
                                  if (patient) {
                                    setCompletedNoticePatient(patient);
                                  }
                                }}
                                title="إتمام الموعد"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setFollowUpPatientId(apt.patientId)}
                              title="إضافة أو تعديل متابعة هذا المريض"
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(apt)}
                              title="تعديل الموعد"
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAptToDelete(apt)}
                              title="حذف الموعد"
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading tracking-tight">
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={resetToToday}
                className="px-2.5 py-1 text-xs text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-md font-bold font-heading transition-colors cursor-pointer"
              >
                اليوم
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                title="الشهر السابق"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                title="الشهر التالي"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold font-heading text-slate-600 border-b border-slate-200 pb-2">
            <div>الأحد</div>
            <div>الإثنين</div>
            <div>الثلاثاء</div>
            <div>الأربعاء</div>
            <div>الخميس</div>
            <div>الجمعة</div>
            <div className="text-blue-700 font-extrabold">السبت</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 sm:h-28 bg-slate-50/50 rounded-lg border border-transparent"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dayStr === todayStr;
              const dayAppointments = appointments.filter(a => a.appointmentDate === dayStr);

              return (
                <div
                  key={dayStr}
                  onClick={() => handleOpenAdd(dayStr)}
                  className={`h-24 sm:h-28 p-1.5 sm:p-2 rounded-lg border transition-all flex flex-col justify-between cursor-pointer group hover:border-blue-500 hover:shadow-xs ${
                    isToday ? 'bg-blue-50/40 border-blue-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold tabular-nums font-mono ${
                      isToday ? 'text-blue-700' : 'text-slate-800'
                    }`}>
                      {dayNum}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 tabular-nums">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-16 mt-1">
                    {dayAppointments.slice(0, 3).map(apt => {
                      const p = getPatient(apt.patientId);
                      return (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(apt);
                          }}
                          className={`text-[10px] p-1 rounded font-medium truncate flex items-center justify-between ${
                            apt.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apt.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-700 line-through'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                          title={`${apt.appointmentTime} - ${p ? p.fullName : ''}: ${apt.procedure}`}
                        >
                          <span className="truncate">{p ? p.fullName.split(' ')[0] : 'مريض'}</span>
                          <span className="font-mono text-[9px] mr-1">{apt.appointmentTime}</span>
                        </div>
                      );
                    })}
                    {dayAppointments.length > 3 && (
                      <div className="text-[9px] text-slate-500 text-center">
                        +{dayAppointments.length - 3} المزيد
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 text-left">
                    + حجز
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD / EDIT APPOINTMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading tracking-tight flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span>{editingAppointment ? 'تعديل بيانات الموعد' : 'حجز موعد سريري جديد'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs leading-relaxed">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المريض: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  required
                >
                  <option value="">اختر المريض من السجل...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.phone}) - {p.patientType === 'new' ? 'جديد' : 'متابع'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الموعد: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التوقيت (الساعة): <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    required
                  >
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = String(Math.floor(i / 2)).padStart(2, '0');
                      const m = i % 2 === 0 ? '00' : '30';
                      return `${h}:${m}`;
                    }).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const collision = checkCollision(formDate, formTime, editingAppointment?.id);
                if (collision && formStatus !== 'cancelled') {
                  const p = getPatient(collision.patientId);
                  return (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        تنبيه تعارض: هذا التوقيت محجوز مسبقاً للمريض <strong>&quot;{p ? p.fullName : 'آخر'}&quot;</strong>.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نوع الإجراء الطبي أو الفحص: <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    value={commonProcedures.includes(formProcedure) ? formProcedure : 'other'}
                    onChange={(e) => {
                      if (e.target.value !== 'other') {
                        setFormProcedure(e.target.value);
                      } else {
                        setFormProcedure('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {commonProcedures.map(proc => (
                      <option key={proc} value={proc}>{proc}</option>
                    ))}
                    <option value="other">إجراء آخر مخصص...</option>
                  </select>
                  {!commonProcedures.includes(formProcedure) && (
                    <input
                      type="text"
                      placeholder="اكتب اسم الإجراء..."
                      value={formProcedure}
                      onChange={(e) => setFormProcedure(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  حالة الموعد:
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="scheduled"
                      checked={formStatus === 'scheduled'}
                      onChange={() => setFormStatus('scheduled')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>مجدول (قادم)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="completed"
                      checked={formStatus === 'completed'}
                      onChange={() => setFormStatus('completed')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-emerald-700 font-semibold">مكتمل (تم الحضور)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="cancelled"
                      checked={formStatus === 'cancelled'}
                      onChange={() => setFormStatus('cancelled')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>ملغى</span>
                  </label>
                </div>
                {formStatus === 'completed' && (
                  <p className="text-[11px] text-emerald-600 mt-1">
                    عند إتمام الموعد، سيتم تسجيله في كشف الحساب المالي وتحويل المريض الجديد لمتابع تلقائياً.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات إضافية:
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="أي ملاحظات خاصة بالجلسة..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'جارٍ الحفظ...' : editingAppointment ? 'تحديث الموعد' : 'تأكيد الحجز'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE APPOINTMENT CONFIRMATION MODAL */}
      {aptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">
                  تأكيد حذف الموعد السريري
                </h3>
                <p className="text-xs text-slate-500">
                  سيتم إزالة هذا الموعد من الجدول نهائياً
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed space-y-2">
              <p>
                هل أنت متأكد من حذف الموعد المحدد للمريض:
              </p>
              <div className="font-bold text-sm text-slate-900 bg-white/80 p-2 rounded-lg border border-rose-200 flex items-center justify-between">
                <span>{getPatient(aptToDelete.patientId)?.fullName || 'مريض غير مسجل'}</span>
                <span className="font-mono text-blue-800 text-xs">{aptToDelete.appointmentDate} - {aptToDelete.appointmentTime}</span>
              </div>
              <p className="text-[11px] text-slate-600">
                الإجراء: {aptToDelete.procedure}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingApt}
                onClick={() => setAptToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                disabled={isDeletingApt}
                onClick={async () => {
                  if (!aptToDelete) return;
                  setIsDeletingApt(true);
                  try {
                    await onDeleteAppointment(aptToDelete.id);
                    setAptToDelete(null);
                  } catch (err: any) {
                    console.error('Delete apt error:', err);
                  } finally {
                    setIsDeletingApt(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingApt ? 'جارٍ الحذف...' : 'نعم، حذف الموعد'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-appointment Follow-up Prompt */}
      {completedNoticePatient && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 max-w-md animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-sm text-white">تم إتمام الموعد بنجاح</div>
              <div className="text-slate-300 mt-1">
                هل ترغب في إدراج المريض <span className="font-bold text-white">{completedNoticePatient.fullName}</span> في قائمة المتابعة السريرية المقررة؟
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    const pid = completedNoticePatient.id;
                    setCompletedNoticePatient(null);
                    setFollowUpPatientId(pid);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
                >
                  نعم، إضافة للمتابعة
                </button>
                <button
                  type="button"
                  onClick={() => setCompletedNoticePatient(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  تجاهل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      <FollowUpModal
        isOpen={!!followUpPatientId}
        onClose={() => setFollowUpPatientId(null)}
        onSaved={async () => {
          setFollowUpPatientId(null);
          if (onRefresh) await onRefresh();
        }}
        patients={patients}
        preSelectedPatientId={followUpPatientId || undefined}
      />
    </div>
  );
};
