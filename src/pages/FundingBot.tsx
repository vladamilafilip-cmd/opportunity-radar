// src/pages/FundingBot.tsx - Minimalist One-Page Funding Arbitrage Bot
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  Play, 
  Square, 
  RefreshCw, 
  AlertTriangle,
  Settings
} from 'lucide-react';
import { useAutopilotStore } from '@/store/autopilotStore';
import { ModeToggle } from '@/components/bot/ModeToggle';
import { CapitalWidget } from '@/components/bot/CapitalWidget';
import { PositionsCard } from '@/components/bot/PositionsCard';
import { OpportunitiesTable, type Opportunity } from '@/components/bot/OpportunitiesTable';
import { ActivityLog } from '@/components/bot/ActivityLog';
import { useOpportunities } from '@/hooks/useOpportunities';
import { autopilotConfig } from '../../config/autopilot';
import type { AutopilotMode } from '../../config/autopilot';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function FundingBot() {
  const {
    mode,
    isRunning,
    killSwitchActive,
    killSwitchReason,
    lastScanTs,
    totalRealizedPnl,
    totalFundingCollected,
    positions,
    auditLogs,
    todayPnl,
    riskBudget,
    unrealizedPnl,
    fetchState,
    fetchPositions,
    fetchAuditLogs,
    start,
    stop,
    stopAll,
    setMode,
    closePosition,
    resetKillSwitch,
    openPosition,
    subscribeToState,
    subscribeToPositions,
  } = useAutopilotStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Real opportunities from database
  const { opportunities, isLoading: oppsLoading, refresh: refreshOpps } = useOpportunities();

  // Initialize
  useEffect(() => {
    fetchState();
    fetchPositions();
    fetchAuditLogs(20);
    
    const unsubState = subscribeToState();
    const unsubPositions = subscribeToPositions();
    
    return () => {
      unsubState();
      unsubPositions();
    };
  }, [fetchState, fetchPositions, fetchAuditLogs, subscribeToState, subscribeToPositions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchState(),
      fetchPositions(),
      fetchAuditLogs(20),
      refreshOpps(),
    ]);
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleModeChange = async (newMode: AutopilotMode) => {
    if (newMode === 'live' && mode !== 'live') {
      // Confirm before switching to live
      if (!confirm('⚠️ Switch to LIVE mode? Real trades will be executed!')) {
        return;
      }
    }
    await setMode(newMode);
    toast.success(`Mode changed to ${newMode.toUpperCase()}`);
  };

  const handleStartStop = async () => {
    if (isRunning) {
      await stop();
      toast.info('Bot stopped');
    } else {
      await start();
      toast.success('Bot started');
    }
  };

  const handleEnterPosition = async (opp: Opportunity) => {
    if (mode === 'off') {
      toast.error('Bot is OFF. Switch to TEST or LIVE mode first.');
      return;
    }
    
    const result = await openPosition(
      opp.symbol,
      opp.longExchange,
      opp.shortExchange,
      opp.spreadBps,
      opp.score
    );
    
    if (result.ok) {
      toast.success(`${mode === 'paper' ? '[TEST] ' : ''}Opened ${opp.symbol} hedge`, {
        description: `L:${opp.longExchange} / S:${opp.shortExchange} @ ${(opp.spreadBps/100).toFixed(3)}%`
      });
    } else {
      toast.error(`Failed to open position: ${result.error}`);
    }
  };

  const handleClosePosition = async (positionId: string) => {
    await closePosition(positionId, 'Manual close');
    toast.success('Position closed');
  };

  const openPositions = positions.filter(p => p.status === 'open');
  const deployedEur = openPositions.reduce((sum, p) => sum + p.size_eur, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-bold tracking-tight">FUNDING ARBITRAGE BOT</h1>
              <div className={cn(
                "h-2 w-2 rounded-full",
                isRunning ? "bg-success animate-pulse" : "bg-muted-foreground"
              )} />
            </div>
            
            <div className="flex items-center gap-4">
              <ModeToggle 
                mode={mode} 
                onModeChange={handleModeChange}
              />
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
                <Link to="/settings">
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Kill Switch Warning */}
        {killSwitchActive && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                <strong>Kill Switch Active:</strong> {killSwitchReason || 'Daily drawdown limit reached'}
              </span>
              <Button size="sm" variant="outline" onClick={resetKillSwitch}>
                Reset
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Live Mode Warning */}
        {mode === 'live' && (
          <Alert className="bg-warning/10 border-warning/30">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning text-sm">
              <strong>LIVE MODE:</strong> Real trades will be executed. Profit is NOT guaranteed.
            </AlertDescription>
          </Alert>
        )}

        {/* Capital Stats */}
        <CapitalWidget
          deployedEur={deployedEur}
          todayPnl={todayPnl}
          totalPnl={totalRealizedPnl}
          fundingCollected={totalFundingCollected}
          unrealizedPnl={unrealizedPnl}
        />

        {/* Control Buttons */}
        <div className="flex gap-3">
          <Button
            size="lg"
            onClick={handleStartStop}
            disabled={mode === 'off' || killSwitchActive}
            className={cn(
              "gap-2 flex-1 max-w-xs",
              isRunning && "bg-warning hover:bg-warning/90"
            )}
          >
            {isRunning ? (
              <>
                <Square className="h-4 w-4" />
                PAUSE
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                START
              </>
            )}
          </Button>
          
          <Button
            size="lg"
            variant="destructive"
            onClick={stopAll}
            disabled={openPositions.length === 0}
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            STOP ALL
          </Button>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Positions */}
          <PositionsCard 
            positions={positions}
            onClose={handleClosePosition}
          />

          {/* Top Opportunities */}
          <OpportunitiesTable
            opportunities={opportunities}
            isLoading={oppsLoading}
            onEnter={handleEnterPosition}
            disabled={killSwitchActive || !isRunning}
          />
        </div>

        {/* Activity Log */}
        <ActivityLog logs={auditLogs} maxItems={15} />

        {/* Footer Info */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <p>
            Binance + OKX • €{autopilotConfig.capital.hedgeSizeEur} per hedge • 
            Max {autopilotConfig.risk.maxConcurrentHedges} positions • 
            €{autopilotConfig.risk.maxDailyDrawdownEur} kill switch
          </p>
          <p className="mt-1">
            {mode === 'paper' ? '⚡ TEST MODE - No real trades' : '🔴 LIVE MODE - Real money at risk'}
          </p>
        </div>
      </main>
    </div>
  );
}
