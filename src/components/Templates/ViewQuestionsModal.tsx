import React from 'react';
import { X, BookOpen, Download, Layers, CheckCircle } from 'lucide-react';
import { SurveyTemplate } from '../../types';
import { exportTemplateToCsv } from '../../utils/templateCsv';

interface ViewQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: SurveyTemplate | null;
}

export const ViewQuestionsModal: React.FC<ViewQuestionsModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  if (!isOpen || !template) return null;

  // Group questions by category
  const groupedCategories: Record<string, typeof template.questions> = {};
  template.questions.forEach((q) => {
    const cat = q.category || 'General';
    if (!groupedCategories[cat]) {
      groupedCategories[cat] = [];
    }
    groupedCategories[cat].push(q);
  });

  const categories = Object.keys(groupedCategories);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-400/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base">{template.name}</h3>
                {template.isDefault && (
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-bold">
                    Sistema
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{template.targetIndustry}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTemplateToCsv(template)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              title="Descargar preguntas en CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
            {template.description}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>
              <strong>{template.questions.length}</strong> preguntas distribuidas en{' '}
              <strong>{categories.length}</strong> competencias
            </span>
            <span className="font-medium">Escala Likert (1 al 5)</span>
          </div>

          {/* Grouped Questions */}
          <div className="space-y-5">
            {categories.map((cat, catIdx) => (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {catIdx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{cat}</h4>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {groupedCategories[cat].length} preguntas
                  </span>
                </div>

                <div className="pl-8 space-y-2">
                  {groupedCategories[cat].map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      className="p-3 bg-white hover:bg-indigo-50/30 rounded-xl border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2.5 transition"
                    >
                      <span className="text-slate-400 font-bold shrink-0">{qIdx + 1}.</span>
                      <span className="leading-snug">{q.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
