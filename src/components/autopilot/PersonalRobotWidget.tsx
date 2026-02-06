// src/components/autopilot/PersonalRobotWidget.tsx
// Compact all-in-one widget for LIVE funding arbitrage bot

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  Play, 
  Pause, 
  Square, 
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Clock,
  Zap,
  Shield
} from 'lucide-react';
import { useAutopilotStore } from '@/store/autopilotStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function PersonalRobotWidget() {
  const {
    mode,
    isRunning,
    dryRunEnabled,
    killSwitchActive,
    killSwitchReason,
    lastScanTs,
    totalRealizedPnl,
    totalFundingCollected,
    positions,
    bucketAllocation,
    riskBudget,
    exchangeBalances,
    todayPnl,
    fetchState,
    fetchPositions,
    start,
    stop,
    stopAll,
    resetKillSwitch,
    setMode,
    subscribeToState,
    subscribeToPositions,
  } = useAutopilotStore();

  useEffect(() => {
    fetchState();
    fetchPositions();
    
    const unsubState = subscribeToState();
    const unsubPositions = subscribeToPositions();
    
    return () => {
      unsubState();
      unsubPositions();
    };
  }, [fetchState, fetchPositions, subscribeToState, subscribeToPositions]);

  const openPositions = positions.filter(p => p.status === 'open');
  const riskPercent = riskBudget.total > 0 ? (riskBudget.used / riskBudget.total) * 100 : 0;

  const handleRefresh = () => {
    fetchState();
    fetchPositions();
  };

  const handleModeChange = (newMode: 'off' | 'paper' | 'live') => {
    setMode(newMode);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            FUNDING ARBITRAGE BOT
          </CardTitle>
          {mode === 'live' && (
            <Badge className="bg-success/20 text-success border-success/30 uppercase font-mono">
              <Zap className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          )}
        </div>
        
        {/* Mode Toggle Buttons */}
        <div className="flex items-center gap-1 mt-2">
          <Button
            size="sm"
            variant={mode === 'off' ? 'default' : 'ghost'}
            onClick={() => handleModeChange('off')}
            className="h-7 text-xs"
          >
            OFF
          </Button>
          <Button
            size="sm"
            variant={mode === 'live' ? 'default' : 'ghost'}
            onClick={() => handleModeChange('live')}
            className="h-7 text-xs"
            disabled={killSwitchActive}
          >
            <Zap className="h-3 w-3 mr-1" />
            LIVE
          </Button>
          <Button
            size="sm"
            variant={mode === 'paper' ? 'secondary' : 'ghost'}
            onClick={() => handleModeChange('paper')}
            className={cn("h-7 text-xs", mode === 'paper' && "bg-warning/20 text-warning")}
          >
            TEST
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Risk Warning */}
        {mode === 'live' && (
          <Alert className="bg-muted/50 border-muted">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs text-muted-foreground">
              Market-neutral delta hedge strategy. Profit NOT guaranteed.
            </AlertDescription>
          </Alert>
        )}

        {/* Kill Switch Warning */}
        {killSwitchActive && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <strong>Kill Switch:</strong> {killSwitchReason || 'Risk limit'}
            </div>
            <Button size="sm" variant="destructive" onClick={resetKillSwitch}>
              Reset
            </Button>
          </div>
        )}

        {/* Status Line */}
        <div className="flex items-center gap-2 text-sm">
          <span className={cn(
            'h-2 w-2 rounded-full',
            isRunning ? 'bg-success animate-pulse' : 'bg-muted-foreground'
          )} />
          <span className="text-muted-foreground">
            {isRunning ? 'Running' : 'Stopped'}
            {lastScanTs && (
              <span className="ml-1">
                (scan {formatDistanceToNow(new Date(lastScanTs), { addSuffix: true })})
              </span>
            )}
          </span>
        </div>

        {/* Exchange Allocation - Compact */}
        <div className="grid grid-cols-3 gap-1 text-xs">
          {exchangeBalances.slice(0, 6).map((ex) => (
            <div key={ex.code} className="bg-muted/30 rounded px-2 py-1 text-center">
              <div className="font-medium truncate">{ex.name}</div>
              <div className="text-muted-foreground">€{ex.deployed}/{ex.allocation}</div>
            </div>
          ))}
        </div>

        {/* Bucket Allocation */}
        <div className="grid grid-cols-3 gap-2">
          {(['safe', 'medium', 'high'] as const).map((tier) => {
            const bucket = bucketAllocation[tier];
            const colors = {
              safe: 'text-success',
              medium: 'text-warning',
              high: 'text-destructive',
            };
            return (
              <div key={tier} className="text-center p-2 rounded-lg bg-muted/50">
                <div className={cn('text-xs font-semibold uppercase', colors[tier])}>
                  {tier}
                </div>
                <div className="text-lg font-mono">
                  {bucket.current} / {bucket.max}
                </div>
                <Progress value={bucket.percent} className="h-1 mt-1" />
              </div>
            );
          })}
        </div>

        {/* Risk Budget */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Deployed / Max</span>
            <span className="font-mono">
              €{riskBudget.used.toFixed(0)} / €{riskBudget.total.toFixed(0)}
              <span className={cn(
                "ml-1 text-xs",
                riskBudget.riskLevel === 'normal' ? 'text-success' :
                riskBudget.riskLevel === 'cautious' ? 'text-warning' : 'text-destructive'
              )}>
                ({riskBudget.riskLevel.toUpperCase()})
              </span>
            </span>
          </div>
          <Progress 
            value={riskPercent} 
            className={cn(
              'h-2',
              riskPercent > 80 ? '[&>div]:bg-destructive' : 
              riskPercent > 50 ? '[&>div]:bg-warning' : ''
            )}
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 py-2 border-t border-b border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Wallet className="h-3 w-3" />
              Today
            </div>
            <div className={cn(
              'font-mono font-semibold',
              todayPnl >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {todayPnl >= 0 ? '+' : ''}€{todayPnl.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Total
            </div>
            <div className={cn(
              'font-mono font-semibold',
              totalRealizedPnl >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {totalRealizedPnl >= 0 ? '+' : ''}€{totalRealizedPnl.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Funding
            </div>
            <div className="font-mono font-semibold text-success">
              €{totalFundingCollected.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button 
              className="flex-1" 
              onClick={start}
              disabled={mode === 'off' || killSwitchActive}
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          ) : (
            <Button 
              variant="secondary" 
              className="flex-1" 
              onClick={stop}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          <Button 
            variant="destructive" 
            onClick={stopAll}
            disabled={openPositions.length === 0}
          >
            <Square className="h-4 w-4 mr-2" />
            Stop All
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
