import React, { useEffect } from 'react';
import { HelpCircle, X, Sparkles, Lightbulb, Target } from 'lucide-react';
import { HelpItem } from './helpCatalog';

interface HelpInspectorModalProps {
  item: HelpItem | null;
  onClose: () => void;
}

export const HelpInspectorModal: React.FC<HelpInspectorModalProps> = ({ item, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-amber-300 overflow-hidden animate-scale-up text-left"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-amber-500 text-slate-950 flex items-center justify-between border-b border-amber-600">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-950 text-amber-400 rounded-xl shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 block leading-none">
                Inspector de Ayuda Interactiva
              </span>
              <span className="text-xs font-black text-slate-950 block mt-0.5">
                {item.badge}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-900 hover:bg-amber-600/50 rounded-xl transition cursor-pointer"
            title="Cerrar explicación (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {item.title}
            </h3>
          </div>

          {/* Bloque 1: ¿Qué hace esta función? */}
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span>¿Qué hace esta función?</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {item.whatItDoes}
            </p>
          </div>

          {/* Bloque 2: ¿Cuándo y cómo utilizarla? */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-blue-950 uppercase tracking-wider">
              <Target className="w-4 h-4 text-blue-700" />
              <span>¿Cuándo y cómo utilizarla?</span>
            </div>
            <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
              {item.whenAndHow}
            </p>
          </div>

          {/* Pro tip si existe */}
          {item.tip && (
            <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong className="font-bold">Recomendación clave: </strong>
                {item.tip}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Pulsa <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] text-slate-700">Esc</kbd> o el botón para continuar.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
