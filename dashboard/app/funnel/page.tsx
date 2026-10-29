"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { STAGE_HINT, STAGE_LABEL, timeAgo } from "@/lib/format";
import { useStore } from "@/lib/store";
import { LEAD_STAGES } from "@/lib/types";
import Avatar from "@/components/Avatar";

function Stat({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{hint}</div>
    </div>
  );
}

export default function SalesPage() {
  const { leads, conversations, select } = useStore();
  const router = useRouter();

  const byStage = useMemo(() => LEAD_STAGES.map((s) => ({ stage: s, count: leads.filter((l) => l.stage === s).length })), [leads]);
  const max = Math.max(1, ...byStage.map((b) => b.count));

  const close = useMemo(
    () => leads.filter((l) => l.stage === "asked_enroll" || l.stage === "ready_to_close").sort((a, b) => b.score - a.score),
    [leads]
  );

  const withPerson = conversations.filter((c) => c.ai_paused).length;
  const enrolled = leads.filter((l) => l.stage === "enrolled").length;
  const rate = leads.length ? Math.round((enrolled / leads.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Ventas</h1>
        <p className="text-sm text-slate-600">Cómo avanzan las personas interesadas, desde su primera consulta hasta la inscripción.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Chats abiertos" value={conversations.length} hint="Personas que han escrito" />
        <Stat label="Interesados en un curso" value={leads.length} hint="Ya eligieron un curso" />
        <Stat label="Atendidos por una persona" value={withPerson} hint="La IA está en pausa" />
        <Stat label="Inscritos" value={enrolled} hint={`${rate}% de los interesados`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Etapas de la venta</h2>
          <p className="mb-4 text-sm text-slate-600">Pasa el cursor por una etapa para ver qué significa.</p>
          {leads.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Todavía no hay interesados. Aparecerán cuando el bot detecte a quién le interesa un curso.</p>
          ) : (
            <ul className="space-y-2.5">
              {byStage.map((b) => (
                <li key={b.stage} title={STAGE_HINT[b.stage]} className="flex items-center gap-3 text-sm">
                  <span className="w-44 shrink-0 text-slate-700">{STAGE_LABEL[b.stage]}</span>
                  <div className="h-5 flex-1 rounded bg-slate-100">
                    <div className={`h-5 rounded transition-all duration-500 ${b.stage === "lost" ? "bg-slate-400" : "bg-brand"}`} style={{ width: `${(b.count / max) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right font-semibold tabular-nums">{b.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Listos para cerrar</h2>
          <p className="mb-4 text-sm text-slate-600">Ya preguntaron cómo inscribirse. Conviene escribirles pronto.</p>
          {close.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Por ahora nadie está en esta etapa.</p>}
          <ul className="divide-y">
            {close.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <Avatar name={l.contact_name ?? null} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{l.contact_name ?? "Sin nombre"}</div>
                  <div className="truncate text-sm text-slate-500">
                    {l.course_title ?? "Curso por definir"} · {STAGE_LABEL[l.stage]} · {timeAgo(l.updated_at)}
                  </div>
                </div>
                {l.conversation_id && (
                  <button
                    onClick={() => {
                      select(l.conversation_id!);
                      router.push("/");
                    }}
                    className="shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                  >
                    Abrir chat
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
