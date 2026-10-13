import React from 'react';
import {
  BarChart3,
  QrCode,
  Users,
  CheckCircle2,
  FileDown,
  Building2,
} from 'lucide-react';
import { Campaign } from '../../types';
import { OnboardingTour, TourStep } from './OnboardingTour';

export const COMPANY_TOUR_STORAGE_KEY = 'eval360_tour_company_viewed_v1';

interface CompanyOnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: Campaign | null;
  onComplete?: () => void;
}

export const CompanyOnboardingTour: React.FC<CompanyOnboardingTourProps> = ({
  isOpen,
  onClose,
  campaign,
  onComplete,
}) => {
  const companyName = campaign?.companyName || 'tu empresa';

  const steps: TourStep[] = [
    {
      id: 'step-metrics',
      target: '#tour-metrics',
      badge: 'Paso 1 · Métricas en Vivo',
      icon: BarChart3,
      title: 'Monitoreo en Tiempo Real',
      content:
        'Supervisa aquí cuántos cuestionarios se han completado, la meta global de evaluaciones y la tasa de participación activa de tu empresa.',
    },
    {
      id: 'step-qr-broadcast',
      target: '#tour-qr-broadcast',
      badge: 'Paso 2 · Difusión & QR',
      icon: QrCode,
      title: 'Difusión de la Evaluación',
      content:
        'Obtén aquí el código QR y el enlace directo. Compártelo con tu equipo para que los evaluadores ingresen directamente desde su celular o computadora sin contraseñas.',
    },
    {
      id: 'step-collab-management',
      target: '#tour-collab-management',
      badge: 'Paso 3 · Registro & Carga Masiva',
      icon: Users,
      title: 'Alta de Colaboradores',
      content:
        'Registra a los colaboradores individualmente o descarga nuestra plantilla oficial de Excel (.xlsx) para cargar a todo tu personal con sus metas de evaluadores en un solo clic.',
    },
    {
      id: 'step-evaluated-list',
      target: '#tour-evaluated-list',
      badge: 'Paso 4 · Estatus Individual',
      icon: CheckCircle2,
      title: 'Seguimiento por Colaborador',
      content:
        'Revisa el avance individual de cada persona: cuántos cuestionarios ha recibido vs. su meta y su promedio consolidado en vivo.',
    },
    {
      id: 'step-reports-download',
      target: '#tour-reports-download',
      badge: 'Paso 5 · Reportes Ejecutivos',
      icon: FileDown,
      title: 'Descarga de Resultados',
      content:
        'Descarga el Reporte Ejecutivo General en PDF con diagnóstico de competencias por departamento, las fichas individuales de cada colaborador y el archivo maestro de Excel con diseño corporativo.',
    },
  ];

  return (
    <OnboardingTour
      isOpen={isOpen}
      onClose={onClose}
      steps={steps}
      storageKey={COMPANY_TOUR_STORAGE_KEY}
      tourTitle={`Tour Portal ${companyName}`}
      onComplete={onComplete}
    />
  );
};
