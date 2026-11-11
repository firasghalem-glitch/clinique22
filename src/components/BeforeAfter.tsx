import React, { useState, useEffect, useRef } from 'react';
import { BeforeAfterCase, Patient, ClinicSettings } from '../types';
import { clinicApi } from '../services/api';
import { getClinicTodayStr } from '../utils/clinicDate';
import {
  Images,
  Plus,
  Search,
  Maximize2,
  Minimize2,
  X,
  Upload,
  ArrowLeftRight,
  Columns2,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Printer,
  Calendar,
  User,
  Trash2,
  Edit3,
  Sun,
  Eye,
  Glasses,
  Contrast,
  Zap,
  Lightbulb,
  Scale,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Award,
  CheckCircle2,
  Activity,
  FileText,
  Star,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Phone,
  Check,
  AlertCircle,
  UserCheck,
  UserPlus,
  ExternalLink,
  Filter,
  ChevronDown,
  Save
} from 'lucide-react';

interface BeforeAfterProps {
  patients: Patient[];
  settings: ClinicSettings;
  onOpenPatientDossier: (patientId: string) => void;
  onShowToast: (message: string) => void;
  currentUserRole?: 'doctor' | 'assistant';
  onNavigateToPatients?: () => void;
}

// VITA Classical & 3D Master Scale definitions
interface VitaShade {
  code: string;
  nameAr: string;
  family: 'A' | 'B' | 'C' | 'D' | 'Bleach';
  rank: number; // 1 = Whitest, 20 = Darkest
  hex: string;
}

const VITA_SHADES: VitaShade[] = [
  { code: 'BL1', nameAr: 'بياض هوليوود فائق 1', family: 'Bleach', rank: 1, hex: '#FFFFFF' },
  { code: 'BL2', nameAr: 'بياض هوليوود مشرق 2', family: 'Bleach', rank: 2, hex: '#FCFAF5' },
  { code: 'BL3', nameAr: 'بياض هوليوود طبيعي 3', family: 'Bleach', rank: 3, hex: '#FAF6EE' },
  { code: 'BL4', nameAr: 'بياض هوليوود ناعم 4', family: 'Bleach', rank: 4, hex: '#F7F2E6' },
  { code: 'B1', nameAr: 'عاجي فاتح ناصع', family: 'B', rank: 5, hex: '#F6F1DF' },
  { code: 'A1', nameAr: 'عاجي مشرق نضر', family: 'A', rank: 6, hex: '#F3ECD6' },
  { code: 'B2', nameAr: 'أصفر طبيعي فاتح', family: 'B', rank: 7, hex: '#EFE7CC' },
  { code: 'D2', nameAr: 'رمادي محمر خفيف', family: 'D', rank: 8, hex: '#EAE1C4' },
  { code: 'A2', nameAr: 'عاجي طبيعي قياسي', family: 'A', rank: 9, hex: '#E7DCBA' },
  { code: 'C1', nameAr: 'رمادي عاجي فاتح', family: 'C', rank: 10, hex: '#E2D6B5' },
  { code: 'C2', nameAr: 'رمادي دخاني معتدل', family: 'C', rank: 11, hex: '#DDD0AD' },
  { code: 'D4', nameAr: 'رمادي محمر متوسط', family: 'D', rank: 12, hex: '#D7C9A4' },
  { code: 'A3', nameAr: 'عاجي طبيعي دافئ', family: 'A', rank: 13, hex: '#D5C49A' },
  { code: 'D3', nameAr: 'بني رمادي معتدل', family: 'D', rank: 14, hex: '#D0BE92' },
  { code: 'B3', nameAr: 'أصفر كهرماني دافئ', family: 'B', rank: 15, hex: '#CAB787' },
  { code: 'A3.5', nameAr: 'عاجي داكن كثيف', family: 'A', rank: 16, hex: '#C4AE7A' },
  { code: 'B4', nameAr: 'أصفر داكن مشبع', family: 'B', rank: 17, hex: '#BEA670' },
  { code: 'C3', nameAr: 'رمادي ترابي غامق', family: 'C', rank: 18, hex: '#B89F67' },
  { code: 'A4', nameAr: 'بني عاجي عميق', family: 'A', rank: 19, hex: '#B2975E' },
  { code: 'C4', nameAr: 'رمادي مسود داكن', family: 'C', rank: 20, hex: '#AB8F54' },
];

const CLINICAL_CATEGORIES = [
  { id: 'all', label: 'كافة الحالات السريرية', icon: Star },
  { id: 'bleaching', label: 'تبييض الأسنان (Bleaching)', icon: Sparkles },
  { id: 'ortho', label: 'تقويم وإغلاق الفلجة (Ortho)', icon: ArrowLeftRight },
  { id: 'veneers', label: 'قشور الفينير وهوليوود (Veneers)', icon: Award },
  { id: 'implants', label: 'زراعة وتركيبات (Implants)', icon: ShieldCheck },
  { id: 'gingival', label: 'تجميل اللثة الوردية (Gingival)', icon: Activity },
];

const CLINICAL_LIGHTING_FILTERS = [
  {
    id: 'natural',
    label: 'ضوء طبيعي عيادي (5500K)',
    icon: Sun,
    cssFilter: 'none',
  },
  {
    id: 'polarized',
    label: 'فلتر استقطاب (Polarized)',
    icon: Glasses,
    cssFilter: 'contrast(1.15) brightness(0.96) saturate(1.15)',
  },
  {
    id: 'high_chroma',
    label: 'تباين لوني فائق (High Chroma)',
    icon: Contrast,
    cssFilter: 'saturate(1.75) contrast(1.12)',
  },
  {
    id: 'uv_glow',
    label: 'فلورسنت كاشف التصبغات (UV Glow)',
    icon: Zap,
    cssFilter: 'contrast(1.3) brightness(1.1) saturate(1.5) hue-rotate(190deg)',
  },
  {
    id: 'warm',
    label: 'إضاءة دافئة (Warm Tungsten)',
    icon: Lightbulb,
    cssFilter: 'sepia(0.25) brightness(1.05) saturate(1.15)',
  },
  {
    id: 'value_check',
    label: 'أبيض وأسود تحليلي (Value Check)',
    icon: Scale,
    cssFilter: 'grayscale(1) contrast(1.25)',
  },
];

const LINE_COLORS = [
  { name: 'فيروزي عيادي (Cyan)', value: '#06b6d4' },
  { name: 'أزرق ملكي (Royal Blue)', value: '#2563eb' },
  { name: 'أخضر زمردي (Emerald)', value: '#10b981' },
  { name: 'أحمر سريري (Rose)', value: '#f43f5e' },
  { name: 'برتقالي (Amber)', value: '#f59e0b' },
  { name: 'أرجواني (Purple)', value: '#a855f7' },
  { name: 'أصفر فاقع (Yellow)', value: '#eab308' },
  { name: 'أبيض ناصع (Pure White)', value: '#ffffff' },
];

// Default Realistic Reference Cases (using high-resolution assets generated from user specs)
const INITIAL_DEMO_CASES: BeforeAfterCase[] = [
  {
    id: 'BAC-001',
    patientId: 'p-demo-1',
    patientName: 'مريم حداد',
    category: 'تقويم وإغلاق الفلجة (Ortho)',
    procedureTitle: 'تقويم وتعديل اصطفاف وإغلاق الفلجة (Diastema Closure)',
    technique: 'علاج تقويم ثابت بحاصرات معدنية وإغلاق الفراغ المركزي وتناسق القواطع',
    procedureDate: '2026-09-28',
    toothNumbers: '11, 21 (القواطع المركزية العلوية)',
    duration: '6 أشهر (جلسات متابعة شهرية)',
    beforeImageUrl: '/assets/dental/diastema_before.jpg',
    afterImageUrl: '/assets/dental/diastema_after.jpg',
    shadeBefore: 'A3',
    shadeAfter: 'A1',
    shadeJump: '+7 درجات',
    beforeNotes: 'فلجة أمامية مركزية واضحة (Diastema) بمسافة 2.5 مم بين السنين 11 و 21، مع لون عاجي طبيعي دافئ A3.',
    afterNotes: 'إغلاق تام للفلجة وتراصف متناظر لكامل القوس السني، مع تبييض وحماية المينا إلى درجة A1 المشرقة.',
    clinicalNotes: 'تم إغلاق الفلجة بين القاطعين المركزين العلويين وإعادة تنظيم خط الابتسامة التجميلي وتناسق القوس السني وتثبيتها بسلك تثبيت لساني دائم (Lingual Retainer).',
    doctorName: 'د. أمين بن صالح',
    createdAt: '2026-09-28T10:30:00Z',
  },
  {
    id: 'BAC-002',
    patientId: 'p-demo-2',
    patientName: 'سمير خلوفي',
    category: 'تبييض الأسنان (Bleaching)',
    procedureTitle: 'تبييض أسنان احترافي بالعيادة (In-Office Bleaching)',
    technique: 'تبييض ضوئي فوتوديناميكي بجلسة واحدة (45 دقيقة)',
    procedureDate: '2026-10-14',
    toothNumbers: 'من 15 إلى 25 ومن 35 إلى 45 (القوسين)',
    duration: 'جلسة واحدة (45 دقيقة)',
    beforeImageUrl: '/assets/dental/bleach_before.jpg',
    afterImageUrl: '/assets/dental/bleach_after.jpg',
    shadeBefore: 'A3.5',
    shadeAfter: 'BL1',
    shadeJump: '+15 درجة',
    beforeNotes: 'تصبغات تبغية وشاي وقهوة مكثفة بدرجة داكنة A3.5 مع تراكمات وتفاوت ملحوظ بين القواطع.',
    afterNotes: 'قفزة بياض استثنائية بلغت 15 درجة وصولاً إلى بياض هوليوود الفائق BL1 مع لمعان متجانس دون أي حساسية سنية.',
    clinicalNotes: 'تم عزل اللثة بالسد المطاطي وتطبيق جل هيدروجين بيروكسيد 38% مع تنشيط ليزري فوتوديناميكي في 3 دورات متتالية مدة كل منها 15 دقيقة.',
    doctorName: 'د. أمين بن صالح',
    createdAt: '2026-10-14T11:15:00Z',
  },
  {
    id: 'BAC-003',
    patientId: 'p-demo-3',
    patientName: 'أمينة بن عيسى',
    category: 'قشور الفينير وهوليوود (Veneers)',
    procedureTitle: 'ترميم قاطع متكسر وقشور فينير تجميلية (E-Max Veneer)',
    technique: 'ترميم السن 11 المكسور بقشرة إيماكس (E-Max Ceramic Veneer)',
    procedureDate: '2026-10-05',
    toothNumbers: 'السن 11 (القاطع المركزي العلوي الأيمن)',
    duration: 'جلستان (أسبوع واحد)',
    beforeImageUrl: '/assets/dental/veneer_before.jpg',
    afterImageUrl: '/assets/dental/veneer_after.jpg',
    shadeBefore: 'A3.5',
    shadeAfter: 'B1',
    shadeJump: '+11 درجات',
    beforeNotes: 'كسر رضي ناتج عن حادث في الحافة القاطعة للسن 11 يشمل ثلث التاج السريري مع شحوب وتفاوت لوني.',
    afterNotes: 'إعادة بناء حيوية للقاطع بقشرة خزفية إيماكس متدرجة الشفافية متطابقة بنسبة 100% مع السن المقابل 21 وبلون B1 فائق النضارة.',
    clinicalNotes: 'تحضير دقيق طفيف للسطح الدهليزي (Minimal Prep)، أخذ طبعة رقمية ثلاثية الأبعاد بالماسح الضوئي، ولصق نهائي باستخدام Variolink Esthetic Light.',
    doctorName: 'د. أمين بن صالح',
    createdAt: '2026-10-05T09:00:00Z',
  },
];

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  patients,
  settings,
  onOpenPatientDossier,
  onShowToast,
  currentUserRole = 'doctor',
  onNavigateToPatients,
}) => {
  const [cases, setCases] = useState<BeforeAfterCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedFilterPatientId, setSelectedFilterPatientId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // View mode switcher: 'slider' | 'side-by-side' | 'fade'
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side' | 'fade'>('slider');

  // Slider position (0 - 100)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [fadeOpacity, setFadeOpacity] = useState<number>(50);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const autoPlayRef = useRef<{ dir: number }>({ dir: 1 });

  // Clinical Filters & Annotations
  const [activeLightingFilter, setActiveLightingFilter] = useState<string>('natural');
  const [activeLineColor, setActiveLineColor] = useState<string>('#06b6d4');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isShadeModalOpen, setIsShadeModalOpen] = useState<boolean>(false);
  const [shadeTargetType, setShadeTargetType] = useState<'before' | 'after'>('after');
  const [editingCase, setEditingCase] = useState<BeforeAfterCase | null>(null);

  // Patient Selector State in Add/Edit Modal
  const [patientSearchTerm, setPatientSearchTerm] = useState<string>('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState<boolean>(false);

  // Form State for Add / Edit
  const [formPatientId, setFormPatientId] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('تبييض الأسنان (Bleaching)');
  const [formProcedureTitle, setFormProcedureTitle] = useState<string>('');
  const [formTechnique, setFormTechnique] = useState<string>('');
  const [formProcedureDate, setFormProcedureDate] = useState<string>(getClinicTodayStr());
  const [formToothNumbers, setFormToothNumbers] = useState<string>('11, 21');
  const [formDuration, setFormDuration] = useState<string>('جلسة واحدة (45 دقيقة)');
  const [formBeforeUrl, setFormBeforeUrl] = useState<string>('');
  const [formAfterUrl, setFormAfterUrl] = useState<string>('');
  const [formShadeBefore, setFormShadeBefore] = useState<string>('A3');
  const [formShadeAfter, setFormShadeAfter] = useState<string>('A1');
  const [formShadeJump, setFormShadeJump] = useState<string>('+7 درجات');
  const [formClinicalNotes, setFormClinicalNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // File Inputs
  const beforeFileRef = useRef<HTMLInputElement>(null);
  const afterFileRef = useRef<HTMLInputElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  // Calculate Shade Jump between two shades
  const calculateShadeJump = (before: string, after: string): string => {
    const bShade = VITA_SHADES.find(s => s.code === before);
    const aShade = VITA_SHADES.find(s => s.code === after);
    if (!bShade || !aShade) return '+0 درجة';
    const diff = bShade.rank - aShade.rank;
    if (diff > 0) return `+${diff} درجة`;
    if (diff === 0) return 'نفس الدرجة';
    return `${diff} درجة`;
  };

  // Load cases from backend or local storage
  const loadCases = async () => {
    setIsLoading(true);
    try {
      const serverCases = await clinicApi.getBeforeAfterCases();
      if (serverCases && serverCases.length > 0) {
        setCases(serverCases);
        setActiveCaseId(serverCases[0].id);
        localStorage.setItem('clinic_before_after_cache_v2', JSON.stringify(serverCases));
      } else {
        const cached = localStorage.getItem('clinic_before_after_cache_v2');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCases(parsed);
              setActiveCaseId(parsed[0].id);
              setIsLoading(false);
              return;
            }
          } catch {}
        }

        // Initialize with default seeds
        setCases(INITIAL_DEMO_CASES);
        setActiveCaseId(INITIAL_DEMO_CASES[0].id);
        localStorage.setItem('clinic_before_after_cache_v2', JSON.stringify(INITIAL_DEMO_CASES));

        // Push default seeds to server in background
        INITIAL_DEMO_CASES.forEach(c => {
          clinicApi.createBeforeAfterCase(c).catch(() => {});
        });
      }
    } catch (err) {
      console.warn('Loading from server failed:', err);
      const cached = localStorage.getItem('clinic_before_after_cache_v2');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setCases(parsed);
          if (parsed[0]) setActiveCaseId(parsed[0].id);
        } catch {}
      } else {
        setCases(INITIAL_DEMO_CASES);
        setActiveCaseId(INITIAL_DEMO_CASES[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  // Auto-play swing effect for presentation demo
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setSliderPos(prev => {
        let next = prev + autoPlayRef.current.dir * 0.75;
        if (next >= 92) {
          autoPlayRef.current.dir = -1;
          next = 92;
        } else if (next <= 8) {
          autoPlayRef.current.dir = 1;
          next = 8;
        }
        return next;
      });
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  // Current selected active case & patient object
  const activeCase = cases.find(c => c.id === activeCaseId) || cases[0] || INITIAL_DEMO_CASES[0];
  const activePatientObj = patients.find(p => p.id === activeCase?.patientId) || null;

  // Selected patient for modal form
  const selectedFormPatient = patients.find(p => p.id === formPatientId) || null;

  // Filtered patients for search inside modal
  const filteredPatientsForModal = patients.filter(p => {
    if (!patientSearchTerm.trim()) return true;
    const q = patientSearchTerm.toLowerCase().trim();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.diseaseCondition && p.diseaseCondition.toLowerCase().includes(q))
    );
  });

  // Filtering cases
  const filteredCases = cases.filter(c => {
    if (selectedFilterPatientId !== 'all') {
      if (c.patientId !== selectedFilterPatientId) return false;
    }
    if (activeCategory !== 'all') {
      const catObj = CLINICAL_CATEGORIES.find(cat => cat.id === activeCategory);
      if (catObj && !c.category.includes(catObj.label.split(' ')[0])) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = c.procedureTitle.toLowerCase().includes(q);
      const matchPatient = c.patientName.toLowerCase().includes(q);
      const matchTechnique = c.technique?.toLowerCase().includes(q);
      const matchNotes = c.clinicalNotes?.toLowerCase().includes(q);
      if (!matchTitle && !matchPatient && !matchTechnique && !matchNotes) return false;
    }
    return true;
  });

  // Handle Mouse/Touch Move for Split Slider
  const handleContainerMove = (clientX: number) => {
    if (!viewerContainerRef.current) return;
    const rect = viewerContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let pct = (x / rect.width) * 100;
    if (pct < 1) pct = 1;
    if (pct > 99) pct = 99;
    setSliderPos(pct);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingSlider(true);
    handleContainerMove(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingSlider) {
      handleContainerMove(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingSlider(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // Convert File to base64
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (JPEG أو PNG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (type === 'before') {
        setFormBeforeUrl(base64);
      } else {
        setFormAfterUrl(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Add Case Modal
  const handleOpenAddCase = () => {
    setEditingCase(null);
    setFormPatientId('');
    setPatientSearchTerm('');
    setIsPatientDropdownOpen(false);
    setFormCategory('تبييض الأسنان (Bleaching)');
    setFormProcedureTitle('');
    setFormTechnique('');
    setFormProcedureDate(getClinicTodayStr());
    setFormToothNumbers('11, 12, 21, 22');
    setFormDuration('جلسة واحدة (45 دقيقة)');
    setFormBeforeUrl('/assets/dental/bleach_before.jpg');
    setFormAfterUrl('/assets/dental/bleach_after.jpg');
    setFormShadeBefore('A3.5');
    setFormShadeAfter('BL1');
    setFormShadeJump('+15 درجة');
    setFormClinicalNotes('');
    setIsAddModalOpen(true);
  };

  // Open Edit Case Modal
  const handleOpenEditCase = (c: BeforeAfterCase, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCase(c);
    setFormPatientId(c.patientId);
    setPatientSearchTerm('');
    setIsPatientDropdownOpen(false);
    setFormCategory(c.category);
    setFormProcedureTitle(c.procedureTitle);
    setFormTechnique(c.technique || '');
    setFormProcedureDate(c.procedureDate);
    setFormToothNumbers(c.toothNumbers || '');
    setFormDuration(c.duration || '');
    setFormBeforeUrl(c.beforeImageUrl);
    setFormAfterUrl(c.afterImageUrl);
    setFormShadeBefore(c.shadeBefore || 'A3');
    setFormShadeAfter(c.shadeAfter || 'A1');
    setFormShadeJump(c.shadeJump || '+7 درجات');
    setFormClinicalNotes(c.clinicalNotes || '');
    setIsAddModalOpen(true);
  };

  // Save Case (Create or Update)
  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientId.trim()) {
      alert('تنبيه: يجب تحديد مريض مسجل مسبقاً في سجل المرضى بالعيادة لحفظ الحالة السريرية.\nشرط إلزامي: اختر المريض من القائمة.');
      onShowToast('⚠️ يرجى اختيار مريض مسجل في العيادة أولاً');
      return;
    }
    const patientObj = patients.find(p => p.id === formPatientId);
    if (!patientObj) {
      alert('تنبيه: المريض المحدد غير موجود في سجل المرضى بالعيادة. يرجى اختياره من القائمة.');
      onShowToast('⚠️ المريض غير مسجل في النظام');
      return;
    }
    if (!formProcedureTitle.trim()) {
      alert('يرجى إدخال عنوان الإجراء العلاجي.');
      return;
    }
    const patientName = patientObj.fullName;

    setIsSubmitting(true);
    try {
      if (editingCase) {
        const updates: Partial<BeforeAfterCase> = {
          patientId: patientObj.id,
          patientName,
          category: formCategory,
          procedureTitle: formProcedureTitle.trim(),
          technique: formTechnique.trim(),
          procedureDate: formProcedureDate,
          toothNumbers: formToothNumbers.trim(),
          duration: formDuration.trim(),
          beforeImageUrl: formBeforeUrl,
          afterImageUrl: formAfterUrl,
          shadeBefore: formShadeBefore,
          shadeAfter: formShadeAfter,
          shadeJump: formShadeJump,
          clinicalNotes: formClinicalNotes.trim(),
        };

        try {
          await clinicApi.updateBeforeAfterCase(editingCase.id, updates);
        } catch {}

        const updated = cases.map(c => c.id === editingCase.id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
        setCases(updated);
        localStorage.setItem('clinic_before_after_cache_v2', JSON.stringify(updated));
        onShowToast('تم تحديث بيانات الحالة السريرية بنجاح');
      } else {
        const newPayload: Omit<BeforeAfterCase, 'id' | 'createdAt'> = {
          patientId: patientObj.id,
          patientName,
          category: formCategory,
          procedureTitle: formProcedureTitle.trim(),
          technique: formTechnique.trim(),
          procedureDate: formProcedureDate,
          toothNumbers: formToothNumbers.trim(),
          duration: formDuration.trim(),
          beforeImageUrl: formBeforeUrl,
          afterImageUrl: formAfterUrl,
          shadeBefore: formShadeBefore,
          shadeAfter: formShadeAfter,
          shadeJump: formShadeJump,
          clinicalNotes: formClinicalNotes.trim(),
          doctorName: settings.doctorName || 'د. أمين بن صالح',
        };

        let created: BeforeAfterCase;
        try {
          created = await clinicApi.createBeforeAfterCase(newPayload);
        } catch {
          created = {
            ...newPayload,
            id: `BAC-${Date.now().toString().slice(-6)}`,
            createdAt: new Date().toISOString(),
          };
        }

        const updated = [created, ...cases];
        setCases(updated);
        setActiveCaseId(created.id);
        localStorage.setItem('clinic_before_after_cache_v2', JSON.stringify(updated));
        onShowToast('تم حفظ الحالة السريرية الجديدة وإضافتها للمعرض');
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert('حدث خطأ: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Case
  const handleDeleteCase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذه الحالة السريرية؟')) return;
    try {
      await clinicApi.deleteBeforeAfterCase(id).catch(() => {});
      const updated = cases.filter(c => c.id !== id);
      setCases(updated);
      localStorage.setItem('clinic_before_after_cache_v2', JSON.stringify(updated));
      if (activeCaseId === id && updated[0]) {
        setActiveCaseId(updated[0].id);
      }
      onShowToast('تم حذف الحالة السريرية');
    } catch (err: any) {
      alert('فشل الحذف: ' + err.message);
    }
  };

  // Current applied CSS filter
  const currentFilterObj = CLINICAL_LIGHTING_FILTERS.find(f => f.id === activeLightingFilter) || CLINICAL_LIGHTING_FILTERS[0];

  return (
    <div className={`space-y-6 ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-900 overflow-y-auto p-6' : ''}`}>
      {/* ================= TOP HEADER & BADGES ================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title and Badges (Right side in RTL) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              مقارنة صور الابتسامة قبل وبعد العلاج (Before & After Slider)
            </h1>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white shadow-xs tracking-wider">
                4K Ultra HD
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>دليل ألوان VITA المعتمد</span>
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            استعراض سريري تفاعلي لمقارنة نتائج تبييض الأسنان، التقويم، وقشور الفينير مع تحليل ألوان المينا وتدرجات بياض هوليوود.
          </p>
        </div>

        {/* View mode buttons & Add New Case (Left side in RTL) */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
          {/* View Mode Controls */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'slider'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="شريط سحب مقسوم"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>شريط مقسوم</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'side-by-side'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض الصورتين جنباً إلى جنب"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>جنباً إلى جنب</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('fade')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'fade'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="تلاشي تدريجي للشفافية"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>تلاشي تدريجي</span>
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title={isFullScreen ? 'تصغير الشاشة' : 'تكبير الشاشة ملء العرض'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Add New Case (Blue Button) */}
          <button
            type="button"
            onClick={handleOpenAddCase}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/30 active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>إضافة صور حالة جديدة</span>
          </button>
        </div>
      </div>

      {/* ================= CATEGORY TABS ================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {CLINICAL_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TWO-COLUMN MAIN CLINICAL LAYOUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / MAIN COLUMN (approx 65% width = 8 cols on lg) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Case Card Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Card Top Info Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
                  {activeCase.procedureTitle}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {activeCase.technique || activeCase.procedureTitle}
                </p>

                {/* Registered Patient Badge & Dossier Link */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-900 shadow-2xs">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-slate-500 font-medium">المريض المسجل:</span>
                    <span className="font-black text-blue-800">{activeCase.patientName}</span>
                    {activePatientObj?.phone && (
                      <span className="text-slate-400 font-mono font-normal" dir="ltr">({activePatientObj.phone})</span>
                    )}
                  </div>
                  {activeCase.patientId && (
                    <button
                      type="button"
                      onClick={() => onOpenPatientDossier(activeCase.patientId)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                      title="فتح الملف الطبي الكامل للمريض"
                    >
                      <ExternalLink className="w-3 h-3 text-blue-600" />
                      <span>فتح الملف الطبي</span>
                    </button>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>مسجل في خانة المرضى</span>
                  </span>
                </div>
              </div>

              {/* Slider Position & Auto Play */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                {viewMode === 'slider' && (
                  <button
                    type="button"
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isAutoPlaying
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                    title={isAutoPlaying ? 'إيقاف الحركة التلقائية' : 'تشغيل حركة المقارنة التلقائية'}
                  >
                    {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isAutoPlaying ? 'إيقاف' : 'حركة تلقائية'}</span>
                  </button>
                )}

                <div className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                  <span className="text-slate-500">قبل</span>{' '}
                  <span className="text-blue-600 font-black">{Math.round(sliderPos)}%</span>{' '}
                  <span className="text-slate-500">بعد</span>
                </div>
              </div>
            </div>

            {/* Clinical Lighting Filters Toolbar */}
            <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-700 flex items-center gap-1 ml-1 text-[11px]">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>فلاتر التصوير السريري:</span>
                </span>
                {CLINICAL_LIGHTING_FILTERS.map(f => {
                  const Icon = f.icon;
                  const isFActive = activeLightingFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveLightingFilter(f.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        isFActive
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Line Color & Zoom Controls */}
              <div className="flex items-center gap-3">
                {/* Line Color Dots */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 font-medium ml-1">لون الخط:</span>
                  <div className="flex items-center gap-1">
                    {LINE_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setActiveLineColor(c.value)}
                        className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                          activeLineColor === c.value ? 'scale-125 ring-2 ring-blue-500 ring-offset-1 border-white' : 'border-slate-300 hover:scale-110'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.25))}
                    className="p-1 text-slate-600 hover:text-blue-600 cursor-pointer"
                    title="تصغير"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-bold px-1 text-slate-700">
                    {zoomLevel.toFixed(2)}x
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                    className="p-1 text-slate-600 hover:text-blue-600 cursor-pointer"
                    title="تكبير"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {zoomLevel > 1 && (
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer border-r border-slate-200"
                      title="إعادة ضبط التكبير"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Main Interactive Comparison Display */}
            <div className="p-4 sm:p-5">
              {viewMode === 'slider' && (
                <div className="space-y-3">
                  <div
                    ref={viewerContainerRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="relative select-none overflow-hidden rounded-2xl bg-slate-950 aspect-16/10 cursor-ew-resize group shadow-lg border border-slate-800"
                    style={{ touchAction: 'none' }}
                  >
                    {/* Background: Before Image */}
                    <img
                      src={activeCase.beforeImageUrl}
                      alt="قبل العلاج"
                      className="w-full h-full object-cover pointer-events-none block transition-transform duration-100"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        filter: currentFilterObj.cssFilter,
                      }}
                    />

                    {/* Foreground: After Image Clipped to Divider */}
                    <div
                      className="absolute inset-y-0 right-0 overflow-hidden pointer-events-none"
                      style={{ width: `${100 - sliderPos}%` }}
                    >
                      <img
                        src={activeCase.afterImageUrl}
                        alt="بعد العلاج"
                        className="absolute inset-y-0 right-0 h-full max-w-none object-cover transition-transform duration-100"
                        style={{
                          width: viewerContainerRef.current ? `${viewerContainerRef.current.clientWidth}px` : '100%',
                          transform: `scale(${zoomLevel})`,
                          filter: currentFilterObj.cssFilter,
                        }}
                      />
                    </div>

                    {/* Divider Vertical Line */}
                    <div
                      className="absolute inset-y-0 pointer-events-none z-20"
                      style={{
                        left: `${sliderPos}%`,
                        width: '3px',
                        backgroundColor: activeLineColor,
                        boxShadow: `0 0 12px ${activeLineColor}, 0 0 24px ${activeLineColor}80`,
                      }}
                    >
                      {/* Center Circular Drag Handle */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full text-white shadow-xl flex items-center justify-center font-bold transition-transform group-hover:scale-110 border-2 border-white"
                        style={{ backgroundColor: activeLineColor }}
                      >
                        <ArrowLeftRight className="w-4 h-4 text-slate-900" />
                      </div>
                    </div>

                    {/* Top Right Badge: Before with Amber dot */}
                    <div className="absolute top-3.5 right-3.5 z-10 pointer-events-none">
                      <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900/85 text-white backdrop-blur-md shadow-md border border-white/10 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                        <span>قبل العلاج (Before)</span>
                        {activeCase.shadeBefore && (
                          <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono">
                            {activeCase.shadeBefore}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Top Left Badge: After with Blue dot */}
                    <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
                      <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600/90 text-white backdrop-blur-md shadow-md border border-white/10 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-white inline-block" />
                        <span>بعد العلاج (After)</span>
                        {activeCase.shadeAfter && (
                          <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[11px] font-mono">
                            {activeCase.shadeAfter}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Bottom Center Indicator Overlay Pill */}
                    <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                      <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-slate-950/80 text-white backdrop-blur-md shadow-md border border-white/15">
                        اسحب الشريط للمقارنة • {Math.round(sliderPos)}%
                      </span>
                    </div>
                  </div>

                  {/* Range Slider Track Under Image */}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-bold text-slate-600 whitespace-nowrap flex items-center gap-1">
                      <span>⏳ قبل العلاج</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sliderPos}
                      onChange={(e) => setSliderPos(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-xs font-bold text-blue-600 whitespace-nowrap flex items-center gap-1">
                      <span>✨ بعد العلاج</span>
                    </span>
                  </div>
                </div>
              )}

              {viewMode === 'side-by-side' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before Side */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-sm aspect-4/3 group">
                    <img
                      src={activeCase.beforeImageUrl}
                      alt="قبل العلاج"
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        filter: currentFilterObj.cssFilter,
                      }}
                    />
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900/85 text-white backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span>قبل العلاج</span>
                        {activeCase.shadeBefore && (
                          <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono">
                            {activeCase.shadeBefore}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* After Side */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-sm aspect-4/3 group">
                    <img
                      src={activeCase.afterImageUrl}
                      alt="بعد العلاج"
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        filter: currentFilterObj.cssFilter,
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600/90 text-white backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-white" />
                        <span>بعد العلاج</span>
                        {activeCase.shadeAfter && (
                          <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[11px] font-mono">
                            {activeCase.shadeAfter}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {viewMode === 'fade' && (
                <div className="space-y-3">
                  <div className="relative select-none overflow-hidden rounded-2xl bg-slate-950 aspect-16/10 border border-slate-800 shadow-lg">
                    {/* Before Image */}
                    <img
                      src={activeCase.beforeImageUrl}
                      alt="قبل العلاج"
                      className="w-full h-full object-cover absolute inset-0"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        filter: currentFilterObj.cssFilter,
                      }}
                    />
                    {/* After Image with Opacity */}
                    <img
                      src={activeCase.afterImageUrl}
                      alt="بعد العلاج"
                      className="w-full h-full object-cover absolute inset-0"
                      style={{
                        opacity: fadeOpacity / 100,
                        transform: `scale(${zoomLevel})`,
                        filter: currentFilterObj.cssFilter,
                      }}
                    />
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/80 text-white text-xs font-bold backdrop-blur-md">
                      شفافية النتيجة: {fadeOpacity}%
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-bold text-slate-600 whitespace-nowrap">قبل (0%)</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fadeOpacity}
                      onChange={(e) => setFadeOpacity(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-xs font-bold text-blue-600 whitespace-nowrap">بعد (100%)</span>
                  </div>
                </div>
              )}
            </div>

            {/* ================= VITA TOOTH SHADE GUIDE ANALYSIS ================= */}
            <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-200/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      تحليل تدرجات ألوان الأسنان (VITA Tooth Shade Guide)
                    </h3>
                    <p className="text-xs text-slate-500">
                      مقارنة درجات اللون السريري بدقة على المقياس الدولي VITA Classical وBleach هوليوود
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsShadeModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-center"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>فتح لوحة درجات VITA</span>
                </button>
              </div>

              {/* 3 Grid Cards Matching the Reference Design */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* 1. Before Shade Card */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">الدرجة قبل العلاج:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShadeTargetType('before');
                        setIsShadeModalOpen(true);
                      }}
                      className="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      تغيير
                    </button>
                  </div>
                  <div className="my-2 flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                      {activeCase.shadeBefore || 'A3'}
                    </span>
                    <span
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-inner"
                      style={{
                        backgroundColor: VITA_SHADES.find(s => s.code === (activeCase.shadeBefore || 'A3'))?.hex || '#D5C49A'
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {VITA_SHADES.find(s => s.code === (activeCase.shadeBefore || 'A3'))?.nameAr || 'عاجي طبيعي دافئ'}
                  </p>
                </div>

                {/* 2. Highlighted Whitening Jump Card (Green Emerald Glow) */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-xl text-white shadow-md shadow-emerald-600/20 flex flex-col justify-between">
                  <span className="text-emerald-100 text-xs font-bold tracking-wide">
                    قفزة التبييض السريري
                  </span>
                  <div className="my-1.5 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black tracking-tight font-mono">
                      {activeCase.shadeJump || calculateShadeJump(activeCase.shadeBefore || 'A3', activeCase.shadeAfter || 'A1')}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100 font-semibold leading-relaxed">
                    قفزة تبييض هائلة: {activeCase.shadeJump || '+7 درجات'} بياض! ({activeCase.shadeBefore || 'A3'} ← {activeCase.shadeAfter || 'A1'})
                  </p>
                </div>

                {/* 3. After Shade Card */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">الدرجة بعد العلاج:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShadeTargetType('after');
                        setIsShadeModalOpen(true);
                      }}
                      className="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      تغيير
                    </button>
                  </div>
                  <div className="my-2 flex items-center gap-2">
                    <span className="text-2xl font-black text-blue-600 font-mono tracking-tight">
                      {activeCase.shadeAfter || 'A1'}
                    </span>
                    <span
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-inner"
                      style={{
                        backgroundColor: VITA_SHADES.find(s => s.code === (activeCase.shadeAfter || 'A1'))?.hex || '#F3ECD6'
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {VITA_SHADES.find(s => s.code === (activeCase.shadeAfter || 'A1'))?.nameAr || 'عاجي مشرق نضر'}
                  </p>
                </div>
              </div>

              {/* Clinical Report Details */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>التقرير السريري وتفاصيل الحالة:</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {activeCase.clinicalNotes || 'تم إغلاق الفلجة بين القاطعين المركزين العلويين وإعادة تنظيم خط الابتسامة التجميلي وتناسق القوس السني.'}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-100 flex-wrap">
                  <span>الطبيب المشرف: <strong className="text-slate-700">{activeCase.doctorName || settings.doctorName}</strong></span>
                  <span>مدة العلاج: <strong className="text-slate-700">{activeCase.duration || 'مكتمل'}</strong></span>
                  {activeCase.toothNumbers && (
                    <span>الأسنان المعالجة: <strong className="text-slate-700 font-mono">{activeCase.toothNumbers}</strong></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Registered Clinical Cases List (approx 35% width = 4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <h3 className="text-sm font-black text-slate-900 font-heading">
                  الحالات السريرية المسجلة ({filteredCases.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>انقر للاستعراض المباشر</span>
              </span>
            </div>

            {/* Filter by Patient Dropdown */}
            {patients.length > 0 && (
              <div className="py-2 px-3 my-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-bold text-slate-700 whitespace-nowrap text-[11px]">تصفية بالمريض:</span>
                <select
                  value={selectedFilterPatientId}
                  onChange={(e) => setSelectedFilterPatientId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">كافة المرضى المسجلين بالعيادة ({patients.length})</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName} ({p.phone})</option>
                  ))}
                </select>
              </div>
            )}

            {/* List of Case Cards */}
            <div className="divide-y divide-slate-100 max-h-[820px] overflow-y-auto scrollbar-thin">
              {filteredCases.map((c) => {
                const isSelected = c.id === activeCase.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveCaseId(c.id)}
                    className={`p-3.5 transition-all cursor-pointer rounded-xl my-1.5 ${
                      isSelected
                        ? 'bg-blue-50/80 border-2 border-blue-600 shadow-sm'
                        : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    {/* Header Row: Date & Title */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {c.procedureDate}
                      </span>
                      <h4 className={`text-xs font-bold leading-snug line-clamp-1 ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                        {c.procedureTitle}
                      </h4>
                    </div>

                    {/* Patient Name Badge */}
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1.5">
                      <User className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="text-slate-500 text-[10px]">المريض:</span>
                      <span className="text-blue-800 line-clamp-1">{c.patientName}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-1 mb-2.5">
                      {c.technique || c.clinicalNotes || c.category}
                    </p>

                    {/* Side by Side Thumbnails */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="relative rounded-lg overflow-hidden aspect-16/10 bg-slate-900 border border-slate-200">
                        <img
                          src={c.beforeImageUrl}
                          alt="قبل"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[9px] font-bold">
                          قبل ({c.shadeBefore || 'A3'})
                        </span>
                      </div>
                      <div className="relative rounded-lg overflow-hidden aspect-16/10 bg-slate-900 border border-slate-200">
                        <img
                          src={c.afterImageUrl}
                          alt="بعد"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-blue-600/90 text-white text-[9px] font-bold">
                          بعد ({c.shadeAfter || 'A1'})
                        </span>
                      </div>
                    </div>

                    {/* Green Ribbon / Badge for Whitening Jump */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>قفزة بياض: {c.shadeJump || '+7 درجات'} في جدول VITA</span>
                      </span>

                      {/* Card Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditCase(c, e)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                          title="تعديل الحالة"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCase(c.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="حذف الحالة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: VITA TOOTH SHADE GUIDE ================= */}
      {isShadeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    دليل ألوان الأسنان الدولي (VITA Classical & Bleach Shades)
                  </h3>
                  <p className="text-xs text-slate-500">
                    حدد الدرجة المطلوبة لـ {shadeTargetType === 'before' ? 'قبل العلاج' : 'بعد العلاج'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShadeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shades Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto p-1 scrollbar-thin">
              {VITA_SHADES.map(s => {
                const currentSelected = shadeTargetType === 'before' ? activeCase.shadeBefore : activeCase.shadeAfter;
                const isSelected = currentSelected === s.code;
                return (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => {
                      const newBefore = shadeTargetType === 'before' ? s.code : (activeCase.shadeBefore || 'A3');
                      const newAfter = shadeTargetType === 'after' ? s.code : (activeCase.shadeAfter || 'A1');
                      const jump = calculateShadeJump(newBefore, newAfter);

                      const updatedCase = {
                        ...activeCase,
                        shadeBefore: newBefore,
                        shadeAfter: newAfter,
                        shadeJump: jump,
                      };

                      const newCases = cases.map(c => c.id === activeCase.id ? updatedCase : c);
                      setCases(newCases);
                      localStorage.setItem('clinic_before_after_cache_v2', JSON.stringify(newCases));
                      clinicApi.updateBeforeAfterCase(activeCase.id, {
                        shadeBefore: newBefore,
                        shadeAfter: newAfter,
                        shadeJump: jump,
                      }).catch(() => {});
                      setIsShadeModalOpen(false);
                      onShowToast(`تم ضبط درجة اللون إلى ${s.code}`);
                    }}
                    className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-black text-slate-900 font-mono">{s.code}</div>
                      <div className="text-[10px] text-slate-500 leading-tight">{s.nameAr}</div>
                    </div>
                    <span
                      className="w-6 h-8 rounded border border-slate-300 shadow-xs shrink-0"
                      style={{ backgroundColor: s.hex }}
                    />
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShadeModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT CASE (FITS FULL VIEWPORT) ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Modal Fixed Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Images className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingCase ? 'تعديل بيانات الحالة السريرية' : 'إضافة صور حالة جديدة للمقارنة'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    أدخل بيانات المريض والصور السريرية قبل وبعد العلاج مع تحليل درجات VITA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form with Scrollable Body and Fixed Footer */}
            <form onSubmit={handleSaveCase} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 scrollbar-thin">
                {/* ================= DEDICATED COMPACT PATIENT SELECTOR FIELD ("خانة تحديد المريض") ================= */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-900 flex items-center gap-1">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>تحديد المريض المسجل بالعيادة (شرط إلزامي)</span>
                      <span className="text-rose-600 font-bold">*</span>
                    </label>
                    {formPatientId && selectedFormPatient && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="w-3 h-3" />
                        <span>مسجل في قاعدة بيانات المرضى</span>
                      </span>
                    )}
                  </div>

                  {/* The Compact Box / Selector Input ("الخانة") */}
                  {!formPatientId || !selectedFormPatient ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-right flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs ${
                          isPatientDropdownOpen
                            ? 'border-blue-600 ring-2 ring-blue-500/20'
                            : 'border-amber-300 hover:border-blue-500 bg-amber-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-semibold text-xs">
                            {isPatientDropdownOpen ? 'اختر المريض من القائمة المنسدلة أدناه...' : 'انقر هنا لاختيار المريض المسجل في العيادة...'}
                          </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isPatientDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                      </button>
                    </div>
                  ) : (
                    /* Patient is selected - clean compact chip */
                    <div className="px-3.5 py-2 bg-blue-50/90 border border-blue-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {selectedFormPatient.fullName.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-xs truncate">{selectedFormPatient.fullName}</span>
                            <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-blue-200 text-blue-700">
                              #{selectedFormPatient.id.slice(0, 8)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline" dir="ltr">
                              {selectedFormPatient.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenPatientDossier(selectedFormPatient.id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-600 rounded-lg border border-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="معاينة الملف الطبي الكامل للمريض"
                        >
                          <ExternalLink className="w-3 h-3 text-blue-600" />
                          <span className="hidden sm:inline">معاينة الملف</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPatientDropdownOpen(!isPatientDropdownOpen);
                            setPatientSearchTerm('');
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          تغيير المريض
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormPatientId('');
                            setPatientSearchTerm('');
                            setIsPatientDropdownOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="إلغاء التحديد"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dropdown Menu / Selection List when opened */}
                  {isPatientDropdownOpen && (
                    <div className="mt-1.5 p-2.5 bg-white border border-slate-200 rounded-xl shadow-xl space-y-2 animate-in fade-in-50 duration-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          autoFocus
                          value={patientSearchTerm}
                          onChange={(e) => setPatientSearchTerm(e.target.value)}
                          placeholder="ابحث بالاسم الكامل، رقم الهاتف، أو رقم الملف..."
                          className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white"
                        />
                        {patientSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setPatientSearchTerm('')}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Scrollable Patient Options */}
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                        {filteredPatientsForModal.length > 0 ? (
                          filteredPatientsForModal.map(p => {
                            const isSelected = formPatientId === p.id;
                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setFormPatientId(p.id);
                                  setIsPatientDropdownOpen(false);
                                }}
                                className={`p-2 hover:bg-blue-50/80 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                                  isSelected ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {p.fullName.slice(0, 1)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                      <span>{p.fullName}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">#{p.id.slice(0, 6)}</span>
                                      <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-semibold">
                                        مسجل
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono" dir="ltr">
                                      {p.phone}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className={`px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors shrink-0 ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                                  }`}
                                >
                                  {isSelected ? 'محدد ✓' : 'اختيار'}
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-500 space-y-1.5">
                            <p>لا يوجد مريض مسجل يطابق البحث "{patientSearchTerm}"</p>
                            {onNavigateToPatients && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddModalOpen(false);
                                  onNavigateToPatients();
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>الانتقال لخانة المرضى لتسجيل مريض جديد</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 px-1">
                        <span>إجمالي المرضى المسجلين: {patients.length}</span>
                        <button
                          type="button"
                          onClick={() => setIsPatientDropdownOpen(false)}
                          className="text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          إغلاق القائمة
                        </button>
                      </div>
                    </div>
                  )}

                  {!formPatientId && !isPatientDropdownOpen && (
                    <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>تنبيه: لن تتمكن من حفظ الحالة إلا بعد تحديد مريض مسجل في العيادة من الخانة أعلاه.</span>
                    </p>
                  )}
                </div>

              {/* Category, Procedure Title & Technique */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تصنيف الإجراء العلاجي:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {CLINICAL_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.label}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">عنوان الإجراء العلاجي:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ابتسامة هوليوود خزفية E-Max"
                    value={formProcedureTitle}
                    onChange={(e) => setFormProcedureTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">التقنية والوصف المختصر:</label>
                  <input
                    type="text"
                    placeholder="مثال: قشور خزفية E-Max بدون برد"
                    value={formTechnique}
                    onChange={(e) => setFormTechnique(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Teeth numbers, Date, Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">أرقام الأسنان المعالجة:</label>
                  <input
                    type="text"
                    placeholder="مثال: 11, 21 أو القوس العلوي"
                    value={formToothNumbers}
                    onChange={(e) => setFormToothNumbers(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الإجراء:</label>
                  <input
                    type="date"
                    value={formProcedureDate}
                    onChange={(e) => setFormProcedureDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المدة / الجلسات:</label>
                  <input
                    type="text"
                    placeholder="مثال: 3 جلسات (شهران)"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* VITA Shades Selector (Before & After) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الدرجة قبل العلاج:</label>
                  <select
                    value={formShadeBefore}
                    onChange={(e) => {
                      setFormShadeBefore(e.target.value);
                      setFormShadeJump(calculateShadeJump(e.target.value, formShadeAfter));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono font-bold"
                  >
                    {VITA_SHADES.map(s => (
                      <option key={s.code} value={s.code}>{s.code} - {s.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الدرجة بعد العلاج:</label>
                  <select
                    value={formShadeAfter}
                    onChange={(e) => {
                      setFormShadeAfter(e.target.value);
                      setFormShadeJump(calculateShadeJump(formShadeBefore, e.target.value));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono font-bold"
                  >
                    {VITA_SHADES.map(s => (
                      <option key={s.code} value={s.code}>{s.code} - {s.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">قفزة البياض المحسوبة:</label>
                  <input
                    type="text"
                    value={formShadeJump}
                    onChange={(e) => setFormShadeJump(e.target.value)}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold text-center"
                  />
                </div>
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before Image */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 font-bold">صورة قبل العلاج:</label>
                    <button
                      type="button"
                      onClick={() => beforeFileRef.current?.click()}
                      className="text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع صورة</span>
                    </button>
                    <input
                      ref={beforeFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e, 'before')}
                    />
                  </div>

                  <div className="aspect-16/10 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 relative group flex items-center justify-center">
                    {formBeforeUrl ? (
                      <img src={formBeforeUrl} alt="قبل" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4 text-slate-400">
                        <Upload className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span>انقر لرفع صورة قبل العلاج</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* After Image */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 font-bold">صورة بعد العلاج:</label>
                    <button
                      type="button"
                      onClick={() => afterFileRef.current?.click()}
                      className="text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع صورة</span>
                    </button>
                    <input
                      ref={afterFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e, 'after')}
                    />
                  </div>

                  <div className="aspect-16/10 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 relative group flex items-center justify-center">
                    {formAfterUrl ? (
                      <img src={formAfterUrl} alt="بعد" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4 text-slate-400">
                        <Upload className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span>انقر لرفع صورة بعد العلاج</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Presets for Demo */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-bold">استخدام نماذج سريرية جاهزة:</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormBeforeUrl('/assets/dental/diastema_before.jpg');
                    setFormAfterUrl('/assets/dental/diastema_after.jpg');
                    setFormCategory('تقويم وإغلاق الفلجة (Ortho)');
                    setFormProcedureTitle('تقويم وتعديل اصطفاف وإغلاق الفلجة (Diastema Closure)');
                    setFormShadeBefore('A3');
                    setFormShadeAfter('A1');
                    setFormShadeJump('+7 درجات');
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 cursor-pointer"
                >
                  إغلاق الفلجة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormBeforeUrl('/assets/dental/bleach_before.jpg');
                    setFormAfterUrl('/assets/dental/bleach_after.jpg');
                    setFormCategory('تبييض الأسنان (Bleaching)');
                    setFormProcedureTitle('تبييض أسنان احترافي بالعيادة (In-Office Bleaching)');
                    setFormShadeBefore('A3.5');
                    setFormShadeAfter('BL1');
                    setFormShadeJump('+15 درجة');
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 cursor-pointer"
                >
                  تبييض ليزري
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormBeforeUrl('/assets/dental/veneer_before.jpg');
                    setFormAfterUrl('/assets/dental/veneer_after.jpg');
                    setFormCategory('قشور الفينير وهوليوود (Veneers)');
                    setFormProcedureTitle('ترميم قاطع متكسر وقشور فينير تجميلية (E-Max Veneer)');
                    setFormShadeBefore('A3.5');
                    setFormShadeAfter('B1');
                    setFormShadeJump('+11 درجات');
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 cursor-pointer"
                >
                  قشور فينير
                </button>
              </div>

                {/* Clinical Notes */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">التقرير السريري وتفاصيل الحالة:</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب ملاحظات الطبيب وتفاصيل خطة العلاج..."
                    value={formClinicalNotes}
                    onChange={(e) => setFormClinicalNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Modal Fixed Sticky Footer (Always visible on any screen) */}
              <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="text-[11px] text-slate-500">
                  {formPatientId && selectedFormPatient ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate max-w-[240px]">المريض: {selectedFormPatient.fullName}</span>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>شرط إلزامي: حدد المريض أولاً</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formPatientId}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري الحفظ...' : editingCase ? 'حفظ التعديلات' : 'إضافة الحالة إلى المعرض'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
