import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, CheckCircle2, Clock, Target, Calendar } from 'lucide-react';
import { Campaign, EvaluatedSubject, EvaluationResponse } from '../../types';
import { BiasAnalysisModule } from './BiasAnalysisModule';

interface CoordinatorAnalyticsDashboardProps {
  campaign: Campaign;
  subjects: EvaluatedSubject[];
  responses: EvaluationResponse[];
}

export const CoordinatorAnalyticsDashboard: React.FC<CoordinatorAnalyticsDashboardProps> = ({
  campaign,
  subjects,
  responses,
}) => {
  const [trendViewMode, setTrendViewMode] = useState<'daily' | 'cumulative'>('daily');

  // 1. DATA FOR DONUT CHART (ESTADO GENERAL: PENDIENTES VS COMPLETADAS)
  const totalTargetEvaluations = useMemo(() => {
    return subjects.reduce((acc, s) => acc + (s.targetEvaluators || 5), 0);
  }, [subjects]);

  const completedCount = responses.length;
  const pendingCount = Math.max(0, totalTargetEvaluations - completedCount);
  const completionPercentage = totalTargetEvaluations > 0
    ? Math.min(100, Math.round((completedCount / totalTargetEvaluations) * 100))
    : 0;

  const donutData = useMemo(() => {
    if (totalTargetEvaluations === 0 && completedCount === 0) {
      return [
        { name: 'Sin colaboradores', value: 1, color: '#e2e8f0', count: 0 },
      ];
    }
    return [
      {
        name: 'Completadas',
        value: completedCount,
        color: '#10b981', // emerald-500
        percentage: totalTargetEvaluations > 0 ? Math.round((completedCount / totalTargetEvaluations) * 100) : 100,
      },
      {
        name: 'Pendientes',
        value: pendingCount,
        color: '#e2e8f0', // slate-200
        percentage: totalTargetEvaluations > 0 ? Math.round((pendingCount / totalTargetEvaluations) * 100) : 0,
      },
    ];
  }, [completedCount, pendingCount, totalTargetEvaluations]);

  // 2. DATA FOR DAILY PARTICIPATION TREND CHART
  const trendData = useMemo(() => {
    if (responses.length === 0) {
      // Create a 7-day placeholder series ending today
      const now = new Date();
      const points = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        points.push({
          date: dateStr,
          label,
          diarias: 0,
          acumuladas: 0,
        });
      }
      return points;
    }

    // Map responses by day (YYYY-MM-DD)
    const dayCounts = new Map<string, number>();
    responses.forEach((r) => {
      const dateStr = r.timestamp ? r.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];
      dayCounts.set(dateStr, (dayCounts.get(dateStr) || 0) + 1);
    });

    // Find date boundaries
    const dates = Array.from(dayCounts.keys()).sort();
    let startDate = new Date(dates[0]);
    let endDate = new Date(dates[dates.length - 1]);

    // If campaign started earlier, use campaign.startedAt
    if (campaign.startedAt) {
      const campStart = new Date(campaign.startedAt);
      if (campStart < startDate) {
        startDate = campStart;
      }
    }

    // Ensure at least 5 days span for smooth chart
    const daySpan = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daySpan < 5) {
      const extra = 5 - daySpan;
      startDate = new Date(startDate);
      startDate.setDate(startDate.getDate() - extra);
    }

    const points = [];
    let runningTotal = 0;
    const curr = new Date(startDate);

    // Build day by day
    while (curr <= endDate || points.length < 5) {
      const dateStr = curr.toISOString().split('T')[0];
      const count = dayCounts.get(dateStr) || 0;
      runningTotal += count;

      const label = curr.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      points.push({
        date: dateStr,
        label,
        diarias: count,
        acumuladas: runningTotal,
      });

      curr.setDate(curr.getDate() + 1);
      if (points.length >= 30) break; // Limit to 30 days window for clarity
    }

    return points;
  }, [responses, campaign.startedAt]);

  // Average responses per active day
  const avgResponsesPerDay = useMemo(() => {
    if (responses.length === 0) return 0;
    const daysWithResponses = trendData.filter((d) => d.diarias > 0).length || 1;
    return (responses.length / daysWithResponses).toFixed(1);
  }, [responses, trendData]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. GRÁFICO DE TENDENCIA DE PARTICIPACIÓN DIARIA (Columna amplia: 2 cols en desktop) */}
      <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div>
          {/* Header del gráfico */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Tendencia de Participación Diaria
                </h3>
                <p className="text-xs text-slate-500">
                  {trendViewMode === 'daily'
                    ? 'Volumen de cuestionarios 360° completados por día'
                    : 'Crecimiento acumulado de evaluaciones en la campaña'}
                </p>
              </div>
            </div>

            {/* Selector de modo y stats rápidas */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                <Calendar className="w-3 h-3 text-slate-400" />
                Media: <strong className="text-slate-800">{avgResponsesPerDay}</strong> resp/día
              </span>

              <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTrendViewMode('daily')}
                  className={`px-3 py-1 rounded-lg transition text-xs cursor-pointer ${
                    trendViewMode === 'daily'
                      ? 'bg-white text-indigo-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Diarias
                </button>
                <button
                  type="button"
                  onClick={() => setTrendViewMode('cumulative')}
                  className={`px-3 py-1 rounded-lg transition text-xs cursor-pointer ${
                    trendViewMode === 'cumulative'
                      ? 'bg-white text-indigo-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Acumulado
                </button>
              </div>
            </div>
          </div>

          {/* Contenedor del Gráfico Recharts */}
          <div className="h-64 sm:h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              {trendViewMode === 'daily' ? (
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorDiarias" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs border border-slate-800">
                            <div className="text-slate-400 font-medium mb-1">
                              Fecha: {data.label} ({data.date})
                            </div>
                            <div className="flex items-center gap-2 font-bold text-white">
                              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                              <span>Respuestas del día:</span>
                              <span className="font-mono text-lime-400 text-sm">
                                {data.diarias}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-1">
                              Total acumulado: {data.acumuladas} de {totalTargetEvaluations}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="diarias"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorDiarias)"
                    name="Evaluaciones Diarias"
                    dot={{ stroke: '#2563eb', strokeWidth: 2, r: 3, fill: '#ffffff' }}
                    activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 3, fill: '#ffffff' }}
                  />
                </AreaChart>
              ) : (
                <LineChart
                  data={trendData}
                  margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs border border-slate-800">
                            <div className="text-slate-400 font-medium mb-1">
                              Corte: {data.label}
                            </div>
                            <div className="flex items-center gap-2 font-bold text-white">
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              <span>Progreso acumulado:</span>
                              <span className="font-mono text-emerald-400 text-sm">
                                {data.acumuladas}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-1">
                              Meta total: {totalTargetEvaluations} ({totalTargetEvaluations > 0 ? Math.round((data.acumuladas / totalTargetEvaluations) * 100) : 0}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="acumuladas"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ stroke: '#10b981', strokeWidth: 2, r: 3, fill: '#ffffff' }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 3, fill: '#ffffff' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer info del gráfico */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Actualización sincronizada con respuestas registradas
          </span>
          <span className="font-semibold text-slate-700">
            Total Recabado: {completedCount} respuestas
          </span>
        </div>
      </div>

      {/* 2. GRÁFICO DE DONA: ESTADO GENERAL DE EVALUACIONES (Pendientes vs Completadas) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div>
          {/* Header de la dona */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <PieIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Estado de Evaluaciones
                </h3>
                <p className="text-xs text-slate-500">
                  Completadas vs. Pendientes
                </p>
              </div>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-700">
              {completionPercentage}%
            </span>
          </div>

          {/* Gráfico Recharts Donut con centro interactivo */}
          <div className="relative h-56 w-full flex items-center justify-center pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={92}
                  paddingAngle={completedCount > 0 && pendingCount > 0 ? 4 : 0}
                  cornerRadius={6}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl text-xs border border-slate-800">
                          <div className="font-bold flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: data.color }}
                            />
                            {data.name}: {data.value}
                          </div>
                          {data.percentage !== undefined && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {data.percentage}% de la meta ({totalTargetEvaluations} total)
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Texto en el centro de la Dona */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {completionPercentage}%
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">
                Alcanzado
              </span>
            </div>
          </div>

          {/* Desglose de Leyendas y Métricas */}
          <div className="grid grid-cols-2 gap-2.5 mt-2">
            {/* Completadas */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex flex-col">
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Completadas</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-emerald-950 font-mono">
                  {completedCount}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                  {totalTargetEvaluations > 0
                    ? `${Math.round((completedCount / totalTargetEvaluations) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>

            {/* Pendientes */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Pendientes</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-slate-800 font-mono">
                  {pendingCount}
                </span>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded-md">
                  {totalTargetEvaluations > 0
                    ? `${Math.round((pendingCount / totalTargetEvaluations) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info de la dona */}
        <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-slate-400" />
            Meta total: <strong>{totalTargetEvaluations}</strong> evaluaciones
          </span>
          <span className={`font-bold ${pendingCount === 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
            {pendingCount === 0 ? '✓ 100% Cubierto' : `${pendingCount} restantes`}
          </span>
        </div>
      </div>
    </div>

    {/* 3. MÓDULO DE CONTROL DE CALIDAD Y ANÁLISIS DE SESGO ESTADÍSTICO */}
    <BiasAnalysisModule
      campaign={campaign}
      subjects={subjects}
      responses={responses}
    />
  </div>
  );
};
