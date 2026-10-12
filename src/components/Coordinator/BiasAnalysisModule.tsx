import React, { useMemo, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Filter,
  UserX,
  Sparkles,
} from 'lucide-react';
import { Campaign, EvaluatedSubject, EvaluationResponse, EvaluatorRole, EVALUATOR_ROLES_INFO } from '../../types';

interface BiasAnalysisModuleProps {
  campaign: Campaign;
  subjects: EvaluatedSubject[];
  responses: EvaluationResponse[];
}

export interface BiasAlert {
  id: string;
  type: 'identical_peers' | 'straight_line_high' | 'straight_line_neutral' | 'straight_line_low';
  severity: 'high' | 'medium';
  evaluatorIdentifier: string;
  evaluatorRole: EvaluatorRole;
  subjectNames: string[];
  scorePattern: number;
  questionCount: number;
  title: string;
  description: string;
  recommendation: string;
}

export const BiasAnalysisModule: React.FC<BiasAnalysisModuleProps> = ({
  campaign,
  subjects,
  responses,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'alerts_only'>('all');
  const [isExpanded, setIsExpanded] = useState(true);

  // Subject lookup map
  const subjectsMap = useMemo(() => {
    const map = new Map<string, EvaluatedSubject>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  // Statistical Bias Engine
  const { alerts, cleanResponsesCount, reliabilityScore } = useMemo(() => {
    const foundAlerts: BiasAlert[] = [];
    let cleanCount = 0;

    if (responses.length === 0) {
      return { alerts: [], cleanResponsesCount: 0, reliabilityScore: 100 };
    }

    // 1. Check for straight-lining (varianza cero) in each individual response
    responses.forEach((resp) => {
      const scores = Object.values(resp.scores).filter((val): val is number => typeof val === 'number');
      const sub = subjectsMap.get(resp.subjectId);
      const subName = sub ? sub.name : 'Colaborador';
      const evalName = resp.evaluatorName?.trim() || EVALUATOR_ROLES_INFO[resp.evaluatorRole]?.label || 'Evaluador';

      if (scores.length >= 4) {
        const firstVal = scores[0];
        const isStraightLine = scores.every((v) => v === firstVal);

        if (isStraightLine) {
          let type: BiasAlert['type'] = 'straight_line_high';
          let title = 'Sesgo de Indulgencia Plana (Puntaje Máximo)';
          let desc = `Se asignó calificación perfecta (${firstVal}.0 / 5.0) en el 100% de los reactivos evaluados (${scores.length} preguntas), sin discriminar oportunidades de crecimiento.`;
          let rec = 'Sugerir al evaluador identificar al menos 1 o 2 aspectos de mejora constructiva para enriquecer el plan de desarrollo.';
          let severity: BiasAlert['severity'] = 'high';

          if (firstVal === 3) {
            type = 'straight_line_neutral';
            title = 'Sesgo de Tendencia Central (Puntaje Neutro Fijo)';
            desc = `Se asignó 3.0 en todas las preguntas (${scores.length} reactivos). Posible respuesta automática por inercia o falta de tiempo.`;
            rec = 'Revisar si el evaluador tuvo tiempo suficiente para responder con detenimiento cada competencia.';
            severity = 'medium';
          } else if (firstVal <= 2) {
            type = 'straight_line_low';
            title = 'Sesgo de Severidad Uniforme (Puntaje Punitivo)';
            desc = `Se calificó con ${firstVal}.0 todas las conductas del cuestionario sin distinguir áreas de fortaleza.`;
            rec = 'Abordar en sesión de calibración para evitar sesgo punitivo generalizado.';
            severity = 'high';
          }

          foundAlerts.push({
            id: `alert-straight-${resp.id}`,
            type,
            severity,
            evaluatorIdentifier: evalName,
            evaluatorRole: resp.evaluatorRole,
            subjectNames: [subName],
            scorePattern: firstVal,
            questionCount: scores.length,
            title,
            description: desc,
            recommendation: rec,
          });
        } else {
          cleanCount++;
        }
      } else {
        cleanCount++;
      }
    });

    // 2. Check for Identical Ratings across multiple colleagues by the same evaluator
    // Group responses by evaluator identity
    const evaluatorMap = new Map<string, { role: EvaluatorRole; entries: Array<{ subjectId: string; subName: string; avg: number; scores: number[] }> }>();

    responses.forEach((resp) => {
      // Use evaluatorName if available, else group by evaluator role if specific
      const key = resp.evaluatorName && resp.evaluatorName.trim().length > 2
        ? resp.evaluatorName.trim().toLowerCase()
        : null;

      if (!key) return; // Anonymous responses without names cannot be tracked across subjects reliably

      const scores = Object.values(resp.scores).filter((v): v is number => typeof v === 'number');
      if (scores.length === 0) return;

      const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
      const sub = subjectsMap.get(resp.subjectId);
      const subName = sub ? sub.name : 'Colaborador';

      if (!evaluatorMap.has(key)) {
        evaluatorMap.set(key, { role: resp.evaluatorRole, entries: [] });
      }
      evaluatorMap.get(key)!.entries.push({ subjectId: resp.subjectId, subName, avg, scores });
    });

    // Evaluate cross-colleague homogeneity
    evaluatorMap.forEach((evalData, evalKey) => {
      // If evaluated 2 or more distinct subjects
      if (evalData.entries.length >= 2) {
        const firstAvg = evalData.entries[0].avg;
        const allSameAvg = evalData.entries.every((e) => Math.abs(e.avg - firstAvg) < 0.05);

        // Check if all distinct subjects got exact same score
        if (allSameAvg) {
          const colleagueNames = Array.from(new Set(evalData.entries.map((e) => e.subName)));
          if (colleagueNames.length >= 2) {
            const displayName = evalData.entries[0].subName ? evalKey.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Evaluador';
            foundAlerts.push({
              id: `alert-peers-${evalKey}`,
              type: 'identical_peers',
              severity: 'high',
              title: 'Sesgo de Calificación Idéntica entre Compañeros',
              description: `El evaluador "${displayName}" calificó a ${colleagueNames.length} compañeros (${colleagueNames.join(', ')}) con exactamente el mismo puntaje promedio (${firstAvg.toFixed(2)} pts). No se evidencia discriminación de desempeño individual.`,
              recommendation: 'Verificar en reunión de calibración 360° si el evaluador aplicó un criterio reflexivo o contestó con una misma plantilla mental.',
              evaluatorIdentifier: displayName,
              evaluatorRole: evalData.role,
              subjectNames: colleagueNames,
              scorePattern: firstAvg,
              questionCount: evalData.entries[0].scores.length,
            });
          }
        }
      }
    });

    // Deduplicate alerts if any
    const uniqueAlertsMap = new Map<string, BiasAlert>();
    foundAlerts.forEach((a) => uniqueAlertsMap.set(a.id, a));
    const uniqueAlerts = Array.from(uniqueAlertsMap.values());

    // Reliability calculation
    const totalAssessed = responses.length;
    const score = totalAssessed > 0
      ? Math.max(0, Math.min(100, Math.round(((totalAssessed - uniqueAlerts.length) / totalAssessed) * 100)))
      : 100;

    return {
      alerts: uniqueAlerts,
      cleanResponsesCount: Math.max(0, responses.length - uniqueAlerts.length),
      reliabilityScore: score,
    };
  }, [responses, subjectsMap]);

  const hasAlerts = alerts.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header bar del Módulo de Sesgo */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              hasAlerts
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}
          >
            {hasAlerts ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Control de Calidad y Análisis de Sesgo Estadístico
              </h3>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                  hasAlerts
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {hasAlerts ? `${alerts.length} Alertas de Sesgo` : 'Muestra 100% Confiable'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Detección algorítmica de respuestas monótonas (straight-lining), varianza cero y calificaciones idénticas entre compañeros
            </p>
          </div>
        </div>

        {/* Botón de colapsar / expandir */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title={isExpanded ? 'Contraer módulo' : 'Expandir módulo'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-5 bg-slate-50/50">
          {/* Tarjetas KPI de Calidad Estadística */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* KPI 1: Índice de Confiabilidad */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                  Índice de Confiabilidad
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={`text-2xl font-black font-mono ${
                      reliabilityScore >= 90
                        ? 'text-emerald-600'
                        : reliabilityScore >= 75
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {reliabilityScore}%
                  </span>
                  <span className="text-xs text-slate-400">calidad muestral</span>
                </div>
              </div>
              <div
                className={`p-2 rounded-xl ${
                  reliabilityScore >= 90
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                <Scale className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 2: Evaluaciones Objetivas */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                  Cuestionarios Objetivos
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {cleanResponsesCount}
                  </span>
                  <span className="text-xs text-slate-400">de {responses.length} total</span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 3: Alertas Detectadas */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                  Alertas de Sesgo / Inercia
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={`text-2xl font-black font-mono ${
                      hasAlerts ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  >
                    {alerts.length}
                  </span>
                  <span className="text-xs text-slate-400">patrones detectados</span>
                </div>
              </div>
              <div
                className={`p-2 rounded-xl ${
                  hasAlerts ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Panel de Estado / Alertas */}
          {!hasAlerts ? (
            /* Estado 100% Confiable / Sin alertas */
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-emerald-950">
                  Muestra Estadísticamente Confiable y Reflexiva
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  El algoritmo analizó todas las evaluaciones completadas y <strong>no detectó patrones de respuesta monótona</strong> (todos los reactivos con el mismo puntaje exacto) ni calificaciones homogéneas indiscriminadas entre compañeros. La dispersión y variabilidad de puntajes indica un proceso reflexivo que distingue fortalezas de áreas de oportunidad.
                </p>
              </div>
            </div>
          ) : (
            /* Alertas Encontradas */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Alertas Detectadas para Revisión Directiva ({alerts.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Criterio: varianza 0.00 o calificaciones idénticas inter-sujeto
                </span>
              </div>

              <div className="space-y-2.5">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-2xs hover:border-amber-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {alert.title}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              alert.severity === 'high'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            Riesgo {alert.severity === 'high' ? 'Alto' : 'Moderado'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {alert.description}
                        </p>

                        <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span>
                            Evaluador:{' '}
                            <strong className="text-slate-800">{alert.evaluatorIdentifier}</strong>{' '}
                            ({EVALUATOR_ROLES_INFO[alert.evaluatorRole]?.label || alert.evaluatorRole})
                          </span>
                          <span>
                            Colaborador(es):{' '}
                            <strong className="text-slate-800">{alert.subjectNames.join(', ')}</strong>
                          </span>
                          <span>
                            Puntaje Plano:{' '}
                            <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {alert.scorePattern.toFixed(2)} pts
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Caja de recomendación */}
                      <div className="sm:max-w-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[11px] text-slate-600 space-y-1 shrink-0">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-blue-600" />
                          Recomendación:
                        </span>
                        <p className="leading-normal">{alert.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
