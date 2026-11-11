import React, { useState, useRef } from 'react';
import {
  Smile,
  Maximize2,
  Minimize2,
  RotateCw,
  ExternalLink,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface InteractiveJawChartProps {
  onShowToast?: (message: string) => void;
}

export const InteractiveJawChart: React.FC<InteractiveJawChartProps> = ({ onShowToast }) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const chartUrl = '/assets/aistudio/dental_chart_jaw_complete_no_cut_9a79d1a9.html';

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
    if (onShowToast) {
      onShowToast('تمت إعادة تحميل مخطط الأسنان');
    }
  };

  const handleOpenExternal = () => {
    try {
      window.open(chartUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900/90 p-2 sm:p-4 flex flex-col' : ''}`}>
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Smile className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black font-heading text-slate-900 tracking-tight">
                مخطط الفك والأسنان التفاعلي
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                <Sparkles className="w-3 h-3 text-blue-600" />
                عرض الفك كاملاً
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              نموذج تفاعلي لفحص وتشخيص الأسنان وترقيمها بنظام FDI الدولي (11 إلى 48)، مع إمكانية التبديل بين الفك العلوي والفك السفلي وتحديد الإجراءات السريرية.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            title="إعادة تحميل المخطط"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-600" />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
            title={isFullscreen ? 'تصغير العرض' : 'تكبير لملء الشاشة'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-blue-700" />
                <span>تصغير العرض</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-700" />
                <span>ملء الشاشة</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenExternal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
            title="فتح في نافذة مستقلة (مناسب للشاشات الإضافية أو المريض)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-200" />
            <span className="hidden sm:inline">نافذة مستقلة</span>
          </button>
        </div>
      </div>

      {/* Quick Feature Highlights (hidden in fullscreen to maximize space) */}
      {!isFullscreen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-slate-600">
          <div className="bg-white/80 backdrop-blur-xs rounded-xl border border-slate-200/80 p-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium truncate">ترقيم FDI 11-48</span>
          </div>
          <div className="bg-white/80 backdrop-blur-xs rounded-xl border border-slate-200/80 p-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium truncate">فحص الفك العلوي والسفلي</span>
          </div>
          <div className="bg-white/80 backdrop-blur-xs rounded-xl border border-slate-200/80 p-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium truncate">تسجيل الحالات والعلاجات</span>
          </div>
          <div className="bg-white/80 backdrop-blur-xs rounded-xl border border-slate-200/80 p-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium truncate">يعمل محلياً دون إنترنت</span>
          </div>
        </div>
      )}

      {/* Main Interactive Chart Frame */}
      <div
        className={`relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${
          isFullscreen ? 'flex-1 min-h-0' : 'h-[750px] sm:h-[820px] lg:h-[860px]'
        }`}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-slate-50 flex items-center justify-center z-10 transition-opacity">
            <div className="text-center space-y-3">
              <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">جارٍ تحميل مخطط الأسنان التفاعلي...</p>
            </div>
          </div>
        )}

        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={chartUrl}
          title="مخطط الفك والأسنان التفاعلي"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 block"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
};
