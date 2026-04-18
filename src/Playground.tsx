import { useState } from "react";
import { cn } from "./lib/cn";
import { Boba, BOBA_STATES, type BobaState } from "./boba";

interface GiphyItem {
  id: string;
  title: string;
  url: string;
  mp4?: string;
  webp?: string;
  gif?: string;
  preview_mp4?: string;
  width: number;
  height: number;
}

interface BraveImage {
  title: string;
  url: string;
  source: string;
  page: string;
  image?: string;
  thumbnail?: string;
  width: number;
  height: number;
}

export function Playground() {
  const [query, setQuery] = useState("react hooks");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<GiphyItem[]>([]);
  const [cached, setCached] = useState<boolean | null>(null);
  const [format, setFormat] = useState<"mp4" | "webp" | "gif">("mp4");

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch(`/api/giphy?q=${encodeURIComponent(query)}&limit=12`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? "request failed");
      setItems(j.items ?? []);
      setCached(!!j.cached);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const [braveQuery, setBraveQuery] = useState("blade runner cityscape");
  const [braveLoading, setBraveLoading] = useState(false);
  const [braveError, setBraveError] = useState("");
  const [braveItems, setBraveItems] = useState<BraveImage[]>([]);
  const [braveCached, setBraveCached] = useState<boolean | null>(null);

  const runBrave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBraveError("");
    setBraveLoading(true);
    try {
      const r = await fetch(`/api/brave/images?q=${encodeURIComponent(braveQuery)}&count=20`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? "request failed");
      setBraveItems(j.items ?? []);
      setBraveCached(!!j.cached);
    } catch (err) {
      setBraveError(err instanceof Error ? err.message : String(err));
    } finally {
      setBraveLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-bg px-12 py-8 text-fg">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">playground</h1>
        <a href="/" className="text-sm text-mute hover:text-fg">
          ← teleprompter
        </a>
      </header>

      <section className="rounded-xl border border-[#F1ECE214] bg-card p-6">
        <h2 className="mb-4 text-sm font-medium text-fg-soft">GIPHY search</h2>

        <form onSubmit={run} className="mb-4 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="query"
            className="flex-1 rounded border border-[#F1ECE214] bg-card-2 px-3 py-2 text-fg placeholder:text-mute focus:border-fg focus:outline-none"
          />
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
            className="rounded border border-[#F1ECE214] bg-card-2 px-3 py-2 text-fg focus:border-fg focus:outline-none"
          >
            <option value="mp4">mp4</option>
            <option value="webp">webp</option>
            <option value="gif">gif</option>
          </select>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="cursor-pointer rounded bg-fg px-6 py-2 text-sm font-medium tracking-wider text-bg lowercase hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "…" : "search"}
          </button>
        </form>

        {cached !== null && (
          <div className="mb-3 text-sm text-mute">
            {items.length} result{items.length === 1 ? "" : "s"} ·{" "}
            {cached ? "cached" : "fresh"}
          </div>
        )}
        {error && <div className="mb-3 text-sm text-accent">{error}</div>}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {items.map((item) => (
            <figure
              key={item.id}
              className="m-0 flex flex-col overflow-hidden rounded border border-[#F1ECE214] bg-card-2"
            >
              {format === "mp4" && item.mp4 ? (
                <video src={item.mp4} autoPlay loop muted playsInline className="block h-44 w-full object-cover" />
              ) : format === "webp" && item.webp ? (
                <img src={item.webp} alt={item.title} className="block h-44 w-full object-cover" />
              ) : item.gif ? (
                <img src={item.gif} alt={item.title} className="block h-44 w-full object-cover" />
              ) : (
                <div className="grid h-44 place-items-center text-sm text-mute">
                  no {format}
                </div>
              )}
              <figcaption className="overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 text-xs text-mute">
                {item.title || "—"}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-[#F1ECE214] bg-card p-6">
        <h2 className="mb-4 text-sm font-medium text-fg-soft">Brave image search</h2>

        <form onSubmit={runBrave} className="mb-4 flex gap-2">
          <input
            type="text"
            value={braveQuery}
            onChange={(e) => setBraveQuery(e.target.value)}
            placeholder="query"
            className="flex-1 rounded border border-[#F1ECE214] bg-card-2 px-3 py-2 text-fg placeholder:text-mute focus:border-fg focus:outline-none"
          />
          <button
            type="submit"
            disabled={braveLoading || !braveQuery.trim()}
            className="cursor-pointer rounded bg-fg px-6 py-2 text-sm font-medium tracking-wider text-bg lowercase hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {braveLoading ? "…" : "search"}
          </button>
        </form>

        {braveCached !== null && (
          <div className="mb-3 text-sm text-mute">
            {braveItems.length} result{braveItems.length === 1 ? "" : "s"} ·{" "}
            {braveCached ? "cached" : "fresh"}
          </div>
        )}
        {braveError && <div className="mb-3 text-sm text-accent">{braveError}</div>}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {braveItems.map((item) => (
            <a
              key={item.page + item.thumbnail}
              href={item.page}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col overflow-hidden rounded border border-[#F1ECE214] bg-card-2 hover:border-fg"
            >
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="block h-44 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="grid h-44 place-items-center text-sm text-mute">no image</div>
              )}
              <div className="px-3 py-2">
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-fg">
                  {item.title || "—"}
                </div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-mute">
                  {item.source}
                  {item.width > 0 ? ` · ${item.width}×${item.height}` : ""}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <BobaSection />
    </div>
  );
}

function BobaSection() {
  const [state, setState] = useState<BobaState>("sleeping");
  return (
    <section className="mt-6 rounded-xl border border-[#F1ECE214] bg-card p-6">
      <h2 className="mb-4 text-sm font-medium text-fg-soft">Boba character</h2>

      <div className="mb-4 flex flex-wrap gap-2">
        {BOBA_STATES.map((s) => (
          <button
            key={s}
            onClick={() => setState(s)}
            className={cn(
              "cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium lowercase transition-colors",
              state === s
                ? "border-accent bg-accent text-fg"
                : "border-[#F1ECE214] bg-card-2 text-fg/70 hover:border-fg/40 hover:text-fg",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid place-items-center rounded-lg border border-[#F1ECE214] bg-card-2 py-10">
        <Boba state={state} />
      </div>
    </section>
  );
}
