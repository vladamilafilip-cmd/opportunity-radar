import { format } from "date-fns";
import { RefreshCw } from "lucide-react";

interface LastUpdatedProps {
  timestamp: Date;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function LastUpdated({ timestamp, isRefreshing, onRefresh }: LastUpdatedProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Last updated: {format(timestamp, "HH:mm:ss")}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1 hover:bg-secondary rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}
