// src/components/autopilot/ExplainDrawer.tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  DollarSign, 
  Percent, 
  Clock, 
  Shield,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import type { AutopilotPosition, OpportunityCalc, RiskTier } from '@/types/autopilot';
import { autopilotConfig, getTotalCostBps } from '../../../config/autopilot';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ExplainDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: AutopilotPosition | null;
  opportunity?: OpportunityCalc | null;
}

const riskLabels: Record<RiskTier, { label: string; className: string }> = {
  safe: { label: 'SAFE', className: 'bg-success/20 text-success border-success/30' },
  medium: { label: 'MEDIUM', className: 'bg-warning/20 text-warning border-warning/30' },
  high: { label: 'HIGH', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

export function ExplainDrawer({ open, onOpenChange, position, opportunity }: ExplainDrawerProps) {
  // Use position data or opportunity data
  const data = position ? {
    symbol: position.symbol,
    longExchange: position.long_exchange,
    shortExchange: position.short_exchange,
    fundingSpread8h: position.entry_funding_spread_8h,
    score: position.entry_score,
    riskTier: position.risk_tier,
    sizeEur: position.size_eur,
    pnl: position.status === 'open' ? position.unrealized_pnl_eur : position.realized_pnl_eur ?? 0,
    pnlPercent: position.status === 'open' ? position.unrealized_pnl_percent : position.realized_pnl_percent ?? 0,
    fundingCollected: position.funding_collected_eur,
    intervals: position.intervals_collected,
    entryTime: position.entry_ts,
    status: position.status,
  } : opportunity ? {
    symbol: opportunity.symbol,
    longExchange: opportunity.longExchange,
    shortExchange: opportunity.shortExchange,
    fundingSpread8h: opportunity.fundingSpread8h,
    grossProfitBps: opportunity.grossProfitBps,
    netProfitBps: opportunity.netProfitBps,
    netProfitEur: opportunity.netProfitEur,
    apr: opportunity.apr,
    score: opportunity.score,
    riskTier: opportunity.riskTier,
    reasons: opportunity.reasons,
  } : null;

  if (!data) return null;

  const totalCostBps = getTotalCostBps();
  const risk = riskLabels[data.riskTier];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Trade Explanation
          </SheetTitle>
          <SheetDescription>
            {data.symbol} • {data.longExchange} ↔ {data.shortExchange}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Header Info */}
          <div className="flex items-center justify-between">
            <Badge className={risk.className}>{risk.label} RISK</Badge>
            <div className="text-2xl font-bold">Score: {data.score}</div>
          </div>

          <Separator />

          {/* Formula Breakdown */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Profit Calculation
            </h4>
            
            <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Funding Spread (8h)</span>
                <span className="text-primary">{(data.fundingSpread8h * 100).toFixed(4)}%</span>
              </div>
              
              {'grossProfitBps' in data && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Profit</span>
                  <span>{data.grossProfitBps.toFixed(1)} bps</span>
                </div>
              )}
              
              <Separator className="my-2" />
              
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Taker Fee (2x)</span>
                  <span>-{autopilotConfig.costs.takerFeeBps * 2} bps</span>
                </div>
                <div className="flex justify-between">
                  <span>Slippage Est.</span>
                  <span>-{autopilotConfig.costs.slippageBps} bps</span>
                </div>
                <div className="flex justify-between">
                  <span>Safety Buffer</span>
                  <span>-{autopilotConfig.costs.safetyBufferBps} bps</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Total Costs</span>
                  <span>-{totalCostBps} bps</span>
                </div>
              </div>
              
              <Separator className="my-2" />
              
              {'netProfitBps' in data && (
                <>
                  <div className="flex justify-between text-success font-bold">
                    <span>Net Profit</span>
                    <span>{data.netProfitBps.toFixed(1)} bps</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span>Per €10 Position</span>
                    <span>€{data.netProfitEur.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span>APR (Annualized)</span>
                    <span>{data.apr.toFixed(0)}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Position-specific info */}
          {position && 'pnl' in data && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Position Performance
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Size</div>
                    <div className="text-lg font-mono">€{data.sizeEur.toFixed(0)}</div>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={data.status === 'open' ? 'default' : 'secondary'}>
                      {data.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Unrealized PnL</div>
                    <div className={cn(
                      "text-lg font-mono flex items-center gap-1",
                      data.pnl >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {data.pnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      €{data.pnl.toFixed(3)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ({data.pnlPercent.toFixed(2)}%)
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Funding Collected</div>
                    <div className="text-lg font-mono text-success">
                      €{data.fundingCollected.toFixed(4)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {data.intervals} intervals
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Opened {formatDistanceToNow(new Date(data.entryTime), { addSuffix: true })}
                </div>
              </div>
            </>
          )}

          {/* Reasons */}
          {'reasons' in data && data.reasons && data.reasons.length > 0 && (
            <>
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Decision Factors
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {data.reasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Config Reference */}
          <Separator />
          
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium">Config Reference:</div>
            <div>Min Profit: {autopilotConfig.thresholds[data.riskTier].minProfitBps} bps</div>
            <div>Max Spread: {autopilotConfig.thresholds[data.riskTier].maxSpreadBps} bps</div>
            <div>Bucket Limit: {autopilotConfig.buckets[data.riskTier].maxPositions} positions</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
