import React from 'react';
import {
  X,
  Printer,
  TrendingUp,
  Award,
  Users,
  Target,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Download,
  Table,
  FileDown,
  Loader2,
} from 'lucide-react';
import { SubjectStats, EvaluationResponse, EVALUATOR_ROLES_INFO, EvaluatorRole, TemplateQuestion } from '../../types';
import { DEFAULT_COMPETENCIES } from '../../constants/competencies';
import { downloadElementAsPdf } from '../../utils/pdfGenerator';

interface SubjectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SubjectStats | null;
  responses: EvaluationResponse[];
  companyName: string;
  customQuestions?: TemplateQuestion[];
}

export const SubjectReportModal: React.FC<SubjectReportModalProps> = ({
  isOpen,
  onClose,
  stats,
  responses,
  companyName,
  customQuestions,
}) => {
  if (!isOpen || !stats) return null;

  const { subject, byRole, overallAverage, competencyAverages, roleAverages, gapAnalysis } = stats;

  const displayCompetencies = React.useMemo(() => {
    if (customQuestions && customQuestions.length > 0) {
      const cats = Array.from(new Set(customQuestions.map((q) => q.category)));
      return cats.map((cat) => ({
        id: cat,
        name: cat,
        description: `Competencia evaluada según la plantilla asignada.`,
      }));
    }

    const availableKeys = Object.keys(competencyAverages);
    if (availableKeys.length > 0 && !DEFAULT_COMPETENCIES.some((c) => c.id === availableKeys[0])) {
      return availableKeys.map((cat) => ({
        id: cat,
        name: cat,
        description: `Competencia evaluada.`,
      }));
    }

    return DEFAULT_COMPETENCIES.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
    }));
  }, [customQuestions, competencyAverages]);

  const getPerformanceBadge = (score: number) => {
    if (score >= 4.5) return { label: 'Sobresaliente', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (score >= 3.8) return { label: 'Destacado', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    if (score >= 3.0) return { label: 'Competente', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (score >= 2.0) return { label: 'En Desarrollo', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Requiere Plan de Acción', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const [isExportingPdf, setIsExportingPdf] = React.useState(false);
  const printableRef = React.useRef<HTMLDivElement>(null);

  const badge = getPerformanceBadge(overallAverage);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setIsExportingPdf(true);
    try {
      const safeName = subject.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_');
      await downloadElementAsPdf(printableRef.current, {
        filename: `Reporte_Individual_${safeName}.pdf`,
      });
    } catch (err) {
      console.error('Error generando PDF desde modal:', err);
      // Fallback a print
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 print:p-0 print:bg-white print:static print:block print:z-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Modal Top Bar (hidden during print) */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Reporte Ejecutivo de Evaluación 360°</h3>
              <p className="text-xs text-slate-300">{subject.name} • {companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Descargar reporte individual en PDF directamente"
              aria-label="Download Report"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 stroke-[2.5]" />
                  <span>Reporte PDF Individual</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printableRef} className="p-6 sm:p-8 overflow-y-auto space-y-8 print:p-0 print:space-y-6 print:overflow-visible bg-white">
          {/* Print-Only Official Branding Header */}
          <div className="hidden print:flex items-center justify-between pb-4 mb-2 border-b-2 border-slate-900 print-avoid-break">
            <div className="flex items-center gap-3">
              <img
                src="/comgico.png"
                alt="Comunicación Global"
                className="h-12 w-12 object-contain rounded-full border border-slate-300"
              />
              <div>
                <span className="font-black text-slate-900 text-base tracking-tight block">
                  Comunicación Global
                </span>
                <span className="text-xs text-slate-600 font-bold tracking-wider uppercase block">
                  Evaluaciones 360° • Reporte Oficial de Calificaciones
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest bg-slate-900 text-lime-400 px-2.5 py-1 rounded">
                DOCUMENTO OFICIAL CONFIDENCIAL
              </span>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                Fecha de Emisión: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Executive Header */}
          <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print-avoid-break">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                  Informe de Feedback 360°
                </span>
                <span className="text-xs text-slate-400">• Confidencial</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {subject.name}
              </h1>
              <p className="text-sm text-slate-600 font-medium">
                {subject.role} — <span className="text-slate-500">{subject.department}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Empresa: <strong className="text-slate-700">{companyName}</strong> • Evaluaciones recibidas: <strong className="text-slate-700">{stats.totalResponses}</strong>
              </p>
            </div>

            {/* Overall Score Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-2xl p-4 text-center sm:min-w-[190px] shadow-xs print-avoid-break">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Promedio General
              </span>
              <div className="flex items-baseline justify-center gap-1 my-1">
                <span className="text-4xl font-black text-indigo-700">
                  {overallAverage.toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
              </div>
              <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          </div>

          {/* Evaluator Participation Summary */}
          <div className="print-avoid-break">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Muestra de Evaluadores Participantes ({stats.totalResponses} en total)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['self', 'manager', 'peer', 'subordinate'] as EvaluatorRole[]).map((role) => {
                const info = EVALUATOR_ROLES_INFO[role];
                const count = byRole[role];
                return (
                  <div
                    key={role}
                    className={`p-3 rounded-xl border ${info.bg} flex items-center justify-between`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{info.label}</p>
                      <p className="text-[11px] text-slate-500">
                        {count === 1 ? '1 evaluación' : `${count} evaluaciones`}
                      </p>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-white font-bold text-sm flex items-center justify-center shadow-xs text-slate-700">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback Scores Summary Matrix Table */}
          <div className="print-avoid-break bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-lime-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Matriz Resumen de Puntuaciones de Feedback (Escala 1.0 a 5.0)
                </h3>
              </div>
              <span className="text-[10px] text-lime-400 font-mono font-bold">Consolidado 360°</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Competencia</th>
                    <th className="py-2.5 px-2 text-center text-indigo-700 bg-indigo-50/50">Auto</th>
                    <th className="py-2.5 px-2 text-center text-blue-700 bg-blue-50/50">Jefe</th>
                    <th className="py-2.5 px-2 text-center text-emerald-700 bg-emerald-50/50">Pares</th>
                    <th className="py-2.5 px-2 text-center text-purple-700 bg-purple-50/50">Colaboradores</th>
                    <th className="py-2.5 px-3 text-center bg-slate-200/80 font-black text-slate-900">Promedio 360°</th>
                    <th className="py-2.5 px-2 text-center">Nivel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayCompetencies.map((comp) => {
                    const avg = competencyAverages[comp.id] || 0;
                    const selfScore = roleAverages.self?.[comp.id];
                    const mgrScore = roleAverages.manager?.[comp.id];
                    const peerScore = roleAverages.peer?.[comp.id];
                    const subScore = roleAverages.subordinate?.[comp.id];
                    const compBadge = getPerformanceBadge(avg);

                    return (
                      <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {comp.name}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-indigo-700 font-semibold bg-indigo-50/20">
                          {selfScore !== undefined && selfScore > 0 ? selfScore.toFixed(2) : '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-blue-700 font-semibold bg-blue-50/20">
                          {mgrScore !== undefined && mgrScore > 0 ? mgrScore.toFixed(2) : '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-emerald-700 font-semibold bg-emerald-50/20">
                          {peerScore !== undefined && peerScore > 0 ? peerScore.toFixed(2) : '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-purple-700 font-semibold bg-purple-50/20">
                          {subScore !== undefined && subScore > 0 ? subScore.toFixed(2) : '—'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-black text-slate-900 bg-slate-100/60 text-sm">
                          {avg.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${compBadge.color}`}>
                            {compBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td className="py-2.5 px-3 text-slate-800">PROMEDIO TOTAL CONSOLIDADO</td>
                    <td className="py-2.5 px-2 text-center font-mono text-indigo-700">
                      {gapAnalysis.selfAverage > 0 ? gapAnalysis.selfAverage.toFixed(2) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-blue-700">
                      {(() => {
                        const mgrScores = Object.values(roleAverages.manager || {});
                        return mgrScores.length > 0 ? (mgrScores.reduce((a, b) => a + b, 0) / mgrScores.length).toFixed(2) : '—';
                      })()}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-emerald-700">
                      {(() => {
                        const peerScores = Object.values(roleAverages.peer || {});
                        return peerScores.length > 0 ? (peerScores.reduce((a, b) => a + b, 0) / peerScores.length).toFixed(2) : '—';
                      })()}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-purple-700">
                      {(() => {
                        const subScores = Object.values(roleAverages.subordinate || {});
                        return subScores.length > 0 ? (subScores.reduce((a, b) => a + b, 0) / subScores.length).toFixed(2) : '—';
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-sm text-indigo-700 bg-indigo-50/80">
                      {overallAverage.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Gap Analysis / Perceptual Gap */}
          {gapAnalysis.selfAverage > 0 && gapAnalysis.othersAverage > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 print-avoid-break">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Análisis de Brecha Perceptual (GAP: Autoevaluación vs Evaluadores Externos)
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="text-xs text-slate-500 block">Mi Autoevaluación</span>
                  <span className="text-2xl font-extrabold text-indigo-600">
                    {gapAnalysis.selfAverage.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="text-xs text-slate-500 block">Promedio de Otros (Jefe, Pares, Colab.)</span>
                  <span className="text-2xl font-extrabold text-slate-800">
                    {gapAnalysis.othersAverage.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="text-xs text-slate-500 block">Diferencia (Brecha)</span>
                  <span
                    className={`text-2xl font-extrabold ${
                      Math.abs(gapAnalysis.difference) <= 0.3
                        ? 'text-emerald-600'
                        : gapAnalysis.difference > 0
                        ? 'text-amber-600'
                        : 'text-indigo-600'
                    }`}
                  >
                    {gapAnalysis.difference > 0 ? `+${gapAnalysis.difference.toFixed(2)}` : gapAnalysis.difference.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-3 bg-white/70 p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                {Math.abs(gapAnalysis.difference) <= 0.3 ? (
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <strong>Excelente alineación:</strong> Tu autopercepción coincide casi exactamente con la perspectiva de tu entorno profesional.
                  </span>
                ) : gapAnalysis.difference > 0 ? (
                  <span className="flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <strong>Oportunidad de calibración:</strong> Te calificas {gapAnalysis.difference.toFixed(2)} puntos por encima de cómo te perciben tus evaluadores. Se recomienda profundizar en las áreas de oportunidad señaladas.
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-indigo-800">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <strong>Humildad / Subestimación:</strong> Tu entorno valora tus conductas {Math.abs(gapAnalysis.difference).toFixed(2)} puntos por encima de tu propia autoevaluación. ¡Confía más en tu liderazgo!
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Competencies Breakdown with Progress Bars */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2 print-avoid-break">
              <Target className="w-4 h-4 text-indigo-600" />
              Detalle Gráfico por Competencias (Escala 1 al 5)
            </h2>
            <div className="space-y-3">
              {displayCompetencies.map((comp) => {
                const avg = competencyAverages[comp.id] || 0;
                const percentage = Math.min(100, Math.round((avg / 5) * 100));

                return (
                  <div key={comp.id} className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 print-avoid-break">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{comp.name}</h3>
                        <p className="text-xs text-slate-500">{comp.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-base font-extrabold text-indigo-700">
                          {avg.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400">/ 5.0</span>
                      </div>
                    </div>

                    {/* Overall Bar */}
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-3">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Breakdown by role in pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                      <span className="text-slate-400 font-medium">Por rol:</span>
                      {(['self', 'manager', 'peer', 'subordinate'] as EvaluatorRole[]).map((role) => {
                        const roleScore = roleAverages[role]?.[comp.id];
                        if (roleScore === undefined || roleScore === 0) return null;
                        const roleInfo = EVALUATOR_ROLES_INFO[role];
                        return (
                          <span
                            key={role}
                            className={`px-2 py-0.5 rounded-md border font-medium ${roleInfo.bg}`}
                          >
                            {roleInfo.label}: <strong>{roleScore.toFixed(2)}</strong>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Qualitative Open Comments */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2 print-avoid-break">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Retroalimentación Cualitativa y Comentarios Abiertos ({responses.length} aportes)
            </h2>

            <div className="space-y-3">
              {responses.map((resp, idx) => {
                const roleInfo = EVALUATOR_ROLES_INFO[resp.evaluatorRole];
                return (
                  <div
                    key={resp.id || idx}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3 print-avoid-break"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${roleInfo.bg} ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                        {resp.evaluatorName && (
                          <span className="text-xs font-semibold text-slate-700">
                            ({resp.evaluatorName})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(resp.timestamp).toLocaleDateString('es-ES')}
                      </span>
                    </div>

                    {/* Strengths */}
                    {resp.comments.strengths && (
                      <div className="text-xs">
                        <span className="font-bold text-emerald-800 block mb-0.5">
                          💪 Fortalezas Principales:
                        </span>
                        <p className="text-slate-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/80 leading-relaxed italic">
                          "{resp.comments.strengths}"
                        </p>
                      </div>
                    )}

                    {/* Improvements */}
                    {resp.comments.improvements && (
                      <div className="text-xs">
                        <span className="font-bold text-amber-800 block mb-0.5">
                          🎯 Oportunidades de Mejora:
                        </span>
                        <p className="text-slate-700 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/80 leading-relaxed italic">
                          "{resp.comments.improvements}"
                        </p>
                      </div>
                    )}

                    {/* Recommendations */}
                    {resp.comments.recommendations && (
                      <div className="text-xs">
                        <span className="font-bold text-indigo-800 block mb-0.5">
                          💡 Recomendaciones de Desarrollo:
                        </span>
                        <p className="text-slate-700 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/80 leading-relaxed italic">
                          "{resp.comments.recommendations}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {responses.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 print-avoid-break">
                  <p className="text-xs text-slate-500">
                    Aún no se han recibido comentarios para este colaborador.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer for formal document print */}
          <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400 print-avoid-break">
            <p className="font-medium text-slate-600">
              Comunicación Global • Plataforma de Evaluaciones 360°
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Informe emitido con fines de retroalimentación constructiva, planes de carrera y desarrollo profesional continuo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
