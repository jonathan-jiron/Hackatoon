"use client";

import { SENTIMENT_META, timeAgo } from "@/lib/format";
import { Conversation, Sentiment } from "@/lib/types";
import Avatar from "./Avatar";
import { SentimentIcon } from "./Icons";

// How warm the chat is, drawn as a thermometer on the card's left edge.
const LEVEL: Record<Sentiment, number> = { hot_lead: 100, frustrated: 80, doubtful: 60, interested: 40, spam: 15 };

/** The customer wrote last and a person has the chat: someone owes them an answer. */
export const awaitsReply = (c: Conversation) => c.ai_paused && c.last_message?.role === "user";

export default function ConversationCard({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const m = SENTIMENT_META[conv.sentiment];
  const who = conv.last_message?.role === "operator" ? "Tú: " : conv.last_message?.role === "assistant" ? "IA: " : "";
  const waiting = awaitsReply(conv);

  return (
    <button
      onClick={onClick}
      aria-current={active}
      aria-label={`${conv.contact?.name ?? "Sin nombre"}, ${m.label}, ${conv.ai_paused ? "atiende una persona" : "atiende la IA"}${waiting ? ", espera respuesta" : ""}`}
      className={`relative flex w-full gap-3 rounded-xl border bg-white py-2.5 pl-5 pr-3 text-left transition hover:border-slate-400 ${
        active ? "border-brand ring-2 ring-brand/20" : "border-slate-200"
      }`}
    >
      <span aria-hidden className="absolute inset-y-2.5 left-2 w-1 overflow-hidden rounded-full bg-slate-100">
        <span className={`absolute inset-x-0 bottom-0 rounded-full ${m.dot}`} style={{ height: `${LEVEL[conv.sentiment]}%` }} />
      </span>
      <Avatar name={conv.contact?.name ?? null} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{conv.contact?.name ?? "Sin nombre"}</span>
          <span className="shrink-0 text-xs text-slate-600">{timeAgo(conv.last_message_at)}</span>
        </div>
        <p className="truncate text-sm text-slate-600">{conv.last_message ? `${who}${conv.last_message.content.replace(/\*\*/g, "")}` : "Sin mensajes todavía"}</p>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 font-medium ${m.text}`}>
            <SentimentIcon value={conv.sentiment} className="h-3.5 w-3.5" />
            {m.label}
          </span>
          {waiting && <span className="whitespace-nowrap font-medium text-orange-700">· Espera tu respuesta</span>}
          {/* The AI answering is the normal state and stays unmarked; only a person in control is flagged. */}
          {conv.ai_paused && !waiting && <span className="whitespace-nowrap text-slate-600">· Atiende una persona</span>}
        </div>
      </div>
    </button>
  );
}
