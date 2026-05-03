import type { AmbientPalette, AmbientColor } from "@/hooks/use-ambient-color";

function rgba(c: AmbientColor, a: number) {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

interface Props {
  palette: AmbientPalette | null;
  enabled: boolean;
}

const CSS = `
@keyframes zaix-glow-breathe {
  0%,100% { opacity: 0.55; transform: scale(0.96); }
  50%      { opacity: 0.92; transform: scale(1.04); }
}
@keyframes zaix-hue-cycle {
  0%   { filter: hue-rotate(0deg);   }
  20%  { filter: hue-rotate(14deg);  }
  45%  { filter: hue-rotate(-9deg);  }
  70%  { filter: hue-rotate(19deg);  }
  90%  { filter: hue-rotate(-5deg);  }
  100% { filter: hue-rotate(0deg);   }
}
`;

export function AmbientGlow({ palette, enabled }: Props) {
  if (!palette || !enabled) return null;
  const { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br, center } = palette;
  const BLUR = 55;

  return (
    <>
      <style>{CSS}</style>

      {/* Outer wrapper: same bounding box as the video, overflow visible so glows bleed out */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "visible",
          /* Hue-cycle animation drives a subtle dynamic color shift on the whole glow */
          animation: "zaix-hue-cycle 11s ease-in-out infinite",
        }}
      >
        {/* ── Top bleed ────────────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          top: "-90px",
          left: "8%",
          right: "8%",
          height: "110px",
          background: `linear-gradient(to bottom,
            ${rgba(tl, 0.9)} 0%,
            ${rgba(tr, 0.75)} 50%,
            transparent 100%)`,
          filter: `blur(${BLUR}px)`,
          animation: "zaix-glow-breathe 4.8s ease-in-out infinite",
          transformOrigin: "top center",
          borderRadius: "50%",
        }} />

        {/* ── Bottom bleed ─────────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          bottom: "-90px",
          left: "8%",
          right: "8%",
          height: "110px",
          background: `linear-gradient(to top,
            ${rgba(bl, 0.9)} 0%,
            ${rgba(br, 0.75)} 50%,
            transparent 100%)`,
          filter: `blur(${BLUR}px)`,
          animation: "zaix-glow-breathe 5.3s ease-in-out infinite 1.1s",
          transformOrigin: "bottom center",
          borderRadius: "50%",
        }} />

        {/* ── Left bleed ───────────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          left: "-90px",
          top: "8%",
          bottom: "8%",
          width: "110px",
          background: `linear-gradient(to right,
            ${rgba(tl, 0.85)} 0%,
            ${rgba(bl, 0.7)} 50%,
            transparent 100%)`,
          filter: `blur(${BLUR}px)`,
          animation: "zaix-glow-breathe 5.7s ease-in-out infinite 0.6s",
          transformOrigin: "left center",
          borderRadius: "50%",
        }} />

        {/* ── Right bleed ──────────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          right: "-90px",
          top: "8%",
          bottom: "8%",
          width: "110px",
          background: `linear-gradient(to left,
            ${rgba(tr, 0.85)} 0%,
            ${rgba(br, 0.7)} 50%,
            transparent 100%)`,
          filter: `blur(${BLUR}px)`,
          animation: "zaix-glow-breathe 4.4s ease-in-out infinite 1.9s",
          transformOrigin: "right center",
          borderRadius: "50%",
        }} />

        {/* ── Corner accents — sharper, closer to actual video corners ─────── */}
        {[
          { style: { top: "-40px", left: "-40px" }, color: tl },
          { style: { top: "-40px", right: "-40px" }, color: tr },
          { style: { bottom: "-40px", left: "-40px" }, color: bl },
          { style: { bottom: "-40px", right: "-40px" }, color: br },
        ].map(({ style, color }, i) => (
          <div key={i} style={{
            position: "absolute",
            width: "120px",
            height: "120px",
            ...style,
            background: `radial-gradient(ellipse at center, ${rgba(color, 0.8)} 0%, transparent 70%)`,
            filter: `blur(${BLUR * 0.7}px)`,
            animation: `zaix-glow-breathe ${4.2 + i * 0.4}s ease-in-out infinite ${i * 0.55}s`,
            borderRadius: "50%",
          }} />
        ))}

        {/* ── Center bloom — atmospheric depth behind the video ────────────── */}
        <div style={{
          position: "absolute",
          inset: "5%",
          background: `radial-gradient(ellipse at 50% 50%,
            ${rgba(center, 0.28)} 0%,
            ${rgba(center, 0.08)} 50%,
            transparent 75%)`,
          filter: `blur(${BLUR * 1.1}px)`,
          animation: "zaix-glow-breathe 6.5s ease-in-out infinite 0.3s",
          borderRadius: "50%",
        }} />
      </div>
    </>
  );
}
