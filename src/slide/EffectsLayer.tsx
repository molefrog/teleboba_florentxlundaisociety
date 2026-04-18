import { EmojiRain } from "./EmojiRain";
import type { EffectSpec } from "./types";

export function EffectsLayer({ spec }: { spec: EffectSpec }) {
  if (spec.type === "none") return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {spec.type === "emoji-rain" && (
        <EmojiRain emojis={spec.emojis} density={spec.density} />
      )}
    </div>
  );
}
