// All site-specific selectors and labels live here; the parser contains no literals about the markup.
export const BASE_URL = process.env.SCRAPE_BASE_URL ?? "https://ctt-talleresfisei.uta.edu.ec/";

export const selectors = {
  listCard: "div.rounded.overflow-hidden",
  listLink: "a.h5",
  title: "h1.tituloCurso",
  description: ".descripcion p",
  objectives: ".objetivos li",
  venue: ".ubicacion li",
  committee: ".comite",
  poster: ".gallery img",
  detailsItems: ".pc-tab div.tab1 li",
  materials: ".pc-tab div.tab2 li",
  contents: ".pc-tab div.tab3 li",
  certificateNote: ".pc-tab div.tab1 p",
};

// Normalized (accent-stripped, lowercase) "Label:" text -> course field.
export const detailLabels: Record<string, string> = {
  "fechas de inscripciones": "enrollment",
  "cupo de inscripciones": "seats",
  "fecha del curso": "course_dates",
  horario: "schedule_text",
  "tipo de capacitacion": "certificate_type",
  "horas de capacitacion": "hours",
  beneficiarios: "audience",
  modalidad: "modality",
  "conocimientos previos": "prerequisites",
};

export const COMMITTEE_HEADINGS = { organizers: "comite organizador", instructors: "instructores" };
