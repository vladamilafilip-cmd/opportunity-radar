import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useTradingStore } from "@/store/tradingStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PnLDisplay } from "@/components/PnLDisplay";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, History } from "lucide-react";

export default function TradingPage() {
  const { user } = useAuthStore();
  const { positions, trades, stats, closePosition, refreshPositions, isLoading } = useTradingStore();
  const { toast } = useToast();
  
  const isPro = user?.plan !== 'free';

  // Auto-refresh positions every 5 seconds
  useEffect(() => {
    if (isPro) {
      const interval = setInterval(refreshPositions, 5000);
      return () => clearInterval(interval);
    }
  }, [isPro, refreshPositions]);

  const handleClosePosition = async (positionId: string) => {
    await closePosition(positionId);
    toast({
      title: "Position Closed",
      description: "Your paper trade has been closed.",
    });
  };

  if (!isPro) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
          <div className="container mx-auto px-4 py-3">
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 text-center">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <DollarSign className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Paper Trading</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Upgrade to PRO to access paper trading and practice arbitrage strategies without risking real capital.
          </p>
          <Link to="/billing">
            <Button size="lg">Upgrade to PRO - £20/month</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">Paper Trading</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold">{stats.totalTrades}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold text-success">{stats.winRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total P&L</p>
              <PnLDisplay value={stats.totalPnl} percent={stats.totalPnlPercent} size="lg" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Avg Trade</p>
              <PnLDisplay value={stats.averageTrade} size="lg" />
            </CardContent>
          </Card>
        </div>

        {/* Open Positions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Open Positions ({positions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No open positions</p>
                <Link to="/dashboard" className="text-primary hover:underline text-sm">
                  Find opportunities to open a trade
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Long</TableHead>
                    <TableHead>Short</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos) => (
                    <TableRow key={pos.id}>
                      <TableCell className="font-medium">{pos.symbol}</TableCell>
                      <TableCell className="text-success">{pos.longExchange}</TableCell>
                      <TableCell className="text-danger">{pos.shortExchange}</TableCell>
                      <TableCell className="text-right font-mono">${pos.size}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${pos.entryPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${pos.currentPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <PnLDisplay value={pos.unrealizedPnl} percent={pos.unrealizedPnlPercent} size="sm" />
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleClosePosition(pos.id)}
                          disabled={isLoading}
                        >
                          Close
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Trade History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Trade History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No trade history yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Exchanges</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Exit</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell>
                        <span className="text-success">{trade.longExchange}</span>
                        {' / '}
                        <span className="text-danger">{trade.shortExchange}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">${trade.size}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${trade.entryPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${trade.exitPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <PnLDisplay value={trade.realizedPnl} percent={trade.realizedPnlPercent} size="sm" />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {new Date(trade.closedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
