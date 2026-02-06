// src/components/autopilot/AutopilotStatus.tsx
// Compact status widget for header/navbar

import { Badge } from '@/components/ui/badge';
import { Bot, Activity, AlertTriangle, Zap } from 'lucide-react';
import { useAutopilotStore } from '@/store/autopilotStore';
import { cn } from '@/lib/utils';

interface AutopilotStatusProps {
  compact?: boolean;
  onClick?: () => void;
}

export function AutopilotStatus({ compact = false, onClick }: AutopilotStatusProps) {
  const { mode, isRunning, killSwitchActive, dryRunEnabled, bucketAllocation } = useAutopilotStore();

  const totalPositions = 
    bucketAllocation.safe.current + 
    bucketAllocation.medium.current + 
    bucketAllocation.high.current;

  if (mode === 'off') {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity",
          compact && "text-xs"
        )}
        onClick={onClick}
      >
        <Bot className={cn("text-muted-foreground", compact ? "h-4 w-4" : "h-5 w-5")} />
        {!compact && <span className="text-muted-foreground">Autopilot OFF</span>}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity",
        compact && "text-xs"
      )}
      onClick={onClick}
    >
      {killSwitchActive ? (
        <>
          <AlertTriangle className={cn("text-destructive animate-pulse", compact ? "h-4 w-4" : "h-5 w-5")} />
          {!compact && <span className="text-destructive">Kill Switch</span>}
        </>
      ) : isRunning ? (
        <>
          <Activity className={cn("text-success animate-pulse", compact ? "h-4 w-4" : "h-5 w-5")} />
          {!compact && (
            <Badge variant="outline" className="bg-success/20 text-success border-success/30">
              {totalPositions} hedge{totalPositions !== 1 ? 's' : ''}
            </Badge>
          )}
        </>
      ) : (
        <>
          <Bot className={cn("text-warning", compact ? "h-4 w-4" : "h-5 w-5")} />
          {!compact && <span className="text-warning">Paused</span>}
        </>
      )}
      
      {!compact && (
        <div className="flex items-center gap-1">
          {dryRunEnabled && (
            <Badge variant="outline" className="text-xs bg-warning/20 text-warning border-warning/30">
              DRY
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              mode === 'test' && "bg-warning/20 text-warning border-warning/30",
              mode === 'live' && "bg-success/20 text-success border-success/30"
            )}
          >
            {mode === 'live' && <Zap className="h-2 w-2 mr-1" />}
            {mode.toUpperCase()}
          </Badge>
        </div>
      )}
    </div>
  );
}
