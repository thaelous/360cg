export interface HelpItem {
  id: string;
  title: string;
  badge: string;
  badgeColor?: string;
  whatItDoes: string;
  whenAndHow: string;
  tip?: string;
}

export const HELP_CATALOG: Record<string, HelpItem> = {
  'header-campaign-info': {
    id: 'header-campaign-info',
    title: 'Ficha y Código de la Campaña',
    badge: 'Información General',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    whatItDoes:
      'Muestra el nombre oficial de la empresa evaluada, la descripción del instrumento contratado y el código corporativo único que identifica este periodo de evaluación 360°.',
    whenAndHow:
      'Utiliza este código para compartirlo con tu equipo o para ingresar al portal en cualquier momento. Puedes copiarlo con un solo clic en el botón de copiar junto al código.',
    tip: 'El código es exclusivo de tu organización y asegura que las evaluaciones se canalicen únicamente a tu tablero.',
  },
  'btn-register-collaborator': {
    id: 'btn-register-collaborator',
    title: 'Registrar Colaborador Individual',
    badge: 'Gestión de Personal',
    badgeColor: 'bg-slate-900 text-white border-slate-700',
    whatItDoes:
      'Abre un formulario interactivo para dar de alta manualmente a un participante en la campaña, especificando su nombre, puesto, departamento, correo electrónico y la meta de evaluaciones requeridas.',
    whenAndHow:
      'Utilízalo cuando desees ingresar a los evaluados uno por uno, o para añadir a un colaborador que se incorpora extemporáneamente a la campaña.',
    tip: 'La meta estándar recomendada es de 5 cuestionarios por persona (1 autoevaluación, 1 jefe, 2 pares y 1 colaborador a cargo).',
  },
  'btn-bulk-upload': {
    id: 'btn-bulk-upload',
    title: 'Carga Masiva Excel (.xlsx)',
    badge: 'Importación Inteligente',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    whatItDoes:
      'Permite descargar una plantilla oficial de Excel previamente formateada, completarla con toda la nómina o plantilla de la empresa y subir a decenas de colaboradores con un solo clic.',
    whenAndHow:
      'Ideal al arrancar el programa. Te ahorra horas de captura manual y previene errores de ortografía en nombres o departamentos.',
    tip: 'La herramienta valida automáticamente columnas obligatorias y reporta cualquier fila incompleta antes de guardarla.',
  },
  'btn-qr-share': {
    id: 'btn-qr-share',
    title: 'Código QR y Enlace de Campaña',
    badge: 'Difusión y Acceso',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    whatItDoes:
      'Genera una ventana con el Código QR de alta resolución listo para imprimir o proyectar, y te proporciona el enlace web directo de evaluación.',
    whenAndHow:
      'Compártelo por correo institucional, WhatsApp corporativo, Intranet o proyéctalo en pantallas de la empresa para que los evaluadores respondan desde su teléfono celular en menos de 5 minutos.',
    tip: 'No requiere contraseñas complejas: los colaboradores simplemente escanean el código, eligen a su compañero y comienzan.',
  },
  'btn-pdf-report': {
    id: 'btn-pdf-report',
    title: 'Reporte Ejecutivo General (PDF)',
    badge: 'Informe Gerencial',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    whatItDoes:
      'Compila y descarga en el navegador un informe ejecutivo multi-página con membrete 100% marca blanca de tu empresa, KPIs consolidados, gráficas comparativas departamentales y una hoja individual por cada evaluado.',
    whenAndHow:
      'Genéralo para sesiones directivas, juntas de consejo, entrega formal de consultoría y para diseñar el plan de capacitación institucional.',
    tip: 'Se genera directamente en tu navegador sin costo alguno ni envío de datos a servidores externos, garantizando confidencialidad absoluta.',
  },
  'btn-excel-report': {
    id: 'btn-excel-report',
    title: 'Exportar Datos Consolidados (.xlsx)',
    badge: 'Auditoría y Análisis',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    whatItDoes:
      'Exporta un libro de Excel profesional con hojas especializadas: "Resumen Ejecutivo" con barras visuales de desempeño y "Consolidado de Colaboradores" con semáforos cromáticos e histórico de respuestas.',
    whenAndHow:
      'Úsalo cuando el departamento de Recursos Humanos o Dirección necesite analizar los números a detalle, cruzar información con evaluaciones de metas o archivar los resultados del ciclo.',
    tip: 'Incluye barras gráficas en celdas para identificar a simple vista el rendimiento de cada departamento sin leer sólo cifras.',
  },
  'kpi-subjects': {
    id: 'kpi-subjects',
    title: 'Colaboradores Registrados',
    badge: 'Métrica Clave',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    whatItDoes:
      'Contabiliza en tiempo real el total de participantes dados de alta en este ciclo de evaluación 360° dentro de tu empresa.',
    whenAndHow:
      'Monitorea este número antes de iniciar la difusión para asegurarte de que ningún área o integrante clave quede fuera del programa.',
    tip: 'Si falta alguien, puedes darlo de alta en cualquier momento usando el botón "+ Registrar Colaborador".',
  },
  'kpi-completed': {
    id: 'kpi-completed',
    title: 'Evaluaciones Completadas',
    badge: 'Métrica Clave',
    badgeColor: 'bg-lime-100 text-lime-900 border-lime-300',
    whatItDoes:
      'Muestra el volumen acumulado de cuestionarios 360° recibidos y procesados con éxito en la plataforma frente a la meta total fijada.',
    whenAndHow:
      'Supervisa esta cifra diariamente durante los días que dure la campaña para medir el ritmo de respuesta de la organización.',
    tip: 'El sistema actualiza este contador al instante cada vez que un evaluador oprime "Enviar Evaluación".',
  },
  'kpi-participation': {
    id: 'kpi-participation',
    title: 'Tasa de Participación Global',
    badge: 'Métrica Clave',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    whatItDoes:
      'Calcula el porcentaje de cumplimiento institucional dividiendo los cuestionarios recibidos entre la meta total esperada.',
    whenAndHow:
      'Es el termómetro principal del éxito de la campaña. Te indica si es necesario emitir recordatorios antes del cierre de vigencia.',
    tip: 'Una tasa mayor o igual al 80% se considera estadísticamente representativa y de alto impacto organizacional.',
  },
  'kpi-average': {
    id: 'kpi-average',
    title: 'Vigencia y Estatus Operativo',
    badge: 'Control Temporal',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    whatItDoes:
      'Indica si la campaña se encuentra activa, los días naturales restantes y la fecha límite contractual de recepción de respuestas.',
    whenAndHow:
      'Consúltalo para planificar la agenda de avisos y saber con exactitud cuándo se cerrará el acceso al cuestionario.',
    tip: 'Al vencer el periodo, el sistema protege los resultados y ya no permite que se alteren los promedios calculados.',
  },
  'section-analytics': {
    id: 'section-analytics',
    title: 'Dashboard de Tendencia y Estado en Dona',
    badge: 'Visualización Avanzada',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-200',
    whatItDoes:
      'Presenta dos gráficas interactivas: la curva cronológica de respuestas por día y la gráfica de dona con el estado entre evaluaciones completadas y pendientes.',
    whenAndHow:
      'Permite observar el impacto de los comunicados de Recursos Humanos (picos de respuesta) y proyectar cuándo se alcanzará la meta final.',
    tip: 'Pasa el cursor sobre la gráfica para ver la cantidad exacta de respuestas registradas en cada fecha.',
  },
  'section-bias': {
    id: 'section-bias',
    title: 'Módulo de Detección de Sesgo Estadístico',
    badge: 'Auditoría de Calidad',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-200',
    whatItDoes:
      'Algoritmo matemático que analiza la varianza y homogeneidad de las respuestas para alertar sobre posibles calificaciones automáticas o poco objetivas (ej. todas con puntaje 5 o todas con puntaje 1).',
    whenAndHow:
      'Revisa las alertas antes de presentar el informe final para detectar evaluadores que no leyeron las preguntas o respondieron por compromiso.',
    tip: 'Te permite respaldar la validez metodológica de la evaluación frente a líderes de área o sindicatos.',
  },
  'table-collaborators': {
    id: 'table-collaborators',
    title: 'Directorio y Seguimiento por Colaborador',
    badge: 'Control Individual',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    whatItDoes:
      'Tabla detallada que lista a cada colaborador con su departamento, progreso individual (evaluaciones recibidas vs. meta), promedio obtenido y acciones de reporte.',
    whenAndHow:
      'Úsala para identificar colaboradores rezagados que aún no reciben evaluaciones y descargar fichas individuales en PDF en un solo clic.',
    tip: 'Puedes filtrar por nombre o departamento con la barra de búsqueda superior para encontrar rápidamente a cualquier persona.',
  },
};
