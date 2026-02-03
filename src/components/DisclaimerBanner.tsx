import { AlertTriangle, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export function DisclaimerBanner() {
  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center gap-3">
      <div className="flex items-center gap-1 shrink-0">
        <Shield className="h-5 w-5 text-warning" />
        <AlertTriangle className="h-4 w-4 text-warning" />
      </div>
      <p className="text-sm text-warning font-medium">
        <strong>Funding Arbitrage Disclaimer:</strong> This is a market-neutral, delta-hedged strategy. 
        While designed to minimize directional exposure, <strong>profit is NOT guaranteed</strong>. 
        Funding rates change, slippage occurs, and exchange failures happen.{" "}
        <Link to="/risk-disclosure" className="underline hover:text-warning/80">
          Read full risk disclosure →
        </Link>
      </p>
    </div>
  );
}