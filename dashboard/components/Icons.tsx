import { Sentiment } from "@/lib/types";

type IconProps = { className?: string };

/** Same stroke style for every icon, so the set reads as one family (heuristic 4). */
function Svg({ className = "h-4 w-4", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export const SmileIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <path d="M9 9.5h.01M15 9.5h.01" />
  </Svg>
);

export const FrownIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
    <path d="M9 9.5h.01M15 9.5h.01" />
  </Svg>
);

export const QuestionIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8" />
    <path d="M12 17h.01" />
  </Svg>
);

export const FlameIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </Svg>
);

export const MicIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5 10.5v.5a7 7 0 0 0 14 0v-.5M12 18v3.5" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);

export const HelpIcon = (p: IconProps) => <QuestionIcon {...p} />;

const bySentiment: Record<Sentiment, (p: IconProps) => JSX.Element> = {
  interested: SmileIcon,
  doubtful: QuestionIcon,
  frustrated: FrownIcon,
  hot_lead: FlameIcon,
};

export function SentimentIcon({ value, className }: { value: Sentiment } & IconProps) {
  const Icon = bySentiment[value];
  return <Icon className={className} />;
}
