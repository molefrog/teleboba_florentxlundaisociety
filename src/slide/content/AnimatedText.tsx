import { useLayoutEffect, useRef } from "react";
import { animate, stagger } from "animejs";

export function AnimatedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const firstRenderRef = useRef(true);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chars = Array.from(el.querySelectorAll<HTMLElement>("[data-char]"));
    if (chars.length === 0) return;

    const isFirst = firstRenderRef.current;
    firstRenderRef.current = false;

    animate(chars, {
      opacity: [0, 1],
      translateY: [isFirst ? 22 : 16, 0],
      duration: isFirst ? 460 : 380,
      delay: stagger(isFirst ? 14 : 10),
      ease: "outQuad",
    });
  }, [text]);

  const segments = splitIntoSegments(text);

  return (
    <span
      ref={containerRef}
      className={className}
      key={text}
      aria-label={text}
    >
      {segments.map((seg, si) =>
        seg.type === "space" ? (
          <span key={`s-${si}`}>&nbsp;</span>
        ) : (
          <span
            key={`w-${si}`}
            className="inline-block whitespace-nowrap"
          >
            {Array.from(seg.word).map((ch, ci) => (
              <span
                key={`c-${si}-${ci}`}
                data-char
                className="inline-block will-change-transform"
                style={{ opacity: 0, transform: "translateY(16px)" }}
              >
                {ch}
              </span>
            ))}
          </span>
        ),
      )}
    </span>
  );
}

type Segment = { type: "word"; word: string } | { type: "space" };

function splitIntoSegments(text: string): Segment[] {
  const out: Segment[] = [];
  const words = text.split(/(\s+)/);
  for (const w of words) {
    if (!w) continue;
    if (/^\s+$/.test(w)) out.push({ type: "space" });
    else out.push({ type: "word", word: w });
  }
  return out;
}
