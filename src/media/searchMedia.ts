// Thin client wrapper over /api/giphy and /api/brave/images. Returns the
// first usable result for a query. Tiny in-memory LRU so the agent can
// call set_background({query:"tokyo"}) twice in a row without thrash.

export interface ResolvedMedia {
  kind: "image" | "video";
  url: string;
}

const cache = new Map<string, ResolvedMedia>();
const MAX = 32;

function cacheKey(type: "gif" | "image", query: string) {
  return `${type}:${query.trim().toLowerCase()}`;
}

function remember(key: string, value: ResolvedMedia) {
  if (cache.size >= MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, value);
}

export async function searchMedia({
  type,
  query,
}: {
  type: "gif" | "image";
  query: string;
}): Promise<ResolvedMedia | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const key = cacheKey(type, trimmed);
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    if (type === "gif") {
      const r = await fetch(
        `/api/giphy?q=${encodeURIComponent(trimmed)}&limit=5`,
      );
      if (!r.ok) return null;
      const j = await r.json();
      const first = (j.items ?? []).find(
        (i: { mp4?: string }) => !!i.mp4,
      ) as { mp4?: string } | undefined;
      if (!first?.mp4) return null;
      const resolved: ResolvedMedia = { kind: "video", url: first.mp4 };
      remember(key, resolved);
      return resolved;
    }

    const r = await fetch(
      `/api/brave/images?q=${encodeURIComponent(trimmed)}&count=10`,
    );
    if (!r.ok) return null;
    const j = await r.json();
    const first = (j.items ?? []).find(
      (i: { image?: string }) => !!i.image,
    ) as { image?: string } | undefined;
    if (!first?.image) return null;
    const resolved: ResolvedMedia = { kind: "image", url: first.image };
    remember(key, resolved);
    return resolved;
  } catch {
    return null;
  }
}
