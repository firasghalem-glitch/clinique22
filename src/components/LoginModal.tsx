import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { clinicApi } from '../services/api';
import {
  Lock,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Building2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface LoginModalProps {
  isFirstTimeSetup: boolean;
  onLoginSuccess: (user: User) => void;
  onSetupSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isFirstTimeSetup,
  onLoginSuccess,
  onSetupSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'recover'>(
    isFirstTimeSetup ? 'register' : 'login'
  );

  const [isEphemeral, setIsEphemeral] = useState<boolean>(false);

  useEffect(() => {
    clinicApi.checkSystemStatus()
      .then(status => {
        if (status.persistent === false || status.storageType === 'ephemeral_cloud') {
          setIsEphemeral(true);
        }
      })
      .catch(() => {});
  }, []);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register clinic state (empty by default as requested)
  const [regFullName, setRegFullName] = useState('');
  const [regClinicName, setRegClinicName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Recovery Key display modal after successful registration or reset
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Recover form state
  const [recoverUsername, setRecoverUsername] = useState('');
  const [recoverKey, setRecoverKey] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [recoverConfirmPassword, setRecoverConfirmPassword] = useState('');
  const [showRecoverPassword, setShowRecoverPassword] = useState(false);

  // Mandatory password change state (for temporary password)
  const [mustChangeUser, setMustChangeUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCopyRecoveryKey = () => {
    if (!generatedRecoveryKey) return;
    navigator.clipboard.writeText(generatedRecoveryKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleFinishRegistration = () => {
    if (pendingUser) {
      onSetupSuccess(pendingUser);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!username.trim() || !password) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await clinicApi.login(username.trim(), password);
      if (response.user.mustChangePassword) {
        setMustChangeUser(response.user);
      } else {
        setSuccessMsg('تم تسجيل الدخول بنجاح! مرحباً بك.');
        setTimeout(() => {
          onLoginSuccess(response.user);
        }, 300);
      }
    } catch (err: any) {
      setError(err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regFullName.trim() || !regClinicName.trim() || !regUsername.trim() || !regPassword || !regConfirmPassword) {
      setError('يرجى ملء جميع الحقول المطلوبة لإنشاء العيادة.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (regPassword.length < 8) {
      setError('يجب ألا تقل كلمة المرور عن 8 خانات.');
      return;
    }
    if (!/[A-Za-z\u0621-\u064A]/.test(regPassword) || !/\d/.test(regPassword)) {
      setError('يجب أن تحتوي كلمة المرور على حرف واحد ورقم واحد على الأقل.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await clinicApi.registerClinic({
        fullName: regFullName.trim(),
        clinicName: regClinicName.trim(),
        username: regUsername.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });

      setPendingUser(response.user);
      setGeneratedRecoveryKey(response.recoveryKey);
      setSuccessMsg('تم إنشاء العيادة وحساب المدير بنجاح!');
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء حساب العيادة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!recoverUsername.trim() || !recoverKey.trim() || !recoverNewPassword || !recoverConfirmPassword) {
      setError('يرجى ملء جميع الحقول المطلوبة للاسترجاع.');
      return;
    }
    if (recoverNewPassword !== recoverConfirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (recoverNewPassword.length < 8) {
      setError('يجب ألا تقل كلمة المرور الجديدة عن 8 خانات.');
      return;
    }
    if (!/[A-Za-z\u0621-\u064A]/.test(recoverNewPassword) || !/\d/.test(recoverNewPassword)) {
      setError('يجب أن تحتوي كلمة المرور على حرف واحد ورقم واحد على الأقل.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await clinicApi.recoverDirector({
        username: recoverUsername.trim(),
        recoveryKey: recoverKey.trim().toUpperCase(),
        newPassword: recoverNewPassword,
        confirmPassword: recoverConfirmPassword,
      });

      if (response.newRecoveryKey) {
        setPendingUser(response.user);
        setGeneratedRecoveryKey(response.newRecoveryKey);
        setSuccessMsg('تم استرجاع الحساب وتحديث كلمة المرور بنجاح! تم إصدار مفتاح استرجاع جديد.');
      } else {
        setSuccessMsg(response.message || 'تم تحديث كلمة المرور بنجاح!');
        setTimeout(() => {
          onLoginSuccess(response.user);
        }, 400);
      }
    } catch (err: any) {
      setError(err.message || 'فشل استرجاع الحساب. يرجى التحقق من اسم المستخدم ومفتاح الاسترجاع.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!newPassword || !confirmNewPassword) {
      setError('يرجى إدخال وتأكيد كلمة المرور الجديدة.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (newPassword.length < 8) {
      setError('يجب ألا تقل كلمة المرور الجديدة عن 8 خانات.');
      return;
    }
    if (!/[A-Za-z\u0621-\u064A]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('يجب أن تحتوي كلمة المرور على حرف واحد ورقم واحد على الأقل.');
      return;
    }

    setIsLoading(true);
    try {
      await clinicApi.changePassword({
        newPassword,
        confirmPassword: confirmNewPassword,
      });
      if (mustChangeUser) {
        onLoginSuccess({
          ...mustChangeUser,
          mustChangePassword: false,
        });
      }
    } catch (err: any) {
      setError(err.message || 'تعذر تغيير كلمة المرور.');
    } finally {
      setIsLoading(false);
    }
  };

  // If a recovery key was just generated, show the crucial Recovery Key dialog
  if (generatedRecoveryKey) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/90 p-4 backdrop-blur-sm flex items-center justify-center min-h-screen py-6">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/20 mx-auto flex items-center justify-center mb-2 shadow-inner border border-white/30">
              <KeyRound className="w-6 h-6 text-amber-100" />
            </div>
            <h2 className="text-lg font-extrabold font-heading text-white">
              مفتاح استرجاع حساب المدير (هام جداً)
            </h2>
            <p className="text-xs text-amber-100 mt-1">
              يُرجى حفظ هذا الرمز الآن في مكان آمن أو كتابته خارجياً
            </p>
          </div>

          <div className="p-6 space-y-4 text-right">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">لماذا هذا المفتاح ضروري؟</strong>
                <span>
                  نظراً لأن التطبيق يعمل <strong>بدون إنترنت كلياً</strong> ولا يرتبط بأي بريد إلكتروني،
                  فإن هذا المفتاح هو وسيلتك الوحيدة لاسترجاع حساب المدير في حال نسيت كلمة المرور! لن يُعرض هذا المفتاح مرة أخرى.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 font-heading">
                مفتاح الاسترجاع الخاص بك:
              </label>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <span className="font-mono text-base font-extrabold text-amber-300 tracking-wider dir-ltr select-all">
                  {generatedRecoveryKey}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRecoveryKey}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    copiedKey
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ المفتاح</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinishRegistration}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-extrabold font-heading shadow-md shadow-blue-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>فهمت وحفظت المفتاح • الدخول إلى عيادتي</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 p-3 sm:p-4 backdrop-blur-xs flex items-center justify-center min-h-screen py-4 sm:py-8">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="py-4 px-5 sm:px-6 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white text-center relative overflow-hidden shrink-0">
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-600/20 rounded-full blur-xl pointer-events-none" />
          <div className="w-11 h-11 rounded-xl bg-blue-700/80 mx-auto flex items-center justify-center mb-2 shadow-inner border border-blue-600/50">
            <Stethoscope className="w-6 h-6 text-blue-100" />
          </div>
          <h2 className="text-base sm:text-lg font-extrabold font-heading text-white tracking-tight">
            منظومة عيادة الأسنان السريرية
          </h2>
          <p className="text-[11px] sm:text-xs text-blue-100/90 mt-0.5 font-sans leading-relaxed">
            نظام متكامل، مستقل تماماً ويعمل بدون إنترنت (Offline)
          </p>
        </div>

        {/* Body Container */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
          
          {/* Ephemeral Cloud Warning Banner */}
          {isEphemeral && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2.5 leading-relaxed shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-amber-900 block mb-0.5">تنبيه: أنت تعمل في بيئة سحابية تجريبية مؤقتة.</span>
                البيانات تُمسح عند إعادة تشغيل الخادم. للاستخدام الفعلي في العيادة، يجب تشغيل التطبيق محلياً على حاسوب العيادة.
              </div>
            </div>
          )}
          
          {/* Main Mode Switcher: Login vs Register Clinic */}
          {!mustChangeUser && activeTab !== 'recover' && (
            <div className="flex border-2 border-slate-200 bg-slate-100 p-1 rounded-xl gap-1.5 text-xs font-heading font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white text-blue-900 shadow-sm font-extrabold border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <LogIn className="w-4 h-4 text-blue-700" />
                <span>تسجيل الدخول</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-blue-700 text-white shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>إنشاء حساب عيادة</span>
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-800 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="font-semibold leading-relaxed">{error}</div>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* TAB 1: STANDARD LOGIN */}
          {activeTab === 'login' && !mustChangeUser && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200/70 text-xs text-blue-900 leading-relaxed flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  تسجيل الدخول إلى حسابك المسجل
                </span>
                <span className="text-[10px] text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-300 font-mono">
                  مدير / موظف
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">
                  اسم المستخدم (Username):
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="اسم المستخدم"
                    className="w-full pr-9 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono font-bold transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 font-heading">
                    كلمة المرور:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="text-[11px] text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>إخفاء</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>إظهار</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-9 pl-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-extrabold font-heading shadow-md shadow-blue-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
              >
                {isLoading ? (
                  <span>جارٍ التحقق وتأكيد الجلسة...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول إلى المنظومة</span>
                  </>
                )}
              </button>

              {/* Links for registering clinic or recovering director */}
              <div className="pt-2 flex flex-col items-center gap-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                >
                  طبيب جديد؟ اضغط هنا لإنشاء حساب لعيادتك الخاصة ⚡
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('recover');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-medium hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>نسيت كلمة مرور المدير؟ استرجاع الحساب بالمفتاح</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER NEW CLINIC */}
          {activeTab === 'register' && !mustChangeUser && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="p-2.5 bg-blue-50/90 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  عند إنشاء حساب جديد تصبح <strong>مديراً لعيادتك</strong>، وتحصل تلقائياً على مساحة بيانات جديدة ومستقلة بالكامل بدون أي مرضى سابقين.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">
                  الاسم الكامل للمدير (الطبيب):
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">
                  اسم العيادة:
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regClinicName}
                    onChange={(e) => setRegClinicName(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">
                  اسم المستخدم (فريد للدخول):
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="dr_username"
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono transition-colors font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 font-heading">
                      كلمة المرور:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                    >
                      {showRegPassword ? 'إخفاء' : 'إظهار'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      dir="ltr"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">
                    تأكيد كلمة المرور:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      dir="ltr"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono transition-colors"
                    />
                  </div>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 block -mt-1">
                8 أحرف على الأقل تحتوي حرفاً ورقماً واحداً على الأقل.
              </span>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-extrabold font-heading shadow-md shadow-blue-750/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
              >
                {isLoading ? (
                  <span>جارٍ إنشاء مساحة العيادة وتأمينها...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>إنشاء العيادة والحصول على مفتاح الاسترجاع</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                >
                  لديك حساب بالفعل وتريد تسجيل الدخول؟ اضغط هنا ⚡
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: RECOVER DIRECTOR ACCOUNT */}
          {activeTab === 'recover' && !mustChangeUser && (
            <form onSubmit={handleRecoverSubmit} className="space-y-3">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  أدخل اسم مستخدم المدير ومفتاح الاسترجاع الخاص بك (الذي حصلت عليه عند إنشاء الحساب) لتعيين كلمة مرور جديدة.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">
                  اسم مستخدم المدير (Username):
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={recoverUsername}
                    onChange={(e) => setRecoverUsername(e.target.value)}
                    placeholder="safi"
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">
                  مفتاح الاسترجاع (Recovery Key):
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={recoverKey}
                    onChange={(e) => setRecoverKey(e.target.value)}
                    placeholder="DENT-XXXX-XXXX-XXXX-XXXX"
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-mono uppercase font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 font-heading">
                      كلمة المرور الجديدة:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRecoverPassword(!showRecoverPassword)}
                      className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                    >
                      {showRecoverPassword ? 'إخفاء' : 'إظهار'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showRecoverPassword ? 'text' : 'password'}
                      required
                      dir="ltr"
                      value={recoverNewPassword}
                      onChange={(e) => setRecoverNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">
                    تأكيد كلمة المرور:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showRecoverPassword ? 'text' : 'password'}
                      required
                      dir="ltr"
                      value={recoverConfirmPassword}
                      onChange={(e) => setRecoverConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 block -mt-1">
                8 أحرف على الأقل تحتوي حرفاً ورقماً واحداً على الأقل.
              </span>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-extrabold font-heading shadow-md shadow-amber-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
              >
                {isLoading ? (
                  <span>جارٍ التحقق وتحديث كلمة المرور...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>تأكيد استرجاع الحساب</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 font-bold hover:underline cursor-pointer"
                >
                  العودة إلى صفحة تسجيل الدخول
                </button>
              </div>
            </form>
          )}

          {/* MODE 4: MANDATORY PASSWORD CHANGE FOR STAFF ON FIRST LOGIN */}
          {mustChangeUser && (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">مرحباً بك {mustChangeUser.fullName}</p>
                  <p className="mt-0.5 text-[11px] text-amber-800">
                    هذا أول تسجيل دخول لك بكلمة مرور مؤقتة أنشأها لك المدير. لدواعي الأمان، يجب عليك تعيين كلمة مرور شخصية خاصة بك للاستمرار.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 font-heading">
                      كلمة المرور الجديدة:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                    >
                      {showNewPassword ? 'إخفاء' : 'إظهار'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      dir="ltr"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">
                    تأكيد كلمة المرور الجديدة:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      dir="ltr"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 block -mt-1">
                8 أحرف على الأقل تحتوي حرفاً ورقماً واحداً على الأقل.
              </span>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-extrabold font-heading shadow-md shadow-blue-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>جارٍ الحفظ وتحديث الحساب...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد كلمة المرور والدخول إلى العيادة</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Security Badges */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-[10px] text-slate-400 font-sans shrink-0">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              تشفير محلي PBKDF2/scrypt
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-500" />
              عزل تام بين العيادات
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
