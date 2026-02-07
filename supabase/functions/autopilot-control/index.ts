// supabase/functions/autopilot-control/index.ts
// Control plane for the one-page /bot UI - Supports LIVE and PAPER trading

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ccxt from 'npm:ccxt';

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ControlAction =
  | { action: "set_mode"; mode: "off" | "paper" | "live" }
  | { action: "set_running"; is_running: boolean }
  | { action: "reset_kill_switch" }
  | { action: "stop_all" }
  | { action: "close_position"; position_id: string; reason?: string }
  | { action: "open_position"; symbol: string; long_exchange: string; short_exchange: string; spread_bps: number; score: number };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============= CCXT Exchange Integration =============

interface ExchangeClients {
  binance: ccxt.binance;
  okx: ccxt.okx;
  bybit: ccxt.bybit;
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
  // Use testnet keys for sandbox mode, mainnet keys for live
  const binanceKey = useSandbox 
    ? Deno.env.get('BINANCE_TESTNET_API_KEY') 
    : Deno.env.get('BINANCE_API_KEY');
  const binanceSecret = useSandbox 
    ? Deno.env.get('BINANCE_TESTNET_API_SECRET') 
    : Deno.env.get('BINANCE_API_SECRET');
  const okxKey = Deno.env.get('OKX_API_KEY');
  const okxSecret = Deno.env.get('OKX_API_SECRET');
  const okxPassphrase = Deno.env.get('OKX_PASSPHRASE');

  if (!binanceKey || !binanceSecret || !okxKey || !okxSecret || !okxPassphrase) {
    return null;
  }

  const binance = new ccxt.binance({
    apiKey: binanceKey,
    secret: binanceSecret,
    options: { defaultType: 'future' },
  });

  if (useSandbox) {
    binance.setSandboxMode(true);
  }

  const okx = new ccxt.okx({
    apiKey: okxKey,
    secret: okxSecret,
    password: okxPassphrase,
  });

  if (useSandbox) {
    okx.setSandboxMode(true);
  }

  // Bybit - skip in sandbox mode unless it has dedicated testnet keys
  const bybitTestnetKey = Deno.env.get('BYBIT_TESTNET_API_KEY');
  const bybitTestnetSecret = Deno.env.get('BYBIT_TESTNET_API_SECRET');
  const bybitKey = useSandbox ? bybitTestnetKey : (Deno.env.get('BYBIT_API_KEY') || binanceKey);
  const bybitSecret = useSandbox ? bybitTestnetSecret : (Deno.env.get('BYBIT_API_SECRET') || binanceSecret);
  
  // Create bybit client only if we have valid keys (not null in sandbox mode)
  let bybit: ccxt.bybit | null = null;
  if (bybitKey && bybitSecret) {
    bybit = new ccxt.bybit({
      apiKey: bybitKey,
      secret: bybitSecret,
      options: { defaultType: 'linear' },
    });

    if (useSandbox) {
      bybit.setSandboxMode(true);
    }
  }

  return { binance, okx, bybit: bybit as ccxt.bybit };
}

function normalizeCcxtSymbol(symbol: string): string {
  const cleaned = symbol.replace('/USDT', '').replace('USDT', '').replace('-', '');
  return `${cleaned}/USDT:USDT`;
}

function getExchangeClient(exchanges: ExchangeClients, exchangeName: string): ccxt.Exchange | null {
  const name = exchangeName.toLowerCase();
  if (name.includes('binance')) return exchanges.binance;
  if (name.includes('okx') || name.includes('okex')) return exchanges.okx;
  if (name.includes('bybit')) return exchanges.bybit || null; // May be null in sandbox without testnet keys
  return null;
}

async function executeLiveHedge(
  exchanges: ExchangeClients,
  symbol: string,
  longExchange: string,
  shortExchange: string,
  sizeEur: number
): Promise<HedgeResult> {
  try {
    const longEx = getExchangeClient(exchanges, longExchange);
    const shortEx = getExchangeClient(exchanges, shortExchange);

    if (!longEx || !shortEx) {
      return { success: false, longPrice: 0, shortPrice: 0, error: `Exchange not found` };
    }

    const ccxtSymbol = normalizeCcxtSymbol(symbol);
    const ticker = await longEx.fetchTicker(ccxtSymbol);
    const price = ticker.last || 0;
    
    if (price === 0) {
      return { success: false, longPrice: 0, shortPrice: 0, error: 'Could not fetch price' };
    }

    const size = sizeEur / price;

    const [longOrder, shortOrder] = await Promise.allSettled([
      longEx.createMarketOrder(ccxtSymbol, 'buy', size),
      shortEx.createMarketOrder(ccxtSymbol, 'sell', size),
    ]);

    if (longOrder.status === 'fulfilled' && shortOrder.status === 'fulfilled') {
      return {
        success: true,
        longPrice: longOrder.value.average || price,
        shortPrice: shortOrder.value.average || price,
        longOrderId: longOrder.value.id,
        shortOrderId: shortOrder.value.id,
      };
    }

    // Atomic rollback on partial failure
    if (longOrder.status === 'fulfilled' && shortOrder.status === 'rejected') {
      try { await longEx.createMarketOrder(ccxtSymbol, 'sell', size); } catch {}
      return { success: false, longPrice: 0, shortPrice: 0, error: `Short leg failed: ${shortOrder.reason}` };
    }

    if (shortOrder.status === 'fulfilled' && longOrder.status === 'rejected') {
      try { await shortEx.createMarketOrder(ccxtSymbol, 'buy', size); } catch {}
      return { success: false, longPrice: 0, shortPrice: 0, error: `Long leg failed: ${longOrder.reason}` };
    }

    return { success: false, longPrice: 0, shortPrice: 0, error: 'Both legs failed' };
  } catch (error) {
    return { success: false, longPrice: 0, shortPrice: 0, error: String(error) };
  }
}

async function closeLiveHedge(
  exchanges: ExchangeClients,
  symbol: string,
  longExchange: string,
  shortExchange: string,
  sizeEur: number
): Promise<HedgeResult> {
  try {
    const longEx = getExchangeClient(exchanges, longExchange);
    const shortEx = getExchangeClient(exchanges, shortExchange);

    if (!longEx || !shortEx) {
      return { success: false, longPrice: 0, shortPrice: 0, error: 'Exchange not found' };
    }

    const ccxtSymbol = normalizeCcxtSymbol(symbol);
    const ticker = await longEx.fetchTicker(ccxtSymbol);
    const price = ticker.last || 0;
    const size = sizeEur / price;

    // Reverse: SELL long leg, BUY short leg
    const [closeLong, closeShort] = await Promise.allSettled([
      longEx.createMarketOrder(ccxtSymbol, 'sell', size),
      shortEx.createMarketOrder(ccxtSymbol, 'buy', size),
    ]);

    const longPrice = closeLong.status === 'fulfilled' ? (closeLong.value.average || price) : price;
    const shortPrice = closeShort.status === 'fulfilled' ? (closeShort.value.average || price) : price;

    return {
      success: closeLong.status === 'fulfilled' && closeShort.status === 'fulfilled',
      longPrice,
      shortPrice,
      error: closeLong.status === 'rejected' || closeShort.status === 'rejected' 
        ? 'One or both close orders failed' 
        : undefined,
    };
  } catch (error) {
    return { success: false, longPrice: 0, shortPrice: 0, error: String(error) };
  }
}

// ============= Main Handler =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) {
    return json({ error: "Missing backend configuration" }, 500);
  }

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  let payload: ControlAction;
  try {
    payload = (await req.json()) as ControlAction;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { data: stateRow, error: stateErr } = await admin
    .from("autopilot_state")
    .select("id, mode, kill_switch_active")
    .limit(1)
    .maybeSingle();

  if (stateErr) return json({ error: stateErr.message }, 500);

  const stateId = stateRow?.id as string | undefined;
  const currentMode = stateRow?.mode || 'paper';
  const nowIso = new Date().toISOString();

  // ============= SET MODE =============
  if (payload.action === "set_mode") {
    if (!stateId) {
      const { error } = await admin
        .from("autopilot_state")
        .insert({ mode: payload.mode, is_running: false });
      if (error) return json({ error: error.message }, 500);
    } else {
      const { error } = await admin
        .from("autopilot_state")
        .update({ mode: payload.mode, updated_at: nowIso })
        .eq("id", stateId);
      if (error) return json({ error: error.message }, 500);
    }

    // Log mode change
    await admin.from('autopilot_audit_log').insert({
      action: `MODE_CHANGE: ${payload.mode.toUpperCase()}`,
      level: 'action',
      details: { from: currentMode, to: payload.mode },
    });

    return json({ ok: true, mode: payload.mode });
  }

  if (!stateId) {
    return json({ error: "autopilot_state not initialized" }, 400);
  }

  // ============= SET RUNNING =============
  if (payload.action === "set_running") {
    const { error } = await admin
      .from("autopilot_state")
      .update({ is_running: payload.is_running, updated_at: nowIso })
      .eq("id", stateId);
    if (error) return json({ error: error.message }, 500);

    await admin.from('autopilot_audit_log').insert({
      action: payload.is_running ? 'BOT_STARTED' : 'BOT_STOPPED',
      level: 'action',
      details: { mode: currentMode },
    });

    return json({ ok: true, is_running: payload.is_running });
  }

  // ============= RESET KILL SWITCH =============
  if (payload.action === "reset_kill_switch") {
    const { error } = await admin
      .from("autopilot_state")
      .update({
        kill_switch_active: false,
        kill_switch_reason: null,
        daily_drawdown_eur: 0,
        updated_at: nowIso,
      })
      .eq("id", stateId);
    if (error) return json({ error: error.message }, 500);

    await admin.from('autopilot_audit_log').insert({
      action: 'KILL_SWITCH_RESET',
      level: 'action',
      details: {},
    });

    return json({ ok: true });
  }

  // ============= STOP ALL =============
  if (payload.action === "stop_all") {
    const { error: stopErr } = await admin
      .from("autopilot_state")
      .update({ is_running: false, updated_at: nowIso })
      .eq("id", stateId);
    if (stopErr) return json({ error: stopErr.message }, 500);

    // Get open LIVE positions for potential exchange close
    const { data: openPositions } = await admin
      .from("autopilot_positions")
      .select("*")
      .eq("status", "open");

    const livePositions = (openPositions || []).filter(p => p.mode === 'live');
    const paperPositions = (openPositions || []).filter(p => p.mode === 'paper');
    
    // Close LIVE positions on mainnet exchanges
    if (livePositions.length > 0) {
      const exchanges = initializeExchanges(false); // mainnet
      if (exchanges) {
        for (const pos of livePositions) {
          try {
            await closeLiveHedge(exchanges, pos.symbol, pos.long_exchange, pos.short_exchange, pos.size_eur);
          } catch (e) {
            console.error(`Failed to close LIVE position ${pos.id}:`, e);
          }
        }
      }
    }

    // Close PAPER positions on testnet exchanges
    if (paperPositions.length > 0) {
      const testnetExchanges = initializeExchanges(true); // testnet/sandbox
      if (testnetExchanges) {
        for (const pos of paperPositions) {
          try {
            await closeLiveHedge(testnetExchanges, pos.symbol, pos.long_exchange, pos.short_exchange, pos.size_eur);
          } catch (e) {
            console.error(`Failed to close PAPER position ${pos.id}:`, e);
          }
        }
      }
    }

    const { error: posErr } = await admin
      .from("autopilot_positions")
      .update({
        status: "stopped",
        exit_ts: nowIso,
        exit_reason: "Manual STOP ALL",
        updated_at: nowIso,
      })
      .eq("status", "open");

    if (posErr) return json({ error: posErr.message }, 500);

    await admin.from('autopilot_audit_log').insert({
      action: 'STOP_ALL',
      level: 'action',
      details: { closedCount: openPositions?.length || 0, liveClosedCount: livePositions.length },
    });

    return json({ ok: true });
  }

  // ============= CLOSE POSITION =============
  if (payload.action === "close_position") {
    // Fetch position details first
    const { data: position, error: posError } = await admin
      .from("autopilot_positions")
      .select("*")
      .eq("id", payload.position_id)
      .single();

    if (posError || !position) {
      return json({ error: "Position not found" }, 404);
    }

    let exitLongPrice = position.current_long_price;
    let exitShortPrice = position.current_short_price;
    let liveCloseSuccess = false;

    // Execute exchange close based on position mode
    if (position.mode === 'live' || position.mode === 'paper') {
      const useSandbox = position.mode === 'paper';
      const exchanges = initializeExchanges(useSandbox);
      
      if (exchanges) {
        const closeResult = await closeLiveHedge(
          exchanges,
          position.symbol,
          position.long_exchange,
          position.short_exchange,
          position.size_eur
        );

        if (closeResult.success) {
          exitLongPrice = closeResult.longPrice;
          exitShortPrice = closeResult.shortPrice;
          liveCloseSuccess = true;
        } else {
          // Log error but continue to update DB
          await admin.from('autopilot_audit_log').insert({
            action: 'LIVE_CLOSE_ERROR',
            level: 'error',
            entity_id: payload.position_id,
            details: { error: closeResult.error },
          });
        }
      } else {
        await admin.from('autopilot_audit_log').insert({
          action: 'LIVE_CLOSE_NO_KEYS',
          level: 'error',
          entity_id: payload.position_id,
          details: { error: 'API keys not configured' },
        });
      }
    }

    // Calculate realized PnL
    const priceDiff = (exitLongPrice - position.entry_long_price) - (exitShortPrice - position.entry_short_price);
    const realizedPnlEur = priceDiff * (position.size_eur / position.entry_long_price) + (position.funding_collected_eur || 0);
    const realizedPnlPercent = (realizedPnlEur / position.size_eur) * 100;

    const { error } = await admin
      .from("autopilot_positions")
      .update({
        status: "closed",
        exit_ts: nowIso,
        exit_reason: payload.reason ?? "Manual close",
        exit_long_price: exitLongPrice,
        exit_short_price: exitShortPrice,
        realized_pnl_eur: realizedPnlEur,
        realized_pnl_percent: realizedPnlPercent,
        updated_at: nowIso,
      })
      .eq("id", payload.position_id);

    if (error) return json({ error: error.message }, 500);

    await admin.from('autopilot_audit_log').insert({
      action: `CLOSE: ${position.symbol}`,
      level: 'action',
      entity_id: payload.position_id,
      details: { 
        reason: payload.reason, 
        realizedPnlEur,
        mode: position.mode,
        liveCloseSuccess,
      },
    });

    return json({ ok: true, liveClose: liveCloseSuccess, realizedPnlEur });
  }

  // ============= OPEN POSITION =============
  if (payload.action === "open_position") {
    if (stateRow?.kill_switch_active) {
      return json({ error: "Kill switch is active" }, 400);
    }

    const { count } = await admin
      .from("autopilot_positions")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");

    if ((count ?? 0) >= 8) {
      return json({ error: "Max 8 positions reached" }, 400);
    }

    const hedgeId = crypto.randomUUID();
    const hedgeSize = 50;
    const mode = currentMode;

    let entryLongPrice: number;
    let entryShortPrice: number;
    let longOrderId: string | undefined;
    let shortOrderId: string | undefined;

    if (mode === 'live' || mode === 'paper') {
      const useSandbox = mode === 'paper';
      const exchanges = initializeExchanges(useSandbox);
      
      if (!exchanges) {
        if (mode === 'live') {
          return json({ error: "API keys not configured for LIVE trading" }, 500);
        }
        // Paper mode without testnet keys - use mock prices
        const mockPrice = 50000 + Math.random() * 1000;
        const spreadPercent = payload.spread_bps / 100 / 100;
        entryLongPrice = mockPrice;
        entryShortPrice = mockPrice * (1 + spreadPercent * 0.1);
      } else {
        // Execute real trades (mainnet or testnet)
        const hedgeResult = await executeLiveHedge(
          exchanges,
          payload.symbol,
          payload.long_exchange,
          payload.short_exchange,
          hedgeSize
        );

        if (!hedgeResult.success) {
          await admin.from('autopilot_audit_log').insert({
            action: mode === 'live' ? 'MANUAL_LIVE_FAILED' : 'MANUAL_TESTNET_FAILED',
            level: 'error',
            details: { symbol: payload.symbol, error: hedgeResult.error },
          });
          return json({ error: hedgeResult.error }, 500);
        }

        entryLongPrice = hedgeResult.longPrice;
        entryShortPrice = hedgeResult.shortPrice;
        longOrderId = hedgeResult.longOrderId;
        shortOrderId = hedgeResult.shortOrderId;
      }
    } else {
      // OFF mode - shouldn't reach here but fallback to mock
      const mockPrice = 50000 + Math.random() * 1000;
      const spreadPercent = payload.spread_bps / 100 / 100;
      entryLongPrice = mockPrice;
      entryShortPrice = mockPrice * (1 + spreadPercent * 0.1);
    }

    const { error } = await admin.from("autopilot_positions").insert({
      hedge_id: hedgeId,
      mode,
      symbol: payload.symbol,
      long_exchange: payload.long_exchange,
      short_exchange: payload.short_exchange,
      size_eur: hedgeSize,
      leverage: 1,
      risk_tier: "safe",
      entry_ts: nowIso,
      entry_long_price: entryLongPrice,
      entry_short_price: entryShortPrice,
      entry_funding_spread_8h: payload.spread_bps / 100,
      entry_score: Math.round(payload.score),
      current_long_price: entryLongPrice,
      current_short_price: entryShortPrice,
      funding_collected_eur: 0,
      intervals_collected: 0,
      unrealized_pnl_eur: 0,
      unrealized_pnl_percent: 0,
      pnl_drift: 0,
      status: "open",
      risk_snapshot: { 
        manual: true, 
        opened_at: nowIso,
        longOrderId,
        shortOrderId,
      },
    });

    if (error) return json({ error: error.message }, 500);

    await admin.from('autopilot_audit_log').insert({
      action: `MANUAL_${mode.toUpperCase()}_ENTRY: ${payload.symbol}`,
      level: 'action',
      entity_id: hedgeId,
      details: { 
        symbol: payload.symbol, 
        mode,
        entryLongPrice,
        entryShortPrice,
        longOrderId,
        shortOrderId,
      },
    });

    return json({ ok: true, hedge_id: hedgeId, symbol: payload.symbol, mode, liveOrder: mode === 'live' });
  }

  return json({ error: "Unknown action" }, 400);
});
