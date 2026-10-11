import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle, AlertCircle, RefreshCw, Key, ShieldCheck, Flame } from 'lucide-react';
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  clearStoredFirebaseConfig,
  isFirebaseConfigured,
  getEffectiveFirebaseConfig,
  firebaseConfig,
} from '../firebase/config';
import { isMockModeForced, setMockModeForced, resetToMockData, seedMockDataToFirestore } from '../services/dataService';
import { FirebaseCustomConfig } from '../types';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({ isOpen, onClose, onConfigUpdated }) => {
  const [isMock, setIsMock] = useState(isMockModeForced());
  const [formData, setFormData] = useState<FirebaseCustomConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsMock(isMockModeForced());
      const existing = getEffectiveFirebaseConfig();
      if (existing) {
        setFormData(existing);
      }
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.apiKey.trim() || !formData.projectId.trim()) {
      alert('Por favor introduce al menos el apiKey y projectId de tu proyecto Firebase.');
      return;
    }

    saveStoredFirebaseConfig({
      ...formData,
      apiKey: formData.apiKey.trim(),
      projectId: formData.projectId.trim(),
      authDomain: formData.authDomain.trim() || `${formData.projectId.trim()}.firebaseapp.com`,
      storageBucket: formData.storageBucket.trim() || `${formData.projectId.trim()}.appspot.com`,
      messagingSenderId: formData.messagingSenderId.trim(),
      appId: formData.appId.trim(),
    });

    setMockModeForced(false);
    setIsMock(false);
    setSuccessMsg('¡Credenciales de Firebase guardadas correctamente! Ahora los datos se sincronizan con Firestore.');
    onConfigUpdated();
  };

  const handleToggleMock = (enableMock: boolean) => {
    setMockModeForced(enableMock);
    setIsMock(enableMock);
    setSuccessMsg(
      enableMock
        ? 'Modo Demo activado. Usando almacenamiento local con datos simulados.'
        : 'Modo Firebase activado.'
    );
    onConfigUpdated();
  };

  const handleClearCredentials = () => {
    if (confirm('¿Deseas remover las credenciales guardadas y volver al modo simulado?')) {
      clearStoredFirebaseConfig();
      setMockModeForced(true);
      setIsMock(true);
      setFormData({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      });
      setSuccessMsg('Credenciales removidas.');
      onConfigUpdated();
    }
  };

  const handleResetDemoData = async () => {
    if (confirm('¿Restablecer los datos demo iniciales (TechNova y Banco Innova)?')) {
      await resetToMockData();
      setSuccessMsg('Datos demo reiniciados con éxito.');
      onConfigUpdated();
    }
  };

  const handleSyncToFirestore = async () => {
    try {
      setSuccessMsg('Sincronizando campañas, evaluados y respuestas a Cloud Firestore...');
      await seedMockDataToFirestore();
      setSuccessMsg('¡Colecciones (campaigns, evaluated_subjects, responses) sincronizadas exitosamente en Firestore!');
      onConfigUpdated();
    } catch (err: any) {
      alert('Error sincronizando con Firestore: ' + (err?.message || err));
    }
  };

  const configured = isFirebaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Configuración de Firebase Firestore</h3>
              <p className="text-xs text-slate-300">Conecta tu base de datos en la nube o usa el modo demo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">Modo de Operación Actual:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isMock
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {isMock ? 'Demo / LocalStorage' : 'Firebase Firestore Activo'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isMock
                  ? 'Las evaluaciones se guardan de forma instantánea en memoria local. Ideal para pruebas y demostraciones.'
                  : 'Las evaluaciones y campañas se envían en tiempo real a tus colecciones de Cloud Firestore.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleMock(!isMock)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  isMock
                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {isMock ? 'Usar Firebase' : 'Forzar Modo Demo'}
              </button>
            </div>
          </div>

          {/* Firestore Collections Structure Card */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 text-xs text-slate-700">
            <p className="font-semibold text-indigo-950 flex items-center gap-1.5 mb-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Estructura de Colecciones en Firestore:
            </p>
            <ul className="space-y-1 text-slate-600 list-disc list-inside">
              <li><code className="text-indigo-700 font-mono">campaigns</code>: Campañas con código único de cliente y estado.</li>
              <li><code className="text-indigo-700 font-mono">evaluated_subjects</code>: Personas evaluadas (nombre, cargo, área).</li>
              <li><code className="text-indigo-700 font-mono">responses</code>: Respuestas 360 con escala Likert (1-5), rol y comentarios abiertos.</li>
            </ul>

            <div className="pt-2 mt-2 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Proyecto: <strong className="text-slate-800 font-mono">{formData.projectId || firebaseConfig.projectId || 'No configurado'}</strong>
              </span>
              <button
                type="button"
                onClick={handleSyncToFirestore}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs self-start sm:self-auto"
              >
                <Database className="w-3.5 h-3.5" />
                Poblar Colecciones en Firestore
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-600" />
                Credenciales del Proyecto Firebase (`firebaseConfig`)
              </h4>
              {configured && (
                <button
                  type="button"
                  onClick={handleClearCredentials}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Limpiar credenciales
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Puedes obtener estas credenciales en Firebase Console → Configuración del proyecto → General → Tus apps → Web app.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">apiKey *</label>
                <input
                  type="text"
                  required
                  placeholder="tu_api_key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">projectId *</label>
                <input
                  type="text"
                  required
                  placeholder="mi-proyecto-360"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">authDomain</label>
                <input
                  type="text"
                  placeholder="mi-proyecto-360.firebaseapp.com"
                  value={formData.authDomain}
                  onChange={(e) => setFormData({ ...formData, authDomain: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">storageBucket</label>
                <input
                  type="text"
                  placeholder="mi-proyecto-360.appspot.com"
                  value={formData.storageBucket}
                  onChange={(e) => setFormData({ ...formData, storageBucket: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">messagingSenderId</label>
                <input
                  type="text"
                  placeholder="123456789"
                  value={formData.messagingSenderId}
                  onChange={(e) => setFormData({ ...formData, messagingSenderId: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">appId</label>
                <input
                  type="text"
                  placeholder="1:123456789:web:abcdef"
                  value={formData.appId}
                  onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleResetDemoData}
                className="text-xs text-slate-600 hover:text-indigo-600 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reiniciar base de datos local demo
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm"
                >
                  Guardar y Conectar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
