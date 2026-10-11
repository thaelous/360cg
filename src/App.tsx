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
import { Lock, Shield, Building2, UserCheck, Flame } from 'lucide-react';

export type AppView = 'client_welcome' | 'coordinator' | 'evaluator' | 'admin';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('client_welcome');
  const [activeCompany, setActiveCompany] = useState<Campaign | null>(null);

  // Evaluator params
  const [evaluatorSubjectId, setEvaluatorSubjectId] = useState<string>('');
  const [evaluatorCompanyId, setEvaluatorCompanyId] = useState<string>('');

  // Admin state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(getAdminSession());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Parse URL on initial load for direct evaluator or company links
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const evalParam = urlParams.get('evaluar') || urlParams.get('subject');
      const compParam = urlParams.get('empresa') || urlParams.get('code');
      const roleParam = urlParams.get('role');

      // LEVEL 2: Direct Evaluator URL (e.g. ?evaluar=ID_EVALUADO&empresa=ID_EMPRESA)
      if (evalParam) {
        setEvaluatorSubjectId(evalParam);
        if (compParam) {
          setEvaluatorCompanyId(compParam);
        }
        setCurrentView('evaluator');
        return;
      }

      // Direct Company access via URL (?code=CORP-2026-X or ?empresa=ID)
      if (compParam && !roleParam) {
        getCampaignByCode(compParam).then((camp) => {
          if (camp) {
            setActiveCompany(camp);
            setCurrentView('coordinator');
          }
        });
        return;
      }

      // Direct Admin request (?role=admin)
      if (roleParam === 'admin') {
        if (getAdminSession()) {
          setCurrentView('admin');
        } else {
          setIsAdminLoginModalOpen(true);
        }
      }
    } catch (e) {
      console.error('Error parsing URL parameters:', e);
    }
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
      <main className="flex-1">
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
