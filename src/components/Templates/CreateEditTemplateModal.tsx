import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, BookOpen, Check, AlertCircle, Layers, Sparkles } from 'lucide-react';
import { SurveyTemplate, TemplateQuestion } from '../../types';
import { createSurveyTemplate, updateSurveyTemplate } from '../../services/dataService';
import {
  standardizeAndMigrateQuestions,
  REQUIRED_QUESTIONS_PER_TEMPLATE,
  STANDARD_QUESTION_POOL,
} from '../../utils/templateMigration';

interface CreateEditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateToEdit?: SurveyTemplate | null;
  onSaved: (template: SurveyTemplate) => void;
}

export const CreateEditTemplateModal: React.FC<CreateEditTemplateModalProps> = ({
  isOpen,
  onClose,
  templateToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<TemplateQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (templateToEdit) {
      setName(templateToEdit.name);
      setTargetIndustry(templateToEdit.targetIndustry);
      setDescription(templateToEdit.description);
      // Migrate if not exactly 20 questions
      const { questions: stdQuestions } = standardizeAndMigrateQuestions(
        templateToEdit.questions || [],
        templateToEdit.id
      );
      setQuestions(stdQuestions);
    } else {
      setName('');
      setTargetIndustry('');
      setDescription('');
      // Generate initial 20 standardized questions from standard pool
      const { questions: initial20 } = standardizeAndMigrateQuestions([]);
      setQuestions(initial20);
    }
  }, [templateToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    const lastCategory = questions.length > 0 ? questions[questions.length - 1].category : 'General';
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        category: lastCategory,
        text: '',
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('Una plantilla debe tener al menos una pregunta.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx: number, field: 'category' | 'text', val: string) => {
    const updated = [...questions];
    updated[idx][field] = val;
    setQuestions(updated);
  };

  const handleAutocompleteTo20 = () => {
    const valid = questions.filter((q) => q.text.trim().length > 0);
    const { questions: std } = standardizeAndMigrateQuestions(valid);
    setQuestions(std);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor ingresa un nombre para la plantilla.');
      return;
    }

    const validQuestions = questions.filter((q) => q.text.trim().length > 0);
    if (validQuestions.length === 0) {
      alert('Por favor completa al menos una pregunta con su enunciado.');
      return;
    }

    // Always enforce the strict 20 questions standard
    const { questions: final20Questions } = standardizeAndMigrateQuestions(validQuestions);

    setLoading(true);
    try {
      if (templateToEdit) {
        await updateSurveyTemplate(templateToEdit.id, {
          name: name.trim(),
          targetIndustry: targetIndustry.trim() || 'General',
          description: description.trim(),
          questions: final20Questions,
        });
        onSaved({
          ...templateToEdit,
          name: name.trim(),
          targetIndustry: targetIndustry.trim() || 'General',
          description: description.trim(),
          questions: final20Questions,
        });
      } else {
        const created = await createSurveyTemplate({
          name: name.trim(),
          targetIndustry: targetIndustry.trim() || 'General',
          description: description.trim(),
          questions: final20Questions,
          isDefault: false,
        });
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Error guardando plantilla: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const validCount = questions.filter((q) => q.text.trim().length > 0).length;
  const isExact20 = validCount === REQUIRED_QUESTIONS_PER_TEMPLATE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-400/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">
                {templateToEdit ? 'Editar Cuestionario 360' : 'Crear Nueva Plantilla 360'}
              </h3>
              <p className="text-xs text-slate-400">
                Estándar obligatorio: exactamente 20 preguntas evaluables en escala Likert (1 a 5)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre de la Plantilla *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Evaluación de Liderazgo Ejecutivo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Industria / Tipo de Empresa *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Corporativo, Finanzas, Salud..."
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descripción u Objetivo de la Encuesta
            </label>
            <textarea
              rows={2}
              placeholder="Diagnóstico 360° para mandos medios enfocado en toma de decisiones..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Dynamic Question List */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Preguntas del Cuestionario
                  </h4>
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                      isExact20
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {validCount} / {REQUIRED_QUESTIONS_PER_TEMPLATE} requeridas
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Cada pregunta se evalúa del 1 (Deficiente) al 5 (Sobresaliente)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isExact20 && (
                  <button
                    type="button"
                    onClick={handleAutocompleteTo20}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                    title="Completa o equilibra automáticamente las preguntas a exactamente 20"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Autocompletar a 20
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-indigo-700">
                      Pregunta #{idx + 1} de {questions.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Competencia / Categoría
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Liderazgo"
                        value={q.category}
                        onChange={(e) => handleQuestionChange(idx, 'category', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-indigo-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Enunciado de la Pregunta
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Inspira al equipo y orienta hacia objetivos claros..."
                        value={q.text}
                        onChange={(e) => handleQuestionChange(idx, 'text', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              {loading
                ? 'Guardando...'
                : templateToEdit
                ? 'Actualizar Plantilla (20 Preguntas)'
                : 'Guardar Plantilla (20 Preguntas)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

