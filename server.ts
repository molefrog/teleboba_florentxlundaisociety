import { Hono } from "hono";

const app = new Hono();

// ---------- GIPHY ----------
// Tiny in-memory LRU-ish cache so rapid repeat queries don't burn quota.
const giphyCache = new Map<string, { at: number; data: unknown }>();
const GIPHY_TTL_MS = 1000 * 60 * 10;

app.get("/api/giphy", async (c) => {
  const q = c.req.query("q")?.trim();
  const limit = c.req.query("limit") ?? "9";
  if (!q) return c.json({ error: "missing q" }, 400);

  const key = process.env.GIPHY_API_KEY;
  if (!key) return c.json({ error: "GIPHY_API_KEY not set" }, 500);

  const cacheKey = `${q}:${limit}`;
  const cached = giphyCache.get(cacheKey);
  if (cached && Date.now() - cached.at < GIPHY_TTL_MS) {
    return c.json({ cached: true, ...(cached.data as object) });
  }

  const url = new URL("https://api.giphy.com/v1/gifs/search");
  url.searchParams.set("api_key", key);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", limit);
  url.searchParams.set("rating", "pg-13");

  const r = await fetch(url);
  if (!r.ok) return c.json({ error: "upstream", status: r.status, body: await r.text() }, 500);
  const json = (await r.json()) as { data: any[]; meta: unknown; pagination: unknown };

  const normalized = {
    query: q,
    items: json.data.map((g) => ({
      id: g.id,
      title: g.title,
      url: g.url,
      mp4: g.images?.original?.mp4,
      webp: g.images?.original?.webp,
      gif: g.images?.original?.url,
      preview_mp4: g.images?.preview?.mp4 ?? g.images?.fixed_height_small?.mp4,
      width: Number(g.images?.original?.width ?? 0),
      height: Number(g.images?.original?.height ?? 0),
    })),
  };
  giphyCache.set(cacheKey, { at: Date.now(), data: normalized });
  return c.json({ cached: false, ...normalized });
});

// ---------- BRAVE IMAGE SEARCH ----------
const braveCache = new Map<string, { at: number; data: unknown }>();
const BRAVE_TTL_MS = 1000 * 60 * 10;

app.get("/api/brave/images", async (c) => {
  const q = c.req.query("q")?.trim();
  const count = c.req.query("count") ?? "20";
  if (!q) return c.json({ error: "missing q" }, 400);

  const key = process.env.BRAVE_API_KEY;
  if (!key) return c.json({ error: "BRAVE_API_KEY not set" }, 500);

  const cacheKey = `${q}:${count}`;
  const cached = braveCache.get(cacheKey);
  if (cached && Date.now() - cached.at < BRAVE_TTL_MS) {
    return c.json({ cached: true, ...(cached.data as object) });
  }

  const url = new URL("https://api.search.brave.com/res/v1/images/search");
  url.searchParams.set("q", q);
  url.searchParams.set("count", count);
  url.searchParams.set("safesearch", "strict");

  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": key,
    },
  });
  if (!r.ok) return c.json({ error: "upstream", status: r.status, body: await r.text() }, 500);
  const json = (await r.json()) as { results?: any[] };

  const normalized = {
    query: q,
    items: (json.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      source: r.source,
      page: r.properties?.url ?? r.url,
      image: r.properties?.url,
      thumbnail: r.thumbnail?.src,
      width: r.properties?.width ?? 0,
      height: r.properties?.height ?? 0,
    })),
  };
  braveCache.set(cacheKey, { at: Date.now(), data: normalized });
  return c.json({ cached: false, ...normalized });
});

app.post("/api/token", async (c) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return c.json({ error: "OPENAI_API_KEY not set" }, 500);

  const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: "gpt-realtime-1.5",
      },
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    return c.json({ error: "upstream", status: r.status, body: text }, 500);
  }
  return c.json(await r.json());
});

export default { port: 8787, fetch: app.fetch };
