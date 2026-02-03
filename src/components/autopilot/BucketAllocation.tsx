// src/components/autopilot/BucketAllocation.tsx
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Flame } from 'lucide-react';
import type { BucketAllocation as BucketAllocationType } from '@/types/autopilot';

interface BucketAllocationProps {
  allocation: BucketAllocationType;
}

export function BucketAllocation({ allocation }: BucketAllocationProps) {
  const buckets = [
    {
      key: 'safe' as const,
      label: 'SAFE',
      icon: Shield,
      color: 'bg-success',
      textColor: 'text-success',
      data: allocation.safe,
    },
    {
      key: 'medium' as const,
      label: 'MEDIUM',
      icon: AlertTriangle,
      color: 'bg-warning',
      textColor: 'text-warning',
      data: allocation.medium,
    },
    {
      key: 'high' as const,
      label: 'HIGH',
      icon: Flame,
      color: 'bg-destructive',
      textColor: 'text-destructive',
      data: allocation.high,
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Bucket Allocation</h4>
      
      <div className="space-y-2">
        {buckets.map(({ key, label, icon: Icon, color, textColor, data }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${textColor}`} />
                <span className="font-medium">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={textColor}>
                  {data.current}/{data.max}
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${data.current === data.max ? 'border-muted-foreground' : ''}`}
                >
                  {Math.round(data.percent)}%
                </Badge>
              </div>
            </div>
            <Progress 
              value={data.percent} 
              className="h-2"
              // Use indicatorClassName if available, otherwise style container
            />
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>Total Positions</span>
        <span className="font-mono">
          {allocation.safe.current + allocation.medium.current + allocation.high.current} / {allocation.safe.max + allocation.medium.max + allocation.high.max}
        </span>
      </div>
    </div>
  );
}
