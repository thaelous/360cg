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
} from 'lucide-react';
import { Campaign, EvaluatedSubject, EvaluationResponse, SubjectStats } from '../../types';
import {
  getCampaignByCode,
  getSubjects,
  getResponses,
  addSubject,
  deleteSubject,
  calculateSubjectStats,
} from '../../services/dataService';
import { ShareQrModal } from '../ShareQrModal';
import { SubjectReportModal } from '../Reports/SubjectReportModal';
import { ExportCsvModal } from '../Admin/ExportCsvModal';

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedSubjectForShare, setSelectedSubjectForShare] = useState<EvaluatedSubject | null>(null);
  const [reportSubjectStats, setReportSubjectStats] = useState<SubjectStats | null>(null);
  const [reportSubjectResponses, setReportSubjectResponses] = useState<EvaluationResponse[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
      loadCampaignDetails(initialCampaign.id);
    } else if (initialCode) {
      loadCoordinatorData(initialCode);
    }
  }, [initialCode, initialCampaign]);

  const loadCampaignDetails = async (campaignId: string) => {
    setLoading(true);
    try {
      const [subs, resps] = await Promise.all([
        getSubjects(campaignId),
        getResponses(campaignId),
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

  const loadCoordinatorData = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) {
      setErrorMsg('Por favor ingresa un código de empresa.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const camp = await getCampaignByCode(codeToSearch.trim());
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

  const handleOpenShare = (sub?: EvaluatedSubject) => {
    setSelectedSubjectForShare(sub || null);
    setIsShareModalOpen(true);
  };

  // If not logged in with client code
  if (!campaign) {
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
      {/* Screen-Only Coordinator Dashboard */}
      <div className="space-y-6 print:hidden">
        {/* Top Banner / Company Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-full border border-blue-200">
              {campaign.clientCode}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                campaign.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {campaign.status === 'active' ? '● Campaña Activa' : '● Campaña Cerrada'}
            </span>
            {campaign.deadline && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Cierre: {campaign.deadline}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {campaign.companyName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            {campaign.description || 'Gestión centralizada del proceso de evaluación de desempeño 360°'}
          </p>
        </div>

        {/* Global Action buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-lime-400 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition border border-slate-700"
            title="Exportar métricas y respuestas a Excel o CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-lime-400" />
            Exportar CSV / Excel
          </button>

          <button
            onClick={() => handleOpenShare()}
            className="px-4 py-2.5 bg-slate-100 hover:bg-lime-50 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition border border-slate-300 hover:border-lime-400"
          >
            <QrCode className="w-4 h-4 text-lime-700" />
            Código QR de Campaña
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-slate-900 rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-lime-500/20 transition border border-lime-400"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            Registrar Evaluado
          </button>

          <button
            onClick={() => {
              setCampaign(null);
              setClientCode('');
              if (onLogout) onLogout();
            }}
            className="px-3 py-2.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition font-medium"
            title="Cerrar sesión de empresa"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Progress & Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Colaboradores Registrados</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{subjects.length}</span>
            <span className="text-xs text-slate-400">personas</span>
          </div>
          <span className="text-[11px] text-lime-700 font-bold mt-1 block">Sujetos evaluados</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Evaluaciones Recibidas</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{totalReceivedEvaluations}</span>
            <span className="text-xs text-slate-400">de ~{totalTargetEvaluations} meta</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">En tiempo real en Firestore</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Avance de Campaña</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{overallPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-lime-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Enlace de Difusión</span>
          <p className="text-xs font-mono text-slate-600 truncate mt-1">
            ?code={campaign.clientCode}
          </p>
          <button
            onClick={() => handleOpenShare()}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
          >
            <Share2 className="w-3.5 h-3.5" />
            Copiar enlace para el equipo
          </button>
        </div>
      </div>

      {/* Main Subjects Table & Management */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Personas a Evaluar en {campaign.companyName}
            </h2>
            <p className="text-xs text-slate-500">
              Genera códigos QR específicos o analiza los resultados individuales de cada colaborador
            </p>
          </div>

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
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Registrar primer evaluado
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
                  className="p-5 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: User identity */}
                  <div className="flex items-start gap-3.5 min-w-[260px]">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {sub.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{sub.name}</h3>
                      <p className="text-xs text-slate-600 font-medium">{sub.role}</p>
                      <span className="inline-block text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5">
                        {sub.department}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Progress and roles breakdown */}
                  <div className="flex-1 max-w-md space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {subResponses.length} de {target} evaluaciones ({percent}%)
                      </span>
                      {percent >= 100 && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Meta lograda
                        </span>
                      )}
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percent >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Roles mini badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                      <span
                        className={`px-1.5 py-0.5 rounded border font-medium ${
                          selfCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        Auto: {selfCount}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border font-medium ${
                          mgrCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        Jefe: {mgrCount}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border font-medium ${
                          peerCount > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        Pares: {peerCount}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border font-medium ${
                          subCount > 0 ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        Colab: {subCount}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                    <button
                      onClick={() => handleDownloadReport(sub)}
                      disabled={subResponses.length === 0}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-lime-400 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:cursor-not-allowed"
                      title={
                        subResponses.length > 0
                          ? 'Download Report (PDF) - Descargar reporte oficial con resumen de calificaciones'
                          : 'Esperando evaluaciones para generar el reporte'
                      }
                      aria-label="Download Report"
                    >
                      <Download className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                      <span>Download Report</span>
                    </button>

                    <button
                      onClick={() => handleOpenReport(sub)}
                      disabled={subResponses.length === 0}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
                      title={subResponses.length > 0 ? 'Ver informe 360° en pantalla' : 'Esperando primeras respuestas'}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Reporte 360°</span>
                    </button>

                    <button
                      onClick={() => handleOpenShare(sub)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Generar QR específico para evaluar a esta persona"
                    >
                      <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                      <span>QR Directo</span>
                    </button>

                    <button
                      onClick={() => onLaunchEvaluation(campaign.clientCode, sub.id)}
                      className="px-2.5 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                      title="Probar responder encuesta para esta persona"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Evaluar</span>
                    </button>

                    <button
                      onClick={() => handleDeleteSubject(sub.id, sub.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Eliminar colaborador"
                    >
                      <Trash2 className="w-4 h-4" />
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
    </div>
  );
};
