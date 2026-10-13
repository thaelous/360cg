import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Star,
  Send,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  HelpCircle,
  Lock,
  HeartHandshake,
  ArrowRight,
} from 'lucide-react';

interface EvaluatorInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName?: string;
  companyName?: string;
}

export const EvaluatorInstructionsModal: React.FC<EvaluatorInstructionsModalProps> = ({
  isOpen,
  onClose,
  collaboratorName,
  companyName,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const STORAGE_KEY = 'tutorial_evaluador_visto';

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' && currentStep < 2) {
        setCurrentStep((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      badge: 'Confidencialidad Garantizada',
      title: 'Tu opinión es 100% anónima y formativa',
      subtitle: companyName ? `Programa 360° para ${companyName}` : 'Evaluación 360°',
      icon: ShieldCheck,
      iconBg: 'bg-emerald-500 text-white',
      content: (
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Esta evaluación tiene fines exclusivos de <strong className="text-slate-900">desarrollo y crecimiento profesional</strong>.
            {collaboratorName ? ` Estás evaluando a ${collaboratorName}.` : ''}
          </p>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5 text-left">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-950 uppercase tracking-wider">
              <Lock className="w-4 h-4 text-emerald-700" />
              <span>Privacidad Absoluta</span>
            </div>
            <p className="text-xs text-emerald-900 leading-snug">
              Tus calificaciones numéricas se combinan y promedian con las de otros evaluadores.
              Nadie sabrá qué puntaje asignaste a cada reactivo en lo individual.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-left">
            <div className="p-2 bg-white rounded-xl shadow-xs text-indigo-600 shrink-0">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-xs font-bold text-slate-900 block">Objetividad y Empatía</strong>
              <span className="text-xs text-slate-600 block mt-0.5 leading-snug">
                Responde con sinceridad basándote en situaciones y conductas observables de su trabajo cotidiano.
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      step: 2,
      badge: 'Escala de Calificación',
      title: 'Cómo calificar cada competencia (1 al 5)',
      subtitle: 'Criterios claros y ágiles',
      icon: Star,
      iconBg: 'bg-amber-500 text-white',
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Cada reactivo presenta una afirmación sobre el desempeño. Elige el número que mejor describa la frecuencia o dominio de la conducta:
          </p>

          <div className="space-y-2">
            {[
              { val: 1, label: '1 - Necesita desarrollo urgente', desc: 'Nunca / Rara vez manifiesta la conducta. Requiere plan de mejora prioritario.', color: 'border-rose-300 bg-rose-50 text-rose-900' },
              { val: 2, label: '2 - Ocasional', desc: 'Inconsistente o requiere supervisión y apoyo frecuente.', color: 'border-orange-200 bg-orange-50/70 text-orange-900' },
              { val: 3, label: '3 - Cumple el estándar', desc: 'Frecuente / Nivel esperado para su puesto.', color: 'border-amber-200 bg-amber-50/70 text-amber-900' },
              { val: 4, label: '4 - Sobresaliente', desc: 'Casi siempre / Demuestra la competencia con solvencia y regularidad.', color: 'border-blue-200 bg-blue-50/70 text-blue-900' },
              { val: 5, label: '5 - Modelo a seguir', desc: 'Siempre / Dominio ejemplar, referente y mentor para sus compañeros.', color: 'border-emerald-300 bg-emerald-50 text-emerald-950 font-bold' },
            ].map((scale) => (
              <div
                key={scale.val}
                className={`p-2.5 rounded-xl border ${scale.color} flex items-center gap-3`}
              >
                <span className="w-7 h-7 rounded-lg bg-white font-mono font-black text-xs flex items-center justify-center border border-slate-200 shadow-xs shrink-0">
                  {scale.val}
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold block">{scale.label}</span>
                  <span className="text-[11px] opacity-80 block leading-tight">{scale.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 text-center font-medium">
            Avanzarás por bloques temáticos (Liderazgo, Comunicación, Trabajo en Equipo, etc.).
          </p>
        </div>
      ),
    },
    {
      step: 3,
      badge: 'Envío y Cierre',
      title: 'Completa todas las preguntas y envía',
      subtitle: 'Tu aporte impulsa el crecimiento de tu equipo',
      icon: Send,
      iconBg: 'bg-lime-500 text-slate-950',
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Antes de concluir, toma en cuenta estos sencillos puntos para asegurar la validez de tu evaluación:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-lime-100 text-lime-800 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                1
              </div>
              <div>
                <strong className="text-xs font-bold text-slate-900 block">
                  Sin preguntas pendientes
                </strong>
                <span className="text-xs text-slate-600 block mt-0.5 leading-snug">
                  La barra superior te indicará si falta responder alguna pregunta. Se requiere completar todos los reactivos para habilitar el botón de envío.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-lime-100 text-lime-800 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                2
              </div>
              <div>
                <strong className="text-xs font-bold text-slate-900 block">
                  Comentarios Cualitativos (Opcionales)
                </strong>
                <span className="text-xs text-slate-600 block mt-0.5 leading-snug">
                  Al final podrás escribir fortalezas y recomendaciones constructivas. Sé específico y aporta consejos de valor para su plan de desarrollo.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-lime-50 border border-lime-300 rounded-2xl flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-lime-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                ✓
              </div>
              <div>
                <strong className="text-xs font-black text-lime-950 block">
                  Confirmación Inmediata
                </strong>
                <span className="text-xs text-lime-900 block mt-0.5 leading-snug">
                  Al oprimir "Enviar Evaluación", tus respuestas se guardarán al instante y recibirás un mensaje de agradecimiento.
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const IconComp = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evaluator-tutorial-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-lime-400 text-slate-950 rounded-xl shadow-xs font-black">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-lime-400 block leading-none">
                Instrucciones del Cuestionario 360°
              </span>
              <span className="text-xs text-slate-300 font-semibold block mt-1">
                Paso {currentStep + 1} de {steps.length}: {current.badge}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Cerrar instrucciones (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1 flex shrink-0">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 transition-all duration-300 ${
                idx <= currentStep ? 'bg-lime-400' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl ${current.iconBg} shadow-sm shrink-0`}>
              <IconComp className="w-5 h-5" />
            </div>
            <div>
              <h3 id="evaluator-tutorial-title" className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                {current.title}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {current.subtitle}
              </p>
            </div>
          </div>

          {current.content}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs text-slate-600 font-semibold cursor-pointer select-none self-start sm:self-center">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-lime-600 border-slate-300 focus:ring-lime-500 cursor-pointer"
            />
            <span>Entendido, no mostrar de nuevo</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-lime-400 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2 bg-lime-500 hover:bg-lime-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-lime-500/20"
              >
                <span>¡Comenzar Evaluación!</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
