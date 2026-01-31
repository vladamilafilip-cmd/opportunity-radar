import { cn } from "@/lib/utils";
import type { RiskTier } from "@/types";

interface RiskBadgeProps {
  tier: RiskTier;
  className?: string;
}

export function RiskBadge({ tier, className }: RiskBadgeProps) {
  const variants = {
    safe: "bg-success/20 text-success border-success/30",
    medium: "bg-warning/20 text-warning border-warning/30",
    high: "bg-danger/20 text-danger border-danger/30",
  };

  const labels = {
    safe: "SAFE",
    medium: "MEDIUM",
    high: "HIGH",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        variants[tier],
        className
      )}
    >
      {labels[tier]}
    </span>
  );
}
