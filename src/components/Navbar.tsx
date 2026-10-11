import React from 'react';
import {
  Building2,
  Lock,
  ShieldCheck,
  LogOut,
  Flame,
  UserCheck,
} from 'lucide-react';
import { Campaign } from '../types';
import { AdminUser } from '../services/authService';

interface NavbarProps {
  currentView: 'client_welcome' | 'coordinator' | 'evaluator' | 'admin';
  activeCompany: Campaign | null;
  adminUser: AdminUser | null;
  onNavigateHome: () => void;
  onOpenAdminLogin: () => void;
  onOpenAdminPanel: () => void;
  onLogoutAdmin: () => void;
  onLogoutCompany: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  activeCompany,
  adminUser,
  onNavigateHome,
  onOpenAdminLogin,
  onOpenAdminPanel,
  onLogoutAdmin,
  onLogoutCompany,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <img
            src="/comgico.png"
            alt="Comunicación Global"
            className="h-10 w-10 object-contain rounded-full shadow-xs ring-2 ring-lime-500/40 group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="font-extrabold text-slate-900 text-base tracking-tight flex items-center gap-1.5">
              Comunicación Global
              {currentView === 'coordinator' && (
                <>
                  <span className="text-slate-300 font-normal">·</span>
                  <span className="text-slate-600 font-semibold text-xs sm:text-sm">Portal Empresa</span>
                </>
              )}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium leading-none">
              Evaluaciones 360°
            </span>
          </div>
        </div>

        {/* Center: Contextual Status Badge (only for non-coordinator views) */}
        <div className="hidden sm:flex items-center gap-2">
          {currentView === 'evaluator' && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-lime-50 text-slate-900 border border-lime-300 rounded-full text-xs font-semibold shadow-xs">
              <UserCheck className="w-3.5 h-3.5 text-lime-700" />
              <span>Cuestionario 360° en Progreso</span>
            </div>
          )}

          {currentView === 'admin' && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-lime-400 border border-slate-700 rounded-full text-xs font-semibold shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
              <span>Panel Super Administrador</span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* If Coordinator is active, show discreet company badge and exit button */}
          {currentView === 'coordinator' && activeCompany && (
            <>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200/90 rounded-full text-xs font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-900">{activeCompany.companyName}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-[11px] text-slate-500 font-semibold">
                  {activeCompany.clientCode}
                </span>
              </div>

              <button
                onClick={onLogoutCompany}
                className="text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-medium px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
                title="Cerrar sesión de empresa"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Salir</span>
              </button>
            </>
          )}

          {/* If Evaluator is active, show back to home button */}
          {currentView === 'evaluator' && (
            <button
              onClick={onNavigateHome}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition font-medium"
            >
              Portal Principal
            </button>
          )}

          {/* If Admin is logged in */}
          {adminUser ? (
            <div className="flex items-center gap-2">
              {currentView !== 'admin' && (
                <button
                  onClick={onOpenAdminPanel}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-lime-400 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
                  <span>Ir al Panel Admin</span>
                </button>
              )}
              <button
                onClick={onLogoutAdmin}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="Cerrar sesión de Super Administrador"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            currentView !== 'coordinator' && currentView !== 'evaluator' && (
              <button
                onClick={onOpenAdminLogin}
                className="text-xs text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition flex items-center gap-1"
                title="Acceso restringido para el creador y administrador del sistema"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Admin</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};
