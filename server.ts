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
    console.log(`[giphy] CACHE HIT  "${q}"`);
    return c.json({ cached: true, ...(cached.data as object) });
  }
  console.log(`[giphy] MISS       "${q}" → upstream`);

  const url = new URL("https://api.giphy.com/v1/gifs/search");
  url.searchParams.set("api_key", key);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", limit);
  url.searchParams.set("rating", "pg-13");

  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text();
    console.log(`[giphy] UPSTREAM ERR "${q}" → ${r.status} ${body.slice(0, 120)}`);
    return c.json({ error: "upstream", status: r.status, body }, 500);
  }
  const json = (await r.json()) as { data: any[]; meta: unknown; pagination: unknown };
  console.log(`[giphy] OK         "${q}" → ${json.data?.length ?? 0} items`);

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
// Brave Free plan allows 1 req/s. We serialize calls to upstream with ~1.2s
// spacing so rapid-fire agent calls don't pile up into 429s. Cache hits skip
// the queue entirely.
const braveCache = new Map<string, { at: number; data: unknown }>();
const BRAVE_TTL_MS = 1000 * 60 * 10;
const BRAVE_SPACING_MS = 1200;
let braveChain: Promise<void> = Promise.resolve();
let braveLastAt = 0;

function queueBraveSlot(): Promise<void> {
  const prev = braveChain;
  braveChain = prev.then(async () => {
    const wait = Math.max(0, braveLastAt + BRAVE_SPACING_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    braveLastAt = Date.now();
  });
  return braveChain;
}

app.get("/api/brave/images", async (c) => {
  const q = c.req.query("q")?.trim();
  const count = c.req.query("count") ?? "20";
  if (!q) return c.json({ error: "missing q" }, 400);

  const key = process.env.BRAVE_API_KEY;
  if (!key) return c.json({ error: "BRAVE_API_KEY not set" }, 500);

  const cacheKey = `${q}:${count}`;
  const cached = braveCache.get(cacheKey);
  if (cached && Date.now() - cached.at < BRAVE_TTL_MS) {
    console.log(`[brave] CACHE HIT  "${q}"`);
    return c.json({ cached: true, ...(cached.data as object) });
  }
  console.log(`[brave] MISS       "${q}" → upstream (queued)`);

  const url = new URL("https://api.search.brave.com/res/v1/images/search");
  url.searchParams.set("q", q);
  url.searchParams.set("count", count);
  url.searchParams.set("safesearch", "strict");
  const headers = {
    Accept: "application/json",
    "X-Subscription-Token": key,
  };

  await queueBraveSlot();
  let r = await fetch(url, { headers });
  if (r.status === 429) {
    console.log(`[brave] 429        "${q}" → retrying after spacing`);
    await new Promise((res) => setTimeout(res, BRAVE_SPACING_MS));
    braveLastAt = Date.now();
    r = await fetch(url, { headers });
  }
  if (!r.ok) {
    const body = await r.text();
    console.log(`[brave] UPSTREAM ERR "${q}" → ${r.status} ${body.slice(0, 120)}`);
    return c.json({ error: "upstream", status: r.status, body }, 500);
  }
  const json = (await r.json()) as { results?: any[] };
  console.log(`[brave] OK         "${q}" → ${json.results?.length ?? 0} items`);

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
