import React, { useMemo } from 'react';
import { Campaign, EvaluatedSubject, EvaluationResponse, TemplateQuestion } from '../../types';
import { getComprehensiveQuestionCatalog, resolveQuestionMeta } from '../../utils/questionCatalog';

interface GeneralReportPdfTemplateProps {
  campaign: Campaign;
  subjects: EvaluatedSubject[];
  responses: EvaluationResponse[];
  customQuestions?: TemplateQuestion[];
}

export const GeneralReportPdfTemplate: React.FC<GeneralReportPdfTemplateProps> = ({
  campaign,
  subjects,
  responses,
  customQuestions,
}) => {
  const emissionDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Question & Category catalog
  const catalog = useMemo(() => {
    return getComprehensiveQuestionCatalog(customQuestions || campaign.questions);
  }, [customQuestions, campaign.questions]);

  // Total pages: 1 (executive overview) + subjects.length (1 sheet per subject)
  const totalPages = 1 + subjects.length;

  // 1. ORGANIZATIONAL METRICS
  const totalSubjects = subjects.length;
  const totalResponses = responses.length;
  const totalTargetEvaluations = subjects.reduce((acc, s) => acc + (s.targetEvaluators || 5), 0);
  const participationRate = totalTargetEvaluations > 0
    ? Math.min(100, Math.round((totalResponses / totalTargetEvaluations) * 100))
    : 0;

  // Promedio global general de la organización
  let grandSum = 0;
  let grandCount = 0;
  responses.forEach((r) => {
    Object.values(r.scores).forEach((val) => {
      if (typeof val === 'number') {
        grandSum += val;
        grandCount++;
      }
    });
  });
  const organizationAverage = grandCount > 0 ? Number((grandSum / grandCount).toFixed(2)) : 0;

  // Semáforo organizacional
  const getOrgLevel = (avg: number) => {
    if (avg >= 4.5) return { label: 'Excelente / Sobresaliente', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
    if (avg >= 3.8) return { label: 'Competente / Alineado', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
    if (avg >= 3.0) return { label: 'Oportunidad de Desarrollo', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
    return { label: 'Atención Prioritaria', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  };
  const orgLevel = getOrgLevel(organizationAverage);

  // 2. COMPARATIVA POR DEPARTAMENTOS / ÁREAS
  const departmentStats = useMemo(() => {
    const deptMap = new Map<string, { sum: number; count: number; subjectsCount: number }>();

    subjects.forEach((s) => {
      const dept = s.department?.trim() || 'General';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { sum: 0, count: 0, subjectsCount: 0 });
      }
      deptMap.get(dept)!.subjectsCount++;
    });

    responses.forEach((r) => {
      const sub = subjects.find((s) => s.id === r.subjectId);
      const dept = sub?.department?.trim() || 'General';
      const entry = deptMap.get(dept);
      if (entry) {
        Object.values(r.scores).forEach((val) => {
          if (typeof val === 'number') {
            entry.sum += val;
            entry.count++;
          }
        });
      }
    });

    const result: Array<{
      department: string;
      average: number;
      responsesCount: number;
      subjectsCount: number;
      hasResponses: boolean;
    }> = [];

    deptMap.forEach((val, dept) => {
      const hasResponses = val.count > 0;
      result.push({
        department: dept,
        average: hasResponses ? Number((val.sum / val.count).toFixed(2)) : 0,
        responsesCount: val.count,
        subjectsCount: val.subjectsCount,
        hasResponses,
      });
    });

    // Ordenar: primero departamentos con respuestas (mayor a menor promedio), luego los pendientes
    return result.sort((a, b) => {
      if (a.hasResponses && !b.hasResponses) return -1;
      if (!a.hasResponses && b.hasResponses) return 1;
      return b.average - a.average;
    });
  }, [subjects, responses]);

  // 3. MATRIZ GLOBAL DE COMPETENCIAS DE LA EMPRESA
  const companyCompetencies = useMemo(() => {
    const catsMap = new Map<string, { sum: number; count: number }>();

    responses.forEach((r) => {
      Object.entries(r.scores).forEach(([qId, val]) => {
        if (typeof val === 'number') {
          const meta = resolveQuestionMeta(qId, catalog);
          if (!catsMap.has(meta.category)) {
            catsMap.set(meta.category, { sum: 0, count: 0 });
          }
          const entry = catsMap.get(meta.category)!;
          entry.sum += val;
          entry.count++;
        }
      });
    });

    const list: Array<{ category: string; average: number; count: number }> = [];
    catsMap.forEach((val, cat) => {
      list.push({
        category: cat,
        average: val.count > 0 ? Number((val.sum / val.count).toFixed(2)) : 0,
        count: val.count,
      });
    });

    list.sort((a, b) => b.average - a.average);

    const solid = list.filter((c) => c.average >= 4.0);
    const opportunity = list.filter((c) => c.average < 4.0);

    return {
      all: list,
      solid: solid.length > 0 ? solid : list.slice(0, 2),
      opportunity: opportunity.length > 0 ? opportunity : list.slice(-2),
    };
  }, [responses, catalog]);

  return (
    <div
      id={`pdf-general-${campaign.id}`}
      style={{
        backgroundColor: '#ffffff',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        color: '#0f172a',
        lineHeight: 1.35,
      }}
    >
      {/* ========================================================================= */}
      {/* PÁGINA 1: RESUMEN EJECUTIVO CORPORATIVO (NIVEL EMPRESA)                   */}
      {/* ========================================================================= */}
      <div
        className="pdf-page"
        style={{
          width: '216mm',
          minHeight: '279mm',
          maxHeight: '279mm',
          padding: '14mm',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pageBreakInside: 'avoid',
          overflow: 'hidden',
        }}
      >
        <div>
          {/* MEMBRETE DIRECTIVO - 100% MARCA BLANCA */}
          <div
            style={{
              borderBottom: '2.5px solid #0f172a',
              paddingBottom: '10px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ maxWidth: '72%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                    backgroundColor: '#0f172a',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  PROGRAMA DE EVALUACIÓN 360°
                </span>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                  Código: <strong style={{ color: '#0f172a' }}>{campaign.clientCode}</strong>
                </span>
              </div>

              {/* Nombre de la Empresa Contratante en grande y destacado */}
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: '#0f172a',
                  margin: '2px 0',
                  lineHeight: 1.15,
                  letterSpacing: '-0.025em',
                  textTransform: 'uppercase',
                }}
              >
                {campaign.companyName}
              </h1>

              <p style={{ fontSize: '11px', color: '#334155', margin: 0, fontWeight: 700 }}>
                {campaign.templateName || 'Diagnóstico Organizacional y Evaluación de Competencias'}
              </p>
            </div>

            <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#475569' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: '#2563eb',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '2px',
                }}
              >
                INFORME DIRECTIVO
              </div>
              <div>Fecha de Emisión: <strong>{emissionDate}</strong></div>
              <div style={{ color: '#64748b' }}>Consolidado Corporativo</div>
            </div>
          </div>

          {/* KPI CARDS CON ESTILO MODERNO EJECUTIVO */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '12px',
              pageBreakInside: 'avoid',
            }}
          >
            {/* KPI 1 */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '9px 10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '8.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>
                Colaboradores
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: '2px 0 1px' }}>
                {totalSubjects}
              </div>
              <div style={{ fontSize: '8.5px', color: '#64748b' }}>personal registrado</div>
            </div>

            {/* KPI 2 */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '9px 10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '8.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>
                Cuestionarios
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', margin: '2px 0 1px' }}>
                {totalResponses}
              </div>
              <div style={{ fontSize: '8.5px', color: '#64748b' }}>evaluaciones recibidas</div>
            </div>

            {/* KPI 3 */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '9px 10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '8.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>
                Participación
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: participationRate >= 80 ? '#059669' : '#2563eb',
                  margin: '2px 0 1px',
                }}
              >
                {participationRate}%
              </div>
              <div style={{ fontSize: '8.5px', color: '#64748b' }}>
                meta: {totalTargetEvaluations} cuestionarios
              </div>
            </div>

            {/* KPI 4: Promedio Organizacional con Semáforo */}
            <div
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '9px 10px',
                textAlign: 'center',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ fontSize: '8.5px', textTransform: 'uppercase', color: '#93c5fd', fontWeight: 800 }}>
                Promedio Global
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', margin: '2px 0 1px' }}>
                {organizationAverage.toFixed(2)}
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}> / 5.0</span>
              </div>
              <div
                style={{
                  fontSize: '8px',
                  fontWeight: 800,
                  color: orgLevel.color,
                  backgroundColor: orgLevel.bg,
                  display: 'inline-block',
                  padding: '1px 6px',
                  borderRadius: '4px',
                }}
              >
                {orgLevel.label}
              </div>
            </div>
          </div>

          {/* DIAGNÓSTICO INSTITUCIONAL EJECUTIVO */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '9px 12px',
              marginBottom: '12px',
              pageBreakInside: 'avoid',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
              Diagnóstico Ejecutivo del Desempeño Organizacional
            </div>
            <p style={{ margin: 0, fontSize: '9.5px', color: '#334155', lineHeight: 1.4 }}>
              La organización <strong>{campaign.companyName}</strong> registra un promedio general consolidado de{' '}
              <strong>{organizationAverage.toFixed(2)} / 5.00</strong> en una escala estándar de 1 a 5, clasificándose en el nivel{' '}
              <strong>{orgLevel.label}</strong>. A partir de una muestra de {totalResponses} cuestionarios 360° completados y {totalSubjects} colaboradores evaluados transversalmente, los resultados presentan un diagnóstico fidedigno para la toma de decisiones estratégicas de talento, liderazgo y alineación de equipos.
            </p>
          </div>

          {/* COMPARATIVA POR DEPARTAMENTOS / ÁREAS (GRÁFICA DE BARRAS HORIZONTALES ESTILIZADA FRENTE A MEDIA) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '12px',
              pageBreakInside: 'avoid',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
                  Comparativa de Desempeño por Departamento vs. Media Organizacional
                </div>
                <div style={{ fontSize: '8.5px', color: '#64748b' }}>
                  Barras en azul corporativo (≥ media {organizationAverage.toFixed(2)}) y ámbar/gris (área de oportunidad)
                </div>
              </div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#1e40af',
                  backgroundColor: '#dbeafe',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid #bfdbfe',
                }}
              >
                Media: {organizationAverage.toFixed(2)} / 5.00
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {departmentStats.map((dept) => {
                const pct = Math.min(100, Math.round((dept.average / 5) * 100));
                const orgPct = Math.min(100, Math.round((organizationAverage / 5) * 100));
                const isAboveMedia = dept.average >= organizationAverage;
                // Azul corporativo para áreas por encima de la media, ámbar para áreas con oportunidad de mejora
                const barColor = isAboveMedia ? '#2563eb' : '#d97706';
                const badgeColor = isAboveMedia ? '#1e40af' : '#b45309';
                const badgeBg = isAboveMedia ? '#eff6ff' : '#fef3c7';

                return (
                  <div key={dept.department}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {dept.department}{' '}
                        <span style={{ color: '#64748b', fontWeight: 500, fontSize: '8.5px' }}>
                          ({dept.subjectsCount} {dept.subjectsCount === 1 ? 'colab.' : 'colabs.'} • {dept.responsesCount} eval.)
                        </span>
                      </span>

                      {dept.hasResponses ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '8px',
                              fontWeight: 800,
                              color: badgeColor,
                              backgroundColor: badgeBg,
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}
                          >
                            {isAboveMedia ? '▲ Sobre Media' : '▼ Oportunidad'}
                          </span>
                          <span style={{ fontWeight: 900, color: barColor }}>
                            {dept.average.toFixed(2)} pts ({pct}%)
                          </span>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '8.5px',
                            fontWeight: 700,
                            color: '#64748b',
                            backgroundColor: '#f1f5f9',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          Pendiente / Sin respuestas registradas
                        </span>
                      )}
                    </div>

                    {/* Barra de progreso horizontal estilizada con marcador de media */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {dept.hasResponses ? (
                        <>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              backgroundColor: barColor,
                              borderRadius: '4px',
                            }}
                          />
                          {/* Línea indicadora de media organizacional */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              bottom: 0,
                              left: `${orgPct}%`,
                              width: '2px',
                              backgroundColor: '#0f172a',
                              zIndex: 2,
                            }}
                          />
                        </>
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundImage: 'repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 4px, #f8fafc 4px, #f8fafc 8px)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CUADRANTE: COMPETENCIAS MÁS SÓLIDAS VS ÁREAS DE FORMACIÓN PRIORITARIA */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              pageBreakInside: 'avoid',
            }}
          >
            {/* Sólidas */}
            <div
              style={{
                border: '1px solid #bbf7d0',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                padding: '10px',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#065f46', marginBottom: '3px' }}>
                ✓ Competencias Más Sólidas de la Organización
              </div>
              <p style={{ margin: '0 0 6px 0', fontSize: '8.5px', color: '#166534' }}>
                Pilares destacados en la cultura y desempeño colectivo:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {companyCompetencies.solid.length > 0 ? (
                  companyCompetencies.solid.slice(0, 4).map((c) => (
                    <div
                      key={c.category}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #86efac',
                        borderRadius: '5px',
                        padding: '4px 7px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#0f172a' }}>
                        {c.category}
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: '#059669' }}>
                        {c.average.toFixed(2)} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '9px', color: '#6b7280' }}>
                    Sin datos suficientes de competencias consolidadas.
                  </div>
                )}
              </div>
            </div>

            {/* Oportunidad / Formación */}
            <div
              style={{
                border: '1px solid #fed7aa',
                backgroundColor: '#fff7ed',
                borderRadius: '8px',
                padding: '10px',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#9a3412', marginBottom: '3px' }}>
                ⚠ Áreas de Formación y Capacitación Prioritaria
              </div>
              <p style={{ margin: '0 0 6px 0', fontSize: '8.5px', color: '#c2410c' }}>
                Áreas clave para talleres, programas de mentoría y feedback:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {companyCompetencies.opportunity.length > 0 ? (
                  companyCompetencies.opportunity.slice(0, 4).map((c) => (
                    <div
                      key={c.category}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #fdba74',
                        borderRadius: '5px',
                        padding: '4px 7px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#0f172a' }}>
                        {c.category}
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: '#ea580c' }}>
                        {c.average.toFixed(2)} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '9px', color: '#059669', fontWeight: 600 }}>
                    Todas las competencias cumplen con los estándares óptimos.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA 1 */}
        <div
          style={{
            paddingTop: '8px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '8.5px',
            color: '#94a3b8',
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {campaign.companyName} • Reporte Ejecutivo General
          </span>
          <span style={{ fontWeight: 700 }}>
            Página 1 de {totalPages} • Estricta Confidencialidad
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PÁGINAS SIGUIENTES: UNA HOJA POR CADA COLABORADOR EVALUADO                */}
      {/* ========================================================================= */}
      {subjects.map((subject, index) => {
        const pageNumber = index + 2;
        const target = subject.targetEvaluators || 5;
        const subjectResponses = responses.filter((r) => r.subjectId === subject.id);
        const completedCount = subjectResponses.length;
        const completionPercent = target > 0 ? Math.min(100, Math.round((completedCount / target) * 100)) : 0;
        const hasResponses = completedCount > 0;

        // Roles count
        const selfCount = subjectResponses.filter((r) => r.evaluatorRole === 'self').length;
        const mgrCount = subjectResponses.filter((r) => r.evaluatorRole === 'manager').length;
        const peerCount = subjectResponses.filter((r) => r.evaluatorRole === 'peer').length;
        const subCount = subjectResponses.filter((r) => r.evaluatorRole === 'subordinate').length;

        // Promedio individual
        let subSum = 0;
        let subScoreCount = 0;
        subjectResponses.forEach((r) => {
          Object.values(r.scores).forEach((val) => {
            if (typeof val === 'number') {
              subSum += val;
              subScoreCount++;
            }
          });
        });
        const subAverage = subScoreCount > 0 ? Number((subSum / subScoreCount).toFixed(2)) : 0;

        const subLevel = (() => {
          if (!hasResponses) return { label: 'En Espera de Evaluaciones', color: '#64748b', bg: '#f1f5f9' };
          if (subAverage >= 4.5) return { label: 'Sobresaliente', color: '#059669', bg: '#ecfdf5' };
          if (subAverage >= 3.8) return { label: 'Competente', color: '#2563eb', bg: '#eff6ff' };
          if (subAverage >= 3.0) return { label: 'En Desarrollo', color: '#d97706', bg: '#fffbeb' };
          return { label: 'Requiere Atención', color: '#dc2626', bg: '#fef2f2' };
        })();

        // Desglose de competencias del colaborador
        const compMap = new Map<string, { sum: number; count: number }>();
        const questionScoresMap = new Map<string, { sum: number; count: number; text: string; category: string }>();

        subjectResponses.forEach((r) => {
          Object.entries(r.scores).forEach(([qId, val]) => {
            if (typeof val === 'number') {
              const meta = resolveQuestionMeta(qId, catalog);

              // Competencia / Categoría
              if (!compMap.has(meta.category)) {
                compMap.set(meta.category, { sum: 0, count: 0 });
              }
              const entry = compMap.get(meta.category)!;
              entry.sum += val;
              entry.count++;

              // Pregunta / Reactivo
              if (!questionScoresMap.has(qId)) {
                questionScoresMap.set(qId, { sum: 0, count: 0, text: meta.text, category: meta.category });
              }
              const qEntry = questionScoresMap.get(qId)!;
              qEntry.sum += val;
              qEntry.count++;
            }
          });
        });

        const subjectCompetencies: Array<{ category: string; average: number }> = [];
        compMap.forEach((val, cat) => {
          subjectCompetencies.push({
            category: cat,
            average: val.count > 0 ? Number((val.sum / val.count).toFixed(2)) : 0,
          });
        });
        subjectCompetencies.sort((a, b) => b.average - a.average);

        // Top 2 Fortalezas y Top 2 Áreas de Mejora
        const rankedQuestions: Array<{ qId: string; text: string; category: string; average: number }> = [];
        questionScoresMap.forEach((val, qId) => {
          rankedQuestions.push({
            qId,
            text: val.text,
            category: val.category,
            average: val.count > 0 ? Number((val.sum / val.count).toFixed(2)) : 0,
          });
        });
        rankedQuestions.sort((a, b) => b.average - a.average);

        const topStrengths = rankedQuestions.slice(0, 2);
        const topImprovements = rankedQuestions.length > 2
          ? rankedQuestions.slice(-2).reverse()
          : rankedQuestions.slice(2, 4);

        return (
          <div
            key={subject.id}
            className="pdf-page"
            style={{
              width: '216mm',
              minHeight: '279mm',
              maxHeight: '279mm',
              padding: '14mm',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              pageBreakBefore: 'always',
              breakBefore: 'page',
              pageBreakInside: 'avoid',
              overflow: 'hidden',
            }}
          >
            <div>
              {/* TOP HEADER CORPORATIVO WHITE-LABEL */}
              <div
                style={{
                  borderBottom: '2px solid #0f172a',
                  paddingBottom: '8px',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 900,
                      color: '#ffffff',
                      backgroundColor: '#2563eb',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    HOJA INDIVIDUAL DE EVALUACIÓN
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '8px', fontWeight: 600 }}>
                    {campaign.companyName} • Campaña {campaign.clientCode}
                  </span>
                </div>

                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>
                  Emisión: {emissionDate}
                </div>
              </div>

              {/* 1. FICHA DEL EVALUADO */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  pageBreakInside: 'avoid',
                }}
              >
                {/* Datos del colaborador */}
                <div style={{ maxWidth: '62%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '13px',
                      }}
                    >
                      {subject.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2
                        style={{
                          fontSize: '16px',
                          fontWeight: 900,
                          color: '#0f172a',
                          margin: 0,
                          lineHeight: 1.2,
                        }}
                      >
                        {subject.name}
                      </h2>
                      <div style={{ fontSize: '10.5px', color: '#2563eb', fontWeight: 700 }}>
                        {subject.role}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '9.5px', color: '#475569', marginTop: '4px', display: 'flex', gap: '12px' }}>
                    <span>Área: <strong>{subject.department}</strong></span>
                    {subject.email && (
                      <span>Correo: <strong style={{ color: '#0f172a' }}>{subject.email}</strong></span>
                    )}
                  </div>
                </div>

                {/* Medidor de Avance */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    textAlign: 'right',
                    minWidth: '150px',
                  }}
                >
                  <div style={{ fontSize: '8.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>
                    Medidor de Avance
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', margin: '2px 0' }}>
                    {completedCount} de {target} evaluaciones
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginTop: '4px',
                    }}
                  >
                    <div
                      style={{
                        width: `${completionPercent}%`,
                        height: '100%',
                        backgroundColor: completionPercent >= 100 ? '#059669' : '#2563eb',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '2px' }}>
                    {completionPercent}% completado
                  </div>
                </div>
              </div>

              {/* 2. PROMEDIO INDIVIDUAL & STATUS BAR */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 2fr',
                  gap: '10px',
                  marginBottom: '12px',
                  pageBreakInside: 'avoid',
                }}
              >
                {/* Calificación Global Card */}
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '8.5px', textTransform: 'uppercase', color: '#93c5fd', fontWeight: 800 }}>
                      Calificación Global
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', margin: '1px 0' }}>
                      {hasResponses ? subAverage.toFixed(2) : '--'}
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}> / 5.0</span>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: subLevel.color,
                      backgroundColor: subLevel.bg,
                      padding: '3px 8px',
                      borderRadius: '5px',
                      textAlign: 'center',
                    }}
                  >
                    {subLevel.label}
                  </div>
                </div>

                {/* Desglose de Evaluadores por Rol */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>AUTOEVAL.</div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{selfCount}</div>
                  </div>
                  <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>JEFE DIR.</div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#2563eb' }}>{mgrCount}</div>
                  </div>
                  <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>PARES</div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#059669' }}>{peerCount}</div>
                  </div>
                  <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>A CARGO</div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#7c3aed' }}>{subCount}</div>
                  </div>
                </div>
              </div>

              {/* 3. DESGLOSE DE COMPETENCIAS DEL COLABORADOR */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '12px',
                  pageBreakInside: 'avoid',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
                    Desglose de Competencias del Colaborador
                  </div>
                  <span style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600 }}>
                    Escala de 1.00 a 5.00 puntos
                  </span>
                </div>

                {hasResponses && subjectCompetencies.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {subjectCompetencies.map((comp) => {
                      const pct = Math.min(100, Math.round((comp.average / 5) * 100));
                      const barColor = comp.average >= 4.5 ? '#059669' : comp.average >= 3.8 ? '#2563eb' : comp.average >= 3.0 ? '#d97706' : '#dc2626';

                      return (
                        <div key={comp.category}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{comp.category}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '8px',
                                  fontWeight: 800,
                                  color: '#475569',
                                  backgroundColor: '#f1f5f9',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                }}
                              >
                                {pct}%
                              </span>
                              <span style={{ fontWeight: 900, color: barColor }}>
                                {comp.average.toFixed(2)} <span style={{ color: '#94a3b8', fontSize: '8.5px', fontWeight: 600 }}>/ 5.0</span>
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: '8px',
                              backgroundColor: '#f1f5f9',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                backgroundColor: barColor,
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '9.5px',
                    }}
                  >
                    Evaluaciones en proceso. Aún no se registran cuestionarios completados para este colaborador.
                  </div>
                )}
              </div>

              {/* 4. TOP 2 FORTALEZAS Y TOP 2 ÁREAS DE MEJORA */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  pageBreakInside: 'avoid',
                }}
              >
                {/* Fortalezas */}
                <div
                  style={{
                    border: '1px solid #bbf7d0',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '8px',
                    padding: '10px',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#065f46', marginBottom: '4px' }}>
                    ★ Top 2 Fortalezas Destacadas
                  </div>
                  {hasResponses && topStrengths.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {topStrengths.map((item, idx) => (
                        <div
                          key={item.qId || idx}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #86efac',
                            borderRadius: '5px',
                            padding: '6px 8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span
                              style={{
                                fontSize: '8px',
                                fontWeight: 800,
                                color: '#166534',
                                textTransform: 'uppercase',
                              }}
                            >
                              {item.category}
                            </span>
                            <span style={{ fontSize: '9.5px', fontWeight: 900, color: '#059669' }}>
                              {item.average.toFixed(2)} pts
                            </span>
                          </div>
                          <div style={{ fontSize: '8.5px', color: '#1f2937', lineHeight: 1.3 }}>
                            {item.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '9px', color: '#166534' }}>
                      Pendiente de recolección de respuestas.
                    </div>
                  )}
                </div>

                {/* Áreas de Mejora */}
                <div
                  style={{
                    border: '1px solid #fed7aa',
                    backgroundColor: '#fff7ed',
                    borderRadius: '8px',
                    padding: '10px',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#9a3412', marginBottom: '4px' }}>
                    ⚡ Top 2 Áreas de Oportunidad / Mejora
                  </div>
                  {hasResponses && topImprovements.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {topImprovements.map((item, idx) => (
                        <div
                          key={item.qId || idx}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #fdba74',
                            borderRadius: '5px',
                            padding: '6px 8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span
                              style={{
                                fontSize: '8px',
                                fontWeight: 800,
                                color: '#9a3412',
                                textTransform: 'uppercase',
                              }}
                            >
                              {item.category}
                            </span>
                            <span style={{ fontSize: '9.5px', fontWeight: 900, color: '#ea580c' }}>
                              {item.average.toFixed(2)} pts
                            </span>
                          </div>
                          <div style={{ fontSize: '8.5px', color: '#1f2937', lineHeight: 1.3 }}>
                            {item.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '9px', color: '#9a3412' }}>
                      Pendiente de recolección de respuestas.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PIE DE PÁGINA DEL COLABORADOR */}
            <div
              style={{
                paddingTop: '8px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '8.5px',
                color: '#94a3b8',
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {campaign.companyName} • Expediente de Evaluación 360°
              </span>
              <span style={{ fontWeight: 700 }}>
                Página {pageNumber} de {totalPages} • Estricta Confidencialidad
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
