import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const MAX_LINES = 2;

interface Line {
  id: number;
  text: string;
  live: boolean;
}

/**
 * Rolling 2-line live captions. One "line" = one utterance (a finalized
 * transcript entry, or the currently-growing partial). New lines enter
 * from below; when a 3rd would appear, the oldest slides up and fades.
 */
export function Captions({
  entries,
  partial,
}: {
  entries: Array<{ text: string }>;
  partial: string;
}) {
  const lines = useCaptionLines(entries, partial);
  if (lines.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-12 left-1/2 z-20 w-[min(1100px,90vw)] -translate-x-1/2">
      <div
        className="pointer-events-auto flex flex-col items-center gap-2 text-center font-medium tracking-[-0.01em] text-fg opacity-[0.15] transition-opacity duration-300 hover:opacity-100"
        style={{
          fontSize: "clamp(1.4rem, 2.6vw, 2.4rem)",
          lineHeight: 1.2,
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {lines.map((line) => (
            <motion.div
              layout
              key={line.id}
              initial={{ opacity: 0, y: 32, scale: 0.94, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -32, scale: 0.94, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="max-w-full px-4 will-change-transform"
            >
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function useCaptionLines(
  entries: Array<{ text: string }>,
  partial: string,
): Line[] {
  const [items, setItems] = useState<Line[]>([]);
  const idRef = useRef(0);
  const prevEntriesCountRef = useRef(0);

  useEffect(() => {
    setItems((prev) => {
      const next = [...prev];

      // 1. If a new final was pushed, promote the in-flight live line (if
      //    any) to final — keeping its id so AnimatePresence doesn't
      //    exit+re-enter. Otherwise append a fresh final.
      const hasNewFinal = entries.length > prevEntriesCountRef.current;
      if (hasNewFinal) {
        const newFinal = entries[entries.length - 1];
        const last = next[next.length - 1];
        if (last && last.live) {
          next[next.length - 1] = {
            id: last.id,
            text: newFinal.text,
            live: false,
          };
        } else {
          next.push({
            id: idRef.current++,
            text: newFinal.text,
            live: false,
          });
        }
      }

      // 2. Sync the currently-growing partial into the tail of the list.
      const last = next[next.length - 1];
      if (partial) {
        if (last && last.live) {
          next[next.length - 1] = { ...last, text: partial };
        } else {
          next.push({ id: idRef.current++, text: partial, live: true });
        }
      }

      return next.slice(-MAX_LINES);
    });

    prevEntriesCountRef.current = entries.length;
  }, [entries, partial]);

  return items;
}
