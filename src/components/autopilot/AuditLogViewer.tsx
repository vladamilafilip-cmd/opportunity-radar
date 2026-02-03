// src/components/autopilot/AuditLogViewer.tsx
// Timeline view of robot actions with filters

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  History, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Zap,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { useAutopilotStore } from '@/store/autopilotStore';
import type { AuditLevel } from '@/types/autopilot';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

const levelConfig: Record<AuditLevel, { icon: typeof Info; color: string; label: string }> = {
  info: { icon: Info, color: 'text-muted-foreground', label: 'Info' },
  warn: { icon: AlertTriangle, color: 'text-warning', label: 'Warning' },
  error: { icon: XCircle, color: 'text-destructive', label: 'Error' },
  action: { icon: Zap, color: 'text-primary', label: 'Action' },
};

export function AuditLogViewer() {
  const { auditLogs, fetchAuditLogs } = useAutopilotStore();
  const [filter, setFilter] = useState<string>('all');
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAuditLogs(limit);
  }, [fetchAuditLogs, limit]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchAuditLogs(limit);
    setIsLoading(false);
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 20);
  };

  const filteredLogs = auditLogs.filter(log => 
    filter === 'all' || log.level === filter
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Robot Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="action">Actions</SelectItem>
                <SelectItem value="warn">Warnings</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No activity logs
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const config = levelConfig[log.level as AuditLevel] || levelConfig.info;
                const Icon = config.icon;
                
                return (
                  <div 
                    key={log.id} 
                    className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn('mt-0.5', config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{log.action}</span>
                        {log.entity_type && (
                          <Badge variant="outline" className="text-xs">
                            {log.entity_type}
                          </Badge>
                        )}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {JSON.stringify(log.details).slice(0, 100)}
                          {JSON.stringify(log.details).length > 100 && '...'}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(log.ts), { addSuffix: true })}
                        <span className="mx-1">•</span>
                        {format(new Date(log.ts), 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {filteredLogs.length >= limit && (
          <Button 
            variant="ghost" 
            className="w-full mt-2"
            onClick={handleLoadMore}
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Load More
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
