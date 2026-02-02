import { Link } from "react-router-dom";
import { useTradingStore } from "@/store/tradingStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, TrendingDown, DollarSign, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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

export function FloatingPnL() {
  const { positions, accumulateAll, takeProfitAll, closeAllPositions, isLoading } = useTradingStore();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const openPositions = positions.filter(p => p.status === 'open');
  const totalPnL = openPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const profitableCount = openPositions.filter(p => p.unrealizedPnl > 0).length;
  
  // Don't show if no open positions
  if (openPositions.length === 0) return null;
  
  const isProfit = totalPnL >= 0;
  const hasProfit = totalPnL > 0 && profitableCount > 0;
  const Icon = isProfit ? TrendingUp : TrendingDown;

  const handleAccumulateAll = () => {
    accumulateAll();
    toast({
      title: "Profit akumuliran",
      description: `Profit iz ${profitableCount} pozicija je reinvestiran`,
    });
  };

  const handleTakeProfitAll = () => {
    takeProfitAll();
    toast({
      title: "Profit realizovan",
      description: `Profit iz ${profitableCount} pozicija je pokupljen`,
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
    <div className="flex items-center gap-1.5">
      <Link to="/trading" className="group">
        <Badge 
          className={cn(
            "gap-1.5 px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer",
            "hover:scale-105 active:scale-95",
            isProfit 
              ? "bg-success/15 text-success border-success/30 hover:bg-success/25" 
              : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25"
          )}
          variant="outline"
        >
          <Wallet className="h-3.5 w-3.5" />
          <Icon className="h-3 w-3" />
          <span className={cn(
            "font-mono",
            isProfit ? "text-success" : "text-destructive"
          )}>
            {isProfit ? '+' : ''}{totalPnL.toFixed(2)}
          </span>
          {!isMobile && (
            <span className="text-muted-foreground font-normal">
              ({openPositions.length} pos)
            </span>
          )}
          {isMobile && (
            <span className="text-muted-foreground font-normal">
              ({openPositions.length})
            </span>
          )}
        </Badge>
      </Link>
      
      {/* Action Buttons - Desktop Only */}
      {!isMobile && hasProfit && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs bg-success/10 text-success hover:bg-success/20"
            onClick={handleAccumulateAll}
            disabled={isLoading}
            title="Akumuliraj sav profit"
          >
            <TrendingUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs bg-primary/10 text-primary hover:bg-primary/20"
            onClick={handleTakeProfitAll}
            disabled={isLoading}
            title="Pokupi sav profit"
          >
            <DollarSign className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      
      {/* Emergency Stop Button */}
      {!isMobile && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20"
              disabled={isLoading}
              title="Stop All"
            >
              <StopCircle className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Emergency Stop</AlertDialogTitle>
              <AlertDialogDescription>
                This will close all {openPositions.length} positions immediately.
                <div className="mt-2 p-2 bg-muted rounded">
                  <span className={cn("font-medium", isProfit ? "text-success" : "text-destructive")}>
                    Current P&L: {isProfit ? '+' : ''}{totalPnL.toFixed(2)}
                  </span>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleStopAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Close All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
