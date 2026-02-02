import { useState, useEffect } from "react";
import { getNextFundingTime, formatTimeUntilFunding, getFundingIntervalInfo } from "@/lib/fundingUtils";
import { cn } from "@/lib/utils";
import { Timer, Zap } from "lucide-react";

interface FundingCountdownProps {
  exchange: string;
  showExchange?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FundingCountdown({ 
  exchange, 
  showExchange = true,
  size = "md",
  className 
}: FundingCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);
  
  useEffect(() => {
    const updateCountdown = () => {
      const nextFunding = getNextFundingTime(exchange);
      const formatted = formatTimeUntilFunding(nextFunding);
      setTimeRemaining(formatted);
      
      // Check if less than 30 minutes remaining
      const diffMs = nextFunding.getTime() - Date.now();
      setIsUrgent(diffMs < 30 * 60 * 1000);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [exchange]);
  
  const info = getFundingIntervalInfo(exchange);
  
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-medium",
  };
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 font-mono",
      sizeClasses[size],
      isUrgent ? "text-warning animate-pulse" : "text-success",
      className
    )}>
      {isUrgent ? (
        <Zap className={cn(
          "text-warning",
          size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4"
        )} />
      ) : (
        <Timer className={cn(
          "text-success",
          size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4"
        )} />
      )}
      <span className={cn(
        "font-semibold",
        isUrgent ? "text-warning" : "text-success"
      )}>
        {timeRemaining}
      </span>
      {showExchange && (
        <span className="text-muted-foreground text-[10px]">
          ({exchange})
        </span>
      )}
    </div>
  );
}

interface MultiExchangeCountdownProps {
  exchanges: string[];
  className?: string;
}

export function MultiExchangeCountdown({ exchanges, className }: MultiExchangeCountdownProps) {
  const uniqueExchanges = [...new Set(exchanges)];
  
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {uniqueExchanges.map(exchange => (
        <FundingCountdown 
          key={exchange} 
          exchange={exchange} 
          size="sm"
        />
      ))}
    </div>
  );
}
