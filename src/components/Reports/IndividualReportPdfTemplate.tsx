import React from 'react';
import { Campaign, EvaluatedSubject, EvaluationResponse, TemplateQuestion } from '../../types';
import { DEFAULT_COMPETENCIES } from '../../constants/competencies';

interface IndividualReportPdfTemplateProps {
  campaign: Campaign;
  subject: EvaluatedSubject;
  responses: EvaluationResponse[];
  customQuestions?: TemplateQuestion[];
}

interface RankedQuestion {
  id: string;
  category: string;
  text: string;
  average: number;
  count: number;
}

export const IndividualReportPdfTemplate: React.FC<IndividualReportPdfTemplateProps> = ({
  campaign,
  subject,
  responses,
  customQuestions,
}) => {
  const emissionDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const target = subject.targetEvaluators || 5;
  const completedCount = responses.length;
  const completionPercent = Math.min(100, Math.round((completedCount / target) * 100));

  // Desglose por roles
  const selfCount = responses.filter((r) => r.evaluatorRole === 'self').length;
  const mgrCount = responses.filter((r) => r.evaluatorRole === 'manager').length;
  const peerCount = responses.filter((r) => r.evaluatorRole === 'peer').length;
  const subCount = responses.filter((r) => r.evaluatorRole === 'subordinate').length;

  // Mapa de preguntas activas
  const questionsMap = React.useMemo(() => {
    const map = new Map<string, { id: string; category: string; text: string }>();
    if (customQuestions && customQuestions.length > 0) {
      customQuestions.forEach((q) => {
        map.set(q.id, { id: q.id, category: q.category || 'General', text: q.text });
      });
    } else if (campaign.questions && campaign.questions.length > 0) {
      campaign.questions.forEach((q) => {
        map.set(q.id, { id: q.id, category: q.category || 'General', text: q.text });
      });
    } else {
      DEFAULT_COMPETENCIES.forEach((c) => {
        c.questions.forEach((q) => {
          map.set(q.id, { id: q.id, category: c.name, text: q.text });
        });
      });
    }
    return map;
  }, [customQuestions, campaign.questions]);

  // Cálculo de promedio global
  let totalScoreSum = 0;
  let totalScoreCount = 0;
  responses.forEach((r) => {
    Object.values(r.scores).forEach((val) => {
      if (typeof val === 'number') {
        totalScoreSum += val;
        totalScoreCount++;
      }
    });
  });
  const overallAverage = totalScoreCount > 0 ? Number((totalScoreSum / totalScoreCount).toFixed(2)) : 0;

  // Nivel general
  const getOverallLevel = (avg: number) => {
    if (avg >= 4.5) return { label: 'Sobresaliente', color: '#059669', bg: '#ecfdf5', desc: 'Desempeño destacado y referente en la organización' };
    if (avg >= 3.8) return { label: 'Competente', color: '#2563eb', bg: '#eff6ff', desc: 'Cumple consistentemente con el estándar profesional esperado' };
    if (avg >= 3.0) return { label: 'En Desarrollo', color: '#d97706', bg: '#fffbeb', desc: 'Muestra potencial con oportunidades claras de crecimiento' };
    return { label: 'Requiere Atención', color: '#dc2626', bg: '#fef2f2', desc: 'Requiere acompañamiento y plan de acción correctivo' };
  };
  const overallLevel = getOverallLevel(overallAverage);

  // Competencias y promedios por categoría
  const competencyStats = React.useMemo(() => {
    const catsMap = new Map<string, { sum: number; count: number; questionIds: string[] }>();

    questionsMap.forEach((q, qId) => {
      if (!catsMap.has(q.category)) {
        catsMap.set(q.category, { sum: 0, count: 0, questionIds: [] });
      }
      catsMap.get(q.category)!.questionIds.push(qId);
    });

    responses.forEach((r) => {
      Object.entries(r.scores).forEach(([qId, val]) => {
        if (typeof val === 'number' && questionsMap.has(qId)) {
          const cat = questionsMap.get(qId)!.category;
          const entry = catsMap.get(cat);
          if (entry) {
            entry.sum += val;
            entry.count++;
          }
        }
      });
    });

    const result: Array<{
      category: string;
      average: number;
      count: number;
      diagnosis: {
        tag: 'Fortaleza Consolidada' | 'Nivel Esperado / Cumplimiento' | 'Área de Oportunidad Prioritaria';
        color: string;
        bg: string;
        border: string;
        text: string;
      };
    }> = [];

    catsMap.forEach((val, catName) => {
      const avg = val.count > 0 ? Number((val.sum / val.count).toFixed(2)) : 0;
      let diagnosis: any;

      if (avg >= 4.5) {
        diagnosis = {
          tag: 'Fortaleza Consolidada',
          color: '#047857',
          bg: '#ecfdf5',
          border: '#a7f3d0',
          text: 'Dominio destacado y referente en la práctica diaria. Su impacto positivo potencia a los equipos de trabajo y asegura estándares de excelencia.',
        };
      } else if (avg >= 3.5) {
        diagnosis = {
          tag: 'Nivel Esperado / Cumplimiento',
          color: '#1d4ed8',
          bg: '#eff6ff',
          border: '#bfdbfe',
          text: 'Comportamiento consistente y alineado con los requerimientos del puesto. Se recomienda mantener la práctica e impulsar el liderazgo en proyectos transversales.',
        };
      } else {
        diagnosis = {
          tag: 'Área de Oportunidad Prioritaria',
          color: '#b91c1c',
          bg: '#fef2f2',
          border: '#fecaca',
          text: 'Se detecta brecha respecto al estándar esperado. Se sugiere priorizar programas de mentoría, capacitación técnica y retroalimentación periódica enfocada.',
        };
      }

      result.push({
        category: catName,
        average: avg,
        count: val.count,
        diagnosis,
      });
    });

    return result.sort((a, b) => b.average - a.average);
  }, [questionsMap, responses]);

  // Top reactivos (3 mejores y 3 menores)
  const { topQuestions, bottomQuestions } = React.useMemo(() => {
    const questionScores = new Map<string, { sum: number; count: number }>();

    responses.forEach((r) => {
      Object.entries(r.scores).forEach(([qId, val]) => {
        if (typeof val === 'number') {
          const cur = questionScores.get(qId) || { sum: 0, count: 0 };
          cur.sum += val;
          cur.count++;
          questionScores.set(qId, cur);
        }
      });
    });

    const ranked: RankedQuestion[] = [];
    questionScores.forEach((stats, qId) => {
      if (stats.count > 0 && questionsMap.has(qId)) {
        const info = questionsMap.get(qId)!;
        ranked.push({
          id: qId,
          category: info.category,
          text: info.text,
          average: Number((stats.sum / stats.count).toFixed(2)),
          count: stats.count,
        });
      }
    });

    ranked.sort((a, b) => b.average - a.average);

    const top = ranked.slice(0, 3);
    const bottom = ranked.length > 3 ? [...ranked].reverse().slice(0, 3).sort((a, b) => a.average - b.average) : [];

    return { topQuestions: top, bottomQuestions: bottom };
  }, [responses, questionsMap]);

  return (
    <div
      id={`pdf-individual-${subject.id}`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '16mm 18mm',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        fontSize: '11px',
        lineHeight: 1.45,
      }}
    >
      {/* 1. MEMBRETE CORPORATIVO */}
      <div
        style={{
          borderBottom: '2.5px solid #0f172a',
          paddingBottom: '12px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ maxWidth: '65%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
              Código: {campaign.clientCode}
            </span>
          </div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 900,
              color: '#0f172a',
              margin: '2px 0',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            Reporte Ejecutivo Individual de Evaluación 360°
          </h1>
          <p style={{ fontSize: '11px', color: '#475569', margin: 0, fontWeight: 500 }}>
            Empresa: <strong style={{ color: '#0f172a' }}>{campaign.companyName}</strong> • {campaign.templateName || 'Plantilla de Liderazgo y Competencias'}
          </p>
        </div>

        <div style={{ textAlign: 'right', fontSize: '10px', color: '#475569' }}>
          <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', marginBottom: '2px' }}>
            CONFIDENCIAL
          </div>
          <div>Emisión: {emissionDate}</div>
          <div style={{ color: '#64748b' }}>Escala: 1.0 a 5.0 pts</div>
        </div>
      </div>

      {/* 2. FICHA DEL COLABORADOR EVALUADO */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '16px',
          pageBreakInside: 'avoid',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Colaborador Evaluado
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
              {subject.name}
            </div>
            <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>
              {subject.role} <span style={{ color: '#94a3b8' }}>•</span> Área: {subject.department}
            </div>
          </div>

          <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '10px' }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Participación
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              {completedCount} de {target} eval.
            </div>
            <div style={{ fontSize: '10px', color: completionPercent >= 100 ? '#059669' : '#d97706', fontWeight: 700 }}>
              {completionPercent}% de la meta
            </div>
          </div>

          <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '10px' }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Desglose de Fuentes
            </div>
            <div style={{ fontSize: '9.5px', color: '#334155', lineHeight: 1.4 }}>
              Auto: <strong>{selfCount}</strong> | Jefe: <strong>{mgrCount}</strong>
              <br />
              Pares: <strong>{peerCount}</strong> | Colab: <strong>{subCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RESUMEN EJECUTIVO (PROMEDIO GLOBAL & NIVEL) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '12px',
          marginBottom: '16px',
          pageBreakInside: 'avoid',
        }}
      >
        {/* Tarjeta Puntaje Global */}
        <div
          style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '14px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#84cc16', fontWeight: 800 }}>
            PROMEDIO GLOBAL 360°
          </div>
          <div style={{ fontSize: '38px', fontWeight: 900, lineHeight: 1, margin: '6px 0 2px', color: '#ffffff' }}>
            {overallAverage.toFixed(2)}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>sobre escala de 5.00 puntos</div>
          <div
            style={{
              marginTop: '8px',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: 800,
              backgroundColor: overallLevel.bg,
              color: overallLevel.color,
            }}
          >
            Nivel: {overallLevel.label}
          </div>
        </div>

        {/* Interpretación Ejecutiva */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            Diagnóstico de Desempeño y Nivel General
          </div>
          <p style={{ margin: 0, fontSize: '10.5px', color: '#334155', lineHeight: 1.45 }}>
            {overallLevel.desc}. El puntaje consolidado de <strong>{overallAverage.toFixed(2)} / 5.00</strong> refleja la percepción ponderada de las distintas perspectivas evaluadoras ({completedCount} cuestionarios procesados). Este resultado sirve de base para la retroalimentación formativa y planes individuales de desarrollo.
          </p>
        </div>
      </div>

      {/* 4. GRÁFICA DE BARRAS DE COMPETENCIAS */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '16px',
          pageBreakInside: 'avoid',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Perfil de Competencias Evaluadas (Promedio por Categoría)
          </h2>
          <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>Objetivo Institucional: ≥ 4.00 pts</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {competencyStats.map((item) => {
            const pct = Math.min(100, Math.round((item.average / 5) * 100));
            const barColor = item.average >= 4.5 ? '#059669' : item.average >= 3.5 ? '#2563eb' : '#dc2626';

            return (
              <div key={item.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.category}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '8.5px',
                        fontWeight: 800,
                        color: '#475569',
                        backgroundColor: '#f1f5f9',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      {pct}%
                    </span>
                    <span style={{ fontWeight: 800, color: barColor }}>
                      {item.average.toFixed(2)} <span style={{ color: '#94a3b8', fontWeight: 500 }}>/ 5.0</span>
                    </span>
                  </div>
                </div>
                <div style={{ width: '100%', height: '9px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
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
      </div>

      {/* 5. DIAGNÓSTICO CUALITATIVO AUTOMATIZADO (POR RANGOS) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '16px',
          pageBreakInside: 'avoid',
        }}
      >
        <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
          Diagnóstico Cualitativo por Competencia
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {competencyStats.map((c) => (
            <div
              key={c.category}
              style={{
                borderLeft: `4px solid ${c.diagnosis.color}`,
                backgroundColor: c.diagnosis.bg,
                padding: '8px 10px',
                borderRadius: '0 6px 6px 0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
                  {c.category} ({c.average.toFixed(2)} pts)
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    color: c.diagnosis.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {c.diagnosis.tag}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '10px', color: '#334155', lineHeight: 1.4 }}>
                {c.diagnosis.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 6. TOP DE REACTIVOS (MEJORES Y MENORES PUNTAJES) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          pageBreakInside: 'avoid',
        }}
      >
        {/* Top 3 Fortalezas */}
        <div
          style={{
            border: '1px solid #a7f3d0',
            backgroundColor: '#f0fdf4',
            borderRadius: '10px',
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#065f46', marginBottom: '6px' }}>
            ★ Top 3 Conductas Más Fuertes
          </div>
          {topQuestions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topQuestions.map((q, idx) => (
                <div key={q.id} style={{ fontSize: '9.5px', color: '#166534', lineHeight: 1.35 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{idx + 1}. {q.category}</span>
                    <span style={{ color: '#047857' }}>{q.average.toFixed(2)} pts</span>
                  </div>
                  <div style={{ color: '#374151' }}>{q.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '10px', color: '#6b7280' }}>Sin datos registrados.</div>
          )}
        </div>

        {/* Top 3 Oportunidades */}
        <div
          style={{
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            borderRadius: '10px',
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#991b1b', marginBottom: '6px' }}>
            ▲ Top 3 Conductas de Oportunidad
          </div>
          {bottomQuestions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {bottomQuestions.map((q, idx) => (
                <div key={q.id} style={{ fontSize: '9.5px', color: '#991b1b', lineHeight: 1.35 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{idx + 1}. {q.category}</span>
                    <span style={{ color: '#b91c1c' }}>{q.average.toFixed(2)} pts</span>
                  </div>
                  <div style={{ color: '#374151' }}>{q.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '10px', color: '#6b7280' }}>Sin datos registrados.</div>
          )}
        </div>
      </div>

      {/* FOOTER OFICIAL */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '8px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '9px',
          color: '#94a3b8',
        }}
      >
        <span>{campaign.companyName} • Expediente Individual de Evaluación 360°</span>
        <span>Documento Confidencial de Recursos Humanos</span>
      </div>
    </div>
  );
};
