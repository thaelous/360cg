import XLSX from 'xlsx-js-style';
import { Campaign, EvaluatedSubject, EvaluationResponse, EvaluatorRole, EVALUATOR_ROLES_INFO } from '../types';
import { getComprehensiveQuestionCatalog, resolveQuestionMeta } from './questionCatalog';
import { getCampaignValidityInfo } from './campaignValidity';

/**
 * Generates an ASCII/Unicode progress bar representation for scores 0.0 to 5.0
 * Example: 4.80 -> "█████ (4.80)", 3.80 -> "████░ (3.80)"
 */
function makeScoreProgressBar(score: number | null, max: number = 5): string {
  if (score === null || isNaN(score)) return '—';
  const clamped = Math.max(0, Math.min(max, score));
  const fullBlocks = Math.round((clamped / max) * 10);
  const emptyBlocks = 10 - fullBlocks;
  const bar = '█'.repeat(fullBlocks) + '░'.repeat(emptyBlocks);
  return `${bar} ${score.toFixed(2)}`;
}

/**
 * Generates an ASCII/Unicode progress bar for percentage 0-100%
 * Example: 80% -> "████████░░ 80%"
 */
function makePercentProgressBar(pct: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const fullBlocks = Math.round(clamped / 10);
  const emptyBlocks = 10 - fullBlocks;
  const bar = '█'.repeat(fullBlocks) + '░'.repeat(emptyBlocks);
  return `${bar} ${clamped}%`;
}

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

// ============================================================================
// STYLES PALETTE (CORPORATE EXECUTIVE 360°)
// ============================================================================
const BORDER_LIGHT_GRAY = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const STYLE_TITLE_ROW = {
  fill: { fgColor: { rgb: '0F172A' } },
  font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { vertical: 'center', horizontal: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: '0F172A' } },
    bottom: { style: 'medium', color: { rgb: '0F172A' } },
    left: { style: 'thin', color: { rgb: '0F172A' } },
    right: { style: 'thin', color: { rgb: '0F172A' } },
  },
};

const STYLE_SUBTITLE_ROW = {
  fill: { fgColor: { rgb: 'F1F5F9' } },
  font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '334155' } },
  alignment: { vertical: 'center', horizontal: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'E2E8F0' } },
    right: { style: 'thin', color: { rgb: 'E2E8F0' } },
  },
};

const STYLE_SECTION_HEADER = {
  fill: { fgColor: { rgb: '1E293B' } },
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
  border: {
    top: { style: 'medium', color: { rgb: '0F172A' } },
    bottom: { style: 'medium', color: { rgb: '0F172A' } },
    left: { style: 'thin', color: { rgb: '1E293B' } },
    right: { style: 'thin', color: { rgb: '1E293B' } },
  },
};

const STYLE_COL_HEADER_BLUE = {
  fill: { fgColor: { rgb: '2563EB' } },
  font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: '1D4ED8' } },
    bottom: { style: 'medium', color: { rgb: '1E40AF' } },
    left: { style: 'thin', color: { rgb: '3B82F6' } },
    right: { style: 'thin', color: { rgb: '3B82F6' } },
  },
};

const STYLE_COL_HEADER_DARK = {
  fill: { fgColor: { rgb: '1E293B' } },
  font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: '0F172A' } },
    bottom: { style: 'medium', color: { rgb: '0F172A' } },
    left: { style: 'thin', color: { rgb: '334155' } },
    right: { style: 'thin', color: { rgb: '334155' } },
  },
};

const STYLE_DATA_EVEN: any = {
  fill: { fgColor: { rgb: 'FFFFFF' } },
  font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' }, bold: false, italic: false },
  alignment: { vertical: 'center', horizontal: 'left' },
  border: BORDER_LIGHT_GRAY,
};

const STYLE_DATA_ODD: any = {
  fill: { fgColor: { rgb: 'F8FAFC' } },
  font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' }, bold: false, italic: false },
  alignment: { vertical: 'center', horizontal: 'left' },
  border: BORDER_LIGHT_GRAY,
};

const STYLE_HIGHLIGHT_GREEN = {
  fill: { fgColor: { rgb: 'DCFCE7' } },
  font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '166534' } },
  alignment: { vertical: 'center', horizontal: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: '86EFAC' } },
    bottom: { style: 'thin', color: { rgb: '86EFAC' } },
    left: { style: 'thin', color: { rgb: '86EFAC' } },
    right: { style: 'thin', color: { rgb: '86EFAC' } },
  },
};

const STYLE_HIGHLIGHT_BLUE = {
  fill: { fgColor: { rgb: 'DBEAFE' } },
  font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '1E40AF' } },
  alignment: { vertical: 'center', horizontal: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: '93C5FD' } },
    bottom: { style: 'thin', color: { rgb: '93C5FD' } },
    left: { style: 'thin', color: { rgb: '93C5FD' } },
    right: { style: 'thin', color: { rgb: '93C5FD' } },
  },
};

const STYLE_HIGHLIGHT_AMBER = {
  fill: { fgColor: { rgb: 'FEF3C7' } },
  font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '92400E' } },
  alignment: { vertical: 'center', horizontal: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'FCD34D' } },
    bottom: { style: 'thin', color: { rgb: 'FCD34D' } },
    left: { style: 'thin', color: { rgb: 'FCD34D' } },
    right: { style: 'thin', color: { rgb: 'FCD34D' } },
  },
};

/**
 * Creates and formats a cell in the worksheet
 */
function setStyledCell(
  ws: any,
  row: number,
  col: number,
  value: any,
  style: any,
  numFmt?: string
) {
  const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
  let t = 's';
  let val = value;

  if (typeof value === 'number') {
    t = 'n';
  } else if (value === null || value === undefined) {
    val = '';
  }

  const cell: any = { t, v: val, s: style };
  if (numFmt) {
    cell.z = numFmt;
  }
  ws[cellRef] = cell;
}

/**
 * Creates a merged banner row with seamless background styling
 */
function createMergedBanner(
  ws: any,
  row: number,
  startCol: number,
  endCol: number,
  text: string,
  style: any,
  mergesList: any[]
) {
  setStyledCell(ws, row, startCol, text, style);
  for (let c = startCol + 1; c <= endCol; c++) {
    setStyledCell(ws, row, c, '', style);
  }
  mergesList.push({ s: { r: row, c: startCol }, e: { r: row, c: endCol } });
}

/**
 * Dynamic loader helper for xlsx-js-style with CDN fallback
 */
async function getXlsxLibrary(): Promise<any> {
  if (XLSX && typeof (XLSX as any).writeFile === 'function') {
    return XLSX;
  }
  if (typeof window !== 'undefined' && (window as any).XLSX) {
    return (window as any).XLSX;
  }

  if (typeof window !== 'undefined') {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-lib="xlsx-js-style"]');
      if (existing) {
        existing.addEventListener('load', () => resolve((window as any).XLSX));
        existing.addEventListener('error', () => reject(new Error('Failed to load xlsx-js-style')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
      script.async = true;
      script.setAttribute('data-lib', 'xlsx-js-style');
      script.onload = () => resolve((window as any).XLSX || XLSX);
      script.onerror = () => resolve(XLSX);
      document.head.appendChild(script);
    });
  }

  return XLSX;
}

/**
 * Generates and downloads the Professional Master Excel Report (.xlsx) using xlsx-js-style
 * with 3 styled sheets:
 * - Hoja 1: "Resumen Ejecutivo"
 * - Hoja 2: "Consolidado de Colaboradores"
 * - Hoja 3: "Detalle de Respuestas"
 */
export async function exportMasterExcelReport(
  campaign: Campaign,
  subjects: EvaluatedSubject[],
  responses: EvaluationResponse[]
): Promise<string> {
  const xlsxLib = await getXlsxLibrary();
  const catalog = getComprehensiveQuestionCatalog(campaign.questions);
  const validity = getCampaignValidityInfo(campaign);
  const emissionDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // 1. DATA PREPARATION: ORGANIZATIONAL METRICS
  const totalSubjects = subjects.length;
  const totalResponses = responses.length;
  const totalTarget = subjects.reduce((acc, s) => acc + (s.targetEvaluators || 5), 0);
  const participationRate = totalTarget > 0 ? (totalResponses / totalTarget) : 0;
  const participationPercent = Math.min(100, Math.round(participationRate * 100));

  let grandSum = 0;
  let grandCount = 0;
  responses.forEach((r) => {
    Object.values(r.scores).forEach((val) => {
      if (typeof val === 'number') {
        grandSum += val;
        grandCount++;
      }
    });
  });
  const organizationAverage = grandCount > 0 ? Number((grandSum / grandCount).toFixed(2)) : 0;

  const orgLevelLabel = (() => {
    if (organizationAverage >= 4.5) return 'Sobresaliente / Excelente (≥ 4.50)';
    if (organizationAverage >= 3.8) return 'Competente / Alineado (3.80 - 4.49)';
    if (organizationAverage >= 3.0) return 'En Desarrollo / Oportunidad (3.00 - 3.79)';
    return 'Requiere Atención Prioritaria (< 3.00)';
  })();

  // 2. DEPARTMENT STATS
  const deptMap = new Map<string, { sum: number; count: number; subjectsCount: number }>();
  subjects.forEach((s) => {
    const dept = s.department?.trim() || 'General';
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { sum: 0, count: 0, subjectsCount: 0 });
    }
    deptMap.get(dept)!.subjectsCount++;
  });

  responses.forEach((r) => {
    const sub = subjects.find((s) => s.id === r.subjectId);
    const dept = sub?.department?.trim() || 'General';
    const entry = deptMap.get(dept);
    if (entry) {
      Object.values(r.scores).forEach((val) => {
        if (typeof val === 'number') {
          entry.sum += val;
          entry.count++;
        }
      });
    }
  });

  const departmentList: Array<{
    name: string;
    subjectsCount: number;
    responsesCount: number;
    average: number;
    hasResponses: boolean;
  }> = [];

  deptMap.forEach((val, dept) => {
    const hasResponses = val.count > 0;
    departmentList.push({
      name: dept,
      subjectsCount: val.subjectsCount,
      responsesCount: val.count,
      average: hasResponses ? Number((val.sum / val.count).toFixed(2)) : 0,
      hasResponses,
    });
  });
  departmentList.sort((a, b) => {
    if (a.hasResponses && !b.hasResponses) return -1;
    if (!a.hasResponses && b.hasResponses) return 1;
    return b.average - a.average;
  });

  // 3. COMPETENCY MATRIX STATS
  const catsMap = new Map<string, { sum: number; count: number }>();
  responses.forEach((r) => {
    Object.entries(r.scores).forEach(([qId, val]) => {
      if (typeof val === 'number') {
        const meta = resolveQuestionMeta(qId, catalog);
        if (!catsMap.has(meta.category)) {
          catsMap.set(meta.category, { sum: 0, count: 0 });
        }
        const entry = catsMap.get(meta.category)!;
        entry.sum += val;
        entry.count++;
      }
    });
  });

  const competencyList: Array<{ category: string; average: number; count: number }> = [];
  catsMap.forEach((val, cat) => {
    competencyList.push({
      category: cat,
      average: val.count > 0 ? Number((val.sum / val.count).toFixed(2)) : 0,
      count: val.count,
    });
  });
  competencyList.sort((a, b) => b.average - a.average);

  const allCategories = competencyList.length > 0
    ? competencyList.map((c) => c.category)
    : ['Liderazgo e Influencia', 'Comunicación Asertiva', 'Trabajo en Equipo', 'Resolución de Problemas', 'Adaptabilidad'];

  // ==========================================================================
  // HOJA 1: RESUMEN EJECUTIVO (DISEÑO CORPORATIVO DIRECTIVO)
  // ==========================================================================
  const ws1: any = {};
  const ws1Merges: any[] = [];
  const ws1RowsInfo: any[] = [];
  let r1 = 0;

  // Fila 1: Título Principal
  createMergedBanner(
    ws1,
    r1,
    0,
    4,
    'PROGRAMA DE EVALUACIÓN 360° - REPORTE EJECUTIVO',
    STYLE_TITLE_ROW,
    ws1Merges
  );
  ws1RowsInfo[r1] = { hpt: 32 };
  r1++;

  // Fila 2: Subtítulo
  createMergedBanner(
    ws1,
    r1,
    0,
    4,
    `Empresa: ${campaign.companyName.toUpperCase()} | Código: ${campaign.clientCode} | Emisión: ${emissionDate}`,
    STYLE_SUBTITLE_ROW,
    ws1Merges
  );
  ws1RowsInfo[r1] = { hpt: 22 };
  r1++;

  // Fila 3: Espacio en blanco
  ws1RowsInfo[r1] = { hpt: 10 };
  r1++;

  // Sección 1: Ficha Técnica
  createMergedBanner(
    ws1,
    r1,
    0,
    4,
    '1. FICHA TÉCNICA Y PARÁMETROS DEL PROGRAMA',
    STYLE_SECTION_HEADER,
    ws1Merges
  );
  ws1RowsInfo[r1] = { hpt: 24 };
  r1++;

  // Encabezados Sección 1
  const s1Headers1 = ['Parámetro', 'Valor Registrado', 'Descripción y Referencia', '', ''];
  ['Parámetro', 'Valor Registrado', 'Descripción y Referencia'].forEach((txt, cIdx) => {
    setStyledCell(ws1, r1, cIdx, txt, STYLE_COL_HEADER_BLUE);
  });
  ws1Merges.push({ s: { r: r1, c: 2 }, e: { r: r1, c: 4 } });
  setStyledCell(ws1, r1, 3, '', STYLE_COL_HEADER_BLUE);
  setStyledCell(ws1, r1, 4, '', STYLE_COL_HEADER_BLUE);
  ws1RowsInfo[r1] = { hpt: 22 };
  r1++;

  const technicalParams = [
    ['Empresa Contratante', campaign.companyName, 'Razón social del cliente evaluado'],
    ['Código de Campaña', campaign.clientCode, 'Identificador corporativo único'],
    ['Instrumento de Evaluación', campaign.templateName || 'Diagnóstico Organizacional 360°', 'Modelo de competencias aplicado'],
    ['Estado de Campaña', validity.statusBadge.label, 'Estatus operativo en plataforma'],
    ['Fecha de Emisión', emissionDate, 'Fecha de corte oficial del reporte'],
    ['Fecha de Inicio', campaign.startedAt ? new Date(campaign.startedAt).toLocaleDateString('es-ES') : 'En espera de primera respuesta', 'Activación del cuestionario'],
    [
      'Fecha Límite / Cierre',
      campaign.expiresAt
        ? new Date(campaign.expiresAt).toLocaleDateString('es-ES')
        : campaign.deadline || (campaign.durationDays ? `${campaign.durationDays} días al iniciar` : 'Sin fecha fija'),
      'Periodo de vigencia contractual',
    ],
  ];

  technicalParams.forEach((item, idx) => {
    const styleRow = idx % 2 === 0 ? STYLE_DATA_EVEN : STYLE_DATA_ODD;
    setStyledCell(ws1, r1, 0, item[0], styleRow);
    setStyledCell(ws1, r1, 1, item[1], { ...styleRow, font: { ...styleRow.font, bold: true } });
    setStyledCell(ws1, r1, 2, item[2], styleRow);
    setStyledCell(ws1, r1, 3, '', styleRow);
    setStyledCell(ws1, r1, 4, '', styleRow);
    ws1Merges.push({ s: { r: r1, c: 2 }, e: { r: r1, c: 4 } });
    ws1RowsInfo[r1] = { hpt: 20 };
    r1++;
  });

  // Espacio
  ws1RowsInfo[r1] = { hpt: 12 };
  r1++;

  // Sección 2: Indicadores Globales
  createMergedBanner(
    ws1,
    r1,
    0,
    4,
    '2. INDICADORES GLOBALES DE PARTICIPACIÓN Y DESEMPEÑO',
    STYLE_SECTION_HEADER,
    ws1Merges
  );
  ws1RowsInfo[r1] = { hpt: 24 };
  r1++;

  ['Indicador Estratégico', 'Resultado', 'Detalle y Contexto'].forEach((txt, cIdx) => {
    setStyledCell(ws1, r1, cIdx, txt, STYLE_COL_HEADER_BLUE);
  });
  ws1Merges.push({ s: { r: r1, c: 2 }, e: { r: r1, c: 4 } });
  setStyledCell(ws1, r1, 3, '', STYLE_COL_HEADER_BLUE);
  setStyledCell(ws1, r1, 4, '', STYLE_COL_HEADER_BLUE);
  ws1RowsInfo[r1] = { hpt: 22 };
  r1++;

  const kpiData = [
    { label: 'Total de Colaboradores Registrados', val: totalSubjects, detail: 'Personal activo en la campaña', highlight: null, fmt: '#,##0' },
    { label: 'Meta Total de Evaluaciones', val: totalTarget, detail: 'Cuestionarios esperados según cuota', highlight: null, fmt: '#,##0' },
    { label: 'Cuestionarios 360° Completados', val: totalResponses, detail: 'Evaluaciones recibidas con éxito', highlight: null, fmt: '#,##0' },
    { label: 'Evaluaciones Pendientes', val: Math.max(0, totalTarget - totalResponses), detail: 'Cuestionarios restantes para la meta', highlight: null, fmt: '#,##0' },
    { label: 'Tasa de Participación Global', val: `${participationPercent}%`, detail: 'Cumplimiento respecto a la meta total', highlight: STYLE_HIGHLIGHT_BLUE, fmt: null },
    { label: 'Promedio Organizacional Global', val: organizationAverage, detail: 'Escala estándar de 1.00 a 5.00 puntos', highlight: STYLE_HIGHLIGHT_GREEN, fmt: '0.00' },
    { label: 'Diagnóstico Institucional', val: orgLevelLabel, detail: 'Semáforo directivo de desempeño', highlight: STYLE_HIGHLIGHT_AMBER, fmt: null },
  ];

  kpiData.forEach((kpi, idx) => {
    const styleRow = idx % 2 === 0 ? STYLE_DATA_EVEN : STYLE_DATA_ODD;
    setStyledCell(ws1, r1, 0, kpi.label, styleRow);

    const valStyle = kpi.highlight ? kpi.highlight : { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' }, font: { ...styleRow.font, bold: true } };
    setStyledCell(ws1, r1, 1, kpi.val, valStyle, kpi.fmt || undefined);

    setStyledCell(ws1, r1, 2, kpi.detail, styleRow);
    setStyledCell(ws1, r1, 3, '', styleRow);
    setStyledCell(ws1, r1, 4, '', styleRow);
    ws1Merges.push({ s: { r: r1, c: 2 }, e: { r: r1, c: 4 } });
    ws1RowsInfo[r1] = { hpt: 21 };
    r1++;
  });

  // Espacio
  ws1RowsInfo[r1] = { hpt: 12 };
  r1++;

  // Sección 3: Comparativa por Departamentos
  createMergedBanner(
    ws1,
    r1,
    0,
    5,
    '3. COMPARATIVA DE DESEMPEÑO POR DEPARTAMENTO / ÁREA',
    STYLE_SECTION_HEADER,
    ws1Merges
  );
  ws1RowsInfo[r1] = { hpt: 24 };
  r1++;

  const deptHeaders = ['Departamento / Área', 'Colaboradores', 'Cuestionarios Recibidos', 'Promedio (1-5)', 'Barra Visual (1 a 5)', 'Estatus del Área'];
  deptHeaders.forEach((txt, cIdx) => {
    setStyledCell(ws1, r1, cIdx, txt, STYLE_COL_HEADER_BLUE);
  });
  ws1RowsInfo[r1] = { hpt: 22 };
  r1++;

  departmentList.forEach((dept, idx) => {
    const styleRow = idx % 2 === 0 ? STYLE_DATA_EVEN : STYLE_DATA_ODD;
    setStyledCell(ws1, r1, 0, dept.name, styleRow);
    setStyledCell(ws1, r1, 1, dept.subjectsCount, { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' } }, '#,##0');
    setStyledCell(ws1, r1, 2, dept.responsesCount, { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' } }, '#,##0');

    if (dept.hasResponses) {
      const avgStyle = dept.average >= 4.0 ? STYLE_HIGHLIGHT_GREEN : dept.average >= 3.5 ? STYLE_HIGHLIGHT_BLUE : STYLE_HIGHLIGHT_AMBER;
      setStyledCell(ws1, r1, 3, dept.average, avgStyle, '0.00');

      // Columna visual con barra gráfica proporcional al puntaje (escala 1 a 5)
      const progressBarText = makeScoreProgressBar(dept.average, 5);
      const barStyle = {
        ...avgStyle,
        alignment: { vertical: 'center', horizontal: 'center' },
        font: { ...avgStyle.font, name: 'Consolas', sz: 9.5 },
      };
      setStyledCell(ws1, r1, 4, progressBarText, barStyle);

      setStyledCell(ws1, r1, 5, 'Evaluado', { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' }, font: { ...styleRow.font, bold: true, color: { rgb: '059669' } } });
    } else {
      setStyledCell(ws1, r1, 3, '—', { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' } });
      setStyledCell(ws1, r1, 4, '░░░░░░░░░░ —', { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' }, font: { ...styleRow.font, name: 'Consolas', color: { rgb: '94A3B8' } } });
      setStyledCell(ws1, r1, 5, 'Pendiente / Sin respuestas registradas', { ...styleRow, font: { ...styleRow.font, italic: true, color: { rgb: '64748B' } } });
    }

    ws1RowsInfo[r1] = { hpt: 20 };
    r1++;
  });

  // Espacio
  ws1RowsInfo[r1] = { hpt: 12 };
  r1++;

  // Sección 4: Matriz de Competencias
  createMergedBanner(
    ws1,
    r1,
    0,
    5,
    '4. MATRIZ DE COMPETENCIAS ORGANIZACIONALES',
    STYLE_SECTION_HEADER,
    ws1Merges
  );
  ws1RowsInfo[r1] = { hpt: 24 };
  r1++;

  const compHeaders = ['Competencia / Categoría', 'Evaluaciones Computadas', 'Promedio Obtenido (1-5)', 'Barra Visual (1 a 5)', 'Clasificación Estratégica', ''];
  compHeaders.forEach((txt, cIdx) => {
    if (cIdx < 5) {
      setStyledCell(ws1, r1, cIdx, txt, STYLE_COL_HEADER_BLUE);
    }
  });
  ws1Merges.push({ s: { r: r1, c: 4 }, e: { r: r1, c: 5 } });
  setStyledCell(ws1, r1, 5, '', STYLE_COL_HEADER_BLUE);
  ws1RowsInfo[r1] = { hpt: 22 };
  r1++;

  competencyList.forEach((comp, idx) => {
    const styleRow = idx % 2 === 0 ? STYLE_DATA_EVEN : STYLE_DATA_ODD;
    const isSolid = comp.average >= 4.0;
    const compHighlight = isSolid ? STYLE_HIGHLIGHT_GREEN : STYLE_HIGHLIGHT_AMBER;
    setStyledCell(ws1, r1, 0, comp.category, styleRow);
    setStyledCell(ws1, r1, 1, comp.count, { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' } }, '#,##0');
    setStyledCell(ws1, r1, 2, comp.average, compHighlight, '0.00');

    // Barra de progreso visual para competencias
    const compBar = makeScoreProgressBar(comp.average, 5);
    setStyledCell(ws1, r1, 3, compBar, {
      ...compHighlight,
      alignment: { vertical: 'center', horizontal: 'center' },
      font: { ...compHighlight.font, name: 'Consolas', sz: 9.5 },
    });

    const classStyle = isSolid
      ? { ...styleRow, font: { ...styleRow.font, bold: true, color: { rgb: '166534' } }, fill: { fgColor: { rgb: 'DCFCE7' } } }
      : { ...styleRow, font: { ...styleRow.font, bold: true, color: { rgb: '9A3412' } }, fill: { fgColor: { rgb: 'FFEDD5' } } };

    setStyledCell(ws1, r1, 4, isSolid ? 'Fortaleza Consolidada (≥ 4.00)' : 'Área de Formación Prioritaria (< 4.00)', classStyle);
    setStyledCell(ws1, r1, 5, '', classStyle);
    ws1Merges.push({ s: { r: r1, c: 4 }, e: { r: r1, c: 5 } });
    ws1RowsInfo[r1] = { hpt: 20 };
    r1++;
  });

  ws1['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r1 - 1, c: 5 } });
  ws1['!merges'] = ws1Merges;
  ws1['!rows'] = ws1RowsInfo;
  ws1['!cols'] = [
    { wch: 38 }, // Parámetro / Dept / Comp
    { wch: 22 }, // Valor / Colabs / Count
    { wch: 24 }, // Detalle / Respuestas / Promedio
    { wch: 20 }, // Promedio numérico
    { wch: 22 }, // Barra visual
    { wch: 34 }, // Estatus / Clasificación
  ];

  // ==========================================================================
  // HOJA 2: CONSOLIDADO DE COLABORADORES
  // ==========================================================================
  const ws2: any = {};
  const ws2Merges: any[] = [];
  const ws2RowsInfo: any[] = [];
  let r2 = 0;

  const sheet2Headers = [
    'Nombre',
    'Puesto',
    'Departamento',
    'Correo',
    'Meta',
    'Evaluaciones Recibidas',
    'Tasa de Participación (%)',
    'Barra Participación',
    'Promedio Global (1-5)',
    'Barra Promedio (1 a 5)',
    'Estatus',
    'Nivel de Desempeño',
    'Autoevaluación',
    'Jefe Directo',
    'Pares',
    'A Cargo',
    ...allCategories.map((c) => `Promedio: ${c}`),
  ];
  const maxCol2 = sheet2Headers.length - 1;

  // Fila 1: Título Hoja 2
  createMergedBanner(
    ws2,
    r2,
    0,
    maxCol2,
    'PROGRAMA DE EVALUACIÓN 360° - CONSOLIDADO GENERAL DE COLABORADORES',
    STYLE_TITLE_ROW,
    ws2Merges
  );
  ws2RowsInfo[r2] = { hpt: 32 };
  r2++;

  // Fila 2: Subtítulo Hoja 2
  createMergedBanner(
    ws2,
    r2,
    0,
    maxCol2,
    `Empresa: ${campaign.companyName.toUpperCase()} | Colaboradores Registrados: ${totalSubjects} | Total Evaluaciones: ${totalResponses}`,
    STYLE_SUBTITLE_ROW,
    ws2Merges
  );
  ws2RowsInfo[r2] = { hpt: 22 };
  r2++;

  // Fila 3: Espacio
  ws2RowsInfo[r2] = { hpt: 10 };
  r2++;

  // Fila 4: Encabezados de Columna
  sheet2Headers.forEach((hdr, cIdx) => {
    setStyledCell(ws2, r2, cIdx, hdr, STYLE_COL_HEADER_DARK);
  });
  ws2RowsInfo[r2] = { hpt: 26 };
  r2++;

  // Filas de Datos de Colaboradores
  subjects.forEach((sub, sIdx) => {
    const subResponses = responses.filter((r) => r.subjectId === sub.id);
    const target = sub.targetEvaluators || 5;
    const completed = subResponses.length;
    const styleRow = sIdx % 2 === 0 ? STYLE_DATA_EVEN : STYLE_DATA_ODD;

    let sSum = 0;
    let sCount = 0;
    const catScoresMap = new Map<string, { sum: number; count: number }>();

    subResponses.forEach((r) => {
      Object.entries(r.scores).forEach(([qId, val]) => {
        if (typeof val === 'number') {
          sSum += val;
          sCount++;

          const meta = resolveQuestionMeta(qId, catalog);
          if (!catScoresMap.has(meta.category)) {
            catScoresMap.set(meta.category, { sum: 0, count: 0 });
          }
          const cEntry = catScoresMap.get(meta.category)!;
          cEntry.sum += val;
          cEntry.count++;
        }
      });
    });

    const subAvg = sCount > 0 ? Number((sSum / sCount).toFixed(2)) : null;

    const estatusLabel = completed >= target
      ? 'Meta Cumplida'
      : completed > 0
      ? 'En Progreso'
      : 'Pendiente';

    // Semáforo y barras para Promedio Global y Tasa de Participación
    const partPct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
    
    // Semáforo de Participación (Verde >= 80%, Azul 50-79%, Amarillo < 50%)
    const partHighlight = partPct >= 80
      ? STYLE_HIGHLIGHT_GREEN
      : partPct >= 50
      ? STYLE_HIGHLIGHT_BLUE
      : STYLE_HIGHLIGHT_AMBER;

    // Semáforo de Promedio Global (Verde >= 4.0, Azul 3.5 - 3.9, Amarillo < 3.5)
    let avgHighlight = styleRow;
    let nivelLabel = 'Sin evaluaciones';

    if (subAvg !== null) {
      if (subAvg >= 4.0) {
        nivelLabel = subAvg >= 4.5 ? 'Sobresaliente' : 'Competente Alto';
        avgHighlight = STYLE_HIGHLIGHT_GREEN; // Verde para >= 4.0
      } else if (subAvg >= 3.5) {
        nivelLabel = 'Competente / Nivel Esperado';
        avgHighlight = STYLE_HIGHLIGHT_BLUE; // Azul para 3.5 - 3.9
      } else {
        nivelLabel = subAvg >= 3.0 ? 'En Desarrollo' : 'Requiere Atención';
        avgHighlight = STYLE_HIGHLIGHT_AMBER; // Amarillo para < 3.5
      }
    }

    const selfAvg = getRoleOverallAverage('self', subResponses);
    const mgrAvg = getRoleOverallAverage('manager', subResponses);
    const peerAvg = getRoleOverallAverage('peer', subResponses);
    const subordinateAvg = getRoleOverallAverage('subordinate', subResponses);

    // Celdas principales
    setStyledCell(ws2, r2, 0, sub.name, { ...styleRow, font: { ...styleRow.font, bold: true } });
    setStyledCell(ws2, r2, 1, sub.role, styleRow);
    setStyledCell(ws2, r2, 2, sub.department, styleRow);
    setStyledCell(ws2, r2, 3, sub.email || '—', styleRow);
    setStyledCell(ws2, r2, 4, target, { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' } }, '#,##0');
    setStyledCell(ws2, r2, 5, completed, { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' }, font: { ...styleRow.font, bold: true } }, '#,##0');

    // Tasa de Participación (%) y Barra Visual de Participación
    setStyledCell(ws2, r2, 6, `${partPct}%`, partHighlight);
    const partBarText = makePercentProgressBar(partPct);
    setStyledCell(ws2, r2, 7, partBarText, {
      ...partHighlight,
      alignment: { vertical: 'center', horizontal: 'center' },
      font: { ...partHighlight.font, name: 'Consolas', sz: 9.5 },
    });

    // Promedio Global Destacado con Semáforo y Barra Visual
    if (subAvg !== null) {
      setStyledCell(ws2, r2, 8, subAvg, avgHighlight, '0.00');
      const subBarText = makeScoreProgressBar(subAvg, 5);
      setStyledCell(ws2, r2, 9, subBarText, {
        ...avgHighlight,
        alignment: { vertical: 'center', horizontal: 'center' },
        font: { ...avgHighlight.font, name: 'Consolas', sz: 9.5 },
      });
    } else {
      setStyledCell(ws2, r2, 8, '—', { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' } });
      setStyledCell(ws2, r2, 9, '░░░░░░░░░░ —', { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' }, font: { ...styleRow.font, name: 'Consolas', color: { rgb: '94A3B8' } } });
    }

    // Estatus
    const estatusStyle = completed >= target
      ? { ...styleRow, font: { ...styleRow.font, bold: true, color: { rgb: '166534' } }, alignment: { vertical: 'center', horizontal: 'center' } }
      : completed > 0
      ? { ...styleRow, font: { ...styleRow.font, bold: true, color: { rgb: '2563EB' } }, alignment: { vertical: 'center', horizontal: 'center' } }
      : { ...styleRow, font: { ...styleRow.font, italic: true, color: { rgb: '64748B' } }, alignment: { vertical: 'center', horizontal: 'center' } };
    setStyledCell(ws2, r2, 10, estatusLabel, estatusStyle);

    // Nivel
    setStyledCell(ws2, r2, 11, nivelLabel, { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' } });

    // Roles
    const roleAlign = { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' } };
    setStyledCell(ws2, r2, 12, selfAvg !== null ? selfAvg : '—', roleAlign, selfAvg !== null ? '0.00' : undefined);
    setStyledCell(ws2, r2, 13, mgrAvg !== null ? mgrAvg : '—', roleAlign, mgrAvg !== null ? '0.00' : undefined);
    setStyledCell(ws2, r2, 14, peerAvg !== null ? peerAvg : '—', roleAlign, peerAvg !== null ? '0.00' : undefined);
    setStyledCell(ws2, r2, 15, subordinateAvg !== null ? subordinateAvg : '—', roleAlign, subordinateAvg !== null ? '0.00' : undefined);

    // Competencias
    allCategories.forEach((catName, cIdx) => {
      const entry = catScoresMap.get(catName);
      const val = entry && entry.count > 0 ? Number((entry.sum / entry.count).toFixed(2)) : null;
      setStyledCell(ws2, r2, 16 + cIdx, val !== null ? val : '—', roleAlign, val !== null ? '0.00' : undefined);
    });

    ws2RowsInfo[r2] = { hpt: 20 };
    r2++;
  });

  ws2['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r2 - 1, c: maxCol2 } });
  ws2['!merges'] = ws2Merges;
  ws2['!rows'] = ws2RowsInfo;
  ws2['!cols'] = [
    { wch: 32 }, // Nombre
    { wch: 28 }, // Puesto
    { wch: 24 }, // Departamento
    { wch: 30 }, // Correo
    { wch: 12 }, // Meta
    { wch: 20 }, // Evaluaciones Recibidas
    { wch: 22 }, // Tasa de Participación
    { wch: 22 }, // Barra Participación
    { wch: 20 }, // Promedio Global
    { wch: 22 }, // Barra Promedio
    { wch: 18 }, // Estatus
    { wch: 26 }, // Nivel Desempeño
    { wch: 16 }, // Auto
    { wch: 16 }, // Jefe
    { wch: 16 }, // Pares
    { wch: 16 }, // A Cargo
    ...allCategories.map(() => ({ wch: 22 })),
  ];

  // ==========================================================================
  // HOJA 3: DETALLE DE RESPUESTAS (AUDITORÍA COMPLETA FILA POR FILA)
  // ==========================================================================
  const ws3: any = {};
  const ws3Merges: any[] = [];
  const ws3RowsInfo: any[] = [];
  let r3 = 0;

  const sheet3Headers = [
    'ID Respuesta',
    'Fecha de Envío',
    'Colaborador Evaluado',
    'Puesto',
    'Departamento',
    'Rol Evaluador',
    'Evaluador',
    'Promedio Encuesta',
    'Fortalezas (Cualitativo)',
    'Oportunidades de Mejora (Cualitativo)',
    'Recomendaciones de Desarrollo (Cualitativo)',
  ];
  const maxCol3 = sheet3Headers.length - 1;

  // Fila 1: Título Hoja 3
  createMergedBanner(
    ws3,
    r3,
    0,
    maxCol3,
    'PROGRAMA DE EVALUACIÓN 360° - REGISTRO DE AUDITORÍA DE RESPUESTAS',
    STYLE_TITLE_ROW,
    ws3Merges
  );
  ws3RowsInfo[r3] = { hpt: 32 };
  r3++;

  // Fila 2: Subtítulo Hoja 3
  createMergedBanner(
    ws3,
    r3,
    0,
    maxCol3,
    `Empresa: ${campaign.companyName.toUpperCase()} | Total Cuestionarios: ${totalResponses} | Confidencial`,
    STYLE_SUBTITLE_ROW,
    ws3Merges
  );
  ws3RowsInfo[r3] = { hpt: 22 };
  r3++;

  // Fila 3: Espacio
  ws3RowsInfo[r3] = { hpt: 10 };
  r3++;

  // Fila 4: Encabezados de Columna
  sheet3Headers.forEach((hdr, cIdx) => {
    setStyledCell(ws3, r3, cIdx, hdr, STYLE_COL_HEADER_DARK);
  });
  ws3RowsInfo[r3] = { hpt: 26 };
  r3++;

  responses.forEach((resp, idx) => {
    const sub = subjects.find((s) => s.id === resp.subjectId);
    const subName = sub ? sub.name : 'No asignado';
    const subRole = sub ? sub.role : '—';
    const subDept = sub ? sub.department : '—';
    const roleInfo = EVALUATOR_ROLES_INFO[resp.evaluatorRole];
    const styleRow = idx % 2 === 0 ? STYLE_DATA_EVEN : STYLE_DATA_ODD;

    let rSum = 0;
    let rCount = 0;
    Object.values(resp.scores).forEach((val) => {
      if (typeof val === 'number') {
        rSum += val;
        rCount++;
      }
    });
    const respAvg = rCount > 0 ? Number((rSum / rCount).toFixed(2)) : null;

    setStyledCell(ws3, r3, 0, resp.id, { ...styleRow, font: { ...styleRow.font, sz: 9 } });
    setStyledCell(ws3, r3, 1, new Date(resp.timestamp).toLocaleString('es-ES'), styleRow);
    setStyledCell(ws3, r3, 2, subName, { ...styleRow, font: { ...styleRow.font, bold: true } });
    setStyledCell(ws3, r3, 3, subRole, styleRow);
    setStyledCell(ws3, r3, 4, subDept, styleRow);
    setStyledCell(ws3, r3, 5, roleInfo?.label || resp.evaluatorRole, styleRow);
    setStyledCell(ws3, r3, 6, resp.evaluatorName || 'Anónimo Confidencial', styleRow);

    if (respAvg !== null) {
      setStyledCell(ws3, r3, 7, respAvg, STYLE_HIGHLIGHT_GREEN, '0.00');
    } else {
      setStyledCell(ws3, r3, 7, '—', { ...styleRow, alignment: { vertical: 'center', horizontal: 'center' } });
    }

    setStyledCell(ws3, r3, 8, resp.comments?.strengths || 'Sin comentarios registrados', styleRow);
    setStyledCell(ws3, r3, 9, resp.comments?.improvements || 'Sin comentarios registrados', styleRow);
    setStyledCell(ws3, r3, 10, resp.comments?.recommendations || 'Sin comentarios registrados', styleRow);

    ws3RowsInfo[r3] = { hpt: 20 };
    r3++;
  });

  ws3['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r3 - 1, c: maxCol3 } });
  ws3['!merges'] = ws3Merges;
  ws3['!rows'] = ws3RowsInfo;
  ws3['!cols'] = [
    { wch: 18 }, // ID Respuesta
    { wch: 22 }, // Fecha
    { wch: 30 }, // Colaborador
    { wch: 25 }, // Puesto
    { wch: 22 }, // Departamento
    { wch: 22 }, // Rol Evaluador
    { wch: 26 }, // Evaluador
    { wch: 20 }, // Promedio
    { wch: 45 }, // Fortalezas
    { wch: 45 }, // Mejoras
    { wch: 45 }, // Recomendaciones
  ];

  // ==========================================================================
  // CONSTRUCCIÓN DEL WORKBOOK Y DESCARGA DIRECTA
  // ==========================================================================
  const wb = xlsxLib.utils.book_new();
  xlsxLib.utils.book_append_sheet(wb, ws1, 'Resumen Ejecutivo');
  xlsxLib.utils.book_append_sheet(wb, ws2, 'Consolidado de Colaboradores');
  xlsxLib.utils.book_append_sheet(wb, ws3, 'Detalle de Respuestas');

  const cleanCompanyName = (campaign.companyName || 'Empresa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Reporte_Maestro_${cleanCompanyName}_${todayStr}.xlsx`;

  xlsxLib.writeFile(wb, filename);

  return filename;
}
