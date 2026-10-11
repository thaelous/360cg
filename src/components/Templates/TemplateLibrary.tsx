import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Upload,
  Download,
  Copy,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  Search,
  Sparkles,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  Building,
} from 'lucide-react';
import { SurveyTemplate } from '../../types';
import {
  getSurveyTemplates,
  deleteSurveyTemplate,
  duplicateSurveyTemplate,
  seedDefaultTemplatesToFirestore,
  migrateAllTemplatesToStandard,
} from '../../services/dataService';
import { exportTemplateToCsv, downloadSampleTemplateCsv } from '../../utils/templateCsv';
import { ViewQuestionsModal } from './ViewQuestionsModal';
import { ImportTemplateCsvModal } from './ImportTemplateCsvModal';
import { CreateEditTemplateModal } from './CreateEditTemplateModal';

export const TemplateLibrary: React.FC = () => {
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedTemplateForView, setSelectedTemplateForView] = useState<SurveyTemplate | null>(null);
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<SurveyTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const list = await getSurveyTemplates();
      setTemplates(list);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (template: SurveyTemplate) => {
    try {
      const duplicated = await duplicateSurveyTemplate(template.id);
      setTemplates((prev) => [duplicated, ...prev]);
      showNotice(`Plantilla "${template.name}" duplicada como copia editable.`);
    } catch (err: any) {
      alert('Error al duplicar: ' + (err?.message || err));
    }
  };

  const handleDelete = async (template: SurveyTemplate) => {
    const confirmMsg = template.isDefault
      ? `¿Estás seguro de eliminar la plantilla del sistema "${template.name}"? Podrás restaurarla después si lo deseas.`
      : `¿Eliminar la plantilla "${template.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      await deleteSurveyTemplate(template.id);
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      showNotice(`Plantilla "${template.name}" eliminada.`);
    } catch (err: any) {
      alert('Error al eliminar plantilla: ' + (err?.message || err));
    }
  };

  const handleRestoreDefaults = async () => {
    if (!confirm('¿Restablecer las 5 plantillas por defecto del sistema en Firestore?')) return;
    setLoading(true);
    try {
      await seedDefaultTemplatesToFirestore();
      await loadTemplates();
      showNotice('Las 5 plantillas base del sistema han sido restauradas exitosamente.');
    } catch (err: any) {
      alert('Error al restaurar plantillas: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleAuditAndStandardize = async () => {
    setLoading(true);
    try {
      const res = await migrateAllTemplatesToStandard();
      await loadTemplates();
      if (res.migratedTemplates > 0 || res.migratedCampaigns > 0) {
        showNotice(
          `¡Migración exitosa! Se ajustaron ${res.migratedTemplates} plantillas y ${res.migratedCampaigns} campañas al estándar estricto de 20 preguntas.`
        );
      } else {
        showNotice(
          `Auditoría completada: Todas las ${res.totalTemplates} plantillas y campañas ya cumplen con el estándar de 20 preguntas.`
        );
      }
    } catch (err: any) {
      alert('Error ejecutando migración: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4500);
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.targetIndustry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Bar / Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Biblioteca 360 en Firestore
            </span>
            <span className="text-xs text-slate-400">
              {templates.length} plantillas disponibles
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Cuestionarios y Plantillas de Competencias
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Elige qué cuestionario aplicar a cada empresa. Personaliza preguntas, crea nuevas plantillas o impórtalas en masa desde archivos CSV.
          </p>
        </div>

        {/* Global Template Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            Importar CSV
          </button>

          <button
            onClick={() => {
              setSelectedTemplateForEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Crear Plantilla
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter and utilities bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre, industria o enfoque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={downloadSampleTemplateCsv}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
            title="Descargar plantilla CSV oficial con 20 preguntas (ejemplo con columnas: categoria,pregunta)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV 20 Preguntas
          </button>

          <button
            onClick={handleAuditAndStandardize}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            title="Audita y migra todas las plantillas y campañas de la base de datos para asegurar exactamente 20 preguntas"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Auditar 20 Preguntas
          </button>

          <button
            onClick={handleRestoreDefaults}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
            title="Restaurar las 5 plantillas por defecto en Firestore"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Restaurar 5 Base
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => {
          // Extract unique categories
          const categories = Array.from(new Set(template.questions.map((q) => q.category)));

          return (
            <div
              key={template.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {template.targetIndustry}
                  </span>
                  {template.isDefault ? (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Plantilla del Sistema
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Personalizada
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {template.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                {/* Categories & Questions count */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      {template.questions.length} Preguntas
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {categories.length} Competencias evaluadas
                    </span>
                  </div>

                  {/* Category pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {categories.slice(0, 4).map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50/60 text-indigo-800 border border-indigo-100 rounded-md"
                      >
                        {cat}
                      </span>
                    ))}
                    {categories.length > 4 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                        +{categories.length - 4} más
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons row */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedTemplateForView(template)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver Preguntas
                  </button>

                  <button
                    onClick={() => exportTemplateToCsv(template)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                    title="Exportar preguntas a CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(template)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                    title="Duplicar para personalizar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedTemplateForEdit(template);
                      setIsCreateModalOpen(true);
                    }}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                    title="Editar plantilla"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(template)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                    title="Eliminar plantilla"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTemplates.length === 0 && (
          <div className="col-span-2 p-12 text-center bg-white rounded-3xl border border-slate-200">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No se encontraron plantillas</p>
            <p className="text-xs text-slate-400 mt-1">
              Prueba con otro término de búsqueda o restaura las 5 plantillas por defecto.
            </p>
          </div>
        )}
      </div>

      {/* MODALS */}
      <ViewQuestionsModal
        isOpen={!!selectedTemplateForView}
        onClose={() => setSelectedTemplateForView(null)}
        template={selectedTemplateForView}
      />

      <ImportTemplateCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onTemplateImported={(newTpl) => {
          setTemplates((prev) => [newTpl, ...prev]);
          showNotice(`¡Plantilla "${newTpl.name}" importada exitosamente a la biblioteca!`);
        }}
      />

      <CreateEditTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedTemplateForEdit(null);
        }}
        templateToEdit={selectedTemplateForEdit}
        onSaved={(savedTpl) => {
          loadTemplates();
          showNotice(
            selectedTemplateForEdit
              ? `Plantilla "${savedTpl.name}" actualizada.`
              : `Plantilla "${savedTpl.name}" creada exitosamente.`
          );
        }}
      />
    </div>
  );
};
