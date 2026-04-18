import { cn } from "../../lib/cn";
import type { TextFont } from "../types";

const FONT_CLASSES: Record<TextFont, string> = {
  default: "font-sans font-semibold tracking-[-0.045em] leading-[0.88]",
  serif: "font-serif font-black italic tracking-[-0.025em] leading-[0.92]",
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
  return (
    <div
      className={cn(
        "max-w-[1200px] text-center break-words",
        "text-[clamp(3.5rem,12vw,10.5rem)]",
        FONT_CLASSES[font],
        text ? "text-fg" : "text-fg/40",
      )}
    >
      {text || placeholder || ""}
    </div>
  );
}
