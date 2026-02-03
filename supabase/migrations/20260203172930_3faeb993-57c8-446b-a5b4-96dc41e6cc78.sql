-- ============================================
-- AUTOPILOT POSITIONS (Paper + Live ready)
-- ============================================
CREATE TABLE IF NOT EXISTS public.autopilot_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'paper' CHECK (mode IN ('paper', 'live')),
  symbol TEXT NOT NULL,
  symbol_id UUID REFERENCES public.symbols(id),
  long_exchange TEXT NOT NULL,
  short_exchange TEXT NOT NULL,
  long_market_id UUID REFERENCES public.markets(id),
  short_market_id UUID REFERENCES public.markets(id),
  
  -- Position details
  size_eur NUMERIC NOT NULL,
  leverage NUMERIC NOT NULL DEFAULT 1,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('safe', 'medium', 'high')),
  
  -- Entry data
  entry_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_long_price NUMERIC NOT NULL,
  entry_short_price NUMERIC NOT NULL,
  entry_funding_spread_8h NUMERIC NOT NULL,
  entry_score INTEGER NOT NULL,
  
  -- Current state
  current_long_price NUMERIC,
  current_short_price NUMERIC,
  funding_collected_eur NUMERIC NOT NULL DEFAULT 0,
  intervals_collected INTEGER NOT NULL DEFAULT 0,
  unrealized_pnl_eur NUMERIC NOT NULL DEFAULT 0,
  unrealized_pnl_percent NUMERIC NOT NULL DEFAULT 0,
  
  -- Exit data (null if open)
  exit_ts TIMESTAMPTZ,
  exit_long_price NUMERIC,
  exit_short_price NUMERIC,
  realized_pnl_eur NUMERIC,
  realized_pnl_percent NUMERIC,
  exit_reason TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'stopped')),
  
  -- Risk snapshot at entry
  risk_snapshot JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for autopilot_positions
CREATE INDEX IF NOT EXISTS idx_autopilot_positions_status ON public.autopilot_positions(status);
CREATE INDEX IF NOT EXISTS idx_autopilot_positions_mode ON public.autopilot_positions(mode);
CREATE INDEX IF NOT EXISTS idx_autopilot_positions_symbol ON public.autopilot_positions(symbol);

-- ============================================
-- AUTOPILOT AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.autopilot_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'action')),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON public.autopilot_audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.autopilot_audit_log(action);

-- ============================================
-- AUTOPILOT STATE (singleton config/status)
-- ============================================
CREATE TABLE IF NOT EXISTS public.autopilot_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'off' CHECK (mode IN ('off', 'paper', 'live')),
  is_running BOOLEAN NOT NULL DEFAULT false,
  last_scan_ts TIMESTAMPTZ,
  last_trade_ts TIMESTAMPTZ,
  total_realized_pnl_eur NUMERIC NOT NULL DEFAULT 0,
  total_funding_collected_eur NUMERIC NOT NULL DEFAULT 0,
  daily_drawdown_eur NUMERIC NOT NULL DEFAULT 0,
  kill_switch_active BOOLEAN NOT NULL DEFAULT false,
  kill_switch_reason TEXT,
  config_snapshot JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.autopilot_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_state ENABLE ROW LEVEL SECURITY;

-- Allow public read (single user system)
CREATE POLICY "Public read autopilot_positions" ON public.autopilot_positions
  FOR SELECT USING (true);

CREATE POLICY "Public read autopilot_audit_log" ON public.autopilot_audit_log
  FOR SELECT USING (true);

CREATE POLICY "Public read autopilot_state" ON public.autopilot_state
  FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Service role manage autopilot_positions" ON public.autopilot_positions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role manage autopilot_audit_log" ON public.autopilot_audit_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role manage autopilot_state" ON public.autopilot_state
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Trigger for updated_at
-- ============================================
CREATE TRIGGER update_autopilot_positions_updated_at
  BEFORE UPDATE ON public.autopilot_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_autopilot_state_updated_at
  BEFORE UPDATE ON public.autopilot_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();