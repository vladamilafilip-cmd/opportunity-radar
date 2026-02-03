// src/components/autopilot/ExchangeAllocation.tsx
// Detailed exchange balance allocation display

import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ExchangeBalance } from '@/types/autopilot';

interface ExchangeAllocationProps {
  balances: ExchangeBalance[];
  compact?: boolean;
  showPurpose?: boolean;
  totalCapital?: number;
  bufferAmount?: number;
}

const purposeColors = {
  long: 'text-success',
  short: 'text-destructive',
  both: 'text-primary',
};

const purposeLabels = {
  long: 'LONG',
  short: 'SHORT',
  both: 'BOTH',
};

export function ExchangeAllocation({ 
  balances, 
  compact = false, 
  showPurpose = true,
  totalCapital = 200,
  bufferAmount = 40,
}: ExchangeAllocationProps) {
  const totalDeployed = balances.reduce((sum, b) => sum + b.deployed, 0);
  const totalAllocated = balances.reduce((sum, b) => sum + b.allocation, 0);
  const maxDeployable = totalCapital - bufferAmount;

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-1 text-xs">
        {balances.slice(0, 6).map((ex) => {
          const percent = ex.allocation > 0 ? (ex.deployed / ex.allocation) * 100 : 0;
          return (
            <TooltipProvider key={ex.code}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-muted/30 rounded px-2 py-1 text-center cursor-help">
                    <div className="font-medium truncate">{ex.name}</div>
                    <div className="text-muted-foreground">
                      €{ex.deployed}/{ex.allocation}
                    </div>
                    <Progress value={percent} className="h-1 mt-1" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold">{ex.name}</div>
                    <div>Purpose: {purposeLabels[ex.purpose]}</div>
                    <div>Deployed: €{ex.deployed}</div>
                    <div>Allocated: €{ex.allocation}</div>
                    <div>Available: €{ex.available}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">EXCHANGE ALLOCATION</span>
        <span className="text-muted-foreground">
          Total: €{totalDeployed}/€{maxDeployable}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {balances.map((ex) => {
          const percent = ex.allocation > 0 ? (ex.deployed / ex.allocation) * 100 : 0;
          const isFullyDeployed = ex.deployed >= ex.allocation;
          
          return (
            <TooltipProvider key={ex.code}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "bg-muted/50 rounded-lg p-3 cursor-help transition-colors",
                    isFullyDeployed && "bg-warning/10 border border-warning/30"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{ex.name}</span>
                      {showPurpose && (
                        <span className={cn("text-xs font-mono", purposeColors[ex.purpose])}>
                          {purposeLabels[ex.purpose]}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-lg font-mono mb-2">
                      €{ex.deployed}
                      <span className="text-muted-foreground text-sm">/{ex.allocation}</span>
                    </div>
                    
                    <Progress 
                      value={percent} 
                      className={cn(
                        "h-2",
                        isFullyDeployed && "[&>div]:bg-warning"
                      )}
                    />
                    
                    <div className="text-xs text-muted-foreground mt-1">
                      Available: €{ex.available}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-xs space-y-1">
                    <div className="font-semibold">{ex.name} ({ex.code})</div>
                    <div>Purpose: {purposeLabels[ex.purpose]} positions</div>
                    <div>Deployed: €{ex.deployed} ({percent.toFixed(0)}%)</div>
                    <div>Max Allocation: €{ex.allocation}</div>
                    <div>Available for new: €{ex.available}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-success/10 border border-success/30">
        <span className="text-success font-medium">Buffer Reserved</span>
        <span className="font-mono">€{bufferAmount} ✓</span>
      </div>
    </div>
  );
}
