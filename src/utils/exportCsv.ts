import { Campaign, EvaluatedSubject, EvaluationResponse, EVALUATOR_ROLES_INFO } from '../types';
import { DEFAULT_COMPETENCIES } from '../constants/competencies';
import { calculateSubjectStats } from '../services/dataService';

// Helper to escape CSV field
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  // Escape inner double quotes
  str = str.replace(/"/g, '""');
  // If string contains comma, quote, or newline, wrap in quotes
  return `"${str}"`;
}

/**
 * Export Consolidated Subject Summary to CSV
 */
export function exportCampaignSummaryCsv(
  campaign: Campaign,
  subjects: EvaluatedSubject[],
  responses: EvaluationResponse[]
) {
  const categories =
    campaign.questions && campaign.questions.length > 0
      ? Array.from(new Set(campaign.questions.map((q) => q.category)))
      : DEFAULT_COMPETENCIES.map((c) => c.name);

  const headers = [
    'ID Colaborador',
    'Nombre',
    'Cargo',
    'Departamento',
    'Email',
    'Empresa',
    'Código Empresa',
    'Plantilla Asignada',
    'Meta Evaluadores',
    'Total Recibidas',
    '% Cumplimiento Meta',
    'Autoevaluación (Cant)',
    'Jefe Directo (Cant)',
    'Pares (Cant)',
    'Colaboradores a Cargo (Cant)',
    'Promedio General (1-5)',
    'Nivel Desempeño',
    // Competency averages
    ...categories.map((cat) => `Promedio: ${cat}`),
    'Promedio Autoevaluación',
    'Promedio Evaluadores Externos',
    'Brecha Perceptual (GAP)',
    'Diagnóstico Brecha',
  ];

  const rows: string[][] = [];

  subjects.forEach((sub) => {
    const subResponses = responses.filter((r) => r.subjectId === sub.id);
    const stats = calculateSubjectStats(sub, subResponses, campaign.questions);

    const target = sub.targetEvaluators || 5;
    const completionPct = Math.round((subResponses.length / target) * 100);

    let performanceLabel = 'Sin evaluar';
    if (subResponses.length > 0) {
      if (stats.overallAverage >= 4.5) performanceLabel = 'Sobresaliente';
      else if (stats.overallAverage >= 3.8) performanceLabel = 'Destacado';
      else if (stats.overallAverage >= 3.0) performanceLabel = 'Competente';
      else if (stats.overallAverage >= 2.0) performanceLabel = 'En Desarrollo';
      else performanceLabel = 'Requiere Plan de Acción';
    }

    let gapDiagnosis = 'Sin datos suficientes';
    if (stats.gapAnalysis.selfAverage > 0 && stats.gapAnalysis.othersAverage > 0) {
      if (Math.abs(stats.gapAnalysis.difference) <= 0.3) {
        gapDiagnosis = 'Alta alineación perceptual';
      } else if (stats.gapAnalysis.difference > 0) {
        gapDiagnosis = 'Sobreestimación (Se califica más alto que sus evaluadores)';
      } else {
        gapDiagnosis = 'Subestimación (Su entorno lo valora más alto)';
      }
    }

    const row = [
      sub.id,
      sub.name,
      sub.role,
      sub.department,
      sub.email || '',
      campaign.companyName,
      campaign.clientCode,
      campaign.templateName || 'Plantilla Estándar',
      target,
      subResponses.length,
      `${completionPct}%`,
      stats.byRole.self || 0,
      stats.byRole.manager || 0,
      stats.byRole.peer || 0,
      stats.byRole.subordinate || 0,
      stats.overallAverage.toFixed(2),
      performanceLabel,
      // Competencies
      ...categories.map((cat) =>
        (stats.competencyAverages[cat] || 0).toFixed(2)
      ),
      stats.gapAnalysis.selfAverage.toFixed(2),
      stats.gapAnalysis.othersAverage.toFixed(2),
      stats.gapAnalysis.difference > 0
        ? `+${stats.gapAnalysis.difference.toFixed(2)}`
        : stats.gapAnalysis.difference.toFixed(2),
      gapDiagnosis,
    ];

    rows.push(row.map(escapeCsv));
  });

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel compatibility
    [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  downloadBlob(
    csvContent,
    `Resumen_Consolidado_360_${campaign.companyName.replace(/\s+/g, '_')}_${campaign.clientCode}.csv`
  );
}

/**
 * Export Detailed Responses and Qualitative Feedback to CSV
 */
export function exportCampaignDetailedResponsesCsv(
  campaign: Campaign,
  subjects: EvaluatedSubject[],
  responses: EvaluationResponse[]
) {
  const headers = [
    'ID Respuesta',
    'Fecha de Envío',
    'Empresa',
    'Código Empresa',
    'ID Colaborador',
    'Nombre Colaborador',
    'Cargo',
    'Departamento',
    'Rol del Evaluador',
    'Nombre Evaluador / Anónimo',
    ...DEFAULT_COMPETENCIES.map((c) => `Promedio: ${c.name}`),
    'Fortalezas Principales (Comentario)',
    'Áreas de Mejora (Comentario)',
    'Recomendaciones de Desarrollo (Comentario)',
  ];

  const rows: string[][] = [];

  responses.forEach((resp) => {
    const sub = subjects.find((s) => s.id === resp.subjectId);
    const subName = sub ? sub.name : 'Colaborador desconocido';
    const subRole = sub ? sub.role : '';
    const subDept = sub ? sub.department : '';
    const roleInfo = EVALUATOR_ROLES_INFO[resp.evaluatorRole];

    // Compute competency averages for this response
    const compAverages = DEFAULT_COMPETENCIES.map((comp) => {
      let sum = 0;
      let count = 0;
      comp.questions.forEach((q) => {
        if (resp.scores[q.id] !== undefined) {
          sum += resp.scores[q.id];
          count++;
        }
      });
      return count > 0 ? (sum / count).toFixed(2) : 'N/A';
    });

    const row = [
      resp.id,
      new Date(resp.timestamp).toLocaleString('es-ES'),
      campaign.companyName,
      campaign.clientCode,
      resp.subjectId,
      subName,
      subRole,
      subDept,
      roleInfo?.label || resp.evaluatorRole,
      resp.evaluatorName || 'Anónimo Confidencial',
      ...compAverages,
      resp.comments.strengths || '',
      resp.comments.improvements || '',
      resp.comments.recommendations || '',
    ];

    rows.push(row.map(escapeCsv));
  });

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  downloadBlob(
    csvContent,
    `Respuestas_Detalladas_360_${campaign.companyName.replace(/\s+/g, '_')}_${campaign.clientCode}.csv`
  );
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
