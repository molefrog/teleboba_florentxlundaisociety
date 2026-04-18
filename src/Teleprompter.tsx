import { useCallback, useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { useLocation } from "wouter";
import { Menu, Pause, Play, X } from "react-feather";
import { cn } from "./lib/cn";
import { DevPanelUI, useDevSlide } from "./DevPanel";
import { SlideRenderer } from "./slide/SlideRenderer";
import type { Slide } from "./slide/types";
import { DraggableBoba } from "./boba";
import { startRealtime, type RealtimeSession } from "./realtime";
import { TranscriptSidebar, type TranscriptEntry } from "./Transcript";

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
  const [realPhrase, setRealPhrase] = useState("");
  const temperament =
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("teleprompter:temperament")) ||
    "playful";

  const { slide: devSlide, mode, hidden } = useDevSlide();

  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const handleStart = async () => {
    setError("");
    setStarting(true);
    try {
      const s = await startRealtime(
        async (name, args) => {
          if (name === "display_keyphrase") {
            const text = (args as { text?: string })?.text?.trim();
            if (text) setRealPhrase(text);
          }
          return { ok: true };
        },
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

  const bobaBaseState = session || starting ? "listening" : "sleeping";

  // Merge: in fake mode everything comes from Leva; in real mode, the
  // current phrase from realtime drives a text content; bg/fx still from
  // Leva (no realtime tools for those yet).
  const slide: Slide =
    mode === "fake"
      ? devSlide
      : {
          ...devSlide,
          content: realPhrase
            ? { type: "text", text: realPhrase }
            : devSlide.content,
        };

  const placeholder = live ? "listening" : "invent the future";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg text-fg">
      <motion.div
        animate={{ marginRight: transcriptOpen ? SIDEBAR_WIDTH : 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="relative min-h-screen overflow-clip"
      >
      <SlideRenderer slide={slide} placeholder={placeholder} />

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
          mode · {temperament}
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
          onClick={session ? handleStop : handleStart}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={session ? "pause" : "play"}
          className="absolute right-0 bottom-0 grid size-14 cursor-pointer place-items-center rounded-full border border-[#1211100F] bg-fg-soft text-bg shadow-md shadow-black/40 transition-all hover:bg-fg hover:shadow-lg active:scale-95"
        >
          {session ? (
            <Pause size={22} strokeWidth={1.6} fill="currentColor" />
          ) : (
            <Play size={22} strokeWidth={1.6} fill="currentColor" />
          )}
        </button>
      </DraggableBoba>

      {/* Bottom center: subtitle (latest final + live partial) */}
      {(entries.length > 0 || partial) && (
        <div className="absolute bottom-[52px] left-1/2 z-20 flex w-[round(90%,1px)] max-w-[1000px] -translate-x-1/2 flex-col items-center gap-1.5">
          {entries.length > 0 && (
            <div className="text-center text-[22px] leading-[30px] font-medium tracking-[-0.005em] text-fg/55">
              {entries[entries.length - 1].text}
            </div>
          )}
          {partial && (
            <div className="text-center text-2xl leading-8 font-medium tracking-[-0.005em] text-fg">
              {partial}
            </div>
          )}
        </div>
      )}

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

