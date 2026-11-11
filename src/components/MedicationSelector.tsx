import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Pill,
  Search,
  Check,
  X,
  Trash2,
  ChevronDown
} from 'lucide-react';

export interface MedicationItem {
  id: string;
  name: string;
  category: string;
  isCustom?: boolean;
}

const DEFAULT_MEDICATIONS: MedicationItem[] = [
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

interface MedicationSelectorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
}

export const MedicationSelector: React.FC<MedicationSelectorProps> = ({
  value,
  onChange,
  label = 'الأدوية التي تناولها / الأدوية الحالية للمريض:',
  placeholder = 'انقر هنا لاختيار أو كتابة الأدوية المتناولة...',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load custom medications from localStorage
  const [customMeds, setCustomMeds] = useState<MedicationItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save custom meds on change
  const saveCustomMeds = (items: MedicationItem[]) => {
    setCustomMeds(items);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save custom medications to localStorage:', e);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Combined medication list
  const allMedications = useMemo(() => {
    return [...customMeds, ...DEFAULT_MEDICATIONS];
  }, [customMeds]);

  // Normalize Arabic text for search
  const normalize = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();
  };

  // Filtered meds based on search
  const filteredMeds = useMemo(() => {
    if (!searchQuery.trim()) return allMedications;
    const q = normalize(searchQuery);
    const rawQ = searchQuery.toLowerCase().trim();
    return allMedications.filter(m =>
      normalize(m.name).includes(q) ||
      m.name.toLowerCase().includes(rawQ) ||
      normalize(m.category).includes(q)
    );
  }, [allMedications, searchQuery]);

  // Parse existing selected meds into an array for checking
  const selectedList = useMemo(() => {
    if (!value || !value.trim()) return [];
    return value
      .split(/[,،]/)
      .map(s => s.trim())
      .filter(Boolean);
  }, [value]);

  const isSelected = (medName: string) => {
    const cleanMed = medName.split('(')[0].trim();
    return selectedList.some(s => s.includes(cleanMed) || cleanMed.includes(s));
  };

  // Toggle or add medication
  const handleToggleMed = (med: MedicationItem) => {
    if (med.id === 'm-none' || med.name.includes('لا يتناول')) {
      onChange('لا يتناول أي أدوية حالياً');
      return;
    }

    // If currently contains "لا يتناول" or is empty, replace with this med
    if (!value || value.includes('لا يتناول') || value.includes('لا توجد')) {
      onChange(med.name);
      return;
    }

    const currentArray = value
      .split(/[,،]/)
      .map(s => s.trim())
      .filter(Boolean);

    const cleanTarget = med.name.split('(')[0].trim();
    const existingIndex = currentArray.findIndex(s => s.includes(cleanTarget) || cleanTarget.includes(s));

    if (existingIndex >= 0) {
      // Remove
      currentArray.splice(existingIndex, 1);
      onChange(currentArray.join('، '));
    } else {
      // Add
      currentArray.push(med.name);
      onChange(currentArray.join('، '));
    }
  };

  // Delete a custom medication from the list
  const handleDeleteCustomMed = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customMeds.filter(m => m.id !== id);
    saveCustomMeds(updated);
  };

  return (
    <div ref={dropdownRef} className="space-y-1.5 relative w-full text-right font-sans">
      {/* Label and Toggle button */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Pill className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
        >
          <span>قائمة الأدوية ({allMedications.length})</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Main input bar that triggers dropdown on focus/click */}
      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Pill className="w-4 h-4 text-blue-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full pr-9 pl-8 py-2.5 bg-white border ${
            isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-300 hover:border-blue-400'
          } rounded-xl text-xs text-slate-800 focus:outline-none transition-all font-sans font-medium`}
        />
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
            title="مسح الحقل"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
            title="فتح قائمة الأدوية"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Selected tags badges if value has items */}
      {selectedList.length > 0 && selectedList[0] !== 'لا يتناول أي أدوية حالياً' && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selectedList.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[11px] font-semibold"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => {
                  const copy = [...selectedList];
                  copy.splice(idx, 1);
                  onChange(copy.join('، '));
                }}
                className="hover:text-rose-600 rounded text-blue-400 p-0.5 cursor-pointer"
                title="إزالة هذا الدواء"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 right-0 left-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search bar inside dropdown */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في قائمة الأدوية (بالعربية أو بالفرنسية)..."
                className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Medications Scrollable List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
            {filteredMeds.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-1">
                <p>لم يتم العثور على أدوية مطابقة لـ "{searchQuery}".</p>
                <p className="text-[11px] text-slate-400">يمكنك إدارة وإضافة الأدوية من قائمة الإعدادات &gt; الأدوية.</p>
              </div>
            ) : (
              filteredMeds.map((med) => {
                const selected = isSelected(med.name);
                return (
                  <div
                    key={med.id}
                    onClick={() => handleToggleMed(med)}
                    className={`px-3 py-2.5 flex items-center justify-between hover:bg-blue-50/70 transition-colors cursor-pointer group ${
                      selected ? 'bg-blue-50/90 text-blue-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          selected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 group-hover:border-blue-400 bg-white'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{med.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {med.category}
                      </span>
                      {med.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomMed(med.id, e)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                          title="حذف هذا الدواء المخصص من القائمة"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer actions inside dropdown */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 font-medium">
              تم تحديد: <strong>{selectedList.length}</strong> دواء
            </span>
            <div className="flex items-center gap-2">
              {value && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="px-2.5 py-1 text-slate-500 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer shadow-2xs"
              >
                تم الإدخال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
