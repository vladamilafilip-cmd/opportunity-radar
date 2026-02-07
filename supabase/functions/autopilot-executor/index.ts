// supabase/functions/autopilot-executor/index.ts
// Automatic scanner and executor for funding arbitrage bot
// Triggered by cron every minute - Supports LIVE and PAPER trading

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import ccxt from 'npm:ccxt';

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
  thresholds: { safe: { minProfitBps: 1, maxSpreadBps: 50 } },
  risk: { maxConcurrentHedges: 8, maxDailyDrawdownEur: 50 },
};

// ============= CCXT Exchange Integration =============

interface ExchangeClients {
  binance: ccxt.binance;
  okx: ccxt.okx;
}

interface HedgeResult {
  success: boolean;
  longPrice: number;
  shortPrice: number;
  longOrderId?: string;
  shortOrderId?: string;
  error?: string;
}

function initializeExchanges(useSandbox: boolean = false): ExchangeClients | null {
  // IMPORTANT: Binance futures testnet is DEPRECATED (see CCXT announcement)
  // For PAPER mode, we use mainnet keys for price fetch only (NO trade execution)
  // For LIVE mode, we use mainnet keys and execute real trades
  
  const binanceKey = Deno.env.get('BINANCE_API_KEY');
  const binanceSecret = Deno.env.get('BINANCE_API_SECRET');
  const okxKey = Deno.env.get('OKX_API_KEY');
  const okxSecret = Deno.env.get('OKX_API_SECRET');
  const okxPassphrase = Deno.env.get('OKX_PASSPHRASE');

  // Check minimum required keys (Binance + OKX only)
  if (!binanceKey || !binanceSecret || !okxKey || !okxSecret || !okxPassphrase) {
    return null;
  }

  const binance = new ccxt.binance({
    apiKey: binanceKey,
    secret: binanceSecret,
    options: { defaultType: 'future' },
  });
  // DO NOT use sandbox mode - Binance futures testnet is deprecated

  const okx = new ccxt.okx({
    apiKey: okxKey,
    secret: okxSecret,
    password: okxPassphrase,
  });
  // DO NOT use sandbox mode for OKX either

  return { binance, okx };
}

function normalizeCcxtSymbol(symbol: string): string {
  // Convert "BTC/USDT" or "BTCUSDT" to "BTC/USDT:USDT" for futures
  const cleaned = symbol.replace('/USDT', '').replace('USDT', '').replace('-', '');
  return `${cleaned}/USDT:USDT`;
}

function getExchangeClient(exchanges: ExchangeClients, exchangeName: string): ccxt.Exchange | null {
  const name = exchangeName.toLowerCase();
  if (name.includes('binance')) return exchanges.binance;
  if (name.includes('okx') || name.includes('okex')) return exchanges.okx;
  return null;
}

async function executeLiveHedge(
  exchanges: ExchangeClients,
  symbol: string,
  longExchange: string,
  shortExchange: string,
  sizeEur: number,
  log: (msg: string) => void
): Promise<HedgeResult> {
  try {
    const longEx = getExchangeClient(exchanges, longExchange);
    const shortEx = getExchangeClient(exchanges, shortExchange);

    if (!longEx || !shortEx) {
      return { 
        success: false, 
        longPrice: 0, 
        shortPrice: 0, 
        error: `Exchange not found: ${longExchange} or ${shortExchange}` 
      };
    }

    const ccxtSymbol = normalizeCcxtSymbol(symbol);
    log(`LIVE: Preparing hedge on ${ccxtSymbol}`);

    // Fetch current price from long exchange
    const ticker = await longEx.fetchTicker(ccxtSymbol);
    const price = ticker.last || 0;
    
    if (price === 0) {
      return { success: false, longPrice: 0, shortPrice: 0, error: 'Could not fetch price' };
    }

    // Calculate size in base currency
    const size = sizeEur / price;
    log(`LIVE: Price ${price}, size ${size.toFixed(6)} @ €${sizeEur}`);

    // Execute both legs simultaneously with Promise.allSettled for atomic handling
    const [longOrder, shortOrder] = await Promise.allSettled([
      longEx.createMarketOrder(ccxtSymbol, 'buy', size),
      shortEx.createMarketOrder(ccxtSymbol, 'sell', size),
    ]);

    // Both succeeded
    if (longOrder.status === 'fulfilled' && shortOrder.status === 'fulfilled') {
      log(`LIVE: Both legs filled - Long: ${longOrder.value.average}, Short: ${shortOrder.value.average}`);
      return {
        success: true,
        longPrice: longOrder.value.average || price,
        shortPrice: shortOrder.value.average || price,
        longOrderId: longOrder.value.id,
        shortOrderId: shortOrder.value.id,
      };
    }

    // Handle partial failures - attempt atomic rollback
    if (longOrder.status === 'fulfilled' && shortOrder.status === 'rejected') {
      log(`LIVE: Short leg failed, rolling back long: ${shortOrder.reason}`);
      try {
        await longEx.createMarketOrder(ccxtSymbol, 'sell', size);
        log('LIVE: Rollback successful');
      } catch (rollbackErr) {
        log(`LIVE: Rollback failed: ${rollbackErr}`);
      }
      return { 
        success: false, 
        longPrice: 0, 
        shortPrice: 0, 
        error: `Short leg failed: ${shortOrder.reason}` 
      };
    }

    if (shortOrder.status === 'fulfilled' && longOrder.status === 'rejected') {
      log(`LIVE: Long leg failed, rolling back short: ${longOrder.reason}`);
      try {
        await shortEx.createMarketOrder(ccxtSymbol, 'buy', size);
        log('LIVE: Rollback successful');
      } catch (rollbackErr) {
        log(`LIVE: Rollback failed: ${rollbackErr}`);
      }
      return { 
        success: false, 
        longPrice: 0, 
        shortPrice: 0, 
        error: `Long leg failed: ${longOrder.reason}` 
      };
    }

    // Both failed
    const longErr = longOrder.status === 'rejected' ? String(longOrder.reason) : 'unknown';
    const shortErr = shortOrder.status === 'rejected' ? String(shortOrder.reason) : 'unknown';
    return { 
      success: false, 
      longPrice: 0, 
      shortPrice: 0, 
      error: `Both legs failed - Long: ${longErr}, Short: ${shortErr}` 
    };

  } catch (error) {
    return { 
      success: false, 
      longPrice: 0, 
      shortPrice: 0, 
      error: String(error) 
    };
  }
}

// ============= Main Handler =============

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

    // Initialize exchange clients (for price fetching and LIVE trading only)
    let exchanges: ExchangeClients | null = null;
    
    exchanges = initializeExchanges(false); // Always use mainnet
    if (!exchanges) {
      if (mode === 'live') {
        log('ERROR: LIVE mode requires API keys - cannot proceed');
        await supabase.from('autopilot_audit_log').insert({
          action: 'LIVE_CONFIG_ERROR',
          level: 'error',
          details: { error: 'API keys not configured for LIVE mode' },
        });
        return new Response(JSON.stringify({ ok: false, error: 'API keys not configured' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        log('PAPER: API keys not configured - using mock prices');
      }
    } else {
      log(`Exchanges initialized (mode: ${mode})`);
    }

    // 2. Get open positions
    const { data: positions, error: posError } = await supabase
      .from('autopilot_positions')
      .select('id, size_eur, unrealized_pnl_eur, symbol')
      .eq('status', 'open');

    if (posError) throw posError;

    const openCount = positions?.length || 0;
    const deployedEur = positions?.reduce((sum, p) => sum + (p.size_eur || 0), 0) || 0;
    const openSymbols = new Set(positions?.map(p => p.symbol) || []);
    const config = DEFAULT_CONFIG;

    log(`Open positions: ${openCount}, deployed: €${deployedEur}`);

    // 3. Check limits
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

    // 4. Get allowed exchanges (Binance + OKX only)
    const { data: exchangesData, error: exError } = await supabase
      .from('exchanges')
      .select('id, code, name')
      .or('code.ilike.%binance%,code.ilike.%okx%,code.ilike.%okex%');

    if (exError) throw exError;

    const exchangeIds = (exchangesData || []).map(e => e.id);
    const exchangeMap = new Map((exchangesData || []).map(e => [e.id, e]));
    
    log(`Found ${exchangeIds.length} allowed exchanges: ${(exchangesData || []).map(e => e.code).join(', ')}`);

    if (exchangeIds.length === 0) {
      log('No allowed exchanges found in DB');
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: true, skipped: 'no_exchanges' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Find opportunities
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

    const validOpps = (opportunities || []).filter(opp => 
      opp.long_exchange_id !== opp.short_exchange_id
    );

    log(`Found ${validOpps.length} valid opportunities`);

    if (validOpps.length === 0) {
      log('No valid opportunities found');
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: true, skipped: 'no_opportunities' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Find opportunity we don't have position on
    let selectedOpp: typeof validOpps[0] | null = null;
    let symbol = '';
    let longEx = '';
    let shortEx = '';
    let spreadBps = 0;
    let entryScore = 80;

    for (const opp of validOpps.slice(0, 10)) {
      const oppSymbol = (opp.symbols as any)?.display_name || 'Unknown';
      const oppSpreadBps = Number(opp.net_edge_8h_bps) || 0;

      if (oppSpreadBps < config.thresholds.safe.minProfitBps) {
        continue;
      }

      // Check if already have position (using cached set)
      if (openSymbols.has(oppSymbol)) {
        log(`${oppSymbol}: Already have position, trying next...`);
        continue;
      }

      const longExData = exchangeMap.get(opp.long_exchange_id);
      const shortExData = exchangeMap.get(opp.short_exchange_id);
      const potentialLongEx = longExData?.name || 'Binance';
      const potentialShortEx = shortExData?.name || 'OKX';

      // Check if exchanges support the required clients
      if (exchanges) {
        const longClient = getExchangeClient(exchanges, potentialLongEx);
        const shortClient = getExchangeClient(exchanges, potentialShortEx);
        if (!longClient || !shortClient) {
          log(`${oppSymbol}: Skipping - exchange not available (${potentialLongEx}/${potentialShortEx})`);
          continue;
        }
      }

      selectedOpp = opp;
      symbol = oppSymbol;
      longEx = potentialLongEx;
      shortEx = potentialShortEx;
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

    // 7. Execute position - LIVE, PAPER (testnet), or mock
    const hedgeId = crypto.randomUUID();
    const riskTier = String(selectedOpp.risk_tier || 'safe');
    let entryLongPrice: number;
    let entryShortPrice: number;
    let longOrderId: string | undefined;
    let shortOrderId: string | undefined;
    let executionMode = mode;

    if (mode === 'live' && exchanges) {
      // LIVE mode - execute real trades on mainnet
      log(`LIVE: Executing hedge for ${symbol}`);
      
      const hedgeResult = await executeLiveHedge(
        exchanges,
        symbol,
        longEx,
        shortEx,
        config.capital.hedgeSizeEur,
        log
      );

      if (!hedgeResult.success) {
        log(`LIVE hedge failed: ${hedgeResult.error}`);
        await supabase.from('autopilot_audit_log').insert({
          action: 'LIVE_HEDGE_FAILED',
          level: 'error',
          details: { symbol, longEx, shortEx, error: hedgeResult.error },
        });
        
        await updateLastScan(supabase);
        return new Response(JSON.stringify({ 
          ok: false, 
          error: hedgeResult.error,
          logs 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      entryLongPrice = hedgeResult.longPrice;
      entryShortPrice = hedgeResult.shortPrice;
      longOrderId = hedgeResult.longOrderId;
      shortOrderId = hedgeResult.shortOrderId;
      
      log(`LIVE: Hedge executed - Long: ${entryLongPrice}, Short: ${entryShortPrice}`);
      
    } else if (mode === 'paper') {
      // PAPER mode - simulate with real prices but NO actual trades
      // (Binance futures testnet is deprecated)
      executionMode = 'paper';
      
      if (exchanges) {
        // Fetch real price for realistic simulation
        try {
          const ccxtSymbol = normalizeCcxtSymbol(symbol);
          const ticker = await exchanges.binance.fetchTicker(ccxtSymbol);
          entryLongPrice = ticker.last || 50000;
          entryShortPrice = entryLongPrice * 1.0001;
          log(`PAPER: Simulated entry at real price ${entryLongPrice}`);
        } catch (priceError) {
          log(`PAPER: Price fetch failed, using mock - ${priceError}`);
          entryLongPrice = symbol.includes('BTC') ? 95000 : 
                           symbol.includes('ETH') ? 3400 : 
                           symbol.includes('SOL') ? 180 : 100;
          entryShortPrice = entryLongPrice * 1.0001;
        }
      } else {
        // No API keys - use mock prices
        entryLongPrice = symbol.includes('BTC') ? 95000 : 
                         symbol.includes('ETH') ? 3400 : 
                         symbol.includes('SOL') ? 180 : 100;
        entryShortPrice = entryLongPrice * 1.0001;
        log(`PAPER (mock): Prices - Long: ${entryLongPrice}, Short: ${entryShortPrice}`);
      }
      
    } else {
      // Fallback - no exchanges available for LIVE
      log('ERROR: No exchanges available for execution');
      await updateLastScan(supabase);
      return new Response(JSON.stringify({ ok: false, error: 'No exchanges available' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 8. Insert position
    insertPayload = {
      hedge_id: hedgeId,
      symbol,
      long_exchange: longEx,
      short_exchange: shortEx,
      risk_tier: riskTier,
      size_eur: config.capital.hedgeSizeEur,
      entry_long_price: entryLongPrice,
      entry_short_price: entryShortPrice,
      entry_funding_spread_8h: spreadBps,
      entry_score: entryScore,
      mode: executionMode,
      status: 'open',
      leverage: 1,
      unrealized_pnl_eur: 0,
      unrealized_pnl_percent: 0,
      funding_collected_eur: 0,
      intervals_collected: 0,
      pnl_drift: 0,
      current_long_price: entryLongPrice,
      current_short_price: entryShortPrice,
      risk_snapshot: { 
        deployed: deployedEur + config.capital.hedgeSizeEur,
        longOrderId,
        shortOrderId,
      },
    };

    const { error: insertError } = await supabase
      .from('autopilot_positions')
      .insert(insertPayload);

    if (insertError) throw insertError;

    log(`Opened ${executionMode.toUpperCase()} position: ${symbol} €${config.capital.hedgeSizeEur} @ ${spreadBps}bps`);

    // 9. Audit log
    await supabase.from('autopilot_audit_log').insert({
      action: `${executionMode === 'live' ? 'LIVE' : 'PAPER'}_ENTRY: ${symbol}`,
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
        entryLongPrice,
        entryShortPrice,
        mode: executionMode,
        longOrderId,
        shortOrderId,
      },
    });

    await updateLastScan(supabase);

    return new Response(JSON.stringify({
      ok: true,
      action: 'opened_position',
      mode: executionMode,
      symbol,
      spreadBps,
      entryScore,
      entryLongPrice,
      entryShortPrice,
      logs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[autopilot-executor] Error:', error);
    
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
