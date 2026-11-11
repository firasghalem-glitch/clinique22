import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PatientFile } from '../types';
import { clinicApi } from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sliders,
  Sun,
  Eye,
  RefreshCw,
  AlertCircle,
  FileDown,
  Maximize,
  MoveHorizontal,
} from 'lucide-react';

try {
  if ((pdfjsLib as any).GlobalWorkerOptions) {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
} catch (e) {
  console.warn('PDF.js worker initialization warning:', e);
}

interface DentalFileViewerProps {
  file: PatientFile;
  patientName?: string;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalFiles?: number;
}

export const DentalFileViewer: React.FC<DentalFileViewerProps> = ({
  file,
  patientName,
  onClose,
  onNext,
  onPrev,
  currentIndex,
  totalFiles,
}) => {
  const isPdf = Boolean(
    file.mimeType === 'application/pdf' ||
    /\.pdf$/i.test(file.originalName) ||
    (file.dataUrl && file.dataUrl.startsWith('data:application/pdf'))
  );

  const isImage = Boolean(
    !isPdf &&
    ((file.mimeType && file.mimeType.startsWith('image/')) ||
      /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(file.originalName) ||
      (file.dataUrl && file.dataUrl.startsWith('data:image/')))
  );

  const [fitMode, setFitMode] = useState<'page' | 'width'>('page');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isNegative, setIsNegative] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);

  const [isDragging, setIsDragging] = useState(false);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(file.dataUrl || null);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(!file.dataUrl && isImage);
  const [imageError, setImageError] = useState<string | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfLoading, setPdfLoading] = useState<boolean>(isPdf);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setZoom(1);
    setFitMode('page');
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
    setIsNegative(false);
    setBrightness(100);
    setContrast(100);
    setPageNum(1);
    setPdfDoc(null);
    setPdfError(null);
    setImageError(null);
  }, [file.id]);

  // Load Image securely via blob
  useEffect(() => {
    if (!isImage) return;
    let isCancelled = false;

    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }

    if (file.dataUrl) {
      setImageBlobUrl(file.dataUrl);
      setIsImageLoading(false);
      setImageError(null);
      return;
    }

    setIsImageLoading(true);
    setImageError(null);

    const fetchImageBlob = async () => {
      try {
        const blob = await clinicApi.getFileBlob(file.id);
        if (isCancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        activeBlobUrlRef.current = objectUrl;
        setImageBlobUrl(objectUrl);
        setIsImageLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.warn('Failed to load image blob, fallback to token preview url:', err);
        const fallbackUrl = clinicApi.getFilePreviewUrl(file.id);
        setImageBlobUrl(fallbackUrl);
        setIsImageLoading(false);
      }
    };

    fetchImageBlob();

    return () => {
      isCancelled = true;
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, [file.id, isImage, file.dataUrl]);

  // Load PDF securely via Uint8Array or token preview url
  useEffect(() => {
    if (!isPdf) return;
    let isCancelled = false;
    setPdfLoading(true);
    setPdfError(null);

    const loadPdf = async () => {
      try {
        let pdfData: Uint8Array | null = null;
        if (file.dataUrl) {
          if (file.dataUrl.startsWith('data:')) {
            const base64Index = file.dataUrl.indexOf(';base64,');
            if (base64Index !== -1) {
              const base64 = file.dataUrl.slice(base64Index + 8);
              const binaryStr = atob(base64);
              const len = binaryStr.length;
              pdfData = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                pdfData[i] = binaryStr.charCodeAt(i);
              }
            }
          }
        }

        if (!pdfData) {
          try {
            const blob = await clinicApi.getFileBlob(file.id);
            const arrayBuffer = await blob.arrayBuffer();
            pdfData = new Uint8Array(arrayBuffer);
          } catch (blobErr) {
            console.warn('Failed to fetch PDF blob, trying token URL:', blobErr);
          }
        }

        const loadingTask = pdfData
          ? (pdfjsLib as any).getDocument({ data: pdfData })
          : (pdfjsLib as any).getDocument({ url: clinicApi.getFilePreviewUrl(file.id) });
        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
        setPdfLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to load PDF with pdfjs:', err);
        setPdfError(err.message || 'تعذر تحميل ملف PDF للعرض المباشر.');
        setPdfLoading(false);
      }
    };

    loadPdf();
    return () => {
      isCancelled = true;
    };
  }, [file.id, isPdf, file.dataUrl]);

  const renderPdfPage = useCallback(async () => {
    if (!isPdf || !pdfDoc || !canvasRef.current) return;
    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      const page = await pdfDoc.getPage(pageNum);
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const unscaledViewport = page.getViewport({ scale: 1, rotation });
      const containerEl = containerRef.current;
      const containerWidth = containerEl ? containerEl.clientWidth : window.innerWidth;
      const containerHeight = containerEl ? containerEl.clientHeight : window.innerHeight - 130;

      const safeAvailWidth = Math.max(containerWidth - 48, 200);
      const safeAvailHeight = Math.max(containerHeight - 48, 200);

      let baseScale: number;
      if (fitMode === 'width') {
        baseScale = safeAvailWidth / unscaledViewport.width;
      } else {
        const scaleW = safeAvailWidth / unscaledViewport.width;
        const scaleH = safeAvailHeight / unscaledViewport.height;
        baseScale = Math.min(scaleW, scaleH);
      }

      const finalScale = Math.max(baseScale * zoom, 0.25);
      const pixelRatio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: finalScale, rotation });

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('PDF page render error:', err);
      }
    }
  }, [isPdf, pdfDoc, pageNum, zoom, rotation, fitMode]);

  useEffect(() => {
    renderPdfPage();
  }, [renderPdfPage]);

  useEffect(() => {
    if (!isPdf) return;
    const handleResize = () => {
      renderPdfPage();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPdf, renderPdfPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (isPdf && pageNum > 1) {
          setPageNum(p => p - 1);
        } else if (onNext) {
          onNext();
        }
      } else if (e.key === 'ArrowLeft') {
        if (isPdf && pageNum < numPages) {
          setPageNum(p => p + 1);
        } else if (onPrev) {
          onPrev();
        }
      } else if (e.key === '+' || e.key === '=') {
        setZoom(z => Math.min(z + 0.25, 4));
      } else if (e.key === '-') {
        setZoom(z => Math.max(z - 0.25, 0.5));
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation(r => (r + 90) % 360);
      } else if (e.key === 'i' || e.key === 'I') {
        setIsNegative(n => !n);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, isPdf, pageNum, numPages]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || isImage) {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom(z => Math.min(z + 0.15, 4));
      } else {
        setZoom(z => Math.max(z - 0.15, 0.5));
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const directFileUrl = file.dataUrl || clinicApi.getFilePreviewUrl(file.id);
  const downloadUrl = file.dataUrl || clinicApi.getFileDownloadUrl(file.id);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white select-none animate-in fade-in duration-150">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 shadow-md z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            {isPdf ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-bold font-heading text-white truncate max-w-[160px] sm:max-w-xs md:max-w-md" title={file.originalName}>
              {file.originalName}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/80 font-semibold font-heading shrink-0">
              {file.category}
            </span>
            {patientName && (
              <span className="hidden md:inline-block text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded font-medium">
                المريض: {patientName}
              </span>
            )}
            <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono">
              ({formatFileSize(file.fileSize)})
            </span>
          </div>
        </div>

        {totalFiles && totalFiles > 1 && (
          <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded-lg border border-slate-700 shrink-0">
            <button
              onClick={onPrev}
              disabled={!onPrev}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-[11px] px-1 text-slate-300 font-mono font-bold">
              {currentIndex !== undefined ? `${currentIndex + 1} / ${totalFiles}` : ''}
            </span>
            <button
              onClick={onNext}
              disabled={!onNext}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={downloadUrl}
            download={file.originalName}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-blue-600 rounded-lg text-slate-200 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
            title="تحميل الملف"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تحميل</span>
          </a>
          <button
            onClick={handlePrint}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 hover:text-white transition-colors hidden sm:flex items-center gap-1 text-xs font-semibold cursor-pointer"
            title="طباعة"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1 font-bold text-xs shadow-sm cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="h-10 border-b border-slate-800/80 bg-slate-900/80 px-3 sm:px-6 flex items-center justify-between gap-2 shrink-0 text-xs overflow-x-auto z-20">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setFitMode('page');
              setZoom(1);
              setPanPosition({ x: 0, y: 0 });
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              fitMode === 'page' && zoom === 1
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="ملاءمة الشاشة"
          >
            <Maximize className="w-3 h-3" />
            <span className="hidden sm:inline">ملاءمة الشاشة</span>
          </button>
          <button
            onClick={() => {
              setFitMode('width');
              setZoom(1);
              setPanPosition({ x: 0, y: 0 });
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              fitMode === 'width' && zoom === 1
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="ملاءمة العرض"
          >
            <MoveHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">ملاءمة العرض</span>
          </button>
          <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded border border-slate-700 font-mono text-[11px]">
            <button
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
              className="p-1 hover:text-blue-400 text-slate-300 cursor-pointer"
              title="تصغير (-)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1.5 text-white font-bold min-w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
              className="p-1 hover:text-blue-400 text-slate-300 cursor-pointer"
              title="تكبير (+)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="تدوير 90 درجة"
          >
            <RotateCw className="w-3 h-3" />
            <span className="hidden md:inline font-mono text-[10px]">{rotation}°</span>
          </button>
          <button
            onClick={() => {
              setFitMode('page');
              setZoom(1);
              setRotation(0);
              setPanPosition({ x: 0, y: 0 });
              setIsNegative(false);
              setBrightness(100);
              setContrast(100);
            }}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700 transition-colors cursor-pointer"
            title="إعادة ضبط الفلاتر"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {isPdf ? (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400 hidden sm:inline">الصفحة:</span>
            <div className="flex items-center bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              <button
                disabled={pageNum <= 1}
                onClick={() => setPageNum(p => Math.max(p - 1, 1))}
                className="p-0.5 hover:text-blue-400 disabled:opacity-30 cursor-pointer"
                title="السابق"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-white font-bold">
                {pageNum} / {numPages || 1}
              </span>
              <button
                disabled={pageNum >= numPages}
                onClick={() => setPageNum(p => Math.min(p + 1, numPages))}
                className="p-0.5 hover:text-blue-400 disabled:opacity-30 cursor-pointer"
                title="التالي"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsNegative(n => !n)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                isNegative
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="سالب للأشعة السينية (X-Ray Negative)"
            >
              <Sliders className="w-3 h-3" />
              <span>{isNegative ? 'سالب مفعّل' : 'فلتر الأشعة'}</span>
            </button>
            <button
              onClick={() => setContrast(c => (c === 100 ? 150 : c === 150 ? 200 : 100))}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-[11px] border border-slate-700 cursor-pointer"
              title="التباين"
            >
              التباين: {contrast}%
            </button>
            <button
              onClick={() => setBrightness(b => (b === 100 ? 130 : b === 130 ? 70 : 100))}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-[11px] border border-slate-700 flex items-center gap-1 cursor-pointer"
              title="الإضاءة"
            >
              <Sun className="w-3 h-3" />
              <span className="hidden sm:inline">السطوع:</span> {brightness}%
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas / Image Area */}
      <main
        ref={containerRef}
        className="flex-1 w-full min-h-0 bg-slate-950 overflow-auto relative p-4 sm:p-6 flex flex-col items-center justify-start cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {isPdf && (
          <div className="w-full flex-1 flex flex-col items-center justify-start my-auto">
            {pdfLoading && (
              <div className="text-center text-slate-400 space-y-3 py-16">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold">جارٍ معالجة وتحميل ملف PDF...</p>
              </div>
            )}
            {pdfError && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md text-center space-y-4 shadow-xl my-8">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">تعذر العرض المباشر للملف</h4>
                  <p className="text-xs text-slate-400">
                    يمكنك تنزيل ملف الـ PDF وحفظه مباشرة على جهازك
                  </p>
                </div>
                <a
                  href={downloadUrl}
                  download={file.originalName}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تنزيل الملف ({file.originalName})</span>
                </a>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className={`shadow-2xl rounded-lg mx-auto transition-transform ${pdfLoading || pdfError ? 'hidden' : 'block'}`}
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${isNegative ? 'invert(1)' : ''}`,
                transform: `translate(${panPosition.x}px, ${panPosition.y}px)`,
              }}
            />
          </div>
        )}

        {isImage && (
          <div className="w-full flex-1 flex items-center justify-center my-auto">
            {isImageLoading ? (
              <div className="text-center text-slate-400 space-y-3 py-16">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold">جارٍ تجهيز وتحميل الصورة بأعلى دقة...</p>
              </div>
            ) : imageError ? (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md text-center space-y-4 shadow-xl my-8">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">تعذر عرض الصورة المباشرة</h4>
                  <p className="text-xs text-slate-400">{imageError}</p>
                </div>
                <a
                  href={downloadUrl}
                  download={file.originalName}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تنزيل الصورة مباشرة ({file.originalName})</span>
                </a>
              </div>
            ) : (
              <img
                src={imageBlobUrl || directFileUrl}
                alt={file.originalName}
                draggable={false}
                onError={() => {
                  setImageError('تعذر عرض تنسيق الصورة في المتصفح.');
                }}
                style={{
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  filter: `brightness(${brightness}%) contrast(${contrast}%) ${isNegative ? 'invert(1) hue-rotate(180deg)' : ''}`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease',
                  maxHeight: zoom === 1 ? 'calc(100vh - 140px)' : 'none',
                  maxWidth: zoom === 1 ? 'calc(100vw - 48px)' : 'none',
                }}
                className="object-contain select-none shadow-2xl rounded mx-auto"
              />
            )}
          </div>
        )}

        {!isPdf && !isImage && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center space-y-4 my-auto">
            <FileText className="w-14 h-14 text-blue-400 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">{file.originalName}</h4>
              <p className="text-xs text-slate-400">
                النوع: {file.mimeType || 'ملف طبي'} • الحجم: {formatFileSize(file.fileSize)}
              </p>
            </div>
            <a
              href={downloadUrl}
              download={file.originalName}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل الملف</span>
            </a>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="h-8 bg-slate-900 border-t border-slate-800 px-4 sm:px-6 flex items-center justify-between text-[10px] text-slate-400 shrink-0 font-mono z-20">
        <div className="flex items-center gap-3">
          <span>عجلة الفأرة / (+ -) للتكبير</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">سحب لتحريك الصورة</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">مفتاح R للتدوير</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">مفتاح Esc للإغلاق</span>
        </div>
        <div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            إغلاق المعاينة
          </button>
        </div>
      </footer>
    </div>
  );
};
