import { db } from "./db.ts";

// Deterministic layer that runs BEFORE the model: consent, menu and course picking cost zero tokens.

export interface Button {
  label: string;
  data: string;
}
export interface Reply {
  text: string;
  buttons?: Button[][];
}
export interface CourseRow {
  id: string;
  slug: string;
  title: string;
  start_date: Date;
  enrollment_end: Date | null;
  hours: number | null;
  modality: string | null;
}

export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9/ ]+/g, " ").replace(/\s+/g, " ").trim();

const wordCount = (s: string) => (s ? s.split(" ").length : 0);
// Words shared by many titles say nothing about which course the user means.
const GENERIC = new Set(["preparacion", "fundamentos", "certified", "certificate", "program", "associate", "curso", "para", "de", "la", "el", "en"]);

/** A course matches when the text contains a word that appears in exactly one course title. */
export function matchCourseByName(text: string, courses: Pick<CourseRow, "title" | "slug">[]): string | null {
  const t = ` ${normalize(text)} `;
  const words = courses.map((c) => normalize(c.title).split(" ").filter((w) => w.length >= 4 && !GENERIC.has(w)));
  const hits = courses.filter((_, i) => words[i].some((w) => t.includes(` ${w} `) && words.filter((ws) => ws.includes(w)).length === 1));
  return hits.length === 1 ? hits[0].slug : null;
}

const fmtDate = (d: Date) => d.toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "long", year: "numeric" });

const mainMenu = (intro = "¿Qué te gustaría hacer?"): Reply => ({
  text: intro,
  buttons: [
    [{ label: "📚 Ver cursos disponibles", data: "menu:courses" }],
    [{ label: "❓ Preguntar por un curso", data: "menu:ask" }],
    [{ label: "🙋 Hablar con una persona", data: "menu:human" }],
  ],
});

const consentPrompt = (name?: string | null): Reply => ({
  text: `¡Hola${name ? `, ${name}` : ""}! Soy Romario, asistente de CTT-FISEI (Universidad Técnica de Ambato). Te ayudo con los próximos cursos y tu inscripción.\n\nPara darte seguimiento necesito guardar los datos que me compartas en este chat. ¿Aceptas?`,
  buttons: [[{ label: "✅ Acepto", data: "consent:yes" }, { label: "❌ No acepto", data: "consent:no" }]],
});

const courseButtons = (courses: CourseRow[], prefix = "") =>
  courses.map((c) => [{ label: `${prefix}${c.title}`.slice(0, 60), data: `course:${c.slug}` }]);

async function openCourses(): Promise<CourseRow[]> {
  const { rows } = await db.query("select id, slug, title, start_date, enrollment_end, hours, modality from open_courses order by start_date");
  return rows;
}

function courseLine(c: CourseRow) {
  return `• ${c.title}\n  Inicia el ${fmtDate(c.start_date)} · ${c.hours ?? "?"} h · ${c.modality ?? "modalidad por confirmar"}`;
}

export function courseCard(c: CourseRow): Reply {
  const enroll = c.enrollment_end ? `\nInscripciones hasta el ${fmtDate(c.enrollment_end)}.` : "";
  return {
    text: `${c.title}\nInicia el ${fmtDate(c.start_date)} · ${c.hours ?? "?"} horas · ${c.modality ?? "modalidad por confirmar"}.${enroll}\n\nEscríbeme lo que quieras saber de este curso: precio, horario, contenidos, certificado…`,
    buttons: [[{ label: "📚 Ver otros cursos", data: "menu:courses" }, { label: "🏠 Menú", data: "menu:main" }]],
  };
}

export interface RouteInput {
  contact: { id: string; name: string | null; consent_at: Date | null };
  conv: { id: string };
  text?: string;
  action?: string;
}

/** Returns a reply when the router handles the message, or null to let the model answer. */
export async function route({ contact, conv, text = "", action }: RouteInput): Promise<Reply | null> {
  if (!contact.consent_at) {
    if (action === "consent:yes") {
      await db.query("update contacts set consent_at = now() where id = $1", [contact.id]);
      return mainMenu("¡Gracias! Ya puedo ayudarte. ¿Qué te gustaría hacer?");
    }
    if (action === "consent:no") {
      return {
        text: "Entendido, no guardaré tus datos. Si cambias de opinión, toca el botón. También puedes escribir a talleresfisei@uta.edu.ec.",
        buttons: [[{ label: "✅ Acepto", data: "consent:yes" }]],
      };
    }
    // The model never runs before consent.
    return consentPrompt(contact.name);
  }

  const t = normalize(text);
  const courses = await openCourses();

  if (action?.startsWith("course:")) return selectCourse(action.slice(7), courses, contact.id, conv.id);
  if (action === "menu:main" || ["/start", "/menu", "menu", "inicio"].includes(t)) return mainMenu();
  if (action === "menu:human") {
    await db.query(
      "update conversations set ai_paused = true, paused_by = 'user_request', summary = coalesce(summary || chr(10), '') || $2 where id = $1",
      [conv.id, "[Handoff] El usuario pidió hablar con una persona."],
    );
    return { text: "Listo, una persona del equipo continuará esta conversación. También puedes escribir a talleresfisei@uta.edu.ec." };
  }
  if (action === "menu:courses") return listCourses(courses);
  if (action === "menu:ask") return askWhichCourse(courses);
  if (action) return null;

  // Free text. A bare course mention picks the course; a longer sentence goes to the model with that course as context.
  const slug = matchCourseByName(text, courses);
  if (slug) {
    if (wordCount(t) <= 4) return selectCourse(slug, courses, contact.id, conv.id);
    await setFocus(conv.id, courses.find((c) => c.slug === slug)!.id);
    return null;
  }
  if (wordCount(t) <= 6) {
    if (/\b(preguntar|consultar|info|informacion|saber)\b.*\bcurso\b/.test(t)) return askWhichCourse(courses);
    if (/\b(cursos|catalogo|disponibles|ofrecen|tienen)\b/.test(t)) return listCourses(courses);
  }
  return null;
}

const setFocus = (conversationId: string, courseId: string) =>
  db.query("update conversations set focus_course_id = $2 where id = $1", [conversationId, courseId]);

async function selectCourse(slug: string, courses: CourseRow[], contactId: string, conversationId: string): Promise<Reply> {
  const c = courses.find((x) => x.slug === slug);
  if (!c) return listCourses(courses);
  await setFocus(conversationId, c.id);
  await db.query("insert into leads (contact_id, course_id, stage) values ($1,$2,'interested') on conflict (contact_id, course_id) do nothing", [contactId, c.id]);
  await db.query("update conversations set stage = 'interested' where id = $1 and stage = 'new'", [conversationId]);
  return courseCard(c);
}

function listCourses(courses: CourseRow[]): Reply {
  if (!courses.length) return { text: "Por ahora no hay cursos próximos abiertos. Escríbenos a talleresfisei@uta.edu.ec.", buttons: mainMenu().buttons };
  return {
    text: `Estos son los próximos cursos:\n\n${courses.map(courseLine).join("\n\n")}\n\nToca uno para ver más y preguntar lo que quieras.`,
    buttons: [...courseButtons(courses), [{ label: "🏠 Menú", data: "menu:main" }]],
  };
}

function askWhichCourse(courses: CourseRow[]): Reply {
  if (!courses.length) return listCourses(courses);
  return { text: "¿Sobre qué curso quieres preguntar?", buttons: [...courseButtons(courses), [{ label: "🏠 Menú", data: "menu:main" }]] };
}
