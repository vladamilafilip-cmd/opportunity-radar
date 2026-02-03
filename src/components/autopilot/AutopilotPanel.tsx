// src/components/autopilot/AutopilotPanel.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  Play,
  Pause,
  StopCircle,
  RotateCcw,
  Clock,
  Loader2,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useAutopilotStore } from '@/store/autopilotStore';
import { BucketAllocation } from './BucketAllocation';
import { RiskBudgetDisplay } from './RiskBudgetDisplay';
import type { AutopilotMode } from '@/types/autopilot';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const modeConfig: Record<AutopilotMode, { label: string; color: string; description: string }> = {
  off: { 
    label: 'OFF', 
    color: 'bg-muted text-muted-foreground', 
    description: 'Autopilot disabled' 
  },
  paper: { 
    label: 'PAPER', 
    color: 'bg-warning/20 text-warning border-warning/30', 
    description: 'Simulated trading' 
  },
  live: { 
    label: 'LIVE', 
    color: 'bg-destructive/20 text-destructive border-destructive/30', 
    description: 'Real trading (locked)' 
  },
};

export function AutopilotPanel() {
  const {
    mode,
    isRunning,
    killSwitchActive,
    killSwitchReason,
    lastScanTs,
    totalRealizedPnl,
    totalFundingCollected,
    bucketAllocation,
    riskBudget,
    isLoading,
    error,
    fetchState,
    fetchPositions,
    setMode,
    start,
    stop,
    stopAll,
    resetKillSwitch,
    subscribeToState,
    subscribeToPositions,
  } = useAutopilotStore();

  const [isChangingMode, setIsChangingMode] = useState(false);

  useEffect(() => {
    fetchState();
    fetchPositions();
    
    const unsubState = subscribeToState();
    const unsubPositions = subscribeToPositions();
    
    return () => {
      unsubState();
      unsubPositions();
    };
  }, []);

  const handleModeChange = async (newMode: AutopilotMode) => {
    if (newMode === 'live') return; // Locked
    setIsChangingMode(true);
    await setMode(newMode);
    setIsChangingMode(false);
  };

  const currentModeConfig = modeConfig[mode];

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Autopilot Control
          </CardTitle>
          <Badge className={cn(currentModeConfig.color, "font-mono")}>
            {currentModeConfig.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Mode Selector */}
        <div className="flex gap-2">
          {(['off', 'paper', 'live'] as AutopilotMode[]).map((m) => {
            const config = modeConfig[m];
            const isActive = mode === m;
            const isLocked = m === 'live';
            
            return (
              <Button
                key={m}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "flex-1 gap-1",
                  isActive && m === 'paper' && "bg-warning text-warning-foreground hover:bg-warning/90",
                  isLocked && "opacity-50"
                )}
                disabled={isChangingMode || isLoading || isLocked}
                onClick={() => handleModeChange(m)}
              >
                {isLocked && <Lock className="h-3 w-3" />}
                {config.label}
              </Button>
            );
          })}
        </div>

        {/* Running Status */}
        {mode !== 'off' && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm text-success">Running</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Stopped</span>
                </>
              )}
            </div>
            {lastScanTs && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last scan {formatDistanceToNow(new Date(lastScanTs), { addSuffix: true })}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Bucket Allocation */}
        <BucketAllocation allocation={bucketAllocation} />

        <Separator />

        {/* Risk Budget */}
        <RiskBudgetDisplay budget={riskBudget} killSwitchActive={killSwitchActive} />

        <Separator />

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 p-2 rounded-lg">
            <div className="text-xs text-muted-foreground">Realized PnL</div>
            <div className={cn(
              "text-lg font-mono",
              totalRealizedPnl >= 0 ? "text-success" : "text-destructive"
            )}>
              €{totalRealizedPnl.toFixed(2)}
            </div>
          </div>
          <div className="bg-muted/50 p-2 rounded-lg">
            <div className="text-xs text-muted-foreground">Funding Collected</div>
            <div className="text-lg font-mono text-success">
              €{totalFundingCollected.toFixed(2)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={start}
            disabled={isRunning || mode === 'off' || killSwitchActive || isLoading}
            className="flex-1 gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Start
          </Button>
          <Button
            variant="secondary"
            onClick={stop}
            disabled={!isRunning || isLoading}
            className="flex-1 gap-2"
          >
            <Pause className="h-4 w-4" />
            Stop
          </Button>
          <Button
            variant="destructive"
            onClick={stopAll}
            disabled={isLoading}
            className="gap-2"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        </div>

        {/* Kill Switch Reset */}
        {killSwitchActive && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                Kill Switch: {killSwitchReason || 'Risk limit exceeded'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={resetKillSwitch}
                className="gap-1 ml-2"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Warnings */}
        {mode === 'off' && (
          <Alert>
            <AlertDescription className="text-sm text-muted-foreground">
              Autopilot is OFF. Switch to PAPER mode to start simulated trading.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
