import { Crown, ShieldCheck } from "lucide-react";

interface CrownBadgeProps {
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function AdminCrown({ size = "sm", className = "" }: CrownBadgeProps) {
  const sizeMap = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4.5 h-4.5",
  };
  return (
    <Crown
      className={`${sizeMap[size]} ${className} shrink-0`}
      style={{ color: "#FFD700", filter: "drop-shadow(0 0 4px #FFD70099)" }}
    />
  );
}

export function VerifiedAdminBadge() {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
      style={{
        background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.1))",
        borderColor: "rgba(255,215,0,0.5)",
        color: "#FFD700",
        boxShadow: "0 0 10px rgba(255,215,0,0.2)",
      }}
    >
      <ShieldCheck className="w-3 h-3" />
      Verified Admin
    </div>
  );
}

export function AdminTag({ tag }: { tag: "trending" | "hot" }) {
  if (tag === "hot") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
        🔥 HOT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary border border-primary/30">
      📈 TRENDING
    </span>
  );
}
