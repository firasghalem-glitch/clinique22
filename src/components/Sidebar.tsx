import React from 'react';
import { User, ClinicSettings } from '../types';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Activity,
  Receipt,
  Shield,
  Settings,
  BookOpen,
  Download,
  LogOut,
  X,
  Stethoscope,
  ChevronLeft,
  Images,
  Trash2,
  UserCheck,
  Pill,
  Coins,
  ChevronDown,
  Sliders,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  onQuickBackup: () => void;
  settings: ClinicSettings;
  todayCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
  onQuickBackup,
  settings,
  todayCount,
  isOpen,
  onClose,
}) => {
  const isDoctor = currentUser?.role === 'doctor';
  const [isSettingsOpen, setIsSettingsOpen] = React.useState<boolean>(() => {
    return currentTab === 'medications' || currentTab === 'disease-prices';
  });

  React.useEffect(() => {
    if (currentTab === 'medications' || currentTab === 'disease-prices') {
      setIsSettingsOpen(true);
    }
  }, [currentTab]);

  const isSettingsSubActive = currentTab === 'medications' || currentTab === 'disease-prices';

  // Automatically select the chosen page and immediately close the sidebar
  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    onClose();
  };

  const clinicalNavItems = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'appointments',
      label: 'المواعيد',
      icon: Calendar,
      badge: todayCount > 0 ? `${todayCount} اليوم` : null,
      badgeColor: 'bg-blue-500/20 text-blue-200 border border-blue-400/30',
    },
    {
      id: 'patients',
      label: 'المرضى',
      icon: Users,
      badge: null,
    },
    {
      id: 'follow-up',
      label: 'متابعة المرضى',
      icon: UserCheck,
      badge: null,
    },
    {
      id: 'conditions',
      label: 'حالات الأسنان',
      icon: Activity,
      badge: null,
    },
    {
      id: 'before-after',
      label: 'قبل و بعد العلاج',
      icon: Images,
      badge: 'معرض',
      badgeColor: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30',
    },
  ];

  const adminNavItems = isDoctor
    ? [
        {
          id: 'finance',
          label: 'المالية والفواتير',
          icon: Receipt,
        },
        {
          id: 'trash',
          label: 'سلة المحذوفات',
          icon: Trash2,
        },
        {
          id: 'users',
          label: 'إدارة الفريق والموظفين',
          icon: Shield,
        },
        {
          id: 'settings',
          label: 'الإعدادات والنسخ',
          icon: Settings,
        },
      ]
    : [];

  const helpNavItems = [
    {
      id: 'guide',
      label: 'دليل الاستخدام',
      icon: BookOpen,
    },
  ];

  return (
    <>
      {/* Backdrop Overlay: Closes sidebar on click */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          title="انقر لإغلاق القائمة"
        />
      )}

      {/* Slide-out Sidebar Drawer on the Right (Medical Blue Theme) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-72 sm:w-80 bg-gradient-to-b from-[#0f2744] via-[#102a4a] to-[#0a192f] text-white border-l border-blue-800/50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        {/* Brand & Clinic Info Header */}
        <div className="p-4 sm:p-5 border-b border-blue-800/60 flex items-center justify-between gap-3 bg-gradient-to-b from-[#133054] to-[#0f2744]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/30 shrink-0 border border-blue-400/30">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C7.5 2 4 4.5 4 8c0 2.2 1.5 5.5 3 9.5.8 2.1 1.7 4.5 2.5 4.5s1.5-2 2.5-4c1-2 2-2 2-2s1 0 2 2c1 2 1.7 4 2.5 4s1.7-2.4 2.5-4.5c1.5-4 3-7.3 3-9.5 0-3.5-3.5-6-8-6zm0 2c3.5 0 6 1.8 6 4 0 1.7-1.3 4.6-2.6 8.1-.5 1.4-1.1 2.9-1.4 3.4-.6-1-1.3-1.8-2-1.8s-1.4.8-2 1.8c-.3-.5-.9-2-1.4-3.4C7.3 12.6 6 9.7 6 8c0-2.2 2.5-4 6-4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => handleSelectTab('dashboard')}
                className="text-sm sm:text-base font-extrabold text-white font-heading tracking-tight truncate block text-right hover:text-blue-200 transition-colors cursor-pointer w-full"
                title={currentUser?.clinicName || settings.clinicName || 'عيادة طب وجراحة الأسنان'}
              >
                {currentUser?.clinicName || settings.clinicName || 'عيادة طب وجراحة الأسنان'}
              </button>
              <div className="text-[11px] text-blue-200/80 font-medium truncate flex items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-blue-100">{currentUser?.fullName || settings.doctorName || 'د. المشرف'}</span>
                <span className="text-blue-400/50">•</span>
                <span className="text-cyan-300 font-bold">طب الأسنان</span>
              </div>
            </div>
          </div>

          {/* Close button (X) */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800/50 transition-colors cursor-pointer"
            title="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Group 1: Clinical Sections */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-blue-300/70 font-heading">
              الأقسام السريرية
            </div>
            <nav className="space-y-1">
              {clinicalNavItems.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-right group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold border border-blue-400/40'
                        : 'text-slate-200 hover:bg-blue-800/40 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-blue-400 group-hover:text-blue-200'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                            isActive ? 'bg-white/20 text-white' : item.badgeColor
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronLeft className="w-3.5 h-3.5 text-white/80" />}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Group 2: Management & Finance (Doctor Only) */}
          {adminNavItems.length > 0 && (
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-blue-300/70 font-heading flex items-center justify-between">
                <span>الإدارة والمالية</span>
                <span className="text-[9px] bg-blue-500/20 text-blue-200 px-1.5 py-0.2 rounded border border-blue-400/30">
                  خاص بالطبيب
                </span>
              </div>
              <nav className="space-y-1">
                {adminNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-right group ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold border border-blue-400/40'
                          : 'text-slate-200 hover:bg-blue-800/40 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-blue-400 group-hover:text-blue-200'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <ChevronLeft className="w-3.5 h-3.5 text-white/80" />}
                    </button>
                  );
                })}

                {/* قسم الإعدادات الجديد القابل للتوسيع (الأدوية وسعر المرض) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(prev => !prev)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-right group ${
                      isSettingsSubActive
                        ? 'bg-blue-800/40 text-blue-200 font-bold border border-blue-400/30'
                        : 'text-slate-200 hover:bg-blue-800/40 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Sliders
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isSettingsSubActive ? 'text-blue-300' : 'text-blue-400 group-hover:text-blue-200'
                        }`}
                      />
                      <span className="truncate font-heading font-bold">الإعدادات</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-blue-300/80 transition-transform duration-200 ${
                          isSettingsOpen ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* القائمتان الفرعيتان (تظهر وتختفي عند الضغط على الإعدادات) */}
                  {isSettingsOpen && (
                    <div className="mt-1 mr-4 pr-3 border-r-2 border-blue-500/40 space-y-1 animate-in fade-in slide-in-from-top-1">
                      <button
                        type="button"
                        onClick={() => handleSelectTab('medications')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-right group ${
                          currentTab === 'medications'
                            ? 'bg-blue-600 text-white font-bold shadow-xs border border-blue-400/30'
                            : 'text-slate-300 hover:bg-blue-800/30 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Pill className={`w-3.5 h-3.5 ${currentTab === 'medications' ? 'text-white' : 'text-purple-300'}`} />
                          <span>الأدوية</span>
                        </div>
                        {currentTab === 'medications' && <ChevronLeft className="w-3 h-3 text-white/80" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectTab('disease-prices')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-right group ${
                          currentTab === 'disease-prices'
                            ? 'bg-blue-600 text-white font-bold shadow-xs border border-blue-400/30'
                            : 'text-slate-300 hover:bg-blue-800/30 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Coins className={`w-3.5 h-3.5 ${currentTab === 'disease-prices' ? 'text-white' : 'text-emerald-300'}`} />
                          <span>سعر المرض</span>
                        </div>
                        {currentTab === 'disease-prices' && <ChevronLeft className="w-3 h-3 text-white/80" />}
                      </button>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}

          {/* Group 3: Help & Documentation */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-blue-300/70 font-heading">
              المساعدة والتوثيق
            </div>
            <nav className="space-y-1">
              {helpNavItems.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-right group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold border border-blue-400/40'
                        : 'text-slate-200 hover:bg-blue-800/40 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-blue-400 group-hover:text-blue-200'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive && <ChevronLeft className="w-3.5 h-3.5 text-white/80" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Doctor Backup CTA */}
          {isDoctor && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  onQuickBackup();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/30 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-900/40 cursor-pointer"
                title="تصدير نسخة احتياطية كاملة من قاعدة بيانات العيادة والملفات"
              >
                <Download className="w-4 h-4 text-blue-200" />
                <span>نسخ احتياطي سريع (ZIP)</span>
              </button>
            </div>
          )}
        </div>

        {/* User Card & Logout Footer */}
        {currentUser && (
          <div className="p-3 border-t border-blue-800/50 bg-[#0a1a30]/80">
            <div className="flex items-center justify-between gap-2.5 bg-[#122b4d] p-2.5 rounded-xl border border-blue-700/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-200 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-400/30">
                  <Stethoscope className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="min-w-0 text-right">
                  <div className="text-xs font-bold text-white truncate font-heading">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] text-blue-300/80 font-mono flex items-center gap-1 mt-0.5">
                    <span className="text-cyan-300 font-bold">
                      {currentUser.role === 'doctor' ? 'طبيب' : 'مساعد'}
                    </span>
                    <span className="text-blue-500">•</span>
                    <span className="text-blue-300/70 truncate">@{currentUser.username}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                title="تسجيل الخروج من الجلسة"
                className="p-1.5 text-blue-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
