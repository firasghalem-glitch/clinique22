import {
  User,
  Patient,
  Appointment,
  DentalCondition,
  ClinicalNote,
  PatientFile,
  ClinicSettings,
  DashboardStats,
  NetworkInfo,
  FinancialStats,
  BeforeAfterCase,
  Invoice,
  FollowUpOverview,
  FollowUpRecord,
  DateStats,
} from '../types';

const SESSION_STORAGE_KEY = 'clinic_session_token';

// Immediately purge any lingering tokens from localStorage to guarantee no cross-browser-restart revival
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

// Session token kept strictly in memory and sessionStorage (discarded on tab/browser close)
let inMemorySessionToken: string | null = getStoredToken();

export function getSessionToken(): string | null {
  return inMemorySessionToken || getStoredToken();
}

function saveSessionToken(token?: string | null) {
  if (token) {
    inMemorySessionToken = token;
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, token);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
  } else {
    clearSessionToken();
  }
}

function clearSessionToken() {
  inMemorySessionToken = null;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

/**
 * Custom request wrapper for secure API communication.
 * - Always sends and receives HttpOnly cookies via `credentials: 'include'`.
 * - Automatically attaches session token header for iframe/sandbox cookie resilience.
 * - Automatically dispatches 'clinic:unauthorized' on 401 to redirect to login.
 * - Rejects with clear Arabic error messages on failure without fake fallbacks.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemorySessionToken && !headers.has('x-session-token')) {
    headers.set('x-session-token', inMemorySessionToken);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  let res: Response;
  try {
    res = await fetch(endpoint, config);
  } catch (netErr: any) {
    throw new Error('تعذر الاتصال بخادم العيادة. يرجى التحقق من تشغيل خادم Node.js.');
  }

  if (res.status === 401) {
    clearSessionToken();
    let errMessage = 'جلسة العمل غير صالحة أو منتهية. يرجى تسجيل الدخول مجدداً.';
    try {
      const data = await res.json();
      if (data?.error) errMessage = data.error;
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clinic:unauthorized', { detail: { message: errMessage } }));
    }
    throw new Error(errMessage);
  }

  if (res.status === 403) {
    let errMessage = 'ليس لديك صلاحية للوصول إلى هذا القسم (خاص بالطبيب فقط).';
    try {
      const data = await res.json();
      if (data?.error) errMessage = data.error;
    } catch {}
    throw new Error(errMessage);
  }

  if (res.status === 429) {
    let errMessage = 'تم تجاوز عدد المحاولات المسموح بها. تم قفل الحساب مؤقتاً لحماية النظام.';
    try {
      const data = await res.json();
      if (data?.error) errMessage = data.error;
    } catch {}
    throw new Error(errMessage);
  }

  if (!res.ok) {
    let errMessage = `خطأ في الخادم (رمز الحالة: ${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) errMessage = data.error;
    } catch {}
    throw new Error(errMessage);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}

export const clinicApi = {
  async checkSystemStatus(): Promise<{
    initialized: boolean;
    usersCount: number;
    doctorExists: boolean;
    persistent?: boolean;
    storageType?: string;
    dataDir?: string;
    dbFile?: string;
  }> {
    return apiFetch<{
      initialized: boolean;
      usersCount: number;
      doctorExists: boolean;
      persistent?: boolean;
      storageType?: string;
      dataDir?: string;
      dbFile?: string;
    }>('/api/auth/system-status');
  },

  async registerClinic(data: {
    fullName: string;
    clinicName: string;
    username: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; user: User; token?: string; recoveryKey: string }> {
    const res = await apiFetch<{ success: boolean; user: User; token?: string; recoveryKey: string }>('/api/auth/register-clinic', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      saveSessionToken(res.token);
    }
    return res;
  },

  async recoverDirector(data: {
    username: string;
    recoveryKey: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; user: User; token?: string; newRecoveryKey?: string; message: string }> {
    const res = await apiFetch<{ success: boolean; user: User; token?: string; newRecoveryKey?: string; message: string }>('/api/auth/recover-director', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      saveSessionToken(res.token);
    }
    return res;
  },

  async setupDoctor(data: {
    fullName: string;
    username: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; user: User; token?: string }> {
    const res = await apiFetch<{ success: boolean; user: User; token?: string }>('/api/auth/setup-doctor', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      saveSessionToken(res.token);
    }
    return res;
  },

  async resetDoctor(data: {
    fullName?: string;
    username: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; user: User; token?: string }> {
    const res = await apiFetch<{ success: boolean; user: User; token?: string }>('/api/auth/reset-doctor', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      saveSessionToken(res.token);
    }
    return res;
  },

  async login(username: string, password: string): Promise<{ user: User; token?: string }> {
    const res = await apiFetch<{ user: User; token?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) {
      saveSessionToken(res.token);
    }
    return res;
  },

  async getCurrentUser(): Promise<{ user: User; sessionRemainingMs?: number; timeoutMs?: number }> {
    return apiFetch<{ user: User; sessionRemainingMs?: number; timeoutMs?: number }>('/api/auth/me');
  },

  async extendSession(): Promise<{ success: boolean; remainingMs?: number; message?: string }> {
    return apiFetch<{ success: boolean; remainingMs?: number; message?: string }>('/api/auth/extend-session', {
      method: 'POST',
    });
  },

  async checkSession(): Promise<{ valid: boolean; remainingMs: number; timeoutMs: number }> {
    return apiFetch<{ valid: boolean; remainingMs: number; timeoutMs: number }>('/api/auth/session-check');
  },

  async logout(): Promise<void> {
    clearSessionToken();
    try {
      await apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout error on server:', e);
    }
  },

  async changePassword(data: {
    currentPassword?: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ================= USER MANAGEMENT (DOCTOR ONLY) =================
  async getUsers(): Promise<User[]> {
    return apiFetch<User[]>('/api/users');
  },

  async createUser(data: {
    fullName: string;
    username: string;
    temporaryPassword: string;
    role: 'doctor' | 'assistant';
  }): Promise<User> {
    return apiFetch<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async resetUserPassword(userId: string, newTemporaryPassword: string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(`/api/users/${userId}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newTemporaryPassword }),
    });
  },

  async toggleUserStatus(userId: string): Promise<{ success: boolean; user: User }> {
    return apiFetch<{ success: boolean; user: User }>(`/api/users/${userId}/toggle-status`, {
      method: 'PATCH',
    });
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async getAuditLogs(): Promise<{ logs: string[] }> {
    return apiFetch<{ logs: string[] }>('/api/audit-logs');
  },

  // ================= PATIENTS =================
  async getPatients(search?: string, type?: string): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    if (type) params.append('type', type);
    return apiFetch<Patient[]>(`/api/patients?${params.toString()}`);
  },

  async getPatientById(id: string): Promise<Patient> {
    return apiFetch<Patient>(`/api/patients/${id}`);
  },

  async createPatient(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
    return apiFetch<Patient>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  },

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    return apiFetch<Patient>(`/api/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deletePatient(id: string): Promise<void> {
    await apiFetch<{ success: boolean }>(`/api/patients/${id}`, {
      method: 'DELETE',
    });
  },

  async getTotalRegisteredPatientsCount(): Promise<number> {
    const res = await apiFetch<{ totalRegisteredPatients: number }>('/api/patients/total-count');
    return res?.totalRegisteredPatients ?? 0;
  },

  async getTrashedPatients(): Promise<Patient[]> {
    return apiFetch<Patient[]>('/api/patients/trash');
  },

  async restorePatient(id: string): Promise<{ success: boolean; patient: Patient }> {
    return apiFetch<{ success: boolean; patient: Patient }>(`/api/patients/${id}/restore`, {
      method: 'POST',
    });
  },

  async purgePatient(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(`/api/patients/${id}/purge`, {
      method: 'DELETE',
    });
  },

  // ================= APPOINTMENTS =================
  async getAppointments(date?: string, patientId?: string): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (patientId) params.append('patientId', patientId);
    return apiFetch<Appointment[]>(`/api/appointments?${params.toString()}`);
  },

  async createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    return apiFetch<Appointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    });
  },

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    return apiFetch<Appointment>(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteAppointment(id: string): Promise<void> {
    await apiFetch<{ success: boolean }>(`/api/appointments/${id}`, {
      method: 'DELETE',
    });
  },

  // ================= DENTAL CONDITIONS =================
  async getDentalConditions(patientId?: string): Promise<DentalCondition[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    return apiFetch<DentalCondition[]>(`/api/conditions?${params.toString()}`);
  },

  async createDentalCondition(condition: Omit<DentalCondition, 'id' | 'createdAt'>): Promise<DentalCondition> {
    return apiFetch<DentalCondition>('/api/conditions', {
      method: 'POST',
      body: JSON.stringify(condition),
    });
  },

  async updateDentalCondition(id: string, updates: Partial<DentalCondition>): Promise<DentalCondition> {
    return apiFetch<DentalCondition>(`/api/conditions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteDentalCondition(id: string): Promise<void> {
    await apiFetch<{ success: boolean }>(`/api/conditions/${id}`, {
      method: 'DELETE',
    });
  },

  // ================= CLINICAL NOTES =================
  async getClinicalNotes(patientId: string): Promise<ClinicalNote[]> {
    return apiFetch<ClinicalNote[]>(`/api/notes?patientId=${encodeURIComponent(patientId)}`);
  },

  async createClinicalNote(note: { patientId: string; noteText: string; doctorName?: string }): Promise<ClinicalNote> {
    return apiFetch<ClinicalNote>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  },

  async deleteClinicalNote(id: string): Promise<void> {
    await apiFetch<{ success: boolean }>(`/api/notes/${id}`, {
      method: 'DELETE',
    });
  },

  // ================= PATIENT FILES =================
  async getPatientFiles(patientId?: string): Promise<PatientFile[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    return apiFetch<PatientFile[]>(`/api/files?${params.toString()}`);
  },

  async uploadFile(patientId: string, file: File, category: string): Promise<PatientFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patientId);
    formData.append('category', category);
    return apiFetch<PatientFile>('/api/files/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async deleteFile(id: string): Promise<void> {
    await apiFetch<{ success: boolean }>(`/api/files/${id}`, {
      method: 'DELETE',
    });
  },

  getFilePreviewUrl(id: string): string {
    const token = getSessionToken();
    return token ? `/api/files/preview/${id}?token=${encodeURIComponent(token)}` : `/api/files/preview/${id}`;
  },

  getFileDownloadUrl(id: string): string {
    const token = getSessionToken();
    return token ? `/api/files/download/${id}?token=${encodeURIComponent(token)}` : `/api/files/download/${id}`;
  },

  async getFileBlob(id: string): Promise<Blob> {
    const token = getSessionToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['x-session-token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
    const previewUrl = this.getFilePreviewUrl(id);
    const res = await fetch(previewUrl, {
      credentials: 'include',
      headers,
    });
    if (!res.ok) {
      throw new Error(`تعذر تحميل الملف (${res.status})`);
    }
    return await res.blob();
  },

  // ================= DASHBOARD & FINANCIAL STATS =================
  async getDashboardStats(): Promise<DashboardStats> {
    return apiFetch<DashboardStats>('/api/dashboard/stats');
  },

  async getDateStats(dateStr?: string): Promise<DateStats> {
    const q = dateStr ? `?date=${encodeURIComponent(dateStr)}` : '';
    return apiFetch<DateStats>(`/api/dashboard/date-stats${q}`);
  },

  async getFinancialStats(): Promise<FinancialStats> {
    return apiFetch<FinancialStats>('/api/finance/stats');
  },

  async getFollowUpOverview(noReturnDays: number = 30): Promise<FollowUpOverview> {
    return apiFetch<FollowUpOverview>(`/api/followup/overview?noReturnDays=${noReturnDays}`);
  },

  async getFollowUps(status?: string): Promise<FollowUpRecord[]> {
    const q = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch<FollowUpRecord[]>(`/api/followups${q}`);
  },

  async getPatientFollowUps(patientId: string): Promise<FollowUpRecord[]> {
    return apiFetch<FollowUpRecord[]>(`/api/patients/${encodeURIComponent(patientId)}/followups`);
  },

  async createFollowUp(data: {
    patientId: string;
    reason: string;
    nextProcedure: string;
    targetDate?: string;
    priority?: string;
    status?: string;
    notes?: string;
    appointmentId?: string;
    createAppointment?: boolean;
    appointmentTime?: string;
  }): Promise<FollowUpRecord> {
    return apiFetch<FollowUpRecord>('/api/followups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateFollowUp(id: string, updates: Partial<FollowUpRecord>): Promise<FollowUpRecord> {
    return apiFetch<FollowUpRecord>(`/api/followups/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteFollowUp(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(`/api/followups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // ================= SETTINGS & NETWORK =================
  async getSettings(): Promise<ClinicSettings> {
    return apiFetch<ClinicSettings>('/api/settings');
  },

  async updateSettings(settings: Partial<ClinicSettings>): Promise<ClinicSettings> {
    return apiFetch<ClinicSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async getNetworkInfo(): Promise<NetworkInfo> {
    return apiFetch<NetworkInfo>('/api/network-info');
  },

  // ================= BACKUP & RESTORE =================
  getBackupExportUrl(): string {
    return '/api/backup/export';
  },

  async restoreBackup(zipFile: File): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('backupZip', zipFile);
    return apiFetch<{ success: boolean; message: string }>('/api/backup/restore', {
      method: 'POST',
      body: formData,
    });
  },


  // ================= BEFORE & AFTER CASES =================
  async getBeforeAfterCases(patientId?: string, category?: string): Promise<BeforeAfterCase[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    if (category) params.append('category', category);
    return apiFetch<BeforeAfterCase[]>(`/api/before-after?${params.toString()}`);
  },

  async createBeforeAfterCase(data: Omit<BeforeAfterCase, 'id' | 'createdAt'>): Promise<BeforeAfterCase> {
    return apiFetch<BeforeAfterCase>('/api/before-after', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBeforeAfterCase(id: string, updates: Partial<BeforeAfterCase>): Promise<BeforeAfterCase> {
    return apiFetch<BeforeAfterCase>(`/api/before-after/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteBeforeAfterCase(id: string): Promise<void> {
    await apiFetch<{ success: boolean }>(`/api/before-after/${id}`, {
      method: 'DELETE',
    });
  },

  // ================= INVOICES =================
  async getInvoices(patientId?: string): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    return apiFetch<Invoice[]>(`/api/invoices${params.toString() ? '?' + params.toString() : ''}`);
  },

  async createInvoice(data: {
    patientId: string;
    appointmentId?: string;
    date?: string;
    description: string;
    totalAmount: number;
    paidAmount?: number;
    paymentMethod?: 'cash' | 'baridimob' | 'check';
    notes?: string;
  }): Promise<Invoice> {
    return apiFetch<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    return apiFetch<Invoice>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteInvoice(id: string): Promise<void> {
    await apiFetch<{ success: boolean }>(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
  },

  async recordInvoicePayment(
    id: string,
    amount: number,
    paymentMethod?: 'cash' | 'baridimob' | 'check',
    note?: string,
    date?: string
  ): Promise<Invoice> {
    return apiFetch<Invoice>(`/api/invoices/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethod, note, date }),
    });
  },
};
