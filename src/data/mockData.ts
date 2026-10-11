import { Campaign, EvaluatedSubject, EvaluationResponse } from '../types';
import { DEFAULT_SURVEY_TEMPLATES } from '../constants/defaultTemplates';

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-tech-2026',
    clientCode: 'CORP-2026-X',
    companyName: 'TechNova Solutions',
    description: 'Evaluación anual de liderazgo y competencias estratégicas para el equipo directivo y técnico.',
    status: 'active',
    createdAt: '2026-03-01T08:00:00Z',
    deadline: '2026-04-30',
    competencyIds: ['liderazgo', 'comunicacion', 'trabajo_equipo', 'resolucion_problemas', 'adaptabilidad_resultados'],
    templateId: 'tpl-tech-startups',
    templateName: 'Startups y Empresas de Tecnología / Innovación',
    questions: DEFAULT_SURVEY_TEMPLATES[1].questions,
  },
  {
    id: 'camp-innova-2026',
    clientCode: 'CORP-2026-B',
    companyName: 'Banco Innova Finanzas',
    description: 'Diagnóstico 360° para desarrollo de mandos medios y jefaturas de producto digital.',
    status: 'active',
    createdAt: '2026-03-10T10:00:00Z',
    deadline: '2026-05-15',
    competencyIds: ['liderazgo', 'comunicacion', 'trabajo_equipo', 'resolucion_problemas', 'adaptabilidad_resultados'],
    templateId: 'tpl-liderazgo-gerencial',
    templateName: 'Evaluación de Liderazgo y Mandos Medios',
    questions: DEFAULT_SURVEY_TEMPLATES[0].questions,
  },
];

export const INITIAL_SUBJECTS: EvaluatedSubject[] = [
  {
    id: 'subj-1',
    campaignId: 'camp-tech-2026',
    name: 'Carolina M. Valenzuela',
    role: 'Gerente de Ingeniería de Software',
    department: 'Tecnología e Innovación',
    email: 'c.valenzuela@technova.io',
    targetEvaluators: 6,
    createdAt: '2026-03-02T09:00:00Z',
  },
  {
    id: 'subj-2',
    campaignId: 'camp-tech-2026',
    name: 'Roberto Gómez Morales',
    role: 'Líder de Producto Digital (Product Lead)',
    department: 'Producto & UX',
    email: 'r.gomez@technova.io',
    targetEvaluators: 6,
    createdAt: '2026-03-02T09:30:00Z',
  },
  {
    id: 'subj-3',
    campaignId: 'camp-tech-2026',
    name: 'Mariana Duarte Silva',
    role: 'Especialista Senior en Data Analytics',
    department: 'Business Intelligence',
    email: 'm.duarte@technova.io',
    targetEvaluators: 4,
    createdAt: '2026-03-03T11:00:00Z',
  },
  {
    id: 'subj-4',
    campaignId: 'camp-innova-2026',
    name: 'Esteban Ramírez Peña',
    role: 'Subgerente de Riesgos y Cumplimiento',
    department: 'Riesgos Financieros',
    email: 'e.ramirez@bancoinnova.com',
    targetEvaluators: 5,
    createdAt: '2026-03-11T12:00:00Z',
  },
];

export const INITIAL_RESPONSES: EvaluationResponse[] = [
  // Subject 1: Carolina Valenzuela (TechNova)
  // 1. Self evaluation
  {
    id: 'resp-1',
    campaignId: 'camp-tech-2026',
    subjectId: 'subj-1',
    evaluatorRole: 'self',
    evaluatorName: 'Carolina M. Valenzuela',
    scores: {
      lid_1: 4, lid_2: 4, lid_3: 3,
      com_1: 4, com_2: 4, com_3: 4,
      eq_1: 5, eq_2: 5, eq_3: 4,
      res_1: 5, res_2: 4, res_3: 4,
      adp_1: 4, adp_2: 5, adp_3: 5,
    },
    comments: {
      strengths: 'Capacidad de orquestación técnica, entrega puntual en sprints críticos y visión de arquitectura escalable.',
      improvements: 'Manejo de la frustración en negociaciones de plazos con stakeholders no técnicos.',
      recommendations: 'Dedicar más tiempo a mentorías 1 a 1 formales con los ingenieros junior y delegar decisiones secundarias.',
    },
    timestamp: '2026-03-05T14:30:00Z',
  },
  // 2. Manager evaluation
  {
    id: 'resp-2',
    campaignId: 'camp-tech-2026',
    subjectId: 'subj-1',
    evaluatorRole: 'manager',
    evaluatorName: 'VP de Tecnología',
    scores: {
      lid_1: 5, lid_2: 4, lid_3: 4,
      com_1: 5, com_2: 4, com_3: 5,
      eq_1: 5, eq_2: 4, eq_3: 5,
      res_1: 5, res_2: 5, res_3: 5,
      adp_1: 5, adp_2: 5, adp_3: 5,
    },
    comments: {
      strengths: 'Excelente capacidad resolutiva. Carolina es el pilar de confiabilidad del área técnica.',
      improvements: 'Debe continuar delegando para no sobrecargarse en semanas de releases mayores.',
      recommendations: 'Prepararla para asumir liderazgo estratégico de múltiples unidades de desarrollo.',
    },
    timestamp: '2026-03-06T10:15:00Z',
  },
  // 3. Peer 1 evaluation
  {
    id: 'resp-3',
    campaignId: 'camp-tech-2026',
    subjectId: 'subj-1',
    evaluatorRole: 'peer',
    evaluatorName: 'Roberto Gómez (Product Lead)',
    scores: {
      lid_1: 4, lid_2: 4, lid_3: 4,
      com_1: 4, com_2: 5, com_3: 4,
      eq_1: 5, eq_2: 5, eq_3: 5,
      res_1: 5, res_2: 4, res_3: 4,
      adp_1: 4, adp_2: 5, adp_3: 4,
    },
    comments: {
      strengths: 'Gran compañera de fórmula Producto-Ingeniería. Siempre busca cómo resolver bloqueos con empatía.',
      improvements: 'A veces el exceso de trabajo le impide participar en los refinamientos tempranos de visión de producto.',
      recommendations: 'Mantener la sincronización semanal anticipada con diseño y producto.',
    },
    timestamp: '2026-03-07T16:20:00Z',
  },
  // 4. Subordinate evaluation
  {
    id: 'resp-4',
    campaignId: 'camp-tech-2026',
    subjectId: 'subj-1',
    evaluatorRole: 'subordinate',
    scores: {
      lid_1: 5, lid_2: 5, lid_3: 4,
      com_1: 4, com_2: 5, com_3: 5,
      eq_1: 5, eq_2: 5, eq_3: 5,
      res_1: 5, res_2: 5, res_3: 4,
      adp_1: 5, adp_2: 5, adp_3: 5,
    },
    comments: {
      strengths: 'Defiende al equipo, nos brinda un espacio seguro para experimentar y jamás culpa a nadie en incidentes.',
      improvements: 'Podría documentar más sus criterios de arquitectura para que no dependamos tanto de su validación.',
      recommendations: 'Continuar fomentando las sesiones de tech-talks internas que tanto nos inspiran.',
    },
    timestamp: '2026-03-08T11:45:00Z',
  },
  // Subject 2: Roberto Gómez (TechNova)
  {
    id: 'resp-5',
    campaignId: 'camp-tech-2026',
    subjectId: 'subj-2',
    evaluatorRole: 'self',
    evaluatorName: 'Roberto Gómez',
    scores: {
      lid_1: 4, lid_2: 3, lid_3: 4,
      com_1: 5, com_2: 4, com_3: 4,
      eq_1: 4, eq_2: 5, eq_3: 4,
      res_1: 4, res_2: 5, res_3: 4,
      adp_1: 5, adp_2: 4, adp_3: 4,
    },
    comments: {
      strengths: 'Visión centrada en el usuario y gran comunicación con clientes y ventas.',
      improvements: 'Profundizar entendimiento técnico de APIs para estimar mejor la complejidad.',
      recommendations: 'Tomar cursos avanzados de analítica de métricas de producto.',
    },
    timestamp: '2026-03-05T15:00:00Z',
  },
  {
    id: 'resp-6',
    campaignId: 'camp-tech-2026',
    subjectId: 'subj-2',
    evaluatorRole: 'manager',
    scores: {
      lid_1: 4, lid_2: 4, lid_3: 4,
      com_1: 5, com_2: 5, com_3: 4,
      eq_1: 4, eq_2: 4, eq_3: 4,
      res_1: 4, res_2: 4, res_3: 4,
      adp_1: 4, adp_2: 4, adp_3: 4,
    },
    comments: {
      strengths: 'Habilidad excepcional para negociar prioridades y mantener la moral del equipo alta.',
      improvements: 'Cerrar el ciclo de retrospectivas con compromisos medibles.',
      recommendations: 'Consolidar el roadmap trimestral con métricas de negocio claras.',
    },
    timestamp: '2026-03-06T12:00:00Z',
  },
];
