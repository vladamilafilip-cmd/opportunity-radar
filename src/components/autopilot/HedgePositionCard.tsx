// src/components/autopilot/HedgePositionCard.tsx
// Mobile-friendly card display for hedge positions

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Zap, 
  Info, 
  X,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AutopilotPosition } from '@/types/autopilot';

interface HedgePositionCardProps {
  position: AutopilotPosition;
  onAccumulate?: () => void;
  onCollect?: () => void;
  onClose?: () => void;
  onExplain?: () => void;
}

const tierColors = {
  safe: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-destructive/20 text-destructive border-destructive/30',
};

export function HedgePositionCard({
  position,
  onAccumulate,
  onCollect,
  onClose,
  onExplain,
}: HedgePositionCardProps) {
  const {
    symbol,
    long_exchange,
    short_exchange,
    entry_long_price,
    entry_short_price,
    current_long_price,
    current_short_price,
    size_eur,
    risk_tier,
    entry_ts,
    unrealized_pnl_eur,
    unrealized_pnl_percent,
    funding_collected_eur,
    intervals_collected,
    pnl_drift,
    status,
  } = position;

  const isOpen = status === 'open';
  const legSize = size_eur / 2;
  const hasDriftWarning = (pnl_drift || 0) > 0.3; // 0.3% warning threshold
  const hasCriticalDrift = (pnl_drift || 0) > 0.5; // 0.5% critical threshold

  const formatPrice = (price: number | null) => {
    if (!price) return '—';
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}k`;
    return `$${price.toFixed(2)}`;
  };

  return (
    <Card className={cn(
      "border transition-colors",
      isOpen ? "border-border" : "border-muted opacity-60"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{symbol}</span>
            <Badge variant="outline" className={tierColors[risk_tier as keyof typeof tierColors]}>
              {risk_tier.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(entry_ts), { addSuffix: true })}
          </div>
        </div>

        {/* Legs */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 rounded bg-success/5 border border-success/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="font-medium">LONG</span>
              <span className="text-muted-foreground">{long_exchange}</span>
            </div>
            <div className="text-right font-mono">
              <div>{formatPrice(current_long_price || entry_long_price)}</div>
              <div className="text-xs text-muted-foreground">
                Entry: {formatPrice(entry_long_price)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="font-medium">SHORT</span>
              <span className="text-muted-foreground">{short_exchange}</span>
            </div>
            <div className="text-right font-mono">
              <div>{formatPrice(current_short_price || entry_short_price)}</div>
              <div className="text-xs text-muted-foreground">
                Entry: {formatPrice(entry_short_price)}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="p-2 rounded bg-muted/50">
            <div className="text-xs text-muted-foreground">PnL</div>
            <div className={cn(
              "font-mono font-semibold",
              unrealized_pnl_eur >= 0 ? "text-success" : "text-destructive"
            )}>
              {unrealized_pnl_eur >= 0 ? '+' : ''}€{unrealized_pnl_eur.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              ({unrealized_pnl_percent >= 0 ? '+' : ''}{unrealized_pnl_percent.toFixed(2)}%)
            </div>
          </div>

          <div className="p-2 rounded bg-muted/50">
            <div className="text-xs text-muted-foreground">Funding</div>
            <div className="font-mono font-semibold text-success">
              €{funding_collected_eur.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              ({intervals_collected}x)
            </div>
          </div>

          <div className={cn(
            "p-2 rounded",
            hasCriticalDrift ? "bg-destructive/10" : 
            hasDriftWarning ? "bg-warning/10" : "bg-muted/50"
          )}>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              Drift
              {(hasDriftWarning || hasCriticalDrift) && (
                <AlertTriangle className={cn(
                  "h-3 w-3",
                  hasCriticalDrift ? "text-destructive" : "text-warning"
                )} />
              )}
            </div>
            <div className={cn(
              "font-mono font-semibold",
              hasCriticalDrift ? "text-destructive" : 
              hasDriftWarning ? "text-warning" : "text-foreground"
            )}>
              {((pnl_drift || 0) * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Size Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Size: €{size_eur.toFixed(0)} (€{legSize.toFixed(0)} + €{legSize.toFixed(0)})</span>
          <span>Hedge ID: {position.hedge_id?.slice(0, 8) || 'N/A'}</span>
        </div>

        {/* Actions */}
        {isOpen && (
          <div className="flex gap-2 pt-2 border-t">
            {onAccumulate && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onAccumulate}
              >
                <Plus className="h-3 w-3 mr-1" />
                Accumulate
              </Button>
            )}
            {onCollect && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onCollect}
              >
                <Zap className="h-3 w-3 mr-1" />
                Collect
              </Button>
            )}
            {onExplain && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onExplain}
              >
                <Info className="h-3 w-3" />
              </Button>
            )}
            {onClose && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Closed Status */}
        {!isOpen && (
          <div className="text-center text-sm text-muted-foreground py-2 border-t">
            <Badge variant="secondary">
              {status.toUpperCase()}
            </Badge>
            {position.exit_reason && (
              <span className="ml-2">{position.exit_reason}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
