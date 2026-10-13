import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { parseSurveyTemplateCsv, downloadSampleTemplateCsv } from '../../utils/templateCsv';
import { createSurveyTemplate } from '../../services/dataService';
import { SurveyTemplate, TemplateQuestion } from '../../types';
import { REQUIRED_QUESTIONS_PER_TEMPLATE, TemplateValidationResult } from '../../utils/templateMigration';

interface ImportTemplateCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateImported: (template: SurveyTemplate) => void;
}

export const ImportTemplateCsvModal: React.FC<ImportTemplateCsvModalProps> = ({
  isOpen,
  onClose,
  onTemplateImported,
}) => {
  const [name, setName] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<TemplateQuestion[]>([]);
  const [standardizedQuestions, setStandardizedQuestions] = useState<TemplateQuestion[]>([]);
  const [validation, setValidation] = useState<TemplateValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [autoStandardize, setAutoStandardize] = useState(true);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseSurveyTemplateCsv(content);
      if (res.success) {
        setParsedQuestions(res.questions);
        setStandardizedQuestions(res.standardizedQuestions);
        setValidation(res.validation);
        setParseError(null);
        // Auto-fill name if empty
        if (!name) {
          const cleanFileName = selected.name.replace(/\.csv$/i, '').replace(/_/g, ' ');
          setName(`Cuestionario ${cleanFileName}`);
        }
      } else {
        setParsedQuestions([]);
        setStandardizedQuestions([]);
        setValidation(null);
        setParseError(res.error || 'Error al procesar el archivo CSV.');
      }
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setParseError('Por favor ingresa el nombre de la plantilla.');
      return;
    }
    if (parsedQuestions.length === 0) {
      setParseError('Debes cargar un archivo CSV con preguntas válidas.');
      return;
    }

    // Determine final questions to save (always enforce 20 questions)
    const questionsToSave =
      parsedQuestions.length === REQUIRED_QUESTIONS_PER_TEMPLATE
        ? parsedQuestions
        : standardizedQuestions;

    if (questionsToSave.length !== REQUIRED_QUESTIONS_PER_TEMPLATE) {
      setParseError(`La plantilla debe contener exactamente ${REQUIRED_QUESTIONS_PER_TEMPLATE} preguntas.`);
      return;
    }

    setLoading(true);
    try {
      const created = await createSurveyTemplate({
        name: name.trim(),
        targetIndustry: targetIndustry.trim() || 'General',
        description:
          description.trim() ||
          `Plantilla importada desde CSV con ${REQUIRED_QUESTIONS_PER_TEMPLATE} preguntas estandarizadas.`,
        questions: questionsToSave,
        isDefault: false,
      });

      onTemplateImported(created);
      onClose();
    } catch (err: any) {
      console.error(err);
      setParseError('Error al guardar la plantilla en Firestore: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const finalQuestions =
    parsedQuestions.length === REQUIRED_QUESTIONS_PER_TEMPLATE || !autoStandardize
      ? parsedQuestions
      : standardizedQuestions;

  const categoriesCount = new Set(finalQuestions.map((q) => q.category)).size;
  const isCompliant = parsedQuestions.length === REQUIRED_QUESTIONS_PER_TEMPLATE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/30 rounded-xl">
              <Upload className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Importar Cuestionario desde CSV</h3>
              <p className="text-xs text-indigo-200">
                Estándar obligatorio: exactamente 20 preguntas por competencias
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* File Upload Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Archivo CSV de Preguntas *
              </label>
              <button
                type="button"
                onClick={downloadSampleTemplateCsv}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar plantilla CSV ejemplo (20 preguntas)
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${
                file
                  ? 'border-emerald-400 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet
                className={`w-8 h-8 mx-auto mb-2 ${
                  file ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              {file ? (
                <div>
                  <p className="text-xs font-bold text-emerald-800">{file.name}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Haz clic para cambiar archivo
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    Haz clic para seleccionar tu archivo .csv
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Debe contener encabezados: <code>categoria,pregunta</code> (20 preguntas requeridas)
                  </p>
                </div>
              )}
            </div>

            {parseError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Validation & Migration Alert */}
            {parsedQuestions.length > 0 && isCompliant && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  <strong>¡Estándar Cumplido!</strong> Exactamente <strong>20 preguntas</strong> distribuidas en{' '}
                  <strong>{categoriesCount} competencias</strong> listas para importar.
                </span>
              </div>
            )}

            {parsedQuestions.length > 0 && !isCompliant && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl space-y-2">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      Archivo con {parsedQuestions.length} reactivos (Estándar: 20 preguntas):
                    </span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      {parsedQuestions.length < REQUIRED_QUESTIONS_PER_TEMPLATE
                        ? `Se detectaron ${parsedQuestions.length} preguntas. El script de migración completará inteligentemente las ${
                            REQUIRED_QUESTIONS_PER_TEMPLATE - parsedQuestions.length
                          } preguntas restantes con reactivos estándar por competencia.`
                        : `Se detectaron ${parsedQuestions.length} preguntas. El script ajustará el conjunto de forma balanceada a 20 preguntas.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-[11px]">
                  <span className="font-bold text-amber-900">
                    Resultado final tras migración: <strong>20 preguntas en {categoriesCount} competencias</strong>.
                  </span>
                  <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md font-extrabold uppercase text-[10px]">
                    Auto-Ajustado a 20
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Template Details */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre de la Plantilla *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Evaluación de Competencias para Call Center y Soporte"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enfoque o Tipo de Empresa / Industria *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Atención al Cliente / Telecomunicaciones / BPO"
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción del Objetivo de la Encuesta
              </label>
              <textarea
                rows={2}
                placeholder="Diagnóstico 360° para personal de primera línea evaluando empatía, rapidez y solución de casos..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Preview of standardized questions */}
          {finalQuestions.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Vista previa de las {finalQuestions.length} preguntas a guardar:
                </span>
                <span className="text-[11px] font-semibold text-indigo-600">
                  {categoriesCount} competencias
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {finalQuestions.slice(0, 5).map((q, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700 flex items-start gap-2"
                  >
                    <span className="font-bold text-indigo-700 shrink-0">
                      #{idx + 1} [{q.category}]
                    </span>
                    <span className="truncate">{q.text}</span>
                  </div>
                ))}
                {finalQuestions.length > 5 && (
                  <p className="text-[10px] text-slate-400 text-center italic">
                    y {finalQuestions.length - 5} preguntas más (total: {finalQuestions.length})...
                  </p>
                )}
              </div>
            </div>
          )}

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
              disabled={loading || parsedQuestions.length === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              {loading ? 'Guardando en BD...' : 'Guardar Plantilla (20 Preguntas)'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

