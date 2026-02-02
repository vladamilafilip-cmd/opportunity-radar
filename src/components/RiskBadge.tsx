import { cn } from "@/lib/utils";
import type { RiskTier } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

interface RiskBadgeProps {
  tier: RiskTier;
  className?: string;
  showTooltip?: boolean;
  isMeme?: boolean;
  volatilityMultiplier?: number;
}

const riskDescriptions: Record<RiskTier, string> = {
  safe: "Blue-chip kriptovalute sa visokom likvidnošću i stabilnim funding rate-ovima. Najniži rizik.",
  medium: "Etablirani altcoini sa umerenom volatilnošću. Srednji rizik - potrebna opreznost.",
  high: "Visokorizični parovi sa ekstremnom volatilnošću. Mogućnost značajnih gubitaka!",
};

const riskIcons: Record<RiskTier, React.ReactNode> = {
  safe: <CheckCircle className="h-3 w-3" />,
  medium: <AlertCircle className="h-3 w-3" />,
  high: <AlertTriangle className="h-3 w-3" />,
};

export function RiskBadge({ 
  tier, 
  className, 
  showTooltip = true,
  isMeme = false,
  volatilityMultiplier
}: RiskBadgeProps) {
  const variants = {
    safe: "bg-success/20 text-success border-success/30",
    medium: "bg-warning/20 text-warning border-warning/30",
    high: cn(
      "bg-danger/20 text-danger border-danger/30",
      "animate-pulse" // Pulse animation for high risk
    ),
  };

  const labels = {
    safe: "SAFE",
    medium: "MEDIUM",
    high: isMeme ? "MEME ⚠️" : "HIGH",
  };

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border",
        variants[tier],
        tier === 'high' && "shadow-sm shadow-danger/20",
        className
      )}
    >
      {riskIcons[tier]}
      {labels[tier]}
      {volatilityMultiplier && volatilityMultiplier > 1.5 && (
        <span className="text-[10px] opacity-75">
          {volatilityMultiplier.toFixed(1)}x
        </span>
      )}
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1">
              {riskIcons[tier]}
              {tier.toUpperCase()} RIZIK
            </p>
            <p className="text-xs text-muted-foreground">
              {riskDescriptions[tier]}
            </p>
            {isMeme && (
              <p className="text-xs text-danger font-medium mt-1">
                ⚠️ MEME COIN - Ekstremna volatilnost!
              </p>
            )}
            {volatilityMultiplier && volatilityMultiplier > 2 && (
              <p className="text-xs text-danger">
                Volatilnost: {volatilityMultiplier.toFixed(1)}x veća od normalnog
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
