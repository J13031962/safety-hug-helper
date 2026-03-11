import { useState, useEffect } from "react";
import { Timer } from "lucide-react";

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface AlarmTimerProps {
  createdAt: string;
  processedAt?: string | null;
  status: string;
}

export default function AlarmTimer({ createdAt, processedAt, status }: AlarmTimerProps) {
  const [now, setNow] = useState(Date.now());
  const isRunning = status !== "resolved";

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const start = new Date(createdAt).getTime();
  const end = isRunning ? now : (processedAt ? new Date(processedAt).getTime() : now);
  const elapsed = Math.max(0, end - start);

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono font-semibold ${
      status === "pending" ? "text-emergency-panic" : status === "processing" ? "text-emergency-medical" : "text-green-400"
    }`}>
      <Timer className="w-3 h-3" />
      {formatElapsed(elapsed)}
    </span>
  );
}
