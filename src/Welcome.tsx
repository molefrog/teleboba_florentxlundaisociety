import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Check, Mic } from "react-feather";
import { cn } from "./lib/cn";

type TemperamentId = "playful" | "lecture" | "corporate" | "improv";

interface Temperament {
  id: TemperamentId;
  index: string;
  name: string;
  description: string;
}

const TEMPERAMENTS: Temperament[] = [
  {
    id: "playful",
    index: "01",
    name: "Playful",
    description: "Max gifs, emoji bursts, memes. Chaos cinema.",
  },
  {
    id: "lecture",
    index: "02",
    name: "Lecture",
    description: "Diagrams, quotes, reference images. Whiteboard-adjacent.",
  },
  {
    id: "corporate",
    index: "03",
    name: "Corporate",
    description: "Charts and tasteful stock. Less effects, more appropriate.",
  },
  {
    id: "improv",
    index: "04",
    name: "Improv",
    description: "Context-aware absurdism. Good for stand-up and storytelling.",
  },
];

const STORAGE_KEY = "teleprompter:temperament";

export function Welcome() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<TemperamentId>(() => {
    if (typeof localStorage === "undefined") return "playful";
    return (localStorage.getItem(STORAGE_KEY) as TemperamentId) || "playful";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selected);
  }, [selected]);

  const begin = () => setLocation("/prompter");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        begin();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      {/* Brand */}
      <header className="flex items-center justify-center px-12 py-7">
        <div className="flex items-center gap-2.5">
          <div className="grid size-[18px] place-items-center rounded-full bg-accent">
            <div className="size-[5px] rounded-full bg-bg" />
          </div>
          <div className="text-xs leading-4 font-medium tracking-[0.16em] text-fg uppercase">
            teleprompter
          </div>
          <div className="ml-1 text-[11px] leading-[14px] tracking-[0.08em] text-mute">
            v0.1
          </div>
        </div>
      </header>

      {/* Hero CTA */}
      <main className="flex flex-1 flex-col items-center justify-center gap-9 px-16">
        <button
          onClick={begin}
          className={cn(
            "grid size-28 cursor-pointer place-items-center rounded-full bg-accent transition-transform",
            "shadow-[inset_0_-5px_0_#0000002e,0_12px_48px_#e85a3c61]",
            "hover:scale-105 active:scale-95",
          )}
          aria-label="start speaking"
        >
          <Mic size={44} strokeWidth={2} className="text-fg" />
        </button>
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-xl leading-6 font-medium text-fg">
            Tap to start speaking
          </div>
          <div className="text-[13px] leading-4 text-mute">
            or press Space to begin
          </div>
        </div>
      </main>

      {/* Temperament picker */}
      <section className="flex flex-col items-center gap-[18px] px-16 pb-14">
        <div className="flex items-center gap-3.5">
          <Axis label="fun" />
          <div className="h-px w-44 shrink-0 bg-fg/15" />
          <Axis label="pick a temperament" />
          <div className="h-px w-44 shrink-0 bg-fg/15" />
          <Axis label="professional" />
        </div>

        <div className="flex w-full max-w-[960px] gap-3">
          {TEMPERAMENTS.map((t) => (
            <TemperamentCard
              key={t.id}
              temperament={t}
              selected={selected === t.id}
              onSelect={() => setSelected(t.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Axis({ label }: { label: string }) {
  return (
    <div className="text-[11px] leading-[14px] font-medium tracking-[0.22em] text-mute uppercase">
      {label}
    </div>
  );
}

function TemperamentCard({
  temperament,
  selected,
  onSelect,
}: {
  temperament: Temperament;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex h-[156px] flex-1 basis-0 cursor-pointer flex-col justify-between rounded-2xl p-5 text-left transition-all",
        selected
          ? "bg-accent shadow-[0_8px_32px_rgba(232,90,60,0.25)]"
          : "border border-fg/8 bg-card hover:border-fg/20 hover:bg-card-2",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "text-[11px] leading-[14px] font-medium tracking-[0.18em] uppercase",
            selected ? "text-bg/65" : "text-mute",
          )}
        >
          {selected ? `${temperament.index} · selected` : temperament.index}
        </div>
        {selected ? (
          <div className="grid size-4 place-items-center rounded-full bg-bg">
            <Check size={10} strokeWidth={2.5} className="text-accent" />
          </div>
        ) : (
          <div className="size-4 shrink-0 rounded-full border-[1.5px] border-fg/25" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div
          className={cn(
            "text-[26px] leading-7 font-semibold tracking-[-0.02em]",
            selected ? "text-bg" : "text-fg",
          )}
        >
          {temperament.name}
        </div>
        <div
          className={cn(
            "text-xs leading-[17px]",
            selected ? "text-bg/70" : "text-fg/65",
          )}
        >
          {temperament.description}
        </div>
      </div>
    </button>
  );
}
