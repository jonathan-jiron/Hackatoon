"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { AUDIENCE_LABEL, CHANNEL_LABEL, clock } from "@/lib/format";
import { useStore } from "@/lib/store";
import Avatar from "./Avatar";
import { ArrowLeftIcon, MicIcon } from "./Icons";
import SentimentBadge from "./SentimentBadge";
import { useToast } from "./Toast";

const MAX = 1000;
const quickReplies = [
  { label: "Saludo", text: "Hola, soy de coordinación. Ya te ayudo con tu consulta." },
  { label: "Confirmaré un dato", text: "Te confirmo ese dato y te escribo en unos minutos." },
  { label: "Pasos de inscripción", text: "Para inscribirte, estos son los pasos:" },
];

const bubble = {
  user: "self-start border border-slate-200 bg-white",
  assistant: "self-end bg-brand-soft text-ink",
  operator: "self-end bg-ink text-white",
} as const;
const roleLabel = { user: "", assistant: "IA · ", operator: "Tú · " } as const;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return d.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" });
}

// Older messages may carry Markdown the channel never rendered; show them as the customer saw them.
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "");

export default function Transcript({ id }: { id: string }) {
  const { conversations, messages, leads, loadMessages, takeOver, resume, sendOperator, markEnrolled, select } = useStore();
  const toast = useToast();
  const conv = conversations.find((c) => c.id === id);
  const list = messages[id] ?? [];
  const lead = leads.find((l) => l.contact_id === conv?.contact_id && l.course_title);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmResume, setConfirmResume] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const lastAt = conv?.last_message_at;
  useEffect(() => {
    loadMessages(id);
  }, [id, lastAt, loadMessages]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [list.length, id]);

  useEffect(() => {
    setConfirmResume(false);
    setError(null);
  }, [id]);

  if (!conv) return null;

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendOperator(id, t);
      setText("");
      toast("Mensaje enviado. La IA queda en pausa en este chat.");
    } catch (e) {
      const reason = e instanceof Error && e.message ? ` (${e.message})` : "";
      setError(`No se pudo entregar por ${CHANNEL_LABEL[conv.contact?.channel ?? ""] ?? "el canal"}${reason}. Tu mensaje sigue aquí, no se perdió.`);
    } finally {
      setBusy(false);
    }
  };

  const doTakeOver = async () => {
    await takeOver(id);
    toast("Tomaste el control. La IA está en silencio.", { label: "Deshacer", run: () => resume(id) });
    input.current?.focus();
  };

  const doResume = async () => {
    await resume(id);
    setConfirmResume(false);
    toast("La IA volvió a atender este chat.");
  };

  const paused = conv.ai_paused;
  const closing = leads.some((l) => l.contact_id === conv.contact_id && (l.stage === "asked_enroll" || l.stage === "ready_to_close"));

  return (
    <section aria-label={`Chat con ${conv.contact?.name ?? "contacto"}`} className="flex h-[calc(100vh-110px)] min-h-[480px] flex-col overflow-hidden rounded-xl border bg-white md:h-[calc(100vh-150px)]">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <button onClick={() => select(null)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Volver a la lista">
          <ArrowLeftIcon />
          Volver
        </button>
        <Avatar name={conv.contact?.name ?? null} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold leading-tight">{conv.contact?.name ?? "Sin nombre"}</h2>
          <p className="truncate text-sm text-slate-600">
            {[CHANNEL_LABEL[conv.contact?.channel ?? ""], conv.contact?.audience_type ? AUDIENCE_LABEL[conv.contact.audience_type] : null, lead?.course_title]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <SentimentBadge value={conv.sentiment} />
          {closing && (
            <button
              onClick={async () => {
                await markEnrolled(id);
                toast("Venta registrada: la persona quedó como inscrita.");
              }}
              className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium hover:border-slate-400"
            >
              Marcar inscrito
            </button>
          )}
        </div>
      </header>

      {/* Who is answering right now: one quiet row, one button. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-4 py-2">
        <p className="text-sm text-slate-700">
          {paused ? <b className="font-semibold">Tú tienes el control</b> : <>La <b className="font-semibold">IA</b> está atendiendo</>}
          <span className="text-slate-600">{paused ? " · la IA no responde hasta que se la devuelvas" : ""}</span>
        </p>
        {paused ? (
          confirmResume ? (
            <div className="flex items-center gap-2 text-sm">
              <span>¿Devolver a la IA?</span>
              <button onClick={doResume} className="rounded-md bg-ink px-3 py-1.5 font-medium text-white hover:bg-slate-700">
                Sí
              </button>
              <button onClick={() => setConfirmResume(false)} className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-200">
                No
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmResume(true)} className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium hover:border-slate-400">
              Devolver a la IA
            </button>
          )
        ) : (
          <button onClick={doTakeOver} className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            Tomar el control
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-paper p-4" aria-live="polite">
        {list.length === 0 && <p className="m-auto text-sm text-slate-600">Todavía no hay mensajes en este chat.</p>}
        {list.map((m, i) => {
          const prev = list[i - 1];
          const next = list[i + 1];
          const day = dayLabel(m.created_at);
          const newDay = !prev || dayLabel(prev.created_at) !== day;
          // Messages from the same speaker group together; the time shows once, under the last one.
          const tight = !newDay && prev?.role === m.role;
          const lastOfGroup = !next || next.role !== m.role || dayLabel(next.created_at) !== day;
          return (
            <Fragment key={m.id}>
              {newDay && <div className="my-1 text-center text-xs font-medium text-slate-600">{day}</div>}
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${bubble[m.role]} ${tight ? "-mt-1" : ""}`}>
                <p className="whitespace-pre-wrap">{plain(m.content)}</p>
                {(lastOfGroup || m.media_type === "audio") && (
                  <p className={`mt-0.5 flex items-center gap-1 text-xs ${m.role === "operator" ? "text-white/70" : "text-slate-600"}`}>
                    {m.media_type === "audio" && <MicIcon className="h-3 w-3" aria-label="audio transcrito" />}
                    {roleLabel[m.role]}
                    {clock(m.created_at)}
                  </p>
                )}
              </div>
            </Fragment>
          );
        })}
        <div ref={bottom} />
      </div>

      <footer className="space-y-2 border-t p-3">
        {paused && !text && (
          <div className="flex flex-wrap gap-1.5">
            {quickReplies.map((q) => (
              <button
                key={q.label}
                onClick={() => {
                  setText(q.text);
                  input.current?.focus();
                }}
                className="rounded-full border px-3 py-1 text-xs text-slate-600 hover:border-slate-400 hover:text-ink"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={input}
            value={text}
            maxLength={MAX}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            aria-label="Mensaje para el cliente"
            placeholder={paused ? "Escribe tu respuesta" : "Escribe para tomar el control y responder"}
            className="flex-1 resize-none rounded-lg border px-3 py-2 outline-none focus:border-brand"
          />
          <button
            onClick={send}
            disabled={busy || !text.trim()}
            className="rounded-lg bg-ink px-5 py-2.5 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Enviando…" : "Enviar"}
          </button>
        </div>
        <p className="flex justify-between text-xs text-slate-600">
          <span>Enter envía · Shift + Enter salto de línea</span>
          {text.length > MAX - 150 && <span>{text.length}/{MAX}</span>}
        </p>
      </footer>
    </section>
  );
}
