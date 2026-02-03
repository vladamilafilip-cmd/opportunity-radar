// src/components/autopilot/PersonalRobotWidget.tsx
// Compact all-in-one widget for personal robot control

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  Play, 
  Pause, 
  Square, 
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Clock
} from 'lucide-react';
import { useAutopilotStore } from '@/store/autopilotStore';
import { autopilotConfig } from '../../../config/autopilot';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function PersonalRobotWidget() {
  const {
    mode,
    isRunning,
    killSwitchActive,
    killSwitchReason,
    lastScanTs,
    totalRealizedPnl,
    totalFundingCollected,
    positions,
    bucketAllocation,
    riskBudget,
    fetchState,
    fetchPositions,
    start,
    stop,
    stopAll,
    resetKillSwitch,
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
  const todayPnl = openPositions.reduce((sum, p) => sum + p.unrealized_pnl_eur, 0);
  const riskPercent = riskBudget.total > 0 ? (riskBudget.used / riskBudget.total) * 100 : 0;

  const handleRefresh = () => {
    fetchState();
    fetchPositions();
  };

  const modeColor = {
    off: 'bg-muted text-muted-foreground',
    paper: 'bg-warning/20 text-warning border-warning/30',
    live: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            MY ROBOT
          </CardTitle>
          <Badge className={cn('uppercase font-mono', modeColor[mode])}>
            {mode} MODE
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Kill Switch Warning */}
        {killSwitchActive && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <strong>Kill Switch Active:</strong> {killSwitchReason || 'Risk limit reached'}
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
                (last scan {formatDistanceToNow(new Date(lastScanTs), { addSuffix: true })})
              </span>
            )}
          </span>
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
                <Progress 
                  value={bucket.percent} 
                  className="h-1 mt-1"
                />
              </div>
            );
          })}
        </div>

        {/* Risk Budget */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Risk Budget</span>
            <span className="font-mono">
              €{riskBudget.used.toFixed(2)} / €{riskBudget.total.toFixed(2)}
              <span className="text-muted-foreground ml-1">({riskPercent.toFixed(0)}%)</span>
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
