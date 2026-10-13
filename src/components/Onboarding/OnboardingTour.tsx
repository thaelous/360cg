import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

export interface TourStep {
  id: string;
  target?: string; // CSS selector, e.g. '#tour-metrics'
  title: string;
  content: string | React.ReactNode;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
  previewComponent?: React.ReactNode;
}

export interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TourStep[];
  storageKey?: string;
  tourTitle?: string;
  onComplete?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  steps,
  storageKey,
  tourTitle = 'Guía Interactiva 360°',
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const cardRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Track window resize for mobile vs desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update target rect calculation
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStep?.target) {
      setTargetRect(null);
      return;
    }

    const targetEl = document.querySelector(currentStep.target) as HTMLElement | null;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      // Ensure target has actual dimensions
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        return;
      }
    }
    setTargetRect(null);
  }, [isOpen, currentStep]);

  // When step changes: scroll target into view, then update rect
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    if (currentStep.target) {
      const targetEl = document.querySelector(currentStep.target) as HTMLElement | null;
      if (targetEl) {
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    }

    // Measure rect after smooth scroll initiates
    updateTargetRect();
    const timer1 = setTimeout(updateTargetRect, 100);
    const timer2 = setTimeout(updateTargetRect, 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, currentStepIndex, currentStep, updateTargetRect]);

  // Recalculate on scroll and resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updateTargetRect();
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleResizeOrScroll);
    };
    function handleResizeOrScroll() {
      handleScrollOrResize();
    }
  }, [isOpen, updateTargetRect]);

  // Reset to first step whenever reopened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  const handleFinish = useCallback(() => {
    if (storageKey) {
      if (dontShowAgain) {
        localStorage.setItem(storageKey, 'true');
      } else {
        localStorage.removeItem(storageKey);
      }
    }
    if (onComplete) {
      onComplete();
    }
    onClose();
  }, [storageKey, dontShowAgain, onComplete, onClose]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
    }
  }, [isLastStep, handleFinish, steps.length]);

  const handlePrev = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSkip = useCallback(() => {
    if (storageKey && dontShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
    onClose();
  }, [storageKey, dontShowAgain, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFirstStep, handleNext, handlePrev, handleSkip]);

  if (!isOpen) return null;

  // Mask cutout coordinates
  const padding = 10;
  const maskId = `spotlight-mask-${storageKey || 'tour'}`;

  // Card Positioning on Desktop
  const getCardStyle = (): React.CSSProperties => {
    if (isMobile) {
      return {
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        maxWidth: '460px',
        margin: '0 auto',
        zIndex: 10001,
      };
    }

    if (!targetRect) {
      // Centered dialog
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '480px',
        width: '92vw',
        zIndex: 10001,
      };
    }

    const cardWidth = 440;
    const cardEstHeight = 280;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    let top = 0;
    if (spaceBelow >= cardEstHeight + 20 || spaceBelow >= spaceAbove) {
      // Below target
      top = Math.min(viewportHeight - cardEstHeight - 16, targetRect.bottom + 16);
    } else {
      // Above target
      top = Math.max(16, targetRect.top - cardEstHeight - 16);
    }

    // Horizontal centering relative to target, clamped to screen margins
    const idealLeft = targetRect.left + (targetRect.width - cardWidth) / 2;
    const clampedLeft = Math.max(20, Math.min(viewportWidth - cardWidth - 20, idealLeft));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${clampedLeft}px`,
      width: `${cardWidth}px`,
      maxWidth: '92vw',
      zIndex: 10001,
    };
  };

  const IconComponent = currentStep.icon || Sparkles;
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. SVG SPOTLIGHT MASK OVERLAY */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto transition-all duration-300"
        aria-hidden="true"
        onClick={handleSkip}
      >
        <defs>
          <mask id={maskId}>
            {/* White background covers full viewport */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Cutout hole if targetRect exists */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - padding)}
                y={Math.max(0, targetRect.top - padding)}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx={18}
                ry={18}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Semi-transparent dark background with hole cutout */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.78)"
          mask={`url(#${maskId})`}
        />
      </svg>

      {/* 2. ILLUMINATED SPOTLIGHT HALO (ring-4 ring-blue-500/50 and soft pulse) */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            left: Math.max(0, targetRect.left - padding),
            top: Math.max(0, targetRect.top - padding),
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            borderRadius: 18,
          }}
          className="z-[9995] pointer-events-none ring-4 ring-blue-500/60 shadow-[0_0_35px_rgba(59,130,246,0.65)] animate-pulse transition-all duration-300"
        >
          {/* Subtle secondary inner glow */}
          <div className="w-full h-full rounded-[18px] border-2 border-white/60" />
        </div>
      )}

      {/* 3. SMART FLOATING CARD (TARJETA FLOTANTE INTELIGENTE) */}
      <div
        ref={cardRef}
        style={getCardStyle()}
        className="bg-white rounded-3xl shadow-2xl border-2 border-blue-500/40 overflow-hidden flex flex-col text-slate-800 transition-all duration-300 animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
      >
        {/* Card Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3.5 text-white flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30">
              <IconComponent className="w-4 h-4 text-blue-400" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 block leading-none">
                {currentStep.badge || tourTitle}
              </span>
              <span className="text-xs font-bold text-slate-200 block mt-0.5">
                Paso {currentStepIndex + 1} de {steps.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Saltar tutorial (Esc)"
            aria-label="Cerrar tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-3.5 max-h-[60vh] overflow-y-auto">
          <div>
            <h3
              id="tour-step-title"
              className="text-base sm:text-lg font-black text-slate-900 tracking-tight"
            >
              {currentStep.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              {currentStep.content}
            </p>
          </div>

          {/* Optional Interactive Preview Component */}
          {currentStep.previewComponent && (
            <div className="pt-2">
              {currentStep.previewComponent}
            </div>
          )}

          {/* Interactive Navigation Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-6 bg-blue-600'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Ir al paso ${idx + 1}: ${s.title}`}
                aria-label={`Paso ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Card Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          {/* Checkbox "No volver a mostrar" */}
          <label className="flex items-center gap-2 text-xs text-slate-600 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-[11px] sm:text-xs text-slate-600">
              No volver a mostrar
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                isLastStep
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25'
              }`}
            >
              <span>{isLastStep ? 'Finalizar' : 'Siguiente'}</span>
              {isLastStep ? (
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
