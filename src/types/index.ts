export type EvaluatorRole = 'self' | 'manager' | 'peer' | 'subordinate';

export const EVALUATOR_ROLES_INFO: Record<
  EvaluatorRole,
  { label: string; description: string; icon: string; color: string; bg: string }
> = {
  self: {
    label: 'Autoevaluación',
    description: 'Mi propia percepción sobre mi desempeño y conductas',
    icon: 'User',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200'
  },
  manager: {
    label: 'Jefe Directo / Líder',
    description: 'Supervisión directa, cumplimiento de metas y liderazgo',
    icon: 'Briefcase',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200'
  },
  peer: {
    label: 'Par / Colega del Mismo Nivel',
    description: 'Colaboración diaria, comunicación horizontal y sinergia',
    icon: 'Users',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200'
  },
  subordinate: {
    label: 'Colaborador a Cargo',
    description: 'Acompañamiento, empatía, feedback y dirección de equipo',
    icon: 'Award',
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200'
  }
};

export interface TemplateQuestion {
  id: string;
  category: string; // e.g. "Toma de Decisiones"
  text: string;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  targetIndustry: string;
  description: string;
  isDefault: boolean;
  questions: TemplateQuestion[];
  createdAt: string;
}

export type CampaignStatus = 'active' | 'closed' | 'pending_start';

export interface Campaign {
  id: string;
  clientCode: string; // e.g. CORP-2026-X
  companyName: string;
  description?: string;
  status: CampaignStatus;
  createdAt: string; // ISO string
  deadline?: string;
  durationDays?: number;
  startedAt?: string | null;
  expiresAt?: string | null;
  competencyIds?: string[];
  templateId?: string;
  templateName?: string;
  questions?: TemplateQuestion[];
}

export interface EvaluatedSubject {
  id: string;
  campaignId: string;
  name: string;
  role: string; // cargo
  department: string;
  email?: string;
  targetEvaluators?: number; // Target number of evaluations (e.g. 5)
  createdAt: string;
}

export interface CompetencyScore {
  competencyId: string;
  score: number; // 1 to 5 average for this competency
  itemScores?: Record<string, number>; // questionId -> score
}

export interface EvaluationResponse {
  id: string;
  campaignId: string;
  subjectId: string;
  evaluatorRole: EvaluatorRole;
  evaluatorName?: string; // Optional (can be anonymous)
  scores: Record<string, number>; // competencyId -> average score (1-5) or questionId -> score
  comments: {
    strengths: string;
    improvements: string;
    recommendations: string;
  };
  timestamp: string; // ISO string
}

export interface CompetencyQuestion {
  id: string;
  text: string;
  description?: string;
}

export interface CompetencyDefinition {
  id: string;
  name: string;
  description: string;
  iconName: string;
  questions: CompetencyQuestion[];
}

export interface SubjectStats {
  subject: EvaluatedSubject;
  totalResponses: number;
  byRole: Record<EvaluatorRole, number>;
  overallAverage: number;
  competencyAverages: Record<string, number>;
  roleAverages: Partial<Record<EvaluatorRole, Record<string, number>>>;
  gapAnalysis: {
    selfAverage: number;
    othersAverage: number;
    difference: number; // Self - Others
  };
}

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
