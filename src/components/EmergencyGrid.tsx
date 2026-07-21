import { useState } from "react";
import { ShieldAlert, Heart, Flame, AlertTriangle, HeartHandshake } from "lucide-react";

type AlarmType = "panic" | "medical" | "fire" | "disaster" | "domestic";

interface EmergencyButton {
  type: AlarmType;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  bgClass: string;
}

const buttons: EmergencyButton[] = [
  {
    type: "panic",
    label: "PÁNICO",
    subtitle: "Alerta inmediata",
    icon: <ShieldAlert className="w-8 h-8" />,
    bgClass: "bg-emergency-panic",
  },
  {
    type: "medical",
    label: "MÉDICA",
    subtitle: "Emergencia médica",
    icon: <Heart className="w-8 h-8" />,
    bgClass: "bg-emergency-medical",
  },
  {
    type: "fire",
    label: "INCENDIO",
    subtitle: "Emergencia fuego",
    icon: <Flame className="w-8 h-8" />,
    bgClass: "bg-emergency-fire",
  },
  {
    type: "disaster",
    label: "DESASTRE",
    subtitle: "Desastre natural",
    icon: <AlertTriangle className="w-8 h-8" />,
    bgClass: "bg-emergency-disaster",
  },
];

const domesticButton: EmergencyButton = {
  type: "domestic",
  label: "VIOLENCIA",
  subtitle: "Intrafamiliar",
  icon: <HeartHandshake className="w-8 h-8" />,
  bgClass: "bg-emergency-domestic",
};

interface EmergencyGridProps {
  onSelect: (type: AlarmType) => void;
}

export default function EmergencyGrid({ onSelect }: EmergencyGridProps) {
  const [pressed, setPressed] = useState<AlarmType | null>(null);

  const handlePress = (type: AlarmType) => {
    setPressed(type);
    if (navigator.vibrate) navigator.vibrate(200);
    onSelect(type);
    setTimeout(() => setPressed(null), 600);
  };

  const renderButton = (btn: EmergencyButton) => (
    <button
      key={btn.type}
      onClick={() => handlePress(btn.type)}
      className={`
        relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl
        transition-all duration-200 cursor-pointer select-none
        ${btn.bgClass} text-foreground
        ${pressed === btn.type ? "animate-shake scale-95" : "hover:scale-[1.03] hover:brightness-110"}
        focus:outline-none
      `}
      style={{ aspectRatio: "1" }}
    >
      <div className={pressed === btn.type ? "" : "animate-emergency-pulse"}>
        {btn.icon}
      </div>
      <span className="font-display font-bold text-base tracking-wider">{btn.label}</span>
      <span className="text-xs opacity-80 font-medium">{btn.subtitle}</span>
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[280px] mx-auto">
      <div className="grid grid-cols-2 gap-3 w-full">
        {buttons.map(renderButton)}
      </div>
      <div className="w-[calc(50%-0.375rem)]">
        {renderButton(domesticButton)}
      </div>
    </div>
  );
}
