import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useTradingStore } from "@/store/tradingStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PnLDisplay } from "@/components/PnLDisplay";
import { PositionCard } from "@/components/PositionCard";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { FundingIntervalBadge } from "@/components/FundingIntervalBadge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  History, 
  GraduationCap, 
  AlertTriangle, 
  Info,
  Coins,
  Clock,
  LayoutGrid,
  LayoutList
} from "lucide-react";

export default function TradingPage() {
  const { user } = useAuthStore();
  const { positions, trades, stats, closePosition, refreshPositions, isLoading } = useTradingStore();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Auto-refresh positions every 5 seconds for ALL users
  useEffect(() => {
    const interval = setInterval(refreshPositions, 5000);
    return () => clearInterval(interval);
  }, [refreshPositions]);

  const handleClosePosition = async (positionId: string) => {
    await closePosition(positionId);
    toast({
      title: "Position Closed",
      description: "Your paper trade has been closed.",
    });
  };

  // Calculate totals
  const totalFundingCollected = positions.reduce((sum, p) => sum + (p.fundingCollected || 0), 0);
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <Badge variant="secondary" className="gap-1">
            <GraduationCap className="h-3 w-3" />
            Educational Mode
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Educational Banner */}
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <GraduationCap className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <span className="font-medium">Paper Trading - Simulation Only</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">
              Ovo je simulacija za učenje. Ne koristite pravi novac na osnovu ovih rezultata.
            </span>
          </AlertDescription>
        </Alert>

        {/* Risk Warning */}
        <Alert variant="destructive" className="mb-6 border-danger/30 bg-danger/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>UPOZORENJE:</strong> Paper trading ne garantuje buduće rezultate. 
            Kripto tržišta su ekstremno volatilna. Nikada ne investirajte više nego što možete priuštiti da izgubite.
          </AlertDescription>
        </Alert>
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Paper Trading</h1>
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            Simulation
          </Badge>
        </div>

        {/* Portfolio Summary */}
        <div className="mb-6">
          <PortfolioSummary />
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
              <p className="text-sm text-muted-foreground">Realized P&L</p>
              <PnLDisplay value={stats.totalPnl} percent={stats.totalPnlPercent} size="lg" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Coins className="h-3 w-3" />
                Funding Collected
              </p>
              <p className="text-2xl font-bold text-success">+${totalFundingCollected.toFixed(2)}</p>
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Open Positions ({positions.length})
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="gap-1"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="gap-1"
                >
                  <LayoutList className="h-4 w-4" />
                  Table
                </Button>
              </div>
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
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {positions.map((pos) => (
                  <PositionCard
                    key={pos.id}
                    position={pos}
                    onClose={handleClosePosition}
                    isLoading={isLoading}
                  />
                ))}
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
                    <TableHead className="text-right">Funding</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos) => (
                    <TableRow key={pos.id}>
                      <TableCell className="font-medium">{pos.symbol}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-success">{pos.longExchange}</span>
                          <FundingIntervalBadge exchange={pos.longExchange} size="sm" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-danger">{pos.shortExchange}</span>
                          <FundingIntervalBadge exchange={pos.shortExchange} size="sm" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">${pos.size}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${pos.entryPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${pos.currentPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-success">
                        +${(pos.fundingCollected || 0).toFixed(2)}
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
                    <TableHead className="text-right">Funding</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-success">{trade.longExchange}</span>
                          {' / '}
                          <span className="text-danger">{trade.shortExchange}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">${trade.size}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${trade.entryPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${trade.exitPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-success">
                        +${(trade.fundingCollected || 0).toFixed(2)}
                        {trade.totalIntervals && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({trade.totalIntervals}×)
                          </span>
                        )}
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
