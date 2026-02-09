export type Activity = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  cardImage: string;
  benefits: string[];
  schedule: string[];
  teachers: string[];
  level: string;
  duration: string;
  successCriteria: string[];
};

export const ACTIVITIES: Activity[] = [
  {
    slug: "musculacion",
    name: "Musculación",
    shortDescription: "Fuerza y masa muscular",
    description: "Entrenamiento de fuerza guiado para ganar músculo, mejorar postura y construir una base sólida.",
    cardImage: "/musculacion.png",
    benefits: ["Aumento de masa muscular", "Mejora de densidad ósea", "Metabolismo activo"],
    schedule: ["Lunes a Viernes · 06:00 a 23:00", "Sábados · 08:00 a 20:00"],
    teachers: ["Juan Pérez", "María García"],
    level: "Todos los niveles",
    duration: "45 a 60 minutos",
    successCriteria: ["Completar rutina semanal", "Mejorar técnica de base", "Incrementar cargas de forma progresiva"],
  },
  {
    slug: "crossfit",
    name: "Crossfit",
    shortDescription: "Rendimiento integral",
    description: "WODs dinámicos para mejorar fuerza, coordinación y resistencia en un entorno de comunidad.",
    cardImage: "/crossfit.png",
    benefits: ["Capacidad aeróbica", "Fuerza funcional", "Motivación grupal"],
    schedule: ["Lunes a Viernes · Clases cada 1 hora desde las 07:00", "Sábados · 09:00, 10:00 y 11:00"],
    teachers: ["Carlos López", "Lucía Fernández"],
    level: "Intermedio a avanzado",
    duration: "50 minutos",
    successCriteria: ["Mejorar tiempos de WOD", "Mantener técnica bajo fatiga", "Aumentar constancia mensual"],
  },
  {
    slug: "yoga",
    name: "Yoga",
    shortDescription: "Cuerpo y mente",
    description: "Sesiones enfocadas en movilidad, respiración y equilibrio para reducir estrés y mejorar bienestar.",
    cardImage: "/yoga.png",
    benefits: ["Mayor movilidad", "Menor estrés", "Mejor respiración"],
    schedule: ["Lunes, Miércoles y Viernes · 08:00 y 19:00", "Martes y Jueves · 20:00"],
    teachers: ["Sofía Ruiz", "Valentina Mora"],
    level: "Inicial a intermedio",
    duration: "60 minutos",
    successCriteria: ["Lograr secuencias fluidas", "Aumentar flexibilidad", "Mejorar control postural"],
  },
  {
    slug: "boxing",
    name: "Boxeo",
    shortDescription: "Técnica y explosión",
    description: "Entrenamiento técnico y físico que combina coordinación, potencia y trabajo cardiovascular.",
    cardImage: "/boxing.png",
    benefits: ["Mejor coordinación", "Potencia de golpe", "Alta quema calórica"],
    schedule: ["Lunes a Viernes · 18:00 y 20:00", "Sábados · 10:30"],
    teachers: ["Nicolás Rojas", "Bruno Díaz"],
    level: "Todos los niveles",
    duration: "55 minutos",
    successCriteria: ["Dominar guardia y desplazamiento", "Mejorar resistencia por rounds", "Perfeccionar combinaciones"],
  },
  {
    slug: "spinning",
    name: "Spinning",
    shortDescription: "Cardio intensivo",
    description: "Clases de bici indoor con música y cambios de ritmo para maximizar resistencia y energía.",
    cardImage: "/spinning.png",
    benefits: ["Resistencia cardiovascular", "Trabajo de piernas", "Alto gasto energético"],
    schedule: ["Lunes a Viernes · 07:00, 13:00 y 19:00", "Sábados · 09:00"],
    teachers: ["Micaela Soto", "Ramiro Paz"],
    level: "Inicial a avanzado",
    duration: "45 minutos",
    successCriteria: ["Sostener cadencia objetivo", "Controlar zonas de esfuerzo", "Aumentar rendimiento semanal"],
  },
  {
    slug: "funcional",
    name: "Funcional",
    shortDescription: "Entrenamiento funcional",
    description: "Circuitos integrales que mejoran movimientos del día a día con foco en fuerza, agilidad y estabilidad.",
    cardImage: "/funcional.svg",
    benefits: ["Mejor coordinación global", "Mayor estabilidad de core", "Movilidad aplicada"],
    schedule: ["Lunes a Viernes · 08:00, 12:00 y 19:30", "Sábados · 11:00"],
    teachers: ["Camila Torres", "Leandro Núñez"],
    level: "Todos los niveles",
    duration: "50 minutos",
    successCriteria: ["Completar circuitos con buena técnica", "Progresar en repeticiones", "Mejorar agilidad y control"],
  },
];

export const ACTIVITIES_BY_SLUG = Object.fromEntries(
  ACTIVITIES.map((activity) => [activity.slug, activity]),
);
