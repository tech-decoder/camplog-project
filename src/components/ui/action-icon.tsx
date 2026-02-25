"use client";

import {
  TrendingUp,
  TrendingDown,
  Pause,
  MapPinOff,
  Play,
  MapPin,
  Copy,
  PlusCircle,
  PenTool,
  DollarSign,
  Users,
  Wallet,
  CircleDot,
  type LucideProps,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  pause: Pause,
  "map-pin-off": MapPinOff,
  play: Play,
  "map-pin": MapPin,
  copy: Copy,
  "plus-circle": PlusCircle,
  "pen-tool": PenTool,
  "dollar-sign": DollarSign,
  users: Users,
  wallet: Wallet,
  "circle-dot": CircleDot,
};

interface ActionIconProps extends LucideProps {
  iconName: string;
}

export function ActionIcon({ iconName, ...props }: ActionIconProps) {
  const Icon = iconMap[iconName] || CircleDot;
  return <Icon {...props} />;
}
