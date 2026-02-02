import { AlertTriangle, Skull, TrendingDown, Droplets } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface HighRiskWarningProps {
  symbol?: string;
  volatilityMultiplier?: number;
  isMeme?: boolean;
  className?: string;
  variant?: "banner" | "compact" | "inline";
}

export function HighRiskWarning({ 
  symbol, 
  volatilityMultiplier = 3.0, 
  isMeme = true,
  className,
  variant = "banner"
}: HighRiskWarningProps) {
  if (variant === "inline") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-danger",
        className
      )}>
        <Skull className="h-3 w-3" />
        EXTREME RISK
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm",
        className
      )}>
        <AlertTriangle className="h-4 w-4 flex-shrink-0 animate-pulse" />
        <span className="font-medium">
          {isMeme ? "MEME COIN" : "HIGH VOLATILITY"} - Extreme risk of loss
        </span>
      </div>
    );
  }

  return (
    <Alert 
      variant="destructive" 
      className={cn(
        "border-danger/50 bg-danger/5",
        className
      )}
    >
      <AlertTriangle className="h-5 w-5 animate-pulse" />
      <AlertTitle className="flex items-center gap-2 text-lg">
        <Skull className="h-5 w-5" />
        ⚠️ EXTREME RISK {isMeme && "- MEME COIN"}
        {symbol && <span className="font-mono text-sm">({symbol})</span>}
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1 text-sm">
          <li className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-danger" />
            Ekstremna volatilnost ({volatilityMultiplier.toFixed(1)}x veća od normalnog)
          </li>
          <li className="flex items-center gap-2">
            <Skull className="h-4 w-4 text-danger" />
            Mogućnost gubitka 100% kapitala u kratkom roku
          </li>
          <li className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-danger" />
            Niska likvidnost = veći slippage i lošije izvršenje
          </li>
          <li className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger" />
            <strong>NIJE preporučeno za početnike</strong>
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Meme coinovi mogu izgubiti 90%+ vrednosti za jedan dan. 
          Nikada ne investirajte više nego što možete priuštiti da izgubite.
        </p>
      </AlertDescription>
    </Alert>
  );
}

// Confirmation dialog content for high-risk trades
export function HighRiskConfirmation({ 
  symbol, 
  onConfirm, 
  onCancel 
}: { 
  symbol: string; 
  onConfirm: () => void; 
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <HighRiskWarning symbol={symbol} variant="banner" />
      
      <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
        <input 
          type="checkbox" 
          id="risk-acknowledge" 
          className="mt-1"
          required
        />
        <label htmlFor="risk-acknowledge" className="text-sm">
          Razumem da je ovo visokorizična investicija i da mogu izgubiti celokupan uloženi kapital. 
          Ovo je moja sopstvena odluka i platforma nije odgovorna za eventualne gubitke.
        </label>
      </div>
      
      <div className="flex gap-2 justify-end">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border hover:bg-muted"
        >
          Odustani
        </button>
        <button 
          onClick={onConfirm}
          className="px-4 py-2 text-sm rounded-md bg-danger text-white hover:bg-danger/90"
        >
          Razumem rizik - Nastavi
        </button>
      </div>
    </div>
  );
}
