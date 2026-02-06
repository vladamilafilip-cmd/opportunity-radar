// src/components/bot/ModeToggle.tsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, TestTube } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutopilotMode } from '@/types/autopilot';

interface ModeToggleProps {
  mode: AutopilotMode;
  onModeChange: (mode: AutopilotMode) => void;
  disabled?: boolean;
}

export function ModeToggle({ mode, onModeChange, disabled }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={mode === 'paper' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('paper')}
        disabled={disabled}
        className={cn(
          "gap-1.5 font-mono",
          mode === 'paper' && "bg-warning text-warning-foreground hover:bg-warning/90"
        )}
      >
        <TestTube className="h-3.5 w-3.5" />
        TEST
      </Button>
      <Button
        variant={mode === 'live' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('live')}
        disabled={disabled}
        className={cn(
          "gap-1.5 font-mono",
          mode === 'live' && "bg-success text-success-foreground hover:bg-success/90"
        )}
      >
        <Zap className="h-3.5 w-3.5" />
        LIVE
      </Button>
      
      {mode !== 'off' && (
        <Badge 
          variant="outline" 
          className={cn(
            "ml-2 font-mono text-xs",
            mode === 'paper' && "border-warning/50 text-warning",
            mode === 'live' && "border-success/50 text-success"
          )}
        >
          {mode === 'paper' ? 'NO REAL TRADES' : 'REAL MONEY'}
        </Badge>
      )}
    </div>
  );
}
