import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PnLDisplay } from "./PnLDisplay";
import { FundingIntervalBadge } from "./FundingIntervalBadge";
import { FundingCountdown } from "./FundingCountdown";
import { 
  X, 
  Clock, 
  ArrowRightLeft, 
  Coins, 
  Timer,
  TrendingUp,
  DollarSign
} from "lucide-react";
import type { PaperPosition } from "@/types";
import { 
  formatDurationSinceOpen, 
  simulateFundingCollected,
  calculateFundingPayments,
  estimateDailyIncome
} from "@/lib/fundingUtils";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface PositionCardProps {
  position: PaperPosition;
  onClose: (id: string) => void;
  isLoading?: boolean;
}

export function PositionCard({ position, onClose, isLoading }: PositionCardProps) {
  const [, setTick] = useState(0);
  
  // Force re-render every second for live updates
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  
  const timeOpen = formatDurationSinceOpen(position.openedAt);
  const fundingCollected = simulateFundingCollected(
    position.size,
    position.openedAt,
    position.longExchange,
    position.shortExchange,
    0.15 // Average spread
  );
  
  const payments = calculateFundingPayments(
    position.openedAt,
    position.longExchange,
    position.shortExchange
  );
  
  const dailyIncome = estimateDailyIncome(
    position.size,
    0.15,
    position.longExchange,
    position.shortExchange
  );
  
  const expectedNextFunding = position.size * 0.0015; // ~0.15% of position
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{position.symbol}</h3>
              <Badge variant="outline" className="text-[10px]">
                ${position.size.toLocaleString()}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              <span>Open for {timeOpen}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-danger"
            onClick={() => onClose(position.id)}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Exchange Info */}
        <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-muted/30">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-success font-medium">Long:</span>
            <span className="text-xs">{position.longExchange}</span>
            <FundingIntervalBadge exchange={position.longExchange} size="sm" />
          </div>
          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-danger font-medium">Short:</span>
            <span className="text-xs">{position.shortExchange}</span>
            <FundingIntervalBadge exchange={position.shortExchange} size="sm" />
          </div>
        </div>
        
        {/* P&L Section */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Unrealized P&L
            </span>
            <PnLDisplay 
              value={position.unrealizedPnl} 
              percent={position.unrealizedPnlPercent}
              size="md"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" />
              Funding Collected
            </span>
            <div className="flex items-center gap-1">
              <span className="text-success font-mono font-semibold">
                +${fundingCollected.toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({payments.totalPayments} intervals)
              </span>
            </div>
          </div>
        </div>
        
        {/* Next Funding & Income */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Next Funding
            </span>
            <div className="flex items-center gap-2">
              <FundingCountdown 
                exchange={position.longExchange} 
                showExchange={false}
                size="md"
              />
              <span className="text-[10px] text-muted-foreground">
                (~+${expectedNextFunding.toFixed(2)})
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Est. Daily Income
            </span>
            <span className="text-success font-mono font-medium">
              ~${dailyIncome.toFixed(2)}/day
            </span>
          </div>
        </div>
        
        {/* Entry Price Info */}
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Entry: <span className="font-mono">${position.entryPrice.toLocaleString()}</span>
          </div>
          <div>
            Current: <span className="font-mono">${position.currentPrice.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
