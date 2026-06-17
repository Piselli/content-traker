import type { ContentType } from "@/lib/types";

export const TYPE_STYLES: Record<
  ContentType,
  { accent: string; dot: string; glow: string }
> = {
  "hot topic": {
    accent: "text-orange-400",
    dot: "bg-orange-400",
    glow: "hover:border-orange-500/40",
  },
  meme: {
    accent: "text-yellow-400",
    dot: "bg-yellow-400",
    glow: "hover:border-yellow-500/40",
  },
  useful: {
    accent: "text-sky-400",
    dot: "bg-sky-400",
    glow: "hover:border-sky-500/40",
  },
  bait: {
    accent: "text-pink-400",
    dot: "bg-pink-400",
    glow: "hover:border-pink-500/40",
  },
  provocative: {
    accent: "text-red-400",
    dot: "bg-red-400",
    glow: "hover:border-red-500/40",
  },
  "strategic QT": {
    accent: "text-violet-400",
    dot: "bg-violet-400",
    glow: "hover:border-violet-500/40",
  },
  builder: {
    accent: "text-emerald-400",
    dot: "bg-emerald-400",
    glow: "hover:border-emerald-500/40",
  },
  "meta reach": {
    accent: "text-zinc-400",
    dot: "bg-zinc-400",
    glow: "hover:border-zinc-500/40",
  },
};
