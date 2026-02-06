// src/components/bot/OpportunitiesTable.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Loader2, Shield, AlertTriangle, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RiskTier = 'safe' | 'medium' | 'high';

export interface Opportunity {
  id: string;
  symbol: string;
  longExchange: string;
  shortExchange: string;
  spreadBps: number;
  apr: number;
  score: number;
  riskTier: RiskTier;
  isNew?: boolean;
}

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  onEnter?: (opportunity: Opportunity) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const riskConfig: Record<RiskTier, { label: string; color: string; icon: typeof Shield }> = {
  safe: { 
    label: 'SAFE', 
    color: 'bg-success/20 text-success border-success/30',
    icon: Shield,
  },
  medium: { 
    label: 'MEDIUM', 
    color: 'bg-warning/20 text-warning border-warning/30',
    icon: AlertTriangle,
  },
  high: { 
    label: 'HIGH', 
    color: 'bg-destructive/20 text-destructive border-destructive/30',
    icon: Flame,
  },
};

export function OpportunitiesTable({ 
  opportunities, 
  onEnter, 
  isLoading,
  disabled 
}: OpportunitiesTableProps) {
  // Sort by risk tier (safe first), then by spread
  const sorted = [...opportunities].sort((a, b) => {
    const riskOrder = { safe: 0, medium: 1, high: 2 };
    const riskDiff = riskOrder[a.riskTier] - riskOrder[b.riskTier];
    if (riskDiff !== 0) return riskDiff;
    return b.spreadBps - a.spreadBps;
  });
  
  const topOpportunities = sorted.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          TOP OPPORTUNITIES
          <Badge variant="secondary" className="text-xs">{opportunities.length}</Badge>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topOpportunities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {isLoading ? 'Scanning for opportunities...' : 'No opportunities found matching criteria'}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-3 pb-2 border-b">
              <div className="col-span-2">Symbol</div>
              <div className="col-span-3">Exchanges</div>
              <div className="col-span-2 text-right">Spread</div>
              <div className="col-span-2 text-right">APR</div>
              <div className="col-span-1 text-center">Risk</div>
              <div className="col-span-2 text-right">Action</div>
            </div>
            
            {/* Rows */}
            {topOpportunities.map((opp) => {
              const risk = riskConfig[opp.riskTier];
              const RiskIcon = risk.icon;
              
              return (
                <div 
                  key={opp.id}
                  className={cn(
                    "grid grid-cols-12 gap-2 items-center p-3 rounded-lg hover:bg-muted/50 transition-colors",
                    opp.isNew && "bg-success/5 border border-success/20"
                  )}
                >
                  <div className="col-span-2 font-mono font-medium flex items-center gap-1">
                    {opp.symbol}
                    {opp.isNew && (
                      <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-1">
                        NEW
                      </Badge>
                    )}
                  </div>
                  
                  <div className="col-span-3 text-xs">
                    <span className="text-success">L:{opp.longExchange}</span>
                    {' / '}
                    <span className="text-destructive">S:{opp.shortExchange}</span>
                  </div>
                  
                  <div className="col-span-2 text-right">
                    <span className="font-mono text-success">
                      +{(opp.spreadBps / 100).toFixed(3)}%
                    </span>
                  </div>
                  
                  <div className="col-span-2 text-right">
                    <span className={cn(
                      "font-mono",
                      opp.apr >= 200 ? "text-success" : 
                      opp.apr >= 100 ? "text-primary" : "text-muted-foreground"
                    )}>
                      {opp.apr.toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="col-span-1 flex justify-center">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-0.5", risk.color)}>
                      <RiskIcon className="h-2.5 w-2.5" />
                      {risk.label}
                    </Badge>
                  </div>
                  
                  <div className="col-span-2 text-right">
                    {onEnter && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => onEnter(opp)}
                        disabled={disabled || opp.riskTier === 'high'}
                      >
                        <TrendingUp className="h-3 w-3" />
                        ENTER
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
