export type Sentiment = "interested" | "doubtful" | "frustrated" | "hot_lead" | "spam";
export type Role = "user" | "assistant" | "operator";
export type LeadStage =
  | "new"
  | "interested"
  | "asked_price"
  | "asked_enroll"
  | "ready_to_close"
  | "enrolled"
  | "lost";

export const LEAD_STAGES: LeadStage[] = [
  "new",
  "interested",
  "asked_price",
  "asked_enroll",
  "ready_to_close",
  "enrolled",
  "lost",
];

export interface Contact {
  id: string;
  channel: "telegram" | "whatsapp";
  channel_user_id: string;
  name: string | null;
  audience_type: string | null;
}

export interface Conversation {
  id: string;
  contact_id: string;
  status: string;
  stage: string | null;
  sentiment: Sentiment;
  ai_paused: boolean;
  paused_by: string | null;
  summary: string | null;
  last_message_at: string;
  first_message_at?: string | null;
  contact: Contact | null;
  last_message?: { content: string; role: Role } | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  media_type: "text" | "audio";
  created_at: string;
}

export interface Lead {
  id: string;
  contact_id: string;
  course_id: string | null;
  stage: LeadStage;
  score: number;
  notes: string | null;
  updated_at: string;
  contact_name?: string | null;
  course_title?: string | null;
  conversation_id?: string | null;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  start_date: string | null;
  price_uta_student: number | null;
  price_uta_grad_staff: number | null;
  price_public: number | null;
  modality: string | null;
  scraped_at: string | null;
}
