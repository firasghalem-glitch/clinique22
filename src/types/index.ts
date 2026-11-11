export interface User {
  id: string;
  clinicId?: string;
  clinicName?: string;
  username: string;
  fullName: string;
  role: 'doctor' | 'assistant';
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Patient {
  id: string;
  clinicId?: string;
  fullName: string;
  phone: string;
  birthDate: string;
  gender: 'male' | 'female';
  address: string;
  allergies: string;
  patientType: 'new' | 'returning';
  diseaseCondition?: string; // e.g. "علاج تسوس الأسنان", "جراحة الفم والفكين", "تقويم الأسنان"
  diseaseStatus?: 'active' | 'under_treatment' | 'completed' | 'stable' | 'urgent';
  medications?: string; // e.g. "الأدوية التي تناولها / الأدوية الحالية"
  notes?: string;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  procedure: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  cost?: number; // DZD (دينار جزائري)
  paymentMethod?: 'cash' | 'baridimob' | 'check';
  notes?: string;
  createdAt: string;
}

export interface FinancialStats {
  totalRevenueYear: number;
  totalRevenueMonth: number;
  totalRevenueWeek: number;
  totalCompletedAppointments: number;
  averagePerAppointment: number;
  monthlyRevenue: {
    month: string;
    monthLabel: string;
    revenue: number;
    completedCount: number;
  }[];
  weeklyRevenue: {
    weekLabel: string;
    weekNumber: number;
    startDate: string;
    endDate: string;
    revenue: number;
    completedCount: number;
  }[];
  dailyRevenueThisWeek: {
    dayName: string;
    date: string;
    revenue: number;
    count: number;
  }[];
  procedureBreakdown: {
    procedure: string;
    revenue: number;
    count: number;
    percentage: number;
  }[];
}

export type ToothSurface = 'Occlusal' | 'Mesial' | 'Distal' | 'Buccal' | 'Lingual' | 'Incisal' | 'All';

export interface ToothSurfaceCondition {
  surface: ToothSurface | string;
  conditionType: string;
  diagnosis?: string;
  treatmentPlanned?: string;
  treatmentDone?: string;
  status: 'in_progress' | 'treated' | 'monitoring';
  cost?: number;
  notes?: string;
  updatedAt?: string;
}

export interface ConditionHistoryEntry {
  id: string;
  date: string;
  conditionType: string;
  surface?: string;
  surfaces?: string[];
  diagnosis?: string;
  treatmentPlanned?: string;
  treatmentDone?: string;
  status: 'in_progress' | 'treated' | 'monitoring';
  doctorName?: string;
  cost?: number;
  notes?: string;
}

export interface DentalCondition {
  id: string;
  patientId: string;
  toothNumber: number; // 11-48 for permanent, 51-85 for deciduous
  conditionType: string;
  surface?: ToothSurface | string;
  surfaces?: string[]; // e.g. ['O', 'M', 'D', 'B', 'L']
  surfaceDetails?: Record<string, ToothSurfaceCondition>;
  diagnosis?: string;
  treatmentPlanned?: string;
  treatmentDone?: string;
  doctorName?: string;
  status: 'in_progress' | 'treated' | 'monitoring';
  cost?: number; // DZD
  recordedDate: string;
  notes?: string;
  visitId?: string;
  history?: ConditionHistoryEntry[];
  updatedAt?: string;
  createdAt: string;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  noteText: string;
  doctorName: string;
  createdAt: string;
}

export interface PatientFile {
  id: string;
  patientId: string;
  originalName: string;
  storedName: string;
  filePath?: string;
  fileSize: number;
  mimeType: string;
  category: string;
  uploadDate: string;
  dataUrl?: string; // For client-side preview fallback
}

export interface ClinicSettings {
  clinicName: string;
  doctorName: string;
  phone: string;
  address: string;
  storagePath: string;
  autoBackupDaily: boolean;
  diseasePrices?: Record<string, number>;
  customDiseases?: any[];
  customMedications?: any[];
}

export interface NetworkInfo {
  port: number;
  localUrl: string;
  networkUrls: string[];
  primaryLanIp: string;
}

export interface DashboardStats {
  todayAppointmentsCount: number;
  todayAppointmentsCompleted: number;
  todayAppointmentsScheduled: number;
  todayAppointmentsCancelled?: number;
  todayNewPatientsCount?: number;
  newPatientsThisMonth: number;
  returningPatientsCount: number;
  newPatientsCount: number;
  totalPatientsCount: number;
  activePatientsCount?: number;
  trashedPatientsCount?: number;
  todayAppointmentsList: Appointment[];
  upcomingAppointmentsList: Appointment[];
  monthlyDistribution: { month: string; monthLabel: string; count: number }[];
  yearlyDistribution?: {
    month: string;
    monthLabel: string;
    shortLabel: string;
    newPatients: number;
    year: number;
  }[];
  currentYear?: number;
}

export interface DateStats {
  date: string;
  totalAppointments: number;
  completedAppointments: number;
  scheduledAppointments: number;
  cancelledAppointments: number;
  newPatientsCount: number;
  appointmentsList: Appointment[];
  newPatientsList?: { id: string; fullName: string; phone: string; createdAt: string }[];
}

export interface BeforeAfterCase {
  id: string;
  clinicId?: string;
  patientId: string;
  patientName: string;
  category: string; // e.g. "تجميل الأسنان (هوليوود سمايل)", "تقويم الأسنان", "تبييض الأسنان", "زراعة وتركيبات", "علاج وترميم"
  procedureTitle: string;
  technique?: string;
  procedureDate: string; // YYYY-MM-DD
  toothNumbers?: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeNotes?: string;
  afterNotes?: string;
  clinicalNotes?: string;
  doctorName?: string;
  duration?: string; // e.g. "3 جلسات (شهران)"
  shadeBefore?: string; // e.g. "A3", "A3.5"
  shadeAfter?: string; // e.g. "A1", "BL1", "B1"
  shadeJump?: string; // e.g. "+7 درجات", "+15 درجة"
  createdAt: string;
  updatedAt?: string;
}

export interface InvoicePayment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // DZD
  paymentMethod: 'cash' | 'baridimob' | 'check';
  note?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  clinicId?: string;
  patientId: string;
  appointmentId?: string;
  date: string; // YYYY-MM-DD
  description: string;
  totalAmount: number; // DZD
  paidAmount: number; // DZD
  remainingAmount: number; // DZD
  paymentMethod: 'cash' | 'baridimob' | 'check';
  status: 'paid' | 'partial' | 'unpaid';
  notes?: string;
  payments?: InvoicePayment[];
  createdAt: string;
  updatedAt?: string;
}

export interface FinancialStats {
  totalRevenueYear: number;
  totalRevenueMonth: number;
  totalRevenueWeek: number;
  totalRemaining: number;
  totalCompletedAppointments: number;
  averagePerAppointment: number;
  monthlyRevenue: {
    month: string;
    monthLabel: string;
    revenue: number;
    completedCount: number;
  }[];
  weeklyRevenue: {
    weekLabel: string;
    weekNumber: number;
    startDate: string;
    endDate: string;
    revenue: number;
    completedCount: number;
  }[];
  dailyRevenueThisWeek: {
    dayName: string;
    date: string;
    revenue: number;
    count: number;
  }[];
  procedureBreakdown: {
    procedure: string;
    revenue: number;
    count: number;
    percentage: number;
  }[];
}

export type FollowUpReason =
  | 'استكمال علاج'
  | 'علاج متعدد الجلسات'
  | 'مراقبة بعد عملية'
  | 'مراجعة بعد العلاج'
  | 'أسباب أخرى';

export type FollowUpPriority = 'normal' | 'high' | 'urgent';

export type FollowUpStatus = 'pending' | 'due' | 'overdue' | 'completed' | 'cancelled';

export interface FollowUpRecord {
  id: string;
  clinicId: string;
  patientId: string;
  reason: FollowUpReason | string;
  nextProcedure: string;
  targetDate?: string; // YYYY-MM-DD
  priority: FollowUpPriority;
  status: FollowUpStatus;
  notes?: string;
  appointmentId?: string;
  doctorName?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface FollowUpPatientItem {
  id: string; // Patient ID
  followUpId?: string;
  fullName: string;
  phone: string;
  createdAt: string;
  lastVisitDate: string;
  daysSinceLastVisit: number;
  diseaseCondition?: string;
  diseaseStatus?: string;
  reason: string;
  // Specific Follow-up Record Details
  followUpReason?: string;
  nextProcedure?: string;
  targetDate?: string;
  priority?: FollowUpPriority;
  followUpStatus?: FollowUpStatus;
  followUpNotes?: string;
  appointmentId?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface DiseaseCountItem {
  name: string;
  count: number;
}

export interface FollowUpOverview {
  allPatients: {
    count: number;
    list: FollowUpPatientItem[];
  };
  followUp: {
    count: number;
    list: FollowUpPatientItem[];
  };
  notReturned: {
    count: number;
    list: FollowUpPatientItem[];
  };
  completedFollowUps?: {
    count: number;
    list: FollowUpPatientItem[];
  };
  topDisease: DiseaseCountItem;
  topDiseases: DiseaseCountItem[];
}

