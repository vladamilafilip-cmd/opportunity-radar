import { AlertTriangle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
      <p className="text-sm text-primary font-medium">
        <strong>Risk Disclaimer:</strong> This is not financial advice. Cryptocurrency trading involves substantial risk of loss. 
        Past performance does not guarantee future results.
      </p>
    </div>
  );
}
