export type BobaState =
  | "sleeping"
  | "laughing"
  | "listening"
  | "angry"
  | "crazy"
  | "eyeroll"
  | "focused";

export const BOBA_STATES: BobaState[] = [
  "sleeping",
  "laughing",
  "listening",
  "angry",
  "crazy",
  "eyeroll",
  "focused",
];

export const BOBA_SPRITES = {
  sleeping: "/boba/sleeping.png",
  listening: "/boba/listening.png",
  angry: "/boba/angry.png",
  crazy: "/boba/crazy.png",
  eyeroll: "/boba/eyeroll.png",
  focused: "/boba/focused.png",
  "laughing-1": "/boba/laughing-1.png",
  "laughing-2": "/boba/laughing-2.png",
} as const;

// Eagerly preload every sprite the moment this module is imported so state
// changes never trigger a network-caused flicker.
if (typeof window !== "undefined") {
  for (const src of Object.values(BOBA_SPRITES)) {
    const img = new Image();
    img.src = src;
  }
}

export interface SpriteFrame {
  frame: number;
  hold: number;
}

// Multi-frame sprite sequences keyed by state. States not listed here render
// a single static sprite.
export const BOBA_SEQUENCES: Partial<Record<BobaState, SpriteFrame[]>> = {
  laughing: [
    { frame: 0, hold: 140 }, // laughing-1
    { frame: 1, hold: 140 }, // laughing-2
    { frame: 0, hold: 140 },
    { frame: 1, hold: 140 },
    { frame: 2, hold: 900 }, // angry pause
  ],
  eyeroll: [
    { frame: 0, hold: 1600 }, // focused — straight face
    { frame: 1, hold: 1100 }, // eyeroll — long roll
    { frame: 0, hold: 250 }, // snap back
    { frame: 1, hold: 700 }, // smaller second roll
  ],
};

export const LAUGHING_FRAMES = [
  BOBA_SPRITES["laughing-1"],
  BOBA_SPRITES["laughing-2"],
  BOBA_SPRITES.angry,
];

export const EYEROLL_FRAMES = [BOBA_SPRITES.focused, BOBA_SPRITES.eyeroll];
