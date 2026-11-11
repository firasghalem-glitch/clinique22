import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { clinicApi } from '../services/api';
import { Clock, ShieldAlert, LogOut, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface SessionTimeoutWarningProps {
  currentUser: User | null;
  onLogout: () => void;
  onShowToast: (message: string) => void;
}

// 30 minutes total inactivity timeout
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
// Warning starts 1 minute before expiration (29 minutes of inactivity)
const WARNING_THRESHOLD_MS = 29 * 60 * 1000;
// Silent sync interval if user is active (every 10 minutes)
const SILENT_SYNC_INTERVAL_MS = 10 * 60 * 1000;

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  currentUser,
  onLogout,
  onShowToast,
}) => {
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isExtending, setIsExtending] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const lastServerSyncRef = useRef<number>(Date.now());
  const hasWarnedRef = useRef<boolean>(false);

  // Extend the session on the server and reset local timers
  const handleExtendSession = useCallback(async () => {
    setIsExtending(true);
    try {
      await clinicApi.extendSession();
      lastActivityRef.current = Date.now();
      lastServerSyncRef.current = Date.now();
      setShowWarning(false);
      hasWarnedRef.current = false;
      onShowToast('تم تمديد الجلسة بنجاح! يمكنك مواصلة العمل بأمان.');
    } catch (err: any) {
      // If server already invalidated session, force logout
      onLogout();
      onShowToast('انتهت صلاحية الجلسة في الخادم. يرجى تسجيل الدخول مجدداً.');
    } finally {
      setIsExtending(false);
    }
  }, [onLogout, onShowToast]);

  // Track user presence via DOM events (throttled to avoid performance overhead)
  useEffect(() => {
    if (!currentUser) return;

    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleUserActivity = () => {
      // If warning modal is already open, do not silently dismiss - require explicit click on "البقاء متصلاً"
      if (hasWarnedRef.current) return;

      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          lastActivityRef.current = Date.now();
          throttleTimeout = null;

          // Silent server touch if user is actively working and 10 mins passed since last sync
          const now = Date.now();
          if (now - lastServerSyncRef.current >= SILENT_SYNC_INTERVAL_MS) {
            clinicApi.extendSession().then(() => {
              lastServerSyncRef.current = now;
            }).catch(() => {});
          }
        }, 3000);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, handleUserActivity, { passive: true }));

    return () => {
      if (throttleTimeout) clearTimeout(throttleTimeout);
      events.forEach(ev => window.removeEventListener(ev, handleUserActivity));
    };
  }, [currentUser]);

  // Main countdown and inspection interval (checks every 1 second)
  useEffect(() => {
    if (!currentUser) {
      setShowWarning(false);
      hasWarnedRef.current = false;
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remainingTotalMs = INACTIVITY_TIMEOUT_MS - elapsed;

      // 1. Session completely expired (30 minutes passed with zero activity)
      if (remainingTotalMs <= 0) {
        setShowWarning(false);
        hasWarnedRef.current = false;
        clearInterval(interval);
        onLogout();
        onShowToast('انتهت جلسة العمل تلقائياً بعد 30 دقيقة من الخمول لحماية بيانات المرضى.');
        return;
      }

      // 2. Less than 60 seconds remain (29 minutes of inactivity reached)
      if (elapsed >= WARNING_THRESHOLD_MS) {
        hasWarnedRef.current = true;
        setShowWarning(true);
        const secs = Math.max(1, Math.ceil(remainingTotalMs / 1000));
        setSecondsRemaining(secs);
      } else {
        if (!hasWarnedRef.current) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentUser, onLogout, onShowToast]);

  if (!currentUser || !showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 p-4 backdrop-blur-sm flex items-center justify-center min-h-screen py-6 animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-400 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Urgency Header */}
        <div className="p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white text-center relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-white/20 mx-auto flex items-center justify-center mb-2 shadow-inner border border-white/30 animate-pulse">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-base sm:text-lg font-extrabold font-heading text-white">
            تنبيه أمان: قرب انتهاء جلسة العمل
          </h2>
          <p className="text-xs text-amber-100 mt-1">
            تم رصد عدم نشاط في النظام لمدة 29 دقيقة
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 text-right">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed font-sans">
              لحماية خصوصية المرضى والبيانات الطبية، سيتم إغلاق الجلسة تلقائياً وتسجيل خروجك إذا لم تقم بتأكيد تواجدك.
            </p>
          </div>

          {/* Countdown Clock Display */}
          <div className="text-center py-2">
            <div className="text-xs text-slate-500 font-bold mb-1">الوقت المتبقي قبل الإغلاق:</div>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-amber-400 rounded-xl font-mono text-2xl font-extrabold tracking-wider border border-slate-700 shadow-inner">
              <Clock className="w-5 h-5 text-amber-400 animate-spin" />
              <span>00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 font-medium">
              ثانية متبقية قبل التحويل لصفحة تسجيل الدخول
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleExtendSession}
              disabled={isExtending}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-extrabold font-heading shadow-md shadow-blue-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExtending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جارٍ تمديد الجلسة...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>البقاء متصلاً (تمديد الجلسة 30 دقيقة أخرى)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>تسجيل الخروج الآن</span>
            </button>
          </div>

          <div className="text-center pt-1 border-t border-slate-100">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
              نظام أمان العيادة السريرية الداخلي
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
