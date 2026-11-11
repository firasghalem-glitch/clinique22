import React, { useState, useEffect } from 'react';
import { ClinicSettings, NetworkInfo } from '../types';
import { clinicApi } from '../services/api';
import {
  Download,
  Upload,
  Wifi,
  Save,
  HardDrive,
  Copy,
  Check,
  Server,
  Laptop,
  FileArchive,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  Settings as SettingsIcon,
  Folder,
  FolderOpen,
  FolderCheck,
  AlertTriangle,
  Coins,
} from 'lucide-react';
import { localPatientStorageService } from '../utils/localPatientStorage';
import { DENTAL_DISEASE_CONDITIONS, getDiseasePrice } from './Patients';

interface SettingsBackupProps {
  settings: ClinicSettings;
  networkInfo: NetworkInfo;
  onUpdateSettings: (settings: Partial<ClinicSettings>) => Promise<ClinicSettings>;
  onExportBackup: () => Promise<void>;
  onRestoreBackup: (file: File) => Promise<{ success: boolean; message: string }>;
  patientsCount: number;
  filesCount: number;
}

export const SettingsBackup: React.FC<SettingsBackupProps> = ({
  settings,
  networkInfo,
  onUpdateSettings,
  onExportBackup,
  onRestoreBackup,
  patientsCount,
  filesCount,
}) => {
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [doctorName, setDoctorName] = useState(settings.doctorName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [storagePath, setStoragePath] = useState(settings.storagePath);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState<boolean>(false);

  // Disease Tariffs Configuration
  const [diseasePrices, setDiseasePrices] = useState<Record<string, number>>(() => {
    let init: Record<string, number> = {};
    try {
      const raw = localStorage.getItem('clinic_disease_prices');
      if (raw) init = JSON.parse(raw);
    } catch {}
    return { ...init, ...(settings.diseasePrices || {}) };
  });

  useEffect(() => {
    if (settings.diseasePrices) {
      setDiseasePrices(prev => ({ ...prev, ...settings.diseasePrices }));
    }
  }, [settings.diseasePrices]);

  const handleResetDiseasePrices = () => {
    const defaultsMap: Record<string, number> = {};
    DENTAL_DISEASE_CONDITIONS.filter(c => c.id !== 'all').forEach(c => {
      defaultsMap[c.label] = c.defaultPrice;
    });
    setDiseasePrices(defaultsMap);
  };

  useEffect(() => {
    clinicApi.checkSystemStatus()
      .then(status => {
        if (status.persistent === false || status.storageType === 'ephemeral_cloud') {
          setIsEphemeral(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleNativeFolderPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relativePath = (firstFile as any).webkitRelativePath || '';
      const folder = relativePath.split('/')[0] || firstFile.name;
      if (folder) {
        setStoragePath(folder);
        localPatientStorageService.setFolderDirectly(folder);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSettingsError(null);
    try {
      await onUpdateSettings({
        clinicName,
        doctorName,
        phone,
        address,
        storagePath,
        diseasePrices,
      });
      try {
        localStorage.setItem('clinic_disease_prices', JSON.stringify(diseasePrices));
      } catch {}
      if (storagePath) {
        localPatientStorageService.setFolderDirectly(storagePath);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSettingsError(err.message || 'فشل حفظ الإعدادات.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExportBackup();
    } catch (err: any) {
      alert(err.message || 'فشل تصدير النسخة الاحتياطية.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRestoring(true);
    setRestoreMessage(null);
    try {
      const res = await onRestoreBackup(file);
      setRestoreMessage({ text: res.message, isError: !res.success });
      e.target.value = '';
    } catch (err: any) {
      setRestoreMessage({ text: err.message || 'فشل استعادة النسخة الاحتياطية', isError: true });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };



  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Ephemeral Cloud Warning Banner */}
      {isEphemeral && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-sm flex items-start gap-3 leading-relaxed shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-amber-900 block mb-0.5 text-base">
              تنبيه: أنت تعمل في بيئة سحابية تجريبية مؤقتة
            </span>
            البيانات تُمسح عند إعادة تشغيل الخادم. للاستخدام الفعلي في العيادة، يجب تشغيل التطبيق محلياً على حاسوب العيادة مع تحديد مجلد بيانات دائم عبر <code>DATA_DIR</code>.
          </div>
        </div>
      )}

      {/* Title */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shadow-2xs shrink-0">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
                إعدادات العيادة والنسخ الاحتياطي
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100/80 text-blue-800 font-heading">
                إدارة النظام
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans leading-relaxed">
              إعدادات الهوية السريرية، تسعيرة الأمراض والعلاجات، والنسخ الاحتياطي الشامل (ZIP) المشفر
            </p>
          </div>
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <FileArchive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              النسخ الاحتياطي والاستعادة الكاملة (ZIP Backup)
            </h2>
            <p className="text-xs text-slate-500">
              تصدير قاعدة بيانات العيادة وكافة المرفقات والصور الشعاعية في ملف ZIP مضغوط
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-blue-50/60 rounded-xl border border-blue-200/80 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm mb-1">
                <Download className="w-4 h-4 text-blue-700" />
                <span>تصدير نسخة احتياطية</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                تنزيل ملف ZIP شامل يحتوي على قاعدة البيانات كاملة ومجلد صور وأشعة المرضى.
              </p>
              <div className="mt-3 bg-white/80 p-3 rounded-lg border border-blue-200 text-xs text-slate-600 space-y-1">
                <div>إجمالي المرضى: <strong>{patientsCount}</strong></div>
                <div>إجمالي ملفات الأشعة: <strong>{filesCount}</strong></div>
                <div>التوصية: <strong>احفظ ملف ZIP يومياً</strong> على فلاش ميموري USB خارجي.</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'جارٍ إنشاء النسخة...' : 'تصدير النسخة الاحتياطية (ZIP)'}</span>
            </button>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                <Upload className="w-4 h-4 text-slate-700" />
                <span>استعادة نسخة احتياطية</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                رفع ملف ZIP تم تصديره مسبقاً لاسترجاع المرضى والمواعيد والملفات.
              </p>
              {restoreMessage && (
                <div className={`mt-3 p-3 rounded-lg text-xs border ${
                  restoreMessage.isError ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {restoreMessage.text}
                </div>
              )}
            </div>

            <label className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? 'جارٍ الاستعادة...' : 'اختيار ملف النسخة (.zip)...'}</span>
              <input
                type="file"
                accept=".zip"
                onChange={handleRestoreFile}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* LAN Network */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ربط الأجهزة على شبكة العيادة المحلية (LAN)
            </h2>
            <p className="text-xs text-slate-500">
              عناوين الوصول من الأجهزة الأخرى المتصلة بنفس شبكة الراوتر
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-2">
              <Server className="w-4 h-4 text-blue-600" />
              <span>الجهاز الرئيسي (الخادم)</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              الوصول من نفس الكمبيوتر المشغّل للنظام:
            </p>
            <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-xs text-blue-700 font-bold">
              <span>{networkInfo.localUrl}</span>
              <button
                type="button"
                onClick={() => handleCopyUrl(networkInfo.localUrl)}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                title="نسخ الرابط"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 flex flex-col justify-between md:col-span-2">
            <div>
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs mb-2">
                <Laptop className="w-4 h-4 text-blue-700" />
                <span>الأجهزة الأخرى في العيادة (Wi-Fi / كابل شبكة)</span>
              </div>
              <p className="text-xs text-blue-800 mb-3 leading-relaxed">
                استخدم هذا العنوان لفتح لوحة التحكم من جهاز الاستقبال أو حاسوب المساعد(ة) المتصل بنفس شبكة Wi-Fi:
              </p>
            </div>
            <div className="space-y-1.5">
              {networkInfo.networkUrls.length > 0 ? (
                networkInfo.networkUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-blue-200 font-mono text-xs text-blue-900 font-bold">
                    <span>{url}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(url)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                      title="نسخ الرابط"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-200">
                  جارٍ تحديد عنوان الـ IP للشبكة...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Storage and Identity */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-sm">
        {settingsError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
            {settingsError}
          </div>
        )}

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>مجلد ومسار حفظ ملفات المرضى والأشعة على القرص الصلب</span>
            </div>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>استعراض المجلدات 📂</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              dir="ltr"
              value={storagePath}
              onChange={(e) => setStoragePath(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              placeholder="clinic_data/patient_files أو D:\ClinicData"
              required
            />
            <input
              type="file"
              ref={folderInputRef}
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple={false}
              className="hidden"
              onChange={handleNativeFolderPicked}
            />
          </div>

          {/* Quick folder presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-bold text-slate-500">مجلدات مقترحة سريعة:</span>
            {[
              { label: 'القرص C (بيانات العيادة)', path: 'C:\\ClinicData' },
              { label: 'القرص D (ملفات المرضى)', path: 'D:\\ClinicData\\Patients' },
              { label: 'المستندات', path: 'Documents\\DentalClinic' },
              { label: 'المجلد الافتراضي', path: 'clinic_data/patient_files' },
            ].map(item => (
              <button
                key={item.path}
                type="button"
                onClick={() => setStoragePath(item.path)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors border cursor-pointer ${
                  storagePath === item.path
                    ? 'bg-blue-100 text-blue-900 border-blue-300 font-bold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 mt-1.5 block leading-relaxed">
            المسار الافتراضي: <code className="font-mono bg-slate-100 px-1 py-0.2 rounded">clinic_data/patient_files</code>. يتم إنشاء مجلد مخصص لكل مريض تلقائياً باسم: <strong>(الاسم_رقم_الملف)</strong> داخل المجلد المعتمد.
          </span>
        </div>

        <div className="border-t border-slate-100 pt-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            بيانات وهوية العيادة (تظهر في الفواتير والتقارير الطبية)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم العيادة:
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الطبيب المسؤول:
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                أرقام هاتف العيادة:
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                عنوان العيادة:
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Disease Tariffs Section */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-blue-600" />
                <span>جدول تسعيرات الأمراض والعلاجات السريرية (DZD)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تُعتمد هذه المبالغ كـ &quot;سعر الجلسة&quot; تلقائياً عند اختيار المرض في ملف المريض، مع إمكانية تعديلها لكل مريض.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDiseasePrices}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>استعادة الأسعار الافتراضية</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {DENTAL_DISEASE_CONDITIONS.filter(c => c.id !== 'all').map((cond) => {
              const currentVal = diseasePrices[cond.label] !== undefined ? diseasePrices[cond.label] : cond.defaultPrice;
              return (
                <div key={cond.id} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cond.badge ? cond.badge.split(' ')[0] : 'bg-blue-500'}`} />
                    <span className="text-xs font-bold text-slate-800 truncate" title={cond.label}>
                      {cond.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={currentVal}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setDiseasePrices(prev => ({
                          ...prev,
                          [cond.label]: val,
                        }));
                      }}
                      className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 text-left focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-[11px] font-bold text-slate-500">د.ج</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-2">
          {saveSuccess ? (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              تم حفظ وتحديث الإعدادات بنجاح
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              يتم حفظ التغييرات فوراً في قاعدة البيانات وتطبيقها على كامل النظام
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
