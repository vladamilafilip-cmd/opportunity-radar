// src/components/bot/CapitalWidget.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { autopilotConfig } from '../../../config/autopilot';

interface CapitalWidgetProps {
  deployedEur: number;
  todayPnl: number;
  totalPnl: number;
  fundingCollected: number;
  unrealizedPnl: number;
}

export function CapitalWidget({ 
  deployedEur, 
  todayPnl, 
  totalPnl,
  fundingCollected,
  unrealizedPnl 
}: CapitalWidgetProps) {
  const { totalUsd, totalEur, maxDeployedEur } = autopilotConfig.capital;
  const deployedPercent = (deployedEur / maxDeployedEur) * 100;
  const todayRoi = totalEur > 0 ? (todayPnl / totalEur) * 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Capital Status */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Wallet className="h-3.5 w-3.5" />
            CAPITAL
          </div>
          <div className="text-2xl font-mono font-bold">
            ${totalUsd}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            €{deployedEur.toFixed(0)} / €{maxDeployedEur} deployed
          </div>
          <Progress value={deployedPercent} className="h-1.5 mt-2" />
        </CardContent>
      </Card>

      {/* Today PnL */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            {todayPnl >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            TODAY
          </div>
          <div className={cn(
            "text-2xl font-mono font-bold",
            todayPnl >= 0 ? "text-success" : "text-destructive"
          )}>
            {todayPnl >= 0 ? '+' : ''}${(todayPnl * 1.09).toFixed(2)}
          </div>
          <div className={cn(
            "text-xs mt-1",
            todayPnl >= 0 ? "text-success/70" : "text-destructive/70"
          )}>
            {todayRoi >= 0 ? '+' : ''}{todayRoi.toFixed(2)}% ROI
          </div>
        </CardContent>
      </Card>

      {/* Total PnL */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <DollarSign className="h-3.5 w-3.5" />
            TOTAL PnL
          </div>
          <div className={cn(
            "text-2xl font-mono font-bold",
            totalPnl >= 0 ? "text-success" : "text-destructive"
          )}>
            {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            All time realized
          </div>
        </CardContent>
      </Card>

      {/* Unrealized PnL */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            {unrealizedPnl >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            UNREALIZED
          </div>
          <div className={cn(
            "text-2xl font-mono font-bold",
            unrealizedPnl >= 0 ? "text-primary" : "text-destructive"
          )}>
            {unrealizedPnl >= 0 ? '+' : ''}€{unrealizedPnl.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Open positions
          </div>
        </CardContent>
      </Card>

      {/* Funding Collected */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-success" />
            FUNDING
          </div>
          <div className="text-2xl font-mono font-bold text-success">
            €{fundingCollected.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Collected from spreads
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
