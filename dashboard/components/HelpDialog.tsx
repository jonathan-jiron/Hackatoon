"use client";

import { useEffect, useRef } from "react";
import { SENTIMENT_META, SENTIMENT_ORDER, STAGE_HINT, STAGE_LABEL } from "@/lib/format";
import { LEAD_STAGES } from "@/lib/types";
import { CloseIcon, SentimentIcon } from "./Icons";

const shortcuts: [string, string][] = [
  ["/", "Buscar un chat"],
  ["↑  ↓", "Pasar al chat anterior o siguiente"],
  ["Enter", "Enviar el mensaje"],
  ["Shift + Enter", "Salto de línea"],
  ["Esc", "Cerrar el chat o esta ayuda"],
];

/** Heuristic 10: help that is short, searchable by eye, and tied to what the person sees. */
export default function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Ayuda"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cómo leer este panel</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100" aria-label="Cerrar ayuda">
            <CloseIcon />
          </button>
        </div>

        <section className="mb-5">
          <h3 className="mb-2 font-medium">Quién responde</h3>
          <p className="text-sm text-slate-600">
            Cada chat lo atiende la <b>IA</b> o <b>una persona</b>. Si escribes tú, la IA se pone en pausa sola. Para que vuelva a responder, pulsa
            Devolver a la IA.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="mb-2 font-medium">Ánimo de la persona</h3>
          <ul className="space-y-1.5 text-sm">
            {SENTIMENT_ORDER.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${SENTIMENT_META[s].bg} ${SENTIMENT_META[s].text}`}>
                  <SentimentIcon value={s} className="h-3.5 w-3.5" />
                  {SENTIMENT_META[s].label}
                </span>
                <span className="text-slate-600">{SENTIMENT_META[s].hint}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-5">
          <h3 className="mb-2 font-medium">Etapas de una venta</h3>
          <ol className="space-y-1 text-sm text-slate-600">
            {LEAD_STAGES.map((s) => (
              <li key={s}>
                <b className="text-ink">{STAGE_LABEL[s]}.</b> {STAGE_HINT[s]}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="mb-2 font-medium">Atajos de teclado</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {shortcuts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt>
                  <kbd className="rounded border bg-slate-50 px-1.5 py-0.5 text-xs">{k}</kbd>
                </dt>
                <dd className="text-slate-600">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
