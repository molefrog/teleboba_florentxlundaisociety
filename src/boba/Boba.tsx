import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  BOBA_SEQUENCES,
  BOBA_SPRITES,
  EYEROLL_FRAMES,
  LAUGHING_FRAMES,
  type BobaState,
} from "./sprites";

/**
 * Pure sprite renderer. Receives a state and handles the corresponding
 * animation (motion transforms for sleeping/listening/crazy, sprite
 * sequencing for laughing/eyeroll).
 */
export function Boba({
  state,
  size = 200,
  className,
}: {
  state: BobaState;
  size?: number;
  className?: string;
}) {
  const sprite = useSpriteFor(state);
  const style = { width: size, height: size };

  if (state === "sleeping") {
    return (
      <motion.img
        src={sprite}
        alt="boba sleeping"
        draggable={false}
        style={style}
        className={className}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
      />
    );
  }

  if (state === "listening") {
    return (
      <motion.img
        src={sprite}
        alt="boba listening"
        draggable={false}
        style={{ ...style, transformOrigin: "50% 85%" }}
        className={className}
        animate={{ rotate: [-4, 4, -4] }}
        transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
      />
    );
  }

  if (state === "crazy") {
    return (
      <motion.img
        src={sprite}
        alt="boba crazy"
        draggable={false}
        style={{ ...style, transformOrigin: "50% 50%", willChange: "transform" }}
        className={className}
        animate={{
          x: [0, -40, 50, -30, 60, -55, 25, 0],
          y: [0, -30, 40, 10, -50, 20, -15, 0],
          rotate: [0, -18, 22, -10, 15, -25, 12, 0],
          scale: [1, 1.15, 0.85, 1.25, 0.9, 1.2, 0.95, 1],
        }}
        transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
      />
    );
  }

  return (
    <img
      src={sprite}
      alt={`boba ${state}`}
      draggable={false}
      style={style}
      className={className}
    />
  );
}

function useSpriteFor(state: BobaState): string {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const sequence = BOBA_SEQUENCES[state];
    if (!sequence) {
      setFrame(0);
      return;
    }

    let i = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setFrame(sequence[i].frame);
      timeout = setTimeout(() => {
        i = (i + 1) % sequence.length;
        tick();
      }, sequence[i].hold);
    };
    tick();
    return () => clearTimeout(timeout);
  }, [state]);

  if (state === "laughing") return LAUGHING_FRAMES[frame];
  if (state === "eyeroll") return EYEROLL_FRAMES[frame];
  return BOBA_SPRITES[state];
}
