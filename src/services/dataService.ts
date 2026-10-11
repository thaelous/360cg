import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import { Campaign, EvaluatedSubject, EvaluationResponse, SubjectStats, EvaluatorRole, SurveyTemplate, TemplateQuestion } from '../types';
import { getFirebaseDb, isFirebaseConfigured } from '../firebase/config';
import { INITIAL_CAMPAIGNS, INITIAL_SUBJECTS, INITIAL_RESPONSES } from '../data/mockData';
import { DEFAULT_COMPETENCIES } from '../constants/competencies';
import { DEFAULT_SURVEY_TEMPLATES } from '../constants/defaultTemplates';

const LS_CAMPAIGNS_KEY = 'talent360_local_campaigns';
const LS_SUBJECTS_KEY = 'talent360_local_subjects';
const LS_RESPONSES_KEY = 'talent360_local_responses';
const LS_TEMPLATES_KEY = 'talent360_local_templates';
const LS_FORCE_MOCK_KEY = 'talent360_force_mock_mode';

// Helper to check if force mock mode is active
export function isMockModeForced(): boolean {
  return localStorage.getItem(LS_FORCE_MOCK_KEY) === 'true';
}

export function setMockModeForced(force: boolean) {
  localStorage.setItem(LS_FORCE_MOCK_KEY, force ? 'true' : 'false');
}

export function shouldUseFirebase(): boolean {
  if (isMockModeForced()) return false;
  return isFirebaseConfigured();
}

// Local Storage Initializers
function getLocalCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(LS_CAMPAIGNS_KEY);
    if (raw) {
      const list: Campaign[] = JSON.parse(raw);
      let updated = false;
      const patched = list.map((c) => {
        if (!c.questions || c.questions.length !== 20) {
          updated = true;
          const matchingTemplate =
            DEFAULT_SURVEY_TEMPLATES.find((t) => t.id === c.templateId) || DEFAULT_SURVEY_TEMPLATES[0];
          return {
            ...c,
            templateId: c.templateId || matchingTemplate.id,
            templateName: c.templateName || matchingTemplate.name,
            questions: matchingTemplate.questions,
          };
        }
        return c;
      });
      if (updated) {
        localStorage.setItem(LS_CAMPAIGNS_KEY, JSON.stringify(patched));
      }
      return patched;
    }
  } catch (e) {
    console.error(e);
  }
  // Initialize with initial data
  localStorage.setItem(LS_CAMPAIGNS_KEY, JSON.stringify(INITIAL_CAMPAIGNS));
  return INITIAL_CAMPAIGNS;
}

function saveLocalCampaigns(campaigns: Campaign[]) {
  localStorage.setItem(LS_CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

function getLocalSubjects(): EvaluatedSubject[] {
  try {
    const raw = localStorage.getItem(LS_SUBJECTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(LS_SUBJECTS_KEY, JSON.stringify(INITIAL_SUBJECTS));
  return INITIAL_SUBJECTS;
}

function saveLocalSubjects(subjects: EvaluatedSubject[]) {
  localStorage.setItem(LS_SUBJECTS_KEY, JSON.stringify(subjects));
}

function getLocalResponses(): EvaluationResponse[] {
  try {
    const raw = localStorage.getItem(LS_RESPONSES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(LS_RESPONSES_KEY, JSON.stringify(INITIAL_RESPONSES));
  return INITIAL_RESPONSES;
}

function saveLocalResponses(responses: EvaluationResponse[]) {
  localStorage.setItem(LS_RESPONSES_KEY, JSON.stringify(responses));
}

import {
  migrateSurveyTemplate,
  standardizeAndMigrateQuestions,
  REQUIRED_QUESTIONS_PER_TEMPLATE,
} from '../utils/templateMigration';

// TEMPLATE LOCAL STORAGE HELPERS
function getLocalTemplates(): SurveyTemplate[] {
  try {
    const raw = localStorage.getItem(LS_TEMPLATES_KEY);
    if (raw) {
      const parsed: SurveyTemplate[] = JSON.parse(raw);
      const defaultIds = new Set(DEFAULT_SURVEY_TEMPLATES.map((t) => t.id));
      let hasChanges = false;

      // Migrate each template so all of them strictly comply with 20 questions
      const migratedTemplates = parsed.map((item) => {
        if (defaultIds.has(item.id)) {
          const pristine = DEFAULT_SURVEY_TEMPLATES.find((t) => t.id === item.id);
          if (pristine && (!item.questions || item.questions.length !== REQUIRED_QUESTIONS_PER_TEMPLATE)) {
            hasChanges = true;
            return pristine;
          }
        }
        const { migrated, changed } = migrateSurveyTemplate(item);
        if (changed) hasChanges = true;
        return migrated;
      });

      // Ensure all 5 default templates are present
      for (const defTpl of DEFAULT_SURVEY_TEMPLATES) {
        if (!migratedTemplates.some((t) => t.id === defTpl.id)) {
          migratedTemplates.push(defTpl);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(migratedTemplates));
      }
      return migratedTemplates;
    }
  } catch (e) {
    console.error('Error loading local templates:', e);
  }
  localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(DEFAULT_SURVEY_TEMPLATES));
  return DEFAULT_SURVEY_TEMPLATES;
}

function saveLocalTemplates(templates: SurveyTemplate[]) {
  // Always ensure all saved templates are standardized to 20 questions
  const sanitized = templates.map((t) => migrateSurveyTemplate(t).migrated);
  localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(sanitized));
}

export async function seedDefaultTemplatesToFirestore(dbInstance?: Firestore | null) {
  const targetDb = dbInstance || getFirebaseDb();
  if (!targetDb) return;
  try {
    for (const tpl of DEFAULT_SURVEY_TEMPLATES) {
      await setDoc(doc(targetDb, 'survey_templates', tpl.id), tpl);
    }
    console.log('5 default survey templates seeded to Firestore (20 questions each)');
  } catch (err) {
    console.warn('Error seeding survey templates to Firestore:', err);
  }
}

export async function getSurveyTemplates(): Promise<SurveyTemplate[]> {
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const colRef = collection(db, 'survey_templates');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SurveyTemplate));
        const defaultMap = new Map(DEFAULT_SURVEY_TEMPLATES.map((t) => [t.id, t]));
        const normalized: SurveyTemplate[] = [];

        for (const item of fetched) {
          if (defaultMap.has(item.id)) {
            const defTpl = defaultMap.get(item.id)!;
            if (!item.questions || item.questions.length !== REQUIRED_QUESTIONS_PER_TEMPLATE) {
              await setDoc(doc(db, 'survey_templates', item.id), defTpl);
              normalized.push(defTpl);
              continue;
            }
          }
          // Validate and migrate custom or imported templates
          const { migrated, changed } = migrateSurveyTemplate(item);
          if (changed) {
            console.log(`Migrated template "${item.name}" to 20 questions standard in Firestore`);
            await setDoc(doc(db, 'survey_templates', item.id), migrated);
          }
          normalized.push(migrated);
        }

        // Ensure all 5 default templates exist in Firestore
        for (const defTpl of DEFAULT_SURVEY_TEMPLATES) {
          if (!normalized.some((t) => t.id === defTpl.id)) {
            await setDoc(doc(db, 'survey_templates', defTpl.id), defTpl);
            normalized.push(defTpl);
          }
        }

        return normalized;
      } else {
        // Auto-seed default templates to Firestore
        await seedDefaultTemplatesToFirestore(db);
        return DEFAULT_SURVEY_TEMPLATES;
      }
    } catch (err) {
      console.warn('Firebase error fetching survey templates, falling back to local', err);
    }
  }
  return getLocalTemplates();
}

export async function getSurveyTemplateById(id: string): Promise<SurveyTemplate | null> {
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const snap = await getDoc(doc(db, 'survey_templates', id));
      if (snap.exists()) {
        const rawTemplate = { id: snap.id, ...snap.data() } as SurveyTemplate;
        const { migrated, changed } = migrateSurveyTemplate(rawTemplate);
        if (changed) {
          await setDoc(doc(db, 'survey_templates', id), migrated);
        }
        return migrated;
      }
    } catch (err) {
      console.warn('Firebase error getting template by ID', err);
    }
  }
  const templates = getLocalTemplates();
  const found = templates.find((t) => t.id === id);
  if (found) {
    const { migrated } = migrateSurveyTemplate(found);
    return migrated;
  }
  return null;
}

export async function createSurveyTemplate(templateData: {
  name: string;
  targetIndustry: string;
  description: string;
  questions: TemplateQuestion[];
  isDefault?: boolean;
}): Promise<SurveyTemplate> {
  // Validate and enforce 20 questions distributed in competencies
  const { questions: standardizedQuestions } = standardizeAndMigrateQuestions(
    templateData.questions || []
  );

  const newTemplate: SurveyTemplate = {
    id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: templateData.name.trim(),
    targetIndustry: templateData.targetIndustry.trim() || 'General',
    description: templateData.description.trim(),
    isDefault: templateData.isDefault || false,
    questions: standardizedQuestions,
    createdAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      await setDoc(doc(db, 'survey_templates', newTemplate.id), newTemplate);
      return newTemplate;
    } catch (err) {
      console.warn('Firebase save template failed, saving locally', err);
    }
  }

  const templates = getLocalTemplates();
  const updated = [newTemplate, ...templates];
  saveLocalTemplates(updated);
  return newTemplate;
}

export async function updateSurveyTemplate(
  id: string,
  updates: Partial<Omit<SurveyTemplate, 'id' | 'createdAt'>>
): Promise<void> {
  const finalUpdates: any = { ...updates };
  if (finalUpdates.questions) {
    const { questions: standardized } = standardizeAndMigrateQuestions(finalUpdates.questions);
    finalUpdates.questions = standardized;
  }

  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      await updateDoc(doc(db, 'survey_templates', id), finalUpdates);
      return;
    } catch (err) {
      console.warn('Firebase update template failed', err);
    }
  }

  const templates = getLocalTemplates();
  const updated = templates.map((t) => (t.id === id ? { ...t, ...finalUpdates } : t));
  saveLocalTemplates(updated);
}

export async function deleteSurveyTemplate(id: string): Promise<void> {
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      await deleteDoc(doc(db, 'survey_templates', id));
      return;
    } catch (err) {
      console.warn('Firebase delete template failed', err);
    }
  }

  const templates = getLocalTemplates().filter((t) => t.id !== id);
  saveLocalTemplates(templates);
}

export async function duplicateSurveyTemplate(id: string): Promise<SurveyTemplate> {
  const original = await getSurveyTemplateById(id);
  if (!original) {
    throw new Error('Plantilla original no encontrada');
  }

  return createSurveyTemplate({
    name: `${original.name} (Copia)`,
    targetIndustry: original.targetIndustry,
    description: original.description,
    questions: original.questions.map((q) => ({
      ...q,
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    })),
    isDefault: false,
  });
}

/**
 * Migration Script to Audit and Standardize All Templates & Campaigns
 * Ensures all questionnaires have EXACTLY 20 questions distributed in competencies.
 */
export async function migrateAllTemplatesToStandard(): Promise<{
  totalTemplates: number;
  migratedTemplates: number;
  migratedCampaigns: number;
  details: string[];
}> {
  const details: string[] = [];
  let migratedTemplates = 0;
  let migratedCampaigns = 0;

  // 1. Audit & migrate templates
  const allTemplates = await getSurveyTemplates();
  for (const tpl of allTemplates) {
    const { migrated, changed, log } = migrateSurveyTemplate(tpl);
    if (changed) {
      migratedTemplates++;
      details.push(`Plantilla "${tpl.name}" ajustada de ${tpl.questions.length} a 20 preguntas.`);
      log.forEach((l) => details.push(`  - ${l}`));

      const db = getFirebaseDb();
      if (shouldUseFirebase() && db) {
        try {
          await setDoc(doc(db, 'survey_templates', tpl.id), migrated);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  // Update local storage
  saveLocalTemplates(allTemplates);

  // 2. Audit campaigns to ensure their embedded questions have 20 items
  const campaigns = await getCampaigns();
  for (const camp of campaigns) {
    if (!camp.questions || camp.questions.length !== REQUIRED_QUESTIONS_PER_TEMPLATE) {
      migratedCampaigns++;
      const matchingTemplate =
        allTemplates.find((t) => t.id === camp.templateId) ||
        DEFAULT_SURVEY_TEMPLATES[0];

      const updatedCamp: Campaign = {
        ...camp,
        templateId: camp.templateId || matchingTemplate.id,
        templateName: camp.templateName || matchingTemplate.name,
        questions: matchingTemplate.questions,
      };

      details.push(`Campaña "${camp.companyName}" (${camp.clientCode}) actualizada a 20 preguntas.`);

      const db = getFirebaseDb();
      if (shouldUseFirebase() && db) {
        try {
          await setDoc(doc(db, 'campaigns', camp.id), updatedCamp);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  // Save local campaigns
  const localCamps = getLocalCampaigns();
  saveLocalCampaigns(localCamps);

  return {
    totalTemplates: allTemplates.length,
    migratedTemplates,
    migratedCampaigns,
    details,
  };
}

export async function seedMockDataToFirestore(dbInstance?: Firestore | null) {
  const targetDb = dbInstance || getFirebaseDb();
  if (!targetDb) return;
  try {
    for (const c of INITIAL_CAMPAIGNS) {
      await setDoc(doc(targetDb, 'campaigns', c.id), c);
    }
    for (const s of INITIAL_SUBJECTS) {
      await setDoc(doc(targetDb, 'evaluated_subjects', s.id), s);
    }
    for (const r of INITIAL_RESPONSES) {
      await setDoc(doc(targetDb, 'responses', r.id), r);
    }
    for (const t of DEFAULT_SURVEY_TEMPLATES) {
      await setDoc(doc(targetDb, 'survey_templates', t.id), t);
    }
    console.log('Initial 360 data & templates seeded to Firestore');
  } catch (err) {
    console.warn('Auto-seed to Firestore note:', err);
  }
}

export async function resetToMockData() {
  localStorage.setItem(LS_CAMPAIGNS_KEY, JSON.stringify(INITIAL_CAMPAIGNS));
  localStorage.setItem(LS_SUBJECTS_KEY, JSON.stringify(INITIAL_SUBJECTS));
  localStorage.setItem(LS_RESPONSES_KEY, JSON.stringify(INITIAL_RESPONSES));
  localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(DEFAULT_SURVEY_TEMPLATES));
  const db = getFirebaseDb();
  if (db) {
    await seedMockDataToFirestore(db);
  }
}

// CAMPAIGN METHODS
export async function getCampaigns(): Promise<Campaign[]> {
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const colRef = collection(db, 'campaigns');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
      } else {
        // Auto-seed to Firestore so the user's project is populated
        await seedMockDataToFirestore(db);
        return INITIAL_CAMPAIGNS;
      }
    } catch (err) {
      console.warn('Firebase error fetching campaigns, falling back to local storage', err);
    }
  }
  return getLocalCampaigns();
}

export async function getCampaignByCode(clientCode: string): Promise<Campaign | null> {
  const trimmed = clientCode.trim().toUpperCase();
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const q = query(collection(db, 'campaigns'), where('clientCode', '==', trimmed));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() } as Campaign;
      }
    } catch (err) {
      console.warn('Firebase error querying by code, falling back to local storage', err);
    }
  }

  const campaigns = getLocalCampaigns();
  const found = campaigns.find((c) => c.clientCode.toUpperCase() === trimmed);
  return found || null;
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const docRef = doc(db, 'campaigns', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Campaign;
      }
    } catch (err) {
      console.warn('Firebase error getting campaign by ID', err);
    }
  }

  const campaigns = getLocalCampaigns();
  return campaigns.find((c) => c.id === id) || null;
}

export async function createCampaign(data: {
  companyName: string;
  clientCode?: string;
  description?: string;
  deadline?: string;
  competencyIds?: string[];
  templateId?: string;
  templateName?: string;
  questions?: TemplateQuestion[];
}): Promise<Campaign> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const code = (
    data.clientCode ||
    `${data.companyName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'CORP')}-${new Date().getFullYear()}-${randomSuffix}`
  ).toUpperCase().trim();

  let selectedQuestions: TemplateQuestion[] | undefined = data.questions;
  let selectedTemplateName = data.templateName;

  if (data.templateId && (!selectedQuestions || selectedQuestions.length === 0)) {
    const tpl = await getSurveyTemplateById(data.templateId);
    if (tpl) {
      selectedQuestions = tpl.questions;
      selectedTemplateName = tpl.name;
    }
  }

  const newCampaign: Campaign = {
    id: `camp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    clientCode: code,
    companyName: data.companyName.trim(),
    description: data.description?.trim() || '',
    status: 'active',
    createdAt: new Date().toISOString(),
    deadline: data.deadline,
    competencyIds: data.competencyIds || DEFAULT_COMPETENCIES.map((c) => c.id),
    templateId: data.templateId,
    templateName: selectedTemplateName,
    questions: selectedQuestions,
  };

  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      await setDoc(doc(db, 'campaigns', newCampaign.id), newCampaign);
      return newCampaign;
    } catch (err) {
      console.warn('Firebase save campaign failed, persisting to local storage', err);
    }
  }

  const campaigns = getLocalCampaigns();
  const updated = [newCampaign, ...campaigns];
  saveLocalCampaigns(updated);
  return newCampaign;
}

export async function updateCampaignStatus(
  campaignId: string,
  status: 'active' | 'closed'
): Promise<void> {
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), { status });
      return;
    } catch (err) {
      console.warn('Firebase update campaign status failed', err);
    }
  }

  const campaigns = getLocalCampaigns();
  const updated = campaigns.map((c) => (c.id === campaignId ? { ...c, status } : c));
  saveLocalCampaigns(updated);
}

// SUBJECT METHODS
export async function getSubjects(campaignId: string): Promise<EvaluatedSubject[]> {
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const q = query(collection(db, 'evaluated_subjects'), where('campaignId', '==', campaignId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvaluatedSubject));
      }
    } catch (err) {
      console.warn('Firebase get subjects error', err);
    }
  }

  const subjects = getLocalSubjects();
  return subjects.filter((s) => s.campaignId === campaignId);
}

export async function getSubjectById(id: string): Promise<EvaluatedSubject | null> {
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const snap = await getDoc(doc(db, 'evaluated_subjects', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as EvaluatedSubject;
      }
    } catch (err) {
      console.warn('Firebase get subject by ID error', err);
    }
  }

  const subjects = getLocalSubjects();
  return subjects.find((s) => s.id === id) || null;
}

export async function addSubject(data: {
  campaignId: string;
  name: string;
  role: string;
  department: string;
  email?: string;
  targetEvaluators?: number;
}): Promise<EvaluatedSubject> {
  const newSubject: EvaluatedSubject = {
    id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    campaignId: data.campaignId,
    name: data.name.trim(),
    role: data.role.trim(),
    department: data.department.trim(),
    email: data.email?.trim() || '',
    targetEvaluators: data.targetEvaluators || 5,
    createdAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      await setDoc(doc(db, 'evaluated_subjects', newSubject.id), newSubject);
      return newSubject;
    } catch (err) {
      console.warn('Firebase add subject error, saving locally', err);
    }
  }

  const subjects = getLocalSubjects();
  const updated = [newSubject, ...subjects];
  saveLocalSubjects(updated);
  return newSubject;
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      await deleteDoc(doc(db, 'evaluated_subjects', subjectId));
      return;
    } catch (err) {
      console.warn('Firebase delete subject error', err);
    }
  }

  const subjects = getLocalSubjects().filter((s) => s.id !== subjectId);
  saveLocalSubjects(subjects);
}

// RESPONSES METHODS
export async function getResponses(campaignId?: string, subjectId?: string): Promise<EvaluationResponse[]> {
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      let q = query(collection(db, 'responses'));
      if (campaignId && subjectId) {
        q = query(
          collection(db, 'responses'),
          where('campaignId', '==', campaignId),
          where('subjectId', '==', subjectId)
        );
      } else if (campaignId) {
        q = query(collection(db, 'responses'), where('campaignId', '==', campaignId));
      } else if (subjectId) {
        q = query(collection(db, 'responses'), where('subjectId', '==', subjectId));
      }
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvaluationResponse));
      }
    } catch (err) {
      console.warn('Firebase get responses error', err);
    }
  }

  let list = getLocalResponses();
  if (campaignId) {
    list = list.filter((r) => r.campaignId === campaignId);
  }
  if (subjectId) {
    list = list.filter((r) => r.subjectId === subjectId);
  }
  return list;
}

export async function submitResponse(data: {
  campaignId: string;
  subjectId: string;
  evaluatorRole: EvaluatorRole;
  evaluatorName?: string;
  scores: Record<string, number>;
  comments: {
    strengths: string;
    improvements: string;
    recommendations: string;
  };
}): Promise<EvaluationResponse> {
  const newResponse: EvaluationResponse = {
    id: `resp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    campaignId: data.campaignId,
    subjectId: data.subjectId,
    evaluatorRole: data.evaluatorRole,
    evaluatorName: data.evaluatorName?.trim() || '',
    scores: data.scores,
    comments: {
      strengths: data.comments.strengths.trim(),
      improvements: data.comments.improvements.trim(),
      recommendations: data.comments.recommendations.trim(),
    },
    timestamp: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      await setDoc(doc(db, 'responses', newResponse.id), newResponse);
      return newResponse;
    } catch (err) {
      console.warn('Firebase submit response error, saving locally', err);
    }
  }

  const responses = getLocalResponses();
  const updated = [newResponse, ...responses];
  saveLocalResponses(updated);
  return newResponse;
}

// REPORT & STATS CALCULATION HELPER
export function calculateSubjectStats(
  subject: EvaluatedSubject,
  responses: EvaluationResponse[],
  customQuestions?: TemplateQuestion[]
): SubjectStats {
  const byRole: Record<EvaluatorRole, number> = {
    self: 0,
    manager: 0,
    peer: 0,
    subordinate: 0,
  };

  responses.forEach((r) => {
    if (byRole[r.evaluatorRole] !== undefined) {
      byRole[r.evaluatorRole]++;
    }
  });

  // Extract categories definition: either from customQuestions or DEFAULT_COMPETENCIES
  const categoriesList: { id: string; name: string; questionIds: string[] }[] = [];

  if (customQuestions && customQuestions.length > 0) {
    const catsMap = new Map<string, string[]>();
    customQuestions.forEach((q) => {
      const cat = q.category || 'General';
      if (!catsMap.has(cat)) {
        catsMap.set(cat, []);
      }
      catsMap.get(cat)!.push(q.id);
    });

    catsMap.forEach((qIds, catName) => {
      categoriesList.push({
        id: catName,
        name: catName,
        questionIds: qIds,
      });
    });
  } else {
    DEFAULT_COMPETENCIES.forEach((c) => {
      categoriesList.push({
        id: c.id,
        name: c.name,
        questionIds: c.questions.map((q) => q.id),
      });
    });
  }

  // Calculate scores per competency
  const competencyTotals: Record<string, { sum: number; count: number }> = {};
  const roleCompetencyTotals: Record<
    EvaluatorRole,
    Record<string, { sum: number; count: number }>
  > = {
    self: {},
    manager: {},
    peer: {},
    subordinate: {},
  };

  categoriesList.forEach((c) => {
    competencyTotals[c.id] = { sum: 0, count: 0 };
    (['self', 'manager', 'peer', 'subordinate'] as EvaluatorRole[]).forEach((role) => {
      roleCompetencyTotals[role][c.id] = { sum: 0, count: 0 };
    });
  });

  let grandSum = 0;
  let grandCount = 0;

  let selfSum = 0;
  let selfCount = 0;

  let othersSum = 0;
  let othersCount = 0;

  responses.forEach((resp) => {
    const role = resp.evaluatorRole;
    categoriesList.forEach((comp) => {
      const qIds = comp.questionIds;
      let compSumForResp = 0;
      let compCountForResp = 0;

      qIds.forEach((qid) => {
        if (resp.scores[qid] !== undefined && typeof resp.scores[qid] === 'number') {
          const val = resp.scores[qid];
          compSumForResp += val;
          compCountForResp++;
          grandSum += val;
          grandCount++;

          if (role === 'self') {
            selfSum += val;
            selfCount++;
          } else {
            othersSum += val;
            othersCount++;
          }
        }
      });

      if (compCountForResp > 0) {
        const avg = compSumForResp / compCountForResp;
        competencyTotals[comp.id].sum += avg;
        competencyTotals[comp.id].count += 1;

        roleCompetencyTotals[role][comp.id].sum += avg;
        roleCompetencyTotals[role][comp.id].count += 1;
      }
    });
  });

  const competencyAverages: Record<string, number> = {};
  categoriesList.forEach((comp) => {
    const t = competencyTotals[comp.id];
    competencyAverages[comp.id] = t.count > 0 ? Number((t.sum / t.count).toFixed(2)) : 0;
  });

  const roleAverages: Partial<Record<EvaluatorRole, Record<string, number>>> = {};
  (['self', 'manager', 'peer', 'subordinate'] as EvaluatorRole[]).forEach((role) => {
    roleAverages[role] = {};
    categoriesList.forEach((comp) => {
      const t = roleCompetencyTotals[role][comp.id];
      roleAverages[role]![comp.id] = t.count > 0 ? Number((t.sum / t.count).toFixed(2)) : 0;
    });
  });

  const overallAverage = grandCount > 0 ? Number((grandSum / grandCount).toFixed(2)) : 0;
  const selfAvg = selfCount > 0 ? Number((selfSum / selfCount).toFixed(2)) : 0;
  const othersAvg = othersCount > 0 ? Number((othersSum / othersCount).toFixed(2)) : 0;

  return {
    subject,
    totalResponses: responses.length,
    byRole,
    overallAverage,
    competencyAverages,
    roleAverages,
    gapAnalysis: {
      selfAverage: selfAvg,
      othersAverage: othersAvg,
      difference: selfAvg && othersAvg ? Number((selfAvg - othersAvg).toFixed(2)) : 0,
    },
  };
}
