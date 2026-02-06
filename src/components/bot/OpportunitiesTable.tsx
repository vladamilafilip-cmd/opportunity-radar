// src/components/bot/OpportunitiesTable.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateAPR } from '../../../config/autopilot';

export interface Opportunity {
  id: string;
  symbol: string;
  longExchange: string;
  shortExchange: string;
  spreadBps: number;
  apr: number;
  score: number;
  isNew?: boolean;
}

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  onEnter?: (opportunity: Opportunity) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function OpportunitiesTable({ 
  opportunities, 
  onEnter, 
  isLoading,
  disabled 
}: OpportunitiesTableProps) {
  // Sort by spread (highest first)
  const sorted = [...opportunities].sort((a, b) => b.spreadBps - a.spreadBps);
  const topOpportunities = sorted.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          TOP OPPORTUNITIES
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
              <div className="col-span-3">Symbol</div>
              <div className="col-span-3">Exchanges</div>
              <div className="col-span-2 text-right">Spread</div>
              <div className="col-span-2 text-right">APR</div>
              <div className="col-span-2 text-right">Action</div>
            </div>
            
            {/* Rows */}
            {topOpportunities.map((opp) => (
              <div 
                key={opp.id}
                className={cn(
                  "grid grid-cols-12 gap-2 items-center p-3 rounded-lg hover:bg-muted/50 transition-colors",
                  opp.isNew && "bg-success/5 border border-success/20"
                )}
              >
                <div className="col-span-3 font-mono font-medium flex items-center gap-2">
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
                
                <div className="col-span-2 text-right">
                  {onEnter && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => onEnter(opp)}
                      disabled={disabled}
                    >
                      <TrendingUp className="h-3 w-3" />
                      ENTER
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
