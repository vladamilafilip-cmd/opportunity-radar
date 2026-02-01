-- ============================================
-- IQ200 TIER-BASED SCALING SYSTEM
-- Phase 1: Schema Extensions (Fixed)
-- ============================================

-- 1. Extend symbols table with tier columns
ALTER TABLE public.symbols 
ADD COLUMN IF NOT EXISTS symbol_tier integer DEFAULT 3 CHECK (symbol_tier BETWEEN 1 AND 4),
ADD COLUMN IF NOT EXISTS volatility_multiplier numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS is_meme boolean DEFAULT false;

-- Add index for tier-based queries
CREATE INDEX IF NOT EXISTS idx_symbols_tier ON public.symbols(symbol_tier) WHERE is_active = true;

-- 2. Extend exchanges table with tier and rate limit columns
ALTER TABLE public.exchanges
ADD COLUMN IF NOT EXISTS exchange_tier integer DEFAULT 2 CHECK (exchange_tier BETWEEN 1 AND 3),
ADD COLUMN IF NOT EXISTS rate_limit_per_min integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS batch_endpoint text,
ADD COLUMN IF NOT EXISTS funding_interval_hours integer DEFAULT 8;

-- Add index for tier-based queries
CREATE INDEX IF NOT EXISTS idx_exchanges_tier ON public.exchanges(exchange_tier) WHERE is_active = true;

-- 3. Create ingestion scheduling table
CREATE TABLE IF NOT EXISTS public.ingestion_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id uuid NOT NULL REFERENCES public.exchanges(id) ON DELETE CASCADE,
  symbol_tier integer NOT NULL CHECK (symbol_tier BETWEEN 1 AND 4),
  interval_minutes integer NOT NULL DEFAULT 5,
  last_run_at timestamptz,
  next_run_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  consecutive_failures integer DEFAULT 0,
  backoff_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(exchange_id, symbol_tier)
);

-- Enable RLS
ALTER TABLE public.ingestion_schedule ENABLE ROW LEVEL SECURITY;

-- Admin-only access for schedule management
CREATE POLICY "Admins can manage ingestion_schedule" 
ON public.ingestion_schedule FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public read for monitoring
CREATE POLICY "Public read ingestion_schedule" 
ON public.ingestion_schedule FOR SELECT 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_ingestion_schedule_updated_at
BEFORE UPDATE ON public.ingestion_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- 4. Insert tier configuration into engine_config
INSERT INTO public.engine_config (config_key, config_value, description) VALUES
('tier_intervals', '{"t1": 1, "t2": 3, "t3": 5, "t4": 10}', 'Refresh intervals in minutes per symbol tier'),
('exchange_tiers', '{"primary": ["binance", "bybit", "okx"], "secondary": ["bitget", "gate", "kucoin"], "tertiary": ["htx", "mexc", "kraken", "deribit"]}', 'Exchange tier assignments'),
('liquidity_filters', '{"min_volume_24h": 1000000, "max_spread_bps": 50, "min_data_quality": 0.5}', 'Pre-filters for market processing'),
('hub_exchanges', '["binance", "bybit", "okx"]', 'Hub exchanges for hub-spoke arbitrage model')
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = now();

-- 5. Create indexes for faster schedule lookups (without now() in predicate)
CREATE INDEX IF NOT EXISTS idx_ingestion_schedule_next_run 
ON public.ingestion_schedule(next_run_at) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ingestion_schedule_backoff 
ON public.ingestion_schedule(backoff_until) 
WHERE backoff_until IS NOT NULL;