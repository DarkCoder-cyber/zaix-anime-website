export function computeLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100));
}

export function computeLevelData(totalXp: number) {
  const level = computeLevel(totalXp);
  const currentLevelXp = level * level * 100;
  const nextLevelXp = (level + 1) * (level + 1) * 100;
  const progressXp = totalXp - currentLevelXp;
  const rangeXp = nextLevelXp - currentLevelXp;
  const progressPct = Math.round((progressXp / rangeXp) * 100);
  return { level, totalXp, currentLevelXp, nextLevelXp, progressXp, rangeXp, progressPct };
}

export interface LevelTier {
  emoji: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}

export function getLevelTier(level: number): LevelTier | null {
  if (level <= 0) return null;
  if (level <= 10) return {
    emoji: "🥉", label: "Bronze",
    color: "text-amber-600",
    bg: "bg-amber-700/15",
    border: "border-amber-700/40",
  };
  if (level <= 30) return {
    emoji: "🥈", label: "Silver",
    color: "text-slate-300",
    bg: "bg-slate-300/10",
    border: "border-slate-300/30",
  };
  if (level <= 60) return {
    emoji: "💎", label: "Platinum",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/30",
  };
  return {
    emoji: "🔥", label: "Master",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
  };
}

interface LevelBadgeProps {
  level: number;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}

export function LevelBadge({ level, size = "sm", showLabel = false }: LevelBadgeProps) {
  if (level <= 0) return null;
  const tier = getLevelTier(level);
  if (!tier) return null;

  if (size === "xs") {
    return (
      <span
        title={`Level ${level} ${tier.label}`}
        className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded border ${tier.bg} ${tier.border} ${tier.color}`}
      >
        <span>{tier.emoji}</span>
        <span>{level}</span>
      </span>
    );
  }

  if (size === "sm") {
    return (
      <span
        title={`Level ${level} ${tier.label}`}
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${tier.bg} ${tier.border} ${tier.color}`}
      >
        <span>{tier.emoji}</span>
        <span>Lv.{level}</span>
        {showLabel && <span className="opacity-70">{tier.label}</span>}
      </span>
    );
  }

  return (
    <span
      title={`Level ${level} ${tier.label}`}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${tier.bg} ${tier.border} ${tier.color}`}
    >
      <span className="text-sm">{tier.emoji}</span>
      <span>Level {level}</span>
      {showLabel && <span className="opacity-80">· {tier.label}</span>}
    </span>
  );
}
