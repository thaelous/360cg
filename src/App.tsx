import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ClientWelcome } from './components/Client/ClientWelcome';
import { CoordinatorPortal } from './components/Coordinator/CoordinatorPortal';
import { EvaluatorPortal } from './components/Evaluator/EvaluatorPortal';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminLoginModal } from './components/Admin/AdminLoginModal';
import { FirebaseModal } from './components/FirebaseModal';
import { Campaign } from './types';
import { getAdminSession, logoutSuperAdmin, AdminUser } from './services/authService';
import {
  getCampaignByCode,
  getCampaignById,
  getSubjectById,
  getSubjects,
  getCachedCampaignByCode,
  getCachedSubjectById,
  withTimeout,
} from './services/dataService';
import { Lock, Shield, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export type AppView = 'client_welcome' | 'coordinator' | 'evaluator' | 'admin';

export default function App() {
  // Inspección síncrona de URL para evitar cualquier parpadeo de pantalla de bienvenida
  const initialParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initCampana = initialParams ? initialParams.get('campana') || initialParams.get('empresa') || initialParams.get('code') : null;
  const initEvaluar = initialParams ? initialParams.get('evaluar') || initialParams.get('id') || initialParams.get('subject') : null;
  const initRole = initialParams ? initialParams.get('role') : null;
  const initPortal = initialParams ? initialParams.get('portal') : null;

  // Si ya tenemos en caché local la campaña o el evaluado, no mostramos pantalla bloqueante
  const preloadedCamp = initCampana ? getCachedCampaignByCode(initCampana) : null;
  const preloadedSub = initEvaluar ? getCachedSubjectById(initEvaluar) : null;

  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(() => {
    if (preloadedCamp || preloadedSub) return false;
    return Boolean(initCampana || initEvaluar);
  });
  const [loadTimeoutNotice, setLoadTimeoutNotice] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (initCampana || initEvaluar) return 'evaluator';
    if (initRole === 'admin') return 'admin';
    if (initRole === 'coordinator' || initPortal === 'empresa' || initPortal === 'coordinator') return 'coordinator';
    return 'client_welcome';
  });

  const [activeCompany, setActiveCompany] = useState<Campaign | null>(preloadedCamp);

  // Evaluator params
  const [evaluatorSubjectId, setEvaluatorSubjectId] = useState<string>(() => initEvaluar || '');
  const [evaluatorCompanyId, setEvaluatorCompanyId] = useState<string>(() => initCampana || '');

  // Admin state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(getAdminSession());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Onboarding & Help Inspector state for Coordinator Portal & Evaluator View
  const [isCompanyTutorialOpen, setIsCompanyTutorialOpen] = useState(false);
  const [isEvaluatorTutorialOpen, setIsEvaluatorTutorialOpen] = useState(false);
  const [isHelpModeActive, setIsHelpModeActive] = useState(false);

  // Efecto robusto de arranque para enrutamiento directo (QR, enlaces de empresa o admin)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const campanaParam = params.get('campana') || params.get('empresa') || params.get('code');
    const evaluarParam = params.get('evaluar') || params.get('id') || params.get('subject');
    const roleParam = params.get('role');
    const portalParam = params.get('portal');

    // Timer de seguridad: si tarda más de 3 segundos, activar aviso y reintento
    const timeoutTimer = setTimeout(() => {
      setLoadTimeoutNotice(true);
    }, 3000);

    // 1. Acceso directo a Super Admin
    if (roleParam === 'admin' && !campanaParam && !evaluarParam) {
      clearTimeout(timeoutTimer);
      if (getAdminSession()) {
        setCurrentView('admin');
      } else {
        setIsAdminLoginModalOpen(true);
      }
      setIsLoadingRoute(false);
      return;
    }

    // 2. Acceso directo a Portal Coordinador de Empresa
    if (
      (roleParam === 'coordinator' || portalParam === 'empresa' || portalParam === 'coordinator') &&
      campanaParam &&
      !evaluarParam
    ) {
      (async () => {
        try {
          const cleanCode = campanaParam.trim();
          // Traer en ráfaga paralela la campaña y los sujetos
          const results = await Promise.allSettled([
            withTimeout((async () => (await getCampaignByCode(cleanCode)) || (await getCampaignById(cleanCode)))(), 3000, null),
            withTimeout(getSubjects(cleanCode), 3000, []),
          ]);

          const campResult = results[0];
          const camp = campResult.status === 'fulfilled' ? campResult.value : null;

          if (camp) {
            setActiveCompany(camp);
            setCurrentView('coordinator');
          }
        } catch (err) {
          console.error('Error cargando coordinador:', err);
        } finally {
          clearTimeout(timeoutTimer);
          setIsLoadingRoute(false);
        }
      })();
      return;
    }

    // 3. Acceso directo a Evaluación (QR o Enlace de Evaluador)
    if (campanaParam || evaluarParam) {
      if (!preloadedCamp && !preloadedSub) {
        setIsLoadingRoute(true);
      }

      const fetchCampaignAndRedirect = async () => {
        try {
          const cleanCampana = campanaParam ? campanaParam.trim() : '';
          const cleanSubject = evaluarParam ? evaluarParam.trim() : '';

          // Ráfaga paralela con Promise.allSettled: campaña, sujeto específico y sujetos asociados
          const [campSettled, subjectSettled, subjectsListSettled] = await Promise.allSettled([
            cleanCampana
              ? withTimeout((async () => (await getCampaignByCode(cleanCampana)) || (await getCampaignById(cleanCampana)))(), 3000, null)
              : Promise.resolve(null),
            cleanSubject
              ? withTimeout(getSubjectById(cleanSubject), 3000, null)
              : Promise.resolve(null),
            cleanCampana
              ? withTimeout(getSubjects(cleanCampana), 3000, [])
              : Promise.resolve([]),
          ]);

          let matchedCampana: Campaign | null =
            preloadedCamp || (campSettled.status === 'fulfilled' ? campSettled.value : null);
          let matchedSubject =
            preloadedSub || (subjectSettled.status === 'fulfilled' ? subjectSettled.value : null);
          let matchedSubjectId = matchedSubject ? matchedSubject.id : cleanSubject;

          // Si el sujeto tiene campaignId y aún no tenemos la campaña, intentar resolverla rápidamente
          if (matchedSubject && matchedSubject.campaignId && !matchedCampana) {
            try {
              matchedCampana = await withTimeout(getCampaignById(matchedSubject.campaignId), 2000, null);
            } catch (errCamp) {
              console.warn('Error resolviendo campaña desde sujeto:', errCamp);
            }
          }

          if (matchedCampana) {
            setActiveCompany(matchedCampana);
            setEvaluatorCompanyId(matchedCampana.clientCode || matchedCampana.id);
          } else if (cleanCampana) {
            setEvaluatorCompanyId(cleanCampana);
          }

          if (matchedSubjectId) {
            setEvaluatorSubjectId(matchedSubjectId);
          }

          // Pasar directamente a la pantalla de responder la encuesta
          setCurrentView('evaluator');
        } catch (err) {
          console.error('Error resolviendo campaña para evaluación:', err);
          setCurrentView('evaluator');
        } finally {
          clearTimeout(timeoutTimer);
          setIsLoadingRoute(false);
        }
      };

      fetchCampaignAndRedirect();
      return;
    }

    clearTimeout(timeoutTimer);
    setIsLoadingRoute(false);
  }, []);

  const handleCompanyAuthenticated = (campaign: Campaign) => {
    setActiveCompany(campaign);
    setCurrentView('coordinator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaunchEvaluationFromCoordinator = (codeOrId: string, subjectId?: string) => {
    setEvaluatorSubjectId(subjectId || '');
    setEvaluatorCompanyId(codeOrId);
    setCurrentView('evaluator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchToCoordinatorFromAdmin = async (clientCode: string) => {
    const camp = await getCampaignByCode(clientCode);
    if (camp) {
      setActiveCompany(camp);
      setCurrentView('coordinator');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAdminLoginSuccess = () => {
    const user = getAdminSession();
    setAdminUser(user);
    setCurrentView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoutAdmin = async () => {
    await logoutSuperAdmin();
    setAdminUser(null);
    if (currentView === 'admin') {
      setCurrentView('client_welcome');
    }
  };

  const handleLogoutCompany = () => {
    setActiveCompany(null);
    setCurrentView('client_welcome');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div key={refreshKey} className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        activeCompany={activeCompany}
        adminUser={adminUser}
        onNavigateHome={() => {
          if (adminUser && currentView === 'admin') return;
          setCurrentView('client_welcome');
        }}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onOpenAdminPanel={() => setCurrentView('admin')}
        onLogoutAdmin={handleLogoutAdmin}
        onLogoutCompany={handleLogoutCompany}
        onOpenTutorial={() => {
          if (currentView === 'coordinator') {
            setIsCompanyTutorialOpen(true);
          } else if (currentView === 'evaluator') {
            setIsEvaluatorTutorialOpen(true);
          }
        }}
        onToggleHelpMode={() => setIsHelpModeActive((prev) => !prev)}
        isHelpModeActive={isHelpModeActive}
      />

      {/* Main View Container */}
      <main className="flex-1 flex flex-col">
        {isLoadingRoute ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl max-w-sm w-full text-center space-y-4">
              <img
                src="/comgico.png"
                alt="Comunicación Global"
                className="h-16 w-16 object-contain rounded-full shadow-lg ring-4 ring-lime-400/40 mx-auto animate-pulse"
              />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-50 border border-lime-300 text-slate-900 text-xs font-bold shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-lime-600" />
                <span>Accediendo a la evaluación 360°...</span>
              </div>
              <p className="text-xs text-slate-500">Conectando directamente con la evaluación solicitada</p>

              {loadTimeoutNotice && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-2xl text-left flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>La conexión remota está tardando más de lo habitual. Puedes continuar directamente.</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLoadingRoute(false)}
                      className="flex-1 py-2 px-3 bg-lime-500 hover:bg-lime-400 text-slate-900 text-xs font-extrabold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Continuar ahora
                    </button>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reintentar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* NIVEL 1: Portal de Bienvenida y Acceso para Clientes */}
            {currentView === 'client_welcome' && (
              <ClientWelcome onCompanyAuthenticated={handleCompanyAuthenticated} />
            )}

            {/* NIVEL 1: Panel del Cliente / Coordinador de Empresa */}
            {currentView === 'coordinator' && activeCompany && (
              <CoordinatorPortal
                initialCampaign={activeCompany}
                onLogout={handleLogoutCompany}
                onLaunchEvaluation={handleLaunchEvaluationFromCoordinator}
                isTutorialOpenExternal={isCompanyTutorialOpen}
                onCloseTutorialExternal={() => setIsCompanyTutorialOpen(false)}
                onOpenTutorialExternal={() => setIsCompanyTutorialOpen(true)}
                isHelpModeActiveExternal={isHelpModeActive}
                onToggleHelpModeExternal={() => setIsHelpModeActive((prev) => !prev)}
                onSetHelpModeActiveExternal={setIsHelpModeActive}
              />
            )}

            {/* NIVEL 2: Acceso Directo de Evaluadores (Vía QR o Enlace) */}
            {currentView === 'evaluator' && (
              <EvaluatorPortal
                evaluatorSubjectId={evaluatorSubjectId}
                evaluatorCompanyId={evaluatorCompanyId}
                onNavigateHome={() => setCurrentView('client_welcome')}
                isTutorialOpenExternal={isEvaluatorTutorialOpen}
                onCloseTutorialExternal={() => setIsEvaluatorTutorialOpen(false)}
                onOpenTutorialExternal={() => setIsEvaluatorTutorialOpen(true)}
              />
            )}

            {/* NIVEL 3: Acceso Exclusivo de Super Administrador */}
            {currentView === 'admin' && (
              <AdminDashboard
                onSwitchToCoordinator={handleSwitchToCoordinatorFromAdmin}
                onLaunchEvaluation={handleLaunchEvaluationFromCoordinator}
                onLogoutAdmin={handleLogoutAdmin}
                onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer con Acceso Administrativo Discreto y Niveles */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 print:hidden">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <img src="/comgico.png" alt="Comunicación Global" className="h-6 w-6 object-contain rounded-full shadow-xs" />
            <span className="font-extrabold text-slate-900">Comunicación Global</span>
            <span>• Evaluaciones 360°</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="text-slate-400">© 2026 Comunicación Global. Todos los derechos reservados.</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            {/* Super Admin discreet access */}
            {adminUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('admin')}
                  className="text-slate-900 font-bold hover:text-lime-700 flex items-center gap-1"
                >
                  <Shield className="w-3.5 h-3.5 text-lime-600" />
                  Panel Super Admin
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={handleLogoutAdmin}
                  className="text-rose-600 hover:underline"
                >
                  Cerrar sesión Admin
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAdminLoginModalOpen(true)}
                className="text-slate-400 hover:text-slate-700 transition flex items-center gap-1.5 font-medium py-1 px-2 rounded-lg hover:bg-slate-100"
                title="Acceso exclusivo para el Administrador del Sistema"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Acceso Administrador</span>
              </button>
            )}

            <span className="text-slate-300 hidden sm:inline">•</span>

            <button
              onClick={() => {
                if (activeCompany) {
                  setCurrentView('coordinator');
                } else {
                  setCurrentView('client_welcome');
                }
              }}
              className="text-slate-500 hover:text-slate-900 transition font-medium"
            >
              Portal Empresas
            </button>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal (Nivel 3) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Firebase Settings Modal (Exclusivo Super Admin) */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        onConfigUpdated={() => setRefreshKey((prev) => prev + 1)}
      />
    </div>
  );
}
