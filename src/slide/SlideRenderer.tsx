import { BackgroundLayer } from "./BackgroundLayer";
import { ContentLayer } from "./ContentLayer";
import { EffectsLayer } from "./EffectsLayer";
import type { Slide } from "./types";

export function SlideRenderer({
  slide,
  placeholder,
}: {
  slide: Slide;
  placeholder?: string;
}) {
  return (
    <>
      <BackgroundLayer spec={slide.background} />
      <EffectsLayer spec={slide.effect} />
      <ContentLayer content={slide.content} placeholder={placeholder} />
    </>
  );
}
