export type BackgroundSpec =
  | { type: "none" }
  | { type: "image"; url: string; dim?: number }
  | { type: "video"; url: string; dim?: number };

export type EffectSpec =
  | { type: "none" }
  | { type: "emoji-rain"; emojis: string[]; density?: number };

export interface TimelinePoint {
  title: string;
  caption?: string;
}

export interface AlternativeItem {
  title: string;
  text: string;
}

export type TextFont = "default" | "serif" | "silly";

export type ContentSpec =
  | { type: "none" }
  | { type: "text"; text: string; font?: TextFont }
  | { type: "timeline"; points: TimelinePoint[] }
  | {
      type: "alternatives";
      items: AlternativeItem[];
      selected?: string;
    };

export interface Slide {
  background: BackgroundSpec;
  effect: EffectSpec;
  content: ContentSpec;
}

export const EMPTY_SLIDE: Slide = {
  background: { type: "none" },
  effect: { type: "none" },
  content: { type: "none" },
};
