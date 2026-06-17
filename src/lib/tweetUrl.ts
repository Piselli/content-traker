const STATUS_RE = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i;

export function extractTweetId(url: string): string | null {
  const match = url.trim().match(STATUS_RE);
  return match?.[1] ?? null;
}

export function normalizeTweetUrl(url: string): string | undefined {
  const id = extractTweetId(url);
  if (!id) return undefined;
  return `https://x.com/i/status/${id}`;
}

export function tweetUrlsMatch(a: string, b: string): boolean {
  const idA = extractTweetId(a);
  const idB = extractTweetId(b);
  return idA != null && idA === idB;
}
