"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (el?: HTMLElement) => void;
      };
    };
  }
}

interface TweetEmbedProps {
  url: string;
  compact?: boolean;
}

export function TweetEmbed({ url, compact }: TweetEmbedProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function loadWidgets() {
      window.twttr?.widgets.load(el ?? undefined);
    }

    if (window.twttr) {
      loadWidgets();
      return;
    }

    const existing = document.querySelector('script[src*="platform.twitter.com/widgets.js"]');
    if (existing) {
      existing.addEventListener("load", loadWidgets);
      return () => existing.removeEventListener("load", loadWidgets);
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = loadWidgets;
    document.body.appendChild(script);
  }, [url]);

  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 block truncate text-xs text-sky-500/90 hover:text-sky-400 hover:underline"
      >
        {url}
      </a>
    );
  }

  return (
    <div ref={ref} className="mt-2 max-w-full overflow-hidden rounded-lg [&_.twitter-tweet]:!m-0">
      <blockquote className="twitter-tweet" data-theme="dark" data-dnt="true">
        <a href={url} />
      </blockquote>
    </div>
  );
}
