import JSZip from 'jszip';
import { Patient, Appointment, DentalCondition, ClinicalNote, PatientFile, ClinicSettings } from '../types';

const DB_NAME = 'ClinicLocalStorageDB';
const STORE_NAME = 'handles';
const KEY_DIR = 'patientStorageDir';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setDirectoryHandle(handle: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, KEY_DIR);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Could not store directory handle in IndexedDB:', e);
  }
}

async function getDirectoryHandle(): Promise<any | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY_DIR);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

function sanitizeName(name: string): string {
  return (name || 'مريض')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim()
    .replace(/\s+/g, '_');
}

export interface LocalFolderInfo {
  isSupported: boolean;
  hasHandle: boolean;
  folderName: string | null;
  customPath: string;
  autoSaveEnabled: boolean;
  lastSavedAt: string | null;
}

export class LocalPatientStorageService {
  private cachedHandle: any = null;

  constructor() {
    this.initHandle();
  }

  private async initHandle() {
    this.cachedHandle = await getDirectoryHandle();
  }

  public isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  public getFolderInfo(): LocalFolderInfo {
    if (typeof window === 'undefined') {
      return {
        isSupported: false,
        hasHandle: false,
        folderName: null,
        customPath: '',
        autoSaveEnabled: true,
        lastSavedAt: null,
      };
    }
    const folderName = localStorage.getItem('clinic_local_storage_folder_name') || null;
    const customPath = localStorage.getItem('clinic_local_storage_custom_path') || 'C:\\ClinicData';
    const autoSave = localStorage.getItem('clinic_local_storage_autosave');
    const lastSavedAt = localStorage.getItem('clinic_local_storage_last_saved') || null;
    return {
      isSupported: this.isFileSystemAccessSupported(),
      hasHandle: !!this.cachedHandle || !!folderName,
      folderName,
      customPath,
      autoSaveEnabled: autoSave !== 'false',
      lastSavedAt,
    };
  }

  public setAutoSave(enabled: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('clinic_local_storage_autosave', enabled ? 'true' : 'false');
    }
  }

  public setCustomPath(pathStr: string): void {
    if (typeof window !== 'undefined') {
      const clean = pathStr.trim();
      localStorage.setItem('clinic_local_storage_custom_path', clean);
      localStorage.setItem('clinic_local_storage_folder_name', clean);
    }
  }

  public setFolderDirectly(folderPathOrName: string): { success: boolean; folderName: string; message: string } {
    const clean = folderPathOrName.trim();
    if (!clean) {
      return { success: false, folderName: '', message: 'يرجى إدخال اسم أو مسار المجلد.' };
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('clinic_local_storage_folder_name', clean);
      localStorage.setItem('clinic_local_storage_custom_path', clean);
    }
    return {
      success: true,
      folderName: clean,
      message: `تم اعتماد وتعيين المجلد بنجاح: "${clean}".`,
    };
  }

  public async selectLocalFolder(): Promise<{ success: boolean; folderName: string; message: string; isPickerBlocked?: boolean }> {
    if (!this.isFileSystemAccessSupported()) {
      return {
        success: false,
        folderName: '',
        isPickerBlocked: true,
        message: 'ميزة متصفح المجلدات التلقائي غير مدعومة مباشرة في هذا المتصفح، يمكنك إدخال المسار أو استعراض المجلد أدناه.',
      };
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });
      if (handle.requestPermission) {
        const permission = await handle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          return {
            success: false,
            folderName: handle.name,
            message: 'لم يتم منح إذن الكتابة للمجلد المختار.',
          };
        }
      }
      this.cachedHandle = handle;
      await setDirectoryHandle(handle);
      localStorage.setItem('clinic_local_storage_folder_name', handle.name);
      localStorage.setItem('clinic_local_storage_custom_path', handle.name);
      return {
        success: true,
        folderName: handle.name,
        message: `تم ربط المجلد بنجاح: "${handle.name}".`,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, folderName: '', message: 'تم إلغاء التحديد.' };
      }
      return {
        success: false,
        folderName: '',
        isPickerBlocked: true,
        message: 'يتعذر فتح متصفح المجلدات المباشر في بيئة المتصفح الحالية، يرجى كتابة المسار أو استعراضه يدوياً.',
      };
    }
  }

  public generatePatientHtmlReport(
    patient: Patient,
    conditions: DentalCondition[] = [],
    notes: ClinicalNote[] = [],
    appointments: Appointment[] = [],
    settings?: ClinicSettings
  ): string {
    const clinicName = settings?.clinicName || 'عيادة النور لطب وجراحة الأسنان';
    const doctorName = settings?.doctorName || 'د. محمد أمين';
    const clinicPhone = settings?.phone || '023 45 67 89 / 0550 11 22 33';
    const dateStr = new Date().toLocaleDateString('ar-DZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>الملف الطبي للمريض - ${patient.fullName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; direction: rtl; }
    .card { background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; max-width: 900px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .clinic-title { font-size: 20px; font-weight: 800; color: #0f766e; }
    .patient-header { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .field-label { font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 2px; }
    .field-value { font-size: 14px; font-weight: 700; color: #0f172a; }
    .alert-box { background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-weight: bold; font-size: 13px; }
    .section-title { font-size: 16px; font-weight: 800; color: #0f766e; margin: 24px 0 12px; border-right: 4px solid #0d9488; padding-right: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { background: #f1f5f9; text-align: right; padding: 10px 12px; border: 1px solid #e2e8f0; font-weight: 700; }
    td { padding: 10px 12px; border: 1px solid #e2e8f0; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .badge-treated { background: #dcfce7; color: #166534; }
    .badge-progress { background: #ffedd5; color: #9a3412; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    @media print { body { background: #fff; padding: 0; } .card { border: none; box-shadow: none; max-width: 100%; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="clinic-title">${clinicName}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">إشراف: ${doctorName} | هاتف: ${clinicPhone}</div>
      </div>
      <div style="text-align: left; font-size: 12px; color: #64748b;">
        <div>تاريخ التقرير:</div>
        <div style="font-weight: 700; color: #0d9488;">${dateStr}</div>
      </div>
    </div>
    ${patient.allergies && patient.allergies !== 'لا يوجد' ? `
      <div class="alert-box">
        تنبيه طبي: يعاني المريض من حساسية (${patient.allergies}).
      </div>
    ` : ''}
    ${patient.medications ? `
      <div class="alert-box" style="background: #eff6ff; border-color: #bfdbfe; color: #1e40af;">
        الأدوية التي تناولها / الحالية للمريض: <strong>${patient.medications}</strong>
      </div>
    ` : ''}
    <div class="patient-header">
      <div>
        <div class="field-label">اسم المريض</div>
        <div class="field-value">${patient.fullName}</div>
      </div>
      <div>
        <div class="field-label">رقم الملف (ID)</div>
        <div class="field-value">${patient.id}</div>
      </div>
      <div>
        <div class="field-label">الهاتف</div>
        <div class="field-value" dir="ltr" style="text-align: right;">${patient.phone}</div>
      </div>
      <div>
        <div class="field-label">تاريخ الميلاد</div>
        <div class="field-value">${patient.birthDate || '-'} (${patient.gender === 'male' ? 'ذكر' : 'أنثى'})</div>
      </div>
      <div>
        <div class="field-label">نوع المريض</div>
        <div class="field-value">${patient.patientType === 'new' ? 'جديد' : 'متابع'}</div>
      </div>
      <div>
        <div class="field-label">العنوان</div>
        <div class="field-value">${patient.address || '-'}</div>
      </div>
    </div>

    <div class="section-title">سجل حالات الأسنان والمعالجة (${conditions.length})</div>
    ${conditions.length === 0 ? '<p style="font-size: 12px; color: #94a3b8;">لا توجد سجلات أسنان مسجلة.</p>' : `
      <table>
        <thead>
          <tr>
            <th>السن (FDI)</th>
            <th>التشخيص / الحالة</th>
            <th>الأسطح</th>
            <th>الإجراء المنجز</th>
            <th>التكلفة (DZD)</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${conditions.map(c => `
            <tr>
              <td style="font-weight: 800; font-family: monospace;">#${c.toothNumber}</td>
              <td style="font-weight: 700;">${c.conditionType}</td>
              <td>${c.surfaces && c.surfaces.length ? c.surfaces.join(', ') : (c.surface || 'الكل')}</td>
              <td>${c.treatmentDone || c.treatmentPlanned || '-'}</td>
              <td style="font-weight: 700; font-family: monospace;">${c.cost ? c.cost + ' دج' : '-'}</td>
              <td>
                <span class="badge ${c.status === 'treated' ? 'badge-treated' : 'badge-progress'}">
                  ${c.status === 'treated' ? 'معالج' : c.status === 'monitoring' ? 'مراقبة' : 'قيد العلاج'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <div class="section-title">الملاحظات السريرية (${notes.length})</div>
    ${notes.length === 0 ? '<p style="font-size: 12px; color: #94a3b8;">لا توجد ملاحظات سريرية مدونة.</p>' : `
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>الملاحظة السريرية</th>
            <th>الطبيب</th>
          </tr>
        </thead>
        <tbody>
          ${notes.map(n => `
            <tr>
              <td style="font-family: monospace; white-space: nowrap;">${new Date(n.createdAt).toLocaleDateString('ar-DZ')}</td>
              <td>${n.noteText}</td>
              <td style="font-weight: 700;">${n.doctorName}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <div class="section-title">سجل المواعيد (${appointments.length})</div>
    ${appointments.length === 0 ? '<p style="font-size: 12px; color: #94a3b8;">لا توجد مواعيد سابقة مسجلة.</p>' : `
      <table>
        <thead>
          <tr>
            <th>تاريخ الموعد</th>
            <th>الوقت</th>
            <th>الإجراء المقرر</th>
            <th>حالة الموعد</th>
          </tr>
        </thead>
        <tbody>
          ${appointments.map(a => `
            <tr>
              <td style="font-family: monospace;">${a.appointmentDate}</td>
              <td style="font-family: monospace; font-weight: 700;">${a.appointmentTime}</td>
              <td>${a.procedure}</td>
              <td>${a.status === 'completed' ? 'مكتمل' : a.status === 'cancelled' ? 'ملغى' : 'مجدول'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <div class="footer">
      نظام إدارة عيادة طب وجراحة الأسنان - تقرير طبي رسمي معتمد
    </div>
  </div>
</body>
</html>`;
  }

  public async savePatientFileLocally(
    patient: Patient,
    conditions: DentalCondition[] = [],
    notes: ClinicalNote[] = [],
    appointments: Appointment[] = [],
    files: PatientFile[] = [],
    settings?: ClinicSettings
  ): Promise<{ success: boolean; filePathOrName: string; method: 'direct_fs' | 'download' }> {
    const safeName = sanitizeName(patient.fullName);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileNameJson = `ملف_المريض_${safeName}_${patient.id}.json`;
    const fileNameHtml = `تقرير_المريض_${safeName}_${patient.id}.html`;

    const dossierPayload = {
      patient,
      conditions,
      notes,
      appointments,
      filesCount: files.length,
      exportedAt: new Date().toISOString(),
      generator: 'ClinicDentalSystem_LocalDossier',
    };

    const jsonContent = JSON.stringify(dossierPayload, null, 2);
    const htmlContent = this.generatePatientHtmlReport(patient, conditions, notes, appointments, settings);

    if (typeof window !== 'undefined') {
      localStorage.setItem('clinic_local_storage_last_saved', new Date().toISOString());
    }

    if (this.cachedHandle) {
      try {
        if (this.cachedHandle.requestPermission) {
          const perm = await this.cachedHandle.requestPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            const fileHandleJson = await this.cachedHandle.getFileHandle(fileNameJson, { create: true });
            const writableJson = await fileHandleJson.createWritable();
            await writableJson.write(jsonContent);
            await writableJson.close();

            const fileHandleHtml = await this.cachedHandle.getFileHandle(fileNameHtml, { create: true });
            const writableHtml = await fileHandleHtml.createWritable();
            await writableHtml.write(htmlContent);
            await writableHtml.close();

            return {
              success: true,
              filePathOrName: `${this.cachedHandle.name}/${fileNameJson}`,
              method: 'direct_fs',
            };
          }
        }
      } catch (err) {
        console.warn('Direct FS write failed, falling back to download:', err);
      }
    }

    if (typeof window !== 'undefined') {
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ملف_${safeName}_${dateStamp}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    }

    return {
      success: true,
      filePathOrName: fileNameJson,
      method: 'download',
    };
  }

  public async saveAllPatientsInOneFile(
    patients: Patient[],
    appointments: Appointment[],
    conditions: DentalCondition[],
    notes: ClinicalNote[],
    files: PatientFile[],
    settings?: ClinicSettings
  ): Promise<{ success: boolean; fileName: string; patientCount: number; method: 'direct_fs' | 'download' }> {
    const zip = new JSZip();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const zipName = `أرشيف_ملفات_المرضى_الكامل_${dateStamp}.zip`;

    const masterData = {
      clinicInfo: {
        name: settings?.clinicName || 'عيادة النور لطب وجراحة الأسنان',
        doctor: settings?.doctorName || 'د. محمد أمين',
        phone: settings?.phone || '',
        exportedAt: new Date().toISOString(),
      },
      patientsCount: patients.length,
      appointmentsCount: appointments.length,
      conditionsCount: conditions.length,
      notesCount: notes.length,
      filesCount: files.length,
      patients,
      appointments,
      dentalConditions: conditions,
      clinicalNotes: notes,
    };

    zip.file('قاعدة_بيانات_العيادة_الشاملة.json', JSON.stringify(masterData, null, 2));

    const masterHtmlIndex = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فهرس ملفات المرضى - ${settings?.clinicName || 'عيادة طب الأسنان'}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; direction: rtl; }
    .container { max-width: 1000px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #cbd5e1; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { color: #0f766e; margin-top: 0; font-size: 22px; }
    .stats { display: flex; gap: 12px; margin: 16px 0 24px; flex-wrap: wrap; }
    .stat-pill { background: #f0fdfa; border: 1px solid #ccfbf1; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 13px; color: #0f766e; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: #f1f5f9; text-align: right; padding: 12px; border: 1px solid #e2e8f0; font-weight: 800; color: #334155; }
    td { padding: 10px 12px; border: 1px solid #e2e8f0; }
    tr:hover { background: #f8fafc; }
    .search { width: 100%; padding: 10px 14px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; margin-bottom: 16px; }
    .tag-new { background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .tag-returning { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>أرشيف ملفات مرضى العيادة - فهرس الاستعراض</h1>
    <p style="font-size: 13px; color: #64748b;">تاريخ التصدير: ${new Date().toLocaleString('ar-DZ')} | محفوظ محلياً على جهازك</p>
    <div class="stats">
      <div class="stat-pill">إجمالي المرضى: ${patients.length}</div>
      <div class="stat-pill">إجمالي المواعيد: ${appointments.length}</div>
      <div class="stat-pill">حالات الأسنان: ${conditions.length}</div>
      <div class="stat-pill">الملاحظات: ${notes.length}</div>
    </div>
    <input type="text" id="searchInput" class="search" placeholder="ابحث عن مريض بالاسم أو الهاتف أو الـ ID..." onkeyup="filterTable()">
    <table id="patientsTable">
      <thead>
        <tr>
          <th>ID</th>
          <th>اسم المريض</th>
          <th>الهاتف</th>
          <th>نوع المريض</th>
          <th>حالات الأسنان</th>
          <th>المواعيد</th>
          <th>الملف الطبي</th>
        </tr>
      </thead>
      <tbody>
        ${patients.map(p => {
          const ptConditions = conditions.filter(c => c.patientId === p.id);
          const ptApts = appointments.filter(a => a.patientId === p.id);
          const folderName = `ملفات_فردية/${sanitizeName(p.fullName)}_${p.id}`;
          return `<tr>
            <td style="font-family: monospace; font-weight: bold;">${p.id}</td>
            <td style="font-weight: 800; color: #0f172a;">${p.fullName}</td>
            <td style="font-family: monospace;" dir="ltr">${p.phone}</td>
            <td><span class="${p.patientType === 'new' ? 'tag-new' : 'tag-returning'}">${p.patientType === 'new' ? 'جديد' : 'متابع'}</span></td>
            <td style="font-weight: bold;">${ptConditions.length} حالة</td>
            <td>${ptApts.length} موعد</td>
            <td><a href="${folderName}/تقرير_المريض.html" target="_blank" style="color: #0d9488; font-weight: bold; text-decoration: none;">فتح التقرير</a></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  <script>
    function filterTable() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      const rows = document.querySelectorAll('#patientsTable tbody tr');
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;
    zip.file('فهرس_استعراض_المرضى.html', masterHtmlIndex);

    const individualFolder = zip.folder('ملفات_فردية');
    if (individualFolder) {
      for (const pt of patients) {
        const ptConditions = conditions.filter(c => c.patientId === pt.id);
        const ptNotes = notes.filter(n => n.patientId === pt.id);
        const ptApts = appointments.filter(a => a.patientId === pt.id);
        const ptFiles = files.filter(f => f.patientId === pt.id);
        const safePtName = `${sanitizeName(pt.fullName)}_${pt.id}`;
        const patientSub = individualFolder.folder(safePtName);
        if (patientSub) {
          patientSub.file(
            'بيانات_المريض.json',
            JSON.stringify({ patient: pt, conditions: ptConditions, notes: ptNotes, appointments: ptApts }, null, 2)
          );
          const htmlReport = this.generatePatientHtmlReport(pt, ptConditions, ptNotes, ptApts, settings);
          patientSub.file('تقرير_المريض.html', htmlReport);
          ptFiles.forEach(f => {
            if (f.dataUrl && f.dataUrl.includes(',')) {
              const b64 = f.dataUrl.split(',')[1];
              patientSub.file(`المرفقات/${f.originalName}`, b64, { base64: true });
            }
          });
        }
      }
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('clinic_local_storage_last_saved', new Date().toISOString());
    }

    if (this.cachedHandle) {
      try {
        if (this.cachedHandle.requestPermission) {
          const perm = await this.cachedHandle.requestPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            const fileHandle = await this.cachedHandle.getFileHandle(zipName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(zipBlob);
            await writable.close();

            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = zipName;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
            return {
              success: true,
              fileName: `${this.cachedHandle.name}/${zipName}`,
              patientCount: patients.length,
              method: 'direct_fs',
            };
          }
        }
      } catch (e) {
        console.warn('Direct FS write failed, falling back to download:', e);
      }
    }

    if (typeof window !== 'undefined') {
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    }

    return {
      success: true,
      fileName: zipName,
      patientCount: patients.length,
      method: 'download',
    };
  }
}

export const localPatientStorageService = new LocalPatientStorageService();
