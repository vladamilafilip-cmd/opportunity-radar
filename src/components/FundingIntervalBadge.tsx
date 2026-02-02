import { Badge } from "@/components/ui/badge";
import { getFundingIntervalInfo } from "@/lib/fundingUtils";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FundingIntervalBadgeProps {
  exchange: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function FundingIntervalBadge({ 
  exchange, 
  showLabel = false,
  size = "sm",
  className 
}: FundingIntervalBadgeProps) {
  const info = getFundingIntervalInfo(exchange);
  
  const sizeClasses = size === "sm" 
    ? "text-[10px] px-1.5 py-0.5" 
    : "text-xs px-2 py-1";
  
  const tooltipContent = `${exchange} uses ${info.hours}h funding intervals (${info.paymentsPerDay} payments/day)`;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "font-mono font-medium border cursor-help",
              info.color,
              sizeClasses,
              className
            )}
          >
            <Clock className={cn("mr-1", size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
            {info.type}
            {showLabel && <span className="ml-1 opacity-80">{info.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
