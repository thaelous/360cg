import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building,
  PlusCircle,
  Copy,
  Check,
  QrCode,
  Users,
  BarChart,
  Calendar,
  Lock,
  Unlock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText,
  Search,
  LogOut,
  Database,
  Flame,
  BookOpen,
  Sparkles,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { Campaign, EvaluatedSubject, EvaluationResponse, SubjectStats, SurveyTemplate } from '../../types';
import {
  getCampaigns,
  getSubjects,
  getResponses,
  createCampaign,
  updateCampaignStatus,
  calculateSubjectStats,
  getSurveyTemplates,
} from '../../services/dataService';
import { getAdminSession } from '../../services/authService';
import { ShareQrModal } from '../ShareQrModal';
import { SubjectReportModal } from '../Reports/SubjectReportModal';
import { ExportCsvModal } from './ExportCsvModal';
import { TemplateLibrary } from '../Templates/TemplateLibrary';
import { ViewQuestionsModal } from '../Templates/ViewQuestionsModal';

interface AdminDashboardProps {
  onSwitchToCoordinator: (clientCode: string) => void;
  onLaunchEvaluation: (code: string, subjectId?: string) => void;
  onLogoutAdmin?: () => void;
  onOpenFirebaseModal?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSwitchToCoordinator,
  onLaunchEvaluation,
  onLogoutAdmin,
  onOpenFirebaseModal,
}) => {
  const adminUser = getAdminSession();
  const [adminTab, setAdminTab] = useState<'campaigns' | 'templates'>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [subjects, setSubjects] = useState<EvaluatedSubject[]>([]);
  const [responses, setResponses] = useState<EvaluationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Campaign Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newCampaignData, setNewCampaignData] = useState({
    companyName: '',
    clientCode: '',
    description: '',
    deadline: '',
  });

  // Preview questionnaire modal
  const [inspectingTemplate, setInspectingTemplate] = useState<SurveyTemplate | null>(null);

  // Share QR Modal
  const [selectedCampaignForShare, setSelectedCampaignForShare] = useState<Campaign | null>(null);

  // Export CSV Modal
  const [selectedCampaignForExport, setSelectedCampaignForExport] = useState<Campaign | null>(null);

  // Report Modal
  const [activeReportStats, setActiveReportStats] = useState<SubjectStats | null>(null);
  const [activeReportResponses, setActiveReportResponses] = useState<EvaluationResponse[]>([]);
  const [activeReportCompany, setActiveReportCompany] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [camps, tpls] = await Promise.all([
        getCampaigns(),
        getSurveyTemplates(),
      ]);
      setCampaigns(camps);
      setTemplates(tpls);
      if (tpls.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(tpls[0].id);
      }

      // Fetch subjects & responses across all campaigns
      const allSubs: EvaluatedSubject[] = [];
      const allResps: EvaluationResponse[] = [];

      for (const c of camps) {
        const [subs, resps] = await Promise.all([
          getSubjects(c.id),
          getResponses(c.id),
        ]);
        allSubs.push(...subs);
        allResps.push(...resps);
      }

      setSubjects(allSubs);
      setResponses(allResps);
    } catch (err) {
      console.error('Error loading admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignData.companyName.trim()) {
      alert('Ingresa el nombre de la empresa');
      return;
    }

    try {
      const chosenTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

      const created = await createCampaign({
        companyName: newCampaignData.companyName.trim(),
        clientCode: newCampaignData.clientCode.trim() || undefined,
        description: newCampaignData.description.trim(),
        deadline: newCampaignData.deadline || undefined,
        templateId: chosenTemplate?.id,
        templateName: chosenTemplate?.name,
        questions: chosenTemplate?.questions,
      });

      setCampaigns((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      setNewCampaignData({ companyName: '', clientCode: '', description: '', deadline: '' });
    } catch (err) {
      console.error(err);
      alert('Error creando campaña');
    }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    const nextStatus = campaign.status === 'active' ? 'closed' : 'active';
    const confirmText =
      nextStatus === 'closed'
        ? `¿Deseas cerrar la campaña de "${campaign.companyName}"? Los evaluadores ya no podrán enviar más respuestas.`
        : `¿Deseas reactivar la campaña de "${campaign.companyName}"?`;

    if (!confirm(confirmText)) return;

    try {
      await updateCampaignStatus(campaign.id, nextStatus);
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, status: nextStatus } : c))
      );
    } catch (err) {
      console.error(err);
      alert('Error al actualizar estado de la campaña');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleViewSubjectReport = (sub: EvaluatedSubject, companyName: string) => {
    const subResponses = responses.filter((r) => r.subjectId === sub.id);
    const calculated = calculateSubjectStats(sub, subResponses);
    setActiveReportStats(calculated);
    setActiveReportResponses(subResponses);
    setActiveReportCompany(companyName);
    setIsReportModalOpen(true);
  };

  const filteredCampaigns = campaigns.filter((c) =>
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clientCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Top Admin Session Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            SA
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              Sesión Super Administrador
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-mono">
                {adminUser?.email || 'admin@talent360.com'}
              </span>
            </span>
            <span className="text-[11px] text-slate-400 block">
              Control global de empresas, métricas y configuración de base de datos
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenFirebaseModal && (
            <button
              onClick={onOpenFirebaseModal}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Configuración de Firebase Firestore"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Base de Datos</span>
            </button>
          )}

          {onLogoutAdmin && (
            <button
              onClick={onLogoutAdmin}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <img src="/comgico.png" alt="Comunicación Global" className="h-10 w-10 rounded-full object-contain ring-2 ring-lime-400/40 shrink-0" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-lime-400 text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 text-lime-400" />
              Comunicación Global • Panel Super Administrador
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Gestión Centralizada de Evaluaciones 360°
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Crea empresas cliente, asigna cuestionarios por industria, supervisa el avance en tiempo real y descarga reportes ejecutivos consolidados.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3.5 bg-lime-500 hover:bg-lime-400 text-slate-900 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-lime-500/20 transition flex items-center justify-center gap-2 shrink-0 self-start md:self-center border border-lime-400 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          Nueva Campaña / Empresa
        </button>
      </div>

      {/* Admin Section Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setAdminTab('campaigns')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            adminTab === 'campaigns'
              ? 'bg-slate-900 text-lime-400 border border-slate-800 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4 text-lime-500" />
          <span>Empresas y Campañas</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              adminTab === 'campaigns' ? 'bg-slate-800 text-lime-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {campaigns.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('templates')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            adminTab === 'templates'
              ? 'bg-slate-900 text-lime-400 border border-slate-800 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-lime-500" />
          <span>Biblioteca de Cuestionarios 360</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              adminTab === 'templates' ? 'bg-slate-800 text-lime-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {templates.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: TEMPLATE LIBRARY */}
      {adminTab === 'templates' && <TemplateLibrary />}

      {/* TAB CONTENT: CAMPAIGNS */}
      {adminTab === 'campaigns' && (
        <>
          {/* Global Metrics Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Campañas Totales</span>
              <span className="text-3xl font-black text-slate-900 mt-1 block">{campaigns.length}</span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                {campaigns.filter((c) => c.status === 'active').length} activas
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Colaboradores Evaluados</span>
              <span className="text-3xl font-black text-indigo-600 mt-1 block">{subjects.length}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Registrados en la plataforma</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Evaluaciones Completadas</span>
              <span className="text-3xl font-black text-emerald-600 mt-1 block">{responses.length}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Cuestionarios 360 procesados</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Promedio Global</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-slate-900">
                  {responses.length > 0 ? '4.32' : '0.0'}
                </span>
                <span className="text-xs text-slate-400">/ 5.0</span>
              </div>
              <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">En competencias clave</span>
            </div>
          </div>

          {/* Search and list header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Empresas y Campañas Registradas</h2>
              <p className="text-xs text-slate-500">
                Administra los códigos de acceso de cada cliente y consulta sus reportes
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por empresa o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>
          </div>

          {/* Campaigns Cards List */}
          <div className="space-y-4">
            {filteredCampaigns.map((camp) => {
              const campSubjects = subjects.filter((s) => s.campaignId === camp.id);
              const campResponses = responses.filter((r) => r.campaignId === camp.id);

              return (
                <div
                  key={camp.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 hover:shadow-md transition space-y-4"
                >
                  {/* Campaign Top Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                          {camp.clientCode}
                        </span>
                        <button
                          onClick={() => handleCopyCode(camp.clientCode)}
                          className="text-slate-400 hover:text-indigo-600 transition"
                          title="Copiar código de empresa"
                        >
                          {copiedCode === camp.clientCode ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            camp.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {camp.status === 'active' ? '● Activa' : '● Cerrada'}
                        </span>
                      </div>

                      <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                        {camp.companyName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{camp.description}</p>

                      {/* Assigned Survey Template Badge */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          Cuestionario:
                        </span>
                        <span className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200/70 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                          {camp.templateName || 'Plantilla de Liderazgo Ejecutivo'}
                          {camp.questions && (
                            <span className="text-[10px] text-indigo-600 font-mono font-normal">
                              ({camp.questions.length} preguntas)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelectedCampaignForExport(camp)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                        title="Exportar resultados consolidados a Excel o CSV"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Exportar CSV</span>
                      </button>

                      <button
                        onClick={() => setSelectedCampaignForShare(camp)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                        QR General
                      </button>

                      <button
                        onClick={() => onSwitchToCoordinator(camp.clientCode)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Ver como Coordinador
                      </button>

                      <button
                        onClick={() => handleToggleStatus(camp)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                          camp.status === 'active'
                            ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                        }`}
                      >
                        {camp.status === 'active' ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Cerrar Campaña
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            Reactivar
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Campaign Stats Mini-grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block">Evaluados Registrados:</span>
                      <span className="font-bold text-slate-800 text-sm">{campSubjects.length} personas</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Evaluaciones Recibidas:</span>
                      <span className="font-bold text-emerald-700 text-sm">{campResponses.length} cuestionarios</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Fecha de Creación:</span>
                      <span className="font-medium text-slate-700">
                        {new Date(camp.createdAt).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Fecha Límite:</span>
                      <span className="font-medium text-slate-700">
                        {camp.deadline || 'Sin fecha de corte'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Subject Report Links */}
                  {campSubjects.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        Reportes Individuales de esta Empresa:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {campSubjects.map((sub) => {
                          const count = campResponses.filter((r) => r.subjectId === sub.id).length;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => handleViewSubjectReport(sub, camp.companyName)}
                              className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 text-left transition flex items-center justify-between"
                            >
                              <div className="truncate mr-2">
                                <p className="text-xs font-bold text-slate-900 truncate">{sub.name}</p>
                                <p className="text-[11px] text-slate-500 truncate">{sub.role}</p>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                  count > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {count} evals
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* CREATE CAMPAIGN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                Crear Nueva Campaña / Empresa
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-indigo-200 hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Empresa o Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Grupo Financiero Altavista"
                  value={newCampaignData.companyName}
                  onChange={(e) =>
                    setNewCampaignData({ ...newCampaignData, companyName: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código de Cliente (Opcional - se genera automáticamente si está vacío)
                </label>
                <input
                  type="text"
                  placeholder="Ej. CORP-2026-X"
                  value={newCampaignData.clientCode}
                  onChange={(e) =>
                    setNewCampaignData({ ...newCampaignData, clientCode: e.target.value.toUpperCase() })
                  }
                  className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Este código único lo usarán los evaluadores y el coordinador para ingresar.
                </span>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cuestionario 360 a Asignar *
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.targetIndustry} • {tpl.questions.length} preguntas)
                    </option>
                  ))}
                </select>

                {templates.find((t) => t.id === selectedTemplateId) && (
                  <div className="mt-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-950">
                        {templates.find((t) => t.id === selectedTemplateId)?.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-full">
                        {templates.find((t) => t.id === selectedTemplateId)?.targetIndustry}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {templates.find((t) => t.id === selectedTemplateId)?.description}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {Array.from(
                        new Set(
                          templates
                            .find((t) => t.id === selectedTemplateId)
                            ?.questions.map((q) => q.category)
                        )
                      ).map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-0.5 bg-white text-indigo-700 border border-indigo-200/80 rounded-md text-[10px] font-semibold"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción u Objetivo de la Evaluación
                </label>
                <textarea
                  rows={2}
                  placeholder="Evaluación de competencias directivas para mandos medios..."
                  value={newCampaignData.description}
                  onChange={(e) =>
                    setNewCampaignData({ ...newCampaignData, description: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha Límite / Cierre (Opcional)
                </label>
                <input
                  type="date"
                  value={newCampaignData.deadline}
                  onChange={(e) =>
                    setNewCampaignData({ ...newCampaignData, deadline: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                >
                  Crear Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE QR MODAL */}
      {selectedCampaignForShare && (
        <ShareQrModal
          isOpen={!!selectedCampaignForShare}
          onClose={() => setSelectedCampaignForShare(null)}
          campaign={selectedCampaignForShare}
          onOpenEvaluationDirectly={() => onLaunchEvaluation(selectedCampaignForShare.clientCode)}
        />
      )}

      {/* SUBJECT REPORT MODAL */}
      {isReportModalOpen && (
        <SubjectReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          stats={activeReportStats}
          responses={activeReportResponses}
          companyName={activeReportCompany}
        />
      )}

      {/* EXPORT CSV / EXCEL MODAL */}
      {selectedCampaignForExport && (
        <ExportCsvModal
          isOpen={!!selectedCampaignForExport}
          onClose={() => setSelectedCampaignForExport(null)}
          campaign={selectedCampaignForExport}
          subjects={subjects.filter((s) => s.campaignId === selectedCampaignForExport.id)}
          responses={responses.filter((r) => r.campaignId === selectedCampaignForExport.id)}
        />
      )}
    </div>
  );
};
