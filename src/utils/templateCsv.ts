import { SurveyTemplate, TemplateQuestion } from '../types';
import {
  validateTemplateQuestions,
  standardizeAndMigrateQuestions,
  REQUIRED_QUESTIONS_PER_TEMPLATE,
  TemplateValidationResult,
} from './templateMigration';

function escapeCsvField(val: string): string {
  let str = (val || '').trim();
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Downloads a Survey Template as CSV with format: categoria,pregunta
 */
export function exportTemplateToCsv(template: SurveyTemplate) {
  const headers = ['categoria', 'pregunta'];
  const rows = template.questions.map((q) => [
    escapeCsvField(q.category),
    escapeCsvField(q.text),
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const filename = `Plantilla_360_${template.name.replace(/\s+/g, '_')}.csv`;
  downloadBlob(csvContent, filename);
}

/**
 * Downloads an official sample template CSV containing exactly 20 standardized questions
 * distributed in 5 core competencies (4 questions per competency)
 */
export function downloadSampleTemplateCsv() {
  const sampleContent =
    '\uFEFFcategoria,pregunta\r\n' +
    // Competencia 1: Liderazgo y Visión Estratégica (4 preguntas)
    '"Liderazgo y Visión Estratégica","Define prioridades y objetivos claros alineados con las metas del negocio."\r\n' +
    '"Liderazgo y Visión Estratégica","Toma decisiones oportunas y fundamentadas incluso en situaciones de incertidumbre."\r\n' +
    '"Liderazgo y Visión Estratégica","Anticipa riesgos operativos y formula planes de contingencia eficaces."\r\n' +
    '"Liderazgo y Visión Estratégica","Comunica el rumbo estratégico de manera inspiradora y convincente."\r\n' +
    // Competencia 2: Comunicación y Relaciones Interpersonales (4 preguntas)
    '"Comunicación y Relaciones","Escucha activamente y muestra empatía ante las inquietudes de los demás."\r\n' +
    '"Comunicación y Relaciones","Transmite ideas complejas de forma estructurada, clara y respetuosa."\r\n' +
    '"Comunicación y Relaciones","Proporciona retroalimentación constructiva y recibe comentarios con madurez."\r\n' +
    '"Comunicación y Relaciones","Mantiene una comunicación fluida y oportuna con todas las áreas del equipo."\r\n' +
    // Competencia 3: Trabajo en Equipo y Colaboración (4 preguntas)
    '"Trabajo en Equipo y Colaboración","Colabora proactivamente con otras áreas priorizando el éxito colectivo."\r\n' +
    '"Trabajo en Equipo y Colaboración","Fomenta un ambiente de confianza, respeto mutuo y alta inclusión laboral."\r\n' +
    '"Trabajo en Equipo y Colaboración","Comparte conocimientos, herramientas y buenas prácticas con sus colegas."\r\n' +
    '"Trabajo en Equipo y Colaboración","Apoya con iniciativa a compañeros de equipo en momentos de alta demanda."\r\n' +
    // Competencia 4: Orientación a Resultados y Calidad (4 preguntas)
    '"Orientación a Resultados","Cumple puntualmente sus compromisos con altos estándares de calidad."\r\n' +
    '"Orientación a Resultados","Monitorea el avance de sus metas y ajusta su plan de acción proactivamente."\r\n' +
    '"Orientación a Resultados","Asume la responsabilidad por sus resultados y por la corrección de errores."\r\n' +
    '"Orientación a Resultados","Optimiza recursos y tiempos en sus procesos cotidianos de trabajo."\r\n' +
    // Competencia 5: Adaptabilidad e Innovación (4 preguntas)
    '"Adaptabilidad e Innovación","Se adapta rápidamente a cambios de prioridades, herramientas o requerimientos."\r\n' +
    '"Adaptabilidad e Innovación","Propone soluciones creativas y prácticas ante desafíos operacionales."\r\n' +
    '"Adaptabilidad e Innovación","Mantiene una actitud abierta y constante hacia el aprendizaje y la mejora continua."\r\n' +
    '"Adaptabilidad e Innovación","Aprende con rapidez de los errores y experimenta nuevas alternativas eficaces."\r\n';

  downloadBlob(sampleContent, 'Plantilla_20_Preguntas_Estandar_360.csv');
}

/**
 * Parses CSV text into an array of TemplateQuestion and verifies compliance with 20 questions standard
 */
export function parseSurveyTemplateCsv(csvText: string): {
  success: boolean;
  questions: TemplateQuestion[];
  standardizedQuestions: TemplateQuestion[];
  isStandardCompliant: boolean;
  validation: TemplateValidationResult;
  error?: string;
  migrationLog?: string[];
} {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const emptyValidation: TemplateValidationResult = {
    isValid: false,
    questionCount: 0,
    targetCount: REQUIRED_QUESTIONS_PER_TEMPLATE,
    categoriesCount: 0,
    categories: [],
    questionsPerCategory: {},
    errors: ['El archivo está vacío.'],
    warnings: [],
  };

  if (!cleanText) {
    return {
      success: false,
      questions: [],
      standardizedQuestions: [],
      isStandardCompliant: false,
      validation: emptyValidation,
      error: 'El archivo CSV está vacío.',
    };
  }

  const lines = cleanText.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      success: false,
      questions: [],
      standardizedQuestions: [],
      isStandardCompliant: false,
      validation: {
        ...emptyValidation,
        errors: ['El archivo debe contener encabezados y al menos una fila de preguntas.'],
      },
      error: 'El archivo debe contener al menos la fila de encabezado y una fila de preguntas.',
    };
  }

  // Detect delimiter (comma or semicolon)
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';

  // Helper to split CSV line handling quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(headerLine).map((h) =>
    h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  let categoryIndex = headers.findIndex((h) => h.includes('categ') || h.includes('compet'));
  let questionIndex = headers.findIndex((h) => h.includes('pregun') || h.includes('text') || h.includes('item'));

  // Default to 0 and 1 if standard 2 columns
  if (categoryIndex === -1 && questionIndex === -1 && headers.length >= 2) {
    categoryIndex = 0;
    questionIndex = 1;
  } else if (categoryIndex === -1 || questionIndex === -1) {
    return {
      success: false,
      questions: [],
      standardizedQuestions: [],
      isStandardCompliant: false,
      validation: {
        ...emptyValidation,
        errors: ['No se encontraron las columnas requeridas (categoria, pregunta).'],
      },
      error: 'No se encontraron las columnas requeridas. Asegúrate de incluir "categoria" y "pregunta" en la primera fila.',
    };
  }

  const rawQuestions: TemplateQuestion[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    const cols = parseLine(rawLine);
    const category = cols[categoryIndex]?.replace(/^"|"$/g, '').trim() || 'General';
    const text = cols[questionIndex]?.replace(/^"|"$/g, '').trim();

    if (text) {
      rawQuestions.push({
        id: `q_csv_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
        category,
        text,
      });
    }
  }

  if (rawQuestions.length === 0) {
    return {
      success: false,
      questions: [],
      standardizedQuestions: [],
      isStandardCompliant: false,
      validation: {
        ...emptyValidation,
        errors: ['No se pudieron extraer preguntas válidas.'],
      },
      error: 'No se pudieron extraer preguntas válidas del archivo.',
    };
  }

  const validation = validateTemplateQuestions(rawQuestions);
  const { questions: standardizedQuestions, log: migrationLog } = standardizeAndMigrateQuestions(rawQuestions);

  return {
    success: true,
    questions: rawQuestions,
    standardizedQuestions,
    isStandardCompliant: validation.isValid,
    validation,
    migrationLog,
  };
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
