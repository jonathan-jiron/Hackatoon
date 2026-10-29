import { initials } from "@/lib/format";

const palette = ["bg-indigo-100 text-indigo-800", "bg-teal-100 text-teal-800", "bg-rose-100 text-rose-800", "bg-amber-100 text-amber-800", "bg-sky-100 text-sky-800", "bg-violet-100 text-violet-800"];

export default function Avatar({ name, size = "md" }: { name: string | null; size?: "md" | "lg" }) {
  const color = palette[(name ?? "?").length % palette.length];
  const dim = size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-sm";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ${dim} ${color}`}>
      {initials(name)}
    </span>
  );
}
