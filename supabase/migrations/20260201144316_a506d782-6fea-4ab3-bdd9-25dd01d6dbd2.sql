-- Fix function search_path security warnings
CREATE OR REPLACE FUNCTION public.normalize_funding_8h(funding_rate NUMERIC, interval_hours INTEGER)
RETURNS NUMERIC AS $$
BEGIN
  IF interval_hours <= 0 THEN RETURN 0; END IF;
  RETURN funding_rate * (8.0 / interval_hours);
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.annualize_8h_rate(rate_8h NUMERIC) 
RETURNS NUMERIC AS $$
BEGIN
  RETURN rate_8h * 1095;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.calc_liquidity_score(spread_bps NUMERIC) 
RETURNS NUMERIC AS $$
BEGIN
  RETURN GREATEST(0, LEAST(100, 100 - LEAST(spread_bps, 100)));
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.calc_profit_score(net_edge_bps NUMERIC) 
RETURNS NUMERIC AS $$
BEGIN
  RETURN GREATEST(0, LEAST(100, LEAST(net_edge_bps, 100)));
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;