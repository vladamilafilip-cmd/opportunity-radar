-- =====================================================
-- CRYPTO ARBITRAGE OS: METRICS & SCORING ENGINE SCHEMA
-- =====================================================

-- Create the signal_status enum if not exists
DO $$ BEGIN
  CREATE TYPE signal_status AS ENUM ('open', 'closed', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new signal types to existing enum if not present
DO $$ BEGIN
  ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'funding_arbitrage';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'spread_arbitrage';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'basis_arbitrage';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 1. COMPUTED METRICS TABLE (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.computed_metrics_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  ts_bucket TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- References
  symbol_id UUID NOT NULL REFERENCES public.symbols(id),
  market_id UUID NOT NULL REFERENCES public.markets(id),
  exchange_id UUID NOT NULL REFERENCES public.exchanges(id),
  
  -- Raw data
  funding_rate_raw NUMERIC NOT NULL DEFAULT 0,
  funding_interval_hours INTEGER NOT NULL DEFAULT 8,
  mark_price NUMERIC NOT NULL DEFAULT 0,
  
  -- Normalized metrics
  funding_rate_8h NUMERIC NOT NULL DEFAULT 0,
  funding_rate_annual NUMERIC NOT NULL DEFAULT 0,
  spread_bps NUMERIC NOT NULL DEFAULT 0,
  volume_24h NUMERIC DEFAULT 0,
  open_interest NUMERIC DEFAULT 0,
  
  -- Cost estimates
  taker_fee_bps NUMERIC NOT NULL DEFAULT 4,
  slippage_bps NUMERIC NOT NULL DEFAULT 2,
  total_cost_bps NUMERIC NOT NULL DEFAULT 0,
  
  -- Derived scores
  liquidity_score NUMERIC NOT NULL DEFAULT 0 CHECK (liquidity_score >= 0 AND liquidity_score <= 100),
  volatility_score NUMERIC NOT NULL DEFAULT 50,
  data_quality NUMERIC DEFAULT 1.0 CHECK (data_quality >= 0 AND data_quality <= 1)
);

CREATE INDEX IF NOT EXISTS idx_computed_metrics_v2_ts ON public.computed_metrics_v2 (ts DESC);
CREATE INDEX IF NOT EXISTS idx_computed_metrics_v2_symbol ON public.computed_metrics_v2 (symbol_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_computed_metrics_v2_market ON public.computed_metrics_v2 (market_id, ts DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_computed_metrics_v2_unique ON public.computed_metrics_v2 (market_id, ts_bucket);

-- =====================================================
-- 2. ARBITRAGE OPPORTUNITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.arbitrage_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  ts_bucket TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Symbol
  symbol_id UUID NOT NULL REFERENCES public.symbols(id),
  
  -- Exchange pair
  long_market_id UUID NOT NULL REFERENCES public.markets(id),
  short_market_id UUID NOT NULL REFERENCES public.markets(id),
  long_exchange_id UUID NOT NULL REFERENCES public.exchanges(id),
  short_exchange_id UUID NOT NULL REFERENCES public.exchanges(id),
  
  -- Funding data
  long_funding_8h NUMERIC NOT NULL DEFAULT 0,
  short_funding_8h NUMERIC NOT NULL DEFAULT 0,
  funding_spread_8h NUMERIC NOT NULL DEFAULT 0,
  
  -- Price data
  long_price NUMERIC NOT NULL DEFAULT 0,
  short_price NUMERIC NOT NULL DEFAULT 0,
  price_spread_bps NUMERIC NOT NULL DEFAULT 0,
  
  -- Costs (bps)
  long_fee_bps NUMERIC NOT NULL DEFAULT 4,
  short_fee_bps NUMERIC NOT NULL DEFAULT 4,
  total_fees_bps NUMERIC NOT NULL DEFAULT 8,
  slippage_bps NUMERIC NOT NULL DEFAULT 4,
  spread_cost_bps NUMERIC NOT NULL DEFAULT 0,
  total_cost_bps NUMERIC NOT NULL DEFAULT 0,
  
  -- Profit calculations
  gross_edge_8h_bps NUMERIC NOT NULL DEFAULT 0,
  net_edge_8h_bps NUMERIC NOT NULL DEFAULT 0,
  net_edge_annual_percent NUMERIC NOT NULL DEFAULT 0,
  
  -- Scores (0-100)
  profit_score NUMERIC NOT NULL DEFAULT 0 CHECK (profit_score >= 0 AND profit_score <= 100),
  liquidity_score NUMERIC NOT NULL DEFAULT 0 CHECK (liquidity_score >= 0 AND liquidity_score <= 100),
  stability_score NUMERIC NOT NULL DEFAULT 0 CHECK (stability_score >= 0 AND stability_score <= 100),
  risk_penalty NUMERIC NOT NULL DEFAULT 0 CHECK (risk_penalty >= 0 AND risk_penalty <= 50),
  opportunity_score NUMERIC NOT NULL DEFAULT 0 CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
  confidence_score NUMERIC NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Classification
  risk_tier TEXT NOT NULL DEFAULT 'medium' CHECK (risk_tier IN ('safe', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stale', 'expired')),
  expires_at TIMESTAMPTZ,
  reason JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_arb_opps_ts ON public.arbitrage_opportunities (ts DESC);
CREATE INDEX IF NOT EXISTS idx_arb_opps_symbol ON public.arbitrage_opportunities (symbol_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_arb_opps_score ON public.arbitrage_opportunities (opportunity_score DESC, ts DESC);
CREATE INDEX IF NOT EXISTS idx_arb_opps_status ON public.arbitrage_opportunities (status, ts DESC);
CREATE INDEX IF NOT EXISTS idx_arb_opps_active_score ON public.arbitrage_opportunities (opportunity_score DESC) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_arb_opps_unique ON public.arbitrage_opportunities (symbol_id, long_exchange_id, short_exchange_id, ts_bucket);

-- =====================================================
-- 3. TRADING SIGNALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.trading_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  opportunity_id UUID REFERENCES public.arbitrage_opportunities(id),
  symbol_id UUID NOT NULL REFERENCES public.symbols(id),
  
  signal_type TEXT NOT NULL CHECK (signal_type IN ('funding_arbitrage', 'spread_arbitrage', 'basis_arbitrage', 'momentum')),
  direction TEXT NOT NULL CHECK (direction IN ('long_short', 'short_long')),
  
  long_exchange TEXT NOT NULL,
  short_exchange TEXT NOT NULL,
  
  net_profit_estimate_bps NUMERIC NOT NULL DEFAULT 0,
  net_profit_estimate_percent NUMERIC NOT NULL DEFAULT 0,
  
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  
  ttl_seconds INTEGER NOT NULL DEFAULT 28800,
  expires_at TIMESTAMPTZ NOT NULL,
  next_funding_time TIMESTAMPTZ,
  
  status signal_status NOT NULL DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  closed_reason TEXT,
  
  reason JSONB DEFAULT '{}'::jsonb,
  is_speculative BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_trading_signals_ts ON public.trading_signals (ts DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol ON public.trading_signals (symbol_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_status ON public.trading_signals (status, ts DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_score ON public.trading_signals (score DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_trading_signals_expires ON public.trading_signals (expires_at) WHERE status = 'open';

-- =====================================================
-- 4. ENGINE CONFIG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.engine_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO public.engine_config (config_key, config_value, description) VALUES
  ('scoring_weights', '{"profit": 0.50, "liquidity": 0.25, "stability": 0.25}'::jsonb, 'Weights for opportunity score'),
  ('thresholds', '{"min_net_edge_bps": 20, "min_opportunity_score": 60, "signal_ttl_hours": 8}'::jsonb, 'Signal generation thresholds'),
  ('costs', '{"default_slippage_bps": 2, "extreme_funding_threshold": 0.01}'::jsonb, 'Default cost assumptions'),
  ('funding_intervals', '{"binance": 8, "bybit": 8, "okx": 8, "deribit": 8, "bitmex": 8, "dydx": 1, "hyperliquid": 1}'::jsonb, 'Funding hours by exchange'),
  ('risk_penalties', '{"extreme_funding": 10, "low_liquidity": 15, "high_volatility": 10, "stale_data": 20}'::jsonb, 'Risk penalty values')
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- 5. ENGINE RUN LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.engine_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  markets_processed INTEGER DEFAULT 0,
  metrics_computed INTEGER DEFAULT 0,
  opportunities_found INTEGER DEFAULT 0,
  signals_generated INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  config_snapshot JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_engine_runs_started ON public.engine_runs (started_at DESC);

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================
ALTER TABLE public.computed_metrics_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbitrage_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read computed_metrics_v2" ON public.computed_metrics_v2 FOR SELECT USING (true);
CREATE POLICY "Public read arbitrage_opportunities" ON public.arbitrage_opportunities FOR SELECT USING (true);
CREATE POLICY "Public read trading_signals" ON public.trading_signals FOR SELECT USING (true);
CREATE POLICY "Public read engine_config" ON public.engine_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage engine_config" ON public.engine_config FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view engine_runs" ON public.engine_runs FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.normalize_funding_8h(funding_rate NUMERIC, interval_hours INTEGER)
RETURNS NUMERIC AS $$
BEGIN
  IF interval_hours <= 0 THEN RETURN 0; END IF;
  RETURN funding_rate * (8.0 / interval_hours);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.annualize_8h_rate(rate_8h NUMERIC) 
RETURNS NUMERIC AS $$
BEGIN
  RETURN rate_8h * 1095; -- 3 periods/day * 365 days
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.calc_liquidity_score(spread_bps NUMERIC) 
RETURNS NUMERIC AS $$
BEGIN
  RETURN GREATEST(0, LEAST(100, 100 - LEAST(spread_bps, 100)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.calc_profit_score(net_edge_bps NUMERIC) 
RETURNS NUMERIC AS $$
BEGIN
  RETURN GREATEST(0, LEAST(100, LEAST(net_edge_bps, 100)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.cleanup_engine_data() 
RETURNS void AS $$
BEGIN
  DELETE FROM public.computed_metrics_v2 WHERE ts < now() - INTERVAL '7 days';
  DELETE FROM public.arbitrage_opportunities WHERE ts < now() - INTERVAL '7 days';
  UPDATE public.trading_signals SET status = 'expired', updated_at = now() WHERE status = 'open' AND expires_at < now();
  DELETE FROM public.trading_signals WHERE ts < now() - INTERVAL '30 days';
  DELETE FROM public.engine_runs WHERE started_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.normalize_funding_8h TO service_role;
GRANT EXECUTE ON FUNCTION public.annualize_8h_rate TO service_role;
GRANT EXECUTE ON FUNCTION public.calc_liquidity_score TO service_role;
GRANT EXECUTE ON FUNCTION public.calc_profit_score TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_engine_data TO service_role;