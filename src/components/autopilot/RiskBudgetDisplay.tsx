// src/components/autopilot/RiskBudgetDisplay.tsx
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Activity } from 'lucide-react';
import type { RiskBudget } from '@/types/autopilot';
import { cn } from '@/lib/utils';

interface RiskBudgetDisplayProps {
  budget: RiskBudget;
  killSwitchActive?: boolean;
}

export function RiskBudgetDisplay({ budget, killSwitchActive }: RiskBudgetDisplayProps) {
  const usedPercent = (budget.used / budget.total) * 100;
  const drawdownPercent = (budget.dailyDrawdown / budget.total) * 100;
  
  const isHighRisk = usedPercent > 80 || drawdownPercent > 50;
  const isCritical = usedPercent > 95 || drawdownPercent > 80 || killSwitchActive;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Risk Budget
        </h4>
        {killSwitchActive && (
          <Badge variant="destructive" className="animate-pulse">
            KILL SWITCH
          </Badge>
        )}
      </div>
      
      {/* Exposure */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span>Exposure</span>
          <span className={cn(
            "font-mono",
            isCritical ? "text-destructive" : isHighRisk ? "text-warning" : "text-foreground"
          )}>
            €{budget.used.toFixed(2)} / €{budget.total.toFixed(2)}
          </span>
        </div>
        <Progress 
          value={Math.min(usedPercent, 100)} 
          className={cn(
            "h-2",
            isCritical && "bg-destructive/20"
          )}
        />
      </div>
      
      {/* Daily Drawdown */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-muted-foreground" />
            Daily Drawdown
          </span>
          <span className={cn(
            "font-mono",
            drawdownPercent > 50 ? "text-destructive" : "text-muted-foreground"
          )}>
            €{budget.dailyDrawdown.toFixed(2)}
          </span>
        </div>
        <Progress 
          value={Math.min(drawdownPercent, 100)} 
          className="h-1.5"
        />
      </div>
      
      {/* Stress Test */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Stress Test (2x)
        </span>
        <span className="font-mono">
          €{budget.stressTestExposure.toFixed(2)}
        </span>
      </div>
      
      {/* Warning Messages */}
      {isHighRisk && !killSwitchActive && (
        <div className="p-2 bg-warning/10 border border-warning/30 rounded text-xs text-warning">
          ⚠️ High risk exposure. Consider reducing positions.
        </div>
      )}
      
      {killSwitchActive && (
        <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
          🛑 Kill switch activated. Manual intervention required.
        </div>
      )}
    </div>
  );
}
