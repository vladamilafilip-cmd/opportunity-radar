import { cn } from "@/lib/utils";
import { calculateAPR, calculateNetProfit, getFundingInterval } from "@/lib/fundingUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, Info } from "lucide-react";

interface APRDisplayProps {
  spreadPercent: number;
  longExchange?: string;
  shortExchange?: string;
  intervalHours?: number;
  positionSize?: number;
  showBreakdown?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function APRDisplay({ 
  spreadPercent, 
  longExchange,
  shortExchange,
  intervalHours,
  positionSize = 10000,
  showBreakdown = true,
  size = "md",
  className 
}: APRDisplayProps) {
  // Use the shorter interval for APR calculation (more favorable)
  const effectiveInterval = intervalHours ?? Math.min(
    getFundingInterval(longExchange || 'Binance'),
    getFundingInterval(shortExchange || 'Binance')
  );
  
  const apr = calculateAPR(spreadPercent, effectiveInterval);
  const netProfit = calculateNetProfit(spreadPercent, positionSize);
  
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-semibold",
  };
  
  // Color based on APR value
  const getAPRColor = (apr: number) => {
    if (apr >= 500) return "text-success";
    if (apr >= 200) return "text-warning";
    if (apr >= 100) return "text-primary";
    return "text-muted-foreground";
  };
  
  const aprColor = getAPRColor(apr);
  
  const breakdownContent = (
    <div className="space-y-2 text-xs">
      <div className="font-semibold text-sm mb-2">APR Calculation</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Spread per interval:</span>
          <span className="font-mono">{spreadPercent.toFixed(3)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Funding interval:</span>
          <span className="font-mono">{effectiveInterval}h</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Intervals per year:</span>
          <span className="font-mono">{Math.round((365 * 24) / effectiveInterval)}</span>
        </div>
        <div className="border-t border-border/50 my-2" />
        <div className="flex justify-between gap-4 font-semibold">
          <span>Annual Percentage Rate:</span>
          <span className={aprColor}>{apr.toFixed(0)}%</span>
        </div>
      </div>
      
      <div className="border-t border-border/50 pt-2 mt-2">
        <div className="font-semibold text-sm mb-2">Net Profit Breakdown (${positionSize.toLocaleString()})</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Gross profit:</span>
            <span className="font-mono text-success">+${netProfit.gross.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Taker fees (8bps):</span>
            <span className="font-mono text-danger">-${netProfit.fees.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Est. slippage (2bps):</span>
            <span className="font-mono text-danger">-${netProfit.slippage.toFixed(2)}</span>
          </div>
          <div className="border-t border-border/50 my-1" />
          <div className="flex justify-between gap-4 font-semibold">
            <span>Net profit per interval:</span>
            <span className={netProfit.net >= 0 ? "text-success" : "text-danger"}>
              ${netProfit.net.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
        * APR assumes consistent spreads. Actual returns may vary.
        <br />* Does not account for liquidation risk or margin requirements.
      </div>
    </div>
  );
  
  if (!showBreakdown) {
    return (
      <span className={cn("font-mono", sizeClasses[size], aprColor, className)}>
        {apr.toFixed(0)}%
      </span>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1 cursor-help",
            sizeClasses[size],
            aprColor,
            className
          )}>
            <TrendingUp className={cn(
              size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4"
            )} />
            <span className="font-mono font-semibold">{apr.toFixed(0)}%</span>
            <Info className="h-3 w-3 opacity-50" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {breakdownContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
