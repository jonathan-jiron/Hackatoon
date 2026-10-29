"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import HelpDialog from "./HelpDialog";
import { HelpIcon } from "./Icons";

const links = [
  { href: "/", label: "Conversaciones" },
  { href: "/funnel", label: "Ventas" },
  { href: "/courses", label: "Cursos" },
];

function Status() {
  const { status, updatedAt } = useStore();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  if (status === "loading") return <span className="text-sm text-slate-500">Conectando...</span>;
  if (status === "demo")
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">Datos de ejemplo</span>;
  if (status === "error")
    return <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-800">Sin conexión</span>;

  const secs = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt.getTime()) / 1000)) : 0;
  return (
    <span
      className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800"
      title="Los chats se actualizan solos, no necesitas recargar la página."
    >
      <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      En vivo
      <span className="hidden text-emerald-700/70 sm:inline">· actualizado hace {secs < 60 ? `${secs} s` : `${Math.floor(secs / 60)} min`}</span>
    </span>
  );
}

/** Heuristic 9: say what happened and what to do about it, in plain words. */
function Banner() {
  const { status } = useStore();
  if (status === "error")
    return (
      <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-900">
        No pudimos leer los datos. Seguimos intentando solo. Si sigue así, revisa que la base esté encendida con{" "}
        <code className="rounded bg-white px-1.5 py-0.5">docker compose up -d db</code>.
      </div>
    );
  if (status === "demo")
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900">
        Estás viendo datos de ejemplo porque no hay una base conectada. Nada de lo que hagas aquí se guarda.
      </div>
    );
  return null;
}

export default function Nav() {
  const path = usePathname();
  const { conversations } = useStore();
  const [help, setHelp] = useState(false);
  const attention = conversations.filter((c) => c.sentiment === "hot_lead" || c.sentiment === "frustrated").length;

  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="leading-tight">
            <div className="font-semibold text-brand-dark">CTT FISEI</div>
            <div className="text-xs text-slate-500">Panel de ventas</div>
          </div>
          <nav aria-label="Secciones" className="flex gap-1 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={path === l.href ? "page" : undefined}
                className={`rounded-lg px-3 py-2 font-medium ${path === l.href ? "bg-brand-soft text-brand-dark" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {attention > 0 && (
              <span className="hidden rounded-full bg-fuchsia-50 px-3 py-1 text-sm font-medium text-fuchsia-800 md:inline">
                {attention} {attention === 1 ? "chat necesita" : "chats necesitan"} atención
              </span>
            )}
            <Status />
            <button
              onClick={() => setHelp(true)}
              aria-label="Abrir ayuda"
              className="grid h-9 w-9 place-items-center rounded-full border text-slate-600 hover:bg-slate-100"
            >
              <HelpIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      <Banner />
      <HelpDialog open={help} onClose={() => setHelp(false)} />
    </>
  );
}
