import { AnimatePresence, motion } from "motion/react";
import { Alternatives } from "./content/Alternatives";
import { Text } from "./content/Text";
import { Timeline } from "./content/Timeline";
import type { ContentSpec } from "./types";

function contentKey(spec: ContentSpec): string {
  // Key only on content *type* — data-level changes are animated inside each
  // component, without unmounting the outer slide.
  return spec.type;
}

const TRANSITION = {
  duration: 0.45,
  ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
};

export function ContentLayer({
  content,
  placeholder,
}: {
  content: ContentSpec;
  placeholder?: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={contentKey(content)}
          initial={{ opacity: 0, scale: 0.9, filter: "blur(24px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.08, filter: "blur(24px)" }}
          transition={TRANSITION}
          className="flex w-full items-center justify-center"
        >
          {content.type === "text" && (
            <Text
              text={content.text}
              placeholder={placeholder}
              font={content.font}
            />
          )}
          {content.type === "timeline" && <Timeline points={content.points} />}
          {content.type === "alternatives" && (
            <Alternatives items={content.items} selected={content.selected} />
          )}
          {content.type === "none" && placeholder && (
            <Text text="" placeholder={placeholder} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
