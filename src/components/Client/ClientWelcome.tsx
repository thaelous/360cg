import React, { useState } from 'react';
import { Building2, ArrowRight, ShieldCheck, QrCode, BarChart3, AlertCircle } from 'lucide-react';
import { getCampaignByCode, getCachedCampaignByCode } from '../../services/dataService';
import { Campaign } from '../../types';

interface ClientWelcomeProps {
  onCompanyAuthenticated: (campaign: Campaign) => void;
}

export const ClientWelcome: React.FC<ClientWelcomeProps> = ({ onCompanyAuthenticated }) => {
  const [clientCode, setClientCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (codeToValidate: string) => {
    const trimmed = codeToValidate.trim().toUpperCase();
    if (!trimmed) {
      setErrorMsg('Por favor introduce tu Código de Empresa.');
      return;
    }

    setErrorMsg('');

    // Fast-path para empresas demo o en caché local (< 5ms)
    const cached = getCachedCampaignByCode(trimmed);
    if (cached) {
      onCompanyAuthenticated(cached);
      return;
    }

    setLoading(true);

    try {
      const campaign = await getCampaignByCode(trimmed);
      if (!campaign) {
        setErrorMsg(
          `No se encontró ninguna empresa con el código "${trimmed}". Verifica con tu administrador del sistema.`
        );
        setLoading(false);
        return;
      }

      onCompanyAuthenticated(campaign);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al conectar con la base de datos. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-8 text-center">
        {/* Brand logo & badge */}
        <div className="flex flex-col items-center">
          <img
            src="/comgico.png"
            alt="Comunicación Global"
            className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-full shadow-lg ring-4 ring-lime-400/40 mb-3 hover:scale-105 transition-transform"
          />
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-50 border border-lime-300 text-slate-900 text-xs font-bold tracking-wide shadow-xs">
            <Building2 className="w-4 h-4 text-lime-700" />
            <span>Comunicación Global • Portal de Acceso Empresarial</span>
          </div>
        </div>

        {/* Central Headlines */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Comunicación Global <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-600 via-lime-500 to-emerald-600">
              Evaluación 360 Grados
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
            Ingresa tu Código de Empresa para dar de alta a tus colaboradores, generar códigos QR de evaluación y monitorear el progreso en tiempo real.
          </p>
        </div>

        {/* Central Input Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90 text-left space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(clientCode);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Código de Empresa / Cliente:
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej. CORP-2026-X"
                  value={clientCode}
                  onChange={(e) => {
                    setClientCode(e.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full text-center text-lg sm:text-xl font-mono font-black tracking-widest uppercase bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-400/20 focus:bg-white transition shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-lime-500 hover:bg-lime-400 active:scale-[0.99] disabled:opacity-50 text-slate-900 font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-lime-500/30 transition flex items-center justify-center gap-2 cursor-pointer border border-lime-400"
            >
              {loading ? 'Verificando código...' : 'Ingresar a mi Panel de Empresa'}
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </form>

          {/* Quick Demo Codes for instant trial */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              ¿Quieres probar una empresa demo?
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setClientCode('CORP-2026-X');
                  handleSubmit('CORP-2026-X');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-lime-50 hover:text-slate-900 hover:border-lime-300 text-slate-700 rounded-xl font-mono text-xs font-bold transition border border-slate-200"
              >
                CORP-2026-X (TechNova)
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientCode('CORP-2026-B');
                  handleSubmit('CORP-2026-B');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-lime-50 hover:text-slate-900 hover:border-lime-300 text-slate-700 rounded-xl font-mono text-xs font-bold transition border border-slate-200"
              >
                CORP-2026-B (Banco Innova)
              </button>
            </div>
          </div>
        </div>

        {/* 3 Pillars info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
          <div className="p-4 bg-white/80 border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-lime-100 flex items-center justify-center mb-2">
              <ShieldCheck className="w-5 h-5 text-lime-700" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">100% Confidencial</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Evaluación anónima garantizada para promover feedback sincero.
            </p>
          </div>
          <div className="p-4 bg-white/80 border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-lime-100 flex items-center justify-center mb-2">
              <QrCode className="w-5 h-5 text-lime-700" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Acceso por Código QR</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tus evaluadores responden desde su smartphone al instante.
            </p>
          </div>
          <div className="p-4 bg-white/80 border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center mb-2">
              <BarChart3 className="w-5 h-5 text-lime-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Reportes Ejecutivos</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Análisis GAP y gráficos de competencias por roles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
