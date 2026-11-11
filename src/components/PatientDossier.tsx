import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Patient,
  Appointment,
  DentalCondition,
  ClinicalNote,
  PatientFile,
  ClinicSettings,
  Invoice,
  BeforeAfterCase,
  FollowUpRecord,
} from '../types';
import { DentalFileViewer } from './DentalFileViewer';
import { getClinicTodayStr } from '../utils/clinicDate';
import { MedicationSelector } from './MedicationSelector';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { FollowUpModal } from './FollowUpModal';
import {
  X,
  Phone,
  Calendar,
  AlertTriangle,
  FileText,
  Trash2,
  Upload,
  Image as ImageIcon,
  Eye,
  Activity,
  Edit3,
  Download,
  Smile,
  RotateCw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sparkles,
  Info,
  PlusCircle,
  User,
  MapPin,
  Check,
  ChevronLeft,
  AlertCircle,
  CreditCard,
  HeartPulse,
  Pill,
  ShieldCheck,
  Stethoscope,
  Plus,
  Clock,
  Printer,
  CheckCircle2,
  Receipt,
  Settings,
  History,
} from 'lucide-react';
import { localPatientStorageService } from '../utils/localPatientStorage';
import { clinicApi } from '../services/api';

export type DossierTab =
  | 'profile'
  | 'medical'
  | 'teeth'
  | 'jaw-chart'
  | 'appointments'
  | 'treatments'
  | 'files'
  | 'invoices'
  | 'notes';

interface PatientDossierProps {
  patient: Patient;
  appointments: Appointment[];
  conditions: DentalCondition[];
  notes: ClinicalNote[];
  files: PatientFile[];
  initialTab?: DossierTab;
  settings?: ClinicSettings;
  onClose: () => void;
  onUpdatePatient?: (id: string, updates: Partial<Patient>) => Promise<Patient>;
  onAddCondition: (condition: Omit<DentalCondition, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateCondition: (id: string, updates: Partial<DentalCondition>) => Promise<void>;
  onDeleteCondition: (id: string) => Promise<void>;
  onAddNote: (noteText: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onUploadFile: (file: File, category: string) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  onBookAppointment?: (patientId: string) => void;
  onAddAppointment?: (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateAppointment?: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onDeleteAppointment?: (id: string) => Promise<void>;
  onShowToast?: (message: string) => void;
  currentUserRole?: 'doctor' | 'assistant';
  onInvoicesUpdated?: () => void;
}

// Illustrated Profile Avatar matching screenshot
const PatientAvatar: React.FC<{ gender: 'male' | 'female'; size?: 'sm' | 'md' | 'lg' }> = ({
  gender,
  size = 'lg',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
  }[size];

  if (gender === 'female') {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-br from-purple-100 via-indigo-100 to-purple-200 border-2 border-purple-200 flex items-center justify-center overflow-hidden shadow-inner select-none`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Hair back */}
          <path d="M22,50 C20,78 30,90 35,95 C45,85 55,85 65,95 C70,90 80,78 78,50 C78,28 65,16 50,16 C35,16 22,28 22,50 Z" fill="#2d1b36" />
          {/* Neck */}
          <rect x="44" y="65" width="12" height="15" rx="4" fill="#fbd0b4" />
          {/* Collar/Shirt */}
          <path d="M28,88 C32,78 40,76 50,76 C60,76 68,78 72,88 L78,100 L22,100 Z" fill="#805ad5" />
          <path d="M43,76 L50,86 L57,76 Z" fill="#fbd0b4" />
          {/* Face */}
          <ellipse cx="50" cy="50" rx="20" ry="24" fill="#fbd0b4" />
          {/* Cheeks */}
          <circle cx="38" cy="54" r="3.5" fill="#f687b3" opacity="0.6" />
          <circle cx="62" cy="54" r="3.5" fill="#f687b3" opacity="0.6" />
          {/* Hair front */}
          <path d="M30,44 C33,26 42,22 50,22 C58,22 67,26 70,44 C67,36 58,32 50,32 C42,32 33,36 30,44 Z" fill="#2d1b36" />
          <path d="M28,45 C29,35 34,30 40,30 C34,36 32,45 30,55 C29,51 28,48 28,45 Z" fill="#2d1b36" />
          <path d="M72,45 C71,35 66,30 60,30 C66,36 68,45 70,55 C71,51 72,48 72,45 Z" fill="#2d1b36" />
          {/* Eyes */}
          <ellipse cx="42" cy="48" rx="2.2" ry="3" fill="#1a202c" />
          <ellipse cx="58" cy="48" rx="2.2" ry="3" fill="#1a202c" />
          <circle cx="43" cy="47" r="0.8" fill="#ffffff" />
          <circle cx="59" cy="47" r="0.8" fill="#ffffff" />
          {/* Eyebrows */}
          <path d="M38,42 Q42,40 46,42" stroke="#2d1b36" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M54,42 Q58,40 62,42" stroke="#2d1b36" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Nose */}
          <path d="M50,49 Q51,53 49,54" stroke="#e29578" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          {/* Smile */}
          <path d="M44,59 Q50,65 56,59" stroke="#b83280" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-blue-100 via-blue-100 to-blue-200 border-2 border-blue-200 flex items-center justify-center overflow-hidden shadow-inner select-none`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Hair back */}
        <path d="M26,45 C24,25 35,16 50,16 C65,16 76,25 74,45 C74,52 70,60 70,60 L30,60 C30,60 26,52 26,45 Z" fill="#1f2937" />
        {/* Neck */}
        <rect x="43" y="66" width="14" height="15" rx="3" fill="#fbd0b4" />
        {/* Collar/Shirt */}
        <path d="M26,90 C32,78 40,76 50,76 C60,76 68,78 74,90 L80,100 L20,100 Z" fill="#0d9488" />
        <path d="M44,76 L50,86 L56,76 Z" fill="#fbd0b4" />
        {/* Face */}
        <ellipse cx="50" cy="50" rx="20" ry="23" fill="#fbd0b4" />
        {/* Hair front */}
        <path d="M28,38 C32,24 45,20 52,20 C62,20 72,24 72,35 C66,28 54,26 48,27 C38,28 32,32 28,38 Z" fill="#1f2937" />
        {/* Eyes */}
        <ellipse cx="42" cy="48" rx="2.2" ry="2.8" fill="#1a202c" />
        <ellipse cx="58" cy="48" rx="2.2" ry="2.8" fill="#1a202c" />
        <circle cx="43" cy="47" r="0.8" fill="#ffffff" />
        <circle cx="59" cy="47" r="0.8" fill="#ffffff" />
        {/* Eyebrows */}
        <path d="M37,42 Q42,39 47,41" stroke="#1f2937" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M53,41 Q58,39 63,42" stroke="#1f2937" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Nose */}
        <path d="M50,49 Q51,54 48,55" stroke="#e29578" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Smile */}
        <path d="M43,60 Q50,65 57,60" stroke="#b91c1c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export const PatientDossier: React.FC<PatientDossierProps> = ({
  patient,
  appointments,
  conditions,
  notes,
  files,
  initialTab = 'profile',
  settings,
  onClose,
  onUpdatePatient,
  onAddCondition,
  onUpdateCondition,
  onDeleteCondition,
  onAddNote,
  onDeleteNote,
  onUploadFile,
  onDeleteFile,
  onBookAppointment,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onShowToast,
  currentUserRole = 'doctor',
  onInvoicesUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<DossierTab>(initialTab);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isDossierFullscreen, setIsDossierFullscreen] = useState<boolean>(true);
  const [isSavingLocal, setIsSavingLocal] = useState<boolean>(false);

  // Concurrency Controls & Safe Refs
  const conditionsRef = useRef(conditions);
  conditionsRef.current = conditions;

  const activeMutationsRef = useRef<Record<number, boolean>>({});

  // Reactive local cache for instant UI rendering and stable sync with localStorage
  const [localConditionsMap, setLocalConditionsMap] = useState<Record<number, {
    conditionType: string;
    treatmentDone?: string;
    status: 'in_progress' | 'treated' | 'monitoring';
    date: string;
  }>>(() => {
    if (!patient?.id) return {};
    try {
      const storedKey = `dental_conditions_${patient.id}`;
      return JSON.parse(localStorage.getItem(storedKey) || '{}');
    } catch {
      return {};
    }
  });

  // Synchronize conditions prop and patient ID safely with local state and localStorage
  useEffect(() => {
    if (!patient?.id) return;
    const storedKey = `dental_conditions_${patient.id}`;

    const patientConditions = conditions.filter(c => c.patientId === patient.id);
    const updatedMap: Record<number, any> = {};

    // Populate exclusively from authoritative conditions for this patient
    patientConditions.forEach(c => {
      updatedMap[c.toothNumber] = {
        conditionType: c.conditionType,
        treatmentDone: c.treatmentDone,
        status: c.status,
        date: c.recordedDate || getClinicTodayStr(),
      };
    });

    setLocalConditionsMap(updatedMap);
    try {
      localStorage.setItem(storedKey, JSON.stringify(updatedMap));
    } catch {}
  }, [patient?.id, conditions]);

  // Reset all 32 teeth to 100% healthy (سليم / طبيعي)
  const handleResetAllTeethToHealthy = useCallback(async () => {
    if (!patient?.id) return;
    const storedKey = `dental_conditions_${patient.id}`;

    // 1. Optimistic UI: clear conditions map immediately so all teeth render healthy
    setLocalConditionsMap({});
    try {
      localStorage.removeItem(storedKey);
    } catch {}

    // 2. Delete all conditions for this patient from database
    const patientConds = conditionsRef.current.filter(c => c.patientId === patient.id);
    for (const c of patientConds) {
      try {
        await onDeleteCondition(c.id);
      } catch (err) {
        console.error('Error deleting condition:', err);
      }
    }

    if (onShowToast) {
      onShowToast('تمت إعادة ضبط جميع الأسنان إلى سليمة وطبيعية بنجاح (32 سناً)');
    }
  }, [patient?.id, onDeleteCondition, onShowToast]);

  // One-click apply condition with concurrency lock and optimistic state update
  const handleApplyCondition = useCallback(async (
    toothNumber: number,
    conditionKey: 'caries' | 'fracture' | 'missing' | 'filling' | 'ortho' | 'normal'
  ) => {
    if (!patient?.id) return;

    // Mutex lock per tooth to prevent race conditions & duplicate additions
    if (activeMutationsRef.current[toothNumber]) return;
    activeMutationsRef.current[toothNumber] = true;

    const storedKey = `dental_conditions_${patient.id}`;

    try {
      if (conditionKey === 'normal') {
        // Optimistic UI update: remove tooth condition locally right away
        setLocalConditionsMap(prev => {
          const next = { ...prev };
          delete next[toothNumber];
          try {
            localStorage.setItem(storedKey, JSON.stringify(next));
          } catch {}
          return next;
        });

        // Delete from database using latest conditions snapshot
        const existingList = conditionsRef.current.filter(
          c => c.patientId === patient.id && c.toothNumber === toothNumber
        );
        for (const item of existingList) {
          try {
            await onDeleteCondition(item.id);
          } catch (e) {
            console.error('Error deleting condition:', e);
          }
        }

        if (onShowToast) onShowToast(`السن #${toothNumber} بحالة سليمة وطبيعية`);
        return;
      }

      let conditionType = 'تسوس';
      let treatmentDone = '';
      let status: 'in_progress' | 'treated' | 'monitoring' = 'in_progress';
      let toastMessage = '';

      if (conditionKey === 'caries') {
        conditionType = 'تسوس';
        treatmentDone = '';
        status = 'in_progress';
        toastMessage = `تم تسجيل تسوس على السن #${toothNumber}`;
      } else if (conditionKey === 'fracture') {
        conditionType = 'كسر';
        treatmentDone = '';
        status = 'in_progress';
        toastMessage = `تم تسجيل كسر في السن #${toothNumber}`;
      } else if (conditionKey === 'missing') {
        conditionType = 'مفقود';
        treatmentDone = 'مقلوع / مفقود';
        status = 'treated';
        toastMessage = `تم تسجيل فقدان السن #${toothNumber}`;
      } else if (conditionKey === 'filling') {
        conditionType = 'حشو / بلومباج';
        treatmentDone = 'بلومباج / حشوة مركبة';
        status = 'treated';
        toastMessage = `تم تسجيل بلومباج / حشو على السن #${toothNumber}`;
      } else if (conditionKey === 'ortho') {
        conditionType = 'تقويم الأسنان';
        treatmentDone = 'تقويم الأسنان / Braces';
        status = 'in_progress';
        toastMessage = `تم تسجيل تقويم الأسنان على السن #${toothNumber}`;
      }

      const todayStr = getClinicTodayStr();

      // Optimistic UI update: instantly apply visual marker to the selected tooth
      setLocalConditionsMap(prev => {
        const next = {
          ...prev,
          [toothNumber]: {
            conditionType,
            treatmentDone,
            status,
            date: todayStr,
          },
        };
        try {
          localStorage.setItem(storedKey, JSON.stringify(next));
        } catch {}
        return next;
      });

      // Synchronize with database
      const existingList = conditionsRef.current.filter(
        c => c.patientId === patient.id && c.toothNumber === toothNumber
      );
      if (existingList.length > 0) {
        const latest = existingList[existingList.length - 1];
        await onUpdateCondition(latest.id, {
          conditionType,
          treatmentDone,
          status,
        });
      } else {
        await onAddCondition({
          patientId: patient.id,
          toothNumber,
          conditionType,
          treatmentDone,
          status,
          recordedDate: todayStr,
        });
      }

      if (onShowToast) onShowToast(toastMessage);
    } catch (err: any) {
      if (onShowToast) onShowToast(`فشل حفظ حالة السن: ${err.message || ''}`);
    } finally {
      activeMutationsRef.current[toothNumber] = false;
    }
  }, [patient?.id, onAddCondition, onUpdateCondition, onDeleteCondition, onShowToast]);

  // Modals
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [condToothNumber, setCondToothNumber] = useState<number>(11);
  const [condType, setCondType] = useState('تسوس عميق');
  const [condTreatment, setCondTreatment] = useState('حشوة كمبوزيت ضوئية');
  const [condStatus, setCondStatus] = useState<'in_progress' | 'treated' | 'monitoring'>('in_progress');
  const [condCost, setCondCost] = useState<string>('');
  const [condNotes, setCondNotes] = useState('');
  const [isSavingCondition, setIsSavingCondition] = useState(false);

  // Quick Note Modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Edit Patient Modal
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(patient.fullName);
  const [editPhone, setEditPhone] = useState(patient.phone);
  const [editBirthDate, setEditBirthDate] = useState(patient.birthDate || '');
  const [editGender, setEditGender] = useState<'male' | 'female'>(patient.gender);
  const [editAddress, setEditAddress] = useState(patient.address || '');
  const [editAllergies, setEditAllergies] = useState(patient.allergies || '');
  const [editDiseaseCondition, setEditDiseaseCondition] = useState(patient.diseaseCondition || '');
  const [editMedications, setEditMedications] = useState(patient.medications || '');
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  // Medical Info Quick Edit Modal
  const [isMedicalEditOpen, setIsMedicalEditOpen] = useState(false);
  const [medAllergies, setMedAllergies] = useState(patient.allergies || '');
  const [medDisease, setMedDisease] = useState(patient.diseaseCondition || '');
  const [medMedications, setMedMedications] = useState(patient.medications || '');
  const [medGeneralNote, setMedGeneralNote] = useState(notes.length > 0 ? notes[notes.length - 1].noteText : 'تحتاج إلى متابعة دورية للأسنان الخلفية.');

  useEffect(() => {
    setEditFullName(patient.fullName);
    setEditPhone(patient.phone);
    setEditBirthDate(patient.birthDate || '');
    setEditGender(patient.gender);
    setEditAddress(patient.address || '');
    setEditAllergies(patient.allergies || '');
    setEditDiseaseCondition(patient.diseaseCondition || '');
    setEditMedications(patient.medications || '');
    setMedAllergies(patient.allergies || '');
    setMedDisease(patient.diseaseCondition || '');
    setMedMedications(patient.medications || '');
  }, [patient]);

  // Direct In-Dossier Appointment Booking Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [aptDate, setAptDate] = useState(getClinicTodayStr());
  const [aptTime, setAptTime] = useState('10:00');
  const [aptProcedure, setAptProcedure] = useState('فحص وتنظيف الأسنان');
  const [aptCost, setAptCost] = useState('');
  const [aptNotes, setAptNotes] = useState('');
  const [isSavingApt, setIsSavingApt] = useState(false);

  // Real Invoices State for this patient
  const [realInvoices, setRealInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState<boolean>(false);

  const fetchPatientInvoices = useCallback(async () => {
    if (!patient?.id) return;
    setIsLoadingInvoices(true);
    try {
      const invs = await clinicApi.getInvoices(patient.id);
      setRealInvoices(invs);
    } catch (err) {
      console.error('Failed to load patient invoices:', err);
    } finally {
      setIsLoadingInvoices(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    fetchPatientInvoices();
  }, [fetchPatientInvoices]);

  // Direct In-Dossier Invoice Creation Modal
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [invDescription, setInvDescription] = useState('كشف وعلاج أسنان');
  const [invTotalAmount, setInvTotalAmount] = useState('');
  const [invPaidAmount, setInvPaidAmount] = useState('');
  const [invPaymentMethod, setInvPaymentMethod] = useState<'cash' | 'baridimob' | 'check'>('cash');
  const [invDate, setInvDate] = useState(getClinicTodayStr());
  const [invNotes, setInvNotes] = useState('');
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  // Record Payment Modal State
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'baridimob' | 'check'>('cash');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Edit Invoice Modal State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editInvDate, setEditInvDate] = useState('');
  const [editInvDescription, setEditInvDescription] = useState('');
  const [editInvTotalAmount, setEditInvTotalAmount] = useState('');
  const [editInvPaidAmount, setEditInvPaidAmount] = useState('');
  const [editInvPaymentMethod, setEditInvPaymentMethod] = useState<'cash' | 'baridimob' | 'check'>('cash');
  const [editInvNotes, setEditInvNotes] = useState('');
  const [isUpdatingInvoice, setIsUpdatingInvoice] = useState(false);

  // Delete Invoice Confirmation Modal State
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Files
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState('صورة أشعة بانورامية (Panoramique)');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewFileIndex, setPreviewFileIndex] = useState<number>(-1);
  const previewFile = previewFileIndex >= 0 && previewFileIndex < files.length ? files[previewFileIndex] : null;

  // Before & After cases for this patient
  const [beforeAfterCases, setBeforeAfterCases] = useState<BeforeAfterCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isLoadingBeforeAfter, setIsLoadingBeforeAfter] = useState<boolean>(false);
  const [beforeAfterError, setBeforeAfterError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'profile') return;
    let isCancelled = false;

    const loadCases = async () => {
      setIsLoadingBeforeAfter(true);
      setBeforeAfterError(null);
      try {
        const data = await clinicApi.getBeforeAfterCases(patient.id);
        if (isCancelled) return;
        const sorted = [...data].sort((a, b) => {
          const dateA = a.procedureDate || '';
          const dateB = b.procedureDate || '';
          if (dateB !== dateA) {
            return dateB.localeCompare(dateA);
          }
          const createdA = a.createdAt || '';
          const createdB = b.createdAt || '';
          return createdB.localeCompare(createdA);
        });
        setBeforeAfterCases(sorted);
        if (sorted.length > 0) {
          setSelectedCaseId(prev => (prev && sorted.some(c => c.id === prev) ? prev : sorted[0].id));
        } else {
          setSelectedCaseId(null);
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to load before/after cases:', err);
        setBeforeAfterError('تعذر تحميل صور قبل وبعد');
      } finally {
        if (!isCancelled) {
          setIsLoadingBeforeAfter(false);
        }
      }
    };

    loadCases();

    return () => {
      isCancelled = true;
    };
  }, [patient.id, activeTab]);

  const activeBeforeAfterCase = useMemo(() => {
    if (beforeAfterCases.length === 0) return null;
    if (!selectedCaseId) return beforeAfterCases[0];
    return beforeAfterCases.find(c => c.id === selectedCaseId) || beforeAfterCases[0];
  }, [beforeAfterCases, selectedCaseId]);

  // Clinical Follow-Up (متابعة المريض السريرية)
  const [patientFollowUps, setPatientFollowUps] = useState<FollowUpRecord[]>([]);
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState<boolean>(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState<boolean>(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUpRecord | null>(null);
  const [showFollowUpHistory, setShowFollowUpHistory] = useState<boolean>(false);

  const loadPatientFollowUps = useCallback(async () => {
    if (!patient?.id) return;
    setIsLoadingFollowUps(true);
    try {
      const list = await clinicApi.getPatientFollowUps(patient.id);
      setPatientFollowUps(list || []);
    } catch (err) {
      console.error('Failed to load patient follow-ups:', err);
    } finally {
      setIsLoadingFollowUps(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    loadPatientFollowUps();
  }, [loadPatientFollowUps]);

  const activeFollowUp = useMemo(
    () => patientFollowUps.find(f => ['pending', 'due', 'overdue'].includes(f.status)) || null,
    [patientFollowUps]
  );

  const completedFollowUpsList = useMemo(
    () => patientFollowUps.filter(f => f.status === 'completed' || f.status === 'cancelled'),
    [patientFollowUps]
  );

  const handleCompleteFollowUp = async (recordId: string) => {
    try {
      await clinicApi.updateFollowUp(recordId, { status: 'completed' });
      if (onShowToast) onShowToast('تم تسجيل اكتمال متابعة المريض بنجاح');
      loadPatientFollowUps();
    } catch (err: any) {
      if (onShowToast) onShowToast(err.message || 'فشل تحديث حالة المتابعة');
    }
  };

  const handleCancelFollowUp = async (recordId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء هذه المتابعة؟')) return;
    try {
      await clinicApi.updateFollowUp(recordId, { status: 'cancelled' });
      if (onShowToast) onShowToast('تم إلغاء المتابعة');
      loadPatientFollowUps();
    } catch (err: any) {
      if (onShowToast) onShowToast(err.message || 'فشل إلغاء المتابعة');
    }
  };

  const calculateAge = (bDate: string) => {
    if (!bDate) return null;
    const birth = new Date(bDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  };

  const formatDateDZ = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatArabicLongDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const arabicMonths = [
      'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
      'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (mIdx >= 0 && mIdx < 12) {
        return `${day} ${arabicMonths[mIdx]} ${year}`;
      }
    }
    return formatDateDZ(dateStr);
  };

  const patientAge = calculateAge(patient.birthDate);
  const formattedBirth = patient.birthDate ? formatArabicLongDate(patient.birthDate) : '-';
  const fileNumber = patient.id.length < 6 ? patient.id.padStart(6, '0') : patient.id;

  const handleSelectTooth = (toothNumber: number) => {
    setSelectedTooth(toothNumber);
    setCondToothNumber(toothNumber);
  };

  const handleOpenDetailedModal = (toothNumber: number) => {
    setSelectedTooth(toothNumber);
    setCondToothNumber(toothNumber);
    const existing = conditions.filter(c => c.toothNumber === toothNumber);
    if (existing.length > 0) {
      const last = existing[existing.length - 1];
      setCondType(last.conditionType);
      setCondTreatment(last.treatmentDone || '');
      setCondStatus(last.status);
      setCondCost(last.cost ? String(last.cost) : '');
      setCondNotes(last.notes || '');
    } else {
      setCondType('تسوس عميق');
      setCondTreatment('حشوة كمبوزيت ضوئية');
      setCondStatus('in_progress');
      setCondCost('');
      setCondNotes('');
    }
    setIsConditionModalOpen(true);
  };

  const handleSaveCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCondition(true);
    try {
      const todayStr = getClinicTodayStr();
      const existing = conditionsRef.current.filter(
        c => c.patientId === patient.id && c.toothNumber === condToothNumber
      );
      const parsedCost = condCost.trim() !== '' ? parseFloat(condCost) : 0;
      const validCost = !isNaN(parsedCost) && parsedCost > 0 ? parsedCost : undefined;

      if (existing.length > 0) {
        const last = existing[existing.length - 1];
        await onUpdateCondition(last.id, {
          conditionType: condType,
          treatmentDone: condTreatment,
          status: condStatus,
          cost: validCost,
          notes: condNotes,
        });
      } else {
        await onAddCondition({
          patientId: patient.id,
          toothNumber: condToothNumber,
          conditionType: condType,
          treatmentDone: condTreatment,
          status: condStatus,
          cost: validCost,
          recordedDate: todayStr,
          notes: condNotes,
        });
      }

      // Auto-create/sync invoice linked to this tooth condition without duplicates
      if (validCost && validCost > 0) {
        const toothTag = `[cond-tooth-${condToothNumber}]`;
        const existingInv = realInvoices.find(inv =>
          (inv.notes && inv.notes.includes(toothTag)) ||
          (inv.description && inv.description.includes(`السن #${condToothNumber}`))
        );
        if (existingInv) {
          if (existingInv.totalAmount !== validCost) {
            try {
              await clinicApi.updateInvoice(existingInv.id, {
                totalAmount: validCost,
                description: `${condTreatment || condType} (السن #${condToothNumber})`,
              });
            } catch (e) {
              console.warn('Failed to sync condition invoice cost:', e);
            }
          }
        } else {
          try {
            await clinicApi.createInvoice({
              patientId: patient.id,
              date: todayStr,
              description: `${condTreatment || condType} (السن #${condToothNumber})`,
              totalAmount: validCost,
              paidAmount: condStatus === 'treated' ? validCost : 0,
              paymentMethod: 'cash',
              notes: `فاتورة مرتبطة بحالة السن #${condToothNumber} ${toothTag}`,
            });
          } catch (invErr) {
            console.error('Failed to create condition invoice:', invErr);
          }
        }
        await fetchPatientInvoices();
        if (onInvoicesUpdated) onInvoicesUpdated();
      }

      // Optimistic cache update in local state & localStorage
      const storedKey = `dental_conditions_${patient.id}`;
      setLocalConditionsMap(prev => {
        const next = {
          ...prev,
          [condToothNumber]: {
            conditionType: condType,
            treatmentDone: condTreatment,
            status: condStatus,
            date: todayStr,
          },
        };
        try {
          localStorage.setItem(storedKey, JSON.stringify(next));
        } catch {}
        return next;
      });

      setIsConditionModalOpen(false);
      if (onShowToast) onShowToast(`تم حفظ تشخيص السن #${condToothNumber}`);
    } catch (err: any) {
      if (onShowToast) onShowToast(err.message || 'فشل حفظ حالة السن.');
    } finally {
      setIsSavingCondition(false);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsSavingNote(true);
    try {
      await onAddNote(newNoteText.trim());
      setNewNoteText('');
      setIsNoteModalOpen(false);
      if (onShowToast) onShowToast('تمت إضافة الملاحظة السريرية بنجاح');
    } catch (err: any) {
      if (onShowToast) onShowToast(err.message || 'فشل إضافة الملاحظة السريرية.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSavePatientUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdatePatient) return;
    setIsSavingPatient(true);
    try {
      await onUpdatePatient(patient.id, {
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        birthDate: editBirthDate,
        gender: editGender,
        address: editAddress.trim(),
        allergies: editAllergies.trim(),
        diseaseCondition: editDiseaseCondition.trim(),
        medications: editMedications.trim(),
      });
      setIsEditPatientOpen(false);
      if (onShowToast) onShowToast('تم تحديث بيانات المريض بنجاح');
    } catch (err: any) {
      alert(err.message || 'فشل تحديث بيانات المريض.');
    } finally {
      setIsSavingPatient(false);
    }
  };

  const handleSaveMedicalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (onUpdatePatient) {
        await onUpdatePatient(patient.id, {
          allergies: medAllergies.trim(),
          diseaseCondition: medDisease.trim(),
          medications: medMedications.trim(),
        });
      }
      if (medGeneralNote.trim() && (!notes.length || notes[notes.length - 1].noteText !== medGeneralNote.trim())) {
        await onAddNote(medGeneralNote.trim());
      }
      setIsMedicalEditOpen(false);
      if (onShowToast) onShowToast('تم تحديث المعلومات الطبية بنجاح');
    } catch (err: any) {
      alert(err.message || 'فشل حفظ المعلومات الطبية.');
    }
  };

  const handleSaveDirectAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingApt(true);
    try {
      if (onAddAppointment) {
        await onAddAppointment({
          patientId: patient.id,
          appointmentDate: aptDate,
          appointmentTime: aptTime,
          procedure: aptProcedure.trim() || 'فحص عام',
          cost: aptCost ? parseFloat(aptCost) : undefined,
          status: 'scheduled',
          notes: aptNotes.trim(),
        });
      } else if (onBookAppointment) {
        onBookAppointment(patient.id);
      }
      setIsBookModalOpen(false);
      setAptNotes('');
      if (onShowToast) onShowToast('تم حجز الموعد بنجاح');
    } catch (err: any) {
      alert(err.message || 'فشل حجز الموعد.');
    } finally {
      setIsSavingApt(false);
    }
  };

  const handleOpenAddInvoice = () => {
    setInvDescription('كشف وعلاج أسنان');
    setInvTotalAmount('');
    setInvPaidAmount('');
    setInvPaymentMethod('cash');
    setInvDate(getClinicTodayStr());
    setInvNotes('');
    setIsAddInvoiceOpen(true);
  };

  const handleSaveDirectInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalVal = parseFloat(invTotalAmount);
    if (isNaN(totalVal) || totalVal <= 0) {
      alert('يرجى إدخال مبلغ الفاتورة بشكل صحيح (إلزامي).');
      return;
    }
    const paidVal = invPaidAmount.trim() === '' ? totalVal : parseFloat(invPaidAmount);
    const validPaid = isNaN(paidVal) ? 0 : Math.max(0, Math.min(paidVal, totalVal));

    setIsSavingInvoice(true);
    try {
      await clinicApi.createInvoice({
        patientId: patient.id,
        date: invDate || getClinicTodayStr(),
        description: invDescription.trim() || 'كشف وعلاج أسنان',
        totalAmount: totalVal,
        paidAmount: validPaid,
        paymentMethod: invPaymentMethod,
        notes: invNotes.trim() || undefined,
      });
      setIsAddInvoiceOpen(false);
      setInvTotalAmount('');
      setInvPaidAmount('');
      setInvNotes('');
      await fetchPatientInvoices();
      if (onInvoicesUpdated) onInvoicesUpdated();
      if (onShowToast) onShowToast(`تم تسجيل الفاتورة بنجاح بقيمة ${totalVal.toLocaleString('ar-DZ')} د.ج`);
    } catch (err: any) {
      alert(err.message || 'فشل تسجيل الفاتورة.');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleOpenPaymentModal = (invoice: Invoice) => {
    setPayingInvoice(invoice);
    setPayAmount(invoice.remainingAmount > 0 ? String(invoice.remainingAmount) : '');
    setPayMethod(invoice.paymentMethod || 'cash');
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    const amountVal = parseFloat(payAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('يرجى إدخال مبلغ صحيح للدفعة.');
      return;
    }
    if (amountVal > payingInvoice.remainingAmount) {
      alert(`المبلغ المدخل (${amountVal} د.ج) يتجاوز المتبقي (${payingInvoice.remainingAmount} د.ج).`);
      return;
    }
    setIsSavingPayment(true);
    try {
      await clinicApi.recordInvoicePayment(payingInvoice.id, amountVal, payMethod);
      setPayingInvoice(null);
      setPayAmount('');
      await fetchPatientInvoices();
      if (onInvoicesUpdated) onInvoicesUpdated();
      if (onShowToast) onShowToast(`تم تسجيل دفعة بقيمة ${amountVal.toLocaleString('ar-DZ')} د.ج بنجاح`);
    } catch (err: any) {
      alert(err.message || 'فشل تسجيل الدفعة.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleOpenDeleteInvoiceModal = (inv: Invoice) => {
    setInvoiceToDelete(inv);
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setIsDeletingInvoice(true);
    try {
      await clinicApi.deleteInvoice(invoiceToDelete.id);
      setInvoiceToDelete(null);
      await fetchPatientInvoices();
      if (onInvoicesUpdated) onInvoicesUpdated();
      if (onShowToast) onShowToast('تم حذف الفاتورة وتحديث الحسابات المالية بنجاح');
    } catch (err: any) {
      alert(err.message || 'فشل حذف الفاتورة.');
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditInvDate(inv.date || getClinicTodayStr());
    setEditInvDescription(inv.description || '');
    setEditInvTotalAmount(String(inv.totalAmount || ''));
    setEditInvPaidAmount(String(inv.paidAmount || '0'));
    setEditInvPaymentMethod(inv.paymentMethod || 'cash');
    setEditInvNotes(inv.notes || '');
  };

  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    const totalVal = parseFloat(editInvTotalAmount);
    if (isNaN(totalVal) || totalVal <= 0) {
      alert('يرجى إدخال المبلغ الكلي بشكل صحيح.');
      return;
    }
    const paidVal = parseFloat(editInvPaidAmount);
    const validPaid = isNaN(paidVal) ? 0 : Math.max(0, Math.min(paidVal, totalVal));
    setIsUpdatingInvoice(true);
    try {
      await clinicApi.updateInvoice(editingInvoice.id, {
        date: editInvDate || getClinicTodayStr(),
        description: editInvDescription.trim() || 'فاتورة علاج',
        totalAmount: totalVal,
        paidAmount: validPaid,
        paymentMethod: editInvPaymentMethod,
        notes: editInvNotes.trim() || undefined,
      });
      setEditingInvoice(null);
      await fetchPatientInvoices();
      if (onInvoicesUpdated) onInvoicesUpdated();
      if (onShowToast) onShowToast('تم تحديث الفاتورة بنجاح');
    } catch (err: any) {
      alert(err.message || 'فشل تحديث الفاتورة.');
    } finally {
      setIsUpdatingInvoice(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        await onUploadFile(fileList[i], selectedCategory);
      }
      e.target.value = '';
      if (onShowToast) onShowToast('تم رفع الملف بنجاح');
    } catch (err: any) {
      setUploadError(err.message || 'فشل رفع الملف.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveDossierLocally = async () => {
    setIsSavingLocal(true);
    try {
      await localPatientStorageService.savePatientFileLocally(
        patient,
        conditions,
        notes,
        appointments,
        files,
        settings
      );
      if (onShowToast) {
        onShowToast(`تم تنزيل وتخزين ملف المريض "${patient.fullName}" محلياً على جهازك بنجاح.`);
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(`خطأ في الحفظ المحلي: ${err.message}`);
      }
    } finally {
      setIsSavingLocal(false);
    }
  };

  // Helper for teeth condition in anatomical and schematic chart
  const getToothConditionInfo = (toothNumber: number) => {
    let match: DentalCondition | undefined;

    // 1. Fast reactive lookup from localConditionsMap (instant UI & no synchronous JSON.parse lag)
    const localEntry = localConditionsMap[toothNumber];
    if (localEntry) {
      match = {
        id: `local-${toothNumber}`,
        patientId: patient.id,
        toothNumber,
        conditionType: localEntry.conditionType,
        treatmentDone: localEntry.treatmentDone,
        status: localEntry.status || 'in_progress',
        recordedDate: localEntry.date || getClinicTodayStr(),
        createdAt: localEntry.date || new Date().toISOString(),
      };
    } else {
      // 2. Fallback to authoritative patient conditions prop
      const patientConds = conditions.filter(c => c.patientId === patient.id && c.toothNumber === toothNumber);
      if (patientConds.length > 0) {
        match = patientConds[patientConds.length - 1];
      }
    }

    if (!match) return { status: 'normal' as const, label: 'سليم / طبيعي', condition: undefined };
    const type = (match.conditionType || '').toLowerCase();
    const treatment = (match.treatmentDone || '').toLowerCase();

    if (type.includes('مفقود') || type.includes('خلع') || type.includes('قلع') || type.includes('missing')) {
      return { status: 'missing' as const, label: 'سن مفقود / مقلوع', condition: match };
    }
    if (type.includes('كسر') || type.includes('fracture') || type.includes('مكسور')) {
      return { status: 'fracture' as const, label: 'كسر في السن', condition: match };
    }
    if (
      type.includes('تقويم') ||
      type.includes('ortho') ||
      treatment.includes('تقويم') ||
      treatment.includes('ortho')
    ) {
      return { status: 'ortho' as const, label: 'تقويم الأسنان (Ortho)', condition: match };
    }
    if (
      type.includes('حشو') ||
      type.includes('بلومباج') ||
      type.includes('plombage') ||
      type.includes('filling') ||
      type.includes('ترميم') ||
      match.status === 'treated' ||
      treatment.includes('حشو') ||
      treatment.includes('بلومباج')
    ) {
      return { status: 'filling' as const, label: 'بلومباج / حشو منجز', condition: match };
    }
    if (type.includes('تسوس') || type.includes('caries') || type.includes('نخر')) {
      return { status: 'caries' as const, label: 'تسوس مسجل', condition: match };
    }
    return { status: 'caries' as const, label: match.conditionType || 'حالة مسجلة', condition: match };
  };

  const getToothStatus = (toothNumber: number) => {
    return getToothConditionInfo(toothNumber).status;
  };

  // Teeth numbers in FDI order matching reference image
  const upperTeethRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperTeethLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeethRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerTeethLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  // FDI tooth names in Arabic for medical accuracy & tooltips
  const TOOTH_NAMES_AR: Record<number, string> = {
    18: 'الضرس الثالث العلوي الأيمن (ضرس العقل)',
    17: 'الضرس الثاني العلوي الأيمن',
    16: 'الضرس الأول العلوي الأيمن',
    15: 'الضاحك الثاني العلوي الأيمن',
    14: 'الضاحك الأول العلوي الأيمن',
    13: 'الناب العلوي الأيمن',
    12: 'القاطع الجانبي العلوي الأيمن',
    11: 'القاطع المركزي العلوي الأيمن',
    21: 'القاطع المركزي العلوي الأيسر',
    22: 'القاطع الجانبي العلوي الأيسر',
    23: 'الناب العلوي الأيسر',
    24: 'الضاحك الأول العلوي الأيسر',
    25: 'الضاحك الثاني العلوي الأيسر',
    26: 'الضرس الأول العلوي الأيسر',
    27: 'الضرس الثاني العلوي الأيسر',
    28: 'الضرس الثالث العلوي الأيسر (ضرس العقل)',

    48: 'الضرس الثالث السفلي الأيمن (ضرس العقل)',
    47: 'الضرس الثاني السفلي الأيمن',
    46: 'الضرس الأول السفلي الأيمن',
    45: 'الضاحك الثاني السفلي الأيمن',
    44: 'الضاحك الأول السفلي الأيمن',
    43: 'الناب السفلي الأيمن',
    42: 'القاطع الجانبي السفلي الأيمن',
    41: 'القاطع المركزي السفلي الأيمن',
    31: 'القاطع المركزي السفلي الأيسر',
    32: 'القاطع الجانبي السفلي الأيسر',
    33: 'الناب السفلي الأيسر',
    34: 'الضاحك الأول السفلي الأيسر',
    35: 'الضاحك الثاني السفلي الأيسر',
    36: 'الضرس الأول السفلي الأيسر',
    37: 'الضرس الثاني السفلي الأيسر',
    38: 'الضرس الثالث السفلي الأيسر (ضرس العقل)',
  };

  // Render realistic anatomical tooth with dedicated visual markers for Caries, Fracture, Missing, and Filling (Plombage)
  const renderToothItem = (toothNumber: number, isUpper: boolean) => {
    const toothInfo = getToothConditionInfo(toothNumber);
    const { status, label: statusLabel } = toothInfo;
    const isSelected = selectedTooth === toothNumber;
    const toothName = TOOTH_NAMES_AR[toothNumber] || `السن #${toothNumber}`;

    let overlayClass = '';
    let visualBadge = null;
    let toothEffect = null;
    let numberColor = 'text-[#1e3a8a]';
    let toothImageStyle: React.CSSProperties = {};

    if (status === 'caries') {
      overlayClass = 'bg-neutral-900/10 ring-2 ring-neutral-900 ring-offset-1 rounded-md';
      numberColor = 'text-neutral-950 font-black';
      visualBadge = (
        <span
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-black border border-white shadow-xs z-20 flex items-center justify-center animate-in fade-in"
          title="تسوس - بقعة سوداء داكنة (Caries)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 border border-neutral-400" />
        </span>
      );
      toothEffect = (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {/* بقعة سوداء داكنة في منتصف السن أو الضرس تماماً */}
          <div
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-black shadow-md border border-neutral-950 flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #111111 50%, #000000 100%)',
              boxShadow: '0 0 3px 1px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,255,255,0.2)',
            }}
          >
            <span className="w-1 h-1 rounded-full bg-neutral-950 opacity-90" />
          </div>
        </div>
      );
    } else if (status === 'fracture') {
      overlayClass = 'ring-2 ring-amber-600/70 ring-offset-1 rounded-md';
      numberColor = 'text-amber-800 font-black';
      // Real anatomical tooth fracture clipping (تاج مكسور حقيقةً)
      toothImageStyle = {
        clipPath: isUpper
          ? 'polygon(0% 0%, 100% 0%, 100% 60%, 78% 68%, 54% 54%, 32% 68%, 0% 48%)'
          : 'polygon(0% 52%, 32% 32%, 54% 46%, 78% 32%, 100% 40%, 100% 100%, 0% 100%)',
      };
      visualBadge = (
        <span
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-md bg-amber-600 border border-white shadow-xs z-20 flex items-center justify-center text-[9px] font-black text-white animate-in fade-in"
          title="سن مكسور حقيقةً (Fracture)"
        >
          ⚡
        </span>
      );
      toothEffect = (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* حافة الكسر المسننة وخط الكسر الحقيقي مع أثر الجزء المكسور */}
          <svg
            className="w-full h-full absolute inset-0 overflow-visible pointer-events-none"
            viewBox="0 0 50 100"
            preserveAspectRatio="none"
          >
            {isUpper ? (
              <>
                <path
                  d="M 0,48 L 16,68 L 27,54 L 39,68 L 50,60"
                  fill="none"
                  stroke="#451a03"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 0,48 L 16,68 L 27,54 L 39,68 L 50,60"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 27,54 L 23,38 L 26,24"
                  fill="none"
                  stroke="#78350f"
                  strokeWidth="0.9"
                  strokeDasharray="2,1.5"
                />
                <path
                  d="M 0,51 L 16,71 L 27,57 L 39,71 L 50,63 L 50,96 C 40,98 10,98 0,96 Z"
                  fill="rgba(245, 158, 11, 0.08)"
                  stroke="#b45309"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />
              </>
            ) : (
              <>
                <path
                  d="M 0,52 L 16,32 L 27,46 L 39,32 L 50,40"
                  fill="none"
                  stroke="#451a03"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 0,52 L 16,32 L 27,46 L 39,32 L 50,40"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 27,46 L 24,62 L 26,76"
                  fill="none"
                  stroke="#78350f"
                  strokeWidth="0.9"
                  strokeDasharray="2,1.5"
                />
                <path
                  d="M 0,49 L 16,29 L 27,43 L 39,29 L 50,37 L 50,4 C 40,2 10,2 0,4 Z"
                  fill="rgba(245, 158, 11, 0.08)"
                  stroke="#b45309"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />
              </>
            )}
          </svg>
        </div>
      );
    } else if (status === 'missing') {
      overlayClass = 'opacity-30 grayscale ring-1 ring-slate-400 rounded-md';
      numberColor = 'text-slate-400';
      visualBadge = (
        <span
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-slate-700 border border-white shadow-xs z-10 flex items-center justify-center text-[9px] font-black text-white"
          title="مفقود (Missing)"
        >
          ✕
        </span>
      );
      toothEffect = (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-base sm:text-lg font-black text-slate-800 drop-shadow-sm select-none">✕</span>
        </div>
      );
    } else if (status === 'filling') {
      // السن أو الضرس كاملاً باللون الأخضر الفاتح بناءً على طلب الطبيب
      toothImageStyle = {
        filter: 'sepia(1) saturate(5.5) hue-rotate(80deg) brightness(1.22)',
      };
      overlayClass = 'bg-emerald-400/25 ring-2 ring-emerald-400 ring-offset-1 rounded-md shadow-xs';
      numberColor = 'text-emerald-700 font-black';
      visualBadge = (
        <span
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white shadow-xs z-10 flex items-center justify-center text-[9px] font-black text-white"
          title="بلومباج / حشو (أخضر فاتح)"
        >
          ●
        </span>
      );
      toothEffect = (
        <div
          className="absolute inset-0 rounded-md pointer-events-none mix-blend-color z-10"
          style={{
            backgroundColor: 'rgba(74, 222, 128, 0.45)',
          }}
        />
      );
    } else if (status === 'ortho') {
      overlayClass = 'bg-indigo-500/15 ring-2 ring-indigo-500 ring-offset-1 rounded-md shadow-xs';
      numberColor = 'text-indigo-700 font-black';
      visualBadge = (
        <span
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 border border-white shadow-xs z-20 flex items-center justify-center text-[9px] font-black text-white"
          title="تقويم الأسنان (Orthodontics / Braces)"
        >
          ⚙
        </span>
      );
      toothEffect = (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-full flex items-center justify-center">
            <div className="w-full h-[1.5px] bg-slate-400 shadow-xs" />
            <div
              className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-[2px] bg-gradient-to-br from-indigo-100 via-slate-200 to-indigo-600 border border-indigo-700 shadow-xs flex items-center justify-center"
              style={{ boxShadow: '0 0 2px rgba(79, 70, 229, 0.6)' }}
            >
              <div className="w-1 h-1 rounded-[1px] bg-indigo-600" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <button
        key={toothNumber}
        type="button"
        onClick={() => {
          setSelectedTooth(toothNumber);
          setCondToothNumber(toothNumber);
        }}
        className={`group relative flex flex-col items-center cursor-pointer transition-all duration-150 hover:scale-110 shrink-0 select-none ${
          isSelected ? 'scale-105 z-20' : ''
        }`}
        title={`السن #${toothNumber} (${toothName}) - الحالة: ${statusLabel}\nانقر لتحديده وتطبيق حالته من القائمة الجانبية`}
      >
        {/* Upper number label + blue pointer line */}
        {isUpper && (
          <div className="flex flex-col items-center mb-0.5 select-none">
            <span
              className={`text-[9px] sm:text-[10px] md:text-[11px] font-mono font-bold transition-colors ${
                isSelected ? 'text-blue-600 font-black underline' : numberColor
              }`}
            >
              {toothNumber}
            </span>
            <div
              className={`w-[1px] sm:w-[1.5px] h-2 sm:h-3 transition-colors ${
                isSelected ? 'bg-blue-600 font-black' : 'bg-[#3b82f6]/70 group-hover:bg-blue-600'
              }`}
            />
          </div>
        )}

        {/* Realistic Tooth Graphic from User Reference Image */}
        <div
          className={`relative w-[18px] xs:w-[20px] sm:w-[24px] md:w-[27px] lg:w-[28px] xl:w-[31px] aspect-[50/98] flex items-center justify-center rounded-md transition-all ${overlayClass} ${
            isSelected
              ? 'ring-2 ring-blue-600 ring-offset-2 bg-blue-50/70 shadow-md'
              : 'hover:drop-shadow-md'
          }`}
        >
          <img
            src={`/assets/dental/teeth/tooth-${toothNumber}.png`}
            alt={`السن ${toothNumber}`}
            style={toothImageStyle}
            className="w-full h-full object-contain pointer-events-none select-none transition-transform"
            loading="lazy"
          />

          {visualBadge}
          {toothEffect}
        </div>

        {/* Lower number label + blue pointer line */}
        {!isUpper && (
          <div className="flex flex-col items-center mt-0.5 select-none">
            <div
              className={`w-[1px] sm:w-[1.5px] h-2 sm:h-3 transition-colors ${
                isSelected ? 'bg-blue-600 font-black' : 'bg-[#3b82f6]/70 group-hover:bg-blue-600'
              }`}
            />
            <span
              className={`text-[9px] sm:text-[10px] md:text-[11px] font-mono font-bold transition-colors ${
                isSelected ? 'text-blue-600 font-black underline' : numberColor
              }`}
            >
              {toothNumber}
            </span>
          </div>
        )}
      </button>
    );
  };

  // Appointments for the middle table
  const displayAppointments = appointments.length > 0
    ? appointments
    : [
        {
          id: 'apt-sample-1',
          patientId: patient.id,
          appointmentDate: '2025-10-20',
          appointmentTime: '10:00',
          procedure: 'فحص وتنظيف الأسنان',
          status: 'completed' as const,
          createdAt: '2025-10-20',
        },
        {
          id: 'apt-sample-2',
          patientId: patient.id,
          appointmentDate: '2025-08-03',
          appointmentTime: '11:30',
          procedure: 'علاج تسوس',
          status: 'completed' as const,
          createdAt: '2025-08-03',
        },
        {
          id: 'apt-sample-3',
          patientId: patient.id,
          appointmentDate: '2025-05-12',
          appointmentTime: '14:00',
          procedure: 'تركيب حشوة',
          status: 'completed' as const,
          createdAt: '2025-05-12',
        },
        {
          id: 'apt-sample-4',
          patientId: patient.id,
          appointmentDate: '2025-02-17',
          appointmentTime: '09:00',
          procedure: 'فحص دوري',
          status: 'completed' as const,
          createdAt: '2025-02-17',
        },
      ];

  // Financial totals calculated directly from real invoices
  const totalInvoiced = realInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const totalPaid = realInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const totalRemaining = realInvoices.reduce(
    (sum, i) => sum + (typeof i.remainingAmount === 'number' ? i.remainingAmount : Math.max(0, (i.totalAmount || 0) - (i.paidAmount || 0))),
    0
  );

  const formatPaymentMethod = (method?: string) => {
    if (method === 'baridimob') return 'بريدي موب';
    if (method === 'check') return 'صك بنكي';
    return 'نقد';
  };

  const renderInvoiceStatusBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ed] text-[#059669]">
          مدفوعة
        </span>
      );
    }
    if (status === 'partial') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef3c7] text-[#d97706]">
          دفع جزئي
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600">
        غير مدفوعة
      </span>
    );
  };

  // Treatments for the right column - derived from current patient's recorded conditions
  const displayTreatments = conditions.filter(c => c.patientId === patient.id).slice(0, 4);

  return (
    <div
      className={
        isDossierFullscreen
          ? 'fixed inset-0 z-50 bg-[#f4f7fb] flex flex-col overflow-hidden animate-in fade-in duration-150 text-slate-800'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 overflow-y-auto text-slate-800'
      }
    >
      <div
        className={
          isDossierFullscreen
            ? 'flex-1 flex flex-col overflow-hidden w-full h-full bg-[#f4f7fb]'
            : 'bg-[#f4f7fb] rounded-2xl shadow-2xl border border-slate-200 max-w-7xl w-full max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200'
        }
      >
        {/* TOP HEADER: Breadcrumbs & Patient Quick Profile (Matching Screenshot) */}
        <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
          {/* Right side: Breadcrumbs + Patient Identity */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsEditPatientOpen(true)}
              className="cursor-pointer hover:opacity-90 transition-opacity"
              title="انقر لتعديل بيانات المريض أو الصورة"
            >
              <PatientAvatar gender={patient.gender} size="sm" />
            </button>
            <div>
              {/* Breadcrumb with functional navigation */}
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="hover:text-blue-600 transition-colors cursor-pointer"
                  title="العودة لقائمة ملفات المرضى"
                >
                  ملفات المرضى
                </button>
                <span>‹</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="text-slate-700 font-semibold hover:text-blue-600 cursor-pointer"
                  title="الصفحة الرئيسية لملف المريض"
                >
                  ملف المريض
                </button>
              </div>
              {/* Name & Active Badge */}
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1
                  onClick={() => setIsEditPatientOpen(true)}
                  className="text-base sm:text-lg font-black font-heading text-slate-900 tracking-tight hover:text-blue-600 cursor-pointer transition-colors"
                  title="انقر لتعديل بيانات المريض"
                >
                  {patient.fullName}
                </h1>
                <span className="bg-[#e6f9ed] text-[#059669] border border-[#a7f3d0] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  نشط
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  رقم الملف: {fileNumber}
                </span>
                {activeFollowUp && (
                  <span
                    onClick={() => {
                      setEditingFollowUp(activeFollowUp);
                      setIsFollowUpModalOpen(true);
                    }}
                    className={`cursor-pointer text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border transition-colors ${
                      activeFollowUp.status === 'overdue'
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        : activeFollowUp.status === 'due'
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                    }`}
                    title="انقر لتعديل بيانات متابعة المريض"
                  >
                    <Clock className="w-3 h-3" />
                    <span>متابعة: {activeFollowUp.reason}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Left side: Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDossierLocally}
              disabled={isSavingLocal}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="تصدير وتنزيل ملف المريض كاملاً بصيغة JSON وتقرير HTML محلياً"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{isSavingLocal ? 'جارٍ الحفظ...' : 'تصدير محلي'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDossierFullscreen(prev => !prev)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title={isDossierFullscreen ? 'تصغير العرض (نافذة منبثقة)' : 'ملء الشاشة كاملة'}
            >
              {isDossierFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="إغلاق ملف المريض"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* HORIZONTAL TAB NAVIGATION BAR (Matching Screenshot) */}
        <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto shrink-0 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>الملف الشخصي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('medical')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'medical'
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>السجل الطبي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teeth')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'teeth' || activeTab === 'jaw-chart'
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Smile className="w-4 h-4" />
            <span>سجل الأسنان</span>
            {conditions.length > 0 && (
              <span className="bg-blue-100 text-[#2563eb] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {conditions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'appointments'
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>الزيارات</span>
            {appointments.length > 0 && (
              <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {appointments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('treatments')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'treatments'
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>العلاجات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'files'
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>الأشعة والصور</span>
            {files.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {files.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'invoices'
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>الفواتير</span>
          </button>
        </nav>

        {/* MAIN BODY AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-[#f4f7fb]">
          {/* ============================================================== */}
          {/* TAB: PROFILE (EXACT 3-COLUMN DASHBOARD AS IN USER SCREENSHOT) */}
          {/* ============================================================== */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* ------------------------------------------------------------ */}
              {/* COLUMN 1 (LEFT in RTL): Patient Profile Card & Action Buttons */}
              {/* ------------------------------------------------------------ */}
              <div className="lg:col-span-3 space-y-4">
                {/* Patient Information Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
                  {/* Card Header with Edit Icon Button */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-slate-900 font-heading">
                      معلومات المريض
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsEditPatientOpen(true)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      title="تعديل بيانات المريض"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Centered Avatar (Clickable to edit) */}
                  <div
                    onClick={() => setIsEditPatientOpen(true)}
                    className="flex flex-col items-center text-center cursor-pointer group"
                    title="انقر لتعديل بيانات المريض"
                  >
                    <div className="group-hover:scale-105 transition-transform">
                      <PatientAvatar gender={patient.gender} size="lg" />
                    </div>
                    <h3 className="text-base font-black font-heading text-slate-900 mt-3 group-hover:text-blue-600 transition-colors">
                      {patient.fullName}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1.5 rounded-full bg-[#f0f4ff] text-[#2563eb] border border-[#dbeafe] text-xs font-bold font-heading">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{patientAge !== null ? `${patientAge} سنة` : 'العمر غير مسجل'}</span>
                    </div>
                  </div>

                  {/* Detailed Information List */}
                  <div className="mt-5 space-y-3 text-xs border-t border-slate-100 pt-4 text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <a href={`tel:${patient.phone}`} className="font-mono font-medium text-slate-800 hover:text-blue-600">
                        {patient.phone}
                      </a>
                      <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className={patient.address?.trim() ? "text-slate-800 font-medium" : "text-slate-400"}>
                        {patient.address?.trim() ? patient.address.trim() : 'غير محدد'}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-800">
                        تاريخ الميلاد: <strong className="font-medium font-sans">{formattedBirth}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                    </div>
                  </div>

                  {/* Primary Edit Button (Solid Blue) */}
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => setIsEditPatientOpen(true)}
                      className="w-full py-2.5 px-4 bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل البيانات</span>
                    </button>
                  </div>
                </div>

                {/* Quick Action Buttons Card (Mint, Purple, Sky Blue) */}
                <div className="space-y-2.5">
                  {/* Button 1: حجز موعد جديد (Direct in-dossier modal) */}
                  <button
                    type="button"
                    onClick={() => setIsBookModalOpen(true)}
                    className="w-full py-3 px-4 bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] rounded-xl flex items-center justify-between font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#16a34a]" />
                      <span>حجز موعد جديد</span>
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  </button>

                  {/* Button 2: إضافة ملاحظة (Direct in-dossier modal) */}
                  <button
                    type="button"
                    onClick={() => setIsNoteModalOpen(true)}
                    className="w-full py-3 px-4 bg-[#faf5ff] hover:bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff] rounded-xl flex items-center justify-between font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#9333ea]" />
                      <span>إضافة ملاحظة</span>
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
                  </button>

                  {/* Button 3: تحميل ملف (Direct file dialog) */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] rounded-xl flex items-center justify-between font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#2563eb]" />
                      <span>تحميل ملف</span>
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Clinical Follow-Up Card (بطاقة متابعة المريض) */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs font-bold text-slate-900 font-heading">
                        متابعة المريض السريرية
                      </h3>
                    </div>
                    {activeFollowUp ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        activeFollowUp.status === 'overdue'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : activeFollowUp.status === 'due'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {activeFollowUp.status === 'overdue'
                          ? 'متأخر عن المتابعة'
                          : activeFollowUp.status === 'due'
                          ? 'حان موعد المتابعة'
                          : 'قيد المتابعة'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        غير مدرج
                      </span>
                    )}
                  </div>

                  {activeFollowUp ? (
                    <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">سبب المتابعة:</div>
                        <div className="font-bold text-slate-800 mt-0.5">{activeFollowUp.reason}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">الإجراء القادم:</div>
                        <div className="font-semibold text-blue-700 mt-0.5">{activeFollowUp.nextProcedure}</div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">تاريخ المتابعة:</span>
                        <span className="font-bold font-mono text-slate-800">
                          {activeFollowUp.targetDate ? formatDateDZ(activeFollowUp.targetDate) : 'غير محدد'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">الأولوية:</span>
                        <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                          activeFollowUp.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : activeFollowUp.priority === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {activeFollowUp.priority === 'urgent' ? 'مستعجلة' : activeFollowUp.priority === 'high' ? 'مهمة' : 'عادية'}
                        </span>
                      </div>

                      {activeFollowUp.notes && (
                        <div className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60">
                          {activeFollowUp.notes}
                        </div>
                      )}

                      {/* Follow-up Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => handleCompleteFollowUp(activeFollowUp.id)}
                          className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="تسجيل إتمام المتابعة السريرية"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تمت المتابعة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFollowUp(activeFollowUp);
                            setIsFollowUpModalOpen(true);
                          }}
                          className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          title="تعديل بيانات وتاريخ المتابعة"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>تعديل</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelFollowUp(activeFollowUp.id)}
                        className="w-full text-center text-[11px] text-slate-400 hover:text-rose-600 pt-1 cursor-pointer transition-colors"
                      >
                        إلغاء المتابعة الحالية
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2 space-y-2">
                      <p className="text-[11px] text-slate-500">
                        لم يتم تسجيل هذا المريض للمتابعة السريرية المقررة بعد.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFollowUp(null);
                          setIsFollowUpModalOpen(true);
                        }}
                        className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-blue-600" />
                        <span>+ إضافة مريض للمتابعة</span>
                      </button>
                    </div>
                  )}

                  {/* Completed / Past followups collapsible history */}
                  {completedFollowUpsList.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowFollowUpHistory(prev => !prev)}
                        className="w-full text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span>سجل المتابعات المكتملة ({completedFollowUpsList.length})</span>
                        </span>
                        <span>{showFollowUpHistory ? '▲' : '▼'}</span>
                      </button>

                      {showFollowUpHistory && (
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                          {completedFollowUpsList.map(rec => (
                            <div key={rec.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-[10px]">
                              <div className="flex items-center justify-between font-bold text-slate-700">
                                <span>{rec.reason}</span>
                                <span className={rec.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}>
                                  {rec.status === 'completed' ? '✓ مكتملة' : 'ملغاة'}
                                </span>
                              </div>
                              <div className="text-slate-500 mt-0.5">{rec.nextProcedure}</div>
                              {rec.completedAt && (
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                  أنجزت: {new Date(rec.completedAt).toLocaleDateString('ar-DZ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* COLUMN 2 (CENTER in RTL): Dental Chart, Visits & Invoices   */}
              {/* ------------------------------------------------------------ */}
              <div className="lg:col-span-6 space-y-4">
                {/* 1. Dental Chart (خريطة الاسنان) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
                  {/* Header and Legend */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 font-heading">
                        خريطة الأسنان
                      </h2>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('teeth')}
                        className="text-[11px] font-bold text-[#2563eb] hover:underline flex items-center gap-1 cursor-pointer"
                        title="الانتقال إلى سجل الأسنان التفصيلي"
                      >
                        <Smile className="w-3.5 h-3.5" />
                        <span>سجل الأسنان</span>
                      </button>
                    </div>

                    {/* Legend & Healthy Status */}
                    <div className="flex items-center gap-2.5 text-[11px] text-slate-600 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-black inline-block border border-neutral-700 shadow-2xs" />
                        <span className="font-bold text-neutral-900">تسوس</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-amber-600 inline-flex items-center justify-center text-[8px] text-white font-bold border border-amber-700">⚡</span>
                        <span>كسر</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block border border-emerald-600 shadow-2xs" />
                        <span className="font-semibold text-emerald-800">بلومباج (أخضر فاتح)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-slate-200 inline-flex items-center justify-center text-[9px] font-bold text-slate-500">
                          ✕
                        </span>
                        <span>مفقود</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-emerald-600 shadow-2xs" />
                        <span className="font-semibold text-emerald-700">سليم</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetAllTeethToHealthy}
                        className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="إعادة ضبط جميع أسنان المريض لتكون سليمة وطبيعية"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>كافة الأسنان سليمة</span>
                      </button>
                    </div>
                  </div>

                  {/* Dental Arch Graphic matching User Reference Image - Upper & Lower Jaws close together */}
                  <div className="py-2 sm:py-3">
                    <div className="bg-gradient-to-b from-slate-50/90 via-blue-50/15 to-slate-50/90 rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs">
                      {/* Compact Header with Jaw Indicators */}
                      <div className="flex items-center justify-between mb-2.5 px-1 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs" />
                            <span className="font-bold text-slate-800 font-heading text-[11px] sm:text-xs">
                              الفك العلوي (18 - 28)
                            </span>
                          </div>
                          <span className="text-slate-300">|</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-xs" />
                            <span className="font-bold text-slate-800 font-heading text-[11px] sm:text-xs">
                              الفك السفلي (48 - 38)
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 bg-white/80 px-2 py-0.5 rounded-md font-mono border border-slate-200">
                          نظام الترقيم الدولي FDI
                        </span>
                      </div>

                      {/* Unified Dental Arch with close vertical proximity */}
                      <div className="flex flex-col items-center justify-center py-1">
                        {/* Upper Jaw (الفك العلوي) */}
                        <div
                          dir="ltr"
                          className="flex items-center justify-center w-full"
                        >
                          {/* Upper Right Quadrant 18 - 11 */}
                          <div className="flex items-center gap-0.5">
                            {upperTeethRight.map(num => renderToothItem(num, true))}
                          </div>

                          {/* Small Midline Gap between Tooth 11 and Tooth 21 */}
                          <div className="w-2 sm:w-2.5 shrink-0" aria-hidden="true" />

                          {/* Upper Left Quadrant 21 - 28 */}
                          <div className="flex items-center gap-0.5">
                            {upperTeethLeft.map(num => renderToothItem(num, true))}
                          </div>
                        </div>

                        {/* Minimal Gap between Upper and Lower Jaw */}
                        <div className="w-full max-w-[480px] h-[1px] bg-gradient-to-r from-transparent via-slate-200/80 to-transparent my-1 sm:my-1.5" />

                        {/* Lower Jaw (الفك السفلي) */}
                        <div
                          dir="ltr"
                          className="flex items-center justify-center w-full"
                        >
                          {/* Lower Right Quadrant 48 - 41 */}
                          <div className="flex items-center gap-0.5">
                            {lowerTeethRight.map(num => renderToothItem(num, false))}
                          </div>

                          {/* Small Midline Gap between Tooth 41 and Tooth 31 */}
                          <div className="w-2 sm:w-2.5 shrink-0" aria-hidden="true" />

                          {/* Lower Left Quadrant 31 - 38 */}
                          <div className="flex items-center gap-0.5">
                            {lowerTeethLeft.map(num => renderToothItem(num, false))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Visits Log (سجل الزيارات) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#2563eb]" />
                      <span>سجل الزيارات</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBookModalOpen(true)}
                        className="text-xs font-bold text-[#2563eb] hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="حجز موعد جديد"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>موعد جديد</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('appointments')}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        عرض الكل
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="text-slate-400 font-medium border-b border-slate-100 pb-2">
                          <th className="py-2 px-2 text-center">الحالة</th>
                          <th className="py-2 px-2">الطبيب</th>
                          <th className="py-2 px-2">السبب</th>
                          <th className="py-2 px-2 text-left">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayAppointments.slice(0, 4).map(apt => (
                          <tr
                            key={apt.id}
                            onClick={() => setActiveTab('appointments')}
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 px-2 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ed] text-[#059669]">
                                تمت
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-slate-700 font-medium">
                              {settings?.doctorName || 'د. أحمد بن علي'}
                            </td>
                            <td className="py-2.5 px-2 text-slate-800">
                              {apt.procedure}
                            </td>
                            <td className="py-2.5 px-2 text-left font-mono font-medium text-slate-500 flex items-center justify-end gap-1.5">
                              <span>{apt.appointmentDate}</span>
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Invoices (الفواتير) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#2563eb]" />
                      <span>الفواتير ({realInvoices.length})</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenAddInvoice}
                        className="text-xs font-bold text-[#2563eb] hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="تسجيل دفعة أو فاتورة جديدة"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>فاتورة جديدة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('invoices')}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        عرض الكل
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {realInvoices.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        لا توجد فواتير مسجلة للمريض بعد.
                      </div>
                    ) : (
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="text-slate-400 font-medium border-b border-slate-100 pb-2">
                            <th className="py-2 px-2 text-center">الحالة</th>
                            <th className="py-2 px-2">المبلغ</th>
                            <th className="py-2 px-2">الوصف</th>
                            <th className="py-2 px-2 text-left">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {realInvoices.slice(0, 3).map((inv) => (
                            <tr
                              key={inv.id}
                              onClick={() => setActiveTab('invoices')}
                              className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                            >
                              <td className="py-2.5 px-2 text-center">
                                {renderInvoiceStatusBadge(inv.status)}
                              </td>
                              <td className="py-2.5 px-2 font-mono font-bold text-slate-900">
                                {inv.totalAmount.toLocaleString('ar-DZ')} د.ج
                              </td>
                              <td className="py-2.5 px-2 text-slate-800 truncate max-w-[140px]" title={inv.description}>
                                {inv.description}
                              </td>
                              <td className="py-2.5 px-2 text-left font-mono font-medium text-slate-500 flex items-center justify-end gap-1.5">
                                <span>{inv.date}</span>
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* COLUMN 3 (RIGHT in RTL): Medical Info, Treatments & Files   */}
              {/* ------------------------------------------------------------ */}
              <div className="lg:col-span-3 space-y-4">
                {/* 1. Medical Information (المعلومات الطبية - All Clickable & Editable) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#2563eb]" />
                      <span>المعلومات الطبية</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setMedAllergies(patient.allergies || '');
                        setMedDisease(patient.diseaseCondition || '');
                        setIsMedicalEditOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      title="تعديل المعلومات الطبية"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* الحساسية */}
                  <div
                    onClick={() => {
                      setMedAllergies(patient.allergies || '');
                      setIsMedicalEditOpen(true);
                    }}
                    className="space-y-1 cursor-pointer group"
                    title="انقر لتعديل الحساسية"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1 text-slate-800 group-hover:text-rose-600 transition-colors">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>الحساسية</span>
                      </span>
                      <Edit3 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50/70 hover:bg-rose-100/70 text-rose-700 text-xs font-medium border border-rose-100 transition-colors">
                      {patient.allergies && patient.allergies !== 'لا يوجد'
                        ? patient.allergies
                        : 'لا توجد حساسية معروفة'}
                    </div>
                  </div>

                  {/* الأمراض المزمنة */}
                  <div
                    onClick={() => {
                      setMedDisease(patient.diseaseCondition || '');
                      setIsMedicalEditOpen(true);
                    }}
                    className="space-y-1 cursor-pointer group"
                    title="انقر لتعديل الأمراض المزمنة"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1 text-slate-800 group-hover:text-emerald-700 transition-colors">
                        <HeartPulse className="w-3.5 h-3.5 text-emerald-500" />
                        <span>الأمراض المزمنة</span>
                      </span>
                      <Edit3 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-xs font-medium border border-emerald-100 transition-colors">
                      {patient.diseaseCondition && patient.diseaseCondition !== 'سليم'
                        ? patient.diseaseCondition
                        : 'لا توجد أمراض مزمنة'}
                    </div>
                  </div>

                  {/* الأدوية التي تناولها */}
                  <div
                    onClick={() => {
                      setMedMedications(patient.medications || '');
                      setIsMedicalEditOpen(true);
                    }}
                    className="space-y-1 cursor-pointer group"
                    title="انقر لتعديل الأدوية التي تناولها أو يتناولها المريض"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1 text-slate-800 group-hover:text-blue-600 transition-colors">
                        <Pill className="w-3.5 h-3.5 text-blue-500" />
                        <span>الأدوية التي تناولها</span>
                      </span>
                      <Edit3 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 text-blue-800 text-xs font-medium border border-blue-100 transition-colors">
                      {patient.medications || 'لا توجد أدوية مسجلة'}
                    </div>
                  </div>

                  {/* ملاحظات عامة */}
                  <div
                    onClick={() => setIsNoteModalOpen(true)}
                    className="space-y-1 cursor-pointer group"
                    title="انقر لإضافة أو تعديل ملاحظة"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1 text-slate-800 group-hover:text-blue-600 transition-colors">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>ملاحظات عامة</span>
                      </span>
                      <Plus className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs leading-relaxed border border-slate-100 transition-colors">
                      {notes.length > 0
                        ? notes[notes.length - 1].noteText
                        : 'تحتاج إلى متابعة دورية للأسنان الخلفية.'}
                    </div>
                  </div>
                </div>

                {/* 2. Current Treatments (العلاجات الحالية) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-1.5">
                      <Smile className="w-4 h-4 text-[#2563eb]" />
                      <span>العلاجات الحالية</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleOpenDetailedModal(selectedTooth || 16)}
                      className="text-xs font-bold text-[#2563eb] hover:bg-blue-50 p-1 rounded-lg transition-colors cursor-pointer"
                      title="إضافة إجراء علاجي جديد"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {displayTreatments.length > 0 ? (
                      displayTreatments.map((trt, idx) => (
                        <button
                          key={trt.id || idx}
                          type="button"
                          onClick={() => handleOpenDetailedModal(trt.toothNumber || 16)}
                          className="w-full p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/60 transition-colors flex items-center justify-between text-right cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-all" />
                            <div>
                              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                {trt.conditionType}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {trt.recordedDate || getClinicTodayStr()}
                              </div>
                            </div>
                          </div>

                          <div>
                            {trt.status === 'treated' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#e6f9ed] text-[#059669]">
                                مكتمل
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fef3c7] text-[#d97706]">
                                قيد العلاج
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="py-4 px-3 text-center text-xs bg-emerald-50/70 rounded-xl border border-emerald-100 flex flex-col items-center justify-center gap-1.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-emerald-800">كافة الأسنان سليمة وطبيعية</span>
                        <span className="text-[10px] text-slate-500">لا توجد حالات تسوس أو كسور مسجلة</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Before & After Cases (قبل وبعد العلاج) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                    <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>قبل وبعد العلاج</span>
                      {beforeAfterCases.length > 0 && (
                        <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                          ({beforeAfterCases.length} {beforeAfterCases.length === 1 ? 'حالة' : 'حالات'})
                        </span>
                      )}
                    </h2>

                    {/* Switcher dropdown if patient has more than 1 case */}
                    {beforeAfterCases.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={activeBeforeAfterCase?.id || ''}
                          onChange={(e) => setSelectedCaseId(e.target.value)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {beforeAfterCases.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.procedureTitle} ({formatDateDZ(c.procedureDate)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {isLoadingBeforeAfter ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-500">جاري التحميل...</p>
                    </div>
                  ) : beforeAfterError ? (
                    <div className="py-8 text-center text-rose-600 space-y-1">
                      <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
                      <p className="text-xs font-bold">تعذر تحميل صور قبل وبعد</p>
                    </div>
                  ) : beforeAfterCases.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-1.5 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <Sparkles className="w-6 h-6 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                        لا توجد صور قبل وبعد لهذا المريض. أضفها من صفحة قبل وبعد العلاج واختر هذا المريض.
                      </p>
                    </div>
                  ) : activeBeforeAfterCase ? (
                    <div className="space-y-2.5">
                      {/* Case details header: Procedure title, date, shade jump */}
                      <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-900 block truncate font-heading">
                            {activeBeforeAfterCase.procedureTitle}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            تاريخ الإجراء: {formatDateDZ(activeBeforeAfterCase.procedureDate)}
                          </span>
                        </div>
                        {activeBeforeAfterCase.shadeJump && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs flex items-center gap-1 font-mono">
                            <span>قفزة اللون:</span>
                            <span>{activeBeforeAfterCase.shadeJump}</span>
                          </span>
                        )}
                      </div>

                      {/* BeforeAfterSlider Component */}
                      <BeforeAfterSlider
                        beforeUrl={activeBeforeAfterCase.beforeImageUrl}
                        afterUrl={activeBeforeAfterCase.afterImageUrl}
                        shadeBefore={activeBeforeAfterCase.shadeBefore}
                        shadeAfter={activeBeforeAfterCase.shadeAfter}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: TEETH & JAW CHART (FULL INTERACTIVE OR TABLE)              */}
          {/* ============================================================== */}
          {(activeTab === 'teeth' || activeTab === 'jaw-chart') && (
            <div className="space-y-5">
              {/* Header and Controls */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Smile className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black font-heading text-slate-900 tracking-tight">
                      مخطط الفك والأسنان السريري - {patient.fullName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      فحص كامل للفكين العلوي والسفلي، ترقيم الأسنان بنظام FDI الدولي، وتسجيل الإجراءات.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetAllTeethToHealthy}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="إعادة ضبط جميع أسنان الفكين لتكون سليمة وطبيعية"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>كافة الأسنان سليمة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDetailedModal(selectedTooth || 11)}
                    className="px-3.5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ تشخيص لسن</span>
                  </button>
                </div>
              </div>

              {/* Anatomical Dental Chart + Dedicated Side Panel (القائمة الجانبية لتشخيص الأسنان) */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      خريطة الأسنان التشريحية والقائمة الجانبية للحالات (نظام FDI 11-48)
                    </h3>
                  </div>
                  {/* Legend matching all supported conditions */}
                  <div className="flex items-center gap-2.5 text-[11px] text-slate-600 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-black inline-block border border-neutral-700 shadow-2xs" />
                      <span className="font-bold text-neutral-900">تسوس (بقعة سوداء)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-flex items-center justify-center text-[7px] text-white font-bold border border-amber-700 shadow-2xs">⚡</span>
                      <span className="font-bold text-amber-800">كسر حقيقي (سن مكسور)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block border border-emerald-600 shadow-2xs" />
                      <span className="font-bold text-emerald-800">بلومباج (أخضر فاتح)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-flex items-center justify-center text-[7px] font-bold text-white shadow-2xs">
                        ⚙
                      </span>
                      <span className="font-bold text-indigo-800">تقويم (Ortho)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-flex items-center justify-center text-[7px] font-bold text-white">
                        ✕
                      </span>
                      <span className="font-semibold text-slate-700">مفقود</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-emerald-600 shadow-2xs" />
                      <span className="text-slate-500">سليم</span>
                    </div>
                  </div>
                </div>

                {/* 2-Column Responsive Layout: Dental Arch on Right (8 cols), Side Panel on Left (4 cols) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* Dental Arch Graphic (8 cols) */}
                  <div className="lg:col-span-8 bg-gradient-to-b from-slate-50/90 via-blue-50/15 to-slate-50/90 rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs">
                    {/* Compact Header with Jaw Indicators */}
                    <div className="flex items-center justify-between mb-2 px-1 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs" />
                          <span className="font-bold text-slate-800 font-heading text-[11px] sm:text-xs">
                            الفك العلوي (18 - 28)
                          </span>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-xs" />
                          <span className="font-bold text-slate-800 font-heading text-[11px] sm:text-xs">
                            الفك السفلي (48 - 38)
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 bg-white/80 px-2 py-0.5 rounded-md font-mono border border-slate-200">
                        نظام الترقيم الدولي FDI
                      </span>
                    </div>

                    {/* Unified Dental Arch with close vertical proximity */}
                    <div className="flex flex-col items-center justify-center py-1">
                      {/* Upper Jaw (الفك العلوي) */}
                      <div dir="ltr" className="flex items-center justify-center w-full">
                        <div className="flex items-center gap-0.5">
                          {upperTeethRight.map(num => renderToothItem(num, true))}
                        </div>
                        {/* Small Midline Gap between Tooth 11 and Tooth 21 */}
                        <div className="w-2 sm:w-2.5 shrink-0" aria-hidden="true" />
                        <div className="flex items-center gap-0.5">
                          {upperTeethLeft.map(num => renderToothItem(num, true))}
                        </div>
                      </div>

                      {/* Minimal Gap between Upper and Lower Jaw */}
                      <div className="w-full max-w-[480px] h-[1px] bg-gradient-to-r from-transparent via-slate-200/80 to-transparent my-1 sm:my-1.5" />

                      {/* Lower Jaw (الفك السفلي) */}
                      <div dir="ltr" className="flex items-center justify-center w-full">
                        <div className="flex items-center gap-0.5">
                          {lowerTeethRight.map(num => renderToothItem(num, false))}
                        </div>
                        {/* Small Midline Gap between Tooth 41 and Tooth 31 */}
                        <div className="w-2 sm:w-2.5 shrink-0" aria-hidden="true" />
                        <div className="flex items-center gap-0.5">
                          {lowerTeethLeft.map(num => renderToothItem(num, false))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-center text-[10px] text-slate-500">
                      💡 انقر على أي سن في المخطط لتحديده وتطبيق حالته من القائمة الجانبية المجاورة مباشرة.
                    </div>
                  </div>

                  {/* Dedicated Side Panel (القائمة الجانبية لحالات الأسنان) (4 cols) */}
                  {(() => {
                    const activeTooth = selectedTooth ?? 11;
                    const toothInfo = getToothConditionInfo(activeTooth);
                    const toothName = TOOTH_NAMES_AR[activeTooth] || `السن #${activeTooth}`;
                    const isUpper = activeTooth < 30;

                    return (
                      <div className="lg:col-span-4 bg-gradient-to-b from-slate-50 via-white to-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3.5">
                        {/* Side Panel Header */}
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                          <span className="text-xs font-black text-slate-800 font-heading flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
                            <span>القائمة الجانبية للحالات</span>
                          </span>
                          <span className="text-[10px] text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-md font-bold border border-blue-200">
                            تطبيق فوري
                          </span>
                        </div>

                        {/* Selected Tooth Card */}
                        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-14 rounded-lg bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                              <img
                                src={`/assets/dental/teeth/tooth-${activeTooth}.png`}
                                alt={`السن ${activeTooth}`}
                                style={
                                  toothInfo.status === 'fracture'
                                    ? {
                                        clipPath: isUpper
                                          ? 'polygon(0% 0%, 100% 0%, 100% 60%, 78% 68%, 54% 54%, 32% 68%, 0% 48%)'
                                          : 'polygon(0% 52%, 32% 32%, 54% 46%, 78% 32%, 100% 40%, 100% 100%, 0% 100%)',
                                      }
                                    : toothInfo.status === 'filling'
                                    ? {
                                        filter: 'sepia(1) saturate(5.5) hue-rotate(80deg) brightness(1.22)',
                                      }
                                    : undefined
                                }
                                className={`w-full h-full object-contain pointer-events-none select-none ${
                                  toothInfo.status === 'missing' ? 'opacity-30 grayscale' : ''
                                }`}
                              />

                              {/* Realistic condition visual effects directly on side panel tooth preview */}
                              {toothInfo.status === 'caries' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                  {/* بقعة سوداء داكنة واضحة في منتصف السن أو الضرس في المعاينة */}
                                  <div
                                    className="w-4 h-4 rounded-full bg-black shadow-lg border border-neutral-950 flex items-center justify-center animate-in zoom-in-75 duration-150"
                                    style={{
                                      background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #111111 50%, #000000 100%)',
                                      boxShadow: '0 0 5px 2px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.2)',
                                    }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
                                  </div>
                                </div>
                              )}

                              {toothInfo.status === 'fracture' && (
                                <div className="absolute inset-0 pointer-events-none z-10">
                                  <svg
                                    className="w-full h-full absolute inset-0 overflow-visible pointer-events-none"
                                    viewBox="0 0 50 100"
                                    preserveAspectRatio="none"
                                  >
                                    {isUpper ? (
                                      <>
                                        <path
                                          d="M 0,48 L 16,68 L 27,54 L 39,68 L 50,60"
                                          fill="none"
                                          stroke="#451a03"
                                          strokeWidth="2.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M 0,48 L 16,68 L 27,54 L 39,68 L 50,60"
                                          fill="none"
                                          stroke="#d97706"
                                          strokeWidth="1.4"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M 27,54 L 23,38 L 26,24"
                                          fill="none"
                                          stroke="#78350f"
                                          strokeWidth="1"
                                          strokeDasharray="2,1.5"
                                        />
                                        <path
                                          d="M 0,51 L 16,71 L 27,57 L 39,71 L 50,63 L 50,96 C 40,98 10,98 0,96 Z"
                                          fill="rgba(245, 158, 11, 0.12)"
                                          stroke="#b45309"
                                          strokeWidth="1"
                                          strokeDasharray="2,2"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <path
                                          d="M 0,52 L 16,32 L 27,46 L 39,32 L 50,40"
                                          fill="none"
                                          stroke="#451a03"
                                          strokeWidth="2.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M 0,52 L 16,32 L 27,46 L 39,32 L 50,40"
                                          fill="none"
                                          stroke="#d97706"
                                          strokeWidth="1.4"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M 27,46 L 24,62 L 26,76"
                                          fill="none"
                                          stroke="#78350f"
                                          strokeWidth="1"
                                          strokeDasharray="2,1.5"
                                        />
                                        <path
                                          d="M 0,49 L 16,29 L 27,43 L 39,29 L 50,37 L 50,4 C 40,2 10,2 0,4 Z"
                                          fill="rgba(245, 158, 11, 0.12)"
                                          stroke="#b45309"
                                          strokeWidth="1"
                                          strokeDasharray="2,2"
                                        />
                                      </>
                                    )}
                                  </svg>
                                </div>
                              )}

                              {toothInfo.status === 'filling' && (
                                <div
                                  className="absolute inset-0 rounded-lg pointer-events-none mix-blend-color z-10"
                                  style={{
                                    backgroundColor: 'rgba(74, 222, 128, 0.45)',
                                  }}
                                />
                              )}

                              {toothInfo.status === 'ortho' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                  <div className="relative w-full flex items-center justify-center px-1">
                                    <div className="w-full h-[2px] bg-slate-400 shadow-xs" />
                                    <div
                                      className="absolute w-4 h-4 rounded-[3px] bg-gradient-to-br from-indigo-100 via-slate-100 to-indigo-500 border-2 border-indigo-600 shadow-md flex items-center justify-center animate-in zoom-in-75 duration-150"
                                    >
                                      <div className="w-1.5 h-1.5 rounded-[1px] bg-indigo-700" />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {toothInfo.status === 'missing' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="text-xl font-black text-slate-800 drop-shadow-sm select-none">✕</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-sm font-black text-[#1e3a8a]">
                                  #{activeTooth}
                                </span>
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                  {isUpper ? 'الفك العلوي' : 'الفك السفلي'}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-800 truncate" title={toothName}>
                                {toothName}
                              </p>
                            </div>
                          </div>

                          {/* Current Status Badge */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">الحالة الحالية:</span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                toothInfo.status === 'caries'
                                  ? 'bg-neutral-900 text-white border-neutral-950 shadow-xs'
                                  : toothInfo.status === 'fracture'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-black shadow-xs'
                                  : toothInfo.status === 'missing'
                                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                                  : toothInfo.status === 'filling'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold shadow-xs'
                                  : toothInfo.status === 'ortho'
                                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold shadow-xs'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {toothInfo.status === 'caries' && '⚫ تسوس (بقعة سوداء داكنة)'}
                              {toothInfo.status === 'fracture' && '⚡ كسر حقيقي بالسن'}
                              {toothInfo.status === 'missing' && '✕ سن مفقود'}
                              {toothInfo.status === 'filling' && '● بلومباج / حشو (أخضر فاتح)'}
                              {toothInfo.status === 'ortho' && '⚙ تقويم الأسنان (Ortho / Braces)'}
                              {toothInfo.status === 'normal' && '✓ سليم / طبيعي'}
                            </span>
                          </div>
                        </div>

                        {/* Condition Action Buttons */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            تطبيق الحالة على السن #{activeTooth}:
                          </label>

                          {/* 1. التسوس (Caries) */}
                          <button
                            type="button"
                            onClick={() => handleApplyCondition(activeTooth, 'caries')}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                              toothInfo.status === 'caries'
                                ? 'bg-neutral-900 text-white border-neutral-950 shadow-sm ring-2 ring-neutral-400'
                                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border-neutral-300'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-black border border-neutral-700 shadow-2xs inline-block" />
                              <span>التسوس (Caries)</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-90 font-bold">بقعة سوداء داكنة</span>
                          </button>

                          {/* 2. الكسر (Fracture) */}
                          <button
                            type="button"
                            onClick={() => handleApplyCondition(activeTooth, 'fracture')}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                              toothInfo.status === 'fracture'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                                : 'bg-amber-50/80 hover:bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-[11px]">⚡</span>
                              <span>الكسر (Fracture)</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-90 font-bold">سن مكسور حقيقةً</span>
                          </button>

                          {/* 3. فقدان السن (Missing Tooth) */}
                          <button
                            type="button"
                            onClick={() => handleApplyCondition(activeTooth, 'missing')}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                              toothInfo.status === 'missing'
                                ? 'bg-slate-800 text-white border-slate-800 shadow-sm ring-2 ring-slate-400'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="font-black text-xs">✕</span>
                              <span>فقدان السن (Missing Tooth)</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-80">إخفاء ورمادي</span>
                          </button>

                          {/* 4. البلومباج / الحشو (Plombage / Filling) */}
                          <button
                            type="button"
                            onClick={() => handleApplyCondition(activeTooth, 'filling')}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                              toothInfo.status === 'filling'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                                : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-600 inline-block shadow-2xs" />
                              <span>البلومباج / الحشو (Plombage)</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-90 font-bold">لون أخضر فاتح كامل</span>
                          </button>

                          {/* 5. تقويم الأسنان (Orthodontics / Braces) */}
                          <button
                            type="button"
                            onClick={() => handleApplyCondition(activeTooth, 'ortho')}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                              toothInfo.status === 'ortho'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300'
                                : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-[12px]">⚙</span>
                              <span>تقويم الأسنان (Orthodontics)</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-90 font-bold">جهاز تقويم / Braces</span>
                          </button>

                          {/* 6. جعل السن سليم (Make only selected tooth healthy) */}
                          <button
                            type="button"
                            onClick={() => handleApplyCondition(activeTooth, 'normal')}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                              toothInfo.status === 'normal'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                            title={`جعل السن #${activeTooth} سليماً وطبيعياً فقط ومسح حالته`}
                          >
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>جعل السن سليم</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-90 font-bold">السن #{activeTooth} فقط</span>
                          </button>
                        </div>

                        {/* Additional Options Button */}
                        <div className="pt-2 border-t border-slate-200/80">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailedModal(activeTooth)}
                            className="w-full py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                          >
                            <Settings className="w-3.5 h-3.5 text-slate-500" />
                            <span>تفاصيل تشخيص متقدمة وتكلفة العلاج...</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Conditions summary badges */}
              {conditions.filter(c => c.patientId === patient.id).length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-slate-200/90 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 ml-2">الحالات المسجلة في ملف المريض:</span>
                  {conditions.filter(c => c.patientId === patient.id).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedTooth(c.toothNumber);
                        setCondToothNumber(c.toothNumber);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-300 text-slate-800 transition-colors cursor-pointer"
                      title="انقر لتحديد السن وعرض حالته في القائمة الجانبية"
                    >
                      <span className="font-mono font-bold text-[#2563eb]">#{c.toothNumber}</span>
                      <span>{c.conditionType}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: MEDICAL RECORD (السجل الطبي)                               */}
          {/* ============================================================== */}
          {activeTab === 'medical' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-base font-black font-heading text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#2563eb]" />
                    <span>السجل الطبي والأمراض السابقة - {patient.fullName}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setMedAllergies(patient.allergies || '');
                      setMedDisease(patient.diseaseCondition || '');
                      setMedMedications(patient.medications || '');
                      setIsMedicalEditOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#2563eb] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل السجل الطبي</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => {
                      setMedAllergies(patient.allergies || '');
                      setMedMedications(patient.medications || '');
                      setIsMedicalEditOpen(true);
                    }}
                    className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5 cursor-pointer hover:bg-rose-100/70 transition-colors"
                  >
                    <div className="text-xs font-bold text-rose-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>سجل الحساسية الدوائية والغذائية:</span>
                      </span>
                      <Edit3 className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <div className="text-xs text-rose-900 font-medium">
                      {patient.allergies || 'لا توجد حساسية معروفة مسجلة'}
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setMedDisease(patient.diseaseCondition || '');
                      setMedMedications(patient.medications || '');
                      setIsMedicalEditOpen(true);
                    }}
                    className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 cursor-pointer hover:bg-emerald-100/70 transition-colors"
                  >
                    <div className="text-xs font-bold text-emerald-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <HeartPulse className="w-4 h-4 text-emerald-600" />
                        <span>الأمراض المزمنة والسوابق:</span>
                      </span>
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-xs text-emerald-900 font-medium">
                      {patient.diseaseCondition || 'لا توجد أمراض مزمنة مسجلة'}
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setMedMedications(patient.medications || '');
                      setIsMedicalEditOpen(true);
                    }}
                    className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1.5 cursor-pointer hover:bg-blue-100/70 transition-colors"
                  >
                    <div className="text-xs font-bold text-blue-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-blue-600" />
                        <span>الأدوية التي تناولها / الحالية:</span>
                      </span>
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="text-xs text-blue-900 font-medium">
                      {patient.medications || 'لا توجد أدوية مسجلة'}
                    </div>
                  </div>
                </div>

                {/* Notes List */}
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">الملاحظات السريرية المدونة ({notes.length})</h3>
                    <button
                      type="button"
                      onClick={() => setIsNoteModalOpen(true)}
                      className="px-3.5 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة ملاحظة</span>
                    </button>
                  </div>

                  {notes.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                      لا توجد ملاحظات سريرية مدونة حتى الآن.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notes.map(n => (
                        <div key={n.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 text-xs">
                          <div>
                            <p className="text-slate-800 leading-relaxed">{n.noteText}</p>
                            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                              {n.createdAt ? formatDateDZ(n.createdAt.slice(0, 10)) : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteNote(n.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="حذف الملاحظة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: APPOINTMENTS (الزيارات)                                    */}
          {/* ============================================================== */}
          {activeTab === 'appointments' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <h2 className="text-base font-black font-heading text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#2563eb]" />
                  <span>سجل مواعيد وزيارات المريض ({appointments.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(true)}
                  className="px-3.5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>حجز موعد جديد</span>
                </button>
              </div>

              {appointments.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>لا توجد مواعيد مسجلة لهذا المريض حتى الآن.</p>
                  <button
                    type="button"
                    onClick={() => setIsBookModalOpen(true)}
                    className="mt-3 px-4 py-2 bg-[#2563eb] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    حجز أول موعد للمريض
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">التاريخ</th>
                        <th className="py-2.5 px-3">الوقت</th>
                        <th className="py-2.5 px-3">الإجراء الطبي</th>
                        <th className="py-2.5 px-3">الحالة</th>
                        <th className="py-2.5 px-3">ملاحظات</th>
                        <th className="py-2.5 px-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {appointments.map(apt => (
                        <tr key={apt.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 font-mono font-medium text-slate-800">
                            {formatDateDZ(apt.appointmentDate)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {apt.appointmentTime}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800">
                            {apt.procedure}
                          </td>
                          <td className="py-3 px-3">
                            {apt.status === 'completed' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ed] text-[#059669]">
                                مكتمل
                              </span>
                            ) : apt.status === 'cancelled' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600">
                                ملغى
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                مجدول
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {apt.notes || '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {apt.status !== 'completed' && onUpdateAppointment && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateAppointment(apt.id, { status: 'completed' })}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold cursor-pointer"
                                  title="تأكيد إتمام الموعد"
                                >
                                  إتمام
                                </button>
                              )}
                              {onDeleteAppointment && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteAppointment(apt.id)}
                                  className="p-1 text-rose-400 hover:text-rose-600 rounded cursor-pointer"
                                  title="حذف الموعد"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: TREATMENTS (العلاجات)                                     */}
          {/* ============================================================== */}
          {activeTab === 'treatments' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <h2 className="text-base font-black font-heading text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#2563eb]" />
                  <span>سجل العلاجات والإجراءات السريرية ({conditions.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => handleOpenDetailedModal(selectedTooth || 11)}
                  className="px-3.5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ علاج جديد</span>
                </button>
              </div>

              {conditions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  <Smile className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>لم يتم تسجيل علاجات سنية بعد.</p>
                  <button
                    type="button"
                    onClick={() => handleOpenDetailedModal(11)}
                    className="mt-3 px-4 py-2 bg-[#2563eb] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + إضافة تشخيص سن جديد
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">رقم السن</th>
                        <th className="py-2.5 px-3">التشخيص</th>
                        <th className="py-2.5 px-3">الإجراء المنفذ</th>
                        <th className="py-2.5 px-3">التاريخ</th>
                        <th className="py-2.5 px-3">التكلفة</th>
                        <th className="py-2.5 px-3">الحالة</th>
                        <th className="py-2.5 px-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {conditions.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 font-mono font-bold text-[#2563eb]">
                            #{c.toothNumber}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800">
                            {c.conditionType}
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            {c.treatmentDone || '-'}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">
                            {formatDateDZ(c.recordedDate)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {c.cost ? `${c.cost.toLocaleString('ar-DZ')} د.ج` : '-'}
                          </td>
                          <td className="py-3 px-3">
                            {c.status === 'treated' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ed] text-[#059669]">
                                معالج
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fef3c7] text-[#d97706]">
                                قيد العلاج
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenDetailedModal(c.toothNumber)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                title="تعديل السن"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteCondition(c.id)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                title="حذف السن"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: FILES & RADIOGRAPHS (الأشعة والصور)                        */}
          {/* ============================================================== */}
          {activeTab === 'files' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
                <h2 className="text-base font-black font-heading text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#2563eb]" />
                  <span>أشعة وصور ومستندات المريض ({files.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                  >
                    <option value="صورة أشعة بانورامية (Panoramique)">أشعة بانورامية</option>
                    <option value="أشعة سينية داخل فموية (Radio RVG)">أشعة سينية RVG</option>
                    <option value="صورة فوتوغرافية داخل فموية">صورة داخل فموية</option>
                    <option value="تحاليل مخبرية (Bilan)">تحاليل مخبرية</option>
                    <option value="تقرير طبي (Rapport)">تقرير طبي</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3.5 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'جارٍ الرفع...' : 'رفع صورة / أشعة'}</span>
                  </button>
                </div>
              </div>

              {files.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p>لا توجد ملفات أو صور أشعة مرفقة لهذا المريض بعد.</p>
                  <p className="text-[11px] text-slate-400 mt-1">انقر على زر "رفع صورة / أشعة" لإضافة صورة أشعة بانورامية أو تقرير طبي.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {files.map((f, idx) => {
                    const isPdf = f.mimeType === 'application/pdf' || /\.pdf$/i.test(f.originalName);
                    return (
                      <div
                        key={f.id}
                        className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs hover:shadow-md transition-shadow flex flex-col group"
                      >
                        <div
                          onClick={() => setPreviewFileIndex(idx)}
                          className="h-36 bg-slate-900 cursor-pointer flex items-center justify-center relative overflow-hidden"
                        >
                          {isPdf ? (
                            <div className="flex flex-col items-center justify-center text-rose-400 gap-1.5 p-4 text-center">
                              <FileText className="w-10 h-10" />
                              <span className="text-xs font-mono font-bold text-slate-200">مستند PDF</span>
                              <span className="text-[10px] text-slate-400">انقر للفتح والعرض</span>
                            </div>
                          ) : (
                            <img
                              src={f.dataUrl || clinicApi.getFilePreviewUrl(f.id)}
                              alt={f.originalName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                            <Eye className="w-5 h-5" />
                            <span className="text-xs font-bold">معاينة وسالب الأشعة</span>
                          </div>
                        </div>
                        <div className="p-3 bg-white flex flex-col justify-between flex-1 space-y-2">
                          <div>
                            <div className="text-xs font-bold text-slate-800 truncate" title={f.originalName}>
                              {f.originalName}
                            </div>
                            <div className="text-[10px] text-[#2563eb] font-semibold mt-0.5">
                              {f.category}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                            <a
                              href={f.dataUrl || clinicApi.getFileDownloadUrl(f.id)}
                              download={f.originalName}
                              className="text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>تحميل</span>
                            </a>
                          <button
                            type="button"
                            onClick={() => onDeleteFile(f.id)}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: INVOICES (الفواتير)                                        */}
          {/* ============================================================== */}
          {activeTab === 'invoices' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black font-heading text-slate-900">
                      سجل فواتير ومدفوعات المريض ({realInvoices.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      إدارة المعاملات المالية، دفع المستحقات، وسندات القبض
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="طباعة كشف الحساب المالي"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة الكشف</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddInvoice}
                    className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>فاتورة جديدة</span>
                  </button>
                </div>
              </div>

              {/* 3 Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">إجمالي الفواتير</div>
                  <div className="text-xl font-mono font-black text-slate-900">
                    {totalInvoiced.toLocaleString('ar-DZ')} <span className="text-xs font-sans text-slate-500 font-normal">د.ج</span>
                  </div>
                </div>

                <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-100">
                  <div className="text-[11px] font-bold text-emerald-700 mb-1">إجمالي المدفوع</div>
                  <div className="text-xl font-mono font-black text-emerald-700">
                    {totalPaid.toLocaleString('ar-DZ')} <span className="text-xs font-sans text-emerald-600 font-normal">د.ج</span>
                  </div>
                </div>

                <div className={`rounded-xl p-4 border ${totalRemaining > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`text-[11px] font-bold mb-1 ${totalRemaining > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                    إجمالي المتبقي (الديون)
                  </div>
                  <div className={`text-xl font-mono font-black ${totalRemaining > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                    {totalRemaining.toLocaleString('ar-DZ')} <span className="text-xs font-sans font-normal opacity-70">د.ج</span>
                  </div>
                </div>
              </div>

              {/* Invoices Table */}
              {isLoadingInvoices ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  جارٍ تحميل الفواتير...
                </div>
              ) : realInvoices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-sm text-slate-600">لا توجد فواتير مسجلة لهذا المريض</p>
                  <p className="text-xs text-slate-400 mt-1">انقر على زر "فاتورة جديدة" لتسجيل فاتورة أو علاج لهذا المريض</p>
                  <button
                    type="button"
                    onClick={handleOpenAddInvoice}
                    className="mt-3 px-4 py-2 bg-[#2563eb] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تسجيل فاتورة جديدة</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">التاريخ</th>
                        <th className="py-3 px-3">الوصف والإجراء</th>
                        <th className="py-3 px-3">المبلغ الكلي</th>
                        <th className="py-3 px-3">المدفوع</th>
                        <th className="py-3 px-3">المتبقي</th>
                        <th className="py-3 px-3">طريقة الدفع</th>
                        <th className="py-3 px-3">الحالة</th>
                        <th className="py-3 px-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {realInvoices.map((inv) => {
                        const rem = typeof inv.remainingAmount === 'number'
                          ? inv.remainingAmount
                          : Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 font-mono font-medium text-slate-600 whitespace-nowrap">
                              {inv.date}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-800">
                              <div>{inv.description}</div>
                              {inv.notes && (
                                <div className="text-[11px] font-normal text-slate-400 mt-0.5">{inv.notes}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {inv.totalAmount.toLocaleString('ar-DZ')} د.ج
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                              {inv.paidAmount.toLocaleString('ar-DZ')} د.ج
                            </td>
                            <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                              {rem > 0 ? (
                                <span className="text-amber-700">{rem.toLocaleString('ar-DZ')} د.ج</span>
                              ) : (
                                <span className="text-slate-400">0 د.ج</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                              {formatPaymentMethod(inv.paymentMethod)}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {renderInvoiceStatusBadge(inv.status)}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {rem > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPaymentModal(inv)}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                    title="تسجيل دفعة نقدية"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>تسجيل دفعة</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditInvoice(inv)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-200"
                                  title="تعديل الفاتورة"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteInvoiceModal(inv)}
                                  className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg cursor-pointer transition-colors border border-rose-200 hover:border-rose-600 flex items-center gap-1 font-bold text-xs shadow-2xs"
                                  title="حذف الفاتورة نهائياً"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف</span>
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
        </main>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: TOOTH CONDITION & DIAGNOSIS                           */}
      {/* ============================================================== */}
      {isConditionModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading">
                تشخيص وعلاج السن #{condToothNumber} (FDI)
              </h3>
              <button
                type="button"
                onClick={() => setIsConditionModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCondition} className="p-5 space-y-3.5 text-xs text-slate-800">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  رقم السن (FDI 11 - 48):
                </label>
                <input
                  type="number"
                  min="11"
                  max="48"
                  value={condToothNumber}
                  onChange={(e) => setCondToothNumber(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  التشخيص / الحالة السريرية:
                </label>
                <select
                  value={condType}
                  onChange={(e) => setCondType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer"
                >
                  <option value="تسوس عميق">تسوس عميق (Caries profonde)</option>
                  <option value="تسوس سطحي">تسوس سطحي (Caries superficielle)</option>
                  <option value="التهاب عصب">التهاب عصب (Pulpite)</option>
                  <option value="التهاب لثة">التهاب لثة (Gingivite)</option>
                  <option value="خراج لثوي">خراج لثوي (Abcès)</option>
                  <option value="كسر بالسن">كسر بالسن (Fracture)</option>
                  <option value="تقويم الأسنان">تقويم الأسنان (Orthodontie / Braces)</option>
                  <option value="ترسبات جيرية">ترسبات جيرية (Tartre)</option>
                  <option value="سن مفقود">سن مفقود (Dent absente)</option>
                  <option value="تاج أو جسر">تاج أو جسر (Couronne)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  الإجراء المنفذ / العلاج:
                </label>
                <input
                  type="text"
                  value={condTreatment}
                  onChange={(e) => setCondTreatment(e.target.value)}
                  placeholder="مثال: حشوة كمبوزيت ضوئية"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    حالة الإجراء:
                  </label>
                  <select
                    value={condStatus}
                    onChange={(e) => setCondStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer"
                  >
                    <option value="in_progress">قيد العلاج</option>
                    <option value="treated">تم العلاج / مكتمل</option>
                    <option value="monitoring">مراقبة</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    التكلفة (DZD):
                  </label>
                  <input
                    type="number"
                    value={condCost}
                    onChange={(e) => setCondCost(e.target.value)}
                    placeholder="3500"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ملاحظات سريرية إضافية:
                </label>
                <textarea
                  rows={2}
                  value={condNotes}
                  onChange={(e) => setCondNotes(e.target.value)}
                  placeholder="أي تفاصيل خاصة بالجلسة أو الإجراء..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConditionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingCondition}
                  className="px-5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSavingCondition ? 'جارٍ الحفظ...' : 'حفظ الحالة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT PATIENT DETAILS                                  */}
      {/* ============================================================== */}
      {isEditPatientOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading">
                تعديل بيانات المريض ({patient.fullName})
              </h3>
              <button
                type="button"
                onClick={() => setIsEditPatientOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePatientUpdates} className="p-5 space-y-3.5 text-xs text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الاسم واللقب:</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الهاتف:</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ الميلاد:</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الجنس:</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={editGender === 'male'}
                        onChange={() => setEditGender('male')}
                      />
                      <span>ذكر</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={editGender === 'female'}
                        onChange={() => setEditGender('female')}
                      />
                      <span>أنثى</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">العنوان / مكان الإقامة:</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="أدخل مكان الإقامة (اختياري)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">سجل الحساسية الدوائية:</label>
                <input
                  type="text"
                  value={editAllergies}
                  onChange={(e) => setEditAllergies(e.target.value)}
                  placeholder="مثال: حساسية البنسلين، أو لا يوجد"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الأمراض المزمنة والسوابق:</label>
                <input
                  type="text"
                  value={editDiseaseCondition}
                  onChange={(e) => setEditDiseaseCondition(e.target.value)}
                  placeholder="مثال: سكري، ضغط دم، أو سليم"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80">
                <MedicationSelector
                  value={editMedications}
                  onChange={setEditMedications}
                  label="الأدوية التي تناولها / الأدوية الحالية للمريض:"
                  placeholder="انقر هنا لاختيار أو كتابة الأدوية المتناولة..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditPatientOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingPatient}
                  className="px-5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSavingPatient ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: QUICK CLINICAL NOTE                                   */}
      {/* ============================================================== */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading">
                إضافة ملاحظة سريرية للمريض ({patient.fullName})
              </h3>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-5 space-y-3 text-xs text-slate-800">
              <div>
                <label className="block font-bold text-slate-700 mb-1">نص الملاحظة:</label>
                <textarea
                  rows={4}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="اكتب ملاحظاتك السريرية الخاصة بالمريض..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingNote || !newNoteText.trim()}
                  className="px-5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSavingNote ? 'جارٍ الحفظ...' : 'حفظ الملاحظة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: DIRECT IN-DOSSIER APPOINTMENT BOOKING                 */}
      {/* ============================================================== */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>حجز موعد جديد للمريض ({patient.fullName})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDirectAppointment} className="p-5 space-y-3.5 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التاريخ:</label>
                  <input
                    type="date"
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التوقيت:</label>
                  <input
                    type="time"
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الإجراء الطبي أو الفحص:</label>
                <select
                  value={aptProcedure}
                  onChange={(e) => setAptProcedure(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
                >
                  <option value="فحص وتنظيف الأسنان">فحص وتنظيف الأسنان (Détartrage)</option>
                  <option value="علاج تسوس وحشو">علاج تسوس وحشو (Obturation)</option>
                  <option value="علاج عصب السن">علاج عصب السن (Dévitalisation)</option>
                  <option value="قلع سن أو ضرس">قلع سن أو ضرس (Extraction)</option>
                  <option value="تركيب تاج أو جسر">تركيب تاج أو جسر (Prothèse)</option>
                  <option value="متابعة دورية">متابعة دورية (Contrôle)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">التكلفة التقديرية (DZD):</label>
                <input
                  type="number"
                  value={aptCost}
                  onChange={(e) => setAptCost(e.target.value)}
                  placeholder="3000"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات إضافية للموعد:</label>
                <input
                  type="text"
                  value={aptNotes}
                  onChange={(e) => setAptNotes(e.target.value)}
                  placeholder="جلسة أولى، تخدير موضعي، إلخ..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingApt}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSavingApt ? 'جارٍ الحجز...' : 'تأكيد الحجز'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: DIRECT INVOICE CREATION                               */}
      {/* ============================================================== */}
      {isAddInvoiceOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>فاتورة جديدة للمريض ({patient.fullName})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddInvoiceOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDirectInvoice} className="p-5 space-y-3.5 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ الفاتورة:</label>
                  <input
                    type="date"
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">طريقة الدفع:</label>
                  <select
                    value={invPaymentMethod}
                    onChange={(e) => setInvPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
                  >
                    <option value="cash">نقد (كاش)</option>
                    <option value="baridimob">بريدي موب (BaridiMob)</option>
                    <option value="check">صك بنكي (Chèque)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الوصف أو الإجراء الطبي:</label>
                <input
                  type="text"
                  value={invDescription}
                  onChange={(e) => setInvDescription(e.target.value)}
                  placeholder="مثال: كشف وعلاج عصب، تنظيف أسنان..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    المبلغ الكلي (د.ج) <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={invTotalAmount}
                    onChange={(e) => setInvTotalAmount(e.target.value)}
                    placeholder="أدخل المبلغ"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المدفوع الآن (د.ج):</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={invPaidAmount}
                    onChange={(e) => setInvPaidAmount(e.target.value)}
                    placeholder="اختياري"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                💡 إن تُرك المدفوع فارغاً يُعتبر الدفع كاملاً ويُسجل كامل المبلغ كمدفوع.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات الفاتورة (اختياري):</label>
                <input
                  type="text"
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  placeholder="رقم الوصل، تفاصيل إضافية..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddInvoiceOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingInvoice}
                  className="px-5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSavingInvoice ? 'جارٍ الحفظ...' : 'إنشاء وحفظ الفاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5B: RECORD INVOICE PAYMENT                               */}
      {/* ============================================================== */}
      {payingInvoice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-200" />
                <span>تسجيل دفعة نقدية للفاتورة</span>
              </h3>
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="text-emerald-200 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-3.5 text-xs text-slate-800">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-slate-700">
                  <span>الوصف:</span>
                  <span className="font-bold text-slate-900">{payingInvoice.description}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>المبلغ الكلي:</span>
                  <span className="font-mono font-bold text-slate-900">{payingInvoice.totalAmount.toLocaleString('ar-DZ')} د.ج</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>المدفوع سابقاً:</span>
                  <span className="font-mono font-bold text-emerald-700">{payingInvoice.paidAmount.toLocaleString('ar-DZ')} د.ج</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-amber-800 font-bold">
                  <span>المتبقي حالياً:</span>
                  <span className="font-mono text-sm text-amber-700">{payingInvoice.remainingAmount.toLocaleString('ar-DZ')} د.ج</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    مبلغ الدفعة (د.ج) <span className="text-rose-500">*</span>:
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(payingInvoice.remainingAmount))}
                    className="text-[11px] font-bold text-[#2563eb] hover:underline cursor-pointer"
                  >
                    دفع كامل المتبقي ({payingInvoice.remainingAmount.toLocaleString('ar-DZ')} د.ج)
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  max={payingInvoice.remainingAmount}
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={`الحد الأقصى ${payingInvoice.remainingAmount}`}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">طريقة الدفع:</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
                >
                  <option value="cash">نقد (كاش)</option>
                  <option value="baridimob">بريدي موب (BaridiMob)</option>
                  <option value="check">صك بنكي (Chèque)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSavingPayment ? 'جارٍ التسجيل...' : 'تأكيد تسجيل الدفعة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5C: EDIT INVOICE                                         */}
      {/* ============================================================== */}
      {editingInvoice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>تعديل بيانات الفاتورة</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice} className="p-5 space-y-3.5 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التاريخ:</label>
                  <input
                    type="date"
                    value={editInvDate}
                    onChange={(e) => setEditInvDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">طريقة الدفع:</label>
                  <select
                    value={editInvPaymentMethod}
                    onChange={(e) => setEditInvPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
                  >
                    <option value="cash">نقد (كاش)</option>
                    <option value="baridimob">بريدي موب (BaridiMob)</option>
                    <option value="check">صك بنكي (Chèque)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الوصف:</label>
                <input
                  type="text"
                  value={editInvDescription}
                  onChange={(e) => setEditInvDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المبلغ الكلي (د.ج):</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={editInvTotalAmount}
                    onChange={(e) => setEditInvTotalAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المدفوع (د.ج):</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editInvPaidAmount}
                    onChange={(e) => setEditInvPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات:</label>
                <input
                  type="text"
                  value={editInvNotes}
                  onChange={(e) => setEditInvNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingInvoice}
                  className="px-5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isUpdatingInvoice ? 'جارٍ التحديث...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5D: DELETE INVOICE CONFIRMATION MODAL                    */}
      {/* ============================================================== */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-rose-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-200" />
                <span>تأكيد حذف الفاتورة</span>
              </h3>
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="text-rose-200 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-800">
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl space-y-1.5 text-rose-950">
                <div className="font-bold text-sm text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>هل أنت متأكد من رغبتك في حذف هذه الفاتورة نهائياً؟</span>
                </div>
                <p className="text-[11px] text-rose-800">
                  سيتم حذف هذه الفاتورة وإلغاؤها من سجلات المريض، وتحديث الإحصائيات والأرقام المالية فوراً.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>الوصف:</span>
                  <span className="font-bold text-slate-900">{invoiceToDelete.description}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>التاريخ:</span>
                  <span className="font-mono font-medium text-slate-800">{invoiceToDelete.date}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>المبلغ الكلي:</span>
                  <span className="font-mono font-bold text-slate-900">{invoiceToDelete.totalAmount.toLocaleString('ar-DZ')} د.ج</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>المدفوع:</span>
                  <span className="font-mono font-bold text-emerald-700">{invoiceToDelete.paidAmount.toLocaleString('ar-DZ')} د.ج</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-slate-600 font-bold">
                  <span>المتبقي:</span>
                  <span className="font-mono text-amber-700">{invoiceToDelete.remainingAmount.toLocaleString('ar-DZ')} د.ج</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInvoiceToDelete(null)}
                  disabled={isDeletingInvoice}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer transition-colors"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteInvoice}
                  disabled={isDeletingInvoice}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingInvoice ? 'جارٍ الحذف...' : 'نعم، حذف الفاتورة'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: MEDICAL INFO QUICK EDIT MODAL                         */}
      {/* ============================================================== */}
      {isMedicalEditOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>تعديل المعلومات الطبية والسوابق</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsMedicalEditOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMedicalInfo} className="p-5 space-y-3.5 text-xs text-slate-800">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>سجل الحساسية الدوائية والغذائية:</span>
                </label>
                <input
                  type="text"
                  value={medAllergies}
                  onChange={(e) => setMedAllergies(e.target.value)}
                  placeholder="مثال: حساسية البنسلين، أو لا توجد حساسية معروفة"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-emerald-500" />
                  <span>الأمراض المزمنة والسوابق:</span>
                </label>
                <input
                  type="text"
                  value={medDisease}
                  onChange={(e) => setMedDisease(e.target.value)}
                  placeholder="مثال: ضغط الدم، سكري، أو سليم"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80">
                <MedicationSelector
                  value={medMedications}
                  onChange={setMedMedications}
                  label="الأدوية التي تناولها / الأدوية الحالية للمريض:"
                  placeholder="انقر هنا لاختيار أو كتابة الأدوية المتناولة..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>ملاحظات عامة:</span>
                </label>
                <textarea
                  rows={2}
                  value={medGeneralNote}
                  onChange={(e) => setMedGeneralNote(e.target.value)}
                  placeholder="تحتاج إلى متابعة دورية..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMedicalEditOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  حفظ المعلومات الطبية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FULL SCREEN DENTAL FILE VIEWER                                 */}
      {/* ============================================================== */}
      {previewFile && (
        <DentalFileViewer
          file={previewFile}
          patientName={patient.fullName}
          currentIndex={previewFileIndex}
          totalFiles={files.length}
          onClose={() => setPreviewFileIndex(-1)}
          onNext={previewFileIndex < files.length - 1 ? () => setPreviewFileIndex(i => i + 1) : undefined}
          onPrev={previewFileIndex > 0 ? () => setPreviewFileIndex(i => i - 1) : undefined}
          onDelete={(id) => {
            onDeleteFile(id);
            setPreviewFileIndex(-1);
          }}
        />
      )}

      {/* Clinical Follow-Up Modal */}
      <FollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => {
          setIsFollowUpModalOpen(false);
          setEditingFollowUp(null);
        }}
        onSaved={() => {
          setIsFollowUpModalOpen(false);
          setEditingFollowUp(null);
          loadPatientFollowUps();
        }}
        patients={[patient]}
        preSelectedPatientId={patient.id}
        initialRecord={editingFollowUp}
        onShowToast={onShowToast}
      />
    </div>
  );
};
