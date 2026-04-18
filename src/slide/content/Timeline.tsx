import { motion } from "motion/react";
import type { TimelinePoint } from "../types";

export function Timeline({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) return null;

  return (
    <div className="flex w-full max-w-[1100px] items-center px-10">
      {points.map((p, i) => (
        <motion.div
          layout
          key={p.title + ":" + i}
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
          className="flex min-w-0 flex-1 flex-col items-center gap-6"
        >
          <motion.div
            layout="position"
            className="text-center text-[clamp(1.5rem,3vw,2.25rem)] font-semibold tracking-[-0.015em] text-fg"
          >
            {p.title}
          </motion.div>

          <div className="relative flex w-full items-center justify-center">
            {i > 0 && (
              <div className="absolute right-1/2 h-px w-full bg-fg/30" />
            )}
            {i < points.length - 1 && (
              <div className="absolute left-1/2 h-px w-full bg-fg/30" />
            )}
            <motion.div
              layout
              className="relative size-4 shrink-0 rounded-full bg-accent shadow-[0_0_0_6px_rgba(232,90,60,0.18)]"
            />
          </div>

          {p.caption && (
            <motion.div
              layout="position"
              className="max-w-[220px] text-center text-[15px] leading-[1.5] text-mute"
            >
              {p.caption}
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
