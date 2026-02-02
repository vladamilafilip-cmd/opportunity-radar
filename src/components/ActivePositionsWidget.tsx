import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PnLDisplay } from "./PnLDisplay";
import { useTradingStore } from "@/store/tradingStore";
import { simulateFundingCollected } from "@/lib/fundingUtils";
import { 
  Target, 
  TrendingUp,
  Wallet,
  X,
  ExternalLink,
  AlertTriangle,
  Coins
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ActivePositionsWidget() {
  const { 
    positions, 
    closePosition, 
    closeAllPositions,
    accumulateProfit, 
    takeProfitPartial,
    isLoading 
  } = useTradingStore();
  const { toast } = useToast();
  
  const openPositions = positions.filter(p => p.status === 'open');
  
  // Don't render if no open positions
  if (openPositions.length === 0) return null;
  
  const totalPnL = openPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  
  // Calculate total estimated funding collected
  const totalFunding = openPositions.reduce((sum, pos) => {
    const funding = simulateFundingCollected(
      pos.size,
      pos.openedAt,
      pos.longExchange,
      pos.shortExchange,
      0.15
    );
    return sum + funding;
  }, 0);

  const handleAccumulate = (positionId: string, symbol: string) => {
    accumulateProfit(positionId);
    toast({
      title: "Profit akumuliran",
      description: `Profit za ${symbol} je reinvestiran u poziciju`,
    });
  };

  const handleTakeProfit = (positionId: string, symbol: string) => {
    takeProfitPartial(positionId);
    toast({
      title: "Profit realizovan",
      description: `Profit za ${symbol} je pokupljen`,
    });
  };

  const handleClose = async (positionId: string, symbol: string) => {
    await closePosition(positionId);
    toast({
      title: "Pozicija zatvorena",
      description: `${symbol} pozicija je uspešno zatvorena`,
    });
  };

  const handleStopAll = async () => {
    await closeAllPositions();
    toast({
      title: "Sve pozicije zatvorene",
      description: `${openPositions.length} pozicija je zatvoreno`,
      variant: "destructive",
    });
  };

  return (
    <Card className="mb-6 border-warning/30 bg-gradient-to-br from-warning/5 to-background">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-warning" />
            <span className="text-lg">Active Positions</span>
            <Badge variant="secondary" className="ml-1">
              {openPositions.length}
            </Badge>
          </div>
          <Link to="/trading">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
              <span className="hidden sm:inline">View All</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Position Rows */}
        <div className="space-y-2">
          {openPositions.slice(0, 5).map(pos => (
            <div 
              key={pos.id} 
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-sm truncate">{pos.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {pos.longExchange} → {pos.shortExchange}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <PnLDisplay 
                  value={pos.unrealizedPnl} 
                  percent={pos.unrealizedPnlPercent} 
                  size="sm" 
                />
                
                <div className="flex gap-1">
                  {pos.unrealizedPnl > 0 && (
                    <>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-7 px-2 text-xs bg-success/10 text-success hover:bg-success/20"
                        onClick={() => handleAccumulate(pos.id, pos.symbol)}
                        disabled={isLoading}
                      >
                        <TrendingUp className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-7 px-2 text-xs bg-primary/10 text-primary hover:bg-primary/20"
                        onClick={() => handleTakeProfit(pos.id, pos.symbol)}
                        disabled={isLoading}
                      >
                        <Wallet className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-7 px-2 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20"
                    onClick={() => handleClose(pos.id, pos.symbol)}
                    disabled={isLoading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {openPositions.length > 5 && (
            <Link to="/trading">
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                +{openPositions.length - 5} more positions...
              </Button>
            </Link>
          )}
        </div>
        
        {/* Footer with Totals */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 mt-3 border-t border-border/50">
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total P&L</span>
              <PnLDisplay value={totalPnL} size="lg" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Funding Collected</span>
              <div className="flex items-center gap-1 text-success font-semibold">
                <Coins className="h-4 w-4" />
                +${totalFunding.toFixed(2)}
              </div>
            </div>
          </div>
          
          {/* Emergency Stop All Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                className="gap-1"
                disabled={isLoading}
              >
                <AlertTriangle className="h-4 w-4" />
                STOP ALL
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Emergency Stop - Close All Positions
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>This will immediately close ALL {openPositions.length} open positions.</p>
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Positions to close:</span>
                      <span className="font-medium">{openPositions.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Unrealized P&L:</span>
                      <span className={cn("font-medium", totalPnL >= 0 ? "text-success" : "text-destructive")}>
                        {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Funding Collected:</span>
                      <span className="font-medium text-success">+${totalFunding.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-destructive font-medium">
                    This action cannot be undone!
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleStopAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Close All Positions
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
