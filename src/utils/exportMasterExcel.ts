import * as XLSX from 'xlsx';
import { Campaign, EvaluatedSubject, EvaluationResponse, EvaluatorRole, EVALUATOR_ROLES_INFO } from '../types';
import { DEFAULT_COMPETENCIES } from '../constants/competencies';
import { calculateSubjectStats } from '../services/dataService';

/**
 * Computes average score for a specific evaluator role across all questions answered by that role
 */
function getRoleOverallAverage(role: EvaluatorRole, responses: EvaluationResponse[]): number | null {
  const roleResponses = responses.filter((r) => r.evaluatorRole === role);
  if (roleResponses.length === 0) return null;
  let sum = 0;
  let count = 0;
  roleResponses.forEach((r) => {
    Object.values(r.scores).forEach((val) => {
      if (typeof val === 'number') {
        sum += val;
        count++;
      }
    });
  });
  return count > 0 ? Number((sum / count).toFixed(2)) : null;
}

/**
 * Consolidates all open qualitative comments for a subject into an organized text block
 */
function getConsolidatedComments(responses: EvaluationResponse[]): string {
  const sections: string[] = [];

  const strengths = responses
    .map((r) => r.comments?.strengths?.trim())
    .filter(Boolean);
  if (strengths.length > 0) {
    sections.push(`💪 FORTALEZAS PRINCIPALES:\n${strengths.map((s) => `• ${s}`).join('\n')}`);
  }

  const improvements = responses
    .map((r) => r.comments?.improvements?.trim())
    .filter(Boolean);
  if (improvements.length > 0) {
    sections.push(`🎯 OPORTUNIDADES DE MEJORA:\n${improvements.map((i) => `• ${i}`).join('\n')}`);
  }

  const recommendations = responses
    .map((r) => r.comments?.recommendations?.trim())
    .filter(Boolean);
  if (recommendations.length > 0) {
    sections.push(`💡 RECOMENDACIONES DE DESARROLLO:\n${recommendations.map((rc) => `• ${rc}`).join('\n')}`);
  }

  return sections.length > 0 ? sections.join('\n\n') : 'Sin comentarios registrados.';
}

/**
 * Generates and downloads the Super Master Results Excel (.xlsx) file
 * with Sheet 1 (Resumen Ejecutivo 360) and Sheet 2 (Detalle de Respuestas)
 */
export function exportMasterExcelReport(
  campaign: Campaign,
  subjects: EvaluatedSubject[],
  responses: EvaluationResponse[]
): string {
  // Extract categories evaluated in this campaign
  const categories: string[] =
    campaign.questions && campaign.questions.length > 0
      ? Array.from(new Set(campaign.questions.map((q) => q.category)))
      : DEFAULT_COMPETENCIES.map((c) => c.name);

  // Map category question IDs for single-response score calculations
  const categoryQuestionMap = new Map<string, string[]>();
  if (campaign.questions && campaign.questions.length > 0) {
    campaign.questions.forEach((q) => {
      const cat = q.category || 'General';
      if (!categoryQuestionMap.has(cat)) categoryQuestionMap.set(cat, []);
      categoryQuestionMap.get(cat)!.push(q.id);
    });
  } else {
    DEFAULT_COMPETENCIES.forEach((c) => {
      categoryQuestionMap.set(c.name, c.questions.map((q) => q.id));
    });
  }

  // --------------------------------------------------------------------------
  // HOJA 1: RESUMEN EJECUTIVO 360
  // --------------------------------------------------------------------------
  const sheet1Headers = [
    'ID Empleado / Folio',
    'Nombre Completo del Colaborador',
    'Puesto / Cargo',
    'Departamento / Área',
    'Total de Evaluaciones Recibidas',
    'Autoevaluación (Promedio General 1-5)',
    'Jefe Directo (Promedio General 1-5)',
    'Pares / Colegas (Promedio General 1-5)',
    'Colaboradores a Cargo (Promedio General 1-5)',
    'Promedio Global 360° (Calificación Final)',
    'Nivel de Desempeño',
    // One column per evaluated competency
    ...categories.map((cat) => `Promedio: ${cat}`),
    'Brecha Perceptual (GAP: Auto vs Otros)',
    'Diagnóstico de Alineación',
    'Comentarios Cualitativos Recopilados',
  ];

  const sheet1Rows: (string | number)[][] = [];

  subjects.forEach((sub) => {
    const subResponses = responses.filter((r) => r.subjectId === sub.id);
    const stats = calculateSubjectStats(sub, subResponses, campaign.questions);

    const selfAvg = getRoleOverallAverage('self', subResponses);
    const mgrAvg = getRoleOverallAverage('manager', subResponses);
    const peerAvg = getRoleOverallAverage('peer', subResponses);
    const subAvg = getRoleOverallAverage('subordinate', subResponses);

    let performanceLabel = 'Sin evaluaciones';
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
        gapDiagnosis = 'Excelente alineación perceptual';
      } else if (stats.gapAnalysis.difference > 0) {
        gapDiagnosis = `Sobreestimación (+${stats.gapAnalysis.difference.toFixed(2)} pts sobre evaluadores)`;
      } else {
        gapDiagnosis = `Subestimación (${stats.gapAnalysis.difference.toFixed(2)} pts bajo evaluadores)`;
      }
    }

    const consolidatedComments = getConsolidatedComments(subResponses);

    const row: (string | number)[] = [
      sub.id,
      sub.name,
      sub.role,
      sub.department,
      subResponses.length,
      selfAvg !== null ? selfAvg : '—',
      mgrAvg !== null ? mgrAvg : '—',
      peerAvg !== null ? peerAvg : '—',
      subAvg !== null ? subAvg : '—',
      subResponses.length > 0 ? stats.overallAverage : '—',
      performanceLabel,
      // Desglose por Competencias
      ...categories.map((cat) => {
        const val = stats.competencyAverages[cat];
        return val !== undefined && val > 0 ? val : '—';
      }),
      stats.gapAnalysis.selfAverage > 0 && stats.gapAnalysis.othersAverage > 0
        ? stats.gapAnalysis.difference > 0
          ? `+${stats.gapAnalysis.difference.toFixed(2)}`
          : stats.gapAnalysis.difference.toFixed(2)
        : '—',
      gapDiagnosis,
      consolidatedComments,
    ];

    sheet1Rows.push(row);
  });

  const ws1 = XLSX.utils.aoa_to_sheet([sheet1Headers, ...sheet1Rows]);

  // Set explicit column widths for readability in Excel
  ws1['!cols'] = [
    { wch: 22 }, // ID Empleado
    { wch: 30 }, // Nombre
    { wch: 28 }, // Puesto
    { wch: 24 }, // Departamento
    { wch: 18 }, // Total Recibidas
    { wch: 22 }, // Auto
    { wch: 22 }, // Jefe
    { wch: 22 }, // Pares
    { wch: 24 }, // Colaboradores
    { wch: 24 }, // Promedio Global
    { wch: 22 }, // Nivel Desempeño
    ...categories.map(() => ({ wch: 24 })), // Competencias
    { wch: 20 }, // GAP
    { wch: 32 }, // Diagnostico
    { wch: 60 }, // Comentarios
  ];

  // --------------------------------------------------------------------------
  // HOJA 2: DETALLE DE RESPUESTAS (REGISTRO FILA POR FILA)
  // --------------------------------------------------------------------------
  const sheet2Headers = [
    'ID Respuesta',
    'Fecha y Hora de Envío',
    'ID Colaborador Evaluado',
    'Nombre del Colaborador Evaluado',
    'Puesto / Cargo',
    'Departamento',
    'Rol del Evaluador',
    'Evaluador (Nombre o Anónimo)',
    'Promedio Individual de la Encuesta',
    // One column per competency for this specific response
    ...categories.map((cat) => `Puntuación: ${cat}`),
    'Fortalezas Principales (Cualitativo)',
    'Oportunidades de Mejora (Cualitativo)',
    'Recomendaciones de Desarrollo (Cualitativo)',
  ];

  const sheet2Rows: (string | number)[][] = [];

  responses.forEach((resp) => {
    const sub = subjects.find((s) => s.id === resp.subjectId);
    const subName = sub ? sub.name : 'Colaborador no especificado';
    const subRole = sub ? sub.role : '—';
    const subDept = sub ? sub.department : '—';
    const roleInfo = EVALUATOR_ROLES_INFO[resp.evaluatorRole];

    // Compute average for this individual response
    let respSum = 0;
    let respCount = 0;
    Object.values(resp.scores).forEach((val) => {
      if (typeof val === 'number') {
        respSum += val;
        respCount++;
      }
    });
    const respAvg = respCount > 0 ? Number((respSum / respCount).toFixed(2)) : '—';

    // Competency scores for this specific response
    const compScores = categories.map((catName) => {
      const qIds = categoryQuestionMap.get(catName) || [];
      let cSum = 0;
      let cCount = 0;
      qIds.forEach((qid) => {
        if (typeof resp.scores[qid] === 'number') {
          cSum += resp.scores[qid];
          cCount++;
        }
      });
      return cCount > 0 ? Number((cSum / cCount).toFixed(2)) : '—';
    });

    const row: (string | number)[] = [
      resp.id,
      new Date(resp.timestamp).toLocaleString('es-ES'),
      resp.subjectId,
      subName,
      subRole,
      subDept,
      roleInfo?.label || resp.evaluatorRole,
      resp.evaluatorName || 'Anónimo Confidencial',
      respAvg,
      ...compScores,
      resp.comments?.strengths || 'Sin comentarios',
      resp.comments?.improvements || 'Sin comentarios',
      resp.comments?.recommendations || 'Sin comentarios',
    ];

    sheet2Rows.push(row);
  });

  const ws2 = XLSX.utils.aoa_to_sheet([sheet2Headers, ...sheet2Rows]);

  ws2['!cols'] = [
    { wch: 22 }, // ID Respuesta
    { wch: 22 }, // Fecha y Hora
    { wch: 22 }, // ID Colaborador
    { wch: 30 }, // Nombre Colaborador
    { wch: 26 }, // Cargo
    { wch: 24 }, // Departamento
    { wch: 24 }, // Rol Evaluador
    { wch: 26 }, // Evaluador
    { wch: 22 }, // Promedio Encuesta
    ...categories.map(() => ({ wch: 22 })), // Competencias
    { wch: 40 }, // Fortalezas
    { wch: 40 }, // Mejoras
    { wch: 40 }, // Recomendaciones
  ];

  // --------------------------------------------------------------------------
  // WORKBOOK GENERATION & DOWNLOAD
  // --------------------------------------------------------------------------
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Ejecutivo 360');
  XLSX.utils.book_append_sheet(wb, ws2, 'Detalle de Respuestas');

  const cleanCompanyName = (campaign.companyName || 'Empresa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Reporte_Maestro_360_${cleanCompanyName}_${todayStr}.xlsx`;

  XLSX.writeFile(wb, filename);

  return filename;
}
