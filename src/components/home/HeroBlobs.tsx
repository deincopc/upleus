"use client";

/**
 * Animated radial gradient blobs for the hero background.
 * CSS keyframe animations defined in globals.css (.blob-1/2/3).
 */
export function HeroBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Primary emerald blob — top left */}
      <div className="blob-1 absolute -top-[220px] -left-[80px] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.13] blur-[130px]" />
      {/* Teal blob — top right */}
      <div className="blob-2 absolute -top-[120px] right-[-60px] w-[580px] h-[580px] rounded-full bg-teal-400/[0.09] blur-[110px]" />
      {/* Deep emerald blob — bottom centre */}
      <div className="blob-3 absolute bottom-[-80px] left-[25%] w-[820px] h-[820px] rounded-full bg-emerald-600/[0.08] blur-[150px]" />
    </div>
  );
}
