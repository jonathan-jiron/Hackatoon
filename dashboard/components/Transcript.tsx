"use client";

import { useEffect, useRef, useState } from "react";
import { AUDIENCE_LABEL, CHANNEL_LABEL, clock, STAGE_LABEL } from "@/lib/format";
import { useStore } from "@/lib/store";
import Avatar from "./Avatar";
import { ArrowLeftIcon, MicIcon } from "./Icons";
import SentimentBadge from "./SentimentBadge";
import { useToast } from "./Toast";

const MAX = 1000;
const quickReplies = ["Hola, soy de coordinación. Ya te ayudo con tu consulta.", "Te confirmo ese dato y te escribo en unos minutos.", "Para inscribirte, estos son los pasos:"];

const bubble = {
  user: "self-start border border-slate-200 bg-white",
  assistant: "self-end bg-brand-soft text-ink",
  operator: "self-end bg-ink text-white",
} as const;
const roleLabel = { user: "Cliente", assistant: "Asistente IA", operator: "Tú" } as const;

export default function Transcript({ id }: { id: string }) {
  const { conversations, messages, leads, loadMessages, takeOver, resume, sendOperator, select } = useStore();
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
    } catch {
      setError("No se pudo enviar. Tu mensaje sigue aquí abajo, no se perdió. Revisa la conexión y pulsa Enviar otra vez.");
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
  const auto = (conv.paused_by ?? "").startsWith("auto");

  return (
    <section aria-label={`Chat con ${conv.contact?.name ?? "contacto"}`} className="flex h-[calc(100vh-110px)] min-h-[480px] md:h-[calc(100vh-150px)] flex-col overflow-hidden rounded-xl border bg-white">
      <header className="space-y-3 border-b p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => select(null)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Volver a la lista">
            <ArrowLeftIcon />
            Volver
          </button>
          <Avatar name={conv.contact?.name ?? null} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold leading-tight">{conv.contact?.name ?? "Sin nombre"}</h2>
            <p className="truncate text-sm text-slate-600">
              {[
                CHANNEL_LABEL[conv.contact?.channel ?? ""],
                conv.contact?.audience_type ? AUDIENCE_LABEL[conv.contact.audience_type] : "Perfil sin confirmar",
                lead?.course_title,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="hidden flex-col items-end gap-1 sm:flex">
            <SentimentBadge value={conv.sentiment} />
            {conv.stage && <span className="text-xs text-slate-600">{STAGE_LABEL[conv.stage] ?? conv.stage}</span>}
          </div>
        </div>

        {/* The one loud element: who is answering right now. */}
        {paused ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-ink px-4 py-3 text-white">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Tú tienes el control</p>
              <p className="text-sm text-white/75">
                {auto ? "La IA se pausó sola porque notó molestia. " : ""}La IA está en silencio y no responderá hasta que se la devuelvas.
              </p>
            </div>
            {confirmResume ? (
              <div className="flex items-center gap-2">
                <span className="text-sm">¿La IA vuelve a responder?</span>
                <button onClick={doResume} className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-slate-100">
                  Sí, devolver
                </button>
                <button onClick={() => setConfirmResume(false)} className="rounded-md px-3 py-1.5 text-sm text-white/80 hover:bg-white/10">
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmResume(true)} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-slate-100">
                Devolver a la IA
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-soft px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-dark">La IA está atendiendo este chat</p>
              <p className="text-sm text-slate-600">Si quieres responder tú, toma el control y la IA se detiene.</p>
            </div>
            <button onClick={doTakeOver} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Tomar el control
            </button>
          </div>
        )}

        {conv.summary && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <b>Resumen para ti: </b>
            {conv.summary}
          </p>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-paper p-4" aria-live="polite">
        {list.length === 0 && <p className="m-auto text-sm text-slate-600">Todavía no hay mensajes en este chat.</p>}
        {list.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${bubble[m.role]}`}>
            <div className={`mb-0.5 flex items-center gap-2 text-xs ${m.role === "operator" ? "text-white/70" : "text-slate-600"}`}>
              <span className="font-medium">{roleLabel[m.role]}</span>
              {m.media_type === "audio" && (
                <span className="inline-flex items-center gap-1">
                  <MicIcon className="h-3 w-3" />
                  audio transcrito
                </span>
              )}
              <span>{clock(m.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <footer className="space-y-2 border-t p-3">
        <div className="flex flex-wrap gap-1.5">
          {quickReplies.map((q) => (
            <button
              key={q}
              onClick={() => {
                setText(q);
                input.current?.focus();
              }}
              className="rounded-full border px-3 py-1 text-xs text-slate-600 hover:border-brand hover:text-brand-dark"
            >
              {q.length > 38 ? q.slice(0, 36) + "…" : q}
            </button>
          ))}
        </div>
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
            placeholder="Escribe tu respuesta"
            className="flex-1 resize-none rounded-lg border px-3 py-2 outline-none focus:border-brand"
          />
          <button
            onClick={send}
            disabled={busy || !text.trim()}
            className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Enviando..." : "Enviar"}
          </button>
        </div>
        <p className="flex justify-between text-xs text-slate-600">
          <span>{paused ? "La IA ya está en pausa." : "Al enviar, la IA se pone en pausa en este chat."} Enter envía, Shift + Enter hace un salto de línea.</span>
          {text.length > MAX - 150 && <span>{text.length}/{MAX}</span>}
        </p>
      </footer>
    </section>
  );
}
