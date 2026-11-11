import React, { useState } from 'react';
import { DentalCondition, Patient } from '../types';
import {
  Activity,
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { getClinicTodayStr } from '../utils/clinicDate';

interface DentalConditionsProps {
  conditions: DentalCondition[];
  patients: Patient[];
  onOpenPatientDossier: (patientId: string) => void;
  onAddCondition: (condition: Omit<DentalCondition, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteCondition: (id: string) => Promise<void>;
  onUpdateCondition: (id: string, updates: Partial<DentalCondition>) => Promise<void>;
}

export const DentalConditions: React.FC<DentalConditionsProps> = ({
  conditions,
  patients,
  onOpenPatientDossier,
  onAddCondition,
  onDeleteCondition,
}) => {
  const [selectedConditionType, setSelectedConditionType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [toothNumber, setToothNumber] = useState(16);
  const [conditionType, setConditionType] = useState('تسوس عميق');
  const [treatmentDone, setTreatmentDone] = useState('');
  const [status, setStatus] = useState<'in_progress' | 'treated' | 'monitoring'>('in_progress');
  const [cost, setCost] = useState('3500');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getPatient = (id: string) => patients.find(p => p.id === id);

  const formatDateDZ = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const handleOpenAdd = () => {
    setSelectedPatientId(patients[0]?.id || '');
    setToothNumber(16);
    setConditionType('تسوس عميق');
    setTreatmentDone('');
    setStatus('in_progress');
    setCost('3500');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      alert('يرجى اختيار المريض أولاً.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddCondition({
        patientId: selectedPatientId,
        toothNumber,
        conditionType,
        treatmentDone,
        status,
        cost: cost ? parseFloat(cost) : undefined,
        recordedDate: getClinicTodayStr(),
        notes,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'فشل حفظ حالة السن.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const conditionsCategories = [
    'تسوس',
    'عصب',
    'حشوة',
    'تاج',
    'جسر',
    'زرع',
    'مفقود',
    'قلع'
  ];

  const filtered = conditions.filter(c => {
    if (selectedConditionType !== 'all' && !c.conditionType.includes(selectedConditionType)) {
      return false;
    }
    if (statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const p = getPatient(c.patientId);
      const name = p ? p.fullName.toLowerCase() : '';
      if (!name.includes(q) && !c.conditionType.toLowerCase().includes(q) && !String(c.toothNumber).includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">سجل حالات الأسنان والتشخيصات</h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة دقيقة لجميع الأسنان المعالجة وقيد العلاج بنظام FDI
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة تشخيص سن</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedConditionType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedConditionType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              الكل ({conditions.length})
            </button>
            {conditionsCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedConditionType(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedConditionType === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 cursor-pointer"
            >
              <option value="all">كل الحالات</option>
              <option value="in_progress">قيد العلاج</option>
              <option value="treated">معالج</option>
              <option value="monitoring">مراقبة</option>
            </select>
            <input
              type="text"
              placeholder="بحث بالمريض أو السن..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none w-44"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">لا توجد حالات أسنان مسجلة مطابقة للبحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">السن (FDI)</th>
                  <th className="py-3 px-4">المريض</th>
                  <th className="py-3 px-4">التشخيص</th>
                  <th className="py-3 px-4">العلاج المنجز</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">التكلفة (DZD)</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">ملاحظات</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => {
                  const patient = getPatient(c.patientId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-800 text-sm">
                        #{c.toothNumber}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onOpenPatientDossier(c.patientId)}
                          className="font-bold text-slate-900 hover:text-blue-700 hover:underline block text-right cursor-pointer"
                        >
                          {patient ? patient.fullName : 'مريض غير مسجل'}
                        </button>
                        {patient && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {patient.phone}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {c.conditionType}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {c.treatmentDone || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                        {formatDateDZ(c.recordedDate)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                        {c.cost ? `${c.cost.toLocaleString('ar-DZ')} دج` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {c.status === 'treated' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            معالج
                          </span>
                        ) : c.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700">
                            <Clock className="w-3 h-3" />
                            قيد العلاج
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                            مراقبة
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {c.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onOpenPatientDossier(c.patientId)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded text-[11px] font-semibold cursor-pointer"
                          >
                            فتح الملف
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCondition(c.id)}
                            title="حذف هذا التشخيص"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                إضافة حالة سن جديدة
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المريض: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
                  required
                >
                  <option value="">اختر المريض...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم السن (FDI 11-48):
                  </label>
                  <input
                    type="number"
                    min="11"
                    max="48"
                    value={toothNumber}
                    onChange={(e) => setToothNumber(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التشخيص:
                  </label>
                  <select
                    value={conditionType}
                    onChange={(e) => setConditionType(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
                  >
                    {[
                      'تسوس سطحي',
                      'تسوس عميق',
                      'علاج عصب',
                      'حشوة كمبوزيت',
                      'تاج خزفي',
                      'جسر أسنان',
                      'زرع سن',
                      'سن مفقود'
                    ].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العلاج المنجز:
                </label>
                <input
                  type="text"
                  value={treatmentDone}
                  onChange={(e) => setTreatmentDone(e.target.value)}
                  placeholder="مثال: حشوة كمبوزيت ضوئية"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الحالة:
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
                  >
                    <option value="in_progress">قيد العلاج</option>
                    <option value="treated">معالج</option>
                    <option value="monitoring">مراقبة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التكلفة (DZD):
                  </label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono tabular-nums text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ الحالة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
