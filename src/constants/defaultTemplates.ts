import { SurveyTemplate } from '../types';

export const DEFAULT_SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'tpl-liderazgo-gerencial',
    name: 'Evaluación de Liderazgo y Mandos Medios',
    targetIndustry: 'Liderazgo Corporativo / Gerencias / Directores',
    description: 'Diagnóstico 360° enfocado en directivos y líderes de equipo para calibrar visión estratégica, toma de decisiones, delegación y habilidades de coaching.',
    isDefault: true,
    createdAt: '2026-01-15T00:00:00Z',
    questions: [
      // 1. Visión Estratégica (1-4)
      {
        id: 'lid_vis_1',
        category: 'Visión Estratégica',
        text: 'Define prioridades y metas claras alineadas con los objetivos del negocio.',
      },
      {
        id: 'lid_vis_2',
        category: 'Visión Estratégica',
        text: 'Toma decisiones oportunas y fundamentadas incluso en condiciones de incertidumbre.',
      },
      {
        id: 'lid_vis_3',
        category: 'Visión Estratégica',
        text: 'Anticipa riesgos y formula planes de contingencia eficaces.',
      },
      {
        id: 'lid_vis_4',
        category: 'Visión Estratégica',
        text: 'Comunica el rumbo estratégico de manera inspiradora y convincente.',
      },
      // 2. Gestión de Equipos y Delegación (5-8)
      {
        id: 'lid_del_1',
        category: 'Gestión de Equipos y Delegación',
        text: 'Asigna responsabilidades considerando las fortalezas de cada integrante.',
      },
      {
        id: 'lid_del_2',
        category: 'Gestión de Equipos y Delegación',
        text: 'Brinda autonomía y recursos necesarios para ejecutar tareas sin microgestión.',
      },
      {
        id: 'lid_del_3',
        category: 'Gestión de Equipos y Delegación',
        text: 'Hace un seguimiento oportuno del avance sin entorpecer la iniciativa individual.',
      },
      {
        id: 'lid_del_4',
        category: 'Gestión de Equipos y Delegación',
        text: 'Reconoce los logros y el esfuerzo de los miembros del equipo.',
      },
      // 3. Desarrollo y Coaching (9-12)
      {
        id: 'lid_coa_1',
        category: 'Desarrollo y Coaching',
        text: 'Proporciona retroalimentación constructiva, clara y periódica.',
      },
      {
        id: 'lid_coa_2',
        category: 'Desarrollo y Coaching',
        text: 'Impulsa el crecimiento profesional y la capacitación de sus colaboradores.',
      },
      {
        id: 'lid_coa_3',
        category: 'Desarrollo y Coaching',
        text: 'Escucha activamente las inquietudes y propuestas de mejora del equipo.',
      },
      {
        id: 'lid_coa_4',
        category: 'Desarrollo y Coaching',
        text: 'Ayuda a identificar oportunidades de mejora sin generar actitudes defensivas.',
      },
      // 4. Resolución de Conflictos y Clima Laboral (13-16)
      {
        id: 'lid_con_1',
        category: 'Resolución de Conflictos y Clima Laboral',
        text: 'Aborda desacuerdos o fricciones de manera justa, imparcial y a tiempo.',
      },
      {
        id: 'lid_con_2',
        category: 'Resolución de Conflictos y Clima Laboral',
        text: 'Fomenta un ambiente de confianza, respeto mutuo y apertura.',
      },
      {
        id: 'lid_con_3',
        category: 'Resolución de Conflictos y Clima Laboral',
        text: 'Mantiene la serenidad y transmite calma en situaciones de alta presión.',
      },
      {
        id: 'lid_con_4',
        category: 'Resolución de Conflictos y Clima Laboral',
        text: 'Promueve el sentido de pertenencia y compromiso colectivo.',
      },
      // 5. Responsabilidad y Rendición de Cuentas (17-20)
      {
        id: 'lid_res_1',
        category: 'Responsabilidad y Rendición de Cuentas',
        text: 'Asume la responsabilidad por los resultados del área, incluidos los errores.',
      },
      {
        id: 'lid_res_2',
        category: 'Responsabilidad y Rendición de Cuentas',
        text: 'Modela con el ejemplo los valores, la ética y las normas de la organización.',
      },
      {
        id: 'lid_res_3',
        category: 'Responsabilidad y Rendición de Cuentas',
        text: 'Cumple los acuerdos y compromisos asumidos en tiempo y forma.',
      },
      {
        id: 'lid_res_4',
        category: 'Responsabilidad y Rendición de Cuentas',
        text: 'Inspira altos estándares de calidad y excelencia en el desempeño.',
      },
    ],
  },
  {
    id: 'tpl-tech-startups',
    name: 'Startups y Empresas de Tecnología / Innovación',
    targetIndustry: 'Tecnología / Startups / Desarrollo de Software / Producto Digital',
    description: 'Evaluación ágil diseñada para entornos de alto dinamismo, equipos remotos o híbridos, enfocada en adaptabilidad, innovación, autonomía y comunicación asíncrona.',
    isDefault: true,
    createdAt: '2026-01-15T00:00:00Z',
    questions: [
      // 1. Agilidad y Adaptabilidad (1-4)
      {
        id: 'tech_agi_1',
        category: 'Agilidad y Adaptabilidad',
        text: 'Se adapta rápidamente a cambios de prioridades o requerimientos de producto.',
      },
      {
        id: 'tech_agi_2',
        category: 'Agilidad y Adaptabilidad',
        text: 'Mantiene una actitud abierta frente al aprendizaje de nuevas herramientas.',
      },
      {
        id: 'tech_agi_3',
        category: 'Agilidad y Adaptabilidad',
        text: 'Gestiona la ambigüedad con proactividad y sin paralizarse.',
      },
      {
        id: 'tech_agi_4',
        category: 'Agilidad y Adaptabilidad',
        text: 'Experimenta e itera soluciones con velocidad para validar resultados.',
      },
      // 2. Innovación y Resolución de Problemas (5-8)
      {
        id: 'tech_inn_1',
        category: 'Innovación y Resolución de Problemas',
        text: 'Plantea soluciones creativas y prácticas ante desafíos técnicos complejos.',
      },
      {
        id: 'tech_inn_2',
        category: 'Innovación y Resolución de Problemas',
        text: 'Cuestiona supuestos tradicionales para proponer mejores enfoques de trabajo.',
      },
      {
        id: 'tech_inn_3',
        category: 'Innovación y Resolución de Problemas',
        text: 'Identifica la causa raíz de las incidencias antes de implementar parches.',
      },
      {
        id: 'tech_inn_4',
        category: 'Innovación y Resolución de Problemas',
        text: 'Transforma los errores en aprendizajes aplicables para el equipo.',
      },
      // 3. Comunicación Asíncrona y Documentación (9-12)
      {
        id: 'tech_com_1',
        category: 'Comunicación Asíncrona y Documentación',
        text: 'Documenta procesos, código o decisiones clave de manera comprensible.',
      },
      {
        id: 'tech_com_2',
        category: 'Comunicación Asíncrona y Documentación',
        text: 'Se comunica con claridad y síntesis en canales escritos y reuniones remotas.',
      },
      {
        id: 'tech_com_3',
        category: 'Comunicación Asíncrona y Documentación',
        text: 'Comparte oportunamente avances, bloqueos y dependencias de trabajo.',
      },
      {
        id: 'tech_com_4',
        category: 'Comunicación Asíncrona y Documentación',
        text: 'Solicita y ofrece aclaraciones antes de avanzar sobre supuestos erróneos.',
      },
      // 4. Colaboración Multidisciplinaria (13-16)
      {
        id: 'tech_col_1',
        category: 'Colaboración Multidisciplinaria',
        text: 'Trabaja en sinergia con perfiles técnicos, comerciales y de diseño.',
      },
      {
        id: 'tech_col_2',
        category: 'Colaboración Multidisciplinaria',
        text: 'Muestra disposición para apoyar a otros integrantes cuando hay cuellos de botella.',
      },
      {
        id: 'tech_col_3',
        category: 'Colaboración Multidisciplinaria',
        text: 'Valora la diversidad de perspectivas para enriquecer las soluciones.',
      },
      {
        id: 'tech_col_4',
        category: 'Colaboración Multidisciplinaria',
        text: 'Prioriza el éxito colectivo del sprint o proyecto sobre el lucimiento individual.',
      },
      // 5. Orientación al Impacto y Usuario Final (17-20)
      {
        id: 'tech_imp_1',
        category: 'Orientación al Impacto y Usuario Final',
        text: 'Enfoca sus esfuerzos en tareas que generan el mayor valor tangible para el usuario.',
      },
      {
        id: 'tech_imp_2',
        category: 'Orientación al Impacto y Usuario Final',
        text: 'Mide y evalúa el impacto real de las iniciativas implementadas.',
      },
      {
        id: 'tech_imp_3',
        category: 'Orientación al Impacto y Usuario Final',
        text: 'Demuestra sentido de urgencia sin sacrificar la estabilidad del producto.',
      },
      {
        id: 'tech_imp_4',
        category: 'Orientación al Impacto y Usuario Final',
        text: 'Actúa como embajador de la excelencia en la experiencia del cliente o usuario.',
      },
    ],
  },
  {
    id: 'tpl-ventas-comercial',
    name: 'Ventas y Enfoque al Cliente (Comercial / Retail)',
    targetIndustry: 'Ventas / Retail / Comercial / Atención al Cliente',
    description: 'Enfocada en equipos comerciales y de atención para medir orientación al cliente, capacidad de negociación, cumplimiento de cuotas y resiliencia ante el rechazo.',
    isDefault: true,
    createdAt: '2026-01-15T00:00:00Z',
    questions: [
      // 1. Orientación al Cliente y Empatía (1-4)
      {
        id: 'vnt_cli_1',
        category: 'Orientación al Cliente y Empatía',
        text: 'Escucha activamente para comprender las necesidades y expectativas reales del cliente.',
      },
      {
        id: 'vnt_cli_2',
        category: 'Orientación al Cliente y Empatía',
        text: 'Construye relaciones de confianza a largo plazo cumpliendo siempre los compromisos adquiridos.',
      },
      {
        id: 'vnt_cli_3',
        category: 'Orientación al Cliente y Empatía',
        text: 'Brinda soluciones personalizadas y ágiles que superan las expectativas del cliente.',
      },
      {
        id: 'vnt_cli_4',
        category: 'Orientación al Cliente y Empatía',
        text: 'Mantiene una actitud empática y servicial incluso ante clientes exigentes o situaciones difíciles.',
      },
      // 2. Negociación y Cierre Efectivo (5-8)
      {
        id: 'vnt_neg_1',
        category: 'Negociación y Cierre Efectivo',
        text: 'Maneja objeciones y dudas con argumentos comerciales sólidos, claros y convincentes.',
      },
      {
        id: 'vnt_neg_2',
        category: 'Negociación y Cierre Efectivo',
        text: 'Identifica el momento propicio para concretar acuerdos comerciales de beneficio mutuo.',
      },
      {
        id: 'vnt_neg_3',
        category: 'Negociación y Cierre Efectivo',
        text: 'Domina el conocimiento de los productos y servicios para asesorar con solvencia técnica.',
      },
      {
        id: 'vnt_neg_4',
        category: 'Negociación y Cierre Efectivo',
        text: 'Negocia condiciones cuidando la rentabilidad del negocio y el valor de la propuesta.',
      },
      // 3. Resiliencia y Manejo de la Frustración (9-12)
      {
        id: 'vnt_res_1',
        category: 'Resiliencia y Manejo de la Frustración',
        text: 'Mantiene una actitud perseverante y positiva ante respuestas negativas o cancelaciones.',
      },
      {
        id: 'vnt_res_2',
        category: 'Resiliencia y Manejo de la Frustración',
        text: 'Gestiona la frustración y la presión de cierre con autocontrol e inteligencia emocional.',
      },
      {
        id: 'vnt_res_3',
        category: 'Resiliencia y Manejo de la Frustración',
        text: 'Transforma objeciones no resueltas en oportunidades de aprendizaje para perfeccionar su técnica.',
      },
      {
        id: 'vnt_res_4',
        category: 'Resiliencia y Manejo de la Frustración',
        text: 'Sostiene un nivel alto de energía y entusiasmo comercial a lo largo de todo el ciclo de venta.',
      },
      // 4. Orientación a Metas y Resultados (13-16)
      {
        id: 'vnt_met_1',
        category: 'Orientación a Metas y Resultados',
        text: 'Demuestra disciplina diaria para alcanzar o superar las cuotas y metas asignadas.',
      },
      {
        id: 'vnt_met_2',
        category: 'Orientación a Metas y Resultados',
        text: 'Da seguimiento riguroso a su embudo de ventas (pipeline) y prospección constante.',
      },
      {
        id: 'vnt_met_3',
        category: 'Orientación a Metas y Resultados',
        text: 'Prioriza oportunidades de alto impacto para maximizar la conversión comercial.',
      },
      {
        id: 'vnt_met_4',
        category: 'Orientación a Metas y Resultados',
        text: 'Monitorea proactivamente sus propios indicadores para corregir el rumbo con anticipación.',
      },
      // 5. Trabajo en Equipo y Colaboración Comercial (17-20)
      {
        id: 'vnt_col_1',
        category: 'Trabajo en Equipo y Colaboración Comercial',
        text: 'Comparte mejores prácticas, aprendizajes y prospectos con el equipo de ventas.',
      },
      {
        id: 'vnt_col_2',
        category: 'Trabajo en Equipo y Colaboración Comercial',
        text: 'Se coordina eficientemente con áreas de operaciones y cobranza para garantizar entregas impecables.',
      },
      {
        id: 'vnt_col_3',
        category: 'Trabajo en Equipo y Colaboración Comercial',
        text: 'Colabora activamente en el cumplimiento de los objetivos colectivos del área comercial.',
      },
      {
        id: 'vnt_col_4',
        category: 'Trabajo en Equipo y Colaboración Comercial',
        text: 'Mantiene una competencia interna ética y sana basada en el compañerismo y el apoyo mutuo.',
      },
    ],
  },
  {
    id: 'tpl-operaciones-manufactura',
    name: 'Operaciones, Producción e Industria Manufacturera',
    targetIndustry: 'Manufactura / Plantas Industriales / Logística y Cadena de Suministro',
    description: 'Enfocada en personal operativo, supervisores y jefes de planta para evaluar apego a protocolos de seguridad, eficiencia en línea, puntualidad y resolución de fallas.',
    isDefault: true,
    createdAt: '2026-01-15T00:00:00Z',
    questions: [
      // 1. Apego a Normas, Seguridad y Calidad (1-4)
      {
        id: 'ops_seg_1',
        category: 'Apego a Normas, Seguridad y Calidad',
        text: 'Cumple rigurosamente con los protocolos de seguridad, higiene y equipo de protección personal (EPP).',
      },
      {
        id: 'ops_seg_2',
        category: 'Apego a Normas, Seguridad y Calidad',
        text: 'Reporta o detiene oportunamente situaciones de riesgo o desvíos en los estándares de calidad.',
      },
      {
        id: 'ops_seg_3',
        category: 'Apego a Normas, Seguridad y Calidad',
        text: 'Sigue con precisión los procedimientos operativos estandarizados y normas técnicas del área.',
      },
      {
        id: 'ops_seg_4',
        category: 'Apego a Normas, Seguridad y Calidad',
        text: 'Mantiene su puesto y entorno de trabajo limpio, ordenado y bajo metodología 5S.',
      },
      // 2. Eficiencia Operativa y Mejora Continua (5-8)
      {
        id: 'ops_efi_1',
        category: 'Eficiencia Operativa y Mejora Continua',
        text: 'Optimiza el uso de materia prima, energía y herramientas evitando mermas o desperdicios.',
      },
      {
        id: 'ops_efi_2',
        category: 'Eficiencia Operativa y Mejora Continua',
        text: 'Participa activamente en dinámicas de mejora continua, optimización de tiempos y Kaizen.',
      },
      {
        id: 'ops_efi_3',
        category: 'Eficiencia Operativa y Mejora Continua',
        text: 'Cumple con los volúmenes de producción y metas operativas establecidas para su turno.',
      },
      {
        id: 'ops_efi_4',
        category: 'Eficiencia Operativa y Mejora Continua',
        text: 'Propone sugerencias prácticas para simplificar procesos y eliminar retrabajos.',
      },
      // 3. Puntualidad, Disciplina y Compromiso (9-12)
      {
        id: 'ops_pun_1',
        category: 'Puntualidad, Disciplina y Compromiso',
        text: 'Llega puntualmente a sus turnos de trabajo y respeta los tiempos asignados a cada labor.',
      },
      {
        id: 'ops_pun_2',
        category: 'Puntualidad, Disciplina y Compromiso',
        text: 'Demuestra constancia y alto sentido de responsabilidad en las tareas que le son encomendadas.',
      },
      {
        id: 'ops_pun_3',
        category: 'Puntualidad, Disciplina y Compromiso',
        text: 'Mantiene el ritmo operativo y la concentración requerida a lo largo de la jornada laboral.',
      },
      {
        id: 'ops_pun_4',
        category: 'Puntualidad, Disciplina y Compromiso',
        text: 'Cuida la maquinaria, herramientas e insumos a su cargo asegurando su adecuada preservación.',
      },
      // 4. Trabajo en Equipo en Piso Operativo (13-16)
      {
        id: 'ops_eq_1',
        category: 'Trabajo en Equipo en Piso Operativo',
        text: 'Se coordina eficazmente con los compañeros de línea o cuadrilla manteniendo el flujo de trabajo.',
      },
      {
        id: 'ops_eq_2',
        category: 'Trabajo en Equipo en Piso Operativo',
        text: 'Muestra disposición para apoyar en otras estaciones cuando surgen cuellos de botella.',
      },
      {
        id: 'ops_eq_3',
        category: 'Trabajo en Equipo en Piso Operativo',
        text: 'Mantiene un trato respetuoso, solidario y constructivo con personal de todos los turnos.',
      },
      {
        id: 'ops_eq_4',
        category: 'Trabajo en Equipo en Piso Operativo',
        text: 'Facilita relevos de turno ordenados comunicando novedades y pendientes con exactitud.',
      },
      // 5. Resolución de Incidencias y Mantenimiento (17-20)
      {
        id: 'ops_inc_1',
        category: 'Resolución de Incidencias y Mantenimiento',
        text: 'Detecta a tiempo anomalías en maquinaria, herramientas o desviaciones en el producto terminado.',
      },
      {
        id: 'ops_inc_2',
        category: 'Resolución de Incidencias y Mantenimiento',
        text: 'Notifica averías con prontitud y precisión al equipo de mantenimiento y supervisión.',
      },
      {
        id: 'ops_inc_3',
        category: 'Resolución de Incidencias y Mantenimiento',
        text: 'Aplica medidas de contingencia autorizadas para reactivar la operación con seguridad.',
      },
      {
        id: 'ops_inc_4',
        category: 'Resolución de Incidencias y Mantenimiento',
        text: 'Registra las incidencias y fallas técnicas conforme a los formatos y guías establecidas.',
      },
    ],
  },
  {
    id: 'tpl-clima-cultura',
    name: 'Clima Organizacional y Cultura Colaborativa',
    targetIndustry: 'Servicios Profesionales / Sector General / Cultura Integral',
    description: 'Diagnóstico 360° centrado en valores humanos, inteligencia emocional, compañerismo, comunicación constructiva, ética y vocación de servicio interno.',
    isDefault: true,
    createdAt: '2026-01-15T00:00:00Z',
    questions: [
      // 1. Inteligencia Emocional y Gestión del Estrés (1-4)
      {
        id: 'cul_emo_1',
        category: 'Inteligencia Emocional y Gestión del Estrés',
        text: 'Mantiene el temple, la serenidad y el respeto ante situaciones de alta presión o desacuerdo.',
      },
      {
        id: 'cul_emo_2',
        category: 'Inteligencia Emocional y Gestión del Estrés',
        text: 'Demuestra empatía poniéndose en el lugar de sus compañeros ante situaciones complejas.',
      },
      {
        id: 'cul_emo_3',
        category: 'Inteligencia Emocional y Gestión del Estrés',
        text: 'Maneja constructivamente la frustración y asimila críticas con apertura al crecimiento.',
      },
      {
        id: 'cul_emo_4',
        category: 'Inteligencia Emocional y Gestión del Estrés',
        text: 'Reconoce el impacto de sus estados de ánimo en la dinámica y energía del equipo.',
      },
      // 2. Comunicación Asertiva y Respetuosa (5-8)
      {
        id: 'cul_com_1',
        category: 'Comunicación Asertiva y Respetuosa',
        text: 'Expresa puntos de vista de manera honesta, oportuna y sin descalificar las opiniones ajenas.',
      },
      {
        id: 'cul_com_2',
        category: 'Comunicación Asertiva y Respetuosa',
        text: 'Practica la escucha activa con apertura mental antes de emitir juicios o responder.',
      },
      {
        id: 'cul_com_3',
        category: 'Comunicación Asertiva y Respetuosa',
        text: 'Utiliza los canales formales y un tono profesional evitando ambigüedades en sus mensajes.',
      },
      {
        id: 'cul_com_4',
        category: 'Comunicación Asertiva y Respetuosa',
        text: 'Solicita y ofrece retroalimentación constructiva que fortalece las relaciones laborales.',
      },
      // 3. Compañerismo y Clima Laboral Positivo (9-12)
      {
        id: 'cul_com_5',
        category: 'Compañerismo y Clima Laboral Positivo',
        text: 'Contribuye activamente a un ambiente de trabajo positivo, amable y libre de murmuraciones.',
      },
      {
        id: 'cul_com_6',
        category: 'Compañerismo y Clima Laboral Positivo',
        text: 'Celebra con sinceridad los logros ajenos y reconoce el mérito de sus compañeros.',
      },
      {
        id: 'cul_com_7',
        category: 'Compañerismo y Clima Laboral Positivo',
        text: 'Brinda apoyo desinteresado cuando detecta que un integrante del equipo está saturado.',
      },
      {
        id: 'cul_com_8',
        category: 'Compañerismo y Clima Laboral Positivo',
        text: 'Promueve la integración e inclusión de nuevos colaboradores facilitando su adaptación.',
      },
      // 4. Ética, Integridad y Transparencia (13-16)
      {
        id: 'cul_eti_1',
        category: 'Ética, Integridad y Transparencia',
        text: 'Actúa con honestidad, congruencia y apego intachable a los valores institucionales.',
      },
      {
        id: 'cul_eti_2',
        category: 'Ética, Integridad y Transparencia',
        text: 'Maneja la información sensible y confidencial con absoluto profesionalismo y reserva.',
      },
      {
        id: 'cul_eti_3',
        category: 'Ética, Integridad y Transparencia',
        text: 'Cumple cabalmente con sus acuerdos y promesas sin buscar excusas o evasivas.',
      },
      {
        id: 'cul_eti_4',
        category: 'Ética, Integridad y Transparencia',
        text: 'Asume la autoría de sus errores con humildad y disposición para repararlos oportunamente.',
      },
      // 5. Vocación de Servicio y Colaboración Interna (17-20)
      {
        id: 'cul_srv_1',
        category: 'Vocación de Servicio y Colaboración Interna',
        text: 'Muestra disponibilidad y agilidad para atender requerimientos de otras áreas de la empresa.',
      },
      {
        id: 'cul_srv_2',
        category: 'Vocación de Servicio y Colaboración Interna',
        text: 'Se asegura de que los compañeros que dependen de su labor reciban soluciones completas y a tiempo.',
      },
      {
        id: 'cul_srv_3',
        category: 'Vocación de Servicio y Colaboración Interna',
        text: 'Colabora generosamente en iniciativas interdisciplinarias aunque no sean de su responsabilidad directa.',
      },
      {
        id: 'cul_srv_4',
        category: 'Vocación de Servicio y Colaboración Interna',
        text: 'Prioriza el bien común de la organización sobre conveniencias individuales o de departamento.',
      },
    ],
  },
];
