import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { encryptionService } from './security/encryptionService';
import {
  getClinicTodayStr,
  getClinicYear,
  getClinicMonthPrefix,
  getClinicWeekRange,
  getClinicDateOffsetStr
} from './clinicDate';

export interface Clinic {
  id: string; // e.g. "cln_default" or "cln_..."
  name: string;
  doctorName: string;
  ownerUserId: string;
  phone: string;
  address: string;
  storagePath: string;
  autoBackupDaily: boolean;
  diseasePrices?: Record<string, number>;
  customDiseases?: any[];
  customMedications?: any[];
  createdAt: string;
}

export interface User {
  id: string;
  clinicId: string;
  username: string;
  passwordHash: string;
  salt: string;
  recoveryKeyHash?: string;
  fullName: string;
  role: 'doctor' | 'assistant';
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Patient {
  id: string;
  clinicId: string;
  fullName: string;
  phone: string;
  birthDate: string;
  gender: 'male' | 'female';
  address: string;
  allergies: string;
  patientType: 'new' | 'returning';
  diseaseCondition?: string;
  diseaseStatus?: string;
  medications?: string;
  notes?: string;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm (e.g. 09:30)
  procedure: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  cost?: number; // DZD
  paymentMethod?: 'cash' | 'baridimob' | 'check';
  notes?: string;
  createdAt: string;
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
  clinicId: string;
  patientId: string;
  toothNumber: number; // 11 to 48 (permanent), 51 to 85 (deciduous)
  conditionType: string;
  surface?: string;
  surfaces?: string[];
  surfaceDetails?: Record<string, any>;
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
  clinicId: string;
  patientId: string;
  noteText: string;
  doctorName: string;
  createdAt: string;
}

export interface PatientFile {
  id: string;
  clinicId: string;
  patientId: string;
  originalName: string;
  storedName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  category: string;
  uploadDate: string;
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

export interface BeforeAfterCase {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  category: string;
  procedureTitle: string;
  technique?: string;
  procedureDate: string;
  toothNumbers?: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeNotes?: string;
  afterNotes?: string;
  clinicalNotes?: string;
  doctorName?: string;
  duration?: string;
  shadeBefore?: string;
  shadeAfter?: string;
  shadeJump?: string;
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
  clinicId: string;
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

export interface DatabaseState {
  clinics: Clinic[];
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  dentalConditions: DentalCondition[];
  clinicalNotes: ClinicalNote[];
  patientFiles: PatientFile[];
  invoices?: Invoice[];
  beforeAfterCases?: BeforeAfterCase[];
  followUps?: FollowUpRecord[];
  settings?: ClinicSettings;
  patientCounters?: Record<string, number>;
}

export function resolveDataDir(): string {
  const envDir = process.env.DATA_DIR?.trim();
  if (envDir) {
    return path.isAbsolute(envDir) ? envDir : path.resolve(process.cwd(), envDir);
  }
  return path.resolve(process.cwd(), 'clinic_data');
}

export const DATA_DIR = resolveDataDir();
export const ENC_DB_FILE = path.join(DATA_DIR, 'clinic_database.enc');
export const LEGACY_DB_FILE = path.join(DATA_DIR, 'clinic_database.json');
export const DB_FILE = ENC_DB_FILE;
export const DEFAULT_STORAGE_PATH = path.join(DATA_DIR, 'patient_files');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

export function isPersistentEnvironment(): boolean {
  if (process.env.K_SERVICE || process.env.K_REVISION || process.env.CLOUD_RUN_JOB) {
    return false;
  }
  const appUrl = (process.env.APP_URL || '').toLowerCase();
  if (appUrl.includes('run.app')) {
    return false;
  }
  return true;
}

export function getStorageType(): 'persistent_local' | 'ephemeral_cloud' {
  return isPersistentEnvironment() ? 'persistent_local' : 'ephemeral_cloud';
}

export function getDbFilePath(): string {
  return DB_FILE;
}

export function getDataDirPath(): string {
  return DATA_DIR;
}

export function hashPassword(password: string, salt: string): string {
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return derivedKey.toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
}

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export class ClinicDatabase {
  private state: DatabaseState;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDirectories();
    this.state = this.loadState();
    this.migrateExistingCompletedCostsToInvoices();
    try {
      this.autoPurgeExpiredDeletedPatients();
    } catch (e) {
      console.warn('Initial autoPurge check warning:', e);
    }
  }

  public getDbFilePath(): string {
    return DB_FILE;
  }

  public getDataDirPath(): string {
    return DATA_DIR;
  }

  public getState(): DatabaseState {
    return this.state;
  }

  private ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DEFAULT_STORAGE_PATH)) {
      fs.mkdirSync(DEFAULT_STORAGE_PATH, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
  }

  public getStoragePath(clinicId?: string): string {
    const clinic = clinicId ? this.getClinicById(clinicId) : this.state.clinics?.[0];
    const configuredPath = clinic?.storagePath || this.state.settings?.storagePath;
    if (configuredPath && configuredPath.trim()) {
      try {
        const resolved = path.isAbsolute(configuredPath.trim())
          ? configuredPath.trim()
          : path.resolve(process.cwd(), configuredPath.trim());
        if (!fs.existsSync(resolved)) {
          fs.mkdirSync(resolved, { recursive: true });
        }
        return resolved;
      } catch (err) {
        console.warn('Could not initialize custom storage path, fallback to default:', err);
      }
    }
    return DEFAULT_STORAGE_PATH;
  }

  public getPatientFolderPath(patient: Patient): string {
    const rootPath = this.getStoragePath(patient.clinicId);
    const clinicSubfolder = patient.clinicId ? `clinic_${patient.clinicId}` : 'clinic_default';
    const folderName = `${sanitizeFolderName(patient.fullName)}_${patient.id}`;
    const fullPath = path.join(rootPath, clinicSubfolder, folderName);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
  }

  private tryRestoreFromBackups(): DatabaseState | null {
    // Check rolling backups (.enc preferred, then legacy .json)
    const backupCandidates = [
      path.join(DATA_DIR, 'clinic_database.bak1.enc'),
      path.join(DATA_DIR, 'clinic_database.bak2.enc'),
      path.join(DATA_DIR, 'clinic_database.bak3.enc'),
      path.join(DATA_DIR, 'clinic_database.bak4.enc'),
      path.join(DATA_DIR, 'clinic_database.bak5.enc'),
      path.join(DATA_DIR, 'clinic_database.bak1.json'),
      path.join(DATA_DIR, 'clinic_database.bak2.json'),
      path.join(DATA_DIR, 'clinic_database.bak3.json'),
      path.join(DATA_DIR, 'clinic_database.bak4.json'),
      path.join(DATA_DIR, 'clinic_database.bak5.json'),
    ];

    // Also check daily backups in BACKUPS_DIR
    if (fs.existsSync(BACKUPS_DIR)) {
      try {
        const dailyEnc = fs.readdirSync(BACKUPS_DIR)
          .filter(f => f.startsWith('clinic_database_') && f.endsWith('.enc'))
          .sort()
          .reverse()
          .map(f => path.join(BACKUPS_DIR, f));
        const dailyJson = fs.readdirSync(BACKUPS_DIR)
          .filter(f => f.startsWith('clinic_database_') && f.endsWith('.json'))
          .sort()
          .reverse()
          .map(f => path.join(BACKUPS_DIR, f));
        backupCandidates.push(...dailyEnc, ...dailyJson);
      } catch {}
    }

    for (const candidate of backupCandidates) {
      if (fs.existsSync(candidate)) {
        try {
          const rawBuffer = fs.readFileSync(candidate);
          let jsonStr: string;
          if (encryptionService.isEncrypted(rawBuffer)) {
            jsonStr = encryptionService.decryptBuffer(rawBuffer, 'db').toString('utf-8');
          } else {
            jsonStr = rawBuffer.toString('utf-8');
          }
          const bParsed = JSON.parse(jsonStr);
          const restoredState = this.migrateAndSanitizeState(bParsed);
          console.warn(`[DATABASE RECOVERY] Successfully recovered database state from backup: ${candidate}`);
          this.saveStateSync(restoredState);
          return restoredState;
        } catch (bErr) {
          console.warn(`[DATABASE RECOVERY] Backup candidate ${candidate} was not parseable:`, bErr);
        }
      }
    }

    return null;
  }

  private loadState(): DatabaseState {
    // 1. Try loading encrypted database (ENC_DB_FILE)
    if (fs.existsSync(ENC_DB_FILE)) {
      try {
        const rawBuffer = fs.readFileSync(ENC_DB_FILE);
        let jsonStr: string;
        if (encryptionService.isEncrypted(rawBuffer)) {
          jsonStr = encryptionService.decryptBuffer(rawBuffer, 'db').toString('utf-8');
        } else {
          // If for some reason unencrypted content is in ENC_DB_FILE, read and encrypt
          jsonStr = rawBuffer.toString('utf-8');
        }
        const parsed = JSON.parse(jsonStr);
        return this.migrateAndSanitizeState(parsed);
      } catch (err: any) {
        console.error(`[DATABASE CRITICAL] Error reading or decrypting ${ENC_DB_FILE}:`, err);
        const corruptFile = path.join(DATA_DIR, `clinic_database.corrupt-${Date.now()}.enc`);
        try {
          fs.copyFileSync(ENC_DB_FILE, corruptFile);
          console.warn(`[DATABASE SAFETY] Preserved corrupt database file to: ${corruptFile}`);
        } catch (copyErr) {
          console.error(`[DATABASE SAFETY] Could not preserve corrupt file:`, copyErr);
        }

        const restored = this.tryRestoreFromBackups();
        if (restored) return restored;

        throw new Error(`تعذّر الوصول إلى قاعدة بيانات العيادة: ملف البيانات المشفر تالف ولا توجد نسخ احتياطية قابلة للاستعادة.`);
      }
    }

    // 2. Migration: Check if legacy unencrypted clinic_database.json exists
    if (fs.existsSync(LEGACY_DB_FILE)) {
      try {
        console.log('[SECURITY MIGRATION] Found unencrypted clinic_database.json. Migrating to AES-256-GCM encrypted database...');
        const raw = fs.readFileSync(LEGACY_DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const state = this.migrateAndSanitizeState(parsed);

        // Save encrypted database immediately
        this.saveStateSync(state);

        // Verify that ENC_DB_FILE can be read and decrypted with complete integrity
        const checkEnc = fs.readFileSync(ENC_DB_FILE);
        const verifiedDec = encryptionService.decryptBuffer(checkEnc, 'db');
        if (verifiedDec && verifiedDec.length > 0) {
          // Archive legacy unencrypted file (preserving original backup without loss)
          const archivePath = `${LEGACY_DB_FILE}.unencrypted_archive`;
          fs.renameSync(LEGACY_DB_FILE, archivePath);
          console.log(`[SECURITY MIGRATION] Migration verified! Original unencrypted database safely preserved at: ${archivePath}`);
        }

        // Encrypt any existing patient files (X-rays, PDFs, images) on disk
        this.migrateExistingPatientFiles();

        return state;
      } catch (migErr: any) {
        console.error('[SECURITY MIGRATION ERROR] Failed migrating legacy database:', migErr);
      }
    }

    // 3. Auto-restore from backups if available
    console.warn(`[DATABASE RECOVERY] ملف قاعدة البيانات غير موجود. جاري البحث في النسخ الاحتياطية المتاحة...`);
    const restoredFromBackup = this.tryRestoreFromBackups();
    if (restoredFromBackup) {
      console.log(`[DATABASE RECOVERY] تم استعادة قاعدة البيانات تلقائياً من أحدث نسخة احتياطية سليمة بنجاح.`);
      return restoredFromBackup;
    }

    // 4. Initial clean seed if brand new installation
    console.log(`[DATABASE INITIALIZATION] No database file found. Creating initial clean encrypted state.`);
    const defaultState = this.createInitialSeed();
    this.saveStateSync(defaultState);
    return defaultState;
  }

  private migrateAndSanitizeState(parsed: any): DatabaseState {
    parsed.patients = parsed.patients || [];
    parsed.appointments = parsed.appointments || [];
    parsed.dentalConditions = parsed.dentalConditions || [];
    parsed.clinicalNotes = parsed.clinicalNotes || [];
    parsed.patientFiles = parsed.patientFiles || [];
    parsed.beforeAfterCases = parsed.beforeAfterCases || [];
    parsed.followUps = parsed.followUps || [];
    parsed.users = parsed.users || [];
    parsed.invoices = parsed.invoices || [];

    // Ensure clinics array exists
    if (!parsed.clinics || !Array.isArray(parsed.clinics) || parsed.clinics.length === 0) {
      const defaultClinic: Clinic = {
        id: 'cln-default',
        name: parsed.settings?.clinicName || 'عيادة النور لطب وجراحة الأسنان',
        doctorName: parsed.settings?.doctorName || 'طبيب العيادة',
        ownerUserId: parsed.users?.[0]?.id || '',
        phone: parsed.settings?.phone || '023 45 67 89 / 0550 11 22 33',
        address: parsed.settings?.address || 'الجزائر العاصمة',
        storagePath: parsed.settings?.storagePath || DEFAULT_STORAGE_PATH,
        autoBackupDaily: parsed.settings?.autoBackupDaily !== false,
        createdAt: new Date().toISOString(),
      };
      parsed.clinics = [defaultClinic];
    }

    const defaultClinicId = parsed.clinics[0]?.id || 'cln-default';

    // Migrate any entities missing clinicId
    for (const u of parsed.users) {
      if (!u.clinicId) u.clinicId = defaultClinicId;
    }
    for (const p of parsed.patients) {
      if (!p.clinicId) p.clinicId = defaultClinicId;
    }
    for (const a of parsed.appointments) {
      if (!a.clinicId) a.clinicId = defaultClinicId;
    }
    for (const c of parsed.dentalConditions) {
      if (!c.clinicId) c.clinicId = defaultClinicId;
    }
    for (const n of parsed.clinicalNotes) {
      if (!n.clinicId) n.clinicId = defaultClinicId;
    }
    for (const f of parsed.patientFiles) {
      if (!f.clinicId) f.clinicId = defaultClinicId;
    }
    for (const b of parsed.beforeAfterCases) {
      if (!b.clinicId) b.clinicId = defaultClinicId;
    }
    for (const flw of parsed.followUps) {
      if (!flw.clinicId) flw.clinicId = defaultClinicId;
    }
    for (const inv of parsed.invoices) {
      if (!inv.clinicId) inv.clinicId = defaultClinicId;
    }

    // Do NOT re-create any hardcoded default user if users array is empty!
    // Empty users array means isFirstTimeSetup is true, allowing director setup in UI.

    return parsed as DatabaseState;
  }

  private createInitialSeed(): DatabaseState {
    const defaultClinicId = 'cln-default';

    const defaultClinic: Clinic = {
      id: defaultClinicId,
      name: 'عيادة طب وجراحة الأسنان',
      doctorName: 'طبيب العيادة',
      ownerUserId: '',
      phone: '023 45 67 89 / 0550 11 22 33',
      address: 'الجزائر العاصمة',
      storagePath: DEFAULT_STORAGE_PATH,
      autoBackupDaily: true,
      createdAt: new Date().toISOString(),
    };

    // Clean initial state with no hardcoded users - director creates own account
    return {
      clinics: [defaultClinic],
      users: [],
      patients: [],
      appointments: [],
      dentalConditions: [],
      clinicalNotes: [],
      patientFiles: [],
      invoices: [],
      beforeAfterCases: [],
      followUps: [],
    };
  }

  public migrateExistingPatientFiles(): { migratedCount: number } {
    let count = 0;
    try {
      const storageRoot = DEFAULT_STORAGE_PATH;
      if (!fs.existsSync(storageRoot)) return { migratedCount: 0 };

      const scanAndEncrypt = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanAndEncrypt(fullPath);
          } else if (entry.isFile()) {
            if (entry.name.endsWith('.tmp') || entry.name.endsWith('.unencrypted_archive')) continue;
            try {
              const fileData = fs.readFileSync(fullPath);
              if (!encryptionService.isEncrypted(fileData)) {
                encryptionService.encryptFile(fullPath, fullPath, 'files');
                count++;
                console.log(`[FILE ENCRYPTION] Encrypted patient file: ${entry.name}`);
              }
            } catch (fErr) {
              console.warn(`[FILE ENCRYPTION WARN] Could not encrypt ${fullPath}:`, fErr);
            }
          }
        }
      };

      scanAndEncrypt(storageRoot);
    } catch (err) {
      console.warn('[FILE ENCRYPTION ERROR] Error scanning patient files:', err);
    }
    return { migratedCount: count };
  }

  private rotateBackups() {
    try {
      if (!fs.existsSync(ENC_DB_FILE)) return;

      // Keep last 5 rotating encrypted backups: bak1.enc (newest) .. bak5.enc
      for (let i = 4; i >= 1; i--) {
        const src = path.join(DATA_DIR, `clinic_database.bak${i}.enc`);
        const dest = path.join(DATA_DIR, `clinic_database.bak${i + 1}.enc`);
        if (fs.existsSync(src)) {
          try {
            fs.copyFileSync(src, dest);
          } catch {}
        }
      }

      // Copy verified ENC_DB_FILE to bak1.enc
      fs.copyFileSync(ENC_DB_FILE, path.join(DATA_DIR, 'clinic_database.bak1.enc'));
    } catch (err) {
      console.warn('[DATABASE BACKUP WARN] Error rotating encrypted backups:', err);
    }
  }

  private performDailyBackup() {
    try {
      if (!fs.existsSync(ENC_DB_FILE)) return;
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }

      const todayStr = getClinicTodayStr();
      const todayBackupFile = path.join(BACKUPS_DIR, `clinic_database_${todayStr}.enc`);

      // Only backup once per day
      if (!fs.existsSync(todayBackupFile)) {
        fs.copyFileSync(ENC_DB_FILE, todayBackupFile);
        console.log(`[DAILY BACKUP] Created encrypted daily backup: ${todayBackupFile}`);
      }

      // Cleanup backups older than 14 days
      const files = fs.readdirSync(BACKUPS_DIR);
      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      for (const file of files) {
        if (file.startsWith('clinic_database_') && (file.endsWith('.enc') || file.endsWith('.json'))) {
          const filePath = path.join(BACKUPS_DIR, file);
          const stats = fs.statSync(filePath);
          if (stats.mtimeMs < fourteenDaysAgo) {
            fs.unlinkSync(filePath);
            console.log(`[DAILY BACKUP CLEANUP] Removed backup older than 14 days: ${file}`);
          }
        }
      }
    } catch (err) {
      console.warn('[DAILY BACKUP WARN] Error performing daily backup:', err);
    }
  }

  public saveStateSync(state: DatabaseState = this.state) {
    const tempFile = `${ENC_DB_FILE}.tmp.${Date.now()}`;
    const serialized = JSON.stringify(state, null, 2);
    const encryptedBuffer = encryptionService.encryptBuffer(Buffer.from(serialized, 'utf-8'), 'db');

    // 1. Atomic write with fsync to guarantee flush to physical disk
    const fd = fs.openSync(tempFile, 'w');
    fs.writeFileSync(fd, encryptedBuffer);
    fs.fsyncSync(fd);
    fs.closeSync(fd);

    // 2. Rotate previous 5 versions before replacing
    this.rotateBackups();

    // 3. Atomic rename
    fs.renameSync(tempFile, ENC_DB_FILE);

    // 4. Daily backup
    this.performDailyBackup();
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveStateSync(this.state);
  }

  // ================= CLINICS MANAGEMENT =================
  public getAllClinics(): Clinic[] {
    return this.state.clinics || [];
  }

  public getClinicById(clinicId: string): Clinic | undefined {
    return (this.state.clinics || []).find(c => c.id === clinicId);
  }

  public reloadFromDisk(): DatabaseState {
    this.state = this.loadState();
    return this.state;
  }

  public createClinic(params: {
    clinicName: string;
    doctorName: string;
    username: string;
    passwordHash: string;
    salt: string;
    recoveryKeyHash?: string;
  }): { clinic: Clinic; user: User } {
    const clinicId = `cln_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newClinic: Clinic = {
      id: clinicId,
      name: params.clinicName.trim() || 'عيادة طب الأسنان',
      doctorName: params.doctorName.trim() || 'د. المشرف',
      ownerUserId: userId,
      phone: '',
      address: '',
      storagePath: DEFAULT_STORAGE_PATH,
      autoBackupDaily: true,
      createdAt: now,
    };

    const newUser: User = {
      id: userId,
      clinicId,
      username: params.username.trim().toLowerCase(),
      fullName: params.doctorName.trim() || 'طبيب العيادة',
      passwordHash: params.passwordHash,
      salt: params.salt,
      recoveryKeyHash: params.recoveryKeyHash,
      role: 'doctor',
      isActive: true,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    };

    if (!this.state.clinics) this.state.clinics = [];
    if (!this.state.users) this.state.users = [];

    this.state.clinics.push(newClinic);
    this.state.users.push(newUser);
    this.scheduleSave();

    return { clinic: newClinic, user: newUser };
  }

  public getClinicSettings(clinicId: string): ClinicSettings {
    const clinic = this.getClinicById(clinicId) || this.state.clinics?.[0];
    if (clinic) {
      return {
        clinicName: clinic.name,
        doctorName: clinic.doctorName,
        phone: clinic.phone,
        address: clinic.address,
        storagePath: clinic.storagePath,
        autoBackupDaily: clinic.autoBackupDaily,
        diseasePrices: clinic.diseasePrices || {},
        customDiseases: clinic.customDiseases || [],
        customMedications: clinic.customMedications || [],
      };
    }
    return {
      clinicName: 'عيادة طب الأسنان',
      doctorName: 'طبيب العيادة',
      phone: '',
      address: '',
      storagePath: DEFAULT_STORAGE_PATH,
      autoBackupDaily: true,
      diseasePrices: {},
      customDiseases: [],
      customMedications: [],
    };
  }

  public getSettings(clinicId?: string): ClinicSettings {
    return this.getClinicSettings(clinicId || this.state.clinics?.[0]?.id || 'cln-default');
  }

  public updateClinicSettings(clinicId: string, updates: Partial<ClinicSettings>): ClinicSettings {
    let clinic = this.getClinicById(clinicId);
    if (!clinic) {
      clinic = this.state.clinics?.[0];
    }
    if (clinic) {
      if (updates.clinicName !== undefined) clinic.name = updates.clinicName.trim();
      if (updates.doctorName !== undefined) clinic.doctorName = updates.doctorName.trim();
      if (updates.phone !== undefined) clinic.phone = updates.phone.trim();
      if (updates.address !== undefined) clinic.address = updates.address.trim();
      if (updates.storagePath !== undefined) clinic.storagePath = updates.storagePath.trim();
      if (updates.autoBackupDaily !== undefined) clinic.autoBackupDaily = !!updates.autoBackupDaily;
      if (updates.diseasePrices !== undefined) {
        clinic.diseasePrices = { ...(clinic.diseasePrices || {}), ...updates.diseasePrices };
      }
      if (updates.customDiseases !== undefined) {
        clinic.customDiseases = updates.customDiseases;
      }
      if (updates.customMedications !== undefined) {
        clinic.customMedications = updates.customMedications;
      }

      if (updates.storagePath && !fs.existsSync(updates.storagePath)) {
        try {
          fs.mkdirSync(updates.storagePath, { recursive: true });
        } catch (err) {
          console.error('Failed to create custom storage path:', err);
        }
      }
      this.scheduleSave();
      return this.getClinicSettings(clinic.id);
    }
    return updates as ClinicSettings;
  }

  public updateSettings(updates: Partial<ClinicSettings>, clinicId?: string): ClinicSettings {
    return this.updateClinicSettings(clinicId || this.state.clinics?.[0]?.id || 'cln-default', updates);
  }

  // ================= USERS & SECURITY (SCOPED) =================
  public getUsers(clinicId?: string): User[] {
    const list = this.state.users || [];
    if (!clinicId) return list;
    return list.filter(u => u.clinicId === clinicId);
  }

  public getUserById(id: string, clinicId?: string): User | undefined {
    const user = (this.state.users || []).find(u => u.id === id);
    if (!user) return undefined;
    if (clinicId && user.clinicId !== clinicId) return undefined;
    return user;
  }

  public getUserByUsername(username: string): User | undefined {
    if (!username) return undefined;
    const clean = username.toLowerCase().trim();
    const users = this.state.users || [];
    return users.find(u => u.username && u.username.toLowerCase().trim() === clean);
  }

  public getActiveDoctorCount(clinicId?: string): number {
    return this.getUsers(clinicId).filter(u => u.role === 'doctor' && u.isActive).length;
  }

  public createUser(userData: Omit<User, 'id' | 'createdAt'>, clinicId?: string): User {
    const targetClinicId = clinicId || userData.clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    const newUser: User = {
      ...userData,
      clinicId: targetClinicId,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!this.state.users) {
      this.state.users = [];
    }
    this.state.users.push(newUser);
    this.scheduleSave();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>, clinicId?: string): User {
    if (!this.state.users) this.state.users = [];
    const idx = this.state.users.findIndex(u => u.id === id && (!clinicId || u.clinicId === clinicId));
    if (idx === -1) {
      throw new Error('المستخدم غير موجود.');
    }
    const current = this.state.users[idx];
    const updated: User = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.users[idx] = updated;
    this.scheduleSave();
    return updated;
  }

  public deleteUser(id: string, clinicId?: string): boolean {
    if (!this.state.users) return false;
    const idx = this.state.users.findIndex(u => u.id === id && (!clinicId || u.clinicId === clinicId));
    if (idx === -1) return false;
    this.state.users.splice(idx, 1);
    this.scheduleSave();
    return true;
  }

  // ================= PATIENTS (SCOPED) =================
  public getPatients(clinicId?: string): Patient[] {
    const list = this.state.patients || [];
    if (!clinicId) return list.filter(p => !p.deletedAt);
    return list.filter(p => p.clinicId === clinicId && !p.deletedAt);
  }

  public getDeletedPatients(clinicId?: string): Patient[] {
    const list = this.state.patients || [];
    if (!clinicId) return list.filter(p => Boolean(p.deletedAt));
    return list.filter(p => p.clinicId === clinicId && Boolean(p.deletedAt));
  }

  /**
   * Calculates the total number of unique registered patients in the database.
   * Single source of truth.
   * Includes active patients and soft-deleted patients in the trash bin.
   * Excludes only permanently purged patient records.
   * Guaranteed unique by patient ID (no double counting).
   */
  public getTotalRegisteredPatientsCount(clinicId?: string): number {
    const list = this.state.patients || [];
    const scoped = clinicId
      ? list.filter(p => !p.clinicId || p.clinicId === clinicId)
      : list;
    const uniqueIds = new Set(scoped.map(p => p.id));
    return uniqueIds.size;
  }

  public getPatientById(id: string, clinicId?: string, includeDeleted = false): Patient | undefined {
    return (this.state.patients || []).find(
      p => p.id === id && (!clinicId || p.clinicId === clinicId) && (includeDeleted || !p.deletedAt)
    );
  }

  public getNextPatientId(clinicId: string): string {
    if (!this.state.patientCounters) {
      this.state.patientCounters = {};
    }

    if (typeof this.state.patientCounters[clinicId] !== 'number') {
      // Find the highest existing patient number across all patients (active & trashed)
      let maxNum = 1000;
      for (const p of this.state.patients || []) {
        if (p.id && p.id.startsWith('P')) {
          const num = parseInt(p.id.replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      this.state.patientCounters[clinicId] = maxNum;
    }

    this.state.patientCounters[clinicId] += 1;
    const nextNum = this.state.patientCounters[clinicId];
    this.scheduleSave();
    return `P${nextNum}`;
  }

  public createPatient(
    patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'clinicId'> & { clinicId?: string },
    clinicId?: string
  ): Patient {
    const targetClinicId = clinicId || patientData.clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    const newId = this.getNextPatientId(targetClinicId);
    const now = new Date().toISOString();

    const newPatient: Patient = {
      ...patientData,
      id: newId,
      clinicId: targetClinicId,
      createdAt: now,
      updatedAt: now,
    };

    if (!this.state.patients) this.state.patients = [];
    this.state.patients.push(newPatient);
    this.scheduleSave();

    // Ensure folder exists on disk
    try {
      this.getPatientFolderPath(newPatient);
    } catch (e) {}

    return newPatient;
  }

  public updatePatient(id: string, updates: Partial<Patient>, clinicId?: string): Patient | null {
    if (!this.state.patients) this.state.patients = [];
    const index = this.state.patients.findIndex(p => p.id === id && (!clinicId || p.clinicId === clinicId));
    if (index === -1) return null;

    const current = this.state.patients[index];
    const updated: Patient = {
      ...current,
      ...updates,
      id: current.id,
      clinicId: current.clinicId,
      updatedAt: new Date().toISOString(),
    };

    this.state.patients[index] = updated;
    this.scheduleSave();
    return updated;
  }

  /**
   * Soft-delete: Moves patient to Recycle Bin (Trash).
   * Does NOT delete appointments, conditions, invoices, notes, or files.
   */
  public deletePatient(id: string, clinicId?: string, deletedBy?: string): boolean {
    if (!this.state.patients) return false;
    const patient = this.state.patients.find(
      p => p.id === id && (!clinicId || p.clinicId === clinicId) && !p.deletedAt
    );
    if (!patient) return false;

    patient.deletedAt = new Date().toISOString();
    patient.deletedBy = deletedBy || 'طبيب العيادة';
    patient.updatedAt = new Date().toISOString();

    this.scheduleSave();
    return true;
  }

  /**
   * Restores a soft-deleted patient from the Recycle Bin.
   */
  public restorePatient(id: string, clinicId?: string): Patient | null {
    if (!this.state.patients) return null;
    const patient = this.state.patients.find(
      p => p.id === id && (!clinicId || p.clinicId === clinicId) && Boolean(p.deletedAt)
    );
    if (!patient) return null;

    delete patient.deletedAt;
    delete patient.deletedBy;
    patient.updatedAt = new Date().toISOString();

    this.scheduleSave();
    return patient;
  }

  /**
   * Permanent Purge: permanently removes a patient who is currently in the trash,
   * along with cascade deletion of appointments, conditions, notes, files, invoices, and disk files.
   */
  public purgePatient(id: string, clinicId?: string): boolean {
    if (!this.state.patients) return false;
    const patientIndex = this.state.patients.findIndex(
      p => p.id === id && (!clinicId || p.clinicId === clinicId) && Boolean(p.deletedAt)
    );
    if (patientIndex === -1) return false;

    const patient = this.state.patients[patientIndex];

    // 1. Delete physical files on disk
    const filesToDelete = (this.state.patientFiles || []).filter(
      f => f.patientId === id && (!clinicId || f.clinicId === clinicId)
    );
    for (const file of filesToDelete) {
      if (file.filePath && fs.existsSync(file.filePath)) {
        try {
          fs.unlinkSync(file.filePath);
        } catch (err) {
          console.warn(`Failed to unlink physical file ${file.filePath}:`, err);
        }
      }
    }

    // Try to remove patient directory on disk
    try {
      const patientFolder = this.getPatientFolderPath(patient);
      if (fs.existsSync(patientFolder)) {
        fs.rmSync(patientFolder, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`Failed to remove patient folder:`, err);
    }

    // 2. Cascade delete from state
    this.state.patients.splice(patientIndex, 1);
    this.state.appointments = (this.state.appointments || []).filter(
      a => !(a.patientId === id && (!clinicId || a.clinicId === clinicId))
    );
    this.state.dentalConditions = (this.state.dentalConditions || []).filter(
      c => !(c.patientId === id && (!clinicId || c.clinicId === clinicId))
    );
    this.state.clinicalNotes = (this.state.clinicalNotes || []).filter(
      n => !(n.patientId === id && (!clinicId || n.clinicId === clinicId))
    );
    this.state.patientFiles = (this.state.patientFiles || []).filter(
      f => !(f.patientId === id && (!clinicId || f.clinicId === clinicId))
    );
    if (this.state.invoices) {
      this.state.invoices = this.state.invoices.filter(
        inv => !(inv.patientId === id && (!clinicId || inv.clinicId === clinicId))
      );
    }
    if (this.state.beforeAfterCases) {
      this.state.beforeAfterCases = this.state.beforeAfterCases.filter(
        c => !(c.patientId === id && (!clinicId || c.clinicId === clinicId))
      );
    }

    this.scheduleSave();
    return true;
  }

  /**
   * Automatically purges patients that have been in the trash for 30 days or more.
   */
  public autoPurgeExpiredDeletedPatients(): number {
    if (!this.state.patients) return 0;
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expiredList = this.state.patients.filter(p => {
      if (!p.deletedAt) return false;
      const deletedTime = new Date(p.deletedAt).getTime();
      return now - deletedTime >= thirtyDaysMs;
    });

    let purgedCount = 0;
    for (const p of expiredList) {
      if (this.purgePatient(p.id, p.clinicId)) {
        purgedCount++;
      }
    }
    if (purgedCount > 0) {
      console.log(`[Auto-Purge] Purged ${purgedCount} expired trashed patient(s) older than 30 days.`);
    }
    return purgedCount;
  }

  // ================= APPOINTMENTS (SCOPED) =================
  public getAppointments(clinicId?: string): Appointment[] {
    const list = this.state.appointments || [];
    const scoped = clinicId ? list.filter(a => a.clinicId === clinicId) : list;
    const deletedIds = new Set(
      (this.state.patients || [])
        .filter(p => Boolean(p.deletedAt) && (!clinicId || p.clinicId === clinicId))
        .map(p => p.id)
    );
    return scoped.filter(a => !deletedIds.has(a.patientId));
  }

  public getAppointmentById(id: string, clinicId?: string): Appointment | undefined {
    const apt = (this.state.appointments || []).find(a => a.id === id && (!clinicId || a.clinicId === clinicId));
    if (!apt) return undefined;
    const patient = (this.state.patients || []).find(p => p.id === apt.patientId);
    if (patient?.deletedAt) return undefined;
    return apt;
  }

  public createAppointment(
    appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'clinicId'> & { clinicId?: string },
    clinicId?: string
  ): { appointment?: Appointment; error?: string } {
    const targetClinicId = clinicId || appointmentData.clinicId || this.state.clinics?.[0]?.id || 'cln-default';

    // Conflict check in same clinic
    const conflict = (this.state.appointments || []).find(
      a =>
        a.clinicId === targetClinicId &&
        a.appointmentDate === appointmentData.appointmentDate &&
        a.appointmentTime === appointmentData.appointmentTime &&
        a.status === 'scheduled'
    );

    if (conflict) {
      const patient = this.getPatientById(conflict.patientId, targetClinicId);
      return {
        error: `توجد جلسة أخرى محجوزة في هذا التوقيت بالضبط (${appointmentData.appointmentTime}) للمريض "${patient ? patient.fullName : conflict.patientId}".`,
      };
    }

    const newAppointment: Appointment = {
      ...appointmentData,
      clinicId: targetClinicId,
      id: `APT-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };

    if (!this.state.appointments) this.state.appointments = [];
    this.state.appointments.push(newAppointment);
    this.scheduleSave();
    return { appointment: newAppointment };
  }

  public updateAppointment(
    id: string,
    updates: Partial<Appointment>,
    clinicId?: string
  ): { appointment?: Appointment; error?: string } {
    if (!this.state.appointments) this.state.appointments = [];
    const index = this.state.appointments.findIndex(a => a.id === id && (!clinicId || a.clinicId === clinicId));
    if (index === -1) {
      return { error: 'الموعد غير موجود' };
    }

    const current = this.state.appointments[index];
    const targetClinicId = current.clinicId;

    if (updates.appointmentDate && updates.appointmentTime && updates.status !== 'cancelled') {
      const conflict = this.state.appointments.find(
        a =>
          a.id !== id &&
          a.clinicId === targetClinicId &&
          a.appointmentDate === updates.appointmentDate &&
          a.appointmentTime === updates.appointmentTime &&
          a.status === 'scheduled'
      );
      if (conflict) {
        const patient = this.getPatientById(conflict.patientId, targetClinicId);
        return {
          error: `يوجد موعد آخر مسجل في نفس هذا التوقيت (${updates.appointmentTime}) للمريض "${patient ? patient.fullName : conflict.patientId}".`,
        };
      }
    }

    const updated: Appointment = {
      ...current,
      ...updates,
      id: current.id,
      clinicId: current.clinicId,
    };

    this.state.appointments[index] = updated;

    // Synchronize linked invoice when cost or paymentMethod is updated
    if (updates.cost !== undefined || updates.paymentMethod !== undefined) {
      this.state.invoices = this.state.invoices || [];
      const newCost = updates.cost !== undefined ? Number(updates.cost) : (current.cost || 0);
      const newMethod = updates.paymentMethod || current.paymentMethod || 'cash';

      const invIndex = this.state.invoices.findIndex(
        inv => (inv.appointmentId === id || (inv.patientId === current.patientId && inv.date === current.appointmentDate)) &&
               (!clinicId || inv.clinicId === clinicId)
      );

      if (invIndex !== -1) {
        if (updates.cost !== undefined) {
          const inv = this.state.invoices[invIndex];
          const prevPaid = inv.paidAmount || 0;
          const rem = Math.max(0, newCost - prevPaid);
          inv.totalAmount = newCost;
          inv.remainingAmount = rem;
          inv.status = rem === 0 ? 'paid' : (prevPaid > 0 ? 'partial' : 'unpaid');
        }
        if (updates.paymentMethod) {
          this.state.invoices[invIndex].paymentMethod = newMethod;
        }
        this.state.invoices[invIndex].updatedAt = new Date().toISOString();
      } else if (newCost > 0) {
        const invId = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        this.state.invoices.push({
          id: invId,
          clinicId: targetClinicId,
          patientId: current.patientId,
          appointmentId: current.id,
          date: current.appointmentDate || getClinicTodayStr(),
          description: current.procedure || 'كشف ومتابعة',
          totalAmount: newCost,
          paidAmount: 0,
          remainingAmount: newCost,
          paymentMethod: newMethod,
          status: 'unpaid',
          notes: 'فاتورة مسجلة للموعد',
          payments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    this.scheduleSave();
    return { appointment: updated };
  }

  public deleteAppointment(id: string, clinicId?: string): boolean {
    if (!this.state.appointments) return false;
    const initialLen = this.state.appointments.length;
    this.state.appointments = this.state.appointments.filter(a => !(a.id === id && (!clinicId || a.clinicId === clinicId)));
    if (this.state.appointments.length === initialLen) return false;
    this.scheduleSave();
    return true;
  }

  // ================= DENTAL CONDITIONS (SCOPED) =================
  public getDentalConditions(patientId?: string, clinicId?: string): DentalCondition[] {
    let list = this.state.dentalConditions || [];
    if (clinicId) {
      list = list.filter(c => c.clinicId === clinicId);
    }
    if (patientId) {
      list = list.filter(c => c.patientId === patientId);
    }
    return list;
  }

  public createDentalCondition(
    conditionData: Omit<DentalCondition, 'id' | 'createdAt' | 'clinicId'> & { clinicId?: string },
    clinicId?: string
  ): DentalCondition {
    const targetClinicId = clinicId || conditionData.clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    const newCondition: DentalCondition = {
      ...conditionData,
      clinicId: targetClinicId,
      id: `CND-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };
    if (!this.state.dentalConditions) this.state.dentalConditions = [];
    this.state.dentalConditions.push(newCondition);
    this.scheduleSave();
    return newCondition;
  }

  public updateDentalCondition(id: string, updates: Partial<DentalCondition>, clinicId?: string): DentalCondition | null {
    if (!this.state.dentalConditions) this.state.dentalConditions = [];
    const index = this.state.dentalConditions.findIndex(c => c.id === id && (!clinicId || c.clinicId === clinicId));
    if (index === -1) return null;

    const current = this.state.dentalConditions[index];
    const updated: DentalCondition = {
      ...current,
      ...updates,
      id: current.id,
      clinicId: current.clinicId,
      updatedAt: new Date().toISOString(),
    };
    this.state.dentalConditions[index] = updated;
    this.scheduleSave();
    return updated;
  }

  public deleteDentalCondition(id: string, clinicId?: string): boolean {
    if (!this.state.dentalConditions) return false;
    const initialLen = this.state.dentalConditions.length;
    this.state.dentalConditions = this.state.dentalConditions.filter(c => !(c.id === id && (!clinicId || c.clinicId === clinicId)));
    if (this.state.dentalConditions.length === initialLen) return false;
    this.scheduleSave();
    return true;
  }

  // ================= CLINICAL NOTES (SCOPED) =================
  public getClinicalNotes(patientId: string, clinicId?: string): ClinicalNote[] {
    let list = this.state.clinicalNotes || [];
    if (clinicId) {
      list = list.filter(n => n.clinicId === clinicId);
    }
    return list.filter(n => n.patientId === patientId);
  }

  public createClinicalNote(
    noteData: Omit<ClinicalNote, 'id' | 'createdAt' | 'clinicId'> & { clinicId?: string },
    clinicId?: string
  ): ClinicalNote {
    const targetClinicId = clinicId || noteData.clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    const newNote: ClinicalNote = {
      ...noteData,
      clinicId: targetClinicId,
      id: `NOT-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };
    if (!this.state.clinicalNotes) this.state.clinicalNotes = [];
    this.state.clinicalNotes.push(newNote);
    this.scheduleSave();
    return newNote;
  }

  public deleteClinicalNote(id: string, clinicId?: string): boolean {
    if (!this.state.clinicalNotes) return false;
    const initialLen = this.state.clinicalNotes.length;
    this.state.clinicalNotes = this.state.clinicalNotes.filter(n => !(n.id === id && (!clinicId || n.clinicId === clinicId)));
    if (this.state.clinicalNotes.length === initialLen) return false;
    this.scheduleSave();
    return true;
  }

  // ================= PATIENT FILES (SCOPED) =================
  public getPatientFiles(patientId?: string, clinicId?: string): PatientFile[] {
    let list = this.state.patientFiles || [];
    if (clinicId) {
      list = list.filter(f => f.clinicId === clinicId);
    }
    if (patientId) {
      list = list.filter(f => f.patientId === patientId);
    }
    return list;
  }

  public addPatientFile(
    fileData: Omit<PatientFile, 'id' | 'uploadDate' | 'clinicId'> & { clinicId?: string },
    clinicId?: string
  ): PatientFile {
    const targetClinicId = clinicId || fileData.clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    const newFile: PatientFile = {
      ...fileData,
      clinicId: targetClinicId,
      id: `FILE-${Date.now().toString().slice(-6)}`,
      uploadDate: new Date().toISOString(),
    };
    if (!this.state.patientFiles) this.state.patientFiles = [];
    this.state.patientFiles.push(newFile);
    this.scheduleSave();
    return newFile;
  }

  public deletePatientFile(id: string, clinicId?: string): boolean {
    if (!this.state.patientFiles) return false;
    const file = this.state.patientFiles.find(f => f.id === id && (!clinicId || f.clinicId === clinicId));
    if (!file) return false;

    if (fs.existsSync(file.filePath)) {
      try {
        fs.unlinkSync(file.filePath);
      } catch (err) {
        console.error('Error deleting physical file:', err);
      }
    }

    this.state.patientFiles = this.state.patientFiles.filter(f => f.id !== id);
    this.scheduleSave();
    return true;
  }

  // ================= BEFORE & AFTER CASES (SCOPED) =================
  public getBeforeAfterCases(patientId?: string, clinicId?: string): BeforeAfterCase[] {
    const targetClinicId = clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    let list = (this.state.beforeAfterCases || []).filter(
      c => (c.clinicId || 'cln-default') === targetClinicId
    );
    if (patientId && patientId.trim()) {
      list = list.filter(c => c.patientId === patientId.trim());
    }
    return list;
  }

  public createBeforeAfterCase(
    data: Omit<BeforeAfterCase, 'id' | 'createdAt' | 'clinicId'> & { clinicId?: string },
    clinicId?: string
  ): BeforeAfterCase {
    const targetClinicId = clinicId || data.clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    const newCase: BeforeAfterCase = {
      ...data,
      clinicId: targetClinicId,
      id: `BAC-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!this.state.beforeAfterCases) this.state.beforeAfterCases = [];
    this.state.beforeAfterCases.unshift(newCase);
    this.scheduleSave();
    return newCase;
  }

  public updateBeforeAfterCase(
    id: string,
    updates: Partial<BeforeAfterCase>,
    clinicId?: string
  ): BeforeAfterCase | null {
    if (!this.state.beforeAfterCases) return null;
    const index = this.state.beforeAfterCases.findIndex(c => c.id === id && (!clinicId || c.clinicId === clinicId));
    if (index === -1) return null;
    const existing = this.state.beforeAfterCases[index];
    const updated: BeforeAfterCase = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.beforeAfterCases[index] = updated;
    this.scheduleSave();
    return updated;
  }

  public deleteBeforeAfterCase(id: string, clinicId?: string): boolean {
    if (!this.state.beforeAfterCases) return false;
    const initialLen = this.state.beforeAfterCases.length;
    this.state.beforeAfterCases = this.state.beforeAfterCases.filter(c => !(c.id === id && (!clinicId || c.clinicId === clinicId)));
    if (this.state.beforeAfterCases.length === initialLen) return false;
    this.scheduleSave();
    return true;
  }

  // ================= DASHBOARD & FINANCIAL STATS (SCOPED) =================
  public getDashboardStats(clinicId: string) {
    const arabicMonths = [
      'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
      'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const patients = this.getPatients(clinicId);
    const appointments = this.getAppointments(clinicId);

    const now = new Date();
    const todayStr = getClinicTodayStr(now);
    const currentMonthPrefix = getClinicMonthPrefix(now);

    const todayAppointments = appointments.filter(a => a.appointmentDate === todayStr);
    const completedToday = todayAppointments.filter(a => a.status === 'completed').length;
    const scheduledToday = todayAppointments.filter(a => a.status === 'scheduled').length;
    const cancelledToday = todayAppointments.filter(a => a.status === 'cancelled').length;

    const todayNewPatients = (this.state.patients || []).filter(
      p => (!clinicId || !p.clinicId || p.clinicId === clinicId) &&
           p.createdAt &&
           getClinicTodayStr(p.createdAt) === todayStr
    ).length;

    const newPatientsThisMonth = patients.filter(
      p => p.patientType === 'new' && p.createdAt && p.createdAt.startsWith(currentMonthPrefix)
    ).length;

    // Single source of truth: total registered unique patients in DB (active + trashed, purged excluded)
    const totalPatients = this.getTotalRegisteredPatientsCount(clinicId);
    const activePatientsCount = patients.length;
    const trashedPatientsCount = (this.state.patients || []).filter(
      p => (!clinicId || !p.clinicId || p.clinicId === clinicId) && Boolean(p.deletedAt)
    ).length;

    const activeFollowUpPatientIds = new Set(
      (this.state.followUps || [])
        .filter(f => (f.clinicId || 'cln-default') === clinicId && ['pending', 'due', 'overdue'].includes(f.status))
        .map(f => f.patientId)
    );
    const returningPatients = patients.filter(
      p => p.patientType === 'returning' || activeFollowUpPatientIds.has(p.id)
    ).length;
    const newPatients = patients.filter(
      p => p.patientType === 'new' && !activeFollowUpPatientIds.has(p.id)
    ).length;

    const upcomingAppointments = appointments
      .filter(a => a.appointmentDate >= todayStr && a.status === 'scheduled')
      .sort((a, b) => (a.appointmentDate + a.appointmentTime).localeCompare(b.appointmentDate + b.appointmentTime))
      .slice(0, 10);

    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const count = patients.filter(p => p.createdAt && p.createdAt.startsWith(mStr)).length;
      monthlyStats.push({
        month: mStr,
        monthLabel: arabicMonths[d.getMonth()],
        count,
      });
    }

    const currentYear = now.getFullYear();
    const yearlyStats = [];
    for (let m = 0; m < 12; m++) {
      const monthNum = String(m + 1).padStart(2, '0');
      const prefix = `${currentYear}-${monthNum}`;
      const count = patients.filter(p => p.createdAt && p.createdAt.startsWith(prefix)).length;
      yearlyStats.push({
        month: monthNum,
        monthLabel: arabicMonths[m],
        shortLabel: arabicMonths[m],
        newPatients: count,
        year: currentYear,
      });
    }

    return {
      todayAppointmentsCount: todayAppointments.length,
      todayAppointmentsCompleted: completedToday,
      todayAppointmentsScheduled: scheduledToday,
      todayAppointmentsCancelled: cancelledToday,
      todayNewPatientsCount: todayNewPatients,
      newPatientsThisMonth,
      returningPatientsCount: returningPatients,
      newPatientsCount: newPatients,
      totalPatientsCount: totalPatients,
      activePatientsCount,
      trashedPatientsCount,
      todayAppointmentsList: todayAppointments.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime)),
      upcomingAppointmentsList: upcomingAppointments,
      monthlyDistribution: monthlyStats,
      yearlyDistribution: yearlyStats,
      currentYear,
    };
  }

  /**
   * Retrieves comprehensive appointment and new patient statistics for a specific date in clinic timezone (Africa/Algiers).
   * Single source of truth from database state.
   * Ensures distinct counts for:
   * - Total appointments on date (totalAppointments)
   * - Completed appointments (completedAppointments)
   * - Scheduled/upcoming appointments (scheduledAppointments)
   * - Cancelled appointments (cancelledAppointments)
   * - New patients registered on date (newPatientsCount)
   * Guaranteed zero duplicate counts.
   */
  public getDateStats(clinicId: string, targetDateStr: string) {
    const cleanDate = targetDateStr ? targetDateStr.trim().slice(0, 10) : getClinicTodayStr();
    const allAppointments = this.getAppointments(clinicId);
    const allPatients = (this.state.patients || []).filter(
      p => (!clinicId || !p.clinicId || p.clinicId === clinicId)
    );

    // Appointments on targetDate (unique by id)
    const dateAppointmentsMap = new Map<string, Appointment>();
    for (const a of allAppointments) {
      if (a.appointmentDate === cleanDate) {
        dateAppointmentsMap.set(a.id, a);
      }
    }
    const dateAppointments = Array.from(dateAppointmentsMap.values());

    const totalAppointments = dateAppointments.length;
    const completedAppointments = dateAppointments.filter(a => a.status === 'completed').length;
    const scheduledAppointments = dateAppointments.filter(a => a.status === 'scheduled').length;
    const cancelledAppointments = dateAppointments.filter(a => a.status === 'cancelled').length;

    // Patients registered on targetDate in Africa/Algiers timezone (unique by id)
    const newPatientsMap = new Map<string, Patient>();
    for (const p of allPatients) {
      if (p.createdAt) {
        const pDate = getClinicTodayStr(p.createdAt);
        if (pDate === cleanDate) {
          newPatientsMap.set(p.id, p);
        }
      }
    }
    const newPatientsCount = newPatientsMap.size;

    return {
      date: cleanDate,
      totalAppointments,
      completedAppointments,
      scheduledAppointments,
      cancelledAppointments,
      newPatientsCount,
      appointmentsList: dateAppointments.sort((a, b) =>
        (a.appointmentTime || '').localeCompare(b.appointmentTime || '')
      ),
      newPatientsList: Array.from(newPatientsMap.values()).map(p => ({
        id: p.id,
        fullName: p.fullName,
        phone: p.phone,
        createdAt: p.createdAt,
      })),
    };
  }

  // ================= PATIENT FOLLOW-UP RECORDS (SCOPED) =================
  public getFollowUps(clinicId: string, statusFilter?: string): FollowUpRecord[] {
    const targetClinicId = clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    let list = (this.state.followUps || []).filter(
      f => (f.clinicId || 'cln-default') === targetClinicId
    );
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter(f => f.status === statusFilter);
    }
    return list;
  }

  public getPatientFollowUps(clinicId: string, patientId: string): FollowUpRecord[] {
    const targetClinicId = clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    return (this.state.followUps || []).filter(
      f => (f.clinicId || 'cln-default') === targetClinicId && f.patientId === patientId
    );
  }

  public createFollowUp(
    clinicId: string,
    data: Omit<FollowUpRecord, 'id' | 'createdAt' | 'clinicId'> & { clinicId?: string }
  ): FollowUpRecord {
    const targetClinicId = clinicId || data.clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    if (!this.state.followUps) this.state.followUps = [];

    // Duplicate prevention: cannot add same patient twice to active follow-up
    const existingActive = this.state.followUps.find(
      f => (f.clinicId || 'cln-default') === targetClinicId &&
           f.patientId === data.patientId &&
           ['pending', 'due', 'overdue'].includes(f.status)
    );
    if (existingActive) {
      throw new Error('المريض مسجل بالفعل في قائمة المتابعة النشطة. يمكنك تعديل بيانات متابعته الحالية بدلاً من إنشاء سجل مكرر.');
    }

    const nowIso = new Date().toISOString();
    const newRecord: FollowUpRecord = {
      ...data,
      id: `FLW-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
      clinicId: targetClinicId,
      status: data.status || 'pending',
      priority: data.priority || 'normal',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.state.followUps.unshift(newRecord);

    // If the patient was previously classified as new, update them as returning now that they are in active follow-up
    const pt = (this.state.patients || []).find(p => p.id === data.patientId);
    if (pt && pt.patientType === 'new') {
      pt.patientType = 'returning';
    }

    this.scheduleSave();
    return newRecord;
  }

  public updateFollowUp(
    clinicId: string,
    id: string,
    updates: Partial<FollowUpRecord>
  ): FollowUpRecord | null {
    if (!this.state.followUps) return null;
    const index = this.state.followUps.findIndex(
      f => f.id === id && (!clinicId || f.clinicId === clinicId)
    );
    if (index === -1) return null;

    const existing = this.state.followUps[index];
    const nowIso = new Date().toISOString();
    const updated: FollowUpRecord = {
      ...existing,
      ...updates,
      updatedAt: nowIso,
    };

    if (updates.status === 'completed' && !existing.completedAt) {
      updated.completedAt = nowIso;
    } else if (updates.status === 'cancelled' && !existing.cancelledAt) {
      updated.cancelledAt = nowIso;
    }

    this.state.followUps[index] = updated;
    this.scheduleSave();
    return updated;
  }

  public deleteFollowUp(clinicId: string, id: string): boolean {
    if (!this.state.followUps) return false;
    const initialLen = this.state.followUps.length;
    this.state.followUps = this.state.followUps.filter(
      f => !(f.id === id && (!clinicId || f.clinicId === clinicId))
    );
    if (this.state.followUps.length === initialLen) return false;
    this.scheduleSave();
    return true;
  }

  // ================= PATIENT FOLLOW-UP OVERVIEW (SCOPED) =================
  public getFollowUpOverview(clinicId: string, noReturnDays: number = 30): FollowUpOverview {
    const targetDays = Number(noReturnDays) > 0 ? Number(noReturnDays) : 30;
    const now = new Date();
    const todayStr = getClinicTodayStr(now);
    const todayTime = new Date(todayStr + 'T00:00:00Z').getTime();

    // Performance: Single query / lookup per table, then compute in-memory
    const patients = this.getPatients(clinicId);
    const appointments = (this.state.appointments || []).filter(a => a.clinicId === clinicId);
    const allFollowUps = (this.state.followUps || []).filter(
      f => (f.clinicId || 'cln-default') === clinicId
    );

    // Group appointments by patientId
    const aptsByPatient = new Map<string, Appointment[]>();
    for (const a of appointments) {
      let list = aptsByPatient.get(a.patientId);
      if (!list) {
        list = [];
        aptsByPatient.set(a.patientId, list);
      }
      list.push(a);
    }

    // Map active follow-up records by patientId
    const activeFollowUpByPatient = new Map<string, FollowUpRecord>();
    for (const f of allFollowUps) {
      if (['pending', 'due', 'overdue'].includes(f.status)) {
        activeFollowUpByPatient.set(f.patientId, f);
      }
    }

    const calcDaysDiff = (dateString: string): number => {
      if (!dateString) return 0;
      const targetStr = dateString.slice(0, 10);
      const targetTime = new Date(targetStr + 'T00:00:00Z').getTime();
      if (isNaN(targetTime)) return 0;
      const diffMs = todayTime - targetTime;
      return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
    };

    const allPatientsList: FollowUpPatientItem[] = [];
    const followUpList: FollowUpPatientItem[] = [];
    const notReturnedList: FollowUpPatientItem[] = [];
    const completedFollowUpsList: FollowUpPatientItem[] = [];

    // Helper to get patient visit info
    const getPatientVisitInfo = (p: Patient) => {
      const ptApts = aptsByPatient.get(p.id) || [];
      const completedApts = ptApts
        .filter(a => a.status === 'completed')
        .sort((a, b) => (b.appointmentDate + b.appointmentTime).localeCompare(a.appointmentDate + a.appointmentTime));

      let lastVisitDate = '';
      let daysSinceLastVisit = 0;
      let hasCompletedVisit = false;

      if (completedApts.length > 0) {
        lastVisitDate = completedApts[0].appointmentDate;
        daysSinceLastVisit = calcDaysDiff(lastVisitDate);
        hasCompletedVisit = true;
      } else {
        lastVisitDate = p.createdAt ? p.createdAt.slice(0, 10) : todayStr;
        daysSinceLastVisit = calcDaysDiff(lastVisitDate);
      }

      return { lastVisitDate, daysSinceLastVisit, hasCompletedVisit, ptApts };
    };

    // 1. Build allPatientsList
    for (const p of patients) {
      const { lastVisitDate, daysSinceLastVisit, hasCompletedVisit } = getPatientVisitInfo(p);
      const activeFlw = activeFollowUpByPatient.get(p.id);

      let reason = '';
      if (activeFlw) {
        reason = `في المتابعة: ${activeFlw.reason}`;
      } else if (hasCompletedVisit) {
        reason = `آخر زيارة منذ ${daysSinceLastVisit} يوماً`;
      } else {
        reason = `مسجل منذ ${daysSinceLastVisit} يوماً`;
      }

      const item: FollowUpPatientItem = {
        id: p.id,
        followUpId: activeFlw?.id,
        fullName: p.fullName,
        phone: p.phone,
        createdAt: p.createdAt,
        lastVisitDate,
        daysSinceLastVisit,
        diseaseCondition: p.diseaseCondition || '',
        diseaseStatus: p.diseaseStatus || '',
        reason,
        followUpReason: activeFlw?.reason,
        nextProcedure: activeFlw?.nextProcedure,
        targetDate: activeFlw?.targetDate,
        priority: activeFlw?.priority,
        followUpStatus: activeFlw ? (
          activeFlw.targetDate && activeFlw.targetDate < todayStr
            ? 'overdue'
            : activeFlw.targetDate && activeFlw.targetDate === todayStr
            ? 'due'
            : 'pending'
        ) : undefined,
        followUpNotes: activeFlw?.notes,
        appointmentId: activeFlw?.appointmentId,
      };

      allPatientsList.push(item);
    }

    // 2. Build intentional followUpList (EXCLUSIVELY patients with active FollowUpRecord!)
    for (const f of allFollowUps) {
      if (!['pending', 'due', 'overdue'].includes(f.status)) continue;
      const p = patients.find(pt => pt.id === f.patientId);
      if (!p) continue;

      const { lastVisitDate, daysSinceLastVisit } = getPatientVisitInfo(p);

      // Dynamic calculation of status based on targetDate
      let dynamicStatus: FollowUpStatus = 'pending';
      let reason = '';

      if (f.targetDate) {
        if (f.targetDate < todayStr) {
          dynamicStatus = 'overdue';
          const overdueDays = calcDaysDiff(f.targetDate);
          reason = `متأخر عن المتابعة منذ ${overdueDays} يوماً`;
        } else if (f.targetDate === todayStr) {
          dynamicStatus = 'due';
          reason = 'حان موعد المتابعة اليوم';
        } else {
          dynamicStatus = 'pending';
          reason = `موعد قادم بتاريخ ${f.targetDate}`;
        }
      } else {
        dynamicStatus = 'pending';
        reason = `قيد المتابعة (${f.reason})`;
      }

      const item: FollowUpPatientItem = {
        id: p.id,
        followUpId: f.id,
        fullName: p.fullName,
        phone: p.phone,
        createdAt: p.createdAt,
        lastVisitDate,
        daysSinceLastVisit,
        diseaseCondition: p.diseaseCondition || '',
        diseaseStatus: p.diseaseStatus || '',
        reason,
        followUpReason: f.reason,
        nextProcedure: f.nextProcedure,
        targetDate: f.targetDate,
        priority: f.priority || 'normal',
        followUpStatus: dynamicStatus,
        followUpNotes: f.notes,
        appointmentId: f.appointmentId,
      };

      followUpList.push(item);
    }

    // Sort followUpList: priority (urgent > high > normal), then status (due > overdue > pending)
    const priorityWeight: Record<FollowUpPriority, number> = {
      urgent: 3,
      high: 2,
      normal: 1,
    };
    const statusWeight: Record<FollowUpStatus, number> = {
      due: 3,
      overdue: 2,
      pending: 1,
      completed: 0,
      cancelled: 0,
    };

    followUpList.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority || 'normal'] || 0) - (priorityWeight[a.priority || 'normal'] || 0);
      if (pDiff !== 0) return pDiff;
      const sDiff = (statusWeight[b.followUpStatus || 'pending'] || 0) - (statusWeight[a.followUpStatus || 'pending'] || 0);
      if (sDiff !== 0) return sDiff;
      return (a.targetDate || '9999').localeCompare(b.targetDate || '9999');
    });

    // 3. Build completedFollowUpsList
    for (const f of allFollowUps) {
      if (f.status !== 'completed') continue;
      const p = patients.find(pt => pt.id === f.patientId);
      if (!p) continue;

      const { lastVisitDate, daysSinceLastVisit } = getPatientVisitInfo(p);

      completedFollowUpsList.push({
        id: p.id,
        followUpId: f.id,
        fullName: p.fullName,
        phone: p.phone,
        createdAt: p.createdAt,
        lastVisitDate,
        daysSinceLastVisit,
        diseaseCondition: p.diseaseCondition || '',
        diseaseStatus: p.diseaseStatus || '',
        reason: 'اكتملت المتابعة',
        followUpReason: f.reason,
        nextProcedure: f.nextProcedure,
        targetDate: f.targetDate,
        priority: f.priority,
        followUpStatus: 'completed',
        followUpNotes: f.notes,
        completedAt: f.completedAt || f.updatedAt || f.createdAt,
      });
    }

    completedFollowUpsList.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

    // 4. Build notReturnedList (absence > noReturnDays without completion or upcoming visit)
    for (const p of patients) {
      const { lastVisitDate, daysSinceLastVisit, ptApts } = getPatientVisitInfo(p);
      const activeFlw = activeFollowUpByPatient.get(p.id);

      const hasScheduledUpcoming = ptApts.some(a => a.status === 'scheduled' && a.appointmentDate >= todayStr);
      if (hasScheduledUpcoming) continue;

      // Condition: either active follow-up overdue by targetDays or last visit > targetDays
      const isOverdueFollowUp = activeFlw && activeFlw.targetDate && calcDaysDiff(activeFlw.targetDate) > 0;
      const isLongAbsence = daysSinceLastVisit > targetDays;

      if (isOverdueFollowUp || isLongAbsence) {
        let reason = '';
        if (isOverdueFollowUp) {
          reason = `متأخر عن متابعة (${activeFlw?.reason}) منذ ${calcDaysDiff(activeFlw?.targetDate || '')} يوماً`;
        } else {
          reason = `غياب منذ ${daysSinceLastVisit} يوماً بلا عودة`;
        }

        notReturnedList.push({
          id: p.id,
          followUpId: activeFlw?.id,
          fullName: p.fullName,
          phone: p.phone,
          createdAt: p.createdAt,
          lastVisitDate,
          daysSinceLastVisit,
          diseaseCondition: p.diseaseCondition || '',
          diseaseStatus: p.diseaseStatus || '',
          reason,
          followUpReason: activeFlw?.reason,
          nextProcedure: activeFlw?.nextProcedure,
          targetDate: activeFlw?.targetDate,
          priority: activeFlw?.priority,
          followUpStatus: isOverdueFollowUp ? 'overdue' : undefined,
        });
      }
    }

    // Sort notReturned from longest absence to shortest
    notReturnedList.sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit);

    // Sort allPatients by createdAt desc
    allPatientsList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // Top Disease:
    // Clean text, normalize Arabic letters, count distinct patients per disease
    // On tie: prioritize newest registered patient
    const diseaseMap = new Map<string, { displayName: string; count: number; newestCreatedAt: string }>();
    for (const p of patients) {
      if (!p.diseaseCondition || !p.diseaseCondition.trim()) continue;
      const raw = p.diseaseCondition.trim();
      const normalized = normalizeArabic(raw);
      if (!normalized) continue;

      const existing = diseaseMap.get(normalized);
      const pCreated = p.createdAt || '';
      if (existing) {
        existing.count += 1;
        if (pCreated > existing.newestCreatedAt) {
          existing.newestCreatedAt = pCreated;
        }
      } else {
        diseaseMap.set(normalized, {
          displayName: raw,
          count: 1,
          newestCreatedAt: pCreated,
        });
      }
    }

    const sortedDiseases = Array.from(diseaseMap.values()).sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.newestCreatedAt.localeCompare(a.newestCreatedAt);
    });

    const topDisease: DiseaseCountItem = sortedDiseases[0]
      ? { name: sortedDiseases[0].displayName, count: sortedDiseases[0].count }
      : { name: 'لا توجد بيانات', count: 0 };

    const topDiseases: DiseaseCountItem[] = sortedDiseases.map(d => ({
      name: d.displayName,
      count: d.count,
    }));

    return {
      allPatients: {
        count: allPatientsList.length,
        list: allPatientsList,
      },
      followUp: {
        count: followUpList.length,
        list: followUpList,
      },
      notReturned: {
        count: notReturnedList.length,
        list: notReturnedList,
      },
      completedFollowUps: {
        count: completedFollowUpsList.length,
        list: completedFollowUpsList,
      },
      topDisease,
      topDiseases,
    };
  }

  // ================= INVOICES (SCOPED PER CLINIC) =================
  public getInvoices(patientId?: string, clinicId?: string): Invoice[] {
    const targetClinicId = clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    let list = (this.state.invoices || []).filter(i => (i.clinicId || 'cln-default') === targetClinicId);
    if (patientId) {
      list = list.filter(i => i.patientId === patientId);
    } else {
      const deletedIds = new Set(
        (this.state.patients || [])
          .filter(p => Boolean(p.deletedAt) && (!clinicId || p.clinicId === targetClinicId))
          .map(p => p.id)
      );
      list = list.filter(i => !deletedIds.has(i.patientId));
    }
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  public getInvoiceById(id: string, clinicId?: string): Invoice | undefined {
    const targetClinicId = clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    return (this.state.invoices || []).find(i => i.id === id && (i.clinicId || 'cln-default') === targetClinicId);
  }

  public createInvoice(
    data: Omit<Invoice, 'id' | 'createdAt' | 'remainingAmount' | 'status' | 'clinicId'> & {
      id?: string;
      clinicId?: string;
      remainingAmount?: number;
      status?: 'paid' | 'partial' | 'unpaid';
    },
    clinicId?: string
  ): Invoice {
    const targetClinicId = clinicId || data.clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    this.state.invoices = this.state.invoices || [];

    const total = typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(String(data.totalAmount)) || 0;
    const paid = typeof data.paidAmount === 'number' ? data.paidAmount : parseFloat(String(data.paidAmount)) || 0;
    const remaining = Math.max(0, total - paid);
    const status: 'paid' | 'partial' | 'unpaid' = remaining === 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
    const invoiceDate = data.date || getClinicTodayStr();
    const paymentMethod = data.paymentMethod || 'cash';

    const payments: InvoicePayment[] = Array.isArray(data.payments) && data.payments.length > 0
      ? data.payments
      : (paid > 0
          ? [{
              id: `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
              date: invoiceDate,
              amount: paid,
              paymentMethod,
              note: 'دفعة أولية',
              createdAt: new Date().toISOString(),
            }]
          : []);

    const invoice: Invoice = {
      id: data.id || `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      clinicId: targetClinicId,
      patientId: data.patientId,
      appointmentId: data.appointmentId,
      date: invoiceDate,
      description: data.description?.trim() || 'كشف واستشارة طبية',
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: remaining,
      paymentMethod,
      status,
      notes: data.notes?.trim() || '',
      payments,
      createdAt: new Date().toISOString(),
    };

    this.state.invoices.push(invoice);
    this.saveStateSync();
    return invoice;
  }

  public updateInvoice(id: string, updates: Partial<Invoice>, clinicId?: string): Invoice | null {
    const targetClinicId = clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    this.state.invoices = this.state.invoices || [];
    const index = this.state.invoices.findIndex(i => i.id === id && (i.clinicId || 'cln-default') === targetClinicId);
    if (index === -1) return null;

    const current = this.state.invoices[index];
    const newTotal = updates.totalAmount !== undefined
      ? (typeof updates.totalAmount === 'number' ? updates.totalAmount : parseFloat(String(updates.totalAmount)) || 0)
      : current.totalAmount;

    let payments = Array.isArray(updates.payments)
      ? updates.payments
      : (Array.isArray(current.payments) ? [...current.payments] : []);

    if (payments.length === 0 && current.paidAmount > 0) {
      payments.push({
        id: `PAY-INIT-${current.id}`,
        date: current.date,
        amount: current.paidAmount,
        paymentMethod: current.paymentMethod || 'cash',
        note: 'دفعة مسجلة سابقة',
        createdAt: current.createdAt || new Date().toISOString(),
      });
    }

    const newPaid = updates.paidAmount !== undefined
      ? (typeof updates.paidAmount === 'number' ? updates.paidAmount : parseFloat(String(updates.paidAmount)) || 0)
      : (payments.length > 0 ? payments.reduce((sum, p) => sum + (p.amount || 0), 0) : current.paidAmount);

    const newRemaining = Math.max(0, newTotal - newPaid);
    const newStatus: 'paid' | 'partial' | 'unpaid' = newRemaining === 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');

    const updated: Invoice = {
      ...current,
      ...updates,
      totalAmount: newTotal,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      payments,
      updatedAt: new Date().toISOString(),
    };

    this.state.invoices[index] = updated;

    // Sync total to appointment if linked
    if (updated.appointmentId) {
      const apt = (this.state.appointments || []).find(a => a.id === updated.appointmentId);
      if (apt) {
        apt.cost = newTotal;
        if (updated.paymentMethod) apt.paymentMethod = updated.paymentMethod;
      }
    }

    this.saveStateSync();
    return updated;
  }

  public deleteInvoice(id: string, clinicId?: string): boolean {
    const targetClinicId = clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    this.state.invoices = this.state.invoices || [];
    const inv = this.state.invoices.find(i => i.id === id && (i.clinicId || 'cln-default') === targetClinicId);
    if (!inv) return false;

    // Reset linked appointment cost if applicable
    if (inv.appointmentId) {
      const apt = (this.state.appointments || []).find(a => a.id === inv.appointmentId);
      if (apt) {
        apt.cost = 0;
      }
    }

    this.state.invoices = this.state.invoices.filter(i => !(i.id === id && (i.clinicId || 'cln-default') === targetClinicId));
    this.saveStateSync();
    return true;
  }

  public recordInvoicePayment(
    id: string,
    amount: number,
    paymentMethod?: 'cash' | 'baridimob' | 'check',
    clinicId?: string,
    note?: string,
    paymentDate?: string,
    recordedBy?: string
  ): Invoice | null {
    const targetClinicId = clinicId || this.state.clinics?.[0]?.id || 'cln-default';
    this.state.invoices = this.state.invoices || [];
    const index = this.state.invoices.findIndex(i => i.id === id && (i.clinicId || 'cln-default') === targetClinicId);
    if (index === -1) return null;

    const inv = this.state.invoices[index];
    const addAmt = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0;
    if (addAmt <= 0) return inv;

    let payments: InvoicePayment[] = Array.isArray(inv.payments) ? [...inv.payments] : [];
    if (payments.length === 0 && inv.paidAmount > 0) {
      payments.push({
        id: `PAY-INIT-${inv.id}`,
        date: inv.date,
        amount: inv.paidAmount,
        paymentMethod: inv.paymentMethod || 'cash',
        note: 'دفعة سابقة مسجلة',
        createdAt: inv.createdAt || new Date().toISOString(),
      });
    }

    const payMethod = paymentMethod || inv.paymentMethod || 'cash';
    const payDate = paymentDate || getClinicTodayStr();

    const newPaymentRecord: InvoicePayment = {
      id: `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      date: payDate,
      amount: addAmt,
      paymentMethod: payMethod,
      note: note?.trim() || '',
      recordedBy,
      createdAt: new Date().toISOString(),
    };
    payments.push(newPaymentRecord);

    const newPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const newRemaining = Math.max(0, inv.totalAmount - newPaid);
    const newStatus: 'paid' | 'partial' | 'unpaid' = newRemaining === 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');

    const updated: Invoice = {
      ...inv,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      paymentMethod: payMethod,
      payments,
      updatedAt: new Date().toISOString(),
    };

    this.state.invoices[index] = updated;
    this.saveStateSync();
    return updated;
  }

  public migrateExistingCompletedCostsToInvoices(): { createdCount: number; invoices: Invoice[] } {
    this.state.invoices = this.state.invoices || [];
    const created: Invoice[] = [];

    // 1. Completed appointments with actual recorded cost > 0
    for (const apt of (this.state.appointments || [])) {
      if (apt.status === 'completed' && typeof apt.cost === 'number' && apt.cost > 0) {
        const alreadyExists = this.state.invoices.some(inv => inv.appointmentId === apt.id);
        if (!alreadyExists) {
          const invId = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
          const invoice: Invoice = {
            id: invId,
            clinicId: apt.clinicId || 'cln-default',
            patientId: apt.patientId,
            appointmentId: apt.id,
            date: apt.appointmentDate || getClinicTodayStr(),
            description: apt.procedure || 'كشف ومتابعة',
            totalAmount: apt.cost,
            paidAmount: apt.cost,
            remainingAmount: 0,
            paymentMethod: apt.paymentMethod || 'cash',
            status: 'paid',
            notes: 'ترحيل تلقائي لبيانات موعد سابق مكتمل',
            createdAt: apt.createdAt || new Date().toISOString(),
          };
          this.state.invoices.push(invoice);
          created.push(invoice);
        }
      }
    }

    // 2. Dental conditions with actual recorded cost > 0
    for (const cond of (this.state.dentalConditions || [])) {
      if (typeof cond.cost === 'number' && cond.cost > 0) {
        const condTag = `cond-${cond.id}`;
        const alreadyExists = this.state.invoices.some(inv => inv.notes?.includes(condTag));
        if (!alreadyExists) {
          const invId = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
          const toothLabel = cond.toothNumber ? ` (السن #${cond.toothNumber})` : '';
          const invoice: Invoice = {
            id: invId,
            clinicId: cond.clinicId || 'cln-default',
            patientId: cond.patientId,
            date: cond.recordedDate || getClinicTodayStr(),
            description: `${cond.treatmentDone || cond.conditionType || 'علاج أسنان'}${toothLabel}`,
            totalAmount: cond.cost,
            paidAmount: cond.cost,
            remainingAmount: 0,
            paymentMethod: 'cash',
            status: 'paid',
            notes: `ترحيل تلقائي لعلاج أسنان سابق [${condTag}]`,
            createdAt: cond.createdAt || new Date().toISOString(),
          };
          this.state.invoices.push(invoice);
          created.push(invoice);
        }
      }
    }

    if (created.length > 0) {
      this.saveStateSync();
      console.log(`[INVOICE MIGRATION] Migrated ${created.length} completed records with real costs to invoices.`);
    }

    return { createdCount: created.length, invoices: created };
  }

  public getFinancialStats(clinicId: string) {
    const arabicMonths = [
      'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
      'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    const appointments = this.getAppointments(clinicId);
    const invoices = this.getInvoices(undefined, clinicId);

    const now = new Date();
    const currentYear = getClinicYear(now);
    const currentMonthPrefix = getClinicMonthPrefix(now);

    // Total remaining debt on patients strictly from invoices
    const totalRemaining = invoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);

    // Extract all actual payment transactions from invoices
    interface PaymentTransaction {
      date: string;
      amount: number;
      paymentMethod: string;
      invoiceId: string;
      patientId: string;
      description: string;
    }

    const allPayments: PaymentTransaction[] = [];
    for (const inv of invoices) {
      if (Array.isArray(inv.payments) && inv.payments.length > 0) {
        for (const p of inv.payments) {
          allPayments.push({
            date: p.date || inv.date,
            amount: p.amount || 0,
            paymentMethod: p.paymentMethod || inv.paymentMethod || 'cash',
            invoiceId: inv.id,
            patientId: inv.patientId,
            description: inv.description,
          });
        }
      } else if (inv.paidAmount > 0) {
        allPayments.push({
          date: inv.date,
          amount: inv.paidAmount,
          paymentMethod: inv.paymentMethod || 'cash',
          invoiceId: inv.id,
          patientId: inv.patientId,
          description: inv.description,
        });
      }
    }

    // Calculate revenue strictly from actual payments
    const yearPayments = allPayments.filter(p => p.date.startsWith(String(currentYear)));
    const totalRevenueYear = yearPayments.reduce((sum, p) => sum + p.amount, 0);

    const monthPayments = allPayments.filter(p => p.date.startsWith(currentMonthPrefix));
    const totalRevenueMonth = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    const { saturdayStr, fridayStr } = getClinicWeekRange(now);

    const weekPayments = allPayments.filter(p =>
      p.date >= saturdayStr && p.date <= fridayStr
    );
    const totalRevenueWeek = weekPayments.reduce((sum, p) => sum + p.amount, 0);

    const monthlyRevenue = [];
    for (let m = 0; m < 12; m++) {
      const monthNum = String(m + 1).padStart(2, '0');
      const prefix = `${currentYear}-${monthNum}`;
      const paysInMonth = allPayments.filter(p => p.date.startsWith(prefix));
      const rev = paysInMonth.reduce((sum, p) => sum + p.amount, 0);
      monthlyRevenue.push({
        month: monthNum,
        monthLabel: arabicMonths[m],
        revenue: rev,
        completedCount: paysInMonth.length,
      });
    }

    const weeklyRevenue = [];
    for (let w = 7; w >= 0; w--) {
      const wStartStr = getClinicDateOffsetStr(-(w * 7), saturdayStr);
      const wEndStr = getClinicDateOffsetStr(6, wStartStr);

      const paysInW = allPayments.filter(p => p.date >= wStartStr && p.date <= wEndStr);
      const rev = paysInW.reduce((sum, p) => sum + p.amount, 0);
      const sParts = wStartStr.split('-');

      weeklyRevenue.push({
        weekLabel: w === 0 ? 'هذا الأسبوع' : w === 1 ? 'الأسبوع الماضي' : `أسبوع ${sParts[2]}/${sParts[1]}`,
        weekNumber: 8 - w,
        startDate: wStartStr,
        endDate: wEndStr,
        revenue: rev,
        completedCount: paysInW.length,
      });
    }

    const dailyRevenueThisWeek = [];
    const weekDayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    for (let d = 0; d < 7; d++) {
      const dStr = getClinicDateOffsetStr(d, saturdayStr);
      const paysOnDay = allPayments.filter(p => p.date === dStr);
      const rev = paysOnDay.reduce((sum, p) => sum + p.amount, 0);
      dailyRevenueThisWeek.push({
        dayName: weekDayNames[d],
        date: dStr,
        revenue: rev,
        count: paysOnDay.length,
      });
    }

    const procMap = new Map<string, { revenue: number; count: number }>();
    for (const p of yearPayments) {
      const desc = p.description || 'كشف واستشارة';
      const item = procMap.get(desc) || { revenue: 0, count: 0 };
      item.revenue += p.amount;
      item.count += 1;
      procMap.set(desc, item);
    }

    const procedureBreakdown = Array.from(procMap.entries()).map(([proc, val]) => ({
      procedure: proc,
      revenue: val.revenue,
      count: val.count,
      percentage: totalRevenueYear > 0 ? Math.round((val.revenue / totalRevenueYear) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    const completedApts = appointments.filter(a => a.status === 'completed');
    const invoicesWithPayment = invoices.filter(i => i.paidAmount > 0);

    return {
      totalRevenueYear,
      totalRevenueMonth,
      totalRevenueWeek,
      totalRemaining,
      totalCompletedAppointments: completedApts.length,
      averagePerAppointment: invoicesWithPayment.length > 0
        ? Math.round(totalRevenueYear / (invoicesWithPayment.length || 1))
        : 0,
      monthlyRevenue,
      weeklyRevenue,
      dailyRevenueThisWeek,
      procedureBreakdown,
    };
  }

  // ================= BACKUP & RESTORE (SCOPED PER CLINIC) =================
  public async generateBackupZip(clinicId: string): Promise<Buffer> {
    const clinic = this.getClinicById(clinicId) || this.state.clinics?.[0];
    const settings = this.getClinicSettings(clinicId);
    const patients = this.getPatients(clinicId);
    const appointments = this.getAppointments(clinicId);
    const dentalConditions = this.getDentalConditions(undefined, clinicId);
    const clinicalNotes = (this.state.clinicalNotes || []).filter(n => n.clinicId === clinicId);
    const patientFiles = this.getPatientFiles(undefined, clinicId);
    const users = this.getUsers(clinicId).map(u => ({
      ...u,
      passwordHash: u.passwordHash,
      salt: u.salt,
    }));

    const invoices = this.getInvoices(undefined, clinicId);

    const scopedDb = {
      clinic,
      users,
      patients,
      appointments,
      dentalConditions,
      clinicalNotes,
      patientFiles,
      invoices,
    };

    const zip = new JSZip();
    zip.file('clinic_database.json', JSON.stringify(scopedDb, null, 2));

    const backupReadme = `نسخة احتياطية لعيادة طب الأسنان
اسم العيادة: ${settings.clinicName}
معرف العيادة: ${clinicId}
الطبيب المدير: ${settings.doctorName}
تاريخ الإنشاء: ${new Date().toLocaleString('ar-DZ')}
عدد المرضى: ${patients.length}
عدد المواعيد: ${appointments.length}
عدد الفواتير: ${invoices.length}
عدد ملفات الأشعة: ${patientFiles.length}
`;
    zip.file('معلومات_النسخة.txt', backupReadme);

    const filesFolder = zip.folder('patient_files');
    if (filesFolder) {
      for (const fileRecord of patientFiles) {
        if (fs.existsSync(fileRecord.filePath)) {
          const patient = this.getPatientById(fileRecord.patientId, clinicId);
          const patientFolderName = patient
            ? `${sanitizeFolderName(patient.fullName)}_${patient.id}`
            : `Patient_${fileRecord.patientId}`;
          const diskBuffer = fs.readFileSync(fileRecord.filePath);
          // Decrypt buffer before archiving so zip structure is pure
          const content = encryptionService.isEncrypted(diskBuffer)
            ? encryptionService.decryptBuffer(diskBuffer, 'files')
            : diskBuffer;
          filesFolder.file(`${patientFolderName}/${fileRecord.originalName}`, content);
        }
      }
    }

    const plainZip = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // Authenticated military-grade AES-256-GCM encryption for the entire backup container
    return encryptionService.encryptBuffer(plainZip, 'backup');
  }

  public async restoreFromZip(zipBuffer: Buffer, clinicId: string): Promise<{ success: boolean; message: string }> {
    try {
      let rawZip = zipBuffer;
      // Decrypt if encrypted backup archive
      if (encryptionService.isEncrypted(rawZip)) {
        rawZip = encryptionService.decryptBuffer(rawZip, 'backup');
      }

      const zip = await JSZip.loadAsync(rawZip);
      const dbEntry = zip.file('clinic_database.json');
      if (!dbEntry) {
        return { success: false, message: 'الملف لا يحتوي على قاعدة بيانات clinic_database.json صحيحة.' };
      }
      const dbContent = await dbEntry.async('string');
      const parsed: any = JSON.parse(dbContent);

      if (!Array.isArray(parsed.patients) || !Array.isArray(parsed.appointments)) {
        return { success: false, message: 'هيكل ملف قاعدة البيانات غير متوافق.' };
      }

      // Purge existing data for this clinic only
      this.state.patients = (this.state.patients || []).filter(p => p.clinicId !== clinicId);
      this.state.appointments = (this.state.appointments || []).filter(a => a.clinicId !== clinicId);
      this.state.dentalConditions = (this.state.dentalConditions || []).filter(c => c.clinicId !== clinicId);
      this.state.clinicalNotes = (this.state.clinicalNotes || []).filter(n => n.clinicId !== clinicId);
      this.state.patientFiles = (this.state.patientFiles || []).filter(f => f.clinicId !== clinicId);
      this.state.invoices = (this.state.invoices || []).filter(i => i.clinicId !== clinicId);

      // Re-insert imported records with current clinicId
      for (const p of parsed.patients) {
        this.state.patients.push({ ...p, clinicId });
      }
      for (const a of parsed.appointments) {
        this.state.appointments.push({ ...a, clinicId });
      }
      for (const c of (parsed.dentalConditions || [])) {
        this.state.dentalConditions.push({ ...c, clinicId });
      }
      for (const n of (parsed.clinicalNotes || [])) {
        this.state.clinicalNotes.push({ ...n, clinicId });
      }
      for (const inv of (parsed.invoices || [])) {
        this.state.invoices.push({ ...inv, clinicId });
      }

      // Restore files with disk-level AES-256-GCM encryption
      const storagePath = this.getStoragePath(clinicId);
      const filesInZip = Object.keys(zip.files).filter(k => k.startsWith('patient_files/') && !zip.files[k].dir);

      for (const relativePath of filesInZip) {
        let fileData = await zip.files[relativePath].async('nodebuffer');
        if (!encryptionService.isEncrypted(fileData)) {
          fileData = encryptionService.encryptBuffer(fileData, 'files');
        }
        const targetDiskPath = path.join(storagePath, `clinic_${clinicId}`, relativePath.replace('patient_files/', ''));
        const targetDir = path.dirname(targetDiskPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.writeFileSync(targetDiskPath, fileData, { mode: 0o600 });
      }

      for (const f of (parsed.patientFiles || [])) {
        this.state.patientFiles.push({
          ...f,
          clinicId,
          filePath: path.join(storagePath, `clinic_${clinicId}`, f.storedName || path.basename(f.filePath)),
        });
      }

      if (parsed.clinic) {
        this.updateClinicSettings(clinicId, parsed.clinic);
      }

      this.scheduleSave();
      return { success: true, message: 'تمت استعادة بيانات العيادة بنجاح وتحديث كافة السجلات.' };
    } catch (err: any) {
      console.error('Error during restore:', err);
      return { success: false, message: `فشل استعادة النسخة: ${err.message || 'خطأ غير معروف'}` };
    }
  }
}

export const clinicDb = new ClinicDatabase();
