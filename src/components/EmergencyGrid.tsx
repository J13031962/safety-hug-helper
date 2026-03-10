import { useState } from "react";
import { AlertTriangle, Heart, Flame, CloudLightning } from "lucide-react";

type AlarmType = "panic" | "medical" | "fire" | "disaster";

interface EmergencyButton {
  type: AlarmType;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  ringClass: string;
}

const buttons: EmergencyButton[] = [
  {
    type: "panic",
    label: "PÁNICO",
    icon: <AlertTriangle className="w-10 h-10" />,
    colorClass: "text-emergency-panic",
    bgClass: "bg-emergency-panic/15 hover:bg-emergency-panic/25 border-emergency-panic/30",
    ringClass: "ring-emergency-panic/40",
  },
  {
    type: "medical",
    label: "MÉDICA",
    icon: <Heart className="w-10 h-10" />,
    colorClass: "text-emergency-medical",
    bgClass: "bg-emergency-medical/15 hover:bg-emergency-medical/25 border-emergency-medical/30",
    ringClass: "ring-emergency-medical/40",
  },
  {
    type: "fire",
    label: "INCENDIO",
    icon: <Flame className="w-10 h-10" />,
    colorClass: "text-emergency-fire",
    bgClass: "bg-emergency-fire/15 hover:bg-emergency-fire/25 border-emergency-fire/30",
    ringClass: "ring-emergency-fire/40",
  },
  {
    type: "disaster",
    label: "DESASTRE",
    icon: <CloudLightning className="w-10 h-10" />,
    colorClass: "text-emergency-disaster",
    bgClass: "bg-emergency-disaster/15 hover:bg-emergency-disaster/25 border-emergency-disaster/30",
    ringClass: "ring-emergency-disaster/40",
  },
];

interface EmergencyGridProps {
  onSelect: (type: AlarmType) => void;
}

export default function EmergencyGrid({ onSelect }: EmergencyGridProps) {
  const [pressed, setPressed] = useState<AlarmType | null>(null);

  const handlePress = (type: AlarmType) => {
    setPressed(type);
    // Vibrate if supported
    if (navigator.vibrate) navigator.vibrate(200);
    onSelect(type);
    setTimeout(() => setPressed(null), 600);
  };

  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-md mx-auto">
      {buttons.map((btn) => (
        <button
          key={btn.type}
          onClick={() => handlePress(btn.type)}
          className={`
            relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2
            transition-all duration-200 cursor-pointer select-none
            ${btn.bgClass} ${btn.colorClass}
            ${pressed === btn.type ? "animate-shake scale-95" : "hover:scale-[1.02]"}
            focus:outline-none focus:ring-4 ${btn.ringClass}
          `}
          style={{ aspectRatio: "1" }}
        >
          {/* Ripple effect */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            {pressed === btn.type && (
              <span className="absolute inset-0 animate-ripple rounded-2xl bg-current opacity-20" />
            )}
          </div>
          {/* Pulse ring */}
          <div className="animate-emergency-pulse">
            {btn.icon}
          </div>
          <span className="font-display font-bold text-lg tracking-wider">{btn.label}</span>
        </button>
      ))}
    </div>
  );
}
