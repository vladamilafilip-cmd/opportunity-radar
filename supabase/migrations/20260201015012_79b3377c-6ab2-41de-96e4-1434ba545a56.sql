-- ============================================
-- CRYPTO ARBITRAGE OS - COMPLETE DATABASE SCHEMA (FIXED)
-- ============================================

-- 0) ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.plan_tier AS ENUM ('free', 'pro', 'elite', 'team');
CREATE TYPE public.market_type AS ENUM ('spot', 'perpetual', 'futures', 'option');
CREATE TYPE public.alert_channel AS ENUM ('telegram', 'discord', 'email', 'webhook');
CREATE TYPE public.order_side AS ENUM ('buy', 'sell');
CREATE TYPE public.order_type AS ENUM ('market', 'limit', 'stop_market', 'stop_limit');
CREATE TYPE public.order_status AS ENUM ('pending', 'open', 'filled', 'partially_filled', 'cancelled', 'rejected');
CREATE TYPE public.position_side AS ENUM ('long', 'short');
CREATE TYPE public.signal_type AS ENUM (
  'funding_extreme', 
  'funding_divergence', 
  'cross_exchange_spread', 
  'basis_yield', 
  'composite_arbitrage',
  'volatility_spike',
  'abnormal_volume',
  'breakout_momentum',
  'funding_flip',
  'liquidation_cascade'
);

-- ============================================
-- 1) CORE USER TABLES
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  telegram_chat_id TEXT,
  discord_user_id TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- ============================================
-- 2) PLANS & SUBSCRIPTIONS
-- ============================================

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier plan_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'GBP',
  max_symbols INTEGER NOT NULL DEFAULT 10,
  max_alerts_per_day INTEGER NOT NULL DEFAULT 20,
  api_enabled BOOLEAN NOT NULL DEFAULT false,
  api_rate_limit_per_min INTEGER DEFAULT 0,
  backtest_enabled BOOLEAN NOT NULL DEFAULT false,
  realtime_data BOOLEAN NOT NULL DEFAULT false,
  data_delay_seconds INTEGER NOT NULL DEFAULT 300,
  speculative_zone_full BOOLEAN NOT NULL DEFAULT false,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  api_calls INTEGER NOT NULL DEFAULT 0,
  alerts_sent INTEGER NOT NULL DEFAULT 0,
  backtest_runs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

-- ============================================
-- 3) REFERENCE DATA
-- ============================================

CREATE TABLE public.exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  api_base_url TEXT,
  ws_base_url TEXT,
  maker_fee DECIMAL(8,6) NOT NULL DEFAULT 0.0002,
  taker_fee DECIMAL(8,6) NOT NULL DEFAULT 0.0004,
  withdrawal_fees JSONB DEFAULT '{}'::jsonb,
  supported_features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_asset TEXT NOT NULL,
  quote_asset TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT DEFAULT 'crypto',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (base_asset, quote_asset)
);

CREATE TABLE public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID REFERENCES public.exchanges(id) ON DELETE CASCADE NOT NULL,
  symbol_id UUID REFERENCES public.symbols(id) ON DELETE CASCADE NOT NULL,
  market_type market_type NOT NULL,
  exchange_symbol TEXT NOT NULL,
  min_order_size DECIMAL(20,10),
  max_order_size DECIMAL(20,10),
  tick_size DECIMAL(20,10),
  lot_size DECIMAL(20,10),
  liquidity_tier INTEGER DEFAULT 3 CHECK (liquidity_tier BETWEEN 1 AND 5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exchange_id, exchange_symbol)
);

-- ============================================
-- 4) RAW EVENT LAKE
-- ============================================

CREATE TABLE public.raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL,
  hash_dedup TEXT NOT NULL UNIQUE,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_events_source_type_ts ON public.raw_events(source, event_type, ts DESC);
CREATE INDEX idx_raw_events_processed ON public.raw_events(processed) WHERE NOT processed;

-- ============================================
-- 5) TIME-SERIES DATA (non-partitioned for MVP, easier management)
-- ============================================

CREATE TABLE public.funding_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES public.markets(id) ON DELETE CASCADE NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  funding_rate DECIMAL(20,10) NOT NULL,
  next_funding_ts TIMESTAMPTZ,
  predicted_rate DECIMAL(20,10),
  source_event_id UUID REFERENCES public.raw_events(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES public.markets(id) ON DELETE CASCADE NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  last_price DECIMAL(20,10) NOT NULL,
  mark_price DECIMAL(20,10),
  index_price DECIMAL(20,10),
  bid_price DECIMAL(20,10),
  ask_price DECIMAL(20,10),
  volume_24h DECIMAL(30,10),
  open_interest DECIMAL(30,10),
  source_event_id UUID REFERENCES public.raw_events(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_funding_rates_market_ts ON public.funding_rates(market_id, ts DESC);
CREATE INDEX idx_prices_market_ts ON public.prices(market_id, ts DESC);
CREATE INDEX idx_funding_rates_ts ON public.funding_rates(ts DESC);
CREATE INDEX idx_prices_ts ON public.prices(ts DESC);

-- ============================================
-- 6) COMPUTED METRICS
-- ============================================

CREATE TABLE public.computed_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES public.markets(id) ON DELETE CASCADE NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(30,15) NOT NULL,
  params JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_computed_metrics_market_name_ts ON public.computed_metrics(market_id, metric_name, ts DESC);

-- ============================================
-- 7) SCORING CONFIG (versioned)
-- ============================================

CREATE TABLE public.scoring_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  weights JSONB NOT NULL DEFAULT '{
    "funding_rate": 0.30,
    "divergence": 0.20,
    "spread": 0.25,
    "basis": 0.15,
    "momentum": 0.10
  }'::jsonb,
  caps JSONB NOT NULL DEFAULT '{
    "fr_cap": 0.01,
    "div_cap": 0.01,
    "netspread_cap": 0.01,
    "basis_cap": 0.10,
    "z_cap": 4,
    "mom_cap": 4
  }'::jsonb,
  thresholds JSONB NOT NULL DEFAULT '{
    "watch": 70,
    "strong": 85,
    "extreme": 95
  }'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- 8) SIGNALS
-- ============================================

CREATE TABLE public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES public.markets(id) ON DELETE CASCADE NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  signal_type signal_type NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  reason JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_version_id UUID REFERENCES public.scoring_versions(id),
  is_speculative BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signals_market_type_ts ON public.signals(market_id, signal_type, ts DESC);
CREATE INDEX idx_signals_score ON public.signals(score DESC) WHERE score >= 70;

-- ============================================
-- 9) OPPORTUNITIES
-- ============================================

CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_id UUID REFERENCES public.symbols(id) NOT NULL,
  opportunity_type TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  estimated_yield_annual DECIMAL(10,4),
  estimated_yield_8h DECIMAL(10,6),
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('safe', 'medium', 'high', 'extreme')),
  exchanges UUID[] NOT NULL,
  long_market_id UUID REFERENCES public.markets(id),
  short_market_id UUID REFERENCES public.markets(id),
  spread_percent DECIMAL(10,6),
  net_after_fees DECIMAL(10,6),
  reason JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_speculative BOOLEAN NOT NULL DEFAULT false,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_opportunities_score ON public.opportunities(score DESC);
CREATE INDEX idx_opportunities_type_score ON public.opportunities(opportunity_type, score DESC);

-- ============================================
-- 10) ALERTS
-- ============================================

CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  channel alert_channel NOT NULL DEFAULT 'telegram',
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  min_score INTEGER DEFAULT 70,
  signal_types signal_type[] DEFAULT '{}',
  exchange_filter UUID[],
  symbol_filter UUID[],
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE CASCADE NOT NULL,
  signal_id UUID REFERENCES public.signals(id),
  opportunity_id UUID REFERENCES public.opportunities(id),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL,
  delivered_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivered_status IN ('pending', 'sent', 'failed', 'skipped')),
  error_text TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_events_rule_ts ON public.alert_events(alert_rule_id, ts DESC);

-- ============================================
-- 11) USER FAVORITES
-- ============================================

CREATE TABLE public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol_id UUID REFERENCES public.symbols(id) ON DELETE CASCADE,
  market_id UUID REFERENCES public.markets(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_favorites_symbol ON public.user_favorites(user_id, symbol_id) WHERE symbol_id IS NOT NULL;
CREATE UNIQUE INDEX idx_user_favorites_market ON public.user_favorites(user_id, market_id) WHERE market_id IS NOT NULL;

-- ============================================
-- 12) OPS & OBSERVABILITY
-- ============================================

CREATE TABLE public.ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  run_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE public.dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  error_count_1h INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 13) PAPER TRADING / EXECUTION
-- ============================================

CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  is_paper BOOLEAN NOT NULL DEFAULT true,
  initial_balance DECIMAL(20,8) NOT NULL DEFAULT 10000,
  current_balance DECIMAL(20,8) NOT NULL DEFAULT 10000,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  market_id UUID REFERENCES public.markets(id) NOT NULL,
  side position_side NOT NULL,
  entry_price DECIMAL(20,10) NOT NULL,
  current_price DECIMAL(20,10) NOT NULL,
  size DECIMAL(20,10) NOT NULL,
  leverage DECIMAL(5,2) NOT NULL DEFAULT 1,
  unrealized_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  realized_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  liquidation_price DECIMAL(20,10),
  stop_loss DECIMAL(20,10),
  take_profit DECIMAL(20,10),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated'))
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  market_id UUID REFERENCES public.markets(id) NOT NULL,
  position_id UUID REFERENCES public.positions(id),
  side order_side NOT NULL,
  order_type order_type NOT NULL,
  price DECIMAL(20,10),
  size DECIMAL(20,10) NOT NULL,
  filled_size DECIMAL(20,10) NOT NULL DEFAULT 0,
  avg_fill_price DECIMAL(20,10),
  status order_status NOT NULL DEFAULT 'pending',
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  price DECIMAL(20,10) NOT NULL,
  size DECIMAL(20,10) NOT NULL,
  fee DECIMAL(20,10) NOT NULL DEFAULT 0,
  fee_currency TEXT NOT NULL DEFAULT 'USD',
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pnl_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_value DECIMAL(20,8) NOT NULL,
  unrealized_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  realized_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  drawdown_percent DECIMAL(8,4),
  sharpe_ratio DECIMAL(8,4)
);

CREATE TABLE public.risk_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL UNIQUE,
  max_position_size DECIMAL(20,8),
  max_daily_loss DECIMAL(20,8),
  max_drawdown_percent DECIMAL(5,2),
  max_leverage DECIMAL(5,2) DEFAULT 10,
  kill_switch_enabled BOOLEAN NOT NULL DEFAULT true,
  kill_switch_triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 14) BACKTEST
-- ============================================

CREATE TABLE public.backtest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  config JSONB NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  markets UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  results JSONB,
  total_trades INTEGER,
  win_rate DECIMAL(5,2),
  total_pnl DECIMAL(20,8),
  max_drawdown DECIMAL(8,4),
  sharpe_ratio DECIMAL(8,4),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 15) API KEYS
-- ============================================

CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 16) ROLLUP TABLES
-- ============================================

CREATE TABLE public.funding_rates_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES public.markets(id) ON DELETE CASCADE NOT NULL,
  hour TIMESTAMPTZ NOT NULL,
  avg_rate DECIMAL(20,15),
  min_rate DECIMAL(20,15),
  max_rate DECIMAL(20,15),
  sample_count INTEGER,
  UNIQUE (market_id, hour)
);

CREATE TABLE public.opportunities_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  symbol_id UUID REFERENCES public.symbols(id) NOT NULL,
  opportunity_type TEXT NOT NULL,
  avg_score INTEGER,
  max_score INTEGER,
  opportunity_count INTEGER,
  avg_yield DECIMAL(10,6),
  UNIQUE (date, symbol_id, opportunity_type)
);

-- ============================================
-- SECURITY FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id UUID)
RETURNS plan_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.tier
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.user_id = _user_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computed_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_versions ENABLE ROW LEVEL SECURITY;

-- User data policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own usage" ON public.usage_counters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own alerts" ON public.alert_rules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own alert events" ON public.alert_events FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.alert_rules ar WHERE ar.id = alert_rule_id AND ar.user_id = auth.uid()));
CREATE POLICY "Users can manage own favorites" ON public.user_favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own portfolios" ON public.portfolios FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own positions" ON public.positions FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can manage own orders" ON public.orders FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can manage own API keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own backtests" ON public.backtest_runs FOR ALL USING (auth.uid() = user_id);

-- Public read for reference data
CREATE POLICY "Public read exchanges" ON public.exchanges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read symbols" ON public.symbols FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read markets" ON public.markets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Public read funding_rates" ON public.funding_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read prices" ON public.prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read metrics" ON public.computed_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read signals" ON public.signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read opportunities" ON public.opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read scoring" ON public.scoring_versions FOR SELECT TO authenticated USING (true);

-- Admin write for reference data
CREATE POLICY "Admins can manage exchanges" ON public.exchanges FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage symbols" ON public.symbols FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage markets" ON public.markets FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage scoring" ON public.scoring_versions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Service role policies for ingestion (edge functions use service role)
CREATE POLICY "Service can insert funding_rates" ON public.funding_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert prices" ON public.prices FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert metrics" ON public.computed_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert signals" ON public.signals FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can manage opportunities" ON public.opportunities FOR ALL USING (true);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.subscriptions (user_id, plan_id)
  SELECT NEW.id, p.id FROM public.plans p WHERE p.tier = 'free' LIMIT 1;
  
  INSERT INTO public.portfolios (user_id, name, is_paper)
  VALUES (NEW.id, 'Paper Trading', true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO public.plans (tier, name, description, price_monthly, max_symbols, max_alerts_per_day, api_enabled, api_rate_limit_per_min, backtest_enabled, realtime_data, data_delay_seconds, speculative_zone_full, features) VALUES
('free', 'Free', 'Basic access with limited features', 0, 10, 20, false, 0, false, false, 300, false, '["Top 10 symbols", "Delayed data (5 min)", "Basic alerts", "Speculative zone lite"]'),
('pro', 'Pro', 'Full access for serious traders', 20, 200, 200, true, 60, true, true, 0, true, '["200+ symbols", "Real-time data", "Full API access", "Backtest simulator", "History export", "Full speculative zone"]'),
('elite', 'Elite', 'Unlimited everything + advanced features', 50, -1, -1, true, 300, true, true, 0, true, '["Unlimited symbols", "Unlimited alerts", "High-frequency API", "Advanced metrics", "Priority support", "Semi-auto execution (coming)"]'),
('team', 'Team', 'For trading teams and organizations', 200, -1, -1, true, 1000, true, true, 0, true, '["Everything in Elite", "Multiple seats", "Shared rules", "Org API keys", "Audit logs", "Dedicated support"]');

INSERT INTO public.exchanges (code, name, maker_fee, taker_fee) VALUES
('binance', 'Binance', 0.0002, 0.0004),
('bybit', 'Bybit', 0.0001, 0.0006),
('okx', 'OKX', 0.0002, 0.0005),
('deribit', 'Deribit', 0.0000, 0.0003),
('htx', 'HTX (Huobi)', 0.0002, 0.0004),
('gate', 'Gate.io', 0.0002, 0.0005),
('kucoin', 'KuCoin', 0.0002, 0.0006),
('bitget', 'Bitget', 0.0002, 0.0006);

INSERT INTO public.symbols (base_asset, quote_asset, display_name, category) VALUES
('BTC', 'USDT', 'BTC/USDT', 'major'),
('ETH', 'USDT', 'ETH/USDT', 'major'),
('BNB', 'USDT', 'BNB/USDT', 'major'),
('SOL', 'USDT', 'SOL/USDT', 'major'),
('XRP', 'USDT', 'XRP/USDT', 'major'),
('DOGE', 'USDT', 'DOGE/USDT', 'meme'),
('ADA', 'USDT', 'ADA/USDT', 'altcoin'),
('AVAX', 'USDT', 'AVAX/USDT', 'altcoin'),
('LINK', 'USDT', 'LINK/USDT', 'defi'),
('DOT', 'USDT', 'DOT/USDT', 'altcoin'),
('MATIC', 'USDT', 'MATIC/USDT', 'layer2'),
('UNI', 'USDT', 'UNI/USDT', 'defi'),
('ATOM', 'USDT', 'ATOM/USDT', 'altcoin'),
('LTC', 'USDT', 'LTC/USDT', 'major'),
('ARB', 'USDT', 'ARB/USDT', 'layer2'),
('OP', 'USDT', 'OP/USDT', 'layer2'),
('APT', 'USDT', 'APT/USDT', 'altcoin'),
('SUI', 'USDT', 'SUI/USDT', 'altcoin'),
('PEPE', 'USDT', 'PEPE/USDT', 'meme'),
('WIF', 'USDT', 'WIF/USDT', 'meme');

INSERT INTO public.markets (exchange_id, symbol_id, market_type, exchange_symbol, liquidity_tier)
SELECT e.id, s.id, 'perpetual', s.base_asset || 'USDT', 
  CASE WHEN s.category = 'major' THEN 1 WHEN s.category IN ('defi', 'layer2') THEN 2 WHEN s.category = 'altcoin' THEN 3 ELSE 4 END
FROM public.exchanges e CROSS JOIN public.symbols s WHERE e.code IN ('binance', 'bybit');

INSERT INTO public.scoring_versions (version, is_active, description) VALUES ('v1.0.0', true, 'Initial production scoring model');

INSERT INTO public.system_health (component, status) VALUES
('binance_ingestion', 'healthy'),
('bybit_ingestion', 'healthy'),
('metrics_engine', 'healthy'),
('scoring_engine', 'healthy'),
('alerts_engine', 'healthy');