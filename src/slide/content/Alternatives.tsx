import { motion } from "motion/react";
import { cn } from "../../lib/cn";
import type { AlternativeItem } from "../types";

export function Alternatives({
  items,
  selected,
}: {
  items: AlternativeItem[];
  selected?: string;
}) {
  if (items.length === 0) return null;

  const cols = Math.min(items.length, 3);
  const selectedNorm = selected?.trim().toLowerCase();
  const hasSelection = Boolean(
    selectedNorm && items.some((i) => i.title.trim().toLowerCase() === selectedNorm),
  );

  return (
    <div
      className="grid w-full max-w-[1200px] gap-8 px-10"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {items.map((item, i) => {
        const isSelected =
          !!selectedNorm && item.title.trim().toLowerCase() === selectedNorm;
        const muted = hasSelection && !isSelected;
        return (
          <motion.div
            layout
            key={item.title + ":" + i}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            animate={{ opacity: muted ? 0.28 : 1 }}
            className={cn(
              "flex flex-col gap-3 text-center",
              isSelected && "relative",
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="alt-selected-glow"
                className="absolute -inset-6 -z-10 rounded-3xl bg-accent/15 blur-2xl"
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
              />
            )}
            <div
              className={cn(
                "text-[clamp(2.5rem,6vw,5rem)] font-semibold tracking-[-0.025em] leading-[0.95]",
                isSelected ? "text-accent" : "text-fg",
              )}
            >
              {item.title}
            </div>
            <motion.div
              layout="position"
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className={cn(
                "leading-[1.25] font-semibold tracking-[-0.015em]",
                isSelected
                  ? "text-[clamp(2.25rem,3.4vw,3.25rem)] text-fg"
                  : "text-[clamp(1.625rem,2.2vw,2.25rem)] text-fg/70",
              )}
            >
              {item.text}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
