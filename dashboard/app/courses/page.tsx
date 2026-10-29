"use client";

import { daysUntil, money, shortDate, timeAgo } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function CoursesPage() {
  const { courses, status } = useStore();
  const last = courses.map((c) => c.scraped_at).filter(Boolean).sort().at(-1);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Cursos</h1>
        <p className="text-sm text-slate-600">
          El bot solo ofrece los cursos que todavía no empiezan. Datos tomados de la página del CTT {last ? timeAgo(last) : ""}.
        </p>
      </div>

      {status !== "loading" && courses.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-600">
          <p className="font-medium text-ink">Aún no hay cursos cargados</p>
          <p className="mt-1">
            Ejecuta <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run scrape</code> dentro de la carpeta scraper y vuelve a esta página.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Lista de cursos y sus precios</caption>
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="p-3 font-medium">Curso</th>
                <th scope="col" className="p-3 font-medium">Empieza</th>
                <th scope="col" className="p-3 font-medium">Modalidad</th>
                <th scope="col" className="p-3 text-right font-medium">Estudiante UTA</th>
                <th scope="col" className="p-3 text-right font-medium">Graduado o personal</th>
                <th scope="col" className="p-3 text-right font-medium">Público</th>
                <th scope="col" className="p-3 font-medium">El bot lo ofrece</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {courses.map((c) => {
                const d = daysUntil(c.start_date);
                const offered = d !== null && d > 0;
                return (
                  <tr key={c.id}>
                    <th scope="row" className="p-3 font-medium">{c.title}</th>
                    <td className="whitespace-nowrap p-3">
                      {shortDate(c.start_date)}
                      {offered && <div className="text-xs text-slate-600">en {d} {d === 1 ? "día" : "días"}</div>}
                    </td>
                    <td className="p-3">{c.modality ?? "Sin dato"}</td>
                    <td className="p-3 text-right tabular-nums">{money(c.price_uta_student)}</td>
                    <td className="p-3 text-right tabular-nums">{money(c.price_uta_grad_staff)}</td>
                    <td className="p-3 text-right tabular-nums">{money(c.price_public)}</td>
                    <td className="whitespace-nowrap p-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${offered ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {offered ? "Sí" : "No, ya empezó"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
