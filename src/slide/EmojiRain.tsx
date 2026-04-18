import { useMemo } from "react";

export function EmojiRain({
  emojis,
  density = 40,
}: {
  emojis: string[];
  density?: number;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: density }, (_, i) => ({
        key: i,
        emoji: emojis[i % emojis.length] ?? "✨",
        left: Math.random() * 100,
        delay: Math.random() * 1.4,
        duration: 0.85 + Math.random() * 0.9,
        size: 140 + Math.random() * 180,
        drift: (Math.random() - 0.5) * 320,
        startRot: Math.random() * 360,
        spin: (Math.random() - 0.5) * 720,
      })),
    [emojis, density],
  );

  if (emojis.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.key}
          className="absolute top-full animate-emoji-rain select-none"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            lineHeight: 1,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--drift" as string]: `${p.drift}px`,
            ["--start-rot" as string]: `${p.startRot}deg`,
            ["--spin" as string]: `${p.spin}deg`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
