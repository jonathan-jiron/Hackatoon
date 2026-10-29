"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";
import { STAGE_LABEL, timeAgo } from "@/lib/format";
import { useStore } from "@/lib/store";
import { LeadStage } from "@/lib/types";

const RANK: Record<LeadStage, number> = { new: 0, interested: 1, asked_price: 2, asked_enroll: 3, ready_to_close: 4, enrolled: 5, lost: -1 };
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
const dayKey = (d: Date) => d.toLocaleDateString("en-CA");

/** Round the top of an integer axis so it lands on 4-5 even steps. */
function axis(max: number) {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : 10;
  const top = Math.max(4 * step, Math.ceil(max / step) * step);
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
}

function Kpi({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-slate-600">{note}</div>
    </div>
  );
}

function DailyBars({ days }: { days: { label: string; wrote: number; bought: number }[] }) {
  const W = 560, H = 190, L = 28, B = 24, T = 8;
  const { top, ticks } = axis(Math.max(0, ...days.flatMap((d) => [d.wrote, d.bought])));
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const slot = (W - L) / days.length;
  const bw = Math.min(18, slot / 3);
  const summary = days.map((d) => `${d.label}: ${d.wrote} escribieron, ${d.bought} compraron`).join("; ");
  return (
    <svg role="img" aria-label={summary} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="#e5e5e5" strokeWidth={t === 0 ? 1.5 : 1} />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5f6368">{t}</text>
        </g>
      ))}
      {days.map((d, i) => {
        const cx = L + slot * i + slot / 2;
        return (
          <g key={d.label}>
            <rect x={cx - bw - 1} y={y(d.wrote)} width={bw} height={y(0) - y(d.wrote)} fill="#3355E8" />
            <rect x={cx + 1} y={y(d.bought)} width={bw} height={y(0) - y(d.bought)} fill="#1E2433" />
            <text x={cx} y={H - 7} textAnchor="middle" fontSize="11" fill="#5f6368">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function SalesPage() {
  const { leads, conversations, select, markEnrolled } = useStore();
  const router = useRouter();
  const toast = useToast();

  const m = useMemo(() => {
    // One person = one contact; their furthest lead decides where they stand.
    const spamIds = new Set(conversations.filter((c) => c.sentiment === "spam").map((c) => c.contact_id));
    const people = new Map(conversations.filter((c) => c.sentiment !== "spam").map((c) => [c.contact_id, c]));
    const best = new Map<string, number>();
    for (const l of leads) {
      if (!people.has(l.contact_id)) continue;
      const r = RANK[l.stage];
      best.set(l.contact_id, Math.max(best.get(l.contact_id) ?? -2, r));
    }
    const atLeast = (n: number) => [...best.values()].filter((r) => r >= n).length;
    const wrote = people.size;
    const chose = atLeast(1);
    const asked = atLeast(2);
    const wants = atLeast(3);
    const enrolled = atLeast(5);
    const lost = [...best.values()].filter((r) => r === -1).length;
    const spam = spamIds.size;
    const closing = [...people.keys()].filter((id) => (best.get(id) ?? 0) === 3 || best.get(id) === 4).length;

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const series = days.map((d) => {
      const k = dayKey(d);
      return {
        label: d.toLocaleDateString("es-EC", { weekday: "short", day: "numeric" }).replace(".", ""),
        wrote: [...people.values()].filter((c) => c.first_message_at && dayKey(new Date(c.first_message_at)) === k).length,
        bought: leads.filter((l) => l.stage === "enrolled" && dayKey(new Date(l.updated_at)) === k).length,
      };
    });

    return {
      wrote, chose, asked, wants, enrolled, lost, spam, closing, series,
      talking: Math.max(0, wrote - enrolled - closing - lost),
      funnel: [
        { label: "Escribieron", n: wrote },
        { label: "Eligieron un curso", n: chose },
        { label: "Preguntaron el precio", n: asked },
        { label: "Quieren inscribirse", n: wants },
        { label: "Se inscribieron", n: enrolled },
      ],
    };
  }, [leads, conversations]);

  const close = useMemo(
    () => leads.filter((l) => l.stage === "asked_enroll" || l.stage === "ready_to_close").sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [leads]
  );

  const balance = [
    { label: "Se inscribieron", n: m.enrolled, bar: "bg-ink" },
    { label: "Quieren inscribirse", n: m.closing, bar: "bg-brand" },
    { label: "Siguen conversando", n: m.talking, bar: "bg-slate-300" },
    { label: "Se perdieron", n: m.lost, bar: "bg-slate-200" },
  ];
  const total = m.wrote + m.spam;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Ventas</h1>
        <p className="text-sm text-slate-600">
          {m.wrote === 0
            ? "Todavía nadie ha escrito. Cuando alguien lo haga, verás aquí cómo avanza hasta inscribirse."
            : `${m.wrote} ${m.wrote === 1 ? "persona escribió" : "personas escribieron"}, ${m.wants} ${m.wants === 1 ? "quiere" : "quieren"} inscribirse y ${m.enrolled} ya ${m.enrolled === 1 ? "se inscribió" : "se inscribieron"}.${m.spam ? ` Hay ${m.spam} fuera de tema que no cuentan.` : ""}`}
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y rounded-xl border bg-white lg:grid-cols-5 lg:divide-y-0 [&>*]:border-slate-200">
        <Kpi label="Escribieron" value={m.wrote} note="Personas distintas, sin fuera de tema" />
        <Kpi label="Eligieron un curso" value={m.chose} note={`${pct(m.chose, m.wrote)}% de quienes escribieron`} />
        <Kpi label="Quieren inscribirse" value={m.wants} note={`${pct(m.wants, m.wrote)}% de quienes escribieron`} />
        <Kpi label="Se inscribieron" value={m.enrolled} note={`${pct(m.enrolled, m.wrote)}% de quienes escribieron`} />
        <Kpi label="Fuera de tema" value={m.spam} note="No cuentan como interés" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">De escribir a inscribirse</h2>
          <p className="mb-4 text-sm text-slate-600">Cuántas personas llegan a cada paso.</p>
          <ol className="space-y-3">
            {m.funnel.map((s, i) => (
              <li key={s.label} className="grid grid-cols-[9.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 text-sm">
                <span className="text-slate-700">{s.label}</span>
                <div className="h-6 rounded bg-slate-100">
                  <div className={`h-6 rounded ${i === m.funnel.length - 1 ? "bg-ink" : "bg-brand"} transition-all duration-500`} style={{ width: `${pct(s.n, m.wrote)}%`, opacity: 1 - i * 0.12 }} />
                </div>
                <span className="text-right tabular-nums">
                  <b className="font-semibold">{s.n}</b> <span className="text-slate-600">· {pct(s.n, m.wrote)}%</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Dónde está cada persona</h2>
          <p className="mb-4 text-sm text-slate-600">Quienes escriben frente a quienes compran.</p>
          <div role="img" aria-label={balance.map((b) => `${b.label}: ${b.n}`).join(", ")} className="flex h-6 w-full gap-0.5 overflow-hidden rounded bg-slate-100">
            {balance.filter((b) => b.n > 0).map((b) => (
              <div key={b.label} className={b.bar} style={{ width: `${pct(b.n, m.wrote)}%` }} />
            ))}
          </div>
          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">Personas por situación</caption>
            <tbody className="divide-y">
              {balance.map((b) => (
                <tr key={b.label}>
                  <td className="py-2">
                    <span aria-hidden className={`mr-2 inline-block h-2.5 w-2.5 rounded-sm ${b.bar}`} />
                    {b.label}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums">{b.n}</td>
                  <td className="w-14 py-2 text-right tabular-nums text-slate-600">{pct(b.n, m.wrote)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 0 && m.spam > 0 && <p className="mt-3 text-xs text-slate-600">Aparte: {m.spam} fuera de tema, un {pct(m.spam, total)}% de todos los chats.</p>}
        </section>

        <section className="rounded-xl border bg-white p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-semibold">Últimos 7 días</h2>
              <p className="text-sm text-slate-600">Quién escribe cada día y quién compra.</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span><span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-brand" />Escriben</span>
              <span><span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-ink" />Compran</span>
            </div>
          </div>
          <DailyBars days={m.series} />
        </section>

        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Listos para cerrar</h2>
          <p className="mb-3 text-sm text-slate-600">Ya registraron su interés. Conviene escribirles pronto.</p>
          {close.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Por ahora nadie está en esta etapa.</p>}
          <ul className="divide-y">
            {close.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <Avatar name={l.contact_name ?? null} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{l.contact_name ?? "Sin nombre"}</div>
                  <div className="truncate text-sm text-slate-600">
                    {l.course_title ?? "Curso por definir"} · {STAGE_LABEL[l.stage]} · {timeAgo(l.updated_at)}
                  </div>
                </div>
                {l.conversation_id && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => {
                        select(l.conversation_id!);
                        router.push("/");
                      }}
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                    >
                      Abrir chat
                    </button>
                    <button
                      onClick={async () => {
                        await markEnrolled(l.conversation_id!);
                        toast("Venta registrada.");
                      }}
                      className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                    >
                      Inscrito
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
