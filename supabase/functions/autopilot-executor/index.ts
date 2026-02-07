// supabase/functions/autopilot-executor/index.ts
// Automatic scanner and executor for funding arbitrage bot
// Triggered by cron every minute

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutopilotConfig {
  capital: {
    hedgeSizeEur: number;
    maxDeployedEur: number;
  };
  thresholds: {
    safe: { minProfitBps: number; maxSpreadBps: number };
  };
  risk: {
    maxConcurrentHedges: number;
    maxDailyDrawdownEur: number;
  };
}

const DEFAULT_CONFIG: AutopilotConfig = {
  capital: { hedgeSizeEur: 50, maxDeployedEur: 400 },
  thresholds: { safe: { minProfitBps: 5, maxSpreadBps: 25 } }, // Lowered from 30 to 5 bps
  risk: { maxConcurrentHedges: 8, maxDailyDrawdownEur: 50 },
};

// Allowed exchanges for trading
const ALLOWED_EXCHANGES = ['binance', 'okx', 'bybit'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[autopilot-executor] ${msg}`);
    logs.push(msg);
  };

  try {
    log('Starting scan cycle...');

    // 1. Get autopilot state
    const { data: state, error: stateError } = await supabase
      .from('autopilot_state')
      .select('*')
      .limit(1)
      .single();

    if (stateError || !state) {
      log('No autopilot state found, skipping');
      return new Response(JSON.stringify({ ok: false, reason: 'no_state' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if running and not in kill switch
    if (!state.is_running) {
      log('Autopilot not running, skipping');
      return new Response(JSON.stringify({ ok: true, skipped: 'not_running' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (state.kill_switch_active) {
      log('Kill switch active, skipping');
      return new Response(JSON.stringify({ ok: true, skipped: 'kill_switch' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mode = state.mode || 'paper';
    log(`Mode: ${mode}`);

    // 2. Get open positions count and deployed capital
    const { data: positions, error: posError } = await supabase
      .from('autopilot_positions')
      .select('id, size_eur, unrealized_pnl_eur')
      .eq('status', 'open');

    if (posError) throw posError;

    const openCount = positions?.length || 0;
    const deployedEur = positions?.reduce((sum, p) => sum + (p.size_eur || 0), 0) || 0;
    const config = DEFAULT_CONFIG;

    log(`Open positions: ${openCount}, deployed: €${deployedEur}`);

    // 3. Check if can open new position
    if (openCount >= config.risk.maxConcurrentHedges) {
      log('Max positions reached, skipping entry');
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: true, skipped: 'max_positions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (deployedEur + config.capital.hedgeSizeEur > config.capital.maxDeployedEur) {
      log('Max deployed capital reached, skipping entry');
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: true, skipped: 'max_capital' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Find best opportunity from allowed exchanges
    const { data: opportunities, error: oppError } = await supabase
      .from('arbitrage_opportunities')
      .select(`
        id,
        symbol_id,
        net_edge_8h_bps,
        opportunity_score,
        risk_tier,
        symbols:symbol_id (display_name, base_asset),
        long_exchange:long_exchange_id (code, name),
        short_exchange:short_exchange_id (code, name)
      `)
      .eq('status', 'active')
      .gte('net_edge_8h_bps', 5) // Min 5 bps profit
      .order('opportunity_score', { ascending: false })
      .limit(50);

    if (oppError) throw oppError;

    // Filter for allowed exchanges (Binance, OKX, Bybit) and safe/medium risk
    const validOpps = (opportunities || []).filter(opp => {
      const longEx = (opp.long_exchange as any)?.code?.toLowerCase();
      const shortEx = (opp.short_exchange as any)?.code?.toLowerCase();
      const riskTier = opp.risk_tier || 'medium';
      
      // Must be on allowed exchanges
      if (!ALLOWED_EXCHANGES.includes(longEx) || !ALLOWED_EXCHANGES.includes(shortEx)) {
        return false;
      }
      // Must be different exchanges
      if (longEx === shortEx) return false;
      // Only safe or medium risk for auto-trading
      if (riskTier === 'high') return false;
      
      return true;
    });

    log(`Found ${opportunities?.length || 0} total, ${validOpps.length} valid for Binance/OKX/Bybit`);

    if (validOpps.length === 0) {
      log('No valid opportunities found');
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: true, skipped: 'no_opportunities' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get best opportunity
    const best = validOpps[0];
    const symbol = (best.symbols as any)?.display_name || 'Unknown';
    const longEx = (best.long_exchange as any)?.name || 'Binance';
    const shortEx = (best.short_exchange as any)?.name || 'OKX';
    const spreadBps = best.net_edge_8h_bps || 0;

    log(`Best opportunity: ${symbol} L:${longEx} S:${shortEx} spread:${spreadBps}bps`);

    // Check minimum profit threshold
    if (spreadBps < config.thresholds.safe.minProfitBps) {
      log(`Spread ${spreadBps}bps below threshold ${config.thresholds.safe.minProfitBps}bps`);
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: true, skipped: 'low_spread' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Check if we already have position on this symbol
    const { data: existingPos } = await supabase
      .from('autopilot_positions')
      .select('id')
      .eq('symbol', symbol)
      .eq('status', 'open')
      .limit(1);

    if (existingPos && existingPos.length > 0) {
      log(`Already have position on ${symbol}, skipping`);
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: true, skipped: 'duplicate_symbol' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Open new position (paper mode - mock prices)
    const mockPrice = symbol.includes('BTC') ? 95000 : 
                      symbol.includes('ETH') ? 3400 : 
                      symbol.includes('SOL') ? 180 : 100;

    const hedgeId = crypto.randomUUID();
    const positionData = {
      hedge_id: hedgeId,
      symbol,
      long_exchange: longEx,
      short_exchange: shortEx,
      risk_tier: best.risk_tier || 'safe',
      size_eur: config.capital.hedgeSizeEur,
      entry_long_price: mockPrice,
      entry_short_price: mockPrice * 1.0001,
      entry_funding_spread_8h: spreadBps / 10000,
      entry_score: best.opportunity_score || 80,
      mode,
      status: 'open',
      leverage: 1,
      unrealized_pnl_eur: 0,
      unrealized_pnl_percent: 0,
      funding_collected_eur: 0,
      intervals_collected: 0,
      risk_snapshot: { deployed: deployedEur + config.capital.hedgeSizeEur },
    };

    const { error: insertError } = await supabase
      .from('autopilot_positions')
      .insert(positionData);

    if (insertError) throw insertError;

    log(`Opened position: ${symbol} €${config.capital.hedgeSizeEur}`);

    // 7. Log to audit
    await supabase.from('autopilot_audit_log').insert({
      action: `AUTO_ENTRY: ${symbol}`,
      level: 'action',
      entity_type: 'position',
      entity_id: hedgeId,
      details: {
        symbol,
        longExchange: longEx,
        shortExchange: shortEx,
        sizeEur: config.capital.hedgeSizeEur,
        spreadBps,
        mode,
      },
    });

    // 8. Update last scan timestamp
    await updateLastScan(supabase);

    return new Response(JSON.stringify({
      ok: true,
      action: 'opened_position',
      symbol,
      spreadBps,
      logs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[autopilot-executor] Error:', error);
    
    // Log error to audit
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    await supabase.from('autopilot_audit_log').insert({
      action: 'EXECUTOR_ERROR',
      level: 'error',
      details: { error: error.message, logs },
    });

    return new Response(JSON.stringify({ 
      ok: false, 
      error: error.message,
      logs,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function updateLastScan(supabase: any) {
  await supabase
    .from('autopilot_state')
    .update({ last_scan_ts: new Date().toISOString() })
    .not('id', 'is', null);
}
