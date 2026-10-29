import { Conversation, Course, Lead, Message, Sentiment } from "./types";

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();

const names = ["Camila Reyes", "Luis Paredes", "Andrea Mora", "Joel Vera", "Daniela Cruz", "Mateo Salazar"];
const sentiments: Sentiment[] = ["hot_lead", "doubtful", "interested", "frustrated", "interested", "doubtful"];
const stages = ["ready_to_close", "asked_price", "interested", "interested", "new", "asked_price"];

export const demoConversations: Conversation[] = names.map((name, i) => ({
  id: `c${i + 1}`,
  contact_id: `p${i + 1}`,
  status: "open",
  stage: stages[i],
  sentiment: sentiments[i],
  ai_paused: i === 3,
  paused_by: i === 3 ? "auto: frustration" : null,
  summary: [
    "Estudiante UTA. Quiere el curso de Arduino, ya preguntó cómo pagar.",
    "Duda del precio y si el certificado sirve para su hoja de vida.",
    "Pregunta por modalidad y horarios de los cursos próximos.",
    "Molesto porque no recibió el horario exacto. Pidió hablar con una persona.",
    "Recién escribió, aún no dice qué curso busca.",
    "Compara precio de estudiante y público, no sabe cuál le toca.",
  ][i],
  last_message_at: ago(i * 3 + 1),
  contact: { id: `p${i + 1}`, channel: "telegram", channel_user_id: `${1000 + i}`, name, audience_type: i % 2 ? "public" : "uta_student" },
}));

const script: [string, string][][] = [
  [["user", "Hola, vi el curso de Arduino"], ["assistant", "¡Hola Camila! Qué bueno que te interese. ¿Eres estudiante UTA o escribes como público general?"], ["user", "Estudiante de FISEI"], ["assistant", "Perfecto. Para estudiantes UTA el curso cuesta menos. ¿Te cuento fechas y horario?"], ["user", "Sí, y cómo me inscribo ya mismo"]],
  [["user", "cuanto cuesta el taller"], ["assistant", "Depende de tu perfil. ¿Eres estudiante, graduado de la UTA o público?"], ["user", "público. y el certificado vale la pena?"]],
  [["user", "que cursos hay"], ["assistant", "Ahora mismo hay talleres abiertos de Arduino y otros por iniciar. ¿Qué área te llama más?"]],
  [["user", "ya pregunté tres veces el horario"], ["assistant", "Lamento la confusión. El horario debe confirmarse con coordinación, te paso con una persona."], ["operator", "Hola Joel, soy de coordinación. Te confirmo el horario hoy mismo."]],
  [["user", "holaa"]],
  [["user", "precio estudiante vs publico?"], ["assistant", "Te explico la diferencia, ¿eres estudiante de la UTA?"]],
];

export const demoMessages: Record<string, Message[]> = {};
demoConversations.forEach((c, ci) => {
  demoMessages[c.id] = script[ci].map(([role, content], k) => ({
    id: `${c.id}-m${k}`,
    conversation_id: c.id,
    role: role as Message["role"],
    content,
    media_type: "text",
    created_at: ago((script[ci].length - k) * 2 + ci),
  }));
});

export const demoCourses: Course[] = [
  { id: "k1", slug: "arduino", title: "Arduino desde cero", start_date: new Date(Date.now() + 12 * 864e5).toISOString(), price_uta_student: 25, price_uta_grad_staff: 35, price_public: 50, modality: "Presencial", scraped_at: ago(60) },
  { id: "k2", slug: "python-datos", title: "Python para análisis de datos", start_date: new Date(Date.now() + 20 * 864e5).toISOString(), price_uta_student: 30, price_uta_grad_staff: 40, price_public: 60, modality: "Virtual", scraped_at: ago(60) },
];

export const demoLeads: Lead[] = [
  { id: "l1", contact_id: "p1", course_id: "k1", stage: "ready_to_close", score: 92, notes: "Pidió pasos de pago", updated_at: ago(1), contact_name: "Camila Reyes", course_title: "Arduino desde cero", conversation_id: "c1" },
  { id: "l2", contact_id: "p2", course_id: "k2", stage: "asked_price", score: 58, notes: "Duda por el certificado", updated_at: ago(4), contact_name: "Luis Paredes", course_title: "Python para análisis de datos", conversation_id: "c2" },
  { id: "l3", contact_id: "p3", course_id: null, stage: "interested", score: 35, notes: null, updated_at: ago(7), contact_name: "Andrea Mora", course_title: null, conversation_id: "c3" },
  { id: "l4", contact_id: "p4", course_id: "k1", stage: "asked_enroll", score: 70, notes: "Frustrado por horario", updated_at: ago(10), contact_name: "Joel Vera", course_title: "Arduino desde cero", conversation_id: "c4" },
  { id: "l5", contact_id: "p5", course_id: null, stage: "new", score: 10, notes: null, updated_at: ago(13), contact_name: "Daniela Cruz", course_title: null, conversation_id: "c5" },
  { id: "l6", contact_id: "p6", course_id: "k2", stage: "asked_price", score: 48, notes: null, updated_at: ago(16), contact_name: "Mateo Salazar", course_title: "Python para análisis de datos", conversation_id: "c6" },
  { id: "l7", contact_id: "p7", course_id: "k1", stage: "enrolled", score: 100, notes: null, updated_at: ago(300), contact_name: "Sofía Lara", course_title: "Arduino desde cero", conversation_id: null },
];

export const demoUserLines = [
  "y el certificado es oficial?",
  "hay descuento para graduados?",
  "cuando empieza exactamente",
  "puedo pagar por transferencia?",
  "es presencial o virtual",
];
export const demoBotLines = [
  "Sí, el certificado lo emite el CTT FISEI. Te cuento los detalles.",
  "El precio depende de tu perfil. Dime si eres graduado y te digo el valor exacto.",
  "Esa fecha debe confirmarse con coordinación, ya les aviso.",
  "Te explico los pasos para inscribirte, son muy cortos.",
];
