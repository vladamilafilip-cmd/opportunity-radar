import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export function DisclaimerBanner() {
  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
      <p className="text-sm text-primary font-medium">
        <strong>Risk Disclaimer:</strong> This is not financial advice. Cryptocurrency trading involves substantial risk of loss. 
        Past performance does not guarantee future results.{" "}
        <Link to="/risk-disclosure" className="underline hover:text-primary/80">
          Read full risk disclosure →
        </Link>
      </p>
    </div>
  );
}