import { TemplateQuestion, CompetencyDefinition } from '../types';
import { DEFAULT_COMPETENCIES } from '../constants/competencies';
import { DEFAULT_SURVEY_TEMPLATES } from '../constants/defaultTemplates';

export interface QuestionMeta {
  id: string;
  category: string;
  text: string;
}

/**
 * Prefix-based fallback map for category identification
 */
const PREFIX_CATEGORY_MAP: Record<string, string> = {
  lid_vis_: 'Visión Estratégica',
  lid_del_: 'Gestión de Equipos y Delegación',
  lid_coa_: 'Desarrollo y Coaching',
  lid_con_: 'Resolución de Conflictos y Clima Laboral',
  lid_res_: 'Responsabilidad y Rendición de Cuentas',
  tech_agi_: 'Agilidad y Adaptabilidad',
  tech_aut_: 'Autonomía y Toma de Decisiones',
  tech_com_: 'Comunicación y Colaboración Técnica',
  tech_inn_: 'Innovación y Mentalidad de Producto',
  tech_res_: 'Resiliencia y Orientación a Resultados',
  lid_: 'Liderazgo e Influencia',
  com_: 'Comunicación Asertiva y Escucha',
  eq_: 'Trabajo en Equipo y Cooperación',
  res_: 'Resolución de Problemas e Innovación',
  adp_: 'Adaptabilidad y Resiliencia',
};

/**
 * Builds a comprehensive catalog of all known questions across custom templates,
 * built-in survey templates, and default competencies.
 */
export function getComprehensiveQuestionCatalog(
  customQuestions?: TemplateQuestion[]
): Map<string, QuestionMeta> {
  const map = new Map<string, QuestionMeta>();

  // 1. Ingest DEFAULT_COMPETENCIES
  DEFAULT_COMPETENCIES.forEach((c) => {
    c.questions.forEach((q) => {
      map.set(q.id, {
        id: q.id,
        category: c.name,
        text: q.text,
      });
    });
  });

  // 2. Ingest DEFAULT_SURVEY_TEMPLATES
  DEFAULT_SURVEY_TEMPLATES.forEach((tpl) => {
    tpl.questions.forEach((q) => {
      map.set(q.id, {
        id: q.id,
        category: q.category || 'General',
        text: q.text,
      });
    });
  });

  // 3. Ingest customQuestions (higher priority if provided)
  if (customQuestions && customQuestions.length > 0) {
    customQuestions.forEach((q) => {
      map.set(q.id, {
        id: q.id,
        category: q.category || 'General',
        text: q.text,
      });
    });
  }

  return map;
}

/**
 * Resolves any key found in a response's scores dictionary to its category and text,
 * guaranteeing no valid score is dropped.
 */
export function resolveQuestionMeta(
  key: string,
  catalog: Map<string, QuestionMeta>
): QuestionMeta {
  if (catalog.has(key)) {
    return catalog.get(key)!;
  }

  // Check prefix matches
  for (const [prefix, category] of Object.entries(PREFIX_CATEGORY_MAP)) {
    if (key.startsWith(prefix)) {
      return {
        id: key,
        category,
        text: `Reactivo de evaluación (${category})`,
      };
    }
  }

  // Check if key is a competency ID or category name
  const compMatch = DEFAULT_COMPETENCIES.find(
    (c) => c.id.toLowerCase() === key.toLowerCase() || c.name.toLowerCase() === key.toLowerCase()
  );
  if (compMatch) {
    return {
      id: key,
      category: compMatch.name,
      text: `Competencia Global: ${compMatch.name}`,
    };
  }

  // Fallback: clean up key to create a category
  const cleanedCategory = key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  return {
    id: key,
    category: cleanedCategory || 'Competencia General',
    text: `Reactivo ${key}`,
  };
}
