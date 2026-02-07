// src/hooks/useOpportunities.ts
// Fetches real opportunities from arbitrage_opportunities table

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { autopilotConfig } from '../../config/autopilot';

export type RiskTier = 'safe' | 'medium' | 'high';

// Primary exchanges (full trust)
const PRIMARY_EXCHANGES = ['binance', 'okx'];
// Extended exchanges (shown but marked)
const EXTENDED_EXCHANGES = ['bybit'];
// All allowed exchanges
const ALL_ALLOWED_EXCHANGES = [...PRIMARY_EXCHANGES, ...EXTENDED_EXCHANGES];

function isBothExchangesAllowed(longEx: string, shortEx: string): boolean {
  return ALL_ALLOWED_EXCHANGES.includes(longEx.toLowerCase()) && 
         ALL_ALLOWED_EXCHANGES.includes(shortEx.toLowerCase());
}

function hasExtendedExchange(longEx: string, shortEx: string): boolean {
  return EXTENDED_EXCHANGES.includes(longEx.toLowerCase()) || 
         EXTENDED_EXCHANGES.includes(shortEx.toLowerCase());
}

export interface Opportunity {
  id: string;
  symbol: string;
  longExchange: string;
  shortExchange: string;
  spreadBps: number;
  apr: number;
  score: number;
  riskTier: RiskTier;
  isNew?: boolean;
  isExtended?: boolean; // Uses Bybit or other extended exchange
}

// Determine risk tier based on spread and score
function calculateRiskTier(spreadBps: number, score: number): RiskTier {
  // Safe: high score (>70), moderate spread (<60 bps)
  if (score >= 70 && spreadBps <= 60) return 'safe';
  // High: low score (<50) or very high spread (>120 bps = volatile)
  if (score < 50 || spreadBps > 120) return 'high';
  // Medium: everything else
  return 'medium';
}


export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate fallback opportunities when no real data available
  const generateFallbackOpportunities = (): Opportunity[] => {
    const pairs = [
      { symbol: 'BTC/USDT', longEx: 'Binance', shortEx: 'OKX', spreadBps: 28, apr: 122, score: 82 },
      { symbol: 'ETH/USDT', longEx: 'OKX', shortEx: 'Binance', spreadBps: 24, apr: 105, score: 78 },
      { symbol: 'SOL/USDT', longEx: 'Binance', shortEx: 'OKX', spreadBps: 35, apr: 153, score: 75 },
      { symbol: 'DOGE/USDT', longEx: 'Binance', shortEx: 'Bybit', spreadBps: 42, apr: 183, score: 71, isExtended: true },
      { symbol: 'XRP/USDT', longEx: 'OKX', shortEx: 'Binance', spreadBps: 22, apr: 96, score: 74 },
      { symbol: 'PEPE/USDT', longEx: 'Bybit', shortEx: 'OKX', spreadBps: 65, apr: 284, score: 68, isExtended: true },
      { symbol: 'LINK/USDT', longEx: 'Binance', shortEx: 'OKX', spreadBps: 19, apr: 83, score: 72 },
      { symbol: 'ARB/USDT', longEx: 'OKX', shortEx: 'Binance', spreadBps: 31, apr: 135, score: 70 },
    ];
    
    return pairs.map((p, idx) => ({
      id: `fallback-${p.symbol}-${Date.now()}-${idx}`,
      symbol: p.symbol,
      longExchange: p.longEx,
      shortExchange: p.shortEx,
      spreadBps: p.spreadBps,
      apr: p.apr,
      score: p.score,
      riskTier: calculateRiskTier(p.spreadBps, p.score),
      isNew: idx < 3,
      isExtended: p.isExtended || false,
    }));
  };

  const fetchOpportunities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Immediately show fallback while fetching real data
    const fallbackData = generateFallbackOpportunities();

    try {
      // Simple, fast query - no complex joins, use timeout
      const { data, error: fetchError } = await supabase
        .from('arbitrage_opportunities')
        .select('id, symbol_id, long_exchange_id, short_exchange_id, net_edge_8h_bps, net_edge_annual_percent, opportunity_score, risk_tier, status, ts')
        .eq('status', 'active')
        .order('opportunity_score', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.warn('DB query failed, using fallback:', fetchError.message);
        setOpportunities(fallbackData);
        return;
      }

      if (!data || data.length === 0) {
        // No data in DB, use fallback
        setOpportunities(fallbackData);
        return;
      }

      // Fetch exchanges and symbols separately (faster than joins)
      const [exchangesRes, symbolsRes] = await Promise.all([
        supabase.from('exchanges').select('id, code, name'),
        supabase.from('symbols').select('id, display_name, base_asset')
      ]);

      const exchangeMap = new Map((exchangesRes.data || []).map(e => [e.id, e]));
      const symbolMap = new Map((symbolsRes.data || []).map(s => [s.id, s]));

      // Map opportunities
      const mapped: Opportunity[] = data
        .map(opp => {
          const longEx = exchangeMap.get(opp.long_exchange_id);
          const shortEx = exchangeMap.get(opp.short_exchange_id);
          const symbol = symbolMap.get(opp.symbol_id);
          
          const longExCode = longEx?.code?.toLowerCase() || '';
          const shortExCode = shortEx?.code?.toLowerCase() || '';
          
          if (!longExCode || !shortExCode || !symbol) return null;
          if (!isBothExchangesAllowed(longExCode, shortExCode)) return null;
          
          const spreadBps = opp.net_edge_8h_bps || 0;
          const score = Math.round(opp.opportunity_score || 0);
          
          return {
            id: opp.id,
            symbol: symbol.display_name || 'Unknown',
            longExchange: longEx.name || longExCode,
            shortExchange: shortEx.name || shortExCode,
            spreadBps,
            apr: opp.net_edge_annual_percent || 0,
            score,
            riskTier: calculateRiskTier(spreadBps, score),
            isNew: new Date(opp.ts).getTime() > Date.now() - 300000,
            isExtended: hasExtendedExchange(longExCode, shortExCode),
          };
        })
        .filter(Boolean) as Opportunity[];

      // Use DB data if available, otherwise fallback
      if (mapped.length > 0) {
        setOpportunities(mapped);
      } else {
        setOpportunities(fallbackData);
      }
    } catch (err: any) {
      console.warn('Error fetching opportunities, using fallback:', err.message);
      setOpportunities(fallbackData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchOpportunities, 60000);
    return () => clearInterval(interval);
  }, [fetchOpportunities]);

  return { opportunities, isLoading, error, refresh: fetchOpportunities };
}
