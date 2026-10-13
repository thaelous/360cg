import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  deleteDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { Campaign, EvaluatedSubject, EvaluationResponse, SubjectStats, EvaluatorRole, SurveyTemplate, TemplateQuestion } from '../types';
import { getFirebaseDb, isFirebaseConfigured } from '../firebase/config';
import { INITIAL_CAMPAIGNS, INITIAL_SUBJECTS, INITIAL_RESPONSES } from '../data/mockData';
import { DEFAULT_COMPETENCIES } from '../constants/competencies';
import { DEFAULT_SURVEY_TEMPLATES } from '../constants/defaultTemplates';
import {
  migrateSurveyTemplate,
  standardizeAndMigrateQuestions,
  REQUIRED_QUESTIONS_PER_TEMPLATE,
} from '../utils/templateMigration';

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

// PROMISE TIMEOUT HELPER (Evita cuelgues de red o bloqueos de Firestore)
export function withTimeout<T>(promise: Promise<T>, ms = 3000, fallbackValue: T | null = null): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallbackValue as T);
      }
    }, ms);

    promise
      .then((res) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(res);
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          console.warn('Operación asíncrona falló, aplicando fallback:', err);
          resolve(fallbackValue as T);
        }
      });
  });
}

// CACHED INSTANT GETTERS FOR ZERO-LATENCY DEMO DATA & VIEWS
export function getCachedCampaignByCode(clientCode: string): Campaign | null {
  const trimmed = clientCode.trim().toUpperCase();
  const localList = getLocalCampaigns();
  return (
    localList.find(
      (c) => c.clientCode.toUpperCase() === trimmed || c.id.toUpperCase() === trimmed
    ) || null
  );
}

export function getCachedCampaignById(id: string): Campaign | null {
  const localList = getLocalCampaigns();
  return localList.find((c) => c.id === id) || null;
}

export function getCachedSubjectById(id: string): EvaluatedSubject | null {
  const localList = getLocalSubjects();
  return localList.find((s) => s.id === id) || null;
}

export function getCachedSubjects(campaignId: string): EvaluatedSubject[] {
  return getLocalSubjects().filter((s) => s.campaignId === campaignId);
}

export function getCachedResponses(campaignId: string): EvaluationResponse[] {
  return getLocalResponses().filter((r) => r.campaignId === campaignId);
}

// CAMPAIGN METHODS
export async function getCampaigns(): Promise<Campaign[]> {
  const localCampaigns = getLocalCampaigns();
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const fetchPromise = getDocs(collection(db, 'campaigns')).then((snap) => {
        if (!snap.empty) {
          const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
          saveLocalCampaigns(fetched);
          return fetched;
        }
        return localCampaigns;
      });

      const result = await withTimeout(fetchPromise, 3000, localCampaigns);
      return result || localCampaigns;
    } catch (err) {
      console.warn('Firebase error fetching campaigns, falling back to local storage', err);
    }
  }
  return localCampaigns;
}

export async function getCampaignByCode(clientCode: string): Promise<Campaign | null> {
  const trimmed = clientCode.trim().toUpperCase();

  // 1. FAST-PATH (< 10ms): Si ya está en la memoria o localStorage, devolverlo INMEDIATAMENTE
  const cached = getCachedCampaignByCode(trimmed);
  if (cached) {
    // Sincronización en segundo plano sin bloquear la pantalla del usuario
    if (shouldUseFirebase()) {
      const db = getFirebaseDb();
      if (db) {
        getDocs(query(collection(db, 'campaigns'), where('clientCode', '==', trimmed)))
          .then((snap) => {
            if (!snap.empty) {
              const d = snap.docs[0];
              const remote = { id: d.id, ...d.data() } as Campaign;
              const all = getLocalCampaigns().filter((c) => c.id !== remote.id);
              saveLocalCampaigns([remote, ...all]);
            }
          })
          .catch(() => {});
      }
    }
    return cached;
  }

  // 2. Consulta en Firestore con límite estricto de 3.5 segundos
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const queryPromise = (async () => {
        const q = query(collection(db, 'campaigns'), where('clientCode', '==', trimmed));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          const remote = { id: d.id, ...d.data() } as Campaign;
          const all = getLocalCampaigns().filter((c) => c.id !== remote.id);
          saveLocalCampaigns([remote, ...all]);
          return remote;
        }
        return null;
      })();

      const remoteCampaign = await withTimeout(queryPromise, 3500, null);
      if (remoteCampaign) return remoteCampaign;
    } catch (err) {
      console.warn('Firebase error querying by code, falling back to local storage', err);
    }
  }

  const campaigns = getLocalCampaigns();
  const found = campaigns.find(
    (c) => c.clientCode.toUpperCase() === trimmed || c.id.toUpperCase() === trimmed
  );
  return found || null;
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  // 1. Fast path local inmediato (< 5ms)
  const localList = getLocalCampaigns();
  const localFound = localList.find((c) => c.id === id);
  if (localFound) return localFound;

  // 2. Consulta Firestore protegida con timeout
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const docPromise = (async () => {
        const docRef = doc(db, 'campaigns', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const remote = { id: snap.id, ...snap.data() } as Campaign;
          saveLocalCampaigns([remote, ...localList.filter((c) => c.id !== remote.id)]);
          return remote;
        }
        return null;
      })();

      const remote = await withTimeout(docPromise, 3500, null);
      if (remote) return remote;
    } catch (err) {
      console.warn('Firebase error getting campaign by ID', err);
    }
  }

  return null;
}

export async function createCampaign(data: {
  companyName: string;
  clientCode?: string;
  description?: string;
  deadline?: string;
  durationDays?: number;
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

  // Nueva lógica de vigencia: si se define durationDays, la campaña inicia en 'pending_start'
  // y startedAt / expiresAt permanecen nulos hasta que se registre la primera evaluación.
  const duration = typeof data.durationDays === 'number' && data.durationDays > 0 ? data.durationDays : undefined;
  const initialStatus = duration ? 'pending_start' : 'active';

  const newCampaign: Campaign = {
    id: `camp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    clientCode: code,
    companyName: data.companyName.trim(),
    description: data.description?.trim() || '',
    status: initialStatus,
    durationDays: duration,
    startedAt: null,
    expiresAt: null,
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
  status: 'active' | 'closed' | 'pending_start'
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
  const localSubjects = getLocalSubjects().filter((s) => s.campaignId === campaignId);

  // Si ya tenemos sujetos en local, devolverlos inmediatamente y sincronizar en segundo plano
  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    const fetchPromise = (async () => {
      const q = query(collection(db, 'evaluated_subjects'), where('campaignId', '==', campaignId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvaluatedSubject));
        const allSubjects = getLocalSubjects().filter((s) => s.campaignId !== campaignId);
        saveLocalSubjects([...remote, ...allSubjects]);
        return remote;
      }
      return localSubjects;
    })();

    if (localSubjects.length > 0) {
      // Sincronización transparente en background
      fetchPromise.catch(() => {});
      return localSubjects;
    }

    // Si aún no hay nada en local, esperar con timeout máximo de 3 segundos
    try {
      const result = await withTimeout(fetchPromise, 3000, localSubjects);
      return result || localSubjects;
    } catch {
      return localSubjects;
    }
  }

  return localSubjects;
}

export async function getSubjectById(id: string): Promise<EvaluatedSubject | null> {
  // 1. Fast path local inmediato (< 2ms)
  const cached = getCachedSubjectById(id);
  if (cached) return cached;

  const db = getFirebaseDb();
  if (shouldUseFirebase() && db) {
    try {
      const docPromise = (async () => {
        const snap = await getDoc(doc(db, 'evaluated_subjects', id));
        if (snap.exists()) {
          const remote = { id: snap.id, ...snap.data() } as EvaluatedSubject;
          const all = getLocalSubjects().filter((s) => s.id !== remote.id);
          saveLocalSubjects([remote, ...all]);
          return remote;
        }
        return null;
      })();

      const remote = await withTimeout(docPromise, 3000, null);
      if (remote) return remote;
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

export async function addBatchSubjects(
  campaignId: string,
  items: Array<{
    name: string;
    role: string;
    department: string;
    email?: string;
    targetEvaluators?: number;
  }>
): Promise<EvaluatedSubject[]> {
  const newSubjects: EvaluatedSubject[] = items.map((item, idx) => ({
    id: `subj-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    campaignId,
    name: item.name.trim(),
    role: item.role?.trim() || 'Colaborador',
    department: item.department?.trim() || 'General',
    email: item.email?.trim() || '',
    targetEvaluators: item.targetEvaluators && item.targetEvaluators > 0 ? item.targetEvaluators : 5,
    createdAt: new Date().toISOString(),
  }));

  const db = getFirebaseDb();
  if (shouldUseFirebase() && db && newSubjects.length > 0) {
    try {
      // Dividir en bloques de máximo 450 operaciones por batch de Firestore
      const CHUNK_SIZE = 450;
      for (let i = 0; i < newSubjects.length; i += CHUNK_SIZE) {
        const chunk = newSubjects.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((sub) => {
          const docRef = doc(db, 'evaluated_subjects', sub.id);
          batch.set(docRef, sub);
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Firebase writeBatch failed, saving locally:', err);
    }
  }

  // Guardar en caché local
  const currentSubjects = getLocalSubjects();
  const updatedSubjects = [...newSubjects, ...currentSubjects];
  saveLocalSubjects(updatedSubjects);

  return newSubjects;
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
  let localList = getLocalResponses();
  if (campaignId) {
    localList = localList.filter((r) => r.campaignId === campaignId);
  }
  if (subjectId) {
    localList = localList.filter((r) => r.subjectId === subjectId);
  }

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
        const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvaluationResponse));
        // Update local storage cache
        const allResps = getLocalResponses();
        const otherResps = allResps.filter((r) => {
          if (campaignId && subjectId) return r.campaignId !== campaignId || r.subjectId !== subjectId;
          if (campaignId) return r.campaignId !== campaignId;
          if (subjectId) return r.subjectId !== subjectId;
          return false;
        });
        saveLocalResponses([...remote, ...otherResps]);
        return remote;
      } else if (localList.length > 0) {
        return localList;
      }
    } catch (err) {
      console.warn('Firebase get responses error', err);
      if (localList.length > 0) return localList;
    }
  }

  return localList;
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
  // 1. Verificación previa de vigencia de la campaña
  const campaign = await getCampaignById(data.campaignId);
  if (campaign) {
    if (campaign.status === 'closed') {
      throw new Error('La campaña de evaluación se encuentra actualmente cerrada.');
    }

    if (campaign.expiresAt) {
      const expTime = new Date(campaign.expiresAt).getTime();
      if (!isNaN(expTime) && Date.now() > expTime) {
        throw new Error('El periodo de evaluación para esta campaña ha concluido y no se permiten más respuestas.');
      }
    } else if (campaign.deadline && !campaign.durationDays) {
      const deadTime = new Date(`${campaign.deadline}T23:59:59`).getTime();
      if (!isNaN(deadTime) && Date.now() > deadTime) {
        throw new Error('El periodo de evaluación para esta campaña ha concluido y no se permiten más respuestas.');
      }
    }
  }

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
    } catch (err) {
      console.warn('Firebase submit response error, saving locally', err);
    }
  }

  const responses = getLocalResponses();
  const updated = [newResponse, ...responses];
  saveLocalResponses(updated);

  // 2. Disparador en la primera respuesta:
  // Si la campaña asociada tiene startedAt en null o status === 'pending_start',
  // actualiza startedAt a ahora, expiresAt a fecha actual + durationDays, y status a 'active'.
  if (campaign && !campaign.startedAt) {
    try {
      const duration = campaign.durationDays || 30; // 30 días si no se especificó
      const now = new Date();
      const startedAt = now.toISOString();
      const expiresAtDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
      const expiresAt = expiresAtDate.toISOString();
      const deadline = expiresAtDate.toISOString().split('T')[0];

      const patch: Partial<Campaign> = {
        startedAt,
        expiresAt,
        deadline,
        status: 'active',
      };

      if (shouldUseFirebase() && db) {
        await updateDoc(doc(db, 'campaigns', campaign.id), patch).catch((err) => {
          console.warn('Firebase error triggering campaign start', err);
        });
      }

      const allCamps = getLocalCampaigns();
      const updatedCamps = allCamps.map((c) =>
        c.id === campaign.id
          ? {
              ...c,
              ...patch,
            }
          : c
      );
      saveLocalCampaigns(updatedCamps);
    } catch (err) {
      console.error('Error activating campaign on first response', err);
    }
  }

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
      difference: selfCount > 0 && othersCount > 0 ? Number((selfAvg - othersAvg).toFixed(2)) : 0,
    },
  };
}
