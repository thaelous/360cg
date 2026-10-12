import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  QrCode,
  UserPlus,
  Share2,
  BarChart3,
  CheckCircle,
  Clock,
  ArrowRight,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { Campaign, EvaluatedSubject, EvaluationResponse, SubjectStats } from '../../types';
import {
  getCampaignByCode,
  getCachedCampaignByCode,
  getCachedSubjects,
  getCachedResponses,
  getSubjects,
  getResponses,
  addSubject,
  deleteSubject,
  calculateSubjectStats,
} from '../../services/dataService';
import { ShareQrModal } from '../ShareQrModal';
import { SubjectReportModal } from '../Reports/SubjectReportModal';
import { ExportCsvModal } from '../Admin/ExportCsvModal';
import { exportMasterExcelReport } from '../../utils/exportMasterExcel';
import { BulkUploadModal } from './BulkUploadModal';
import { getCampaignValidityInfo } from '../../utils/campaignValidity';

interface CoordinatorPortalProps {
  initialCode?: string;
  initialCampaign?: Campaign | null;
  onLogout?: () => void;
  onLaunchEvaluation: (code: string, subjectId?: string) => void;
}

export const CoordinatorPortal: React.FC<CoordinatorPortalProps> = ({
  initialCode = '',
  initialCampaign = null,
  onLogout,
  onLaunchEvaluation,
}) => {
  const [clientCode, setClientCode] = useState(initialCode || initialCampaign?.clientCode || '');
  const [campaign, setCampaign] = useState<Campaign | null>(initialCampaign);
  const [subjects, setSubjects] = useState<EvaluatedSubject[]>([]);
  const [responses, setResponses] = useState<EvaluationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedSubjectForShare, setSelectedSubjectForShare] = useState<EvaluatedSubject | null>(null);
  const [reportSubjectStats, setReportSubjectStats] = useState<SubjectStats | null>(null);
  const [reportSubjectResponses, setReportSubjectResponses] = useState<EvaluationResponse[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [excelSuccessMsg, setExcelSuccessMsg] = useState('');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // New subject form
  const [newSubject, setNewSubject] = useState({
    name: '',
    role: '',
    department: '',
    email: '',
    targetEvaluators: 5,
  });

  // Filter/search
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (initialCampaign) {
      setCampaign(initialCampaign);
      // Precarga instantánea desde memoria local (< 5ms)
      const cachedSubs = getCachedSubjects(initialCampaign.id);
      const cachedResps = getCachedResponses(initialCampaign.id);
      if (cachedSubs.length > 0 || cachedResps.length > 0) {
        setSubjects(cachedSubs);
        setResponses(cachedResps);
      }
      loadCampaignDetails(initialCampaign.id);
    } else if (initialCode) {
      loadCoordinatorData(initialCode);
    }
  }, [initialCode, initialCampaign]);

  const loadCampaignDetails = async (campaignId: string) => {
    // Si ya hay datos en caché local, no bloqueamos la interfaz
    const cachedSubs = getCachedSubjects(campaignId);
    const cachedResps = getCachedResponses(campaignId);
    if (cachedSubs.length === 0 && cachedResps.length === 0) {
      setLoading(true);
    }

    try {
      // Consultas paralelas optimizadas con Promise.all
      const [subs, resps] = await Promise.all([
        getSubjects(campaignId),
        getResponses(campaignId),
      ]);
      setSubjects(subs);
      setResponses(resps);
    } catch (err) {
      console.error(err);
      if (cachedSubs.length === 0) {
        setErrorMsg('Error al conectar con la base de datos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCoordinatorData = async (codeToSearch: string) => {
    const trimmed = codeToSearch.trim().toUpperCase();
    if (!trimmed) {
      setErrorMsg('Por favor ingresa un código de empresa.');
      return;
    }
    setErrorMsg('');

    // Fast-path para empresas demo o cacheadas: respuesta instantánea (< 200ms)
    const cachedCamp = getCachedCampaignByCode(trimmed);
    if (cachedCamp) {
      setCampaign(cachedCamp);
      const cachedSubs = getCachedSubjects(cachedCamp.id);
      const cachedResps = getCachedResponses(cachedCamp.id);
      if (cachedSubs.length > 0 || cachedResps.length > 0) {
        setSubjects(cachedSubs);
        setResponses(cachedResps);
      }
    } else {
      setLoading(true);
    }

    try {
      const camp = await getCampaignByCode(trimmed);
      if (!camp) {
        setErrorMsg(`No se encontró ninguna empresa con el código "${codeToSearch}".`);
        setLoading(false);
        return;
      }
      setCampaign(camp);
      const [subs, resps] = await Promise.all([
        getSubjects(camp.id),
        getResponses(camp.id),
      ]);
      setSubjects(subs);
      setResponses(resps);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al conectar con la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;
    if (!newSubject.name.trim() || !newSubject.role.trim() || !newSubject.department.trim()) {
      alert('Por favor completa el nombre, cargo y departamento.');
      return;
    }

    try {
      const created = await addSubject({
        campaignId: campaign.id,
        name: newSubject.name.trim(),
        role: newSubject.role.trim(),
        department: newSubject.department.trim(),
        email: newSubject.email.trim(),
        targetEvaluators: Number(newSubject.targetEvaluators) || 5,
      });

      setSubjects((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewSubject({
        name: '',
        role: '',
        department: '',
        email: '',
        targetEvaluators: 5,
      });
    } catch (err) {
      console.error(err);
      alert('Error al registrar colaborador');
    }
  };

  const handleDeleteSubject = async (subjectId: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${name} de esta campaña?`)) return;
    try {
      await deleteSubject(subjectId);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar colaborador');
    }
  };

  const handleOpenReport = (sub: EvaluatedSubject) => {
    const subResponses = responses.filter((r) => r.subjectId === sub.id);
    const calculated = calculateSubjectStats(sub, subResponses);
    setReportSubjectStats(calculated);
    setReportSubjectResponses(subResponses);
    setIsReportModalOpen(true);
  };

  const handleDownloadReport = (sub: EvaluatedSubject) => {
    const subResponses = responses.filter((r) => r.subjectId === sub.id);
    if (subResponses.length === 0) return;
    const calculated = calculateSubjectStats(sub, subResponses);
    setReportSubjectStats(calculated);
    setReportSubjectResponses(subResponses);
    setIsReportModalOpen(true);
    // Trigger print dialog using print-friendly CSS media query for PDF generation
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleDownloadMasterExcel = async () => {
    if (!campaign) return;
    if (subjects.length === 0) {
      alert('No hay colaboradores registrados en esta campaña para generar el reporte maestro.');
      return;
    }
    if (responses.length === 0) {
      alert('Aún no se han recibido evaluaciones para esta campaña. Las evaluaciones registradas se consolidarán aquí automáticamente.');
      return;
    }

    setIsExportingExcel(true);
    try {
      let currentResponses = responses;
      try {
        currentResponses = await getResponses(campaign.id);
        setResponses(currentResponses);
      } catch (err) {
        console.warn('Usando respuestas en memoria:', err);
      }

      const generatedFileName = exportMasterExcelReport(campaign, subjects, currentResponses);
      setExcelSuccessMsg(
        `¡Reporte "${generatedFileName}" descargado con éxito! Se consolidaron ${subjects.length} colaboradores y ${currentResponses.length} evaluaciones.`
      );
      setTimeout(() => {
        setExcelSuccessMsg('');
      }, 7000);
    } catch (err: any) {
      console.error('Error al generar Excel maestro:', err);
      alert('Ocurrió un error al generar el archivo Excel consolidado: ' + (err?.message || err));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleOpenShare = (sub?: EvaluatedSubject) => {
    setSelectedSubjectForShare(sub || null);
    setIsShareModalOpen(true);
  };

  const handleCopyBroadcastLink = () => {
    if (!campaign) return;
    const origin = window.location.origin;
    const codeParam = campaign.clientCode || campaign.id;
    const link = `${origin}/?campana=${encodeURIComponent(codeParam)}`;
    navigator.clipboard.writeText(link);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2500);
  };

  // If not logged in with client code
  if (!campaign) {
    if (loading) {
      return (
        <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
          {/* Barra de progreso verde lima de respuesta inmediata */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-xs">
            <div className="bg-lime-500 h-full w-2/3 rounded-full animate-pulse transition-all"></div>
          </div>

          {/* Skeleton Hero Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-3 w-full max-w-xl">
                <div className="h-8 bg-slate-200 rounded-xl w-3/4 animate-pulse"></div>
                <div className="flex gap-2">
                  <div className="h-5 bg-emerald-100/70 rounded-full w-28 animate-pulse"></div>
                  <div className="h-5 bg-slate-100 rounded-full w-32 animate-pulse"></div>
                </div>
                <div className="h-4 bg-slate-100 rounded-lg w-full animate-pulse"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 bg-lime-200/60 rounded-xl w-44 animate-pulse"></div>
                <div className="h-10 bg-slate-100 rounded-xl w-36 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Skeleton KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-xs space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-slate-100 rounded w-24 animate-pulse"></div>
                  <div className="h-7 w-7 bg-slate-100 rounded-lg animate-pulse"></div>
                </div>
                <div className="h-7 bg-slate-200 rounded w-16 animate-pulse"></div>
                <div className="h-3 bg-slate-100 rounded w-32 animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Skeleton Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="h-6 bg-slate-200 rounded w-48 animate-pulse"></div>
              <div className="h-8 bg-slate-100 rounded-xl w-60 animate-pulse"></div>
            </div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center justify-between p-3.5 bg-slate-50/60 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse"></div>
                    <div className="space-y-1.5">
                      <div className="h-4 bg-slate-200 rounded w-40 animate-pulse"></div>
                      <div className="h-3 bg-slate-100 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-slate-200/60 rounded-xl w-32 animate-pulse"></div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-semibold pt-3">
              <RefreshCw className="w-3.5 h-3.5 text-lime-600 animate-spin" />
              <span>Cargando datos empresariales...</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Building2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Portal del Coordinador de Empresa
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Ingresa con tu Código de Empresa/Cliente para dar de alta a tus colaboradores, obtener códigos QR y monitorear el avance 360°.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadCoordinatorData(clientCode);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-left">
                Código de Empresa:
              </label>
              <input
                type="text"
                required
                placeholder="Ej. CORP-2026-X"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                className="w-full text-center text-lg font-mono font-bold tracking-widest uppercase bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-blue-500/25 transition flex items-center justify-center gap-2"
            >
              {loading ? 'Accediendo...' : 'Ingresar al Panel de Coordinador'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo buttons */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
            <span className="block mb-2 font-medium">Accesos demo de prueba:</span>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setClientCode('CORP-2026-X');
                  loadCoordinatorData('CORP-2026-X');
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-mono text-[11px] font-semibold transition"
              >
                CORP-2026-X (TechNova)
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientCode('CORP-2026-B');
                  loadCoordinatorData('CORP-2026-B');
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-mono text-[11px] font-semibold transition"
              >
                CORP-2026-B (Banco Innova)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate aggregated stats
  const totalTargetEvaluations = subjects.reduce((acc, s) => acc + (s.targetEvaluators || 5), 0);
  const totalReceivedEvaluations = responses.length;
  const overallPercentage = totalTargetEvaluations > 0
    ? Math.min(100, Math.round((totalReceivedEvaluations / totalTargetEvaluations) * 100))
    : 0;

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6 print:py-0 print:px-0 print:max-w-none">
      {/* Barra de progreso superior en verde lima para respuesta inmediata */}
      {loading && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden -mt-2">
          <div className="bg-gradient-to-r from-lime-500 to-emerald-500 h-full w-full rounded-full animate-pulse transition-all"></div>
        </div>
      )}

      {/* Screen-Only Coordinator Dashboard */}
      <div className="space-y-6 print:hidden">
        {/* 1. HERO DE CAMPAÑA: Cabecera Ejecutiva en Dos Niveles (Espaciosa y sin Empalmes) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
          {/* Nivel Superior: Fila de Título a lo ancho completo */}
          <div className="w-full space-y-2">
            <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
                {campaign.companyName || (campaign as any).name || 'Empresa'}
              </h1>

              {/* Badges informativos en una sola línea */}
              {(() => {
                const validity = getCampaignValidityInfo(campaign);
                return (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Estado dinámico */}
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5 border ${validity.statusBadge.colorClasses}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${validity.statusBadge.dotClasses}`}
                      />
                      {validity.statusBadge.label}
                    </span>

                    {/* Código: CORP-2026-X */}
                    <span className="bg-slate-50 text-slate-600 border border-slate-200 font-mono text-xs px-2.5 py-1 rounded-full font-semibold">
                      Código: {campaign.clientCode}
                    </span>

                    {/* Fecha de corte / Inicio */}
                    {validity.hasStarted ? (
                      campaign.expiresAt ? (
                        <span className="bg-slate-50 text-slate-600 border border-slate-200 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Cierre:{' '}
                          {new Date(campaign.expiresAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </span>
                      ) : campaign.deadline ? (
                        <span className="bg-slate-50 text-slate-600 border border-slate-200 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Cierre: {campaign.deadline}
                        </span>
                      ) : null
                    ) : campaign.durationDays ? (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {campaign.durationDays} días contratados
                      </span>
                    ) : campaign.deadline ? (
                      <span className="bg-slate-50 text-slate-600 border border-slate-200 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Cierre: {campaign.deadline}
                      </span>
                    ) : null}
                  </div>
                );
              })()}
            </div>

            {/* Descripción en texto gris suave */}
            <p className="text-slate-500 text-sm max-w-3xl mt-1.5 leading-relaxed">
              {campaign.description || 'Gestión centralizada del proceso de evaluación de desempeño 360°'}
            </p>
          </div>

          {/* Nivel Inferior: Barra de Acciones Ejecutiva */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {/* Lado izquierdo: Botón principal destacado */}
            <button
              onClick={handleDownloadMasterExcel}
              disabled={isExportingExcel || responses.length === 0}
              className="bg-lime-500 hover:bg-lime-600 disabled:opacity-50 disabled:hover:bg-lime-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed transition"
              title={
                responses.length > 0
                  ? `Descargar Reporte Maestro en Excel (${responses.length} evaluaciones consolidadas)`
                  : 'Esperando evaluaciones para generar el reporte maestro'
              }
            >
              {isExportingExcel ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950 shrink-0" />
                  <span>Generando Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>Descargar Reporte Maestro (.xlsx)</span>
                  {responses.length > 0 && (
                    <span className="ml-1 text-[11px] bg-slate-950 text-lime-400 px-1.5 py-0.5 rounded-md font-mono font-bold">
                      {responses.length}
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Lado derecho: Botones secundarios ordenados */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleOpenShare()}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 cursor-pointer transition shadow-xs"
              >
                <QrCode className="w-4 h-4 text-slate-700" />
                <span>Código QR de Campaña</span>
              </button>

              <button
                onClick={() => setIsBulkUploadModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm cursor-pointer transition"
                title="Importar múltiples colaboradores mediante archivo Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                <span>Carga Masiva Excel</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-slate-900 hover:bg-black text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm cursor-pointer transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Registrar Colaborador</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notificación flotante / inline de éxito en descarga de Excel */}
        {excelSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <strong className="block font-bold">Archivo Maestro de Resultados Descargado</strong>
                <span className="text-slate-600">{excelSuccessMsg}</span>
              </div>
            </div>
            <button
              onClick={() => setExcelSuccessMsg('')}
              className="px-2.5 py-1 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold cursor-pointer"
            >
              Entendido
            </button>
          </div>
        )}

        {/* Notificación inline de éxito en Carga Masiva */}
        {bulkSuccessMsg && (
          <div className="p-4 bg-lime-50 border border-lime-300 rounded-2xl flex items-center justify-between gap-3 text-lime-950 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-lime-200 rounded-lg text-lime-800">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <strong className="block font-bold">Importación Masiva Exitosa</strong>
                <span className="text-slate-600">{bulkSuccessMsg}</span>
              </div>
            </div>
            <button
              onClick={() => setBulkSuccessMsg('')}
              className="px-2.5 py-1 text-lime-800 hover:bg-lime-200/60 rounded-lg font-bold cursor-pointer"
            >
              Entendido
            </button>
          </div>
        )}

        {/* 3. TARJETAS KPI DE MÉTRICAS CLAVE (Estilo Dashboard Ejecutivo) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Colaboradores Evaluados */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Colaboradores Evaluados</span>
                <span className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-slate-900">{subjects.length}</span>
                <span className="text-xs text-slate-400">registrados</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
              Total activos en la campaña
            </p>
          </div>

          {/* KPI 2: Evaluaciones Completadas */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Evaluaciones Completadas</span>
                <span className="p-1.5 bg-lime-50 text-lime-700 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-slate-900">{totalReceivedEvaluations}</span>
                <span className="text-xs text-slate-400">de {totalTargetEvaluations} meta</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
              Respuestas consolidadas en vivo
            </p>
          </div>

          {/* KPI 3: Tasa de Participación (%) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Tasa de Participación</span>
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-slate-900">{overallPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-lime-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
              {overallPercentage >= 100 ? 'Meta global completada' : 'Progreso respecto a la meta'}
            </p>
          </div>

          {/* KPI 4: Enlace Directo de Difusión con Copiado Rápido */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Enlace Directo de Difusión</span>
                <span className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                  <Share2 className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xs font-mono text-slate-600 truncate mt-2 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg">
                /?campana={campaign.clientCode}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100">
              <button
                onClick={handleCopyBroadcastLink}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isLinkCopied
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                }`}
              >
                {isLinkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¡Enlace Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 4. TABLA DE COLABORADORES (Diseño SaaS Corporativo Sin Saturación) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Table header bar */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-700" />
                Colaboradores y Estado de Evaluaciones
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento en tiempo real del progreso de evaluación 360° por colaborador
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                {filteredSubjects.length} {filteredSubjects.length === 1 ? 'colaborador' : 'colaboradores'}
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Subjects List */}
          {filteredSubjects.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No se encontraron colaboradores</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm
                  ? 'Prueba con otro término de búsqueda.'
                  : 'Registra a la primera persona a evaluar para comenzar a recibir feedback 360°.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Registrar primer colaborador
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSubjects.map((sub) => {
                const subResponses = responses.filter((r) => r.subjectId === sub.id);
                const target = sub.targetEvaluators || 5;
                const percent = Math.min(100, Math.round((subResponses.length / target) * 100));

                // Breakdown counts
                const selfCount = subResponses.filter((r) => r.evaluatorRole === 'self').length;
                const mgrCount = subResponses.filter((r) => r.evaluatorRole === 'manager').length;
                const peerCount = subResponses.filter((r) => r.evaluatorRole === 'peer').length;
                const subCount = subResponses.filter((r) => r.evaluatorRole === 'subordinate').length;

                return (
                  <div
                    key={sub.id}
                    className="p-5 hover:bg-slate-50/60 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Columna 1: Colaborador */}
                    <div className="flex items-center gap-3.5 min-w-[260px]">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-center border border-slate-200/80 shrink-0">
                        {sub.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight">{sub.name}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {sub.role} · <span className="text-slate-400">{sub.department}</span>
                        </p>
                      </div>
                    </div>

                    {/* Columna 2: Progreso y Rol */}
                    <div className="flex-1 max-w-md space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">
                          {subResponses.length} de {target} evaluaciones ({percent}%)
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            percent >= 100 ? 'bg-lime-500' : 'bg-slate-900'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* Desglose sutil de roles */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                        <span>Auto: <strong className="text-slate-700 font-semibold">{selfCount}</strong></span>
                        <span className="text-slate-300">·</span>
                        <span>Jefe: <strong className="text-slate-700 font-semibold">{mgrCount}</strong></span>
                        <span className="text-slate-300">·</span>
                        <span>Pares: <strong className="text-slate-700 font-semibold">{peerCount}</strong></span>
                        <span className="text-slate-300">·</span>
                        <span>Colab: <strong className="text-slate-700 font-semibold">{subCount}</strong></span>
                      </div>
                    </div>

                    {/* Columna 3: Estado */}
                    <div className="shrink-0">
                      {percent >= 100 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Completado
                        </span>
                      ) : subResponses.length > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          En progreso
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1.5">
                          Sin iniciar
                        </span>
                      )}
                    </div>

                    {/* Columna 4: Acciones Limpias y Unificadas */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                      {/* Ver Informe (botón primario sutil) */}
                      <button
                        onClick={() => handleOpenReport(sub)}
                        disabled={subResponses.length === 0}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
                        title={subResponses.length > 0 ? 'Ver informe 360° en pantalla' : 'Esperando primeras respuestas'}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Ver Informe</span>
                      </button>

                      {/* Descargar PDF (icono discreto) */}
                      <button
                        onClick={() => handleDownloadReport(sub)}
                        disabled={subResponses.length === 0}
                        className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition cursor-pointer disabled:cursor-not-allowed"
                        title={
                          subResponses.length > 0
                            ? 'Descargar reporte individual en PDF'
                            : 'Esperando evaluaciones para generar el reporte'
                        }
                        aria-label="Descargar PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* QR Individual */}
                      <button
                        onClick={() => handleOpenShare(sub)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                        title="Generar código QR individual"
                        aria-label="Código QR"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>

                      {/* Probar Evaluar */}
                      <button
                        onClick={() => onLaunchEvaluation(campaign.clientCode, sub.id)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                        title="Probar cuestionario de evaluación"
                        aria-label="Probar evaluar"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {/* Eliminar (papelera discreta) */}
                      <button
                        onClick={() => handleDeleteSubject(sub.id, sub.name)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Eliminar colaborador"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: REGISTRAR NUEVO EVALUADO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Registrar Colaborador a Evaluar
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubjectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Valeria Cisneros Mendoza"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cargo / Puesto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Gerente de Operaciones"
                    value={newSubject.role}
                    onChange={(e) => setNewSubject({ ...newSubject, role: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departamento / Área *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Logística & Supply"
                    value={newSubject.department}
                    onChange={(e) => setNewSubject({ ...newSubject, department: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico (opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="v.cisneros@empresa.com"
                    value={newSubject.email}
                    onChange={(e) => setNewSubject({ ...newSubject, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meta de Evaluadores
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newSubject.targetEvaluators}
                    onChange={(e) =>
                      setNewSubject({ ...newSubject, targetEvaluators: Number(e.target.value) })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                >
                  Guardar Evaluado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE QR MODAL */}
      {isShareModalOpen && campaign && (
        <ShareQrModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          campaign={campaign}
          subject={selectedSubjectForShare}
          onOpenEvaluationDirectly={(subId) => onLaunchEvaluation(campaign.clientCode, subId)}
        />
      )}

      {/* REPORT MODAL */}
      {isReportModalOpen && campaign && (
        <SubjectReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          stats={reportSubjectStats}
          responses={reportSubjectResponses}
          companyName={campaign.companyName}
          customQuestions={campaign.questions}
        />
      )}

      {/* EXPORT CSV MODAL */}
      {isExportModalOpen && campaign && (
        <ExportCsvModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          campaign={campaign}
          subjects={subjects}
          responses={responses}
        />
      )}

      {/* BULK UPLOAD EXCEL MODAL */}
      {isBulkUploadModalOpen && campaign && (
        <BulkUploadModal
          isOpen={isBulkUploadModalOpen}
          onClose={() => setIsBulkUploadModalOpen(false)}
          campaignId={campaign.id}
          companyName={campaign.companyName}
          onSuccess={(added) => {
            setSubjects((prev) => [...added, ...prev]);
            setBulkSuccessMsg(`Se importaron exitosamente ${added.length} colaboradores a la campaña.`);
          }}
        />
      )}

      {/* FLOATING SUCCESS TOAST FOR BULK UPLOAD */}
      {bulkSuccessMsg && (
        <div className="fixed bottom-24 right-6 z-50 max-w-md bg-slate-900 text-white border-2 border-lime-400 p-4 rounded-2xl shadow-2xl flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5">
          <div className="w-9 h-9 rounded-xl bg-lime-400/20 text-lime-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle className="w-5 h-5 text-lime-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Carga Masiva Exitosa
            </h4>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed">{bulkSuccessMsg}</p>
          </div>
          <button
            onClick={() => setBulkSuccessMsg('')}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            title="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* FLOATING SUCCESS TOAST */}
      {excelSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white border-2 border-lime-400 p-4 rounded-2xl shadow-2xl flex items-start gap-3 transition-all">
          <div className="w-9 h-9 rounded-xl bg-lime-400/20 text-lime-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle className="w-5 h-5 text-lime-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Reporte Maestro Generado
            </h4>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed">{excelSuccessMsg}</p>
          </div>
          <button
            onClick={() => setExcelSuccessMsg('')}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            title="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
