import React from 'react';
import {
  BookOpen,
  Play,
  Wifi,
  Download,
  HardDrive,
  Layers,
  Clock,
  Activity,
} from 'lucide-react';

export const UserGuide: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shadow-2xs shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
                دليل الاستخدام والتشغيل للعيادة
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100/80 text-blue-800 font-heading">
                إرشادات التشغيل
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans leading-relaxed">
              شرح مبسط لكيفية تشغيل النظام وربط الأجهزة على شبكة العيادة المحلية واستخدام الميزات السريرية
            </p>
          </div>
        </div>
      </div>

      {/* 1. Technology overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
          <Layers className="w-5 h-5 text-blue-600" />
          <span>هيكلية النظام التقنية (Node.js + React + تخزين محلي)</span>
        </div>
        <div className="text-xs text-slate-600 leading-relaxed space-y-2">
          <p>
            1. <strong>سهولة التشغيل على Windows:</strong> النظام لا يتطلب أي خوادم معقدة مثل Apache أو XAMPP، ويعمل مباشرة عبر بيئة Node.js الحديثة.
          </p>
          <p>
            2. <strong>ملف التشغيل التلقائي <code>run-clinic.bat</code>:</strong> يتيح لك فتح النظام بنقرة واحدة بدون الحاجة لكتابة أوامر في الطرفية.
          </p>
          <p>
            3. <strong>شبكة العيادة المحلية (LAN):</strong> يتيح مشاركة لوحة التحكم مع جهاز المساعد(ة) أو شاشات قاعات الكشف عبر شبكة الواي فاي الداخلية.
          </p>
          <p>
            4. <strong>أمان بيانات المرضى:</strong> التخزين محلي 100% ومشفر لحماية الخصوصية الطبية.
          </p>
        </div>
      </div>

      {/* 2. Step by step installation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Play className="w-5 h-5 text-blue-600" />
          <span>خطوات التشغيل على جهاز العيادة (كمبيوتر الاستقبال أو الطبيب)</span>
        </div>
        <div className="space-y-3 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">1</span>
            <div>
              <strong className="text-slate-900">تثبيت بيئة Node.js (مرة واحدة فقط):</strong>
              <p className="text-slate-600 mt-0.5">
                تأكد من تنزيل وتثبيت Node.js من الموقع الرسمي <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono" dir="ltr">https://nodejs.org</code> (اختر الإصدار المستقر LTS).
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">2</span>
            <div>
              <strong className="text-slate-900">التشغيل عبر <code>run-clinic.bat</code>:</strong>
              <p className="text-slate-600 mt-0.5">
                انقر نقراً مزدوجاً على ملف <strong>run-clinic.bat</strong> وسيبدأ تشغيل الخادم وتثبيت الاعتماديات وفتح المتصفح تلقائياً.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">3</span>
            <div>
              <strong className="text-slate-900">تسجيل الدخول وإدارة الصلاحيات:</strong>
              <p className="text-slate-600 mt-0.5">
                عند فتح النظام لأول مرة، سيُطلب منك إنشاء حساب الطبيب المسؤول. يمكنك بعد ذلك إضافة حسابات المساعدين من تبويب &quot;المستخدمين والصلاحيات&quot;.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Multi-Device Network Setup */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
          <Wifi className="w-5 h-5 text-blue-600" />
          <span>ربط أجهزة العيادة عبر الشبكة الداخلية (Wi-Fi / LAN)</span>
        </div>
        <div className="text-xs text-slate-600 leading-relaxed space-y-2">
          <p>
            1. تأكد من اتصال جهاز الطبيب وجهاز الاستقبال بنفس شبكة الواي فاي أو الراوتر في العيادة.
          </p>
          <p>
            2. افتح تبويب <strong>&quot;الإعدادات والنسخ&quot;</strong> وانسخ رابط الـ IP المخصص للشبكة المحلية (مثال: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold" dir="ltr">http://192.168.1.15:3000</code>).
          </p>
          <p>
            3. افتح متصفح Google Chrome من جهاز المساعد(ة) أو التابلت واكتب الرابط لتبدأ العمل فوراً بتزامن كامل.
          </p>
        </div>
      </div>

      {/* 4. Backup Strategy */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
          <Download className="w-5 h-5 text-emerald-600" />
          <span>النسخ الاحتياطي اليومي لحماية بيانات العيادة (USB Flash Drive)</span>
        </div>
        <div className="text-xs text-slate-600 leading-relaxed space-y-1.5">
          <p>• اضغط على زر <strong>&quot;نسخ احتياطي (ZIP)&quot;</strong> في أعلى الشاشة بنقرة واحدة.</p>
          <p>• سيتم تنزيل ملف ZIP كامل يحتوي على قاعدة البيانات وجميع صور وأشعة المرضى.</p>
          <p>• يُنصح بالاحتفاظ بنسخة على فلاش ديسك USB خارجي في نهاية كل يوم عمل.</p>
        </div>
      </div>

      {/* 5. Smart Audio Reminder */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <Clock className="w-5 h-5 text-amber-600" />
          <span>نظام التنبيه الصوتي الذكي (للمواعيد الوشيكة خلال 30 دقيقة)</span>
        </div>
        <div className="text-xs text-slate-600 leading-relaxed space-y-1.5">
          <p>• <strong>نغمة لطيفة:</strong> تم توليد نغمة طبية هادئة عبر Web Audio API تعمل بدون إنترنت وبدون ملفات خارجية.</p>
          <p>• <strong>تنبيه مرئي:</strong> يظهر شريط تنبيه أعلى الصفحة يوضح كم دقيقة متبقية على الموعد، واسم المريض، ورقم هاتفه.</p>
          <p>• <strong>التحكم في الصوت:</strong> يمكنك كتم الصوت أو تفعيله في أي وقت من زر مكبر الصوت في الشريط العلوي.</p>
        </div>
      </div>


      {/* 7. Dental Records & Treatments */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
          <Activity className="w-5 h-5 text-blue-600" />
          <span>سجل حالات الأسنان والتشخيصات السريرية (FDI)</span>
        </div>
        <div className="text-xs text-slate-600 leading-relaxed space-y-1.5">
          <p>• <strong>الترقيم المعتمد عالمياً:</strong> نظام FDI (32 سناً دائماً و 20 سناً لبنياً للأطفال).</p>
          <p>• <strong>الأسطح الخمسة:</strong> فحص وتحديد أسطح السن بدقة (الإطباقي Occlusal، الإنسي Mesial، الوحشي Distal، الدهليزي Buccal، اللساني Lingual).</p>
          <p>• <strong>الحالات السريرية الملونة:</strong> تسوس، علاج عصب وجذور، حشوات كمبوزيت ومعدنية، تيجان، جسور، زرعات، قلع، وغيرها.</p>
        </div>
      </div>
    </div>
  );
};
