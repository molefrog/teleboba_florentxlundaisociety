import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLocation } from "wouter";
import { Check } from "react-feather";
import { cn } from "./lib/cn";
import { Boba } from "./boba";

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
      {/* Title — sits at the top, slightly clipped by the viewport edge.
          Letters are windows onto a looping gif via background-clip. */}
      <h1
        className="mx-auto -mt-[0.8vw] w-full bg-cover bg-center bg-clip-text text-center text-[15.5vw] leading-[0.85] font-semibold tracking-[-0.04em] text-transparent uppercase"
        style={{ backgroundImage: "url(/giphy.gif)" }}
      >
        Teleboba
      </h1>

      {/* Hero CTA — the Boba is the button */}
      <main className="flex flex-col items-center justify-center gap-10 px-16 py-10">
        <button
          onClick={begin}
          aria-label="start speaking"
          className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
        >
          <motion.div layoutId="boba" className="size-[220px]">
            <Boba state="sleeping" size={220} />
          </motion.div>
        </button>

        <div className="flex max-w-[680px] flex-col items-center gap-3 text-center">
          <h2 className="text-4xl leading-[1.15] font-semibold tracking-[-0.02em] text-fg text-balance">
            I'm Teleboba, your presentation helper.
          </h2>
          <p className="text-[clamp(1.125rem,1.4vw,1.375rem)] leading-[1.4] text-mute">
            Don't have slides? I got you bro. Just wake me up.
          </p>
        </div>
      </main>

      {/* Temperament picker */}
      <section className="flex flex-col items-center gap-6 px-16 pb-14 pt-8">
        <h3 className="text-xl leading-[1.1] font-medium tracking-[-0.02em] text-fg">
          Pick a temperament
        </h3>

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
        <div className={cn("text-xs leading-[17px]", selected ? "text-bg/70" : "text-fg/65")}>
          {temperament.description}
        </div>
      </div>
    </button>
  );
}
