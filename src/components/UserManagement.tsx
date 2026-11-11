import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { clinicApi } from '../services/api';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Clock,
  Search,
  AlertCircle,
} from 'lucide-react';

interface UserManagementProps {
  currentUser: User;
  onShowToast: (message: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  onShowToast,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'audit'>('users');

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'doctor' | 'assistant'>('assistant');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  // Filter
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsersAndLogs = async () => {
    setIsLoading(true);
    try {
      const [usersList, logsData] = await Promise.all([
        clinicApi.getUsers(),
        clinicApi.getAuditLogs().catch(() => ({ logs: [] })),
      ]);
      setUsers(usersList);
      setAuditLogs(logsData.logs || []);
    } catch (err: any) {
      onShowToast(`خطأ في تحميل المستخدمين: ${err.message || 'فشل الاتصال'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndLogs();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newFullName.trim() || !newUsername.trim() || !newPassword) {
      setCreateError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    if (newPassword.length < 8) {
      setCreateError('يجب ألا تقل كلمة المرور المؤقتة عن 8 خانات.');
      return;
    }
    if (!/[A-Za-z\u0621-\u064A]/.test(newPassword) || !/\d/.test(newPassword)) {
      setCreateError('يجب أن تحتوي كلمة المرور على حرف واحد ورقم واحد على الأقل.');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await clinicApi.createUser({
        fullName: newFullName.trim(),
        username: newUsername.trim(),
        temporaryPassword: newPassword,
        role: newRole,
      });
      setUsers(prev => [...prev, created]);
      setIsCreateOpen(false);
      setNewFullName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('assistant');
      onShowToast(`تمت إضافة الموظف(ة) (${created.fullName}) بنجاح`);
      loadUsersAndLogs();
    } catch (err: any) {
      setCreateError(err.message || 'فشل إنشاء الحساب.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setResetError(null);
    if (!resetPassword || resetPassword.length < 8) {
      setResetError('يجب ألا تقل كلمة المرور عن 8 خانات.');
      return;
    }
    if (!/[A-Za-z\u0621-\u064A]/.test(resetPassword) || !/\d/.test(resetPassword)) {
      setResetError('يجب أن تحتوي كلمة المرور على حرف واحد ورقم واحد على الأقل.');
      return;
    }
    setIsSubmitting(true);
    try {
      await clinicApi.resetUserPassword(resetTargetUser.id, resetPassword);
      onShowToast(`تمت إعادة تعيين كلمة المرور لحساب (${resetTargetUser.fullName})`);
      setResetTargetUser(null);
      setResetPassword('');
      loadUsersAndLogs();
    } catch (err: any) {
      setResetError(err.message || 'فشل تعيين كلمة المرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const res = await clinicApi.toggleUserStatus(user.id);
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, isActive: res.user.isActive } : u)));
      onShowToast(`تم ${res.user.isActive ? 'تفعيل' : 'تعطيل'} حساب (${user.fullName})`);
      loadUsersAndLogs();
    } catch (err: any) {
      onShowToast(`تعذر تعديل الحالة: ${err.message || 'خطأ'}`);
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
      await clinicApi.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      onShowToast(`تم حذف حساب (${user.fullName}) بنجاح`);
      loadUsersAndLogs();
    } catch (err: any) {
      onShowToast(`تعذر حذف الحساب: ${err.message || 'خطأ'}`);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shadow-2xs shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
                إدارة الفريق والموظفين
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100/80 text-blue-800 font-heading tabular-nums">
                {users.length} أعضاء
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans leading-relaxed">
              إدارة حسابات فريق عمل عيادتك، إضافة الموظفين وتعيين كلمات المرور المؤقتة، وسجلات الرقابة والأمان
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-heading rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة موظف جديد</span>
          </button>
          <button
            onClick={loadUsersAndLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Tabs: Users List vs Audit Log */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>فريق العمل والموظفين ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل الرقابة والأمان لعيادتك (Audit Log)</span>
        </button>
      </div>

      {/* CONTENT: USERS LIST */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو اسم المستخدم..."
                className="w-full pr-9 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-sans">
              المستخدم الحالي: <strong className="text-blue-900">{currentUser.fullName}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-heading font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">الاسم الكامل</th>
                  <th className="py-3 px-4">اسم المستخدم (Username)</th>
                  <th className="py-3 px-4">الدور / الصلاحية</th>
                  <th className="py-3 px-4">حالة الحساب</th>
                  <th className="py-3 px-4">تاريخ الإنشاء</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => {
                  const isCurrent = user.id === currentUser.id;
                  const isDoctor = user.role === 'doctor';
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isDoctor ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {user.fullName.slice(0, 1)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block font-heading">
                              {user.fullName}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                (أنت)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600" dir="ltr">
                        @{user.username}
                      </td>
                      <td className="py-3 px-4">
                        {isDoctor ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">
                            <Shield className="w-3 h-3 text-blue-700" />
                            مدير العيادة (صلاحيات كاملة)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <Users className="w-3 h-3 text-slate-500" />
                            موظف عيادة (مساعد)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            معطل
                          </span>
                        )}
                        {user.mustChangePassword && (
                          <span className="block text-[10px] text-amber-700 mt-0.5 font-bold">
                            (مطلوب تغيير الرمز)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {user.createdAt ? user.createdAt.slice(0, 10) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setResetTargetUser(user);
                              setResetPassword('');
                              setResetError(null);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="إعادة تعيين كلمة المرور"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                user.isActive
                                  ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-800'
                                  : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
                              }`}
                              title={user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            >
                              {user.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          )}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف الحساب نهائياً"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENT: AUDIT LOGS */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <span className="font-extrabold text-xs text-slate-900 font-heading">
                سجل النشاطات والأمان الفوري (audit.log)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              آخر {auditLogs.length} حركة مسجلة
            </span>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-2 font-mono text-[11px] bg-slate-950 text-slate-200 rounded-b-xl" dir="ltr">
            {auditLogs.length === 0 ? (
              <p className="text-slate-500 text-center py-6">لا توجد سجلات أمان مسجلة بعد.</p>
            ) : (
              auditLogs.map((logLine, idx) => {
                const isFail = logLine.includes('FAILED') || logLine.includes('LOCKED') || logLine.includes('DENIED');
                const isSuccess = logLine.includes('SUCCESS');
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded border border-slate-800/80 leading-relaxed ${
                      isFail ? 'bg-rose-950/40 text-rose-300' : isSuccess ? 'bg-emerald-950/30 text-emerald-300' : 'bg-slate-900 text-slate-300'
                    }`}
                  >
                    {logLine}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE USER */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 p-3 sm:p-4 backdrop-blur-xs flex items-center justify-center min-h-screen py-4 sm:py-8">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading text-slate-900">
                    إنشاء حساب مستخدم جديد
                  </h3>
                  <p className="text-xs text-slate-500">
                    إضافة طبيب أو مساعد عيادة إلى النظام
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md cursor-pointer hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 overscroll-contain">
              {createError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم الكامل:
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="مثلاً: فاطمة الزهراء (مساعدة)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المستخدم (Username):
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. fatima_assist"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-left font-mono transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الدور والصلاحية:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRole('assistant')}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        newRole === 'assistant'
                          ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      مساعد عيادة
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRole('doctor')}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        newRole === 'doctor'
                          ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      طبيب أسنان
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كلمة المرور المؤقتة (8 خانات على الأقل):
                  </label>
                  <input
                    type="password"
                    required
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-left font-mono transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    سيتعين على المستخدم تغيير كلمة المرور عند أول تسجيل دخول له.
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 p-3 sm:p-4 backdrop-blur-xs flex items-center justify-center min-h-screen py-4 sm:py-8">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading text-slate-900">
                    تعيين كلمة مرور جديدة
                  </h3>
                  <p className="text-xs text-slate-500">
                    للمستخدم: <strong>{resetTargetUser.fullName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetTargetUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md cursor-pointer hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 overscroll-contain">
              {resetError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كلمة المرور المؤقتة الجديدة (8 خانات على الأقل):
                  </label>
                  <input
                    type="password"
                    required
                    dir="ltr"
                    autoFocus
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-left font-mono transition-colors"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetTargetUser(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
