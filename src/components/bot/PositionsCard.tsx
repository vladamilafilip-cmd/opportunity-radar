// src/components/bot/PositionsCard.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, Clock, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Zap, Target, Coins } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AutopilotPosition } from '@/types/autopilot';

interface PositionsCardProps {
  positions: AutopilotPosition[];
  onClose?: (positionId: string) => void;
}

function calculateExpectedApr(spreadBps: number): number {
  // APR = spread per 8h * periods per year
  // periods per year = 365 * 24 / 8 = 1095
  return (spreadBps / 100) * 1095;
}

function getHoursOpen(entryTs: string): number {
  return (Date.now() - new Date(entryTs).getTime()) / (1000 * 60 * 60);
}

export function PositionsCard({ positions, onClose }: PositionsCardProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const openPositions = positions.filter(p => p.status === 'open');

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (openPositions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            ACTIVE POSITIONS
            <Badge variant="secondary" className="text-xs">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            No active hedge positions
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          ACTIVE POSITIONS
          <Badge variant="secondary" className="text-xs">{openPositions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {openPositions.map((position) => {
          const pnl = position.unrealized_pnl_eur;
          const isProfitable = pnl >= 0;
          const isExpanded = expandedIds.has(position.id);
          const hoursOpen = getHoursOpen(position.entry_ts);
          const expectedApr = calculateExpectedApr(position.entry_funding_spread_8h);
          const intervalsOpen = Math.floor(hoursOpen / 8);
          
          return (
            <Collapsible key={position.id} open={isExpanded} onOpenChange={() => toggleExpanded(position.id)}>
              <div className={cn(
                "rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors",
                isExpanded && "ring-1 ring-primary/20"
              )}>
                {/* Main Row */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <div>
                      <div className="font-mono font-medium flex items-center gap-2">
                        {position.symbol}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {position.risk_tier?.toUpperCase() || 'MEDIUM'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="text-success">L:{position.long_exchange}</span>
                        {' / '}
                        <span className="text-destructive">S:{position.short_exchange}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* PnL */}
                    <div className="text-right">
                      <div className={cn(
                        "font-mono text-sm flex items-center gap-1",
                        isProfitable ? "text-success" : "text-destructive"
                      )}>
                        {isProfitable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {isProfitable ? '+' : ''}€{pnl.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(position.entry_ts), { addSuffix: false })}
                      </div>
                    </div>
                    
                    {/* Size */}
                    <div className="text-right font-mono text-sm min-w-[50px]">
                      €{position.size_eur.toFixed(0)}
                    </div>
                    
                    {/* Close Button */}
                    {onClose && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose(position.id);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-1 border-t border-border/50 mx-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      {/* Entry Spread */}
                      <div className="bg-background/50 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Target className="h-3 w-3" />
                          Entry Spread
                        </div>
                        <div className="font-mono text-sm text-success">
                          +{(position.entry_funding_spread_8h / 100).toFixed(3)}%
                        </div>
                      </div>

                      {/* Expected APR */}
                      <div className="bg-background/50 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Zap className="h-3 w-3" />
                          Expected APR
                        </div>
                        <div className={cn(
                          "font-mono text-sm",
                          expectedApr >= 100 ? "text-success" : "text-primary"
                        )}>
                          ~{expectedApr.toFixed(0)}%
                        </div>
                      </div>

                      {/* Funding Collected */}
                      <div className="bg-background/50 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Coins className="h-3 w-3" />
                          Funding Collected
                        </div>
                        <div className="font-mono text-sm text-success">
                          €{position.funding_collected_eur.toFixed(2)}
                        </div>
                      </div>

                      {/* Intervals */}
                      <div className="bg-background/50 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          Intervals (8h)
                        </div>
                        <div className="font-mono text-sm">
                          {position.intervals_collected} collected
                          <span className="text-muted-foreground text-xs ml-1">
                            ({intervalsOpen} open)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info Row */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30 text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>
                          Entry: L:${position.entry_long_price.toFixed(2)} / S:${position.entry_short_price.toFixed(2)}
                        </span>
                        <span>
                          Leverage: {position.leverage}x
                        </span>
                      </div>
                      <div>
                        <span className={cn(
                          "font-mono",
                          isProfitable ? "text-success" : "text-destructive"
                        )}>
                          {isProfitable ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
