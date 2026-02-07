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
  thresholds: { safe: { minProfitBps: 1, maxSpreadBps: 50 } }, // Ultra aggressive: 1 bps min
  risk: { maxConcurrentHedges: 8, maxDailyDrawdownEur: 50 },
};

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

  // Track insert payload for error diagnostics
  let insertPayload: Record<string, unknown> = {};

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

    // 4. Get exchange IDs for Binance, OKX, Bybit (SQL-level filtering)
    const { data: exchanges, error: exError } = await supabase
      .from('exchanges')
      .select('id, code, name')
      .or('code.ilike.%binance%,code.ilike.%okx%,code.ilike.%okex%,code.ilike.%bybit%');

    if (exError) throw exError;

    const exchangeIds = (exchanges || []).map(e => e.id);
    const exchangeMap = new Map((exchanges || []).map(e => [e.id, e]));
    
    log(`Found ${exchangeIds.length} allowed exchanges: ${(exchanges || []).map(e => e.code).join(', ')}`);

    if (exchangeIds.length === 0) {
      log('No allowed exchanges found in DB');
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: true, skipped: 'no_exchanges' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Find opportunities ONLY from allowed exchanges (SQL-level filter)
    const { data: opportunities, error: oppError } = await supabase
      .from('arbitrage_opportunities')
      .select(`
        id,
        symbol_id,
        long_exchange_id,
        short_exchange_id,
        net_edge_8h_bps,
        opportunity_score,
        risk_tier,
        symbols:symbol_id (display_name, base_asset)
      `)
      .eq('status', 'active')
      .in('long_exchange_id', exchangeIds)
      .in('short_exchange_id', exchangeIds)
      .gte('net_edge_8h_bps', 1)
      .order('net_edge_8h_bps', { ascending: false })
      .limit(50);

    if (oppError) throw oppError;

    // Filter out same-exchange pairs (can't arbitrage same exchange)
    const validOpps = (opportunities || []).filter(opp => 
      opp.long_exchange_id !== opp.short_exchange_id
    );

    // Log found opportunities
    const topOpps = validOpps.slice(0, 5).map(o => ({
      symbol: (o.symbols as any)?.display_name,
      long: exchangeMap.get(o.long_exchange_id)?.code,
      short: exchangeMap.get(o.short_exchange_id)?.code,
      bps: o.net_edge_8h_bps,
      score: o.opportunity_score,
    }));
    log(`Top opportunities: ${JSON.stringify(topOpps)}`);
    log(`Found ${validOpps.length} valid Binance/OKX/Bybit opportunities`);

    if (validOpps.length === 0) {
      log('No valid opportunities found');
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: true, skipped: 'no_opportunities' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Iterate through top opportunities to find one we don't have
    let selectedOpp: typeof validOpps[0] | null = null;
    let symbol = '';
    let longEx = '';
    let shortEx = '';
    let spreadBps = 0;
    let entryScore = 80;

    for (const opp of validOpps.slice(0, 10)) {
      const oppSymbol = (opp.symbols as any)?.display_name || 'Unknown';
      const oppSpreadBps = Number(opp.net_edge_8h_bps) || 0;

      // Check minimum profit threshold first
      if (oppSpreadBps < config.thresholds.safe.minProfitBps) {
        log(`${oppSymbol}: Spread ${oppSpreadBps}bps below threshold, skipping`);
        continue;
      }

      // Check if we already have position on this symbol
      const { data: existing } = await supabase
        .from('autopilot_positions')
        .select('id')
        .eq('symbol', oppSymbol)
        .eq('status', 'open')
        .limit(1);

      if (existing && existing.length > 0) {
        log(`${oppSymbol}: Already have position, trying next...`);
        continue;
      }

      // Found a valid opportunity!
      selectedOpp = opp;
      symbol = oppSymbol;
      const longExData = exchangeMap.get(opp.long_exchange_id);
      const shortExData = exchangeMap.get(opp.short_exchange_id);
      longEx = longExData?.name || 'Binance';
      shortEx = shortExData?.name || 'OKX';
      spreadBps = oppSpreadBps;
      entryScore = Math.round(Number(opp.opportunity_score ?? 80));
      
      log(`Selected: ${symbol} L:${longEx} S:${shortEx} spread:${spreadBps}bps score:${entryScore}`);
      break;
    }

    if (!selectedOpp) {
      log('All top opportunities already have positions or below threshold');
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: true, skipped: 'all_duplicates' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. Open new position (paper mode - mock prices)
    const mockPrice = symbol.includes('BTC') ? 95000 : 
                      symbol.includes('ETH') ? 3400 : 
                      symbol.includes('SOL') ? 180 : 100;

    const hedgeId = crypto.randomUUID();
    const riskTier = String(selectedOpp.risk_tier || 'safe');
    
    // Build position data with correct types:
    // - entry_score: integer (must round decimal)
    // - entry_funding_spread_8h: numeric in BPS (UI expects bps)
    insertPayload = {
      hedge_id: hedgeId,
      symbol,
      long_exchange: longEx,
      short_exchange: shortEx,
      risk_tier: riskTier,
      size_eur: config.capital.hedgeSizeEur,
      entry_long_price: mockPrice,
      entry_short_price: mockPrice * 1.0001,
      entry_funding_spread_8h: spreadBps, // Store as BPS (e.g., 14.78)
      entry_score: entryScore, // Rounded integer
      mode,
      status: 'open',
      leverage: 1,
      unrealized_pnl_eur: 0,
      unrealized_pnl_percent: 0,
      funding_collected_eur: 0,
      intervals_collected: 0,
      pnl_drift: 0,
      risk_snapshot: { deployed: deployedEur + config.capital.hedgeSizeEur },
    };

    const { error: insertError } = await supabase
      .from('autopilot_positions')
      .insert(insertPayload);

    if (insertError) throw insertError;

    log(`Opened position: ${symbol} €${config.capital.hedgeSizeEur} @ ${spreadBps}bps`);

    // 8. Log to audit
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
        entryScore,
        mode,
      },
    });

    // 9. Update last scan timestamp
    await updateLastScan(supabase);

    return new Response(JSON.stringify({
      ok: true,
      action: 'opened_position',
      symbol,
      spreadBps,
      entryScore,
      logs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[autopilot-executor] Error:', error);
    
    // Log error to audit with diagnostic payload
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    await supabase.from('autopilot_audit_log').insert({
      action: 'EXECUTOR_ERROR',
      level: 'error',
      details: { 
        error: error.message, 
        insertPayload: Object.keys(insertPayload).length > 0 ? insertPayload : undefined,
        logs,
      },
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
