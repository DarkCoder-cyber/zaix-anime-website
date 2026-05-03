import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    // in → hold → out → done
    const t1 = setTimeout(() => setPhase("hold"), 600);
    const t2 = setTimeout(() => setPhase("out"), 1800);
    const t3 = setTimeout(() => onDone(), 2350);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "#0a0a0a",
        opacity: phase === "out" ? 0 : 1,
        transform: phase === "out" ? "scale(1.03)" : "scale(1)",
        transition: phase === "out" ? "opacity 0.45s ease-in, transform 0.45s ease-in" : "none",
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      {/* Ambient glow layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
          opacity: phase === "in" ? 0 : 1,
          transition: "opacity 0.8s ease",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "15%",
          width: 280, height: 280, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,60,0,0.08) 0%, transparent 70%)",
          opacity: phase === "in" ? 0 : 1,
          transition: "opacity 1s ease 0.2s",
        }} />
      </div>

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
        opacity: 0.4,
      }} />

      {/* Logo block */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        opacity: phase === "in" ? 0 : 1,
        transform: phase === "in" ? "translateY(24px) scale(0.92)" : "translateY(0) scale(1)",
        transition: "opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Icon */}
        <div style={{
          width: 96, height: 96, borderRadius: 22,
          background: "linear-gradient(135deg,#111 0%,#1a1a1a 100%)",
          border: "2px solid rgba(168,85,247,0.5)",
          boxShadow: "0 0 40px rgba(168,85,247,0.35), 0 0 80px rgba(168,85,247,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}>
          {/* Z letter */}
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 12 L50 12 L16 48 L50 48"
              stroke="#a855f7" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 8px #a855f7)" }}
            />
          </svg>

          {/* Shimmer sweep */}
          <div style={{
            position: "absolute", top: 0, left: "-100%", width: "60%", height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)",
            animation: phase !== "in" ? "shimmer 1.8s ease 0.3s 1" : "none",
          }} />
        </div>

        {/* Wordmark */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{
            fontSize: 44, fontWeight: 900, letterSpacing: "-0.02em",
            fontFamily: "'Inter', system-ui, sans-serif",
            color: "#fff",
            textShadow: "0 0 30px rgba(168,85,247,0.4)",
            lineHeight: 1,
          }}>
            ZAIX
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.25em",
            color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
          }}>
            Anime · Manga · Manhwa
          </span>
        </div>

        {/* Loading bar */}
        <div style={{ width: 120, height: 2, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 8 }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: "linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)",
            boxShadow: "0 0 8px rgba(168,85,247,0.7)",
            width: phase === "hold" || phase === "out" ? "100%" : "0%",
            transition: phase === "hold" ? "width 1s ease" : "none",
          }} />
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}
