// src/components/bot/PositionsCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AutopilotPosition } from '@/types/autopilot';

interface PositionsCardProps {
  positions: AutopilotPosition[];
  onClose?: (positionId: string) => void;
}

export function PositionsCard({ positions, onClose }: PositionsCardProps) {
  const openPositions = positions.filter(p => p.status === 'open');

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
          
          return (
            <div 
              key={position.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-mono font-medium">{position.symbol}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="text-success">L:{position.long_exchange}</span>
                    {' / '}
                    <span className="text-destructive">S:{position.short_exchange}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
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
                
                <div className="text-right font-mono text-sm">
                  €{position.size_eur.toFixed(0)}
                </div>
                
                {onClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onClose(position.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
