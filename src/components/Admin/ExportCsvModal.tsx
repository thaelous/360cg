import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, CheckCircle, Table, MessageSquare, Files, Sparkles } from 'lucide-react';
import { Campaign, EvaluatedSubject, EvaluationResponse } from '../../types';
import { exportCampaignSummaryCsv, exportCampaignDetailedResponsesCsv } from '../../utils/exportCsv';
import { exportMasterExcelReport } from '../../utils/exportMasterExcel';

interface ExportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  subjects: EvaluatedSubject[];
  responses: EvaluationResponse[];
}

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  isOpen,
  onClose,
  campaign,
  subjects,
  responses,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExportingMaster, setIsExportingMaster] = useState(false);

  if (!isOpen) return null;

  const handleExportMasterExcel = async () => {
    setIsExportingMaster(true);
    setErrorMessage(null);
    try {
      const filename = await exportMasterExcelReport(campaign, subjects, responses);
      setDownloadSuccess(`¡Archivo Súper Maestro "${filename}" descargado con éxito!`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: any) {
      setErrorMessage('Error generando Excel maestro: ' + (err?.message || err));
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsExportingMaster(false);
    }
  };

  const handleExportSummary = () => {
    exportCampaignSummaryCsv(campaign, subjects, responses);
    setDownloadSuccess('¡Resumen consolidado exportado exitosamente!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportDetailed = () => {
    exportCampaignDetailedResponsesCsv(campaign, subjects, responses);
    setDownloadSuccess('¡Respuestas detalladas con comentarios exportadas exitosamente!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportBoth = () => {
    exportCampaignSummaryCsv(campaign, subjects, responses);
    setTimeout(() => {
      exportCampaignDetailedResponsesCsv(campaign, subjects, responses);
    }, 400);
    setDownloadSuccess('¡Ambos archivos CSV/Excel exportados exitosamente!');
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600/60 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Exportar Resultados a CSV / Excel</h3>
              <p className="text-xs text-emerald-200">{campaign.companyName} • {campaign.clientCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-slate-500">
              Selecciona el tipo de reporte que deseas descargar para análisis externo en Microsoft Excel, Google Sheets, PowerBI o software estadístico. Compatible con caracteres especiales (UTF-8 con BOM).
            </p>
          </div>

          <div className="space-y-3">
            {/* Option 0: Súper Maestro Excel (.xlsx) */}
            <div className="p-4 bg-lime-50/70 hover:bg-lime-50 border-2 border-lime-400 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-lime-700" />
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    Archivo Súper Maestro de Resultados en Excel
                    <span className="text-[10px] bg-slate-900 text-lime-400 font-bold px-1.5 py-0.5 rounded">.XLSX</span>
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Libro multi-hojas: <strong>Hoja 1 (Resumen Ejecutivo)</strong> con promedios por rol y comentarios + <strong>Hoja 2 (Detalle Fila por Fila)</strong>.
                </p>
                <span className="inline-block text-[10px] font-semibold text-lime-800">
                  {subjects.length} colaboradores • {responses.length} evaluaciones
                </span>
              </div>
              <button
                onClick={handleExportMasterExcel}
                disabled={responses.length === 0 || isExportingMaster}
                className="px-4 py-2.5 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-slate-900 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 transition shadow-xs self-start sm:self-center border border-lime-400 cursor-pointer disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                {isExportingMaster ? 'Generando Excel...' : 'Descargar Excel (.xlsx)'}
              </button>
            </div>

            {/* Option 1: Consolidated Summary */}
            <div className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Resumen Consolidado por Colaborador
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Métricas clave, desglose por roles, promedios por competencia y diagnóstico de Brecha (GAP).
                </p>
                <span className="inline-block text-[10px] font-semibold text-slate-400">
                  {subjects.length} colaboradores registrados
                </span>
              </div>
              <button
                onClick={handleExportSummary}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition shadow-xs self-start sm:self-center"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar CSV
              </button>
            </div>

            {/* Option 2: Detailed Verbatim Responses */}
            <div className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-700" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Respuestas y Comentarios Cualitativos
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Cada encuesta individual con rol evaluador, puntajes y textos abiertos (fortalezas, mejoras y recomendaciones).
                </p>
                <span className="inline-block text-[10px] font-semibold text-slate-400">
                  {responses.length} cuestionarios completados
                </span>
              </div>
              <button
                onClick={handleExportDetailed}
                disabled={responses.length === 0}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition shadow-xs self-start sm:self-center"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar CSV
              </button>
            </div>
          </div>

          {/* Quick Dual Export Button */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              Formato compatible directo con Excel (.csv UTF-8)
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cerrar
              </button>
              <button
                onClick={handleExportBoth}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Files className="w-3.5 h-3.5 text-amber-400" />
                Descargar Ambos Archivos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
