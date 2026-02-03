// src/components/autopilot/RiskWarningBanner.tsx
// Reusable risk warning banner for LIVE trading

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  X, 
  ChevronDown, 
  ChevronUp,
  ExternalLink 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface RiskWarningBannerProps {
  variant?: 'full' | 'compact';
  dismissible?: boolean;
  storageKey?: string;
  className?: string;
}

const RISK_POINTS = [
  'Funding rates can change unexpectedly',
  'Execution slippage may exceed estimates',
  'Exchange API failures can cause losses',
  'Past performance does not guarantee future results',
];

export function RiskWarningBanner({
  variant = 'full',
  dismissible = true,
  storageKey = 'autopilot-risk-dismissed',
  className,
}: RiskWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (storageKey) {
      const dismissed = localStorage.getItem(storageKey);
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
  };

  const handleReset = () => {
    setIsDismissed(false);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  if (isDismissed && dismissible) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Alert className={cn("bg-warning/10 border-warning/30", className)}>
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm text-warning">
            Market-neutral strategy. Profit is <strong>NOT</strong> guaranteed.
          </span>
          <div className="flex items-center gap-2">
            <Link 
              to="/risk-disclosure" 
              className="text-xs text-warning underline hover:text-warning/80"
            >
              Learn more
            </Link>
            {dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Alert className={cn("bg-warning/10 border-warning/30", className)}>
        <AlertTriangle className="h-5 w-5 text-warning" />
        <AlertTitle className="text-warning font-semibold">
          RISK DISCLOSURE
        </AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="text-sm text-warning/90">
            This is a market-neutral funding arbitrage strategy. 
            While designed to minimize directional exposure, 
            <strong> profit is NOT guaranteed.</strong>
          </p>

          <CollapsibleContent className="space-y-2">
            <ul className="list-disc list-inside text-sm text-warning/80 space-y-1">
              {RISK_POINTS.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>

            <p className="text-sm font-semibold text-warning">
              USE AT YOUR OWN RISK. Never trade with funds you cannot afford to lose.
            </p>
          </CollapsibleContent>

          <div className="flex items-center justify-between pt-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-warning hover:text-warning/80">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show Details
                  </>
                )}
              </Button>
            </CollapsibleTrigger>

            <div className="flex items-center gap-2">
              <Link to="/risk-disclosure">
                <Button variant="outline" size="sm" className="text-warning border-warning/30 hover:bg-warning/10">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Full Disclosure
                </Button>
              </Link>
              
              {dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-warning hover:text-warning/80"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </Collapsible>
  );
}

// Export utility to reset dismissed state (for settings page)
export function resetRiskWarningDismissal(storageKey = 'autopilot-risk-dismissed') {
  localStorage.removeItem(storageKey);
}
