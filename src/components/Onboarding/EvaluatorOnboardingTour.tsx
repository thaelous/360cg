import React from 'react';
import {
  ShieldCheck,
  Users,
  Star,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { OnboardingTour, TourStep } from './OnboardingTour';

export const EVALUATOR_TOUR_STORAGE_KEY = 'eval360_tour_evaluator_viewed_v1';

interface EvaluatorOnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName?: string;
  onComplete?: () => void;
}

export const EvaluatorOnboardingTour: React.FC<EvaluatorOnboardingTourProps> = ({
  isOpen,
  onClose,
  collaboratorName,
  onComplete,
}) => {
  const steps: TourStep[] = [
    {
      id: 'step-welcome-confidential',
      // Step 1: Modal introductorio centrado sin selector target
      badge: 'Bienvenida & Privacidad',
      icon: ShieldCheck,
      title: 'Evaluación de Competencias 360°',
      content:
        'Tus respuestas son totalmente confidenciales y tienen como único propósito impulsar el desarrollo profesional y las fortalezas del equipo.',
      previewComponent: (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-left text-xs text-emerald-950">
          <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Los resultados se procesan de forma anónima y agregada. Tu retroalimentación sincera es la herramienta más valiosa de mejora.
          </p>
        </div>
      ),
    },
    {
      id: 'step-evaluator-target',
      target: '#tour-evaluator-target',
      badge: 'Paso 2 · Colaborador & Rol',
      icon: Users,
      title: 'A quién estás evaluando',
      content:
        'Confirma el nombre del colaborador que vas a evaluar y selecciona tu rol respecto a él (Jefe directo, Par/Colega, Colaborador a cargo o Autoevaluación).',
    },
    {
      id: 'step-evaluator-scale',
      target: '#tour-evaluator-scale',
      badge: 'Paso 3 · Escala Likert',
      icon: Star,
      title: 'Escala de Calificación',
      content:
        'Evalúa con objetividad cada comportamiento del 1 al 5 (donde 1 es \'Rara vez / Necesita mejorar\' y 5 es \'Siempre / Fortaleza sobresaliente\').',
      previewComponent: (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Escala estándar de 1 a 5:
          </span>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {[
              { val: 1, label: 'Rara vez' },
              { val: 2, label: 'En desarrollo' },
              { val: 3, label: 'Cumple' },
              { val: 4, label: 'Destacado' },
              { val: 5, label: 'Siempre' },
            ].map((item) => (
              <div
                key={item.val}
                className="py-1.5 px-1 bg-white border border-slate-200 rounded-xl shadow-2xs"
              >
                <strong className="block text-sm font-black text-slate-900 leading-none">
                  {item.val}
                </strong>
                <span className="text-[9px] text-slate-500 leading-tight block mt-1 line-clamp-1">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'step-evaluator-progress',
      target: '#tour-evaluator-progress',
      badge: 'Paso 4 · Avance y Envío',
      icon: CheckCircle2,
      title: 'Avance y Envío',
      content:
        'Observa tu avance en la barra superior. Al responder todas las competencias, presiona \'Finalizar Evaluación\' para registrar tus aportes.',
      previewComponent: (
        <div className="p-3 bg-lime-50/70 border border-lime-300 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex-1">
            <div className="flex justify-between font-bold text-slate-900 text-[11px] mb-1">
              <span>Preguntas completadas</span>
              <span>100%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div className="bg-lime-500 h-full rounded-full w-full" />
            </div>
          </div>
          <span className="px-2.5 py-1 bg-slate-900 text-lime-400 font-bold rounded-xl text-[11px] shrink-0">
            Envío Seguro
          </span>
        </div>
      ),
    },
  ];

  return (
    <OnboardingTour
      isOpen={isOpen}
      onClose={onClose}
      steps={steps}
      storageKey={EVALUATOR_TOUR_STORAGE_KEY}
      tourTitle="Guía del Evaluador 360°"
      onComplete={onComplete}
    />
  );
};
