// src/components/autopilot/AutopilotPositions.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { AutopilotPosition, RiskTier } from '@/types/autopilot';
import { useAutopilotStore } from '@/store/autopilotStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AutopilotPositionsProps {
  positions: AutopilotPosition[];
  onExplain?: (position: AutopilotPosition) => void;
}

const riskBadgeVariants: Record<RiskTier, { className: string; label: string }> = {
  safe: { className: 'bg-success/20 text-success border-success/30', label: 'SAFE' },
  medium: { className: 'bg-warning/20 text-warning border-warning/30', label: 'MED' },
  high: { className: 'bg-destructive/20 text-destructive border-destructive/30', label: 'HIGH' },
};

export function AutopilotPositions({ positions, onExplain }: AutopilotPositionsProps) {
  const [showClosed, setShowClosed] = useState(false);
  const { closePosition } = useAutopilotStore();
  
  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status !== 'open');
  
  const displayPositions = showClosed ? positions : openPositions;

  const handleClose = async (positionId: string) => {
    await closePosition(positionId, 'Manual close');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Autopilot Positions
            <Badge variant="secondary">{openPositions.length} open</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClosed(!showClosed)}
            className="text-xs"
          >
            {showClosed ? (
              <>Hide Closed <ChevronUp className="h-3 w-3 ml-1" /></>
            ) : (
              <>Show All ({closedPositions.length}) <ChevronDown className="h-3 w-3 ml-1" /></>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {displayPositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No {showClosed ? '' : 'open '}positions
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Long/Short</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">PnL</TableHead>
                  <TableHead className="text-right">Funding</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayPositions.map((position) => {
                  const pnl = position.status === 'open' 
                    ? position.unrealized_pnl_eur 
                    : position.realized_pnl_eur ?? 0;
                  const pnlPercent = position.status === 'open'
                    ? position.unrealized_pnl_percent
                    : position.realized_pnl_percent ?? 0;
                  const isProfitable = pnl >= 0;
                  const risk = riskBadgeVariants[position.risk_tier];
                  
                  return (
                    <TableRow 
                      key={position.id}
                      className={cn(
                        position.status !== 'open' && 'opacity-60'
                      )}
                    >
                      <TableCell className="font-medium">
                        {position.symbol}
                        {position.status !== 'open' && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {position.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="text-success">L: {position.long_exchange}</div>
                          <div className="text-destructive">S: {position.short_exchange}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        €{position.size_eur.toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn(
                          "flex items-center justify-end gap-1 font-mono",
                          isProfitable ? "text-success" : "text-destructive"
                        )}>
                          {isProfitable ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>€{pnl.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">
                            ({pnlPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-success">
                        €{position.funding_collected_eur.toFixed(3)}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({position.intervals_collected}x)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={risk.className}>
                          {risk.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(position.entry_ts), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {onExplain && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onExplain(position)}
                            >
                              <Info className="h-3 w-3" />
                            </Button>
                          )}
                          {position.status === 'open' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleClose(position.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
