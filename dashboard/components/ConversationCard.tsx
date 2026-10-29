"use client";

import { SENTIMENT_META, timeAgo } from "@/lib/format";
import { Conversation } from "@/lib/types";
import Avatar from "./Avatar";
import SentimentBadge, { Thermometer } from "./SentimentBadge";

export default function ConversationCard({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const m = SENTIMENT_META[conv.sentiment];
  const who = conv.last_message?.role === "operator" ? "Tú: " : conv.last_message?.role === "assistant" ? "IA: " : "";

  return (
    <button
      onClick={onClick}
      aria-current={active}
      aria-label={`${conv.contact?.name ?? "Sin nombre"}, ${m.label}, ${conv.ai_paused ? "atiende una persona" : "atiende la IA"}`}
      className={`flex w-full gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-brand/50 hover:shadow-sm ${
        active ? "border-brand ring-2 ring-brand/20" : "border-slate-200"
      }`}
    >
      <Avatar name={conv.contact?.name ?? null} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{conv.contact?.name ?? "Sin nombre"}</span>
          <span className="shrink-0 text-xs text-slate-500">{timeAgo(conv.last_message_at)}</span>
        </div>
        <p className="truncate text-sm text-slate-600">{conv.last_message ? `${who}${conv.last_message.content}` : "Sin mensajes todavía"}</p>
        <Thermometer value={conv.sentiment} />
        <div className="flex items-center justify-between gap-2">
          <SentimentBadge value={conv.sentiment} />
          {conv.ai_paused ? (
            <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-white">Atiende una persona</span>
          ) : (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark">Atiende la IA</span>
          )}
        </div>
      </div>
    </button>
  );
}
