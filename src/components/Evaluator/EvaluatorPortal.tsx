import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MessageSquare,
  Award,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Send,
  Building,
  Building2,
  User,
  Shield,
  RotateCcw,
  Loader2,
  Clock,
  CalendarX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Campaign,
  EvaluatedSubject,
  EvaluatorRole,
  EVALUATOR_ROLES_INFO,
} from '../../types';
import { DEFAULT_COMPETENCIES, LIKERT_SCALE } from '../../constants/competencies';
import {
  getCampaignByCode,
  getCampaignById,
  getSubjectById,
  getSubjects,
  getCachedCampaignByCode,
  getCachedCampaignById,
  getCachedSubjectById,
  getCachedSubjects,
  submitResponse,
  getCampaigns,
  withTimeout,
} from '../../services/dataService';
import { getCampaignValidityInfo } from '../../utils/campaignValidity';

interface EvaluatorPortalProps {
  initialCode?: string;
  initialSubjectId?: string;
  evaluatorSubjectId?: string;
  evaluatorCompanyId?: string;
  onNavigateHome?: () => void;
}

export const EvaluatorPortal: React.FC<EvaluatorPortalProps> = ({
  initialCode = '',
  initialSubjectId = '',
  evaluatorSubjectId = '',
  evaluatorCompanyId = '',
  onNavigateHome,
}) => {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlSubId = urlParams ? urlParams.get('evaluar') || urlParams.get('id') || urlParams.get('subject') || '' : '';
  const urlCompRef = urlParams ? urlParams.get('campana') || urlParams.get('empresa') || urlParams.get('code') || '' : '';

  const targetSubjectId = evaluatorSubjectId || initialSubjectId || urlSubId;
  const targetCompanyRef = evaluatorCompanyId || initialCode || urlCompRef;

  // Step: 'code_entry' | 'select_subject_role' | 'questionnaire' | 'comments' | 'completed'
  const [step, setStep] = useState<'code_entry' | 'select_subject_role' | 'questionnaire' | 'comments' | 'completed'>(() => {
    if (evaluatorSubjectId || initialSubjectId || urlSubId || evaluatorCompanyId || initialCode || urlCompRef) {
      return 'select_subject_role';
    }
    return 'code_entry';
  });

  // Fast initial priming from cache (< 5ms)
  const initialCachedSub = targetSubjectId ? getCachedSubjectById(targetSubjectId) : null;
  const initialCachedCamp = targetCompanyRef
    ? getCachedCampaignByCode(targetCompanyRef) || getCachedCampaignById(targetCompanyRef)
    : initialCachedSub
    ? getCachedCampaignById(initialCachedSub.campaignId)
    : null;
  const initialCachedSubjects = initialCachedCamp ? getCachedSubjects(initialCachedCamp.id) : [];

  const [clientCode, setClientCode] = useState(initialCode || initialCachedCamp?.clientCode || '');
  const [campaign, setCampaign] = useState<Campaign | null>(initialCachedCamp);
  const [subjects, setSubjects] = useState<EvaluatedSubject[]>(() => {
    if (initialCachedSubjects.length > 0) return initialCachedSubjects;
    if (initialCachedSub) return [initialCachedSub];
    return [];
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState(() => {
    if (targetSubjectId) return targetSubjectId;
    if (initialCachedSubjects.length === 1) return initialCachedSubjects[0].id;
    return '';
  });
  const [evaluatorRole, setEvaluatorRole] = useState<EvaluatorRole>('peer');
  const [evaluatorName, setEvaluatorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Questionnaire state
  const [currentCompetencyIndex, setCurrentCompetencyIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState({
    strengths: '',
    improvements: '',
    recommendations: '',
  });

  const [loading, setLoading] = useState(() => {
    // Si ya tenemos en caché tanto la campaña como el sujeto o lista, no mostramos spinner bloqueante
    if (initialCachedCamp && (targetSubjectId ? initialCachedSub : initialCachedSubjects.length > 0)) {
      return false;
    }
    return Boolean(targetSubjectId || targetCompanyRef);
  });
  const [loadingSlowNotice, setLoadingSlowNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-load direct evaluation when subject ID or company ref is present in URL
  useEffect(() => {
    let slowTimer = setTimeout(() => {
      setLoadingSlowNotice(true);
    }, 3000);

    if (targetSubjectId) {
      loadDirectSubjectEvaluation(targetSubjectId, targetCompanyRef).finally(() => {
        clearTimeout(slowTimer);
      });
    } else if (targetCompanyRef) {
      loadCampaignByCode(targetCompanyRef).finally(() => {
        clearTimeout(slowTimer);
      });
    } else {
      clearTimeout(slowTimer);
    }

    return () => clearTimeout(slowTimer);
  }, [targetSubjectId, targetCompanyRef]);

  const loadDirectSubjectEvaluation = async (subjectId: string, companyRef?: string) => {
    // Si ya tenemos los datos en memoria/local, no bloquear la UI
    const localSub = getCachedSubjectById(subjectId);
    if (localSub) {
      setSelectedSubjectId(localSub.id);
      setSubjects([localSub]);
      const localCamp = getCachedCampaignById(localSub.campaignId) || (companyRef ? getCachedCampaignByCode(companyRef) : null);
      if (localCamp) {
        setCampaign(localCamp);
        setClientCode(localCamp.clientCode);
        setStep('select_subject_role');
        setLoading(false);
        // Cargar otros colaboradores de la misma campaña en background
        getSubjects(localCamp.id).then((list) => {
          if (list.length > 0) setSubjects(list);
        }).catch(() => {});
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const subject = await withTimeout(getSubjectById(subjectId), 3000, localSub);
      if (subject) {
        setSelectedSubjectId(subject.id);
        setSubjects([subject]);

        let camp = await withTimeout(
          getCampaignById(subject.campaignId),
          3000,
          getCachedCampaignById(subject.campaignId)
        );
        if (!camp && companyRef) {
          camp = await withTimeout(
            (async () => (await getCampaignByCode(companyRef)) || (await getCampaignById(companyRef)))(),
            3000,
            getCachedCampaignByCode(companyRef)
          );
        }
        if (camp) {
          if (camp.status === 'closed') {
            setErrorMsg('Esta campaña de evaluación ha sido cerrada.');
            setLoading(false);
            return;
          }
          setCampaign(camp);
          setClientCode(camp.clientCode);
          setStep('select_subject_role');
          setLoading(false);

          // Cargar resto de colaboradores en background sin bloquear
          getSubjects(camp.id).then((list) => {
            if (list.length > 0) setSubjects(list);
          }).catch(() => {});
          return;
        }
      }

      // If subject not found directly, try by campaign code
      if (companyRef) {
        await loadCampaignByCode(companyRef, subjectId);
      } else {
        setErrorMsg('No se encontró el colaborador a evaluar. Puedes ingresar el código de empresa a continuación.');
        setStep('code_entry');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al cargar la evaluación.');
      setStep('code_entry');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignByCode = async (codeToSearch: string, preselectedSubjectId?: string) => {
    const cleanCode = codeToSearch.trim();
    if (!cleanCode) {
      setErrorMsg('Por favor ingresa un código de empresa válido.');
      setStep('code_entry');
      return;
    }

    // 1. FAST PATH (< 5ms): Si ya está en caché local, renderizar de inmediato
    const cachedCamp = getCachedCampaignByCode(cleanCode) || getCachedCampaignById(cleanCode);
    if (cachedCamp) {
      setCampaign(cachedCamp);
      setClientCode(cachedCamp.clientCode);
      const cachedList = getCachedSubjects(cachedCamp.id);
      if (cachedList.length > 0) {
        setSubjects(cachedList);
        if (preselectedSubjectId && cachedList.some((s) => s.id === preselectedSubjectId)) {
          setSelectedSubjectId(preselectedSubjectId);
        } else if (cachedList.length === 1) {
          setSelectedSubjectId(cachedList[0].id);
        }
      }
      setStep('select_subject_role');
      setLoading(false);

      // Sincronización en segundo plano de colaboradores si cambiasen
      getSubjects(cachedCamp.id).then((freshList) => {
        if (freshList.length > 0) {
          setSubjects(freshList);
          if (preselectedSubjectId && freshList.some((s) => s.id === preselectedSubjectId)) {
            setSelectedSubjectId(preselectedSubjectId);
          } else if (freshList.length === 1 && !selectedSubjectId) {
            setSelectedSubjectId(freshList[0].id);
          }
        }
      }).catch(() => {});
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const camp = await withTimeout(
        (async () => (await getCampaignByCode(cleanCode)) || (await getCampaignById(cleanCode)))(),
        3000,
        null
      );

      if (!camp) {
        setErrorMsg(`No se encontró ninguna campaña con el código "${codeToSearch}". Verifica el código con tu coordinador.`);
        setStep('code_entry');
        setLoading(false);
        return;
      }

      if (camp.status === 'closed') {
        setErrorMsg('Esta campaña de evaluación ha sido cerrada y ya no acepta nuevas respuestas.');
        setLoading(false);
        return;
      }

      // Renderizar campaña de inmediato para no bloquear pantalla
      setCampaign(camp);
      setClientCode(camp.clientCode);
      setStep('select_subject_role');
      setLoading(false);

      // Cargar colaboradores en paralelo o background
      const cachedSubjs = getCachedSubjects(camp.id);
      if (cachedSubjs.length > 0) {
        setSubjects(cachedSubjs);
      }

      const subjList = await withTimeout(getSubjects(camp.id), 3000, cachedSubjs);
      setSubjects(subjList);

      if (preselectedSubjectId && subjList.some((s) => s.id === preselectedSubjectId)) {
        setSelectedSubjectId(preselectedSubjectId);
      } else if (subjList.length === 1) {
        setSelectedSubjectId(subjList[0].id);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al conectar con la base de datos. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Dynamic competencies groups derived from campaign template questions (or fallback)
  const activeCompetencies = React.useMemo(() => {
    if (campaign?.questions && campaign.questions.length > 0) {
      const map = new Map<string, { id: string; text: string }[]>();
      campaign.questions.forEach((q) => {
        const cat = q.category?.trim() || 'General';
        if (!map.has(cat)) {
          map.set(cat, []);
        }
        map.get(cat)!.push({ id: q.id, text: q.text });
      });

      const groups: {
        id: string;
        name: string;
        description: string;
        questions: { id: string; text: string }[];
      }[] = [];
      map.forEach((items, catName) => {
        groups.push({
          id: catName,
          name: catName,
          description: `Evaluación de conductas observables en la competencia de ${catName}.`,
          questions: items,
        });
      });
      return groups;
    }

    return DEFAULT_COMPETENCIES.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      questions: c.questions.map((q) => ({ id: q.id, text: q.text })),
    }));
  }, [campaign]);

  const currentCompetency = activeCompetencies[currentCompetencyIndex];

  // Helper to check if current competency questions are answered
  const areCurrentQuestionsAnswered = () => {
    if (!currentCompetency) return true;
    return currentCompetency.questions.every((q) => !!scores[q.id]);
  };

  const handleStartQuestionnaire = () => {
    if (!selectedSubjectId) {
      setErrorMsg('Por favor selecciona a la persona que vas a evaluar.');
      return;
    }
    setErrorMsg('');
    setStep('questionnaire');
    setCurrentCompetencyIndex(0);
  };

  const handleScoreSelect = (questionId: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNextCompetency = () => {
    if (!areCurrentQuestionsAnswered()) {
      setErrorMsg('Por favor califica todas las conductas de esta competencia para continuar.');
      return;
    }
    setErrorMsg('');

    if (currentCompetencyIndex < activeCompetencies.length - 1) {
      setCurrentCompetencyIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setStep('comments');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevCompetency = () => {
    setErrorMsg('');
    if (currentCompetencyIndex > 0) {
      setCurrentCompetencyIndex((prev) => prev - 1);
    } else {
      setStep('select_subject_role');
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!campaign || !selectedSubject) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      await submitResponse({
        campaignId: campaign.id,
        subjectId: selectedSubject.id,
        evaluatorRole,
        evaluatorName: isAnonymous ? '' : evaluatorName.trim(),
        scores,
        comments,
      });

      // Trigger Confetti effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setStep('completed');
    } catch (err: any) {
      console.error(err);
      const friendlyMessage =
        err?.message && typeof err.message === 'string'
          ? err.message
          : 'Error al guardar la evaluación. Por favor intenta nuevamente.';
      setErrorMsg(friendlyMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnotherEvaluation = () => {
    setScores({});
    setComments({ strengths: '', improvements: '', recommendations: '' });
    setSelectedSubjectId('');
    setCurrentCompetencyIndex(0);
    setStep('select_subject_role');
  };

  // LOADING STATE (Direct link or campaign loading)
  if (loading && (targetSubjectId || targetCompanyRef)) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 sm:py-24 text-center space-y-5">
        <div className="flex flex-col items-center">
          <img
            src="/comgico.png"
            alt="Comunicación Global"
            className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-full shadow-lg ring-4 ring-lime-400/40 mb-3 animate-pulse"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-50 border border-lime-300 text-slate-900 text-xs font-bold shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-lime-600" />
            <span>Cargando evaluación 360°...</span>
          </div>
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">Preparando Cuestionario</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Conectando con la base de datos y validando información...</p>

          {loadingSlowNotice && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-3">
              <div className="flex items-start gap-2 text-amber-900 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>La sincronización remota está tardando más de 3 segundos. Puedes continuar ahora mismo con la información disponible.</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoading(false);
                    setStep('select_subject_role');
                  }}
                  className="flex-1 py-2 px-3 bg-lime-500 hover:bg-lime-400 text-slate-900 text-xs font-extrabold rounded-xl transition shadow-xs cursor-pointer text-center"
                >
                  Continuar sin esperar
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 1. STEP: ENTER CLIENT CODE
  if (step === 'code_entry') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-8 text-center space-y-6">
          <div className="flex flex-col items-center">
            <img
              src="/comgico.png"
              alt="Comunicación Global"
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-full shadow-lg ring-4 ring-lime-400/40 mb-3 hover:scale-105 transition-transform"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-50 border border-lime-300 text-slate-900 text-xs font-bold shadow-xs">
              <UserCheck className="w-4 h-4 text-lime-700" />
              <span>Comunicación Global • Acceso a Evaluación 360°</span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Evaluación del Desempeño
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Ingresa el Código de Empresa provisto por tu coordinador o escanea el código QR directo para responder la encuesta.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadCampaignByCode(clientCode);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left uppercase tracking-wider">
                Código de Empresa o Campaña:
              </label>
              <input
                type="text"
                required
                placeholder="Ej. CORP-2026-X"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                className="w-full text-center text-lg sm:text-xl font-mono font-black tracking-widest uppercase bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-400/20 focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-lime-500 hover:bg-lime-400 active:scale-[0.99] disabled:opacity-50 text-slate-900 font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-lime-500/25 transition flex items-center justify-center gap-2 border border-lime-400 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Validando código...</span>
                </>
              ) : (
                <>
                  <span>Ingresar a la Evaluación</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Links */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
            <span className="block mb-2 font-medium">¿Deseas probar con códigos demo?</span>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setClientCode('CORP-2026-X');
                  loadCampaignByCode('CORP-2026-X');
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-lime-50 hover:text-slate-900 hover:border-lime-300 text-slate-700 rounded-xl font-mono text-[11px] font-bold transition border border-slate-200"
              >
                CORP-2026-X (TechNova)
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientCode('CORP-2026-B');
                  loadCampaignByCode('CORP-2026-B');
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-lime-50 hover:text-slate-900 hover:border-lime-300 text-slate-700 rounded-xl font-mono text-[11px] font-bold transition border border-slate-200"
              >
                CORP-2026-B (Banco Innova)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. STEP: SELECT SUBJECT & EVALUATOR ROLE
  if (step === 'select_subject_role') {
    const isDirectAssignment = Boolean(targetSubjectId && selectedSubject);
    const validity = campaign ? getCampaignValidityInfo(campaign) : null;

    // Bloqueo amigable si la campaña está vencida o cerrada
    if (validity && (!validity.canAcceptResponses || validity.isExpired)) {
      return (
        <div className="w-full max-w-lg mx-auto px-4 py-12 sm:py-16 text-center space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-8 space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-2 shadow-xs">
                <CalendarX className="w-8 h-8 stroke-[2.5]" />
              </div>
              <span className="font-mono text-xs bg-rose-50 text-rose-700 font-bold px-3 py-1 rounded-full border border-rose-200 mt-2">
                {campaign?.clientCode}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Periodo de Evaluación Concluido
              </h2>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {campaign?.companyName}
              </p>
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 leading-relaxed text-left space-y-2">
                <p>
                  El periodo contratado para la recepción de evaluaciones 360° en esta campaña ha finalizado.
                </p>
                {campaign?.expiresAt && (
                  <p className="font-semibold text-slate-800">
                    Fecha de cierre registrada:{' '}
                    <span className="font-mono text-indigo-700">
                      {new Date(campaign.expiresAt).toLocaleString('es-ES', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  Agradecemos tu interés y participación. Si consideras que esto es un error, por favor contacta al coordinador de recursos humanos de tu empresa.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setStep('code_entry')}
                className="flex-1 py-3 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Ingresar con otro código
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-10 space-y-6">
        {/* Comunicación Global Header & Campaign Info */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/comgico.png"
              alt="Comunicación Global"
              className="h-12 w-12 object-contain rounded-full shadow-xs ring-2 ring-lime-400/40 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Comunicación Global 360°
                </span>
                <span className="font-mono text-[10px] bg-lime-100 text-slate-900 font-bold px-2 py-0.5 rounded-full border border-lime-300">
                  {campaign?.clientCode}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{campaign?.companyName}</h2>
              <p className="text-xs text-slate-500">{campaign?.description || 'Evaluación de competencias profesionales'}</p>
            </div>
          </div>

          <button
            onClick={() => setStep('code_entry')}
            className="text-xs text-slate-500 hover:text-slate-900 font-semibold self-start sm:self-center px-3 py-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            Cambiar código
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Selection Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          {/* PASO 1: EVALUATED SUBJECT */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm sm:text-base font-extrabold text-slate-900">
                1. Colaborador a Evaluar:
              </label>
              {selectedSubject && !isDirectAssignment && (
                <span className="text-xs font-bold text-slate-900 bg-lime-100 px-2.5 py-0.5 rounded-full border border-lime-300">
                  Seleccionado
                </span>
              )}
            </div>

            {selectedSubject && isDirectAssignment ? (
              /* Preselected / QR direct access fixed card */
              <div className="p-4 sm:p-5 bg-lime-50/70 border-2 border-lime-400 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-lime-400 font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                    {selectedSubject.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-lime-800 uppercase tracking-wider bg-lime-100/90 px-2 py-0.5 rounded-md border border-lime-300">
                      <CheckCircle2 className="w-3 h-3 text-lime-700" />
                      Asignado por Enlace / QR
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate mt-0.5">
                      {selectedSubject.name}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium truncate">
                      {selectedSubject.role} • <span className="text-slate-500">{selectedSubject.department}</span>
                    </p>
                  </div>
                </div>

                {subjects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectId('')}
                    className="text-xs text-slate-500 hover:text-slate-900 font-semibold underline shrink-0 px-2 py-1"
                  >
                    Cambiar
                  </button>
                )}
              </div>
            ) : (
              /* Collaborators selection list */
              <div>
                <p className="text-xs text-slate-500 mb-3">
                  Selecciona a la persona que deseas calificar en esta evaluación 360°.
                </p>

                {subjects.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs">
                    Aún no hay colaboradores registrados en esta campaña. Solicita a tu coordinador darlos de alta.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {subjects.map((sub) => {
                      const isSelected = selectedSubjectId === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSelectedSubjectId(sub.id)}
                          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 min-h-[56px] ${
                            isSelected
                              ? 'border-lime-500 ring-2 ring-lime-400/50 bg-lime-50/70 shadow-xs'
                              : 'border-slate-200 hover:border-lime-300 hover:bg-slate-50/80 bg-white'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-slate-900 text-lime-400'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sub.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{sub.name}</p>
                            <p className="text-xs text-slate-600 truncate">{sub.role}</p>
                            <p className="text-[11px] text-slate-400 truncate">{sub.department}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-lime-600 shrink-0 stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PASO 2: EVALUATOR ROLE */}
          <div>
            <label className="block text-sm sm:text-base font-extrabold text-slate-900 mb-1">
              2. ¿Qué relación profesional tienes con {selectedSubject ? selectedSubject.name : 'el evaluado'}?
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Selecciona tu perspectiva para calcular los resultados 360° con precisión.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {(['self', 'manager', 'peer', 'subordinate'] as EvaluatorRole[]).map((roleKey) => {
                const info = EVALUATOR_ROLES_INFO[roleKey];
                const isSelected = evaluatorRole === roleKey;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setEvaluatorRole(roleKey)}
                    className={`min-h-[52px] sm:min-h-[60px] p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-lime-500 ring-2 ring-lime-400/50 bg-lime-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-lime-300 hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-slate-900">{info.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-tight">{info.description}</p>
                    </div>
                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-lime-500 text-slate-900 flex items-center justify-center font-bold">
                          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONFIDENTIALITY AND OPTIONAL NAME */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-lime-600 focus:ring-lime-500 h-4 w-4"
                />
                <Shield className="w-4 h-4 text-lime-700" />
                Respuesta confidencial (anónima)
              </label>
              <span className="text-[11px] font-semibold text-slate-400">Recomendado</span>
            </div>

            {!isAnonymous && (
              <div className="pt-2 border-t border-slate-200/60">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tu nombre o cargo (visible para el coordinador):
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez (Líder QA)"
                  value={evaluatorName}
                  onChange={(e) => setEvaluatorName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-400/30"
                />
              </div>
            )}
          </div>

          {/* START QUESTIONNAIRE BUTTON */}
          <button
            type="button"
            onClick={handleStartQuestionnaire}
            disabled={!selectedSubjectId}
            className="w-full py-4 bg-lime-500 hover:bg-lime-400 active:scale-[0.99] disabled:opacity-50 text-slate-900 font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-lime-500/25 transition flex items-center justify-center gap-2 border border-lime-400 cursor-pointer"
          >
            Comenzar Cuestionario
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    );
  }

  // 3. STEP: QUESTIONNAIRE (COMPETENCIES & LIKERT 1-5)
  if (step === 'questionnaire' && currentCompetency) {
    const answeredCount = Object.keys(scores).length;
    const totalQuestions = activeCompetencies.reduce((acc, c) => acc + c.questions.length, 0);
    const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
    const precedingQuestionsCount = activeCompetencies
      .slice(0, currentCompetencyIndex)
      .reduce((acc, c) => acc + c.questions.length, 0);

    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-10 space-y-6">
        {/* Top Evaluation Context Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-lime-400 font-black text-base flex items-center justify-center shadow-xs shrink-0">
              {selectedSubject?.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Evaluando a:
              </span>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                {selectedSubject?.name}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {selectedSubject?.role} •{' '}
                <span className="text-slate-900 font-semibold">
                  {EVALUATOR_ROLES_INFO[evaluatorRole].label}
                </span>
              </p>
            </div>
          </div>

          {/* Stepper info with Pregunta X de 20 & % de avance */}
          <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="flex items-center sm:justify-end gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900">
                Pregunta {answeredCount} de {totalQuestions}
              </span>
              <span className="text-xs font-black text-slate-900 bg-lime-400 px-2 py-0.5 rounded-full shadow-xs">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full sm:w-48 bg-slate-100 h-2.5 rounded-full overflow-hidden mt-1.5 sm:ml-auto">
              <div
                className="bg-lime-500 h-full rounded-full transition-all duration-300 shadow-xs"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 block mt-1">
              Competencia {currentCompetencyIndex + 1} de {activeCompetencies.length} • {currentCompetency.name}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Competency Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="inline-block px-3 py-1 bg-lime-100 text-slate-900 border border-lime-300 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              Competencia {currentCompetencyIndex + 1} • {currentCompetency.name}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {currentCompetency.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {currentCompetency.description}
            </p>
          </div>

          {/* Questions List */}
          <div className="space-y-5">
            {currentCompetency.questions.map((question, qIdx) => {
              const currentVal = scores[question.id];
              const globalQuestionNumber = precedingQuestionsCount + qIdx + 1;

              return (
                <div
                  key={question.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-3.5 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-lime-400 font-black text-xs shrink-0 shadow-xs w-fit">
                      <span>Pregunta {globalQuestionNumber} de {totalQuestions}</span>
                    </span>
                    {currentVal ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-lime-700 bg-lime-100 px-2 py-0.5 rounded-md border border-lime-300 w-fit">
                        Respondida: Nivel {currentVal} de 5
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">
                        Pendiente de respuesta
                      </span>
                    )}
                  </div>

                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {question.text}
                  </p>

                  {/* Likert Scale 1-5 Radios (Touch & Desktop friendly) */}
                  <div className="pt-1">
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const isSelected = currentVal === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleScoreSelect(question.id, val)}
                            className={`min-h-[52px] sm:min-h-[60px] flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border transition-all active:scale-95 ${
                              isSelected
                                ? 'bg-lime-500 text-slate-900 border-lime-500 shadow-md ring-2 ring-lime-400 scale-[1.02]'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-lime-400 hover:bg-lime-50/50'
                            }`}
                          >
                            <span className="text-lg sm:text-xl font-black leading-none">{val}</span>
                            <span
                              className={`text-[9px] sm:text-[10px] font-bold leading-tight mt-1 line-clamp-1 ${
                                isSelected ? 'text-slate-900' : 'text-slate-500'
                              }`}
                            >
                              {val === 1
                                ? 'Nunca'
                                : val === 2
                                ? 'Rara vez'
                                : val === 3
                                ? 'A veces'
                                : val === 4
                                ? 'Frecuente'
                                : 'Siempre'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1 pt-2">
                      <span>1: Deficiente / Nunca</span>
                      <span>5: Sobresaliente / Siempre</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrevCompetency}
              className="w-full sm:w-auto px-5 py-3 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <button
              type="button"
              onClick={handleNextCompetency}
              className="w-full sm:w-auto px-7 py-3.5 bg-lime-500 hover:bg-lime-400 text-slate-900 font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-lime-500/20 transition flex items-center justify-center gap-1.5 border border-lime-400 cursor-pointer"
            >
              {currentCompetencyIndex < activeCompetencies.length - 1
                ? 'Siguiente Competencia'
                : 'Ir a Comentarios Abiertos'}
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. STEP: QUALITATIVE FEEDBACK (OPEN COMMENTS)
  if (step === 'comments') {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-10 space-y-6">
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="inline-block px-3 py-1 bg-lime-100 text-slate-900 border border-lime-300 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              Paso Final • Retroalimentación Cualitativa
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Comentarios Abiertos y Feedback Constructivo
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Las opiniones sinceras inspiran tanto como las métricas numéricas. Comparte tu perspectiva para impulsar el desarrollo de <strong>{selectedSubject?.name}</strong>.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                <span>💪 Principales Fortalezas:</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                ¿Qué conductas, habilidades o actitudes destacan de forma positiva en este colaborador?
              </p>
              <textarea
                rows={3}
                placeholder="Ej. Gran proactividad y resolución técnica, siempre fomenta el trabajo en equipo y la colaboración asertiva..."
                value={comments.strengths}
                onChange={(e) => setComments({ ...comments, strengths: e.target.value })}
                className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-400/20 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                <span>🎯 Áreas de Oportunidad / Aspectos a Mejorar:</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                ¿Qué procesos o hábitos podría ajustar para elevar aún más su desempeño y efectividad?
              </p>
              <textarea
                rows={3}
                placeholder="Ej. Podría delegar con mayor anticipación y fortalecer el seguimiento en los compromisos acordados..."
                value={comments.improvements}
                onChange={(e) => setComments({ ...comments, improvements: e.target.value })}
                className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-400/20 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                <span>💡 Recomendaciones y Plan de Desarrollo:</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                ¿Qué consejos prácticos o sugerencias de formación le darías para su crecimiento profesional?
              </p>
              <textarea
                rows={3}
                placeholder="Ej. Recomiendo que asuma el liderazgo en sesiones de mentoría interna y se capacite en gestión del tiempo..."
                value={comments.recommendations}
                onChange={(e) => setComments({ ...comments, recommendations: e.target.value })}
                className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-400/20 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setStep('questionnaire');
                setCurrentCompetencyIndex(activeCompetencies.length - 1);
              }}
              className="w-full sm:w-auto px-5 py-3 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Revisar preguntas
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitEvaluation}
              className="w-full sm:w-auto px-8 py-4 bg-lime-500 hover:bg-lime-400 active:scale-[0.99] disabled:opacity-50 text-slate-900 font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-lime-500/25 transition flex items-center justify-center gap-2 border border-lime-400 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                  <span>Guardando en Firestore...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  <span>Finalizar y Enviar Evaluación</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. STEP: COMPLETED / THANK YOU SCREEN
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <img
              src="/comgico.png"
              alt="Comunicación Global"
              className="h-16 w-16 object-contain rounded-full shadow-lg ring-4 ring-lime-400/40"
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-lime-500 text-slate-900 flex items-center justify-center font-bold ring-2 ring-white">
              <CheckCircle2 className="w-5 h-5 stroke-[3]" />
            </div>
          </div>
        </div>

        <div>
          <span className="inline-block text-xs font-black uppercase tracking-wider text-slate-900 bg-lime-100 px-3.5 py-1 rounded-full border border-lime-300">
            Evaluación Enviada con Éxito
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
            ¡Muchas gracias por tu valioso feedback!
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Tu retroalimentación para <strong>{selectedSubject?.name}</strong> ha sido registrada exitosamente en <strong>Comunicación Global</strong>. Tu aporte es fundamental para su desarrollo y el crecimiento de la organización.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs sm:text-sm space-y-2 text-slate-600">
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Empresa:</span>
            <span className="font-bold text-slate-900">{campaign?.companyName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Rol evaluador:</span>
            <span className="font-bold text-slate-900">{EVALUATOR_ROLES_INFO[evaluatorRole].label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Preguntas respondidas:</span>
            <span className="font-bold text-slate-900">100% completas</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Confidencialidad:</span>
            <span className="font-bold text-lime-700">{isAnonymous ? 'Anónimo garantizado' : evaluatorName}</span>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={handleResetForAnotherEvaluation}
            className="w-full py-3.5 bg-lime-500 hover:bg-lime-400 text-slate-900 font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-lime-500/20 transition flex items-center justify-center gap-2 border border-lime-400 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            Evaluar a otro colaborador de esta empresa
          </button>

          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full py-2.5 text-xs sm:text-sm text-slate-500 hover:text-slate-900 font-semibold transition"
            >
              Volver al inicio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
