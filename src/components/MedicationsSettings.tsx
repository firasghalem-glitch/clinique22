import React, { useState, useMemo } from 'react';
import { Pill, Search, Plus, Trash2, Check, AlertCircle, Sparkles, Filter, Layers } from 'lucide-react';
import { ClinicSettings } from '../types';

export interface MedicationItem {
  id: string;
  name: string;
  category: string;
  isCustom?: boolean;
}

export const DEFAULT_MEDICATIONS: MedicationItem[] = [
  // مسكنات ومضادات التهاب
  { id: 'm-paracetamol', name: 'باراسيتامول (Paracétamol / Doliprane)', category: 'مسكنات' },
  { id: 'm-ibuprofen', name: 'إيبوبروفين (Ibuprofène / Advil)', category: 'مسكنات' },
  { id: 'm-ketoprofen', name: 'كيتوبروفين (Kétoprofène / Bi-Profenid)', category: 'مسكنات' },
  { id: 'm-diclofenac', name: 'ديكلوفيناك (Voltaren / Diclofénac)', category: 'مسكنات' },
  { id: 'm-tramadol', name: 'ترامادول (Tramadol)', category: 'مسكنات' },

  // مضادات حيوية
  { id: 'm-amoxicilline', name: 'أموكسيسيلين (Amoxicilline / Clamoxyl)', category: 'مضادات حيوية' },
  { id: 'm-augmentin', name: 'أوجمنتين (Augmentin / Amox-Clav)', category: 'مضادات حيوية' },
  { id: 'm-rodogyl', name: 'رودوجيل (Rodogyl / Bi-Rodogyl)', category: 'مضادات حيوية' },
  { id: 'm-flagyl', name: 'فلاجيل (Flagyl / Métronidazole)', category: 'مضادات حيوية' },
  { id: 'm-clindamycine', name: 'دالاسين (Dalacine / Clindamycine)', category: 'مضادات حيوية' },
  { id: 'm-oroken', name: 'أوروكان (Oroken / Céfixime)', category: 'مضادات حيوية' },

  // مميعات الدم ومضادات التخثر
  { id: 'm-sintrom', name: 'سينتروم (Sintrom / Acénocoumarol)', category: 'مميعات الدم' },
  { id: 'm-aspirine', name: 'أسبرين / كاردجيك (Kardegic / Aspirine)', category: 'مميعات الدم' },
  { id: 'm-plavix', name: 'بلافيكس (Plavix / Clopidogrel)', category: 'مميعات الدم' },
  { id: 'm-xarelto', name: 'زاريلتو (Xarelto / Rivaroxaban)', category: 'مميعات الدم' },
  { id: 'm-eliquis', name: 'إليكويس (Eliquis / Apixaban)', category: 'مميعات الدم' },

  // ضغط الدم والقلب
  { id: 'm-amlodipine', name: 'أملوديبين (Amlodipine / Amlor)', category: 'ضغط الدم والقلب' },
  { id: 'm-coversyl', name: 'كوفرسيل (Coversyl / Périndopril)', category: 'ضغط الدم والقلب' },
  { id: 'm-aprovel', name: 'أبروفيل (Aprovel / Irbésartan)', category: 'ضغط الدم والقلب' },
  { id: 'm-betabloquant', name: 'بيتا بلوكونت (Bêta-bloquants / Concor / Ténormine)', category: 'ضغط الدم والقلب' },

  // السكري
  { id: 'm-metformine', name: 'ميتفورمين (Glucophage / Metformine)', category: 'السكري' },
  { id: 'm-insuline', name: 'أنسولين (Insuline)', category: 'السكري' },
  { id: 'm-diamicron', name: 'دياميكرون (Diamicron / Gliclazide)', category: 'السكري' },

  // كورتيكويد وحساسية
  { id: 'm-solupred', name: 'سولبريد (Solupred / Prednisolone)', category: 'كورتيكويد' },
  { id: 'm-celestene', name: 'سيليستين (Célestène / Bétaméthasone)', category: 'كورتيكويد' },
  { id: 'm-aerius', name: 'إيريوس (Aerius / Desloratadine)', category: 'حساسية' },

  // الغدة ومعدة وربو
  { id: 'm-levothyrox', name: 'ليفوثيروكس (Lévothyrox)', category: 'أمراض مزمنة' },
  { id: 'm-ventoline', name: 'فنتولين (Ventoline / Salbutamol)', category: 'أمراض مزمنة' },
  { id: 'm-inexium', name: 'إينيكسيوم (Inexium / Oméprazole)', category: 'معدة' },

  // حالة خاصة
  { id: 'm-none', name: 'لا يتناول أي أدوية حالياً', category: 'أخرى' },
];

const LOCAL_STORAGE_KEY = 'clinic_custom_medications_list';

const CATEGORIES = [
  'الكل',
  'مسكنات',
  'مضادات حيوية',
  'مميعات الدم',
  'ضغط الدم والقلب',
  'السكري',
  'كورتيكويد',
  'حساسية',
  'معدة',
  'أمراض مزمنة',
  'أدوية مخصصة',
  'أخرى',
];

interface MedicationsSettingsProps {
  settings: ClinicSettings;
  onUpdateSettings?: (updates: Partial<ClinicSettings>) => Promise<ClinicSettings>;
  onShowToast?: (msg: string) => void;
}

export const MedicationsSettings: React.FC<MedicationsSettingsProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  // Load custom medications from settings or localStorage
  const [customMeds, setCustomMeds] = useState<MedicationItem[]>(() => {
    if (settings.customMedications && Array.isArray(settings.customMedications)) {
      return settings.customMedications;
    }
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  // Add medication form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('أدوية مخصصة');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const saveCustomMeds = async (updated: MedicationItem[]) => {
    setCustomMeds(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    if (onUpdateSettings) {
      try {
        await onUpdateSettings({ customMedications: updated });
      } catch (e) {
        console.warn('Could not sync custom medications to server settings:', e);
      }
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) return;

    const exists = [...customMeds, ...DEFAULT_MEDICATIONS].some(
      m => m.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      if (onShowToast) onShowToast('هذا الدواء مسجل مسبقاً في القائمة');
      return;
    }

    const newItem: MedicationItem = {
      id: `custom-med-${Date.now()}`,
      name: cleanName,
      category: newCategory || 'أدوية مخصصة',
      isCustom: true,
    };

    const updated = [newItem, ...customMeds];
    await saveCustomMeds(updated);

    setNewName('');
    setNewCategory('أدوية مخصصة');
    setShowAddModal(false);
    setSuccessToast(`تمت إضافة الدواء "${cleanName}" بنجاح.`);
    setTimeout(() => setSuccessToast(null), 3000);
    if (onShowToast) onShowToast(`تمت إضافة "${cleanName}" لقائمة الأدوية المعتمدة.`);
  };

  const handleDeleteCustomMed = async (id: string, name: string) => {
    const updated = customMeds.filter(m => m.id !== id);
    await saveCustomMeds(updated);
    setSuccessToast(`تم حذف الدواء "${name}".`);
    setTimeout(() => setSuccessToast(null), 3000);
    if (onShowToast) onShowToast(`تم حذف "${name}"`);
  };

  // Combined medications
  const allMedications = useMemo(() => {
    return [...customMeds, ...DEFAULT_MEDICATIONS];
  }, [customMeds]);

  // Filtered medications
  const filteredMedications = useMemo(() => {
    let list = allMedications;
    if (selectedCategory !== 'الكل') {
      list = list.filter(m => m.category === selectedCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allMedications, selectedCategory, searchQuery]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    allMedications.forEach(m => {
      map.set(m.category, (map.get(m.category) || 0) + 1);
    });
    return map;
  }, [allMedications]);

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'مسكنات':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'مضادات حيوية':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'مميعات الدم':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ضغط الدم والقلب':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'السكري':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'كورتيكويد':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'حساسية':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
                الأدوية (قائمة الأدوية والعقاقير الطبية)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
                إدارة قائمة الأدوية الشائعة والموصوفة للمرضى مع إمكانية إضافة أدوية مخصصة للعيادة
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة دواء جديد</span>
        </button>
      </div>

      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>إجمالي الأدوية المسجلة</span>
            <Pill className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {allMedications.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            جاهزة للاستخدام في ملف المريض والوصفات
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>أدوية مخصصة مضافة بالعيادة</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
            {customMeds.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            تمت إضافتها وحفظها محلياً في العيادة
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>التصنيفات الدوائية</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums">
            {categoryStats.size}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            تصنيف طبي منظم حسب الاختصاص
          </span>
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث باسم الدواء (بالعربية أو بالفرنسية Doliprane, Amoxicilline...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-purple-500 shadow-2xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map(cat => {
            const isSel = selectedCategory === cat;
            const count = cat === 'الكل' ? allMedications.length : (categoryStats.get(cat) || 0);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] font-mono px-1 rounded ${isSel ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Medications List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredMedications.map(med => {
          return (
            <div
              key={med.id}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 transition-all shadow-2xs flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate" title={med.name}>
                  {med.name}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCategoryBadgeClass(med.category)}`}>
                    {med.category}
                  </span>
                  {med.isCustom && (
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                      مخصص
                    </span>
                  )}
                </div>
              </div>

              {med.isCustom && (
                <button
                  type="button"
                  onClick={() => handleDeleteCustomMed(med.id, med.name)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="حذف هذا الدواء المخصص"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filteredMedications.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 space-y-2">
          <Pill className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs font-bold text-slate-600">لا توجد أدوية مطابقة لبحثك</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs text-purple-600 hover:underline font-bold"
          >
            اضغط هنا لإضافة هذا الدواء إلى قائمة العيادة
          </button>
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 font-heading flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                <span>إضافة دواء جديد لقائمة العيادة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMedication} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الدواء (بالعربية / الفرنسية):
                </label>
                <input
                  type="text"
                  placeholder="مثال: سباسفون (Spasfon), فلاجيل (Flagyl)..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  التصنيف الطبي للدواء:
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                >
                  <option value="مسكنات">مسكنات ومضادات التهاب</option>
                  <option value="مضادات حيوية">مضادات حيوية</option>
                  <option value="مميعات الدم">مميعات الدم ومضادات التخثر</option>
                  <option value="ضغط الدم والقلب">أدوية ضغط الدم والقلب</option>
                  <option value="السكري">أدوية السكري والأنسولين</option>
                  <option value="كورتيكويد">كورتيكويد</option>
                  <option value="حساسية">مضادات حساسية</option>
                  <option value="معدة">أدوية المعدة والجهاز الهضمي</option>
                  <option value="أمراض مزمنة">أمراض مزمنة وغدة وربو</option>
                  <option value="أدوية مخصصة">أدوية مخصصة</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <p className="text-[11px] text-slate-400 pt-1">
                سيُحفظ هذا الدواء تلقائياً في قائمة أدوية العيادة ويظهر مباشرة عند تسجيل المرضى وتعديل ملفاتهم.
              </p>

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
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  إضافة الدواء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
