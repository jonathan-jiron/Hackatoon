import { Sentiment } from "./types";

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
}

export function shortDate(iso: string | null): string {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function money(v: number | null): string {
  return v == null ? "Sin precio" : `$${v.toFixed(2)}`;
}

export function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

// Heuristic 2 and 4: plain words plus an icon, so meaning never depends on color alone.
export const SENTIMENT_META: Record<
  Sentiment,
  { label: string; hint: string; dot: string; text: string; bg: string; bar: string; ring: string }
> = {
  interested: {
    label: "Interesado", hint: "Pregunta con curiosidad. La IA puede seguir sola.",
    dot: "bg-emerald-500", text: "text-emerald-800", bg: "bg-emerald-50", bar: "w-2/5 bg-emerald-500", ring: "ring-emerald-200",
  },
  doubtful: {
    label: "Con dudas", hint: "Duda del precio, del tiempo o del certificado.",
    dot: "bg-amber-500", text: "text-amber-800", bg: "bg-amber-50", bar: "w-3/5 bg-amber-500", ring: "ring-amber-200",
  },
  frustrated: {
    label: "Molesto", hint: "Está incómodo. Conviene que una persona le responda.",
    dot: "bg-red-500", text: "text-red-800", bg: "bg-red-50", bar: "w-4/5 bg-red-500", ring: "ring-red-200",
  },
  hot_lead: {
    label: "Listo para comprar", hint: "Quiere inscribirse. Es buen momento para cerrar.",
    dot: "bg-fuchsia-600", text: "text-fuchsia-800", bg: "bg-fuchsia-50", bar: "w-full bg-fuchsia-600", ring: "ring-fuchsia-200",
  },
};

export const SENTIMENT_ORDER: Sentiment[] = ["hot_lead", "frustrated", "doubtful", "interested"];

export const STAGE_LABEL: Record<string, string> = {
  new: "Nuevo",
  interested: "Interesado",
  asked_price: "Preguntó el precio",
  asked_enroll: "Preguntó cómo inscribirse",
  ready_to_close: "Listo para cerrar",
  enrolled: "Inscrito",
  lost: "Se perdió",
};

export const STAGE_HINT: Record<string, string> = {
  new: "Acaba de escribir por primera vez.",
  interested: "Mostró interés en un curso.",
  asked_price: "Ya pidió el precio.",
  asked_enroll: "Preguntó los pasos para inscribirse.",
  ready_to_close: "Solo falta que confirme su inscripción.",
  enrolled: "Ya se inscribió.",
  lost: "Dejó de responder o dijo que no.",
};

export const AUDIENCE_LABEL: Record<string, string> = {
  uta_student: "Estudiante UTA",
  uta_grad_staff: "Graduado o personal UTA",
  public: "Público general",
};

export const CHANNEL_LABEL: Record<string, string> = { telegram: "Telegram", whatsapp: "WhatsApp" };
