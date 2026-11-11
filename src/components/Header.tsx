import React, { useState, useEffect } from 'react';
import { User, ClinicSettings } from '../types';
import {
  Menu,
  Clock,
  Bell,
  Volume2,
  VolumeX,
  Download,
  LayoutDashboard,
  Calendar,
  Users,
  Activity,
  Smile,
  Receipt,
  Shield,
  Settings,
  BookOpen,
  UserCheck,
  Pill,
  Coins,
} from 'lucide-react';
import { audioAlertService } from '../utils/audioAlert';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  onQuickBackup: () => void;
  settings: ClinicSettings;
  todayCount: number;
  imminentCount?: number;
  onOpenImminentAppointment?: () => void;
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  currentUser,
  onQuickBackup,
  todayCount,
  imminentCount = 0,
  onOpenImminentAppointment,
  onToggleSidebar,
  onToggleMobileSidebar,
}) => {
  const handleToggle = onToggleSidebar || onToggleMobileSidebar;
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => audioAlertService.isSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioAlertService.setSoundEnabled(next);
    if (next) {
      audioAlertService.playPleasantChime();
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTabInfo = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'لوحة التحكم السريرية',
          subtitle: 'نظرة عامة على نشاط العيادة والإحصائيات اليومية',
          icon: LayoutDashboard,
        };
      case 'appointments':
        return {
          title: 'جدول المواعيد والزيارات',
          subtitle: `مواعيد اليوم (${todayCount}) وسجل المواعيد المستقبلية`,
          icon: Calendar,
        };
      case 'patients':
        return {
          title: 'سجل ملفات المرضى',
          subtitle: 'إدارة شاملة للمرضى، الأشعة والملفات السريرية',
          icon: Users,
        };
      case 'follow-up':
        return {
          title: 'متابعة المرضى',
          subtitle: 'متابعة المرضى ذوي العلاجات الجارية والمتأخرين عن العودة تلقائياً',
          icon: UserCheck,
        };
      case 'conditions':
        return {
          title: 'سجل حالات وعلاجات الأسنان',
          subtitle: 'متابعة تشخيصات الأسنان وإجراءات المعالجة السريرية',
          icon: Activity,
        };
      case 'jaw-chart':
        return {
          title: 'مخطط الفك والأسنان التفاعلي',
          subtitle: 'فحص وتشخيص الأسنان مع عرض كامل للفكين العلوي والسفلي بنظام FDI',
          icon: Smile,
        };
      case 'finance':
        return {
          title: 'التقارير المالية والمداخيل',
          subtitle: 'متابعة الفواتير والمدفوعات والمستحقات المالية',
          icon: Receipt,
        };
      case 'users':
        return {
          title: 'إدارة الفريق والموظفين',
          subtitle: 'حسابات طاقم العيادة، الصلاحيات وسجلات الرقابة والأمان',
          icon: Shield,
        };
      case 'settings':
        return {
          title: 'إعدادات العيادة والنسخ الاحتياطي',
          subtitle: 'بيانات العيادة، الشبكة المحلية وتصدير/استيراد البيانات',
          icon: Settings,
        };
      case 'medications':
        return {
          title: 'قائمة الأدوية المعتمدة بالعيادة',
          subtitle: 'إدارة وتخصيص الأدوية والعقاقير الطبية المتاحة للاختيار في ملف المريض',
          icon: Pill,
        };
      case 'disease-prices':
        return {
          title: 'جدول أسعار الأمراض والعلاجات (DZD)',
          subtitle: 'تحديد وتعديل أسعار الكشف والعلاجات السريرية المعتمدة في النظام',
          icon: Coins,
        };
      case 'guide':
        return {
          title: 'دليل استخدام النظام',
          subtitle: 'إرشادات تشغيل العيادة ومميزات الأمان والتنبيهات',
          icon: BookOpen,
        };
      default:
        return {
          title: 'لوحة التحكم',
          subtitle: 'نظام إدارة عيادة طب الأسنان',
          icon: LayoutDashboard,
        };
    }
  };

  const tabInfo = getTabInfo();
  const TabIcon = tabInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Right Section: Mobile Menu Trigger + Current Section Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar toggle button (Visible on all screen sizes) */}
            <button
              type="button"
              onClick={handleToggle}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-blue-950 bg-blue-50 hover:bg-blue-100/90 border border-blue-200 transition-all font-bold text-xs shadow-2xs cursor-pointer group shrink-0"
              title="فتح القائمة الجانبية للأقسام والخدمات"
            >
              <Menu className="w-4 h-4 text-blue-700 transition-transform group-hover:scale-110" />
              <span>القائمة الجانبية</span>
            </button>

            {/* Current Section Title & Breadcrumb */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0 hidden sm:flex">
                <TabIcon className="w-4 h-4 text-blue-700" />
              </div>
              <div className="min-w-0 text-right">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading tracking-tight truncate">
                  {tabInfo.title}
                </h1>
                <p className="text-[11px] text-slate-500 font-medium truncate hidden md:block">
                  {tabInfo.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Left Section (RTL End): Live Clock + Alerts + Audio + Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live Clock */}
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono tabular-nums text-slate-700"
              title="الساعة الحالية للعيادة"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{currentTimeStr || '00:00:00'}</span>
            </div>

            {/* Imminent Appointments Notification Bell */}
            <button
              type="button"
              onClick={onOpenImminentAppointment}
              title={
                imminentCount > 0
                  ? `تنبيه: لديك ${imminentCount} موعد وشيك خلال 30 دقيقة!`
                  : 'تنبيهات المواعيد الوشيكة'
              }
              className={`relative p-2 rounded-xl transition-all cursor-pointer ${
                imminentCount > 0
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 ring-2 ring-amber-400 animate-pulse'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Bell className="w-4 h-4" />
              {imminentCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-bold font-mono">
                  {imminentCount}
                </span>
              )}
            </button>

            {/* Sound alert chime toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={soundEnabled ? 'التنبيه الصوتي مفعّل (انقر للكتم)' : 'التنبيه الصوتي صامت (انقر للتشغيل)'}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                soundEnabled
                  ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                  : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Quick backup button for doctor */}
            {currentUser?.role === 'doctor' && (
              <button
                type="button"
                onClick={onQuickBackup}
                title="تصدير نسخة احتياطية سريعة ZIP لقاعدة البيانات"
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>نسخ احتياطي (ZIP)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
