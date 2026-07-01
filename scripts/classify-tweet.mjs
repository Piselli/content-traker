/**
 * Heuristic tweet classification for auto-sync (no LLM, $0).
 */

const CONTENT_TYPES = [
  "hot topic",
  "meme",
  "useful",
  "bait",
  "provocative",
  "strategic QT",
  "builder",
  "meta reach",
];

export function inferVisualCluster(text, type) {
  const n = (text ?? "").toLowerCase();
  if (/scorecard|fake.*score|5-0|manifesting/.test(n)) return "scorecard";
  if (/collage|chalkboard|list.*collage/.test(n)) return "collage";
  if (/chart|heatmap|p\/l|line chart/.test(n)) return "chart";
  if (/screenshot|pm screenshot|squad|4-3-3|formation|fake phone|toast/.test(n))
    return "screenshot";
  if (/pawn stars|greentext|homelander|punisher|fake polymarket|mock/.test(n))
    return "meme";
  if (type === "meme") return "meme";
  return "text-only";
}

export function inferBucket(text, type) {
  const n = (text ?? "").toLowerCase();
  if (/movematch|chicharito|squad|md\d|formation|4-3-3/.test(n)) return "football";
  if (/ronaldo|messi|wc |world cup|football|france|portugal|pm on/.test(n))
    return "football";
  if (type === "builder") return "football";
  if (type === "meme") return "CT";
  return "CT";
}

export function classifyTweetText(text) {
  const t = (text ?? "").toLowerCase();

  if (/movematch|chicharito|building @movematch|md\d squad/.test(t)) {
    return { type: "builder", traits: [], bucket: "football" };
  }
  if (/algorithm dead|reach is dead|impressions|notification|producers vs consumers|meta reach/.test(t)) {
    return { type: "meta reach", traits: [], bucket: "CT" };
  }
  if (/pick one|poll|yes or no|what did i miss|a\/b\/c\/d|tell me where/.test(t)) {
    return { type: "bait", traits: ["hot topic"], bucket: "CT" };
  }
  if (/pawn stars|greentext|generational wealth|stick.figure|meme template/.test(t)) {
    return { type: "meme", traits: [], bucket: "CT" };
  }
  if (/i went through|teardown|framework|here's the case|sources:/.test(t)) {
    return { type: "useful", traits: [], bucket: "CT" };
  }
  if (/everyone says|contrarian|tell me where i'm wrong|sharp debatable/.test(t)) {
    return { type: "provocative", traits: [], bucket: "CT" };
  }
  if (t.startsWith("rt @") || /^@\w+/.test(t)) {
    return { type: "strategic QT", traits: ["hot topic"], bucket: "CT" };
  }

  return { type: "hot topic", traits: [], bucket: "CT" };
}

export function classifySyncedTweet(text) {
  const { type, traits, bucket } = classifyTweetText(text);
  const visualCluster = inferVisualCluster(text, type);
  return {
    type,
    traits: traits.length ? traits : undefined,
    bucket: bucket ?? inferBucket(text, type),
    visualCluster,
    classificationPending: false,
  };
}
