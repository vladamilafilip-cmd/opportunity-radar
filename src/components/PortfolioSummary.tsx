import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PnLDisplay } from "./PnLDisplay";
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Clock, 
  DollarSign,
  Target,
  Percent
} from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";
import { 
  simulateFundingCollected, 
  estimateDailyIncome, 
  formatDurationSinceOpen,
  getNextFundingTime,
  formatTimeUntilFunding
} from "@/lib/fundingUtils";
import { FundingCountdown } from "./FundingCountdown";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function StatCard({ title, icon, children, className }: StatCardProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <div className="font-semibold">
        {children}
      </div>
    </div>
  );
}

export function PortfolioSummary() {
  const { positions, stats, trades } = useTradingStore();
  const [, setTick] = useState(0);
  
  // Force re-render every 5 seconds for live updates
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);
  
  const openPositions = positions.filter(p => p.status === 'open');
  
  // Calculate totals
  const totalUnrealizedPnL = openPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalRealizedPnL = stats.totalPnl;
  
  // Calculate estimated funding collected and daily income
  const fundingData = openPositions.map(pos => {
    const fundingCollected = simulateFundingCollected(
      pos.size,
      pos.openedAt,
      pos.longExchange,
      pos.shortExchange,
      0.15 // Average spread assumption
    );
    
    const dailyIncome = estimateDailyIncome(
      pos.size,
      0.15,
      pos.longExchange,
      pos.shortExchange
    );
    
    return { fundingCollected, dailyIncome };
  });
  
  const totalFundingCollected = fundingData.reduce((sum, d) => sum + d.fundingCollected, 0);
  const totalDailyIncome = fundingData.reduce((sum, d) => sum + d.dailyIncome, 0);
  
  // Get unique exchanges for next funding events
  const allExchanges = openPositions.flatMap(p => [p.longExchange, p.shortExchange]);
  const uniqueExchanges = [...new Set(allExchanges)].slice(0, 4);
  
  // Sort by next funding time
  const sortedExchanges = uniqueExchanges.sort((a, b) => {
    return getNextFundingTime(a).getTime() - getNextFundingTime(b).getTime();
  });

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5 text-primary" />
          Portfolio Overview
          {openPositions.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {openPositions.length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Open Positions" 
            icon={<Target className="h-3.5 w-3.5" />}
          >
            <span className="text-2xl">{openPositions.length}</span>
          </StatCard>
          
          <StatCard 
            title="Unrealized P&L" 
            icon={totalUnrealizedPnL >= 0 ? 
              <TrendingUp className="h-3.5 w-3.5 text-success" /> : 
              <TrendingDown className="h-3.5 w-3.5 text-danger" />
            }
          >
            <PnLDisplay value={totalUnrealizedPnL} size="lg" />
          </StatCard>
          
          <StatCard 
            title="Realized P&L" 
            icon={<DollarSign className="h-3.5 w-3.5" />}
          >
            <PnLDisplay value={totalRealizedPnL} size="lg" />
          </StatCard>
          
          <StatCard 
            title="Est. Daily Income" 
            icon={<Coins className="h-3.5 w-3.5 text-warning" />}
          >
            <span className={cn(
              "text-lg",
              totalDailyIncome > 0 ? "text-success" : "text-muted-foreground"
            )}>
              ~${totalDailyIncome.toFixed(2)}/day
            </span>
          </StatCard>
        </div>
        
        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/50">
          <StatCard 
            title="Funding Collected" 
            icon={<Coins className="h-3.5 w-3.5 text-success" />}
          >
            <span className="text-success">+${totalFundingCollected.toFixed(2)}</span>
          </StatCard>
          
          <StatCard 
            title="Total Trades" 
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          >
            <span>{stats.totalTrades}</span>
          </StatCard>
          
          <StatCard 
            title="Win Rate" 
            icon={<Percent className="h-3.5 w-3.5" />}
          >
            <span className={cn(
              stats.winRate >= 50 ? "text-success" : "text-danger"
            )}>
              {stats.winRate.toFixed(1)}%
            </span>
          </StatCard>
          
          <StatCard 
            title="Monthly Est." 
            icon={<DollarSign className="h-3.5 w-3.5 text-primary" />}
          >
            <span className="text-primary">
              ~${(totalDailyIncome * 30).toFixed(0)}/mo
            </span>
          </StatCard>
        </div>
        
        {/* Next Funding Events */}
        {sortedExchanges.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">
                Next Funding Events:
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {sortedExchanges.map(exchange => (
                <div 
                  key={exchange}
                  className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50"
                >
                  <span className="text-xs font-medium">{exchange}</span>
                  <FundingCountdown exchange={exchange} showExchange={false} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {openPositions.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No open positions</p>
            <p className="text-xs">Open a position from the Funding Arbitrage table to start tracking</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
