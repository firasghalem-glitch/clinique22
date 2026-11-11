import React, { useState, useEffect } from 'react';
import { Appointment, Patient } from '../types';
import { getAppointmentUrgency } from '../utils/appointmentAlerts';
import { audioAlertService } from '../utils/audioAlert';
import { getClinicTodayStr } from '../utils/clinicDate';
import {
  Bell,
  Phone,
  CheckCircle2,
  FileText,
  X,
  AlertTriangle,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface SmartReminderBannerProps {
  appointments: Appointment[];
  patients: Patient[];
  onOpenPatientDossier: (patientId: string) => void;
  onCompleteAppointment: (appointmentId: string) => void;
  onAddTestAppointment?: () => void;
  referenceDate?: Date;
}

export const SmartReminderBanner: React.FC<SmartReminderBannerProps> = ({
  appointments,
  patients,
  onOpenPatientDossier,
  onCompleteAppointment,
  referenceDate = new Date(),
}) => {
  const [dismissedAptIds, setDismissedAptIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => audioAlertService.isSoundEnabled());
  const [hasPlayedForSession, setHasPlayedForSession] = useState<{ [id: string]: boolean }>({});

  const getPatient = (id: string) => patients.find(p => p.id === id);
  const todayStr = getClinicTodayStr(referenceDate);

  const urgentAppointments = appointments.filter(apt => {
    if (apt.appointmentDate !== todayStr || apt.status !== 'scheduled') {
      return false;
    }
    if (dismissedAptIds.includes(apt.id)) {
      return false;
    }
    const urgency = getAppointmentUrgency(apt, referenceDate);
    return urgency.isWithin30Min || urgency.level === 'imminent_30' || (urgency.isOverdue && urgency.minutesDiff >= -30);
  });

  useEffect(() => {
    if (urgentAppointments.length > 0 && soundEnabled) {
      urgentAppointments.forEach(apt => {
        if (!hasPlayedForSession[apt.id]) {
          const played = audioAlertService.triggerAppointmentAlert(apt.id);
          if (played) {
            setHasPlayedForSession(prev => ({ ...prev, [apt.id]: true }));
          }
        }
      });
    }
  }, [urgentAppointments, soundEnabled, hasPlayedForSession]);

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    audioAlertService.setSoundEnabled(nextState);
    if (nextState) {
      audioAlertService.playPleasantChime();
    }
  };

  const handleDismiss = (id: string) => {
    setDismissedAptIds(prev => [...prev, id]);
  };

  if (urgentAppointments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-amber-100/70 border border-amber-300 rounded-lg text-amber-900">
        <div className="flex items-center gap-1.5 font-semibold">
          <Bell className="w-4 h-4 text-amber-700 animate-bounce" />
          <span>مواعيد وشيكة تتطلب الانتباه (خلال أقل من 30 دقيقة):</span>
          <span className="font-mono bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold text-[10px]">
            {urgentAppointments.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSound}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-colors border cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
            }`}
            title={soundEnabled ? 'التنبيه الصوتي مفعّل (انقر للتعطيل)' : 'التنبيه الصوتي معطل (انقر للتشغيل)'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>الصوت مفعّل</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>الصوت صامت</span>
              </>
            )}
          </button>
        </div>
      </div>

      {urgentAppointments.map(apt => {
        const patient = getPatient(apt.patientId);
        const urgency = getAppointmentUrgency(apt, referenceDate);
        const hasAllergy = patient?.allergies && patient.allergies !== 'لا يوجد';

        return (
          <div
            key={apt.id}
            className={`p-4 rounded-xl border shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              urgency.isOverdue
                ? 'bg-rose-50 border-rose-300 text-rose-950 ring-1 ring-rose-400'
                : 'bg-amber-50 border-amber-300 text-amber-950 ring-1 ring-amber-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                urgency.isOverdue ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
              }`}>
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">
                    {urgency.isOverdue ? 'الموعد متأخر الآن!' : 'موعد سريري وشيك خلال 30 دقيقة'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono tabular-nums ${
                    urgency.isOverdue ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    {urgency.label} ({apt.appointmentTime})
                  </span>
                  {soundEnabled && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-800 bg-blue-100/80 px-1.5 py-0.5 rounded-full font-semibold">
                      <Volume2 className="w-3 h-3 text-blue-700" />
                      <span>صوت التنبيه جاهز</span>
                    </span>
                  )}
                </div>

                <div className="text-xs flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">
                    {patient ? patient.fullName : 'مريض غير مسجل'}
                  </span>
                  <span>•</span>
                  <span className="font-medium text-slate-700">
                    الإجراء المقرر: {apt.procedure}
                  </span>
                  {patient?.phone && (
                    <>
                      <span>•</span>
                      <a
                        href={`tel:${patient.phone}`}
                        className="font-mono text-blue-800 hover:underline flex items-center gap-1 font-bold"
                        title="اتصال هاتفي"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{patient.phone}</span>
                      </a>
                    </>
                  )}
                </div>

                {hasAllergy && (
                  <div className="text-[11px] text-rose-700 font-semibold flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>تنبيه حساسية مريض: ({patient.allergies})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
              <button
                onClick={() => onCompleteAppointment(apt.id)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>إتمام الموعد</span>
              </button>
              <button
                onClick={() => onOpenPatientDossier(apt.patientId)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>الملف الطبي</span>
              </button>
              <button
                onClick={() => audioAlertService.playPleasantChime()}
                className="p-1.5 text-amber-800 hover:text-amber-950 rounded-lg hover:bg-amber-200/60 transition-colors cursor-pointer"
                title="إعادة سماع النغمة"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDismiss(apt.id)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
                title="إخفاء التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
