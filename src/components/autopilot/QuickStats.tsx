// src/components/autopilot/QuickStats.tsx
// Daily/Weekly performance statistics

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Percent,
  Zap
} from 'lucide-react';
import { useAutopilotStore } from '@/store/autopilotStore';
import { cn } from '@/lib/utils';
import { startOfDay, startOfWeek, isAfter } from 'date-fns';

export function QuickStats() {
  const { positions, totalRealizedPnl, totalFundingCollected } = useAutopilotStore();

  const stats = useMemo(() => {
    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });

    // Filter positions by time period
    const todayPositions = positions.filter(p => 
      isAfter(new Date(p.entry_ts), dayStart)
    );
    const weekPositions = positions.filter(p => 
      isAfter(new Date(p.entry_ts), weekStart)
    );

    // Calculate stats
    const closedToday = todayPositions.filter(p => p.status !== 'open');
    const closedWeek = weekPositions.filter(p => p.status !== 'open');

    const todayPnl = closedToday.reduce((sum, p) => sum + (p.realized_pnl_eur || 0), 0);
    const weekPnl = closedWeek.reduce((sum, p) => sum + (p.realized_pnl_eur || 0), 0);

    const todayFunding = todayPositions.reduce((sum, p) => sum + p.funding_collected_eur, 0);
    const weekFunding = weekPositions.reduce((sum, p) => sum + p.funding_collected_eur, 0);

    const todayWins = closedToday.filter(p => (p.realized_pnl_eur || 0) > 0).length;
    const weekWins = closedWeek.filter(p => (p.realized_pnl_eur || 0) > 0).length;

    const todayWinRate = closedToday.length > 0 ? (todayWins / closedToday.length) * 100 : 0;
    const weekWinRate = closedWeek.length > 0 ? (weekWins / closedWeek.length) * 100 : 0;

    const openPositions = positions.filter(p => p.status === 'open');
    const unrealizedPnl = openPositions.reduce((sum, p) => sum + p.unrealized_pnl_eur, 0);

    return {
      today: {
        pnl: todayPnl,
        funding: todayFunding,
        trades: closedToday.length,
        winRate: todayWinRate,
      },
      week: {
        pnl: weekPnl,
        funding: weekFunding,
        trades: closedWeek.length,
        winRate: weekWinRate,
      },
      total: {
        realizedPnl: totalRealizedPnl,
        funding: totalFundingCollected,
        unrealizedPnl,
        openPositions: openPositions.length,
      },
    };
  }, [positions, totalRealizedPnl, totalFundingCollected]);

  const StatCard = ({ 
    label, 
    value, 
    icon: Icon, 
    positive,
    suffix = '' 
  }: { 
    label: string; 
    value: string; 
    icon: typeof TrendingUp; 
    positive?: boolean;
    suffix?: string;
  }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className={cn(
        'p-2 rounded-lg',
        positive === undefined ? 'bg-primary/10 text-primary' :
        positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn(
          'font-mono font-semibold',
          positive === undefined ? '' :
          positive ? 'text-success' : 'text-destructive'
        )}>
          {value}{suffix}
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Performance
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {stats.total.openPositions} open
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today Stats */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">Today</div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard 
              label="PnL" 
              value={`${stats.today.pnl >= 0 ? '+' : ''}€${stats.today.pnl.toFixed(2)}`}
              icon={stats.today.pnl >= 0 ? TrendingUp : TrendingDown}
              positive={stats.today.pnl >= 0}
            />
            <StatCard 
              label="Win Rate" 
              value={stats.today.winRate.toFixed(0)}
              suffix="%"
              icon={Percent}
              positive={stats.today.winRate >= 50}
            />
          </div>
        </div>

        {/* Week Stats */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">This Week</div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard 
              label="PnL" 
              value={`${stats.week.pnl >= 0 ? '+' : ''}€${stats.week.pnl.toFixed(2)}`}
              icon={stats.week.pnl >= 0 ? TrendingUp : TrendingDown}
              positive={stats.week.pnl >= 0}
            />
            <StatCard 
              label="Funding Collected" 
              value={`€${stats.week.funding.toFixed(2)}`}
              icon={Zap}
            />
          </div>
        </div>

        {/* Unrealized */}
        {stats.total.openPositions > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Unrealized P&L</span>
              <span className={cn(
                'font-mono font-semibold',
                stats.total.unrealizedPnl >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {stats.total.unrealizedPnl >= 0 ? '+' : ''}€{stats.total.unrealizedPnl.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
