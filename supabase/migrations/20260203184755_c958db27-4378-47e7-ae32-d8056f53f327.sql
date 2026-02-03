-- Add hedge_id and pnl_drift columns to autopilot_positions
ALTER TABLE public.autopilot_positions 
ADD COLUMN IF NOT EXISTS hedge_id uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pnl_drift numeric DEFAULT 0;

-- Add dry_run_enabled to autopilot_state
ALTER TABLE public.autopilot_state 
ADD COLUMN IF NOT EXISTS dry_run_enabled boolean DEFAULT false;

-- Create index for hedge lookups
CREATE INDEX IF NOT EXISTS idx_autopilot_positions_hedge_id ON public.autopilot_positions(hedge_id) WHERE hedge_id IS NOT NULL;

-- Update mode default to 'live' for new records
ALTER TABLE public.autopilot_state ALTER COLUMN mode SET DEFAULT 'live';