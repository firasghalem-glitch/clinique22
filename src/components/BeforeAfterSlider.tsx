import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';

export interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  shadeBefore?: string;
  shadeAfter?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeUrl,
  afterUrl,
}) => {
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [beforeError, setBeforeError] = useState<boolean>(false);
  const [afterError, setAfterError] = useState<boolean>(false);

  // Keep track of the container's rendered pixel width for exact overlay clipping
  useEffect(() => {
    if (!viewerContainerRef.current) return;
    const updateWidth = () => {
      if (viewerContainerRef.current) {
        setContainerWidth(viewerContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewerContainerRef.current);
    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Reset errors when URLs change
  useEffect(() => {
    setBeforeError(false);
  }, [beforeUrl]);

  useEffect(() => {
    setAfterError(false);
  }, [afterUrl]);

  // Handle Mouse / Touch Pointer Events
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

  const handlePointerCancel = (e: React.PointerEvent) => {
    setIsDraggingSlider(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className="space-y-3">
      {/* 16/10 Container with pointer drag */}
      <div
        ref={viewerContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative select-none overflow-hidden rounded-2xl bg-slate-950 aspect-16/10 cursor-ew-resize group shadow-lg border border-slate-800"
        style={{ touchAction: 'none' }}
      >
        {/* Background: Before Image */}
        {beforeError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs font-bold gap-2 p-4 text-center">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            <span>تعذر تحميل الصورة (قبل العلاج)</span>
          </div>
        ) : (
          <img
            src={beforeUrl}
            alt="قبل العلاج"
            className="w-full h-full object-cover pointer-events-none block transition-transform duration-100"
            onError={() => setBeforeError(true)}
          />
        )}

        {/* Foreground: After Image Clipped to Divider (Right anchored) */}
        <div
          className="absolute inset-y-0 right-0 overflow-hidden pointer-events-none"
          style={{ width: `${100 - sliderPos}%` }}
        >
          {afterError ? (
            <div
              className="absolute inset-y-0 right-0 h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs font-bold gap-2 p-4 text-center"
              style={{ width: containerWidth > 0 ? `${containerWidth}px` : '100%' }}
            >
              <AlertCircle className="w-6 h-6 text-amber-400" />
              <span>تعذر تحميل الصورة (بعد العلاج)</span>
            </div>
          ) : (
            <img
              src={afterUrl}
              alt="بعد العلاج"
              className="absolute inset-y-0 right-0 h-full max-w-none object-cover transition-transform duration-100"
              style={{
                width: containerWidth > 0 ? `${containerWidth}px` : '100%',
              }}
              onError={() => setAfterError(true)}
            />
          )}
        </div>

        {/* Divider Vertical Line */}
        <div
          className="absolute inset-y-0 pointer-events-none z-20"
          style={{
            left: `${sliderPos}%`,
            width: '3px',
            backgroundColor: '#3b82f6',
            boxShadow: '0 0 12px #3b82f6, 0 0 24px #3b82f680',
          }}
        >
          {/* Center Circular Drag Handle */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full text-white shadow-xl flex items-center justify-center font-bold transition-transform group-hover:scale-110 border-2 border-white bg-blue-600">
            <ArrowLeftRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Range Slider Track Under Image */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-xs font-bold text-slate-600 whitespace-nowrap flex items-center gap-1">
          <span>⏳ قبل العلاج</span>
        </span>
        <input
          type="range"
          min="1"
          max="99"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <span className="text-xs font-bold text-blue-600 whitespace-nowrap flex items-center gap-1">
          <span>✨ بعد العلاج</span>
        </span>
      </div>
    </div>
  );
};
