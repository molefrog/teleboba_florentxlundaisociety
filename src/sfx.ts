// Sound-effect helper. All files live in /public/sfx. On import we preload
// each clip so the first play has no latency. playSfx(name) spawns a fresh
// Audio() so overlapping plays don't cut each other off.

export const SFX: Record<string, string> = {
  applause: "/sfx/01-applause.mp3",
  drumroll: "/sfx/03-drumroll.mp3",
  sad_trombone: "/sfx/04-sad-trombone.mp3",
  airhorn: "/sfx/05-airhorn.mp3",
  record_scratch: "/sfx/07-record-scratch.mp3",
  ding: "/sfx/08-ding.mp3",
  buzzer: "/sfx/09-buzzer.mp3",
  crowd_ooh: "/sfx/10-crowd-ooh.mp3",
  crickets: "/sfx/12-crickets.mp3",
  laugh_track: "/sfx/13-laugh-track.mp3",
  vinyl_stop: "/sfx/14-vinyl-stop.mp3",
  slide_whistle: "/sfx/15-slide-whistle.mp3",
};

export type SfxName = keyof typeof SFX;

export const SFX_NAMES = Object.keys(SFX) as SfxName[];

if (typeof window !== "undefined") {
  for (const src of Object.values(SFX)) {
    const a = new Audio(src);
    a.preload = "auto";
    a.load();
  }
}

export function playSfx(name: string, volume = 0.8) {
  const src = SFX[name];
  if (!src) {
    // eslint-disable-next-line no-console
    console.warn("[sfx] unknown sound:", name);
    return;
  }
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch((err) => {
    // Autoplay policy can reject if no user gesture has happened yet.
    // eslint-disable-next-line no-console
    console.warn("[sfx] play rejected:", err);
  });
}
