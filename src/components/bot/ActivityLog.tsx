// src/components/bot/ActivityLog.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AutopilotAuditLog } from '@/types/autopilot';

interface ActivityLogProps {
  logs: AutopilotAuditLog[];
  maxItems?: number;
}

const levelIcons = {
  info: CheckCircle,
  action: Zap,
  warn: AlertTriangle,
  error: XCircle,
};

const levelColors = {
  info: 'text-muted-foreground',
  action: 'text-primary',
  warn: 'text-warning',
  error: 'text-destructive',
};

export function ActivityLog({ logs, maxItems = 10 }: ActivityLogProps) {
  const recentLogs = logs.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          ACTIVITY LOG
          <Badge variant="secondary" className="text-xs">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          {recentLogs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No activity yet
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => {
                const Icon = levelIcons[log.level as keyof typeof levelIcons] || CheckCircle;
                const color = levelColors[log.level as keyof typeof levelColors] || 'text-muted-foreground';
                
                return (
                  <div 
                    key={log.id}
                    className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", color)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {log.action}
                      </div>
                      {log.entity_type && (
                        <div className="text-xs text-muted-foreground">
                          {log.entity_type}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.ts), 'HH:mm')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
