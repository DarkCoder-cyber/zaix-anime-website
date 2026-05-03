import { useState, useEffect, useRef } from "react";
import { X, Megaphone } from "lucide-react";

interface GlobalAlert {
  id: number;
  message: string;
  active: boolean;
  createdAt: string;
}

export function GlobalAlertBanner() {
  const [alert, setAlert] = useState<GlobalAlert | null>(null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlert = async () => {
    try {
      const res = await fetch("/api/admin/alert");
      if (!res.ok) return;
      const data = await res.json();
      setAlert(data.alert ?? null);
    } catch {}
  };

  useEffect(() => {
    fetchAlert();
    intervalRef.current = setInterval(fetchAlert, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (!alert || !alert.active || alert.id === dismissed) return null;

  return (
    <div
      className="w-full flex items-center gap-3 px-4 py-2 text-black text-sm font-bold overflow-hidden relative z-[60] shrink-0"
      style={{ background: "linear-gradient(90deg, #39ff14, #00ff88, #39ff14)", backgroundSize: "200% 100%", animation: "alertPulse 3s linear infinite" }}
    >
      <style>{`
        @keyframes alertPulse { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes marquee { 0%{transform:translateX(100vw)} 100%{transform:translateX(-100%)} }
      `}</style>
      <Megaphone className="w-4 h-4 shrink-0" />
      <div className="flex-1 overflow-hidden whitespace-nowrap">
        <span style={{ display: "inline-block", animation: "marquee 22s linear infinite" }}>
          {alert.message}
        </span>
      </div>
      <button
        onClick={() => setDismissed(alert.id)}
        className="shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Dismiss alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
