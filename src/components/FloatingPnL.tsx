import { Link } from "react-router-dom";
import { useTradingStore } from "@/store/tradingStore";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export function FloatingPnL() {
  const { positions } = useTradingStore();
  const isMobile = useIsMobile();
  
  const openPositions = positions.filter(p => p.status === 'open');
  const totalPnL = openPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  
  // Don't show if no open positions
  if (openPositions.length === 0) return null;
  
  const isProfit = totalPnL >= 0;
  const Icon = isProfit ? TrendingUp : TrendingDown;
  
  return (
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
  );
}
