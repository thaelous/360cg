import { SurveyTemplate, TemplateQuestion } from '../types';
import { DEFAULT_SURVEY_TEMPLATES } from '../constants/defaultTemplates';

export const REQUIRED_QUESTIONS_PER_TEMPLATE = 20;

export interface TemplateValidationResult {
  isValid: boolean;
  questionCount: number;
  targetCount: number;
  categoriesCount: number;
  categories: string[];
  questionsPerCategory: Record<string, number>;
  errors: string[];
  warnings: string[];
}

/**
 * Standard pool of Likert (1-5) evaluation questions grouped by foundational competencies.
 * Used to intelligently fill or balance templates during migration or CSV import.
 */
export const STANDARD_QUESTION_POOL: Record<string, string[]> = {
  'Liderazgo y Visión': [
    'Define prioridades y metas claras alineadas con los objetivos del negocio.',
    'Toma decisiones oportunas y fundamentadas incluso en condiciones de incertidumbre.',
    'Anticipa riesgos operativos y formula planes de contingencia eficaces.',
    'Comunica el rumbo estratégico de manera inspiradora y convincente.',
    'Modela con el ejemplo los valores éticos y el compromiso con la excelencia.',
  ],
  'Comunicación y Relaciones': [
    'Escucha con atención y apertura los puntos de vista de los demás.',
    'Transmite información crítica con claridad, precisión y de manera constructiva.',
    'Proporciona y recibe retroalimentación de forma constructiva y oportuna.',
    'Mantiene canales de comunicación abiertos con todas las áreas involucradas.',
    'Resuelve discrepancias o malos entendidos con empatía y serenidad.',
  ],
  'Trabajo en Equipo y Colaboración': [
    'Colabora activamente con colegas y otras áreas para alcanzar metas colectivas.',
    'Fomenta un ambiente de confianza, respeto mutuo e inclusión laboral.',
    'Comparte conocimientos, herramientas y mejores prácticas desinteresadamente.',
    'Apoya oportunamente a compañeros en momentos de sobrecarga o urgencia.',
    'Reconoce y celebra las contribuciones y logros de los demás miembros del equipo.',
  ],
  'Orientación a Resultados y Calidad': [
    'Cumple con los acuerdos y plazos establecidos manteniendo altos estándares de calidad.',
    'Monitorea el avance de sus metas y ajusta su plan de acción proactivamente.',
    'Asume plena responsabilidad por sus entregables y por la corrección de errores.',
    'Optimiza el uso de recursos y tiempo para maximizar el valor entregado.',
    'Busca continuamente formas de simplificar procesos y eliminar desperdicios.',
  ],
  'Innovación y Adaptabilidad': [
    'Se adapta con rapidez y actitud positiva ante cambios de prioridades del entorno.',
    'Propone ideas novedosas y mejoras prácticas para resolver retos cotidianos.',
    'Mantiene una actitud abierta hacia el aprendizaje continuo y nuevas herramientas.',
    'Aprende de los errores con madurez y los transforma en lecciones de mejora.',
    'Experimenta con soluciones ágiles para validar resultados con rapidez.',
  ],
};

/**
 * Validates if a template or list of questions complies with the 20-question standard.
 */
export function validateTemplateQuestions(
  questions: TemplateQuestion[]
): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validQuestions = (questions || []).filter(
    (q) => q && typeof q.text === 'string' && q.text.trim().length > 0
  );

  const questionCount = validQuestions.length;
  const questionsPerCategory: Record<string, number> = {};

  validQuestions.forEach((q) => {
    const cat = (q.category || '').trim() || 'General';
    questionsPerCategory[cat] = (questionsPerCategory[cat] || 0) + 1;
  });

  const categories = Object.keys(questionsPerCategory);
  const categoriesCount = categories.length;

  if (questionCount !== REQUIRED_QUESTIONS_PER_TEMPLATE) {
    errors.push(
      `La plantilla contiene ${questionCount} preguntas. El estándar oficial requiere exactamente ${REQUIRED_QUESTIONS_PER_TEMPLATE} preguntas.`
    );
  }

  if (categoriesCount === 0) {
    errors.push('No se han definido competencias o categorías para las preguntas.');
  } else if (categoriesCount === 1 && questionCount > 5) {
    warnings.push(
      'Todas las preguntas están en una sola competencia. Se recomienda distribuirlas en 4 o 5 competencias clave.'
    );
  }

  // Check for duplicate question texts
  const seenTexts = new Set<string>();
  let duplicateCount = 0;
  validQuestions.forEach((q) => {
    const normalized = q.text.trim().toLowerCase();
    if (seenTexts.has(normalized)) {
      duplicateCount++;
    } else {
      seenTexts.add(normalized);
    }
  });

  if (duplicateCount > 0) {
    warnings.push(`Se detectaron ${duplicateCount} preguntas con texto duplicado.`);
  }

  return {
    isValid: errors.length === 0,
    questionCount,
    targetCount: REQUIRED_QUESTIONS_PER_TEMPLATE,
    categoriesCount,
    categories,
    questionsPerCategory,
    errors,
    warnings,
  };
}

/**
 * Migration & Standardization Algorithm:
 * Takes any set of questions and standardizes them to EXACTLY 20 questions
 * balanced across competencies with Likert 1-5 evaluation criteria.
 */
export function standardizeAndMigrateQuestions(
  rawQuestions: TemplateQuestion[],
  fallbackTemplateId?: string
): { questions: TemplateQuestion[]; wasAdjusted: boolean; log: string[] } {
  const log: string[] = [];
  let wasAdjusted = false;

  // 1. Clean and deduplicate existing questions
  const cleaned: TemplateQuestion[] = [];
  const seenTexts = new Set<string>();

  for (const q of rawQuestions || []) {
    if (!q || !q.text || typeof q.text !== 'string') continue;
    const trimmedText = q.text.trim();
    if (trimmedText.length < 3) continue;

    const normalizedKey = trimmedText.toLowerCase();
    if (seenTexts.has(normalizedKey)) continue;
    seenTexts.add(normalizedKey);

    const category = (q.category || '').trim() || 'Competencias Generales';
    cleaned.push({
      id: q.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      text: trimmedText,
    });
  }

  // If completely empty, seed from default templates
  if (cleaned.length === 0) {
    wasAdjusted = true;
    log.push('Plantilla sin preguntas válidas. Se cargaron 20 preguntas del estándar base.');
    const sourceTemplate =
      DEFAULT_SURVEY_TEMPLATES.find((t) => t.id === fallbackTemplateId) ||
      DEFAULT_SURVEY_TEMPLATES[0];
    return {
      questions: sourceTemplate.questions.map((q) => ({
        ...q,
        id: `q_std_${Math.random().toString(36).substring(2, 7)}`,
      })),
      wasAdjusted: true,
      log,
    };
  }

  // If already exactly 20 questions, verify categories and return
  if (cleaned.length === REQUIRED_QUESTIONS_PER_TEMPLATE) {
    return {
      questions: cleaned,
      wasAdjusted,
      log: ['La plantilla ya cuenta con exactamente 20 preguntas estandarizadas.'],
    };
  }

  wasAdjusted = true;

  // CASE A: MORE THAN 20 QUESTIONS -> Trim proportionally
  if (cleaned.length > REQUIRED_QUESTIONS_PER_TEMPLATE) {
    log.push(
      `La plantilla contenía ${cleaned.length} preguntas. Se ajustó a exactamente ${REQUIRED_QUESTIONS_PER_TEMPLATE} preguntas balanceadas.`
    );

    // Group by category to trim evenly
    const byCategory: Record<string, TemplateQuestion[]> = {};
    cleaned.forEach((q) => {
      if (!byCategory[q.category]) byCategory[q.category] = [];
      byCategory[q.category].push(q);
    });

    const categoryNames = Object.keys(byCategory);
    const selected: TemplateQuestion[] = [];

    // Round-robin selection until reaching 20
    let round = 0;
    while (selected.length < REQUIRED_QUESTIONS_PER_TEMPLATE) {
      let addedInRound = false;
      for (const cat of categoryNames) {
        if (selected.length >= REQUIRED_QUESTIONS_PER_TEMPLATE) break;
        if (byCategory[cat] && byCategory[cat][round]) {
          selected.push(byCategory[cat][round]);
          addedInRound = true;
        }
      }
      round++;
      if (!addedInRound) break;
    }

    // Safety fallback if round robin didn't fill 20
    for (const q of cleaned) {
      if (selected.length >= REQUIRED_QUESTIONS_PER_TEMPLATE) break;
      if (!selected.some((s) => s.text === q.text)) {
        selected.push(q);
      }
    }

    return {
      questions: selected,
      wasAdjusted: true,
      log,
    };
  }

  // CASE B: LESS THAN 20 QUESTIONS -> Intelligently fill up to 20
  log.push(
    `La plantilla contenía ${cleaned.length} preguntas. Se complementó con reactivos estándar para alcanzar exactamente ${REQUIRED_QUESTIONS_PER_TEMPLATE} preguntas.`
  );

  const result: TemplateQuestion[] = [...cleaned];
  const existingCategories = Array.from(new Set(cleaned.map((q) => q.category)));

  // Try to find pool questions that fit existing categories or standard categories
  const poolCategories = Object.keys(STANDARD_QUESTION_POOL);

  // Helper to add a question if text not already in result
  const tryAddQuestion = (category: string, text: string): boolean => {
    if (result.length >= REQUIRED_QUESTIONS_PER_TEMPLATE) return false;
    const lower = text.trim().toLowerCase();
    if (result.some((r) => r.text.trim().toLowerCase() === lower)) return false;

    result.push({
      id: `q_mig_${Date.now()}_${result.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      text,
    });
    return true;
  };

  // Phase 1: If existing categories match or are related to pool categories, fill them first
  for (const existCat of existingCategories) {
    if (result.length >= REQUIRED_QUESTIONS_PER_TEMPLATE) break;
    const countInCat = result.filter((r) => r.category === existCat).length;
    if (countInCat < 4) {
      // Find matching standard pool
      const matchingPoolKey = poolCategories.find(
        (pk) =>
          existCat.toLowerCase().includes(pk.toLowerCase().substring(0, 5)) ||
          pk.toLowerCase().includes(existCat.toLowerCase().substring(0, 5))
      );
      if (matchingPoolKey) {
        for (const candidateText of STANDARD_QUESTION_POOL[matchingPoolKey]) {
          if (result.filter((r) => r.category === existCat).length >= 4) break;
          tryAddQuestion(existCat, candidateText);
        }
      }
    }
  }

  // Phase 2: Add from standard pool categories in round-robin until 20
  let poolIdx = 0;
  while (result.length < REQUIRED_QUESTIONS_PER_TEMPLATE) {
    const currentPoolCategory = poolCategories[poolIdx % poolCategories.length];
    const questionsInPool = STANDARD_QUESTION_POOL[currentPoolCategory];
    let added = false;

    for (const qText of questionsInPool) {
      if (tryAddQuestion(currentPoolCategory, qText)) {
        added = true;
        break;
      }
    }

    poolIdx++;
    // If we looped through all pools and couldn't find unique texts, pick from default templates
    if (!added && poolIdx > poolCategories.length * 3) {
      for (const defTpl of DEFAULT_SURVEY_TEMPLATES) {
        if (result.length >= REQUIRED_QUESTIONS_PER_TEMPLATE) break;
        for (const defQ of defTpl.questions) {
          if (tryAddQuestion(defQ.category, defQ.text)) {
            break;
          }
        }
      }
      break;
    }
  }

  // Ensure exactly 20 questions
  const finalQuestions = result.slice(0, REQUIRED_QUESTIONS_PER_TEMPLATE);

  return {
    questions: finalQuestions,
    wasAdjusted: true,
    log,
  };
}

/**
 * Migrates a full SurveyTemplate object, ensuring it adheres to the 20-question standard.
 */
export function migrateSurveyTemplate(template: SurveyTemplate): {
  migrated: SurveyTemplate;
  changed: boolean;
  log: string[];
} {
  const currentCount = template.questions?.length || 0;
  if (currentCount === REQUIRED_QUESTIONS_PER_TEMPLATE) {
    // Check if any question has empty text
    const hasInvalid = template.questions.some((q) => !q.text || q.text.trim().length === 0);
    if (!hasInvalid) {
      return { migrated: template, changed: false, log: [] };
    }
  }

  const { questions: migratedQuestions, wasAdjusted, log } = standardizeAndMigrateQuestions(
    template.questions || [],
    template.id
  );

  return {
    migrated: {
      ...template,
      questions: migratedQuestions,
    },
    changed: wasAdjusted,
    log,
  };
}
