import React, { useState, useEffect, useMemo } from 'react';
import { ClinicSettings } from '../types';
import { DENTAL_DISEASE_CONDITIONS, DentalDiseaseItem } from './Patients';
import {
  Coins,
  Search,
  Plus,
  RotateCcw,
  Save,
  Check,
  AlertCircle,
  Tag,
  Sparkles,
  Info,
  Trash2,
} from 'lucide-react';

interface DiseasePricesSettingsProps {
  settings: ClinicSettings;
  onUpdateSettings: (updates: Partial<ClinicSettings>) => Promise<ClinicSettings>;
  onShowToast?: (msg: string) => void;
}

export const DiseasePricesSettings: React.FC<DiseasePricesSettingsProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  const [diseasePrices, setDiseasePrices] = useState<Record<string, number>>(() => {
    return settings.diseasePrices || {};
  });
  const [customDiseases, setCustomDiseases] = useState<DentalDiseaseItem[]>(() => {
    return settings.customDiseases || [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New disease modal/inline form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newPrice, setNewPrice] = useState('3000');
  const [newBadgeColor, setNewBadgeColor] = useState('bg-blue-50 text-blue-800 border-blue-200');

  useEffect(() => {
    if (settings.diseasePrices) {
      setDiseasePrices(settings.diseasePrices);
    }
    if (settings.customDiseases) {
      setCustomDiseases(settings.customDiseases);
    }
  }, [settings.diseasePrices, settings.customDiseases]);

  // Combined disease list
  const allConditions = useMemo(() => {
    const base = DENTAL_DISEASE_CONDITIONS.filter(c => c.id !== 'all');
    return [...base, ...customDiseases];
  }, [customDiseases]);

  const filteredConditions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allConditions;
    return allConditions.filter(c =>
      c.label.toLowerCase().includes(q) ||
      (c.keyword && c.keyword.toLowerCase().includes(q))
    );
  }, [allConditions, searchQuery]);

  const handlePriceChange = (label: string, priceVal: number) => {
    setDiseasePrices(prev => ({
      ...prev,
      [label]: Math.max(0, priceVal),
    }));
    setSaveSuccess(false);
  };

  const handleResetDefaults = () => {
    const defaults: Record<string, number> = {};
    DENTAL_DISEASE_CONDITIONS.filter(c => c.id !== 'all').forEach(c => {
      defaults[c.label] = c.defaultPrice;
    });
    setDiseasePrices(defaults);
    setSaveSuccess(false);
    if (onShowToast) {
      onShowToast('تمت استعادة جدول الأسعار الافتراضية، اضغط حفظ للاعتماد.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onUpdateSettings({
        diseasePrices,
        customDiseases,
      });
      setSaveSuccess(true);
      if (onShowToast) {
        onShowToast('تم حفظ أسعار الأمراض والعلاجات بنجاح');
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ إعدادات الأسعار');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomDisease = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = newLabel.trim();
    if (!cleanLabel) return;

    if (allConditions.some(c => c.label.toLowerCase() === cleanLabel.toLowerCase())) {
      setErrorMsg('هذا المرض أو الإجراء مسجل مسبقاً');
      return;
    }

    const priceNum = parseFloat(newPrice) || 0;
    const newItem: DentalDiseaseItem = {
      id: `custom-dis-${Date.now()}`,
      label: cleanLabel,
      keyword: newKeyword.trim() || cleanLabel,
      badge: newBadgeColor,
      defaultPrice: priceNum,
      isCustom: true,
    };

    const updatedCustom = [...customDiseases, newItem];
    setCustomDiseases(updatedCustom);
    setDiseasePrices(prev => ({
      ...prev,
      [cleanLabel]: priceNum,
    }));

    setNewLabel('');
    setNewKeyword('');
    setNewPrice('3000');
    setShowAddModal(false);
    setSaveSuccess(false);
  };

  const handleDeleteCustomDisease = (id: string, label: string) => {
    const updatedCustom = customDiseases.filter(c => c.id !== id);
    setCustomDiseases(updatedCustom);
    setDiseasePrices(prev => {
      const copy = { ...prev };
      delete copy[label];
      return copy;
    });
    setSaveSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
                سعر المرض (جدول تسعيرات العلاجات السريرية)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
                تحديد وتعديل سعر الكشف الافتراضي لكل تشخيص بالدينار الجزائري (DZD) المعتمد في ملفات المرضى والفواتير
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="استعادة الأسعار الافتراضية المقترحة"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>إضافة مرض / إجراء مخصص</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ الأسعار'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>تم حفظ جدول تسعيرات الأمراض بنجاح في قاعدة البيانات وتطبيقه على النظام.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Search & Summary */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث في أسماء الأمراض والإجراءات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <span>إجمالي الأمراض المسجلة:</span>
          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            {allConditions.length}
          </span>
        </div>
      </div>

      {/* Disease Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredConditions.map((cond) => {
          const currentPrice = diseasePrices[cond.label] !== undefined
            ? diseasePrices[cond.label]
            : cond.defaultPrice;

          return (
            <div
              key={cond.id}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cond.badge ? cond.badge.split(' ')[0] : 'bg-blue-500'}`} />
                    <span className="text-xs font-bold text-slate-900 truncate block" title={cond.label}>
                      {cond.label}
                    </span>
                  </div>
                  {cond.keyword && (
                    <span className="text-[10px] text-slate-400 font-mono block">
                      الكلمة الدلالية: {cond.keyword}
                    </span>
                  )}
                </div>

                {cond.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomDisease(cond.id, cond.label)}
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="حذف هذا الإجراء المخصص"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500">
                  السعر الافتراضي:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={currentPrice}
                    onChange={(e) => handlePriceChange(cond.label, parseFloat(e.target.value) || 0)}
                    className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-left focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-xs font-extrabold text-blue-700 font-sans">
                    د.ج
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredConditions.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 space-y-2">
          <Coins className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs font-bold text-slate-600">لم يتم العثور على أي مرض مطابق لبحثك</p>
        </div>
      )}

      {/* Floating or Bottom Save Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>تظهر هذه الأسعار تلقائياً عند اختيار المرض في نافذة إضافة مريض أو فتح ملفه، مع إمكانية تعديل السعر لأي مريض.</span>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
        </button>
      </div>

      {/* Add Custom Disease Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 font-heading flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>إضافة مرض أو إجراء سريري جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomDisease} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المرض أو الإجراء السريري:
                </label>
                <input
                  type="text"
                  placeholder="مثال: تنظيف وتبييض متقدم، جراحة لثة..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الكلمة الدلالية (للبحث السريع):
                </label>
                <input
                  type="text"
                  placeholder="مثال: تبييض، تجميل..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  السعر الافتراضي (دينار جزائري DZD):
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
