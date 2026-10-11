import { CompetencyDefinition } from '../types';

export const LIKERT_SCALE = [
  { value: 1, label: '1 - Deficiente', description: 'Rara vez o nunca demuestra esta conducta' },
  { value: 2, label: '2 - En Desarrollo', description: 'Demuestra la conducta de manera inconsistente' },
  { value: 3, label: '3 - Competente', description: 'Cumple consistentemente con lo esperado' },
  { value: 4, label: '4 - Destacado', description: 'Supera con frecuencia las expectativas' },
  { value: 5, label: '5 - Sobresaliente', description: 'Referente e inspiración para otros' },
];

export const DEFAULT_COMPETENCIES: CompetencyDefinition[] = [
  {
    id: 'liderazgo',
    name: 'Liderazgo e Influencia',
    description: 'Capacidad para guiar, inspirar a otros y movilizar al equipo hacia objetivos comunes con integridad.',
    iconName: 'Crown',
    questions: [
      {
        id: 'lid_1',
        text: 'Inspira confianza, motiva al equipo y transmite una visión clara de los objetivos a alcanzar.',
      },
      {
        id: 'lid_2',
        text: 'Delega responsabilidades con criterio y empodera a sus colaboradores o pares para tomar iniciativa.',
      },
      {
        id: 'lid_3',
        text: 'Maneja situaciones de alta presión o conflicto con serenidad, justicia y madurez profesional.',
      },
      {
        id: 'lid_4',
        text: 'Modela con el ejemplo los valores éticos de la organización y asume responsabilidad por sus resultados.',
      },
    ],
  },
  {
    id: 'comunicacion',
    name: 'Comunicación Asertiva y Escucha',
    description: 'Habilidad para expresar ideas con claridad y respeto, escuchar activamente y brindar retroalimentación constructiva.',
    iconName: 'MessageSquare',
    questions: [
      {
        id: 'com_1',
        text: 'Expresa sus ideas de manera clara, respetuosa, precisa y oportuna tanto en forma verbal como escrita.',
      },
      {
        id: 'com_2',
        text: 'Escucha con atención y apertura los puntos de vista de otros, demostrando empatía y receptividad.',
      },
      {
        id: 'com_3',
        text: 'Proporciona y recibe retroalimentación (feedback) constructiva orientada a la mejora continua.',
      },
      {
        id: 'com_4',
        text: 'Se asegura de que los acuerdos e instrucciones queden comprendidos sin dejar lugar a ambigüedades.',
      },
    ],
  },
  {
    id: 'trabajo_equipo',
    name: 'Trabajo en Equipo y Cooperación',
    description: 'Disposición para colaborar activamente con otros departamentos o miembros, priorizando el éxito colectivo.',
    iconName: 'Users',
    questions: [
      {
        id: 'eq_1',
        text: 'Muestra disposición para colaborar, compartir conocimientos y apoyar a sus colegas en momentos de alta carga.',
      },
      {
        id: 'eq_2',
        text: 'Fomenta un clima laboral positivo, integrador, inclusivo y de respeto mutuo.',
      },
      {
        id: 'eq_3',
        text: 'Coordina esfuerzos transversalmente con otras áreas sin perder de vista los objetivos estratégicos.',
      },
      {
        id: 'eq_4',
        text: 'Prioriza el éxito colectivo del equipo por encima del lucimiento individual.',
      },
    ],
  },
  {
    id: 'resolucion_problemas',
    name: 'Resolución de Problemas e Innovación',
    description: 'Habilidad analítica para identificar causas de raíz, proponer soluciones viables y adaptarse con creatividad.',
    iconName: 'Lightbulb',
    questions: [
      {
        id: 'res_1',
        text: 'Identifica oportunamente problemas complejos, analiza sus causas raíz y propone soluciones prácticas y fundamentadas.',
      },
      {
        id: 'res_2',
        text: 'Demuestra iniciativa para proponer mejoras en procesos, herramientas o formas de trabajo existentes.',
      },
      {
        id: 'res_3',
        text: 'Toma decisiones oportunas basándose en datos, experiencia y sopesando los riesgos involucrados.',
      },
      {
        id: 'res_4',
        text: 'Enfrenta obstáculos imprevistos con flexibilidad mental y propuestas innovadoras.',
      },
    ],
  },
  {
    id: 'adaptabilidad_resultados',
    name: 'Adaptabilidad y Orientación a Resultados',
    description: 'Flexibilidad ante el cambio y perseverancia para alcanzar o superar metas con altos estándares de calidad.',
    iconName: 'Target',
    questions: [
      {
        id: 'adp_1',
        text: 'Se adapta ágilmente a cambios en prioridades, métodos de trabajo o nuevas exigencias del entorno.',
      },
      {
        id: 'adp_2',
        text: 'Mantiene un alto estándar de calidad y sentido de urgencia en sus entregables diarios.',
      },
      {
        id: 'adp_3',
        text: 'Cumple puntualmente sus compromisos y asume responsabilidad directa por sus resultados.',
      },
      {
        id: 'adp_4',
        text: 'Demuestra perseverancia continua y disciplina ante metas desafiantes.',
      },
    ],
  },
];
