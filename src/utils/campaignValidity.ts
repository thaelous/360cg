import { Campaign } from '../types';

export interface CampaignValidityInfo {
  isExpired: boolean;
  hasStarted: boolean;
  isPendingStart: boolean;
  isClosed: boolean;
  canAcceptResponses: boolean;
  remainingDays: number | null;
  remainingHours: number | null;
  statusBadge: {
    label: string;
    description: string;
    colorClasses: string;
    dotClasses: string;
  };
}

/**
 * Calcula el estado de vigencia de una campaña según las reglas de negocio:
 * 1. Si no ha iniciado (startedAt es nulo/vacío o status === 'pending_start'): está en espera.
 * 2. Si ya inició: expiresAt marca el corte (o deadline legado).
 * 3. Si la fecha actual supera expiresAt: vencida.
 * 4. Si status === 'closed': cerrada manualmente.
 */
export function getCampaignValidityInfo(campaign: Campaign): CampaignValidityInfo {
  const isClosed = campaign.status === 'closed';

  const hasStarted = Boolean(
    campaign.startedAt ||
    // Campañas legadas sin startedAt pero ya activas con deadline
    (campaign.status === 'active' && !campaign.durationDays && campaign.deadline)
  );

  const isPendingStart =
    campaign.status === 'pending_start' ||
    (!campaign.startedAt && typeof campaign.durationDays === 'number' && campaign.durationDays > 0);

  const now = Date.now();
  let isExpired = false;
  let remainingDays: number | null = null;
  let remainingHours: number | null = null;

  // Fecha límite efectiva: preferimos expiresAt; si no existe pero hay deadline legado, lo usamos
  let effectiveExpirationTimestamp: number | null = null;
  if (campaign.expiresAt) {
    const t = new Date(campaign.expiresAt).getTime();
    if (!isNaN(t)) effectiveExpirationTimestamp = t;
  } else if (campaign.deadline && !campaign.durationDays) {
    // Tratamos el deadline como fin del día local
    const t = new Date(`${campaign.deadline}T23:59:59`).getTime();
    if (!isNaN(t)) effectiveExpirationTimestamp = t;
  }

  if (effectiveExpirationTimestamp !== null && hasStarted) {
    const diffMs = effectiveExpirationTimestamp - now;
    if (diffMs <= 0) {
      isExpired = true;
      remainingDays = 0;
      remainingHours = 0;
    } else {
      isExpired = false;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      remainingHours = hours;
      remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }
  }

  const canAcceptResponses = !isClosed && !isExpired;

  // Generación de etiquetas y colores para badges
  let statusBadge = {
    label: 'Campaña Activa',
    description: 'Recibiendo respuestas',
    colorClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClasses: 'bg-emerald-500 animate-pulse',
  };

  if (isClosed) {
    statusBadge = {
      label: 'Campaña Cerrada',
      description: 'Cerrada administrativamente',
      colorClasses: 'bg-slate-100 text-slate-700 border-slate-300',
      dotClasses: 'bg-slate-400',
    };
  } else if (isExpired) {
    statusBadge = {
      label: 'Periodo Concluido (Vencida)',
      description: 'El plazo contratado ha finalizado',
      colorClasses: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClasses: 'bg-rose-500',
    };
  } else if (isPendingStart) {
    const daysText = campaign.durationDays ? `${campaign.durationDays} días` : 'días asignados';
    statusBadge = {
      label: `En espera (Duración: ${daysText} al iniciar)`,
      description: 'El tiempo empezará a correr al recibir la 1ª evaluación',
      colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClasses: 'bg-amber-500',
    };
  } else if (hasStarted && remainingDays !== null) {
    const daysLabel = remainingDays === 1 ? '1 día restante' : `${remainingDays} días restantes`;
    statusBadge = {
      label: `Activa (${daysLabel})`,
      description: `Finaliza el ${new Date(effectiveExpirationTimestamp!).toLocaleDateString('es-ES')}`,
      colorClasses: remainingDays <= 2
        ? 'bg-amber-50 text-amber-800 border-amber-300'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClasses: remainingDays <= 2 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse',
    };
  }

  return {
    isExpired,
    hasStarted,
    isPendingStart,
    isClosed,
    canAcceptResponses,
    remainingDays,
    remainingHours,
    statusBadge,
  };
}
