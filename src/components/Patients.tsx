import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Patient,
  PatientFile,
  DentalCondition,
  Appointment,
  ClinicalNote,
  ClinicSettings
} from '../types';
import { clinicApi } from '../services/api';
import { localPatientStorageService } from '../utils/localPatientStorage';
import { getClinicTodayStr } from '../utils/clinicDate';
import { MedicationSelector } from './MedicationSelector';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  AlertTriangle,
  Edit3,
  Trash2,
  FileText,
  Check,
  HeartPulse,
  Upload,
  Image as ImageIcon,
  X,
  Download,
  HardDrive,
  ChevronDown,
  Smile,
  CreditCard,
  Coins,
  Settings2,
  Sparkles,
  RotateCcw,
  Pill,
  Plus,
  Maximize2,
  Minimize2,
  Save,
} from 'lucide-react';

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  category: string;
}

const PHOTO_CATEGORIES = [
  { id: 'صورة أشعة بانورامية (Panoramique)', label: 'صورة أشعة بانورامية (Panoramique)' },
  { id: 'أشعة سينية داخل فموية (Radio RVG)', label: 'أشعة سينية داخل فموية (Radio RVG)' },
  { id: 'صورة فوتوغرافية سريرية (Photo clinique)', label: 'صورة فوتوغرافية سريرية' },
  { id: 'تحاليل مخبرية', label: 'تحاليل مخبرية' },
  { id: 'تقرير طبي', label: 'تقرير طبي' },
  { id: 'ملف مرفق عام (Autre)', label: 'ملف مرفق عام' },
];

export interface DentalDiseaseItem {
  id: string;
  label: string;
  keyword: string;
  badge: string;
  defaultPrice: number;
  isCustom?: boolean;
}

export const DENTAL_DISEASE_CONDITIONS: DentalDiseaseItem[] = [
  { id: 'all', label: 'الكل (جميع الحالات السريرية)', keyword: '', badge: '', defaultPrice: 0 },
  { id: 'caries', label: 'علاج تسوس الأسنان', keyword: 'تسوس', badge: 'bg-blue-50 text-blue-800 border-blue-200', defaultPrice: 3000 },
  { id: 'endodontics', label: 'علاج الجذور والعصب (Endo)', keyword: 'عصب', badge: 'bg-purple-50 text-purple-800 border-purple-200', defaultPrice: 6000 },
  { id: 'periodontics', label: 'علاج اللثة وجراحة الأنسجة', keyword: 'لثة', badge: 'bg-amber-50 text-amber-900 border-amber-200', defaultPrice: 3500 },
  { id: 'orthodontics', label: 'تقويم وتعديل الأسنان', keyword: 'تقويم', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200', defaultPrice: 25000 },
  { id: 'implants', label: 'زرع وتعويض الأسنان', keyword: 'زرع', badge: 'bg-sky-50 text-sky-800 border-sky-200', defaultPrice: 45000 },
  { id: 'surgery', label: 'جراحة الفم والفكين', keyword: 'جراحة', badge: 'bg-slate-100 text-slate-800 border-slate-300', defaultPrice: 5000 },
  { id: 'cosmetic', label: 'تجميل الأسنان والفينير', keyword: 'تجميل', badge: 'bg-blue-50 text-blue-800 border-blue-200', defaultPrice: 15000 },
  { id: 'prophylaxis', label: 'تنظيف الجير والعناية الوقائية', keyword: 'تنظيف', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', defaultPrice: 2500 },
  { id: 'urgent', label: 'حالات إسعافية وألم حاد', keyword: 'ألم', badge: 'bg-amber-50 text-amber-900 border-amber-200', defaultPrice: 2000 },
  { id: 'healthy', label: 'فحص دوري وأسنان سليمة', keyword: 'سليم', badge: 'bg-cyan-50 text-cyan-800 border-cyan-200', defaultPrice: 1500 },
];

export const getDiseasePrice = (conditionText?: string, customPrices?: Record<string, number>): number => {
  if (!conditionText) return 0;
  // 1. Direct match in passed customPrices
  if (customPrices) {
    if (typeof customPrices[conditionText] === 'number') return customPrices[conditionText];
  }
  // 2. Check localStorage cache for prices
  try {
    const raw = localStorage.getItem('clinic_disease_prices');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed[conditionText] === 'number') return parsed[conditionText];
    }
  } catch {}
  // 3. Match against DENTAL_DISEASE_CONDITIONS
  const item = DENTAL_DISEASE_CONDITIONS.find(
    c => c.label === conditionText || c.id === conditionText || (c.keyword && conditionText.includes(c.keyword))
  );
  if (item && item.defaultPrice !== undefined) {
    if (customPrices) {
      if (typeof customPrices[item.id] === 'number') return customPrices[item.id];
      if (typeof customPrices[item.label] === 'number') return customPrices[item.label];
    }
    return item.defaultPrice;
  }
  // 4. Check custom diseases list in localStorage
  try {
    const rawCustom = localStorage.getItem('clinic_custom_diseases');
    if (rawCustom) {
      const parsedCustom: DentalDiseaseItem[] = JSON.parse(rawCustom);
      const cItem = parsedCustom.find(c => c.label === conditionText || c.id === conditionText);
      if (cItem && typeof cItem.defaultPrice === 'number') return cItem.defaultPrice;
    }
  } catch {}
  return 3000;
};

export const getDiseaseBadgeStyle = (conditionText?: string) => {
  if (!conditionText) return 'bg-slate-50 text-slate-700 border-slate-200';
  if (conditionText.includes('عصب') || conditionText.includes('جذور')) {
    return 'bg-purple-50 text-purple-800 border-purple-200';
  }
  if (conditionText.includes('ألم') || conditionText.includes('خراج') || conditionText.includes('إسعافي')) {
    return 'bg-amber-50 text-amber-900 border-amber-200';
  }
  if (conditionText.includes('تسوس') || conditionText.includes('حشوة') || conditionText.includes('كمبوزيت')) {
    return 'bg-blue-50 text-blue-800 border-blue-200';
  }
  if (conditionText.includes('لثة') || conditionText.includes('نزيف')) {
    return 'bg-amber-50 text-amber-900 border-amber-200';
  }
  if (conditionText.includes('تقويم')) {
    return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  }
  if (conditionText.includes('زرع') || conditionText.includes('غرس') || conditionText.includes('تاج')) {
    return 'bg-sky-50 text-sky-800 border-sky-200';
  }
  if (conditionText.includes('قلع') || conditionText.includes('جراحة')) {
    return 'bg-slate-100 text-slate-800 border-slate-300';
  }
  if (conditionText.includes('تجميل') || conditionText.includes('فينير') || conditionText.includes('تبييض')) {
    return 'bg-blue-50 text-blue-800 border-blue-200';
  }
  if (conditionText.includes('سليم') || conditionText.includes('وقائي') || conditionText.includes('تنظيف')) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
  return 'bg-blue-50 text-blue-800 border-blue-200';
};

interface PatientsProps {
  patients: Patient[];
  files?: PatientFile[];
  conditions?: DentalCondition[];
  appointments?: Appointment[];
  notes?: ClinicalNote[];
  settings?: ClinicSettings;
  onAddPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Patient>;
  onUpdatePatient: (id: string, updates: Partial<Patient>) => Promise<Patient>;
  onDeletePatient: (id: string) => Promise<void>;
  onOpenPatientDossier: (patientId: string, initialTab?: 'profile' | 'medical' | 'teeth' | 'jaw-chart' | 'appointments' | 'treatments' | 'files' | 'invoices' | 'notes') => void;
  onBookAppointmentForPatient: (patientId: string) => void;
  onRefreshFiles?: () => Promise<void> | void;
  onShowToast?: (message: string) => void;
  currentUserRole?: 'doctor' | 'assistant';
  onUpdateSettings?: (settings: Partial<ClinicSettings>) => Promise<ClinicSettings>;
  onCreateInvoice?: (data: {
    patientId: string;
    appointmentId?: string;
    date?: string;
    description: string;
    totalAmount: number;
    paidAmount?: number;
    paymentMethod?: 'cash' | 'baridimob' | 'check';
    notes?: string;
  }) => Promise<any>;
}

export const Patients: React.FC<PatientsProps> = ({
  patients,
  files = [],
  conditions = [],
  appointments = [],
  notes: clinicalNotesList = [],
  settings,
  onAddPatient,
  onUpdatePatient,
  onDeletePatient,
  onOpenPatientDossier,
  onBookAppointmentForPatient,
  onRefreshFiles,
  onShowToast,
  currentUserRole = 'doctor',
  onUpdateSettings,
  onCreateInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'new' | 'returning'>('all');
  const [diseaseFilter, setDiseaseFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalFullScreen, setIsModalFullScreen] = useState(true);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Disease Tariffs State
  const [diseasePrices, setDiseasePrices] = useState<Record<string, number>>(() => {
    let init: Record<string, number> = {};
    try {
      const raw = localStorage.getItem('clinic_disease_prices');
      if (raw) init = JSON.parse(raw);
    } catch {}
    return { ...init, ...(settings?.diseasePrices || {}) };
  });

  useEffect(() => {
    if (settings?.diseasePrices) {
      setDiseasePrices(prev => ({ ...prev, ...settings.diseasePrices }));
    }
  }, [settings?.diseasePrices]);

  // Custom Diseases Added by User
  const [customDiseases, setCustomDiseases] = useState<DentalDiseaseItem[]>(() => {
    try {
      const raw = localStorage.getItem('clinic_custom_diseases');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return (settings?.customDiseases as DentalDiseaseItem[]) || [];
  });

  useEffect(() => {
    if (settings?.customDiseases && Array.isArray(settings.customDiseases)) {
      setCustomDiseases(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = (settings.customDiseases as DentalDiseaseItem[]).filter(d => !existingIds.has(d.id));
        return [...prev, ...newItems];
      });
    }
  }, [settings?.customDiseases]);

  // All disease conditions combining defaults and custom additions
  const allDiseaseConditions = useMemo(() => {
    const list: DentalDiseaseItem[] = [...DENTAL_DISEASE_CONDITIONS];
    customDiseases.forEach(cd => {
      if (!list.some(item => item.id === cd.id || item.label === cd.label)) {
        list.push(cd);
      }
    });
    return list;
  }, [customDiseases]);

  // State for inline adding a new custom disease
  const [isAddingNewDisease, setIsAddingNewDisease] = useState(false);
  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [newDiseasePrice, setNewDiseasePrice] = useState('3000');
  const [isSavingNewDisease, setIsSavingNewDisease] = useState(false);

  const handleAddNewDisease = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newDiseaseName.trim();
    if (!trimmedName) {
      alert('يرجى إدخال اسم المرض أو التشخيص السريري الجديد');
      return;
    }

    const priceNum = Math.max(0, parseFloat(newDiseasePrice) || 0);

    // Check if already exists in list
    const exists = allDiseaseConditions.find(
      c => c.label.toLowerCase() === trimmedName.toLowerCase() || c.id === trimmedName
    );

    if (exists) {
      setDiseaseCondition(exists.label);
      if (!editingPatient) {
        const pr = getDiseasePrice(exists.label, diseasePrices);
        setSessionPrice(pr > 0 ? String(pr) : '');
        if (!hasManuallyEditedPaidNow) {
          setPaidNow(pr > 0 ? String(pr) : '');
        }
      }
      setIsAddingNewDisease(false);
      setNewDiseaseName('');
      onShowToast?.(`تم اختيار المرض (${exists.label}) بنجاح`);
      return;
    }

    setIsSavingNewDisease(true);
    try {
      const newId = `custom-dis-${Date.now()}`;
      const newDiseaseItem: DentalDiseaseItem = {
        id: newId,
        label: trimmedName,
        keyword: trimmedName.slice(0, 8),
        badge: 'bg-indigo-50 text-indigo-900 border-indigo-200',
        defaultPrice: priceNum,
        isCustom: true,
      };

      const updatedCustom = [...customDiseases, newDiseaseItem];
      setCustomDiseases(updatedCustom);
      try {
        localStorage.setItem('clinic_custom_diseases', JSON.stringify(updatedCustom));
      } catch {}

      // Register custom price
      const updatedPrices = { ...diseasePrices, [trimmedName]: priceNum };
      setDiseasePrices(updatedPrices);
      try {
        localStorage.setItem('clinic_disease_prices', JSON.stringify(updatedPrices));
      } catch {}

      // Save to server
      try {
        if (onUpdateSettings) {
          await onUpdateSettings({
            customDiseases: updatedCustom,
            diseasePrices: updatedPrices,
          });
        } else {
          await clinicApi.updateSettings({
            customDiseases: updatedCustom,
            diseasePrices: updatedPrices,
          });
        }
      } catch (syncErr) {
        console.warn('Could not sync custom disease to server settings:', syncErr);
      }

      // Automatically select for this patient
      setDiseaseCondition(trimmedName);
      if (!editingPatient) {
        setSessionPrice(priceNum > 0 ? String(priceNum) : '');
        if (!hasManuallyEditedPaidNow) {
          setPaidNow(priceNum > 0 ? String(priceNum) : '');
        }
      }

      setIsAddingNewDisease(false);
      setNewDiseaseName('');
      setNewDiseasePrice('3000');
      onShowToast?.(`تمت إضافة المرض الجديد (${trimmedName}) واختياره بنجاح`);
    } catch (err: any) {
      alert(err.message || 'فشل حفظ المرض الجديد');
    } finally {
      setIsSavingNewDisease(false);
    }
  };

  const handleDeleteCustomDisease = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = customDiseases.find(c => c.id === id);
    if (!item) return;
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف مرض "${item.label}" من القائمة؟`)) {
      return;
    }
    const updated = customDiseases.filter(c => c.id !== id);
    setCustomDiseases(updated);
    try {
      localStorage.setItem('clinic_custom_diseases', JSON.stringify(updated));
    } catch {}
    if (diseaseCondition === item.label) {
      setDiseaseCondition('');
    }
    try {
      if (onUpdateSettings) {
        await onUpdateSettings({ customDiseases: updated });
      } else {
        await clinicApi.updateSettings({ customDiseases: updated });
      }
    } catch {}
    onShowToast?.(`تم حذف المرض (${item.label}) من القائمة`);
  };

  const [isPriceConfigOpen, setIsPriceConfigOpen] = useState(false);
  const [tempPrices, setTempPrices] = useState<Record<string, number>>({});
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  const handleOpenPriceConfig = () => {
    const currentMap: Record<string, number> = {};
    allDiseaseConditions.filter(c => c.id !== 'all').forEach(c => {
      currentMap[c.label] = getDiseasePrice(c.label, diseasePrices);
    });
    setTempPrices(currentMap);
    setIsPriceConfigOpen(true);
  };

  const handleSaveDiseasePrices = async () => {
    setIsSavingPrices(true);
    try {
      setDiseasePrices(tempPrices);
      try {
        localStorage.setItem('clinic_disease_prices', JSON.stringify(tempPrices));
      } catch {}
      if (onUpdateSettings) {
        await onUpdateSettings({ diseasePrices: tempPrices });
      } else {
        await clinicApi.updateSettings({ diseasePrices: tempPrices });
      }
      if (!editingPatient && diseaseCondition) {
        const newP = getDiseasePrice(diseaseCondition, tempPrices);
        if (newP > 0) {
          setSessionPrice(String(newP));
          if (!hasManuallyEditedPaidNow) {
            setPaidNow(String(newP));
          }
        }
      }
      setIsPriceConfigOpen(false);
      onShowToast?.('تم حفظ وتحديث تسعيرات الأمراض بنجاح.');
    } catch (err: any) {
      onShowToast?.(err.message || 'تعذر حفظ تسعيرات الأمراض.');
    } finally {
      setIsSavingPrices(false);
    }
  };

  const handleResetDefaultPrices = () => {
    const defaultsMap: Record<string, number> = {};
    allDiseaseConditions.filter(c => c.id !== 'all').forEach(c => {
      defaultsMap[c.label] = c.defaultPrice;
    });
    setTempPrices(defaultsMap);
  };

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [address, setAddress] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [patientType, setPatientType] = useState<'new' | 'returning'>('new');
  const [diseaseCondition, setDiseaseCondition] = useState('');
  const [diseaseStatus, setDiseaseStatus] = useState<'active' | 'under_treatment' | 'completed' | 'stable' | 'urgent'>('active');
  const [notes, setNotes] = useState('');
  const [sessionPrice, setSessionPrice] = useState<string>('');
  const [paidNow, setPaidNow] = useState<string>('');
  const [hasManuallyEditedPaidNow, setHasManuallyEditedPaidNow] = useState<boolean>(false);
  const isSavingPatientRef = useRef<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingPatientId, setSavingPatientId] = useState<string | null>(null);
  const [quickConditionPatient, setQuickConditionPatient] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);

  const [isDiseaseDropdownOpen, setIsDiseaseDropdownOpen] = useState(false);
  const diseaseDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (diseaseDropdownRef.current && !diseaseDropdownRef.current.contains(event.target as Node)) {
        setIsDiseaseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [selectedPhotos, setSelectedPhotos] = useState<PendingPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const calculateAge = (bDate: string) => {
    if (!bDate) return null;
    const birth = new Date(bDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const formatDateDZ = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const handleClearPhotos = () => {
    selectedPhotos.forEach(p => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setSelectedPhotos([]);
  };

  const handleSelectPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const newPhotos: PendingPhoto[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const previewUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : '';
      newPhotos.push({
        id: `p-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        category: 'صورة أشعة بانورامية (Panoramique)',
      });
    }
    setSelectedPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos(prev => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpdatePhotoCategory = (index: number, newCat: string) => {
    setSelectedPhotos(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], category: newCat };
      }
      return updated;
    });
  };

  const handleOpenAdd = () => {
    handleClearPhotos();
    setEditingPatient(null);
    setFullName('');
    setPhone('');
    setBirthDate('');
    setGender('male');
    setAddress('');
    setAllergies('');
    setMedications('');
    setPatientType('new');
    const initialCondition = 'علاج تسوس الأسنان';
    const initialPrice = getDiseasePrice(initialCondition, diseasePrices);
    setDiseaseCondition(initialCondition);
    setDiseaseStatus('active');
    setNotes('');
    setSessionPrice(initialPrice > 0 ? String(initialPrice) : '');
    setPaidNow(initialPrice > 0 ? String(initialPrice) : '');
    setHasManuallyEditedPaidNow(false);
    setFormError(null);
    setIsDiseaseDropdownOpen(false);
    setIsModalFullScreen(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Patient) => {
    handleClearPhotos();
    setEditingPatient(p);
    setFullName(p.fullName);
    setPhone(p.phone);
    setBirthDate(p.birthDate || '');
    setGender(p.gender);
    setAddress(p.address || '');
    setAllergies(p.allergies || '');
    setMedications(p.medications || '');
    setPatientType(p.patientType);
    setDiseaseCondition(p.diseaseCondition || '');
    setDiseaseStatus(p.diseaseStatus || 'active');
    setNotes(p.notes || '');
    setSessionPrice('');
    setPaidNow('');
    setHasManuallyEditedPaidNow(false);
    setFormError(null);
    setIsDiseaseDropdownOpen(false);
    setIsModalFullScreen(true);
    setIsModalOpen(true);
  };

  const addAllergyTag = (tag: string) => {
    if (!allergies) {
      setAllergies(tag);
    } else if (!allergies.includes(tag)) {
      setAllergies(`${allergies} • ${tag}`);
    }
  };

  const addMedicationTag = (tag: string) => {
    if (!medications) {
      setMedications(tag);
    } else if (!medications.includes(tag)) {
      setMedications(`${medications} • ${tag}`);
    }
  };

  const handleSavePatientLocally = async (p: Patient) => {
    setSavingPatientId(p.id);
    try {
      const ptConditions = conditions.filter(c => c.patientId === p.id);
      const ptNotes = clinicalNotesList.filter(n => n.patientId === p.id);
      const ptApts = appointments.filter(a => a.patientId === p.id);
      const ptFiles = files.filter(f => f.patientId === p.id);
      await localPatientStorageService.savePatientFileLocally(
        p,
        ptConditions,
        ptNotes,
        ptApts,
        ptFiles,
        settings
      );
      if (onShowToast) {
        onShowToast(`تم حفظ وتنزيل ملف المريض "${p.fullName}" محلياً على جهازك.`);
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(`خطأ في الحفظ: ${err.message}`);
    } finally {
      setSavingPatientId(null);
    }
  };

  const handleSaveQuickCondition = async (patient: Patient, newCondition: string) => {
    try {
      await onUpdatePatient(patient.id, {
        diseaseCondition: newCondition,
      });
      if (onShowToast) {
        onShowToast(`تم تحديث تصنيف المريض "${patient.fullName}": ${newCondition}`);
      }
      setQuickConditionPatient(null);
    } catch (err: any) {
      alert('خطأ أثناء التحديث: ' + (err.message || ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Concurrency lock to prevent double-submit and duplicate invoices
    if (isSavingPatientRef.current || isSubmitting) return;

    if (!fullName.trim()) {
      setFormError('يرجى إدخال اسم المريض كاملاً.');
      return;
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    const dzPhoneRegex = /^(05|06|07)[0-9]{8}$/;
    if (!dzPhoneRegex.test(cleanPhone)) {
      setFormError('يرجى إدخال رقم هاتف جزائري صحيح يبدأ بـ 05 أو 06 أو 07 متبوعاً بـ 8 أرقام (10 أرقام إجمالاً).');
      return;
    }

    isSavingPatientRef.current = true;
    setIsSubmitting(true);
    try {
      let targetPatient: Patient;
      let invoiceSuccessText = '';
      if (editingPatient) {
        targetPatient = await onUpdatePatient(editingPatient.id, {
          fullName: fullName.trim(),
          phone: cleanPhone,
          birthDate,
          gender,
          address: address.trim(),
          allergies: allergies.trim(),
          medications: medications.trim(),
          patientType,
          diseaseCondition: diseaseCondition.trim() || undefined,
          diseaseStatus,
          notes: notes.trim(),
        });
      } else {
        targetPatient = await onAddPatient({
          fullName: fullName.trim(),
          phone: cleanPhone,
          birthDate,
          gender,
          address: address.trim(),
          allergies: allergies.trim(),
          medications: medications.trim(),
          patientType,
          diseaseCondition: diseaseCondition.trim() || undefined,
          diseaseStatus,
          notes: notes.trim(),
        });

        // Item 2: Auto-create completed appointment & invoice if session price entered (>= 1) for new patient
        if (targetPatient?.id && sessionPrice.trim() !== '') {
          const parsedPrice = parseFloat(sessionPrice);
          // الشرط: يجب أن يكون سعر الجلسة من 1 فما فوق، إذا كانت 0 لا تضيفه
          if (!isNaN(parsedPrice) && parsedPrice >= 1) {
            const parsedPaid = paidNow.trim() !== '' ? parseFloat(paidNow) : parsedPrice;
            const validPaid = isNaN(parsedPaid) ? parsedPrice : Math.max(0, parsedPaid);

            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const aptProcedure = targetPatient.diseaseCondition?.trim()
              ? `جلسة أولى (${targetPatient.diseaseCondition.trim()})`
              : 'جلسة أولى / كشف وفحص';

            let createdApt: Appointment | undefined;
            try {
              // 1. تسجيل الموعد كمنجز (completed) ليظهر تلقائياً في جدول "سجل المواعيد المنجزة والمدفوعات"
              createdApt = await clinicApi.createAppointment({
                patientId: targetPatient.id,
                appointmentDate: getClinicTodayStr(),
                appointmentTime: timeStr,
                procedure: aptProcedure,
                status: 'completed',
                cost: parsedPrice,
                paymentMethod: 'cash',
                notes: 'جلسة أولى مكتملة مسجلة تلقائياً عند إضافة المريض',
              });
            } catch (aptErr) {
              console.error('Failed to create completed appointment:', aptErr);
            }

            // 2. إنشاء الفاتورة المرتبطة بالموعد
            try {
              if (onCreateInvoice) {
                await onCreateInvoice({
                  patientId: targetPatient.id,
                  appointmentId: createdApt?.id,
                  date: getClinicTodayStr(),
                  description: aptProcedure,
                  totalAmount: parsedPrice,
                  paidAmount: validPaid,
                  paymentMethod: 'cash',
                  notes: 'فاتورة تلقائية للجلسة الأولى عند تسجيل المريض',
                });
              } else {
                await clinicApi.createInvoice({
                  patientId: targetPatient.id,
                  appointmentId: createdApt?.id,
                  date: getClinicTodayStr(),
                  description: aptProcedure,
                  totalAmount: parsedPrice,
                  paidAmount: validPaid,
                  paymentMethod: 'cash',
                  notes: 'فاتورة تلقائية للجلسة الأولى عند تسجيل المريض',
                });
              }
              invoiceSuccessText = ` وإدراجه في سجل المواعيد المنجزة بفاتورة قيمتها ${parsedPrice.toLocaleString('ar-DZ')} د.ج`;
            } catch (invErr: any) {
              const errMsg = invErr?.message || 'تعذر إنشاء الفاتورة التلقائية';
              if (onShowToast) {
                onShowToast(`تنبيه: تم تسجيل المريض والموعد ولكن فشل إنشاء الفاتورة (${errMsg})`);
              } else {
                alert(`تنبيه: تم تسجيل المريض والموعد ولكن فشل إنشاء الفاتورة: ${errMsg}`);
              }
            }
          }
        }
      }

      if (selectedPhotos.length > 0 && targetPatient?.id) {
        for (const photo of selectedPhotos) {
          try {
            await clinicApi.uploadFile(targetPatient.id, photo.file, photo.category);
          } catch (uploadErr) {
            console.error('Failed to upload patient file:', uploadErr);
          }
        }
      }

      // تحديث كافة البيانات السريرية في التطبيق (المواعيد، الفواتير، الملفات)
      if (onRefreshFiles) {
        await onRefreshFiles();
      }

      // Automatically store and save patient file locally on user's device
      try {
        const ptConditions = conditions.filter(c => c.patientId === targetPatient.id);
        const ptNotes = clinicalNotesList.filter(n => n.patientId === targetPatient.id);
        const ptApts = appointments.filter(a => a.patientId === targetPatient.id);
        const ptFiles = files.filter(f => f.patientId === targetPatient.id);
        await localPatientStorageService.savePatientFileLocally(
          targetPatient,
          ptConditions,
          ptNotes,
          ptApts,
          ptFiles,
          settings
        );
        if (onShowToast) {
          onShowToast(`تم حفظ وتحديث ملف المريض (${targetPatient.fullName})${invoiceSuccessText} بنجاح`);
        }
      } catch (localSaveErr) {
        console.warn('Auto local save failed:', localSaveErr);
      }

      handleClearPhotos();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء حفظ بيانات المريض.');
    } finally {
      setIsSubmitting(false);
      isSavingPatientRef.current = false;
    }
  };

  const normalizeArabic = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();
  };

  const normalizePhone = (phoneStr: string) => {
    return phoneStr.replace(/[^0-9]/g, '').replace(/^213/, '0').replace(/^00213/, '0');
  };

  const filteredPatients = patients.filter(p => {
    if (typeFilter !== 'all' && p.patientType !== typeFilter) {
      return false;
    }
    if (diseaseFilter !== 'all') {
      const selected = allDiseaseConditions.find(c => c.id === diseaseFilter);
      const kw = selected ? selected.keyword : diseaseFilter;
      const matchPatientCond = p.diseaseCondition && p.diseaseCondition.includes(kw);
      const matchDentalChart = conditions.some(c =>
        c.patientId === p.id && (c.conditionType.includes(kw) || (c.diagnosis && c.diagnosis.includes(kw)))
      );
      if (!matchPatientCond && !matchDentalChart) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const rawQ = searchQuery.trim().toLowerCase();
      const normQ = normalizeArabic(rawQ);
      const phoneQ = normalizePhone(rawQ);

      const normName = normalizeArabic(p.fullName);
      const cleanPhone = normalizePhone(p.phone);

      const matchName = normName.includes(normQ) || p.fullName.toLowerCase().includes(rawQ);
      const matchPhone = (phoneQ.length > 0 && cleanPhone.includes(phoneQ)) || p.phone.includes(rawQ);
      const matchId = p.id.toLowerCase().includes(rawQ);
      const matchAddress = p.address ? normalizeArabic(p.address).includes(normQ) : false;
      const matchDisease = p.diseaseCondition ? normalizeArabic(p.diseaseCondition).includes(normQ) : false;
      const matchAllergies = p.allergies ? normalizeArabic(p.allergies).includes(normQ) : false;
      const matchMedications = p.medications ? normalizeArabic(p.medications).includes(normQ) : false;

      return matchName || matchPhone || matchId || matchAddress || matchDisease || matchAllergies || matchMedications;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shadow-2xs shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
                سجل وسجلات المرضى
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100/80 text-blue-800 font-heading tabular-nums">
                {patients.length} مريض
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans leading-relaxed">
              إدارة ملفات المرضى، البيانات الشخصية، السوابق المرضية والحساسية، والصور الشعاعية
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-heading rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مريض جديد</span>
          </button>
        </div>
      </div>

      {/* Prominent Quick-Access Patient Search Bar (شريط البحث والوصول السريع لملفات المرضى) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-blue-100 hover:border-blue-200 transition-all shadow-xs space-y-3.5 bg-gradient-to-br from-white via-white to-blue-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label htmlFor="patient-search-input" className="text-sm font-black font-heading text-slate-800 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shadow-2xs">
              <Search className="w-4 h-4" />
            </span>
            <span>البحث السريع في ملفات المرضى</span>
            <span className="text-xs font-normal text-slate-500 hidden sm:inline">(بالاسم الكامل أو رقم الهاتف)</span>
          </label>
          <div className="flex items-center gap-2">
            {searchQuery.trim() ? (
              <span className="text-xs font-bold text-blue-800 bg-blue-100/80 px-2.5 py-1 rounded-full border border-blue-300">
                نتائج البحث: {filteredPatients.length} من أصل {patients.length} مريض
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">
                إجمالي المرضى: {patients.length}
              </span>
            )}
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative flex items-center">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search className="w-5 h-5 text-blue-600" />
          </div>
          <input
            id="patient-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredPatients.length > 0) {
                onOpenPatientDossier(filteredPatients[0].id);
              }
            }}
            placeholder="اكتب اسم المريض (مثال: بن علي، محمد...) أو رقم الهاتف (05 / 06 / 07)..."
            className="w-full pr-12 pl-28 py-3.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-inner"
            autoComplete="off"
          />

          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-red-700 bg-slate-200/80 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
                <span>مسح</span>
              </button>
            ) : (
              <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200">
                Enter للفتح السريع
              </span>
            )}
          </div>
        </div>

        {/* Quick Result Preview Chips when Search is Active */}
        {searchQuery.trim() !== '' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <span>الوصول المباشر:</span>
            </span>
            {filteredPatients.length > 0 ? (
              <>
                {filteredPatients.slice(0, 6).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onOpenPatientDossier(p.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-blue-600 text-slate-800 hover:text-white border border-blue-200 hover:border-blue-600 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-sm cursor-pointer group"
                    title={`فتح الملف السريري لـ ${p.fullName}`}
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 group-hover:text-white" />
                    <span>{p.fullName}</span>
                    <span className="text-[10px] font-mono opacity-80 group-hover:text-blue-100 dir-ltr">
                      {p.phone}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 group-hover:bg-blue-700 text-blue-700 group-hover:text-white font-normal">
                      فتح الملف ↵
                    </span>
                  </button>
                ))}
                {filteredPatients.length > 6 && (
                  <span className="text-xs text-slate-500 font-medium self-center pr-1">
                    +{filteredPatients.length - 6} مريض آخر في الجدول أدناه
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                لا يوجد مريض يطابق عبارة البحث "{searchQuery}"
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Disease Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-blue-300 hover:border-blue-400 rounded-xl shadow-2xs transition-colors">
                <HeartPulse className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-extrabold font-heading text-slate-800 whitespace-nowrap">
                  تصنيف الحالة:
                </span>
                <select
                  value={diseaseFilter}
                  onChange={(e) => setDiseaseFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-blue-900 focus:outline-none cursor-pointer pr-1"
                >
                  {allDiseaseConditions.map(cond => (
                    <option key={cond.id} value={cond.id}>
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>
              {diseaseFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setDiseaseFilter('all')}
                  className="text-xs text-blue-800 hover:text-blue-950 bg-blue-100 hover:bg-blue-200 px-2.5 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 border border-blue-300 shadow-2xs cursor-pointer"
                  title="إلغاء الفلترة"
                >
                  <span>عرض الكل ({patients.length})</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold">
                <span>تصفية بالبحث: <strong>"{searchQuery}"</strong></span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 hover:bg-blue-200 rounded text-blue-600 cursor-pointer"
                  title="إلغاء البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 self-start lg:self-auto shrink-0">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              الكل ({patients.length})
            </button>
            <button
              onClick={() => setTypeFilter('new')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'new'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              مرضى جدد ({patients.filter(p => p.patientType === 'new').length})
            </button>
            <button
              onClick={() => setTypeFilter('returning')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'returning'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              مرضى متابعون ({patients.filter(p => p.patientType === 'returning').length})
            </button>
          </div>
        </div>

        {/* Patients Table */}
        {filteredPatients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-50/40">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {searchQuery.trim()
                ? `لم يتم العثور على أي مريض يطابق: "${searchQuery}"`
                : 'لا توجد نتائج مطابقة للمحددات المحددة'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery.trim()
                ? 'تحقق من صحة الاسم أو رقم الهاتف، أو قم بإضافة مريض جديد مباشرة'
                : 'جرّب تغيير عبارة البحث أو الفلتر أعلاه'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  مسح البحث وعرض كافة المرضى
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + إضافة مريض الآن
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 text-slate-700 font-heading font-bold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3 px-4 font-bold font-heading">رقم الملف</th>
                  <th className="py-3 px-4 font-bold font-heading">اسم المريض</th>
                  <th className="py-3 px-4 font-bold font-heading">الحالة السريرية</th>
                  <th className="py-3 px-4 font-bold font-heading">رقم الهاتف</th>
                  <th className="py-3 px-4 font-bold font-heading">العمر / الجنس</th>
                  <th className="py-3 px-4 font-bold font-heading">العنوان</th>
                  <th className="py-3 px-4 font-bold font-heading">الحساسية والأدوية</th>
                  <th className="py-3 px-4 font-bold font-heading">النوع</th>
                  <th className="py-3 px-4 text-center font-bold font-heading">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map(patient => {
                  const age = calculateAge(patient.birthDate);
                  const hasAlert = patient.allergies && patient.allergies !== 'لا يوجد' && patient.allergies !== 'لا توجد حساسية معروفة';
                  const patientFiles = files.filter(f => f.patientId === patient.id);
                  const patientFilesCount = patientFiles.length;

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500 tabular-nums">
                        {patient.id}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onOpenPatientDossier(patient.id)}
                          className="font-bold text-blue-800 hover:text-blue-950 hover:underline block text-right font-heading cursor-pointer"
                        >
                          {patient.fullName}
                        </button>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-[10px] text-slate-400">
                            تاريخ التسجيل: {formatDateDZ(patient.createdAt.slice(0, 10))}
                          </span>
                          {patientFilesCount > 0 && (
                            <button
                              type="button"
                              onClick={() => onOpenPatientDossier(patient.id, 'files')}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
                              title="عرض صور وأشعة المريض"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>{patientFilesCount} {patientFilesCount === 1 ? 'صورة/أشعة' : 'صور/أشعة'}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Disease Condition */}
                      <td className="py-3 px-4">
                        {patient.diseaseCondition ? (
                          <button
                            type="button"
                            onClick={() => setQuickConditionPatient(patient)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs hover:scale-105 transition-transform cursor-pointer ${getDiseaseBadgeStyle(patient.diseaseCondition)}`}
                            title="انقر لتعديل التشخيص السريري"
                          >
                            <HeartPulse className="w-3.5 h-3.5 shrink-0" />
                            <span>{patient.diseaseCondition}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setQuickConditionPatient(patient)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer"
                            title="إضافة تشخيص سريري للمريض"
                          >
                            <HeartPulse className="w-3 h-3 text-blue-600" />
                            <span>+ تصنيف الحالة</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums">
                        <a
                          href={`tel:${patient.phone}`}
                          className="flex items-center gap-1 text-slate-700 hover:text-blue-600"
                          title="اتصال هاتفي"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{patient.phone}</span>
                        </a>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {age !== null ? `${age} سنة` : '-'} • {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={patient.address}>
                        {patient.address || '-'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {hasAlert ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="max-w-[120px] truncate" title={patient.allergies}>{patient.allergies}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">لا توجد حساسية</span>
                          )}
                          {patient.medications && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200" title={`الأدوية: ${patient.medications}`}>
                              <Pill className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="max-w-[120px] truncate">{patient.medications}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {patient.patientType === 'new' ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">
                            جديد
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            متابع
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleSavePatientLocally(patient)}
                            disabled={savingPatientId === patient.id}
                            className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-800 hover:text-blue-950 border border-blue-300 rounded text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap"
                            title="حفظ الملف وتنزيله محلياً (JSON + تقرير طبي HTML)"
                          >
                            <Download className={`w-3.5 h-3.5 text-blue-600 ${savingPatientId === patient.id ? 'animate-bounce' : ''}`} />
                            <span>{savingPatientId === patient.id ? 'جارٍ الحفظ...' : 'حفظ محلي'}</span>
                          </button>

                          <button
                            onClick={() => onOpenPatientDossier(patient.id)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="فتح الملف الطبي الكامل"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>الملف</span>
                          </button>

                          <button
                            onClick={() => onOpenPatientDossier(patient.id, 'jaw-chart')}
                            className="px-2 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200/80 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="فتح مخطط الفك والأسنان التفاعلي للمريض"
                          >
                            <Smile className="w-3.5 h-3.5 text-cyan-700" />
                            <span className="hidden sm:inline">مخطط الفك</span>
                          </button>

                          {patientFilesCount > 0 && (
                            <button
                              onClick={() => onOpenPatientDossier(patient.id, 'files')}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="عرض صور وأشعة المريض"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>الأشعة ({patientFilesCount})</span>
                            </button>
                          )}

                          <button
                            onClick={() => onBookAppointmentForPatient(patient.id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors cursor-pointer"
                            title="حجز موعد جديد"
                          >
                            موعد
                          </button>

                          <button
                            onClick={() => handleOpenEdit(patient)}
                            title="تعديل البيانات"
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPatientToDelete(patient)}
                            title="حذف المريض"
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

      {/* ADD / EDIT PATIENT MODAL (FULL SCREEN) */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-50 flex ${isModalFullScreen ? 'bg-slate-900/60 p-0' : 'items-center justify-center bg-slate-900/60 p-2 sm:p-4'}`}>
          <div className={`bg-white shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
            isModalFullScreen 
              ? 'w-full h-full rounded-none' 
              : 'rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh]'
          }`}>
            {/* Modal Top Bar */}
            <div className="px-5 sm:px-8 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-2xs shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-heading tracking-tight">
                      {editingPatient ? `تعديل بيانات المريض (${editingPatient.fullName})` : 'إضافة مريض جديد'}
                    </h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                      <span>لوحة ملء الشاشة</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                    {editingPatient
                      ? 'تعديل السجل الطبي والسريري والمرفقات والأدوية والمدفوعات'
                      : 'تسجيل ملف طبي وسريري متكامل، التشخيص، الأدوية، الأشعة، والمتابعة المالية'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalFullScreen(!isModalFullScreen)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  title={isModalFullScreen ? 'تصغير إلى نافذة عادية' : 'تكبير ملء الشاشة'}
                >
                  {isModalFullScreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>نافذة عادية</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>ملء الشاشة</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer"
                  title="إغلاق اللوحة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col bg-slate-50/60 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className={`${isModalFullScreen ? 'max-w-6xl mx-auto' : 'w-full'} space-y-5`}>
                  {formError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs leading-relaxed flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* 2-Column Responsive Layout */}
                  <div className={`grid grid-cols-1 ${isModalFullScreen ? 'lg:grid-cols-2' : ''} gap-6 items-start`}>
                    
                    {/* Column 1: Personal Data & Health Profile */}
                    <div className="space-y-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-blue-950 font-extrabold text-xs sm:text-sm font-heading">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span>البيانات الشخصية ومعلومات الاتصال</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم واللقب: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: ياسمين بلقاسم"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف (يبدأ بـ 05 / 06 / 07): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0550123456"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    يجب أن يبدأ بـ 05 (أوريدو) أو 06 (موبيليس) أو 07 (جازي)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الميلاد:
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {birthDate && calculateAge(birthDate) !== null && (
                    <span className="text-[11px] text-blue-700 font-semibold mt-0.5 block">
                      العمر المحسوب: {calculateAge(birthDate)} سنة
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الجنس:
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={gender === 'male'}
                        onChange={() => setGender('male')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>ذكر</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={gender === 'female'}
                        onChange={() => setGender('female')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>أنثى</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العنوان / مكان الإقامة:
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="أدخل مكان الإقامة (اختياري)..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-900">
                    الحساسية والمحاذير الطبية والأمراض المزمنة:
                  </label>
                  <span className="text-[10px] text-amber-800">انقر للإضافة السريعة</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'حساسية البنسلين',
                    'مرض السكري',
                    'ضغط الدم',
                    'أمراض القلب',
                    'حساسية التخدير الموضعي',
                    'حمل (Pregnant)',
                    'أدوية تخثر الدم',
                  ].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addAllergyTag(tag)}
                      className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] transition-colors cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="أدخل أي ملاحظات حساسية أو أمراض مزمنة..."
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Medications Taken (شريط وقائمة الأدوية التي تناولها) */}
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 shadow-2xs">
                <MedicationSelector
                  value={medications}
                  onChange={setMedications}
                  label="الأدوية التي تناولها / الأدوية الحالية للمريض:"
                  placeholder="انقر هنا لاختيار أو كتابة الأدوية المتناولة..."
                />
              </div>

              {/* Patient Type Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                <label className="block text-xs font-bold text-slate-800 mb-1 font-heading">
                  نوع المريض:
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="patientType"
                      value="new"
                      checked={patientType === 'new'}
                      onChange={() => setPatientType('new')}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>مريض جديد (أول زيارة)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="patientType"
                      value="returning"
                      checked={patientType === 'returning'}
                      onChange={() => setPatientType('returning')}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>مريض متابع (زيارات سابقة)</span>
                  </label>
                </div>
                <span className="text-[11px] text-slate-400 block">
                  يتحول المريض الجديد تلقائياً إلى &quot;متابع&quot; بمجرد إتمام أول موعد علاجي له.
                </span>
              </div>
            </div>

            {/* Column 2: Diagnosis, Tariffs, Finance & Attachments */}
            <div className="space-y-4">
              {/* Disease Condition Dropdown */}
              <div
                ref={diseaseDropdownRef}
                className="p-3.5 bg-blue-50/50 rounded-xl border-2 border-blue-200/90 space-y-2.5 relative"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-extrabold font-heading text-blue-950">
                    <HeartPulse className="w-4 h-4 text-blue-600" />
                    <span>التشخيص السريري الرئيسي وحالة المرض:</span>
                  </label>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDiseaseDropdownOpen(!isDiseaseDropdownOpen)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-blue-300 hover:border-blue-500 rounded-xl text-xs text-right font-bold transition-all flex items-center justify-between shadow-2xs cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                      <HeartPulse className="w-4 h-4 text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
                      {diseaseCondition ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold border ${getDiseaseBadgeStyle(diseaseCondition)}`}>
                            {diseaseCondition}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            {getDiseasePrice(diseaseCondition, diseasePrices).toLocaleString('ar-DZ')} د.ج
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          اختر الحالة السريرية (تسوس، عصب، تقويم)...
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-blue-700 font-bold text-xs bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 group-hover:bg-blue-100 transition-colors">
                      <span>{isDiseaseDropdownOpen ? 'إغلاق القائمة' : 'تغيير التصنيف'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDiseaseDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isDiseaseDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white rounded-xl border-2 border-blue-400 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                          <HeartPulse className="w-3.5 h-3.5 text-blue-600" />
                          قائمة الحالات السريرية مع التسعيرات المعتمدة
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewDisease(!isAddingNewDisease)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة مرض جديد</span>
                        </button>
                      </div>

                      {/* Inline Form to Add a New Disease */}
                      {isAddingNewDisease && (
                        <div className="p-3 bg-indigo-50/90 border-b-2 border-indigo-200 text-xs space-y-2.5 animate-in fade-in duration-100">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>إضافة مرض / تشخيص سريري جديد للقائمة:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsAddingNewDisease(false)}
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">اسم المرض / الحالة:</label>
                              <input
                                type="text"
                                value={newDiseaseName}
                                onChange={(e) => setNewDiseaseName(e.target.value)}
                                placeholder="مثال: تبييض الأسنان أو خلع جراحي..."
                                className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">سعر الجلسة الافتراضي (د.ج):</label>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={newDiseasePrice}
                                onChange={(e) => setNewDiseasePrice(e.target.value)}
                                placeholder="مثال: 5000"
                                className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs text-emerald-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsAddingNewDisease(false)}
                              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-bold border border-slate-200 cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddNewDisease()}
                              disabled={isSavingNewDisease || !newDiseaseName.trim()}
                              className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold disabled:opacity-50 cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isSavingNewDisease ? 'جارٍ الحفظ...' : 'حفظ المرض واختياره للمريض'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="max-h-60 overflow-y-auto p-1.5 divide-y divide-slate-100">
                        {allDiseaseConditions.filter(c => c.id !== 'all').map((cond) => {
                          const isSelected = diseaseCondition === cond.label;
                          const condPrice = getDiseasePrice(cond.label, diseasePrices);
                          return (
                            <div
                              key={cond.id}
                              className={`w-full text-right p-2.5 rounded-lg transition-all flex items-center justify-between text-xs font-bold cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-100/90 text-blue-950 font-extrabold shadow-2xs'
                                  : 'hover:bg-blue-50/80 text-slate-800'
                              }`}
                              onClick={() => {
                                setDiseaseCondition(cond.label);
                                setIsDiseaseDropdownOpen(false);
                                if (!editingPatient) {
                                  const pr = getDiseasePrice(cond.label, diseasePrices);
                                  setSessionPrice(pr > 0 ? String(pr) : '');
                                  if (!hasManuallyEditedPaidNow) {
                                    setPaidNow(pr > 0 ? String(pr) : '');
                                  }
                                }
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cond.badge ? cond.badge.split(' ')[0] : 'bg-indigo-500'}`} />
                                <span className="font-heading truncate">{cond.label}</span>
                                {cond.isCustom && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-100 text-indigo-800 font-normal">
                                    مخصص
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                                  {condPrice.toLocaleString('ar-DZ')} د.ج
                                </span>
                                {isSelected ? (
                                  <span className="text-[11px] text-blue-700 font-extrabold flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-blue-300">
                                    <Check className="w-3 h-3 text-blue-600" />
                                    محدد
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-blue-600 font-medium">
                                    تحديد
                                  </span>
                                )}
                                {cond.isCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteCustomDisease(cond.id, e)}
                                    className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition-colors mr-1 cursor-pointer"
                                    title="حذف هذا المرض المخصص من القائمة"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-col sm:flex-row pt-1">
                  <input
                    type="text"
                    value={diseaseCondition}
                    onChange={(e) => {
                      const text = e.target.value;
                      setDiseaseCondition(text);
                      if (!editingPatient && text.trim()) {
                        const matchedPrice = getDiseasePrice(text, diseasePrices);
                        if (matchedPrice > 0 && (!sessionPrice || sessionPrice === '0')) {
                          setSessionPrice(String(matchedPrice));
                          if (!hasManuallyEditedPaidNow) {
                            setPaidNow(String(matchedPrice));
                          }
                        }
                      }
                    }}
                    placeholder="أو اكتب تشخيصاً خاصاً (مثلاً: كسر في القاطع 11...)"
                    className="w-full sm:flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                  />
                  <select
                    value={diseaseStatus}
                    onChange={(e: any) => setDiseaseStatus(e.target.value)}
                    className="w-full sm:w-auto px-2.5 py-2 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-900 focus:outline-none cursor-pointer"
                  >
                    <option value="active">نشط (Active)</option>
                    <option value="under_treatment">قيد العلاج</option>
                    <option value="urgent">طارئ ومستعجل</option>
                    <option value="completed">منتهي ومكتمل</option>
                    <option value="stable">مستقر</option>
                  </select>
                </div>

              </div>

              {!editingPatient && (
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/90 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold font-heading text-emerald-950">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>تسجيل الجلسة الأولى والمدفوعات (إدراج تلقائي في المالية):</span>
                    </label>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      تلقائية
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        سعر الجلسة (د.ج):
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={sessionPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSessionPrice(val);
                          if (!hasManuallyEditedPaidNow) {
                            setPaidNow(val);
                          }
                        }}
                        placeholder="من 1 فما فوق (0 لعدم الإضافة)"
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        المدفوع الآن (د.ج):
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={paidNow}
                        onChange={(e) => {
                          setHasManuallyEditedPaidNow(true);
                          setPaidNow(e.target.value);
                        }}
                        placeholder="اختياري (كامل المبلغ إن تُرك فارغاً)"
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات سريرية أولية:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي معلومات إضافية عن المريض..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Photo & X-Ray Attachment Section */}
              <div className="p-4 bg-slate-50/90 rounded-xl border border-dashed border-blue-300/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <label className="text-xs font-bold font-heading text-slate-900">
                        إرفاق صور وأشعة سِنية فورية (اختياري):
                      </label>
                      {selectedPhotos.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 font-mono">
                          {selectedPhotos.length} {selectedPhotos.length === 1 ? 'ملف مرفق' : 'ملفات مرفقة'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
                      يمكنك رفع الصور الشعاعية (Panoramique / RVG) وتقارير التحاليل مباشرة مع إنشاء الملف
                    </p>
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleSelectPhotos}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold font-heading shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>اختيار ملفات الأشعة</span>
                    </button>
                  </div>
                </div>

                {selectedPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {selectedPhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 shadow-2xs group relative"
                      >
                        <div className="w-12 h-12 rounded-md bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                          {photo.previewUrl ? (
                            <img
                              src={photo.previewUrl}
                              alt={photo.file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={photo.file.name}>
                            {photo.file.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {(photo.file.size / 1024).toFixed(0)} KB
                          </p>
                          <select
                            value={photo.category}
                            onChange={(e) => handleUpdatePhotoCategory(idx, e.target.value)}
                            className="mt-1 w-full text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          >
                            {PHOTO_CATEGORIES.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                          title="إزالة المرفق"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3.5 border border-dashed border-slate-300 rounded-lg text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        انقر هنا لاختيار أو سحب صور الأشعة أو التقارير الطبية
                      </p>
                      <span className="text-[10px] text-slate-400">
                        يدعم صيغ JPG, PNG, WEBP ومستندات PDF (أشعة RVG أو بانوراما)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* End Column 2 */}

          </div>
          {/* End 2-Column Grid */}

        </div>
        {/* End Inner Max-W Container */}

      </div>
      {/* End Scrollable Body */}

      {/* Sticky Action Footer */}
      <div className="border-t border-slate-200 bg-white px-5 sm:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="text-xs text-slate-500 font-sans hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>جميع البيانات والصور والمرفقات تُحفظ وتُشفّر محلياً على الحاسوب بشكل فوري وآمن.</span>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إلغاء وتراجع
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{selectedPhotos.length > 0 ? 'جارٍ رفع الملفات وحفظ البيانات...' : 'جارٍ الحفظ...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{editingPatient ? 'تحديث وحفظ التعديلات' : 'حفظ وتسجيل المريض'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
          </div>
        </div>
      )}

      {/* Quick Modal for Selecting / Updating Disease Condition */}
      {quickConditionPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading text-slate-900">
                    تعديل وتعيين تصنيف الحالة السريرية
                  </h3>
                  <p className="text-xs text-slate-500">
                    للمريض: <strong className="text-slate-800">{quickConditionPatient.fullName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickConditionPatient(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                اختر التشخيص السريري المناسب:
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto p-1">
                {allDiseaseConditions.filter(c => c.id !== 'all').map(cond => (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => handleSaveQuickCondition(quickConditionPatient, cond.label)}
                    className="w-full text-right p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/70 transition-all flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer group"
                  >
                    <span className="flex items-center gap-2">
                      <HeartPulse className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span>{cond.label}</span>
                    </span>
                    <span className="text-[10px] text-blue-700 font-semibold group-hover:underline">
                      اختيار وتحديث
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setQuickConditionPatient(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PATIENT CONFIRMATION MODAL */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-700">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">
                  نقل المريض إلى سلة المحذوفات
                </h3>
                <p className="text-xs text-slate-500">
                  حذف مؤقت مع إمكانية الاسترجاع الكامل
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed space-y-2">
              <p>
                هل أنت متأكد من رغبتك في نقل ملف المريض التالي إلى سلة المحذوفات؟
              </p>
              <div className="font-bold text-sm text-slate-900 bg-white/90 p-2.5 rounded-lg border border-amber-200">
                {patientToDelete.fullName} ({patientToDelete.id})
              </div>
              <p className="text-xs font-bold text-amber-800 bg-amber-100/70 p-2 rounded-lg border border-amber-200/80">
                💡 سيُنقل المريض إلى سلة المحذوفات ويمكنك استرجاعه خلال 30 يوماً.
              </p>
              <p className="text-[11px] text-slate-500">
                لن تظهر مواعيد المريض في التقويم النشط ولن تُرسل له تذكيرات أثناء وجوده في السلة، وعند استرجاعه يعود الملف بجميع مواعيده وفواتيره وتشخيصاته فورياً.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingPatient}
                onClick={() => setPatientToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                disabled={isDeletingPatient}
                onClick={async () => {
                  if (!patientToDelete) return;
                  setIsDeletingPatient(true);
                  try {
                    await onDeletePatient(patientToDelete.id);
                    setPatientToDelete(null);
                  } catch (err: any) {
                    onShowToast?.(err?.message || 'تعذر نقل المريض إلى السلة.');
                  } finally {
                    setIsDeletingPatient(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingPatient ? 'جارٍ النقل...' : 'نقل إلى سلة المحذوفات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DISEASE PRICE CONFIGURATION (تعديل وضبط تسعيرة الأمراض) */}
      {/* ============================================================== */}
      {isPriceConfigOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading">
                    إدارة وتعديل تسعيرة الأمراض والعلاجات (DZD)
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    تُسجل هذه التسعيرة تلقائياً في خانة &quot;سعر الجلسة&quot; عند اختيار المرض في ملف المريض
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPriceConfigOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3.5 text-xs">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-900 text-xs flex items-center justify-between gap-2 flex-wrap">
                <span>
                  💡 يمكنك تخصيص التسعيرة المعتمدة لكل علاج في العيادة. كما يمكنك تعديل سعر الجلسة يدوياً لأي مريض.
                </span>
                <button
                  type="button"
                  onClick={handleResetDefaultPrices}
                  className="shrink-0 px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 rounded-lg border border-blue-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3 text-blue-600" />
                  <span>استعادة الافتراضي</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {allDiseaseConditions.filter(c => c.id !== 'all').map((cond) => {
                  const currentVal = tempPrices[cond.label] !== undefined ? tempPrices[cond.label] : cond.defaultPrice;
                  return (
                    <div key={cond.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cond.badge ? cond.badge.split(' ')[0] : 'bg-blue-500'}`} />
                        <div>
                          <div className="font-heading font-bold text-slate-900 text-xs truncate">
                            {cond.label}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            السعر المبدئي: {cond.defaultPrice.toLocaleString('ar-DZ')} د.ج
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={currentVal}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setTempPrices(prev => ({
                              ...prev,
                              [cond.label]: val,
                            }));
                          }}
                          className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-left focus:bg-white focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-[11px] font-bold text-slate-600">د.ج</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                يتم حفظ التسعيرات وتطبيقها على كامل النظام فوراً
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPriceConfigOpen(false)}
                  disabled={isSavingPrices}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveDiseasePrices}
                  disabled={isSavingPrices}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingPrices ? 'جارٍ الحفظ...' : 'حفظ وتطبيق التسعيرات'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
