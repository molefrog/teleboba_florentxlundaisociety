import { useEffect, useState } from "react";
import { Leva, useControls } from "leva";
import type { ContentSpec, Slide } from "./slide/types";

const PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1920&q=80",
];

const PRESET_VIDEO =
  "https://media1.giphy.com/media/l2Sq8Ga8VwyP5Cvxu/giphy.mp4";

function parsePairs(raw: string): Array<{ a: string; b: string }> {
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [a, b = ""] = p.split("|").map((s) => s.trim());
      return { a, b };
    });
}

export function useDevSlide() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setHidden((h) => !h);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { mode } = useControls("Source", {
    mode: { value: "fake", options: ["fake", "real"] as const },
  });

  const content = useControls("Content", {
    type: {
      value: "text",
      options: ["none", "text", "timeline", "alternatives"] as const,
    },
    text: {
      value: "invent the future",
      render: (get) => get("Content.type") === "text",
    },
    font: {
      value: "default",
      options: ["default", "serif", "silly"] as const,
      render: (get) => get("Content.type") === "text",
    },
    timeline: {
      value: "Discover | find the problem, Define | frame it, Design | ship it",
      render: (get) => get("Content.type") === "timeline",
    },
    alternatives: {
      value: "Playful | chaos cinema, Lecture | whiteboard, Corporate | tasteful",
      render: (get) => get("Content.type") === "alternatives",
    },
    selected: {
      value: "Lecture",
      render: (get) => get("Content.type") === "alternatives",
    },
  });

  const bg = useControls("Background", {
    type: { value: "none", options: ["none", "image", "video"] as const },
    url: "",
    preset: {
      value: "custom",
      options: ["custom", "unsplash 1", "unsplash 2", "unsplash 3", "giphy mp4"],
    },
    dim: { value: 0.65, min: 0, max: 1, step: 0.05 },
  });

  const fx = useControls("Effect", {
    type: { value: "none", options: ["none", "emoji-rain"] as const },
    emojis: "🎉✨🔥💥🚀",
    density: { value: 40, min: 1, max: 120, step: 1 },
  });

  const bgUrl = resolvePreset(bg.preset, bg.url);

  const contentSpec: ContentSpec = buildContent(content);

  const slide: Slide = {
    background:
      bg.type === "none" || !bgUrl
        ? { type: "none" }
        : { type: bg.type as "image" | "video", url: bgUrl, dim: bg.dim },
    effect:
      fx.type === "none"
        ? { type: "none" }
        : {
            type: "emoji-rain",
            emojis: Array.from(fx.emojis).filter((c) => c.trim()),
            density: fx.density,
          },
    content: mode === "fake" ? contentSpec : { type: "none" },
  };

  return { slide, mode, hidden, setHidden };
}

function buildContent(c: {
  type: string;
  text: string;
  font: string;
  timeline: string;
  alternatives: string;
  selected: string;
}): ContentSpec {
  switch (c.type) {
    case "text":
      return {
        type: "text",
        text: c.text,
        font: c.font as "default" | "serif" | "silly",
      };
    case "timeline":
      return {
        type: "timeline",
        points: parsePairs(c.timeline).map((p) => ({
          title: p.a,
          caption: p.b || undefined,
        })),
      };
    case "alternatives":
      return {
        type: "alternatives",
        items: parsePairs(c.alternatives).map((p) => ({
          title: p.a,
          text: p.b,
        })),
        selected: c.selected.trim() || undefined,
      };
    default:
      return { type: "none" };
  }
}

function resolvePreset(preset: string, url: string) {
  switch (preset) {
    case "unsplash 1":
      return PRESET_IMAGES[0];
    case "unsplash 2":
      return PRESET_IMAGES[1];
    case "unsplash 3":
      return PRESET_IMAGES[2];
    case "giphy mp4":
      return PRESET_VIDEO;
    default:
      return url;
  }
}

export function DevPanelUI({ hidden }: { hidden: boolean }) {
  return (
    <Leva
      hidden={hidden}
      titleBar={{ title: "dev · press D to toggle", filter: false }}
      collapsed={false}
    />
  );
}
