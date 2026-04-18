import { useCallback, useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { useLocation } from "wouter";
import { Menu, Pause, Play, X } from "react-feather";
import { cn } from "./lib/cn";
import { DevPanelUI, useDevSlide } from "./DevPanel";
import { SlideRenderer } from "./slide/SlideRenderer";
import {
  EMPTY_SLIDE,
  type AlternativeItem,
  type ContentSpec,
  type Slide,
  type TextFont,
  type TimelinePoint,
} from "./slide/types";
import { DraggableBoba, type BobaState } from "./boba";
import { startRealtime, type RealtimeSession } from "./realtime";
import { getSavedTraitId, loadTraits, type Trait } from "./traits";
import { TranscriptSidebar, type TranscriptEntry } from "./Transcript";
import { Captions } from "./Captions";
import { searchMedia } from "./media/searchMedia";
import { playSfx } from "./sfx";

const SIDEBAR_WIDTH = 380;

export function Teleprompter() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [session, setSession] = useState<RealtimeSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [partial, setPartial] = useState("");
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [realSlide, setRealSlide] = useState<Slide>(EMPTY_SLIDE);
  const [bobaOverride, setBobaOverride] = useState<BobaState | null>(null);
  const emojiRainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bobaLaughTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBobaLaugh = useCallback(() => {
    setBobaOverride("laughing");
    if (bobaLaughTimer.current) clearTimeout(bobaLaughTimer.current);
    bobaLaughTimer.current = setTimeout(() => setBobaOverride(null), 5000);
  }, []);
  const [trait, setTrait] = useState<Trait | null>(null);
  useEffect(() => {
    loadTraits().then((list) => {
      const id = getSavedTraitId();
      setTrait(list.find((t) => t.id === id) ?? list[0] ?? null);
    });
  }, []);

  const { slide: devSlide, mode, hidden } = useDevSlide();

  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const dispatchTool = async (name: string, raw: unknown) => {
    const args = (raw ?? {}) as Record<string, unknown>;
    switch (name) {
      case "show_text":
      case "show_timeline":
      case "show_alternatives": {
        const nextContent = buildContent(name, args);
        if (!nextContent) return { ok: false, error: "bad args" };
        setRealSlide((prev) => ({
          ...prev,
          content: nextContent,
        }));
        return { ok: true };
      }
      case "set_background": {
        const type = args.type === "gif" ? "gif" : "image";
        const query = typeof args.query === "string" ? args.query : "";
        const resolved = await searchMedia({ type, query });
        if (!resolved) return { ok: false, error: "no media" };
        setRealSlide((prev) => ({
          ...prev,
          background: { type: resolved.kind, url: resolved.url, dim: 0.65 },
        }));
        return { ok: true, url: resolved.url };
      }
      case "clear_background":
        setRealSlide((prev) => ({ ...prev, background: { type: "none" } }));
        return { ok: true };
      case "emoji_rain": {
        const str = typeof args.emojis === "string" ? args.emojis : "✨🎉";
        const emojis = Array.from(str).filter((c) => c.trim());
        if (emojis.length === 0) return { ok: false, error: "no emojis" };
        const density =
          typeof args.density === "number"
            ? Math.max(10, Math.min(120, Math.round(args.density)))
            : 40;
        setRealSlide((prev) => ({
          ...prev,
          effect: { type: "emoji-rain", emojis, density },
        }));
        if (emojiRainTimer.current) clearTimeout(emojiRainTimer.current);
        emojiRainTimer.current = setTimeout(() => {
          setRealSlide((prev) => ({ ...prev, effect: { type: "none" } }));
        }, 5000);
        triggerBobaLaugh();
        return { ok: true };
      }
      case "play_sfx": {
        const sfxName = typeof args.name === "string" ? args.name : "";
        playSfx(sfxName);
        triggerBobaLaugh();
        return { ok: true };
      }
      case "no_op":
        return { ok: true };
      default:
        return { ok: false, error: `unknown tool ${name}` };
    }
  };

  const handleStart = async () => {
    setError("");
    setStarting(true);
    try {
      const s = await startRealtime(
        dispatchTool,
        setStatus,
        (text, final) => {
          if (final) {
            const trimmed = text.trim();
            if (trimmed) {
              setEntries((prev) => [
                ...prev,
                { id: `${Date.now()}-${prev.length}`, text: trimmed, at: Date.now() },
              ]);
            }
            setPartial("");
          } else {
            setPartial((prev) => prev + text);
          }
        },
        {
          traitInstruction: trait?.instruction,
          traitName: trait?.name,
        },
      );
      setSession(s);
      setStartedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setStarting(false);
    }
  };

  const handleStop = () => {
    session?.stop();
    setSession(null);
    setStartedAt(null);
    setPartial("");
    setStatus("idle");
    setStarting(false);
  };

  const toggleTranscript = useCallback(() => setTranscriptOpen((v) => !v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        toggleTranscript();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleTranscript]);

  const handleExit = () => {
    handleStop();
    setLocation("/");
  };

  const live = status === "live";
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  const active = Boolean(session) || starting;
  const bobaBaseState: BobaState =
    bobaOverride ?? (active ? "listening" : "sleeping");

  // fake mode → Leva drives the whole slide. real mode → tool dispatcher
  // drives it. No cross-mode mixing.
  const slide: Slide = mode === "fake" ? devSlide : realSlide;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg text-fg">
      <motion.div
        animate={{ marginRight: transcriptOpen ? SIDEBAR_WIDTH : 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="relative min-h-screen overflow-clip"
      >
      <SlideRenderer slide={slide} />

      {/* Top-left: session controls */}
      <div className="absolute top-7 left-7 z-30 flex items-center gap-2.5">
        <button
          onClick={handleExit}
          className="flex h-12 cursor-pointer items-center gap-3 rounded-full border border-[#1211100F] bg-fg-soft pr-5 pl-4 text-[15px] font-medium text-bg shadow-sm shadow-black/30 transition-colors hover:bg-fg"
        >
          <X size={22} strokeWidth={2} />
          Exit session
        </button>
        <Pill className="flex items-center gap-1 tabular-nums text-[22px] leading-none tracking-tight">
          <NumberFlow value={mins} format={{ minimumIntegerDigits: 2 }} />
          <span className="opacity-60">:</span>
          <NumberFlow value={secs} format={{ minimumIntegerDigits: 2 }} />
        </Pill>
        <Pill className="text-mute tracking-[0.16em] uppercase text-[13px]">
          mode · {trait?.name ?? "…"}
        </Pill>
      </div>

      {/* Top-right: transcript toggle */}
      <div className="absolute top-7 right-7 z-30 flex items-center gap-2.5">
        <button
          onClick={toggleTranscript}
          className={cn(
            "flex h-12 cursor-pointer items-center gap-3 rounded-full pr-5 pl-[18px] text-[15px] font-medium shadow-sm shadow-black/30 transition-colors hover:shadow-md",
            transcriptOpen
              ? "bg-accent text-fg hover:bg-accent/90"
              : "bg-fg text-bg hover:bg-fg-soft",
          )}
        >
          <Menu size={18} strokeWidth={1.6} />
          Transcript
          <span
            className={cn(
              "rounded-[5px] px-[7px] py-[3px] text-[11px] tracking-wider",
              transcriptOpen ? "bg-black/20 text-fg/80" : "bg-[#12111014] text-mute",
            )}
          >
            T
          </span>
        </button>
      </div>

      {/* Draggable Boba with play/pause dock */}
      <DraggableBoba baseState={bobaBaseState}>
        <button
          onClick={active ? handleStop : handleStart}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={active ? "pause" : "play"}
          className="absolute right-0 bottom-0 grid size-14 cursor-pointer place-items-center rounded-full border border-[#1211100F] bg-fg-soft text-bg shadow-md shadow-black/40 transition-all hover:bg-fg hover:shadow-lg active:scale-95"
        >
          {active ? (
            <Pause size={22} strokeWidth={1.6} fill="currentColor" />
          ) : (
            <Play size={22} strokeWidth={1.6} fill="currentColor" />
          )}
        </button>
      </DraggableBoba>

      {/* Bottom center: TikTok-style rolling captions */}
      <Captions entries={entries} partial={partial} />

      {error && (
        <div className="absolute bottom-2 left-1/2 z-40 -translate-x-1/2 text-sm text-accent">
          {error}
        </div>
      )}
      </motion.div>

      <TranscriptSidebar
        open={transcriptOpen}
        onClose={toggleTranscript}
        entries={entries}
        partial={partial}
      />

      <DevPanelUI hidden={hidden} />
    </div>
  );
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-12 items-center rounded-full border border-[#1211100F] bg-fg-soft px-[18px] text-[15px] font-medium text-bg shadow-sm shadow-black/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

function buildContent(
  name: "show_text" | "show_timeline" | "show_alternatives",
  args: Record<string, unknown>,
): ContentSpec | null {
  if (name === "show_text") {
    const text = typeof args.text === "string" ? args.text.trim() : "";
    if (!text) return null;
    const font: TextFont =
      args.font === "serif" || args.font === "silly" ? args.font : "default";
    return { type: "text", text, font };
  }
  if (name === "show_timeline") {
    const points = Array.isArray(args.points)
      ? (args.points as Array<Record<string, unknown>>)
          .map<TimelinePoint | null>((p) => {
            const title = typeof p.title === "string" ? p.title.trim() : "";
            if (!title) return null;
            const caption =
              typeof p.caption === "string" && p.caption.trim()
                ? p.caption.trim()
                : undefined;
            return { title, caption };
          })
          .filter((p): p is TimelinePoint => p !== null)
      : [];
    if (points.length < 2) return null;
    return { type: "timeline", points };
  }
  // show_alternatives
  const items = Array.isArray(args.items)
    ? (args.items as Array<Record<string, unknown>>)
        .map<AlternativeItem | null>((i) => {
          const title = typeof i.title === "string" ? i.title.trim() : "";
          const text = typeof i.text === "string" ? i.text.trim() : "";
          if (!title || !text) return null;
          return { title, text };
        })
        .filter((i): i is AlternativeItem => i !== null)
    : [];
  if (items.length < 2) return null;
  const selected =
    typeof args.selected === "string" && args.selected.trim()
      ? args.selected.trim()
      : undefined;
  return { type: "alternatives", items, selected };
}

