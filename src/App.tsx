/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dental Clinic Management System
 */

import React, { useState, useEffect } from 'react';
import { clinicApi } from './services/api';
import { getClinicTodayStr } from './utils/clinicDate';
import {
  User,
  Patient,
  Appointment,
  DentalCondition,
  ClinicalNote,
  PatientFile,
  ClinicSettings,
  DashboardStats,
  NetworkInfo
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Appointments } from './components/Appointments';
import { Patients } from './components/Patients';
import { PatientDossier } from './components/PatientDossier';
import { DentalConditions } from './components/DentalConditions';
import { BeforeAfter } from './components/BeforeAfter';
import { InteractiveJawChart } from './components/InteractiveJawChart';
import { FinancialReport } from './components/FinancialReport';
import { SettingsBackup } from './components/SettingsBackup';
import { UserGuide } from './components/UserGuide';
import { UserManagement } from './components/UserManagement';
import { TrashBin } from './components/TrashBin';
import { PatientFollowUp } from './components/PatientFollowUp';
import { MedicationsSettings } from './components/MedicationsSettings';
import { DiseasePricesSettings } from './components/DiseasePricesSettings';
import { LoginModal } from './components/LoginModal';
import { SmartReminderBanner } from './components/SmartReminderBanner';
import { SessionTimeoutWarning } from './components/SessionTimeoutWarning';
import { localPatientStorageService } from './utils/localPatientStorage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [conditions, setConditions] = useState<DentalCondition[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [allFiles, setAllFiles] = useState<PatientFile[]>([]);

  const [settings, setSettings] = useState<ClinicSettings>({
    clinicName: 'عيادة النور لطب وجراحة الأسنان',
    doctorName: 'د. محمد أمين',
    phone: '023 45 67 89 / 0550 11 22 33',
    address: 'الجزائر العاصمة',
    storagePath: 'clinic_data/patient_files',
    autoBackupDaily: true,
  });

  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    port: 3000,
    localUrl: 'http://localhost:3000',
    networkUrls: ['http://127.0.0.1:3000'],
    primaryLanIp: '127.0.0.1',
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeDossierPatientId, setActiveDossierPatientId] = useState<string | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<'profile' | 'medical' | 'teeth' | 'jaw-chart' | 'appointments' | 'treatments' | 'files' | 'invoices' | 'notes'>('profile');
  const [followUpCategory, setFollowUpCategory] = useState<'all' | 'followUp' | 'notReturned' | 'topDiseases'>('followUp');
  const [followUpRefreshKey, setFollowUpRefreshKey] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);

  const [financialRefreshKey, setFinancialRefreshKey] = useState<number>(0);
  const [appointmentDateFilter, setAppointmentDateFilter] = useState<string>('');
  const handleInvoicesUpdated = () => {
    setFinancialRefreshKey(k => k + 1);
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleOpenPatientDossier = (patientId: string, initialTab: 'profile' | 'medical' | 'teeth' | 'jaw-chart' | 'appointments' | 'treatments' | 'files' | 'invoices' | 'notes' = 'profile') => {
    setActiveDossierTab(initialTab);
    setActiveDossierPatientId(patientId);
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [pts, apts, cnds, stgs, net, dashStats, allFilesData] = await Promise.all([
        clinicApi.getPatients(),
        clinicApi.getAppointments(),
        clinicApi.getDentalConditions(),
        clinicApi.getSettings(),
        clinicApi.getNetworkInfo().catch(() => ({
          port: 3000,
          localUrl: 'http://localhost:3000',
          networkUrls: ['http://127.0.0.1:3000'],
          primaryLanIp: '127.0.0.1',
        })),
        clinicApi.getDashboardStats(),
        clinicApi.getPatientFiles(),
      ]);

      setPatients(pts);
      setAppointments(apts);
      setConditions(cnds);
      setSettings(stgs);
      setNetworkInfo(net);
      setStats(dashStats);
      setAllFiles(allFilesData);

      if (activeDossierPatientId) {
        setFiles(allFilesData.filter(f => f.patientId === activeDossierPatientId));
      }
      setFollowUpRefreshKey(prev => prev + 1);
    } catch (err: any) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Initial Authentication & System Status Verification
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsAuthChecking(true);
      try {
        const sysStatus = await clinicApi.checkSystemStatus().catch(() => ({ initialized: true, usersCount: 1, doctorExists: true }));
        setIsFirstTimeSetup(!sysStatus.initialized || sysStatus.usersCount === 0);

        try {
          const me = await clinicApi.getCurrentUser();
          if (me && me.user) {
            setCurrentUser(me.user);
            setIsFirstTimeSetup(false);
          } else {
            setCurrentUser(null);
          }
        } catch {
          setCurrentUser(null);
        }
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };
    checkAuthStatus();
  }, []);

  // 2. Global 401 Listener
  useEffect(() => {
    const handleUnauthorizedEvent = (e: any) => {
      setCurrentUser(null);
      setPatients([]);
      setAppointments([]);
      setConditions([]);
      setNotes([]);
      setFiles([]);
      setAllFiles([]);
      showToast(e?.detail?.message || 'انتهت جلسة العمل. يرجى تسجيل الدخول مجدداً.');
    };
    window.addEventListener('clinic:unauthorized', handleUnauthorizedEvent);
    return () => {
      window.removeEventListener('clinic:unauthorized', handleUnauthorizedEvent);
    };
  }, []);

  // 3. Load clinical data when authenticated user is present
  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser?.id]);

  // 4. Dossier files/notes loader
  useEffect(() => {
    if (currentUser && activeDossierPatientId) {
      Promise.all([
        clinicApi.getClinicalNotes(activeDossierPatientId).catch(() => []),
        clinicApi.getPatientFiles(activeDossierPatientId).catch(() => []),
      ]).then(([fetchedNotes, fetchedFiles]) => {
        setNotes(fetchedNotes);
        setFiles(fetchedFiles);
      });
    }
  }, [currentUser, activeDossierPatientId]);

  // 4b. Refresh dashboard stats whenever navigating to 'dashboard'
  useEffect(() => {
    if (currentUser && currentTab === 'dashboard') {
      clinicApi.getDashboardStats().then(s => setStats(s)).catch(() => {});
      setFollowUpRefreshKey(k => k + 1);
    }
  }, [currentUser, currentTab]);

  // 5. Enforce role tab restrictions (Assistant cannot access finance, settings, users, trash, medications, disease-prices)
  useEffect(() => {
    if (currentUser && currentUser.role === 'assistant') {
      if (['finance', 'settings', 'users', 'trash', 'medications', 'disease-prices'].includes(currentTab)) {
        setCurrentTab('dashboard');
        showToast('هذا القسم مخصص لطبيب الأسنان فقط.');
      }
    }
  }, [currentUser, currentTab]);

  const handleLogout = async () => {
    try {
      await clinicApi.logout();
    } catch {}
    setCurrentUser(null);
    setPatients([]);
    setAppointments([]);
    setConditions([]);
    setNotes([]);
    setFiles([]);
    setAllFiles([]);
    showToast('تم تسجيل الخروج بنجاح.');
  };

  const handleAddPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await clinicApi.createPatient(patientData);
    await refreshData();
    showToast(`تمت إضافة المريض "${created.fullName}" بنجاح`);

    const folderInfo = localPatientStorageService.getFolderInfo();
    if (folderInfo.autoSaveEnabled) {
      try {
        await localPatientStorageService.savePatientFileLocally(
          created,
          [],
          [],
          [],
          [],
          settings
        );
      } catch (err) {
        console.warn('Auto-save locally error:', err);
      }
    }
    return created;
  };

  const handleUpdatePatient = async (id: string, updates: Partial<Patient>) => {
    const updated = await clinicApi.updatePatient(id, updates);
    await refreshData();
    showToast(`تم تحديث بيانات المريض "${updated.fullName}"`);

    const folderInfo = localPatientStorageService.getFolderInfo();
    if (folderInfo.autoSaveEnabled) {
      try {
        const ptConditions = conditions.filter(c => c.patientId === id);
        const ptNotes = notes.filter(n => n.patientId === id);
        const ptApts = appointments.filter(a => a.patientId === id);
        const ptFiles = allFiles.filter(f => f.patientId === id);
        await localPatientStorageService.savePatientFileLocally(
          updated,
          ptConditions,
          ptNotes,
          ptApts,
          ptFiles,
          settings
        );
      } catch (err) {
        console.warn('Auto-save locally error:', err);
      }
    }
    return updated;
  };

  const handleDeletePatient = async (id: string) => {
    await clinicApi.deletePatient(id);
    if (activeDossierPatientId === id) {
      setActiveDossierPatientId(null);
    }
    await refreshData();
    showToast('تم نقل المريض إلى سلة المحذوفات بنجاح.');
  };

  const handleAddAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => {
    const created = await clinicApi.createAppointment(appointmentData);
    await refreshData();
    showToast(`تم حجز الموعد بنجاح (${created.appointmentTime})`);
  };

  const handleUpdateAppointment = async (id: string, updates: Partial<Appointment>) => {
    await clinicApi.updateAppointment(id, updates);
    await refreshData();
    handleInvoicesUpdated();
    showToast('تم تحديث الموعد بنجاح.');
  };

  const handleDeleteAppointment = async (id: string) => {
    await clinicApi.deleteAppointment(id);
    await refreshData();
    handleInvoicesUpdated();
    showToast('تم حذف الموعد.');
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    await clinicApi.updateAppointment(appointmentId, { status: 'completed' });
    await refreshData();
    handleInvoicesUpdated();
    showToast('تم إتمام الموعد وتحديث السجل المالي.');
  };

  const handleAddCondition = async (conditionData: Omit<DentalCondition, 'id' | 'createdAt'>) => {
    await clinicApi.createDentalCondition(conditionData);
    await refreshData();
    showToast(`تم تسجيل تشخيص السن #${conditionData.toothNumber}`);
  };

  const handleUpdateCondition = async (id: string, updates: Partial<DentalCondition>) => {
    await clinicApi.updateDentalCondition(id, updates);
    await refreshData();
    showToast('تم تحديث حالة السن.');
  };

  const handleDeleteCondition = async (id: string) => {
    await clinicApi.deleteDentalCondition(id);
    await refreshData();
    showToast('تم حذف حالة السن.');
  };


  const handleAddNote = async (noteText: string) => {
    if (!activeDossierPatientId) return;
    await clinicApi.createClinicalNote({
      patientId: activeDossierPatientId,
      noteText,
      doctorName: currentUser?.fullName || settings.doctorName,
    });
    const updatedNotes = await clinicApi.getClinicalNotes(activeDossierPatientId);
    setNotes(updatedNotes);
    showToast('تمت إضافة الملاحظة السريرية.');
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!activeDossierPatientId) return;
    await clinicApi.deleteClinicalNote(noteId);
    const updatedNotes = await clinicApi.getClinicalNotes(activeDossierPatientId);
    setNotes(updatedNotes);
    showToast('تم حذف الملاحظة.');
  };

  const handleUploadFile = async (file: File, category: string) => {
    if (!activeDossierPatientId) return;
    await clinicApi.uploadFile(activeDossierPatientId, file, category);
    const [updatedFiles, updatedAllFiles] = await Promise.all([
      clinicApi.getPatientFiles(activeDossierPatientId),
      clinicApi.getPatientFiles(),
    ]);
    setFiles(updatedFiles);
    setAllFiles(updatedAllFiles);
    showToast(`تم رفع الملف "${file.name}" بنجاح`);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!activeDossierPatientId) return;
    await clinicApi.deleteFile(fileId);
    const [updatedFiles, updatedAllFiles] = await Promise.all([
      clinicApi.getPatientFiles(activeDossierPatientId),
      clinicApi.getPatientFiles(),
    ]);
    setFiles(updatedFiles);
    setAllFiles(updatedAllFiles);
    showToast('تم حذف الملف.');
  };

  const handleUpdateSettings = async (updates: Partial<ClinicSettings>): Promise<ClinicSettings> => {
    const updated = await clinicApi.updateSettings(updates);
    setSettings(updated);
    showToast('تم حفظ الإعدادات بنجاح.');
    return updated;
  };

  const handleQuickBackup = async (): Promise<void> => {
    const url = clinicApi.getBackupExportUrl();
    window.location.href = url;
    showToast('جارٍ تنزيل النسخة الاحتياطية (ZIP)...');
  };

  const handleRestoreBackup = async (file: File): Promise<{ success: boolean; message: string }> => {
    const res = await clinicApi.restoreBackup(file);
    showToast(res.message);
    await refreshData();
    return res;
  };

  const activePatient = patients.find(p => p.id === activeDossierPatientId);
  const patientAppointments = appointments.filter(a => a.patientId === activeDossierPatientId);
  const patientConditions = conditions.filter(c => c.patientId === activeDossierPatientId);
  const todayStr = getClinicTodayStr();
  const todayAppointments = appointments.filter(a => a.appointmentDate === todayStr);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-blue-100 space-y-3 animate-pulse">
          <div className="w-10 h-10 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold font-heading">جارٍ التحقق من أمان الجلسة والاتصال...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginModal
        isFirstTimeSetup={isFirstTimeSetup}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`مرحباً بك ${user.fullName}`);
        }}
        onSetupSuccess={(user) => {
          setIsFirstTimeSetup(false);
          setCurrentUser(user);
          showToast(`تم تهيئة النظام وتسجيل الدخول كـ ${user.fullName}`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans" dir="rtl">
      {/* Session Inactivity Timeout Warning Modal (pops up 1 minute before expiration) */}
      <SessionTimeoutWarning
        currentUser={currentUser}
        onLogout={handleLogout}
        onShowToast={showToast}
      />

      {toast && (
        <div className="fixed bottom-4 left-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Slide-out Drawer Sidebar on the Right */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onQuickBackup={handleQuickBackup}
        settings={settings}
        todayCount={todayAppointments.length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Column (Takes 100% of the screen width when sidebar is closed) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          onQuickBackup={handleQuickBackup}
          settings={settings}
          todayCount={todayAppointments.length}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Smart 30-min Reminder Banner */}
        <SmartReminderBanner
          appointments={appointments}
          patients={patients}
          onOpenPatientDossier={(pId) => handleOpenPatientDossier(pId)}
          onCompleteAppointment={handleCompleteAppointment}
        />

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center text-slate-500 space-y-2">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-medium">جارٍ تحديث البيانات السريرية...</p>
            </div>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && stats && (
              <Dashboard
                stats={stats}
                patients={patients}
                appointments={appointments}
                conditions={conditions}
                notes={notes}
                files={allFiles}
                settings={settings}
                onOpenPatientDossier={(pId) => handleOpenPatientDossier(pId)}
                onAddNewPatient={() => setCurrentTab('patients')}
                onBookAppointment={(targetDate?: string) => {
                  setAppointmentDateFilter(targetDate || '');
                  setCurrentTab('appointments');
                }}
                onQuickBackup={handleQuickBackup}
                onCompleteAppointment={handleCompleteAppointment}
                networkInfo={networkInfo}
                onAddAppointment={handleAddAppointment}
                onShowToast={showToast}
                refreshTrigger={followUpRefreshKey}
                onNavigateToFollowUp={(category) => {
                  if (category) setFollowUpCategory(category);
                  setCurrentTab('follow-up');
                }}
              />
            )}

            {currentTab === 'appointments' && (
              <Appointments
                appointments={appointments}
                patients={patients}
                initialDateFilter={appointmentDateFilter}
                onAddAppointment={handleAddAppointment}
                onUpdateAppointment={handleUpdateAppointment}
                onDeleteAppointment={handleDeleteAppointment}
                onOpenPatientDossier={(pId) => handleOpenPatientDossier(pId)}
                onRefresh={refreshData}
              />
            )}

            {currentTab === 'patients' && (
              <Patients
                patients={patients}
                files={allFiles}
                conditions={conditions}
                appointments={appointments}
                notes={notes}
                settings={settings}
                onAddPatient={handleAddPatient}
                onUpdatePatient={handleUpdatePatient}
                onDeletePatient={handleDeletePatient}
                onOpenPatientDossier={handleOpenPatientDossier}
                onBookAppointmentForPatient={(_pId) => {
                  setCurrentTab('appointments');
                }}
                onRefreshFiles={refreshData}
                onShowToast={showToast}
                currentUserRole={currentUser.role}
                onUpdateSettings={handleUpdateSettings}
                onCreateInvoice={async (data) => {
                  const inv = await clinicApi.createInvoice(data);
                  handleInvoicesUpdated();
                  return inv;
                }}
              />
            )}

            {currentTab === 'follow-up' && (
              <PatientFollowUp
                onOpenPatientDossier={handleOpenPatientDossier}
                initialCategory={followUpCategory}
                refreshTrigger={followUpRefreshKey}
                onFollowUpChanged={async () => {
                  setFollowUpRefreshKey(k => k + 1);
                  try {
                    const freshStats = await clinicApi.getDashboardStats();
                    setStats(freshStats);
                  } catch {}
                }}
              />
            )}

            {currentTab === 'conditions' && (
              <DentalConditions
                conditions={conditions}
                patients={patients}
                onOpenPatientDossier={handleOpenPatientDossier}
                onAddCondition={handleAddCondition}
                onDeleteCondition={handleDeleteCondition}
                onUpdateCondition={handleUpdateCondition}
              />
            )}

            {currentTab === 'before-after' && (
              <BeforeAfter
                patients={patients}
                settings={settings}
                onOpenPatientDossier={handleOpenPatientDossier}
                onShowToast={showToast}
                currentUserRole={currentUser.role}
                onNavigateToPatients={() => setCurrentTab('patients')}
              />
            )}

            {currentTab === 'jaw-chart' && (
              <InteractiveJawChart onShowToast={showToast} />
            )}

            {currentTab === 'finance' && currentUser.role === 'doctor' && (
              <FinancialReport
                patients={patients}
                appointments={appointments}
                settings={settings}
                onOpenPatientDossier={handleOpenPatientDossier}
                onUpdateAppointment={handleUpdateAppointment}
                onRefreshAllData={refreshData}
                financialRefreshKey={financialRefreshKey}
              />
            )}

            {currentTab === 'trash' && currentUser.role === 'doctor' && (
              <TrashBin
                onRefreshAllData={refreshData}
                onShowToast={showToast}
              />
            )}

            {currentTab === 'users' && currentUser.role === 'doctor' && (
              <UserManagement
                currentUser={currentUser}
                onShowToast={showToast}
              />
            )}

            {currentTab === 'settings' && currentUser.role === 'doctor' && (
              <SettingsBackup
                settings={settings}
                networkInfo={networkInfo}
                onUpdateSettings={handleUpdateSettings}
                onExportBackup={handleQuickBackup}
                onRestoreBackup={handleRestoreBackup}
                patientsCount={patients.length}
                filesCount={allFiles.length}
              />
            )}

            {currentTab === 'medications' && currentUser.role === 'doctor' && (
              <MedicationsSettings
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onShowToast={showToast}
              />
            )}

            {currentTab === 'disease-prices' && currentUser.role === 'doctor' && (
              <DiseasePricesSettings
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onShowToast={showToast}
              />
            )}

            {currentTab === 'guide' && (
              <UserGuide />
            )}
          </>
        )}
      </main>

      {activePatient && (
        <PatientDossier
          patient={activePatient}
          appointments={patientAppointments}
          conditions={patientConditions}
          notes={notes}
          files={files}
          initialTab={activeDossierTab}
          settings={settings}
          onShowToast={showToast}
          onClose={() => {
            setActiveDossierPatientId(null);
            setActiveDossierTab('profile');
            setFollowUpRefreshKey(k => k + 1);
          }}
          onUpdatePatient={handleUpdatePatient}
          onAddCondition={handleAddCondition}
          onUpdateCondition={handleUpdateCondition}
          onDeleteCondition={handleDeleteCondition}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onUploadFile={handleUploadFile}
          onDeleteFile={handleDeleteFile}
          onBookAppointment={(_pId) => {
            setActiveDossierPatientId(null);
            setCurrentTab('appointments');
          }}
          onAddAppointment={handleAddAppointment}
          onUpdateAppointment={handleUpdateAppointment}
          onDeleteAppointment={handleDeleteAppointment}
          currentUserRole={currentUser.role}
          onInvoicesUpdated={handleInvoicesUpdated}
        />
      )}

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>{settings.clinicName}</span> • <span>{settings.doctorName}</span> • <span>طب وجراحة الأسنان</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            نظام إدارة العيادة المحلي • النسخة المحمية المعتمدة
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
