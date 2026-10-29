"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ConversationCard from "@/components/ConversationCard";
import Transcript from "@/components/Transcript";
import { SentimentIcon } from "@/components/Icons";
import { SENTIMENT_META, SENTIMENT_ORDER } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Conversation, Sentiment } from "@/lib/types";

const needsAttention = (c: Conversation) => c.sentiment === "hot_lead" || c.sentiment === "frustrated";

export default function InboxPage() {
  const { status, conversations, selectedId, select } = useStore();
  const [filter, setFilter] = useState<Sentiment | "all">("all");
  const [q, setQ] = useState("");
  const search = useRef<HTMLInputElement>(null);

  const visible = useMemo(
    () =>
      conversations
        .filter((c) => (filter === "all" ? true : c.sentiment === filter))
        .filter((c) => (c.contact?.name ?? "").toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)),
    [conversations, filter, q]
  );

  const urgent = visible.filter(needsAttention);
  const rest = visible.filter((c) => !needsAttention(c));
  const flat = [...urgent, ...rest];

  // Heuristic 7: keyboard shortcuts for people who handle many chats.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        search.current?.focus();
      } else if (e.key === "Escape") {
        if (typing) (e.target as HTMLElement).blur();
        else select(null);
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !typing) {
        e.preventDefault();
        const i = flat.findIndex((c) => c.id === selectedId);
        const next = e.key === "ArrowDown" ? Math.min(flat.length - 1, i + 1) : Math.max(0, i - 1);
        if (flat[next]) select(flat[next].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, selectedId, select]);

  const count = (s: Sentiment) => conversations.filter((c) => c.sentiment === s).length;

  const group = (title: string, hint: string, items: Conversation[]) =>
    items.length > 0 && (
      <section aria-label={title} className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
        {items.map((c) => (
          <ConversationCard key={c.id} conv={c} active={c.id === selectedId} onClick={() => select(c.id)} />
        ))}
      </section>
    );

  return (
    <div className="grid gap-4 md:grid-cols-[380px_1fr]">
      <aside className={`space-y-3 ${selectedId ? "hidden md:block" : ""}`}>
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Conversaciones</h1>
          <span className="text-sm text-slate-500">{conversations.length} en total</span>
        </div>

        <div className="relative">
          <input
            ref={search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Buscar conversación por nombre"
            className="w-full rounded-lg border bg-white px-3 py-2 pr-16 outline-none focus:border-brand"
          />
          {q ? (
            <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" aria-label="Borrar búsqueda">
              Borrar
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-slate-50 px-1.5 text-xs text-slate-500">/</kbd>
          )}
        </div>

        <div role="group" aria-label="Filtrar por ánimo" className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={`rounded-full border px-3 py-1 text-sm ${filter === "all" ? "border-ink bg-ink text-white" : "bg-white hover:border-slate-400"}`}
          >
            Todos
          </button>
          {SENTIMENT_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? "all" : s)}
              aria-pressed={filter === s}
              title={SENTIMENT_META[s].hint}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${filter === s ? "border-ink bg-ink text-white" : "bg-white hover:border-slate-400"}`}
            >
              <SentimentIcon value={s} className="h-3.5 w-3.5" />
              {SENTIMENT_META[s].label} {count(s)}
            </button>
          ))}
        </div>

        <div className="max-h-[calc(100vh-290px)] min-h-[200px] space-y-5 overflow-y-auto pr-1">
          {status === "loading" &&
            [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200/70" />)}

          {group("Necesitan atención", "Quieren inscribirse o están molestos. Responde primero a estos.", urgent)}
          {group("En conversación", "La IA los atiende sin problema.", rest)}

          {status !== "loading" && visible.length === 0 && (
            <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-slate-600">
              {conversations.length === 0 ? (
                <>
                  <p className="font-medium text-ink">Aún no hay conversaciones</p>
                  <p className="mt-1">Cuando alguien escriba al bot de Telegram, aparecerá aquí al instante.</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-ink">Ningún chat coincide</p>
                  <button
                    onClick={() => {
                      setQ("");
                      setFilter("all");
                    }}
                    className="mt-2 text-brand underline"
                  >
                    Quitar filtros
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {selectedId ? (
        <Transcript id={selectedId} />
      ) : (
        <div className="hidden place-items-center rounded-xl border border-dashed bg-white p-10 text-center md:grid">
          <div className="max-w-sm space-y-2">
            <p className="text-lg font-semibold">Elige un chat para empezar</p>
            <p className="text-sm text-slate-600">
              Verás la conversación completa y podrás tomar el control cuando quieras. Empieza por los que dicen <b>Necesitan atención</b>.
            </p>
            <p className="text-xs text-slate-500">Consejo: usa ↑ ↓ para moverte entre chats.</p>
          </div>
        </div>
      )}
    </div>
  );
}
