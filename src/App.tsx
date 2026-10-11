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
import { getCampaignByCode, getCampaignById, getSubjectById } from './services/dataService';
import { getFirebaseDb } from './firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Lock, Shield, Loader2 } from 'lucide-react';

export type AppView = 'client_welcome' | 'coordinator' | 'evaluator' | 'admin';

export default function App() {
  // Inspección síncrona de URL para evitar cualquier parpadeo de pantalla de bienvenida
  const initialParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initCampana = initialParams ? initialParams.get('campana') || initialParams.get('empresa') || initialParams.get('code') : null;
  const initEvaluar = initialParams ? initialParams.get('evaluar') || initialParams.get('id') || initialParams.get('subject') : null;
  const initRole = initialParams ? initialParams.get('role') : null;
  const initPortal = initialParams ? initialParams.get('portal') : null;

  const hasDirectRoute = Boolean(initCampana || initEvaluar || initRole || initPortal);

  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(() => Boolean(initCampana || initEvaluar));
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (initCampana || initEvaluar) return 'evaluator';
    if (initRole === 'admin') return 'admin';
    if (initRole === 'coordinator' || initPortal === 'empresa' || initPortal === 'coordinator') return 'coordinator';
    return 'client_welcome';
  });

  const [activeCompany, setActiveCompany] = useState<Campaign | null>(null);

  // Evaluator params
  const [evaluatorSubjectId, setEvaluatorSubjectId] = useState<string>(() => initEvaluar || '');
  const [evaluatorCompanyId, setEvaluatorCompanyId] = useState<string>(() => initCampana || '');

  // Admin state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(getAdminSession());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Efecto robusto de arranque para enrutamiento directo (QR, enlaces de empresa o admin)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const campanaParam = params.get('campana') || params.get('empresa') || params.get('code');
    const evaluarParam = params.get('evaluar') || params.get('id') || params.get('subject');
    const roleParam = params.get('role');
    const portalParam = params.get('portal');

    // 1. Acceso directo a Super Admin
    if (roleParam === 'admin' && !campanaParam && !evaluarParam) {
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
          let camp = await getCampaignByCode(cleanCode);
          if (!camp) camp = await getCampaignById(cleanCode);
          if (camp) {
            setActiveCompany(camp);
            setCurrentView('coordinator');
          }
        } catch (err) {
          console.error('Error cargando coordinador:', err);
        } finally {
          setIsLoadingRoute(false);
        }
      })();
      return;
    }

    // 3. Acceso directo a Evaluación (QR o Enlace de Evaluador)
    if (campanaParam || evaluarParam) {
      setIsLoadingRoute(true);

      const fetchCampaignAndRedirect = async () => {
        try {
          let matchedCampana: Campaign | null = null;
          let matchedSubjectId = evaluarParam ? evaluarParam.trim() : '';

          // A. Si se proporcionó ID de evaluado, buscar el colaborador primero
          if (evaluarParam) {
            try {
              const sub = await getSubjectById(evaluarParam.trim());
              if (sub) {
                matchedSubjectId = sub.id;
                if (sub.campaignId) {
                  matchedCampana = await getCampaignById(sub.campaignId);
                }
              }
            } catch (errSub) {
              console.warn('Error buscando evaluado por ID:', errSub);
            }
          }

          // B. Si aún no tenemos la campaña y viene campanaParam
          if (!matchedCampana && campanaParam) {
            const cleanCode = campanaParam.trim();

            // 1. Intentar Firestore directamente por clientCode
            const db = getFirebaseDb();
            if (db) {
              try {
                const q = query(collection(db, 'campaigns'), where('clientCode', '==', cleanCode.toUpperCase()));
                const snap = await getDocs(q);
                if (!snap.empty) {
                  const d = snap.docs[0];
                  matchedCampana = { id: d.id, ...d.data() } as Campaign;
                } else {
                  // 2. Intentar por document ID directo en Firestore
                  const docRef = doc(db, 'campaigns', cleanCode);
                  const docSnap = await getDoc(docRef);
                  if (docSnap.exists()) {
                    matchedCampana = { id: docSnap.id, ...docSnap.data() } as Campaign;
                  }
                }
              } catch (fsErr) {
                console.warn('Error consultando Firestore directamente:', fsErr);
              }
            }

            // 3. Fallback con servicio unificado (incluye localStorage y mocks)
            if (!matchedCampana) {
              matchedCampana = (await getCampaignByCode(cleanCode)) || (await getCampaignById(cleanCode));
            }
          }

          if (matchedCampana) {
            setActiveCompany(matchedCampana);
            setEvaluatorCompanyId(matchedCampana.clientCode || matchedCampana.id);
          } else if (campanaParam) {
            setEvaluatorCompanyId(campanaParam);
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
          setIsLoadingRoute(false);
        }
      };

      fetchCampaignAndRedirect();
      return;
    }

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
              />
            )}

            {/* NIVEL 2: Acceso Directo de Evaluadores (Vía QR o Enlace) */}
            {currentView === 'evaluator' && (
              <EvaluatorPortal
                evaluatorSubjectId={evaluatorSubjectId}
                evaluatorCompanyId={evaluatorCompanyId}
                onNavigateHome={() => setCurrentView('client_welcome')}
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
