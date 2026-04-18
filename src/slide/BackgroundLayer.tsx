import type { BackgroundSpec } from "./types";

export function BackgroundLayer({ spec }: { spec: BackgroundSpec }) {
  if (spec.type === "none") return null;

  const dim = spec.dim ?? 0.65;

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {spec.type === "image" && (
        <img
          src={spec.url}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      )}
      {spec.type === "video" && (
        <video
          src={spec.url}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      )}
      {/* Flat dim — controlled by `dim` */}
      <div
        className="absolute inset-0 bg-bg"
        style={{ opacity: dim }}
        aria-hidden
      />
      {/* Subtle vignette for extra legibility around center text */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 100%)",
        }}
        aria-hidden
      />
    </div>
  );
}
