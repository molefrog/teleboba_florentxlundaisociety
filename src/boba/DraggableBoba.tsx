import { useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/cn";
import { Boba } from "./Boba";
import type { BobaState } from "./sprites";

/**
 * Wraps Boba in a draggable surface bounded to the viewport. State priority:
 * dragging → angry, hover → focused, else → `baseState`. Children render
 * inside the draggable frame (e.g. a play/pause dock) — they travel with
 * Boba as it moves.
 *
 * Initial position: bottom-left of the viewport.
 */
export function DraggableBoba({
  baseState = "sleeping",
  size = 200,
  children,
}: {
  baseState?: BobaState;
  size?: number;
  children?: ReactNode;
}) {
  const boundsRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const state: BobaState = dragging
    ? "angry"
    : hovered
      ? "focused"
      : baseState;

  return (
    <div
      ref={boundsRef}
      className="pointer-events-none fixed inset-0 z-30"
    >
      <motion.div
        drag
        dragConstraints={boundsRef}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => setDragging(true)}
        onDragEnd={() => setDragging(false)}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        style={{ width: size, height: size }}
        className={cn(
          "pointer-events-auto absolute bottom-7 left-7 touch-none select-none",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        <Boba state={state} size={size} />
        {children}
      </motion.div>
    </div>
  );
}
