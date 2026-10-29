import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { COMMITTEE_HEADINGS, detailLabels, selectors } from "./config.ts";

export interface Course {
  slug: string;
  source_url: string;
  title: string;
  description: string | null;
  objectives: string[];
  venue: string | null;
  organizers: string[];
  instructors: string[];
  enrollment_start: string | null;
  enrollment_end: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule_text: string | null;
  min_seats: number | null;
  max_seats: number | null;
  price_uta_student: number | null;
  price_uta_grad_staff: number | null;
  price_public: number | null;
  certificate_type: string | null;
  hours: number | null;
  audience: string | null;
  modality: string | null;
  prerequisites: string | null;
  materials: string | null;
  contents: string | null;
  poster_url: string | null;
  content_hash: string;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function iso(day: string, month: string, year: string): string | null {
  const m = MONTHS.indexOf(norm(month));
  if (m < 0) return null;
  // Ecuador is UTC-5 with no DST; a course "starts" at local midnight.
  return `${year}-${String(m + 1).padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00-05:00`;
}

/** "Del 16 de octubre de 2026 al 05 de diciembre de 2026" (start year may be omitted). */
export function parseDateRange(text: string): [string | null, string | null] {
  const re = /(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+(?:de|del)\s+(\d{4}))?\s+al\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de|del)\s+(\d{4})/i;
  const m = re.exec(norm(text));
  if (!m) return [null, null];
  return [iso(m[1], m[2], m[3] ?? m[6]), iso(m[4], m[5], m[6])];
}

/** Returns the first amount in the text: "$120,00" or "30 USD". */
export function parsePrice(text: string): number | null {
  const m = /\$\s*([\d.,]+)|([\d.,]+)\s*usd/i.exec(text);
  if (!m) return null;
  const n = Number((m[1] ?? m[2]).replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parsePrices(lines: string[]) {
  const out = { student: null as number | null, gradStaff: null as number | null, public: null as number | null };
  for (const line of lines) {
    const t = norm(line);
    const price = parsePrice(line);
    if (price === null) continue;
    if (/estudiantes/.test(t)) out.student ??= price;
    else if (/graduados|docentes|administrativ/.test(t)) out.gradStaff ??= price;
    else if (/publico/.test(t)) out.public ??= price;
  }
  return out;
}

function parseSeats(text: string): [number | null, number | null] {
  const t = norm(text);
  const min = /minimo\s+(\d+)/.exec(t);
  const max = /maximo\s+(\d+)/.exec(t);
  return [min ? Number(min[1]) : null, max ? Number(max[1]) : null];
}

export function parseCoursePage(html: string, sourceUrl: string): Course {
  const $ = cheerio.load(html);
  const texts = (sel: string) => $(sel).map((_, e) => clean($(e).text())).get().filter(Boolean);

  const details: Record<string, string> = {};
  const priceLines: string[] = [];
  let inPrices = false;
  $(selectors.detailsItems).each((_, li) => {
    const label = clean($(li).children("strong").first().text()).replace(/:$/, "");
    const value = clean($(li).text().replace($(li).children("strong").first().text(), ""));
    if (label) {
      inPrices = norm(label).startsWith("precio");
      const field = detailLabels[norm(label)];
      if (field) details[field] = value;
      if (inPrices && value) priceLines.push(value);
    } else if (inPrices) {
      priceLines.push(clean($(li).text()));
    }
  });

  const committee = { organizers: [] as string[], instructors: [] as string[] };
  $(selectors.committee).find("h2").each((_, h) => {
    const key = norm($(h).text());
    const items = $(h).next("ul").find("li").map((_, e) => clean($(e).text())).get();
    if (key === COMMITTEE_HEADINGS.organizers) committee.organizers = items;
    if (key === COMMITTEE_HEADINGS.instructors) committee.instructors = items;
  });

  const [enrollment_start, enrollment_end] = parseDateRange(details.enrollment ?? "");
  const [start_date, end_date] = parseDateRange(details.course_dates ?? "");
  const [min_seats, max_seats] = parseSeats(details.seats ?? "");
  const prices = parsePrices(priceLines);
  const poster = $(selectors.poster).first().attr("src");
  const certNote = texts(selectors.certificateNote).join(" ");
  const certificate = [details.certificate_type, certNote].filter(Boolean).join(" ");
  const hours = /(\d+)/.exec(details.hours ?? "");

  const course = {
    slug: /([^/]+)\.php$/.exec(sourceUrl)?.[1] ?? sourceUrl,
    source_url: sourceUrl,
    title: clean($(selectors.title).first().text()),
    description: texts(selectors.description).join("\n\n") || null,
    objectives: texts(selectors.objectives),
    venue: texts(selectors.venue).join("; ") || null,
    ...committee,
    enrollment_start,
    enrollment_end,
    start_date,
    end_date,
    schedule_text: details.schedule_text ?? null,
    min_seats,
    max_seats,
    price_uta_student: prices.student,
    price_uta_grad_staff: prices.gradStaff,
    price_public: prices.public,
    certificate_type: certificate || null,
    hours: hours ? Number(hours[1]) : null,
    audience: details.audience ?? null,
    modality: details.modality ?? null,
    prerequisites: details.prerequisites ?? null,
    materials: texts(selectors.materials).join("\n") || null,
    contents: texts(selectors.contents).join("\n") || null,
    poster_url: poster ? new URL(poster, sourceUrl).href : null,
  };
  const content_hash = createHash("sha256").update(JSON.stringify(course)).digest("hex");
  return { ...course, content_hash };
}

/** Course page links from the list page. Status (open/closed) is irrelevant: dates decide via the DB view. */
export function parseCourseLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links = $(selectors.listCard).find(selectors.listLink).map((_, a) => $(a).attr("href")).get();
  return [...new Set(links.filter((h): h is string => !!h).map((h) => new URL(h, baseUrl).href))];
}
