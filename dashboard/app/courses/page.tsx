"use client";

import { useMemo } from "react";
import { daysUntil, money, shortDate, timeAgo } from "@/lib/format";
import { useStore } from "@/lib/store";
import { LeadStage } from "@/lib/types";

const CLOSING: LeadStage[] = ["asked_enroll", "ready_to_close", "enrolled"];

function Kpi({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-slate-600">{note}</div>
    </div>
  );
}

export default function CoursesPage() {
  const { courses, leads, status } = useStore();
  const last = courses.map((c) => c.scraped_at).filter(Boolean).sort().at(-1);

  const rows = useMemo(
    () =>
      courses.map((c) => {
        const mine = leads.filter((l) => l.course_id === c.id);
        const d = daysUntil(c.start_date);
        return { c, d, offered: d !== null && d > 0, chose: mine.length, closing: mine.filter((l) => CLOSING.includes(l.stage)).length };
      }),
    [courses, leads]
  );

  const offered = rows.filter((r) => r.offered);
  const next = offered.filter((r) => r.c.start_date).sort((a, b) => a.c.start_date!.localeCompare(b.c.start_date!))[0];
  const totalInterest = offered.reduce((n, r) => n + r.chose, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Cursos</h1>
          <p className="text-sm text-slate-600">
            {offered.length === 0
              ? "No hay cursos próximos: el bot no tiene nada que ofrecer."
              : `El bot ofrece ${offered.length} ${offered.length === 1 ? "curso" : "cursos"} que aún no ${offered.length === 1 ? "empieza" : "empiezan"}. Los que ya empezaron no se recomiendan.`}
          </p>
        </div>
        {last && <p className="text-xs text-slate-600">Tomado de la página del CTT {timeAgo(last)}</p>}
      </div>

      {status !== "loading" && courses.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-600">
          <p className="font-medium text-ink">Aún no hay cursos cargados</p>
          <p className="mt-1">
            Ejecuta <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run scrape</code> dentro de la carpeta scraper y vuelve a esta página.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 divide-y rounded-xl border bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Kpi label="Cursos que ofrece el bot" value={offered.length} note={`de ${courses.length} en la base`} />
            <Kpi
              label="Próximo inicio"
              value={next ? shortDate(next.c.start_date) : "—"}
              note={next ? `en ${next.d} ${next.d === 1 ? "día" : "días"} · ${next.c.title.split(" – ")[0]}` : "Sin cursos próximos"}
            />
            <Kpi label="Personas interesadas" value={totalInterest} note="Eligieron alguno de estos cursos" />
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <caption className="sr-only">Cursos, fechas, precios e interés</caption>
              <thead className="text-slate-600">
                <tr className="border-b">
                  <th scope="col" className="px-5 py-3 font-medium">Curso</th>
                  <th scope="col" className="px-3 py-3 font-medium">Empieza</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Estudiante UTA</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Graduado o personal</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Público</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Interesados</th>
                  <th scope="col" className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(({ c, d, offered: on, chose, closing }) => (
                  <tr key={c.id} className={on ? "" : "text-slate-600"}>
                    <th scope="row" className="max-w-[340px] px-5 py-4 font-medium">
                      <div className="truncate" title={c.title}>{c.title}</div>
                      <div className="mt-0.5 truncate text-xs font-normal text-slate-600">
                        {[c.modality, c.hours ? `${c.hours} h` : null, c.max_seats ? `${c.max_seats} cupos` : null].filter(Boolean).join(" · ")}
                      </div>
                    </th>
                    <td className="whitespace-nowrap px-3 py-4">
                      {shortDate(c.start_date)}
                      <div className="mt-0.5 text-xs text-slate-600">
                        {on ? `en ${d} ${d === 1 ? "día" : "días"}` : "ya empezó"}
                        {on && c.enrollment_end ? ` · inscripción hasta el ${new Date(c.enrollment_end).toLocaleDateString("es-EC", { day: "numeric", month: "short" })}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums">{money(c.price_uta_student)}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{money(c.price_uta_grad_staff)}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{money(c.price_public)}</td>
                    <td className="px-3 py-4 text-right tabular-nums">
                      <span className="font-semibold">{chose}</span>
                      <div className="mt-0.5 text-xs text-slate-600">{closing} quieren inscribirse</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${on ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                        {on ? "El bot lo ofrece" : "Ya empezó"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
