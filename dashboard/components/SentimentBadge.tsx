import { SENTIMENT_META } from "@/lib/format";
import { Sentiment } from "@/lib/types";
import { SentimentIcon } from "./Icons";

export default function SentimentBadge({ value }: { value: Sentiment }) {
  const m = SENTIMENT_META[value];
  return (
    <span title={m.hint} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${m.bg} ${m.text}`}>
      <SentimentIcon value={value} className="h-3.5 w-3.5" />
      {m.label}
    </span>
  );
}

/** Thin thermometer. It is decoration for scanning; the label and icon carry the meaning. */
export function Thermometer({ value }: { value: Sentiment }) {
  const m = SENTIMENT_META[value];
  return (
    <div aria-hidden className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all duration-500 ${m.bar}`} />
    </div>
  );
}
