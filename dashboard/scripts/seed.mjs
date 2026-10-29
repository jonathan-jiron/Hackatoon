// Fills the local database with fake leads so the dashboard has something to show.
// Everything is tagged with channel_user_id "demo-*" so `npm run unseed` removes only these rows.
// Usage: npm run seed   (needs DATABASE_URL in .env.local)
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: courses } = await client.query(
  "select id, title from courses order by start_date nulls last limit 3"
);
if (courses.length === 0) {
  console.error("No courses found. Run `npm run scrape` in /scraper first.");
  process.exit(1);
}

const people = [
  { name: "Camila Reyes", aud: "uta_student", sent: "hot_lead", stage: "ready_to_close", score: 92,
    summary: "Estudiante UTA. Quiere el curso, ya preguntó cómo pagar.",
    chat: [["user", "Hola, vi el curso en la página"], ["assistant", "¡Hola Camila! Qué bueno. ¿Eres estudiante UTA o escribes como público general?"], ["user", "Soy estudiante de FISEI"], ["assistant", "Perfecto, para estudiantes UTA hay precio especial. ¿Te cuento fechas y horario?"], ["user", "Sí, y cómo me inscribo ya mismo"]] },
  { name: "Luis Paredes", aud: "public", sent: "doubtful", stage: "asked_price", score: 58,
    summary: "Duda del precio y si el certificado sirve para su hoja de vida.",
    chat: [["user", "cuanto cuesta el taller"], ["assistant", "Depende de tu perfil. ¿Eres estudiante, graduado de la UTA o público general?"], ["user", "publico. y el certificado vale la pena?"]] },
  { name: "Andrea Mora", aud: null, sent: "interested", stage: "interested", score: 35,
    summary: "Pregunta por modalidad y horarios.",
    chat: [["user", "que cursos hay"], ["assistant", "Ahora mismo hay talleres abiertos. ¿Qué área te llama más?"]] },
  { name: "Joel Vera", aud: "uta_grad_staff", sent: "frustrated", stage: "asked_enroll", score: 70, paused: true,
    summary: "Molesto porque no recibió el horario exacto. Pidió hablar con una persona.",
    chat: [["user", "ya pregunté tres veces el horario"], ["assistant", "Lamento la confusión. El horario debe confirmarse con coordinación, te paso con una persona."]] },
  { name: "Daniela Cruz", aud: null, sent: "interested", stage: "new", score: 10,
    summary: "Recién escribió, aún no dice qué curso busca.", chat: [["user", "holaa"]] },
  { name: "Mateo Salazar", aud: "uta_student", sent: "doubtful", stage: "asked_price", score: 48,
    summary: "Compara precio de estudiante y público.",
    chat: [["user", "precio estudiante vs publico?"], ["assistant", "Te explico la diferencia. ¿Eres estudiante de la UTA?"]] },
];

await client.query("begin");
for (const [i, p] of people.entries()) {
  const course = courses[i % courses.length];
  const { rows: [ct] } = await client.query(
    `insert into contacts (channel, channel_user_id, name, audience_type, consent_at)
     values ('telegram', $1, $2, $3, now()) on conflict (channel, channel_user_id) do update set name = excluded.name
     returning id`,
    [`demo-${i + 1}`, p.name, p.aud]
  );
  const { rows: existing } = await client.query("select id from conversations where contact_id = $1", [ct.id]);
  if (existing.length) continue;
  const { rows: [conv] } = await client.query(
    `insert into conversations (contact_id, stage, sentiment, ai_paused, paused_by, summary, last_message_at)
     values ($1, $2, $3, $4, $5, $6, now() - ($7 || ' minutes')::interval) returning id`,
    [ct.id, p.stage, p.sent, Boolean(p.paused), p.paused ? "auto: frustration" : null, p.summary, String(i * 3 + 1)]
  );
  for (const [k, [role, content]] of p.chat.entries()) {
    await client.query(
      `insert into messages (conversation_id, role, content, created_at)
       values ($1, $2, $3, now() - ($4 || ' minutes')::interval)`,
      [conv.id, role, content, String((p.chat.length - k) * 2 + i)]
    );
  }
  await client.query(
    `insert into leads (contact_id, course_id, stage, score, notes) values ($1, $2, $3, $4, $5)
     on conflict (contact_id, course_id) do nothing`,
    [ct.id, course.id, p.stage, p.score, p.summary]
  );
}
await client.query("commit");
console.log("Demo data loaded. Open http://localhost:3000");
await client.end();
