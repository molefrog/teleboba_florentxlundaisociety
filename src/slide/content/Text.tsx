import { cn } from "../../lib/cn";
import type { TextFont } from "../types";
import { AnimatedText } from "./AnimatedText";

const FONT_CLASSES: Record<TextFont, string> = {
  default: "font-sans font-semibold tracking-[-0.045em] leading-[0.88]",
  serif: "font-serif font-normal italic tracking-[-0.015em] leading-[0.92]",
  silly: "font-silly font-normal tracking-[-0.01em] leading-[0.95]",
};

export function Text({
  text,
  placeholder,
  font = "default",
}: {
  text: string;
  placeholder?: string;
  font?: TextFont;
}) {
  const value = text || placeholder || "";
  const isPlaceholder = !text;

  return (
    <div
      className={cn(
        "max-w-[1200px] text-center break-words",
        "text-[clamp(3.5rem,12vw,10.5rem)]",
        FONT_CLASSES[font],
        isPlaceholder ? "text-fg/40" : "text-fg",
      )}
    >
      <AnimatedText text={value} />
    </div>
  );
}
