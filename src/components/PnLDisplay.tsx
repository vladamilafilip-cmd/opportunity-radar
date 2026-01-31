import { cn } from "@/lib/utils";

interface PnLDisplayProps {
  value: number;
  percent?: number;
  size?: "sm" | "md" | "lg";
  showSign?: boolean;
  className?: string;
}

export function PnLDisplay({ 
  value, 
  percent, 
  size = "md",
  showSign = true,
  className 
}: PnLDisplayProps) {
  const isPositive = value >= 0;
  const colorClass = isPositive ? "text-success" : "text-danger";
  
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-semibold",
  };

  const formatValue = (val: number) => {
    const sign = showSign && val > 0 ? "+" : "";
    return `${sign}$${Math.abs(val).toFixed(2)}`;
  };

  const formatPercent = (val: number) => {
    const sign = showSign && val > 0 ? "+" : "";
    return `${sign}${val.toFixed(2)}%`;
  };

  return (
    <div className={cn("flex items-center gap-2", sizeClasses[size], colorClass, className)}>
      <span className="font-mono">{formatValue(value)}</span>
      {percent !== undefined && (
        <span className="text-muted-foreground text-sm">
          ({formatPercent(percent)})
        </span>
      )}
    </div>
  );
}
