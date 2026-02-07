
# Plan: Implementacija LIVE Trgovanja sa CCXT

## Pregled

Ovaj plan implementira pravo LIVE trgovanje integracijom CCXT biblioteke. Sistem će koristiti API ključeve (koje ćete naknadno sačuvati kao Cloud Secrets) za izvršavanje stvarnih naloga na Binance i OKX berzama.

---

## Faza 1: autopilot-executor - CCXT Integracija

### Izmene u `supabase/functions/autopilot-executor/index.ts`

**1.1 Import CCXT biblioteke**
```typescript
import ccxt from 'npm:ccxt';
```

**1.2 Nova funkcija za inicijalizaciju berzi**
```typescript
interface ExchangeClients {
  binance: ccxt.binance;
  okx: ccxt.okx;
}

function initializeExchanges(): ExchangeClients | null {
  const binanceKey = Deno.env.get('BINANCE_API_KEY');
  const binanceSecret = Deno.env.get('BINANCE_API_SECRET');
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

  const okx = new ccxt.okx({
    apiKey: okxKey,
    secret: okxSecret,
    password: okxPassphrase,
  });

  return { binance, okx };
}
```

**1.3 Funkcija za izvršavanje hedge naloga**
```typescript
interface HedgeResult {
  success: boolean;
  longPrice: number;
  shortPrice: number;
  longOrderId?: string;
  shortOrderId?: string;
  error?: string;
}

async function executeLiveHedge(
  exchanges: ExchangeClients,
  symbol: string,
  longExchange: string,
  shortExchange: string,
  sizeEur: number
): Promise<HedgeResult> {
  try {
    // Map exchange names to CCXT clients
    const exchangeMap: Record<string, ccxt.Exchange> = {
      'binance': exchanges.binance,
      'okx': exchanges.okx,
    };

    const longEx = exchangeMap[longExchange.toLowerCase()];
    const shortEx = exchangeMap[shortExchange.toLowerCase()];

    if (!longEx || !shortEx) {
      return { success: false, longPrice: 0, shortPrice: 0, error: 'Exchange not found' };
    }

    // Normalize symbol for CCXT (e.g., "BTC/USDT:USDT")
    const ccxtSymbol = normalizeCcxtSymbol(symbol);

    // Fetch current price
    const ticker = await longEx.fetchTicker(ccxtSymbol);
    const price = ticker.last || 0;
    const size = sizeEur / price;

    // Execute both legs simultaneously
    const [longOrder, shortOrder] = await Promise.allSettled([
      longEx.createMarketOrder(ccxtSymbol, 'buy', size),
      shortEx.createMarketOrder(ccxtSymbol, 'sell', size),
    ]);

    // Check results
    if (longOrder.status === 'fulfilled' && shortOrder.status === 'fulfilled') {
      return {
        success: true,
        longPrice: longOrder.value.average || price,
        shortPrice: shortOrder.value.average || price,
        longOrderId: longOrder.value.id,
        shortOrderId: shortOrder.value.id,
      };
    }

    // Handle partial failures - attempt rollback
    if (longOrder.status === 'fulfilled' && shortOrder.status === 'rejected') {
      await longEx.createMarketOrder(ccxtSymbol, 'sell', size); // Rollback
      return { success: false, longPrice: 0, shortPrice: 0, error: `Short leg failed: ${shortOrder.reason}` };
    }

    if (shortOrder.status === 'fulfilled' && longOrder.status === 'rejected') {
      await shortEx.createMarketOrder(ccxtSymbol, 'buy', size); // Rollback
      return { success: false, longPrice: 0, shortPrice: 0, error: `Long leg failed: ${longOrder.reason}` };
    }

    return { success: false, longPrice: 0, shortPrice: 0, error: 'Both legs failed' };
  } catch (error) {
    return { success: false, longPrice: 0, shortPrice: 0, error: String(error) };
  }
}

function normalizeCcxtSymbol(symbol: string): string {
  // Convert "BTCUSDT" or "BTC/USDT" to "BTC/USDT:USDT" for futures
  const base = symbol.replace('/USDT', '').replace('USDT', '');
  return `${base}/USDT:USDT`;
}
```

**1.4 Izmena glavne logike (linije 236-275)**

```typescript
// Existing mock logic (lines 236-275) will be replaced with:

if (mode === 'live') {
  // LIVE MODE - Execute real trades
  const exchanges = initializeExchanges();
  
  if (!exchanges) {
    log('ERROR: API keys not configured for LIVE mode');
    await supabase.from('autopilot_audit_log').insert({
      action: 'LIVE_ERROR',
      level: 'error',
      details: { error: 'API keys not configured' },
    });
    return json({ ok: false, error: 'API keys not configured' });
  }

  const hedgeResult = await executeLiveHedge(
    exchanges,
    symbol,
    longEx,
    shortEx,
    config.capital.hedgeSizeEur
  );

  if (!hedgeResult.success) {
    log(`LIVE hedge failed: ${hedgeResult.error}`);
    await supabase.from('autopilot_audit_log').insert({
      action: 'LIVE_HEDGE_FAILED',
      level: 'error',
      details: { symbol, error: hedgeResult.error },
    });
    return json({ ok: false, error: hedgeResult.error });
  }

  // Insert with REAL prices from exchange
  insertPayload = {
    hedge_id: hedgeId,
    symbol,
    long_exchange: longEx,
    short_exchange: shortEx,
    risk_tier: riskTier,
    size_eur: config.capital.hedgeSizeEur,
    entry_long_price: hedgeResult.longPrice,
    entry_short_price: hedgeResult.shortPrice,
    entry_funding_spread_8h: spreadBps,
    entry_score: entryScore,
    mode: 'live',
    status: 'open',
    leverage: 1,
    unrealized_pnl_eur: 0,
    unrealized_pnl_percent: 0,
    funding_collected_eur: 0,
    intervals_collected: 0,
    pnl_drift: 0,
    risk_snapshot: { 
      deployed: deployedEur + config.capital.hedgeSizeEur,
      longOrderId: hedgeResult.longOrderId,
      shortOrderId: hedgeResult.shortOrderId,
    },
  };
  
} else {
  // PAPER MODE - Mock prices (existing logic)
  const mockPrice = symbol.includes('BTC') ? 95000 : ...
  // ... existing paper logic
}
```

---

## Faza 2: autopilot-control - LIVE Zatvaranje Pozicija

### Izmene u `supabase/functions/autopilot-control/index.ts`

**2.1 Dodati CCXT import i inicijalizaciju** (iste funkcije kao gore)

**2.2 Proširiti `close_position` akciju (linije 133-147)**

```typescript
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

  // Execute LIVE close if in live mode
  if (position.mode === 'live') {
    const exchanges = initializeExchanges();
    
    if (!exchanges) {
      return json({ error: "API keys not configured for LIVE close" }, 500);
    }

    // Close both legs (reverse the entry)
    const closeResult = await closeLiveHedge(
      exchanges,
      position.symbol,
      position.long_exchange,
      position.short_exchange,
      position.size_eur
    );

    if (!closeResult.success) {
      // Log error but still update DB status
      await admin.from('autopilot_audit_log').insert({
        action: 'LIVE_CLOSE_ERROR',
        level: 'error',
        entity_id: payload.position_id,
        details: { error: closeResult.error },
      });
    }

    // Update with real exit prices
    const { error } = await admin
      .from("autopilot_positions")
      .update({
        status: "closed",
        exit_ts: nowIso,
        exit_reason: payload.reason ?? "Manual close",
        exit_long_price: closeResult.longPrice || position.current_long_price,
        exit_short_price: closeResult.shortPrice || position.current_short_price,
        updated_at: nowIso,
      })
      .eq("id", payload.position_id);

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, liveClose: true });
  }

  // PAPER mode - just update DB
  const { error } = await admin
    .from("autopilot_positions")
    .update({
      status: "closed",
      exit_ts: nowIso,
      exit_reason: payload.reason ?? "Manual close",
      updated_at: nowIso,
    })
    .eq("id", payload.position_id);

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
```

**2.3 Nova funkcija za zatvaranje hedge-a**

```typescript
async function closeLiveHedge(
  exchanges: ExchangeClients,
  symbol: string,
  longExchange: string,
  shortExchange: string,
  sizeEur: number
): Promise<HedgeResult> {
  // Reverse of entry: SELL long leg, BUY short leg
  const exchangeMap: Record<string, ccxt.Exchange> = {
    'binance': exchanges.binance,
    'okx': exchanges.okx,
  };

  const longEx = exchangeMap[longExchange.toLowerCase()];
  const shortEx = exchangeMap[shortExchange.toLowerCase()];
  const ccxtSymbol = normalizeCcxtSymbol(symbol);

  const ticker = await longEx.fetchTicker(ccxtSymbol);
  const price = ticker.last || 0;
  const size = sizeEur / price;

  const [closeLong, closeShort] = await Promise.allSettled([
    longEx.createMarketOrder(ccxtSymbol, 'sell', size),  // Close long
    shortEx.createMarketOrder(ccxtSymbol, 'buy', size),  // Close short
  ]);

  const longPrice = closeLong.status === 'fulfilled' ? closeLong.value.average : 0;
  const shortPrice = closeShort.status === 'fulfilled' ? closeShort.value.average : 0;

  return {
    success: closeLong.status === 'fulfilled' && closeShort.status === 'fulfilled',
    longPrice: longPrice || price,
    shortPrice: shortPrice || price,
  };
}
```

---

## Faza 3: Proširena `open_position` Akcija za LIVE

**Linija 149-204 u autopilot-control** - dodati LIVE logiku:

```typescript
if (payload.action === "open_position") {
  // ... existing validation checks ...

  const mode = currentState?.mode ?? "paper";

  if (mode === 'live') {
    // LIVE MODE
    const exchanges = initializeExchanges();
    
    if (!exchanges) {
      return json({ error: "API keys not configured" }, 500);
    }

    const hedgeResult = await executeLiveHedge(
      exchanges,
      payload.symbol,
      payload.long_exchange,
      payload.short_exchange,
      50 // hedgeSize
    );

    if (!hedgeResult.success) {
      await admin.from('autopilot_audit_log').insert({
        action: 'MANUAL_LIVE_FAILED',
        level: 'error',
        details: { symbol: payload.symbol, error: hedgeResult.error },
      });
      return json({ error: hedgeResult.error }, 500);
    }

    // Insert with REAL prices
    const { error } = await admin.from("autopilot_positions").insert({
      hedge_id: hedgeId,
      mode: 'live',
      symbol: payload.symbol,
      long_exchange: payload.long_exchange,
      short_exchange: payload.short_exchange,
      size_eur: 50,
      entry_long_price: hedgeResult.longPrice,
      entry_short_price: hedgeResult.shortPrice,
      // ... rest of fields
    });

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, hedge_id: hedgeId, liveOrder: true });
  }

  // PAPER MODE - existing mock logic
  // ...
}
```

---

## Faza 4: UI Poboljšanja

### 4.1 Poboljšani LIVE Confirmation Dialog

**Izmena u `src/pages/FundingBot.tsx` (linije 94-103)**

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Add state
const [showLiveConfirm, setShowLiveConfirm] = useState(false);
const [pendingMode, setPendingMode] = useState<AutopilotMode | null>(null);

const handleModeChange = async (newMode: AutopilotMode) => {
  if (newMode === 'live' && mode !== 'live') {
    setPendingMode(newMode);
    setShowLiveConfirm(true);
    return;
  }
  await setMode(newMode);
  toast.success(`Mode changed to ${newMode.toUpperCase()}`);
};

const confirmLiveMode = async () => {
  if (pendingMode) {
    await setMode(pendingMode);
    toast.success('LIVE MODE ACTIVATED - Real trades enabled');
  }
  setShowLiveConfirm(false);
  setPendingMode(null);
};

// Add dialog in JSX
<AlertDialog open={showLiveConfirm} onOpenChange={setShowLiveConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        Aktivacija LIVE Moda
      </AlertDialogTitle>
      <AlertDialogDescription asChild>
        <div className="space-y-3">
          <p className="font-semibold">Ova akcija aktivira PRAVO trgovanje!</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Bot će izvršavati PRAVE naloge na Binance i OKX</li>
            <li>Vaš novac je u riziku - gubici su mogući</li>
            <li>Hedge veličina: €50 po poziciji</li>
            <li>Kill switch: €50 dnevni gubitak</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Proverite da su API ključevi konfigurisani sa "Trade" dozvolama.
          </p>
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Odustani</AlertDialogCancel>
      <AlertDialogAction 
        onClick={confirmLiveMode}
        className="bg-destructive hover:bg-destructive/90"
      >
        Razumem rizike, aktiviraj LIVE
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Rezime Fajlova za Izmenu

| Fajl | Opis Izmena |
|------|-------------|
| `supabase/functions/autopilot-executor/index.ts` | CCXT import, `initializeExchanges()`, `executeLiveHedge()`, izmena glavne logike za LIVE/PAPER |
| `supabase/functions/autopilot-control/index.ts` | CCXT import, `closeLiveHedge()`, proširene `close_position` i `open_position` akcije |
| `src/pages/FundingBot.tsx` | AlertDialog za LIVE potvrdu umesto `confirm()` |

---

## Bezbednosne Napomene

1. **Secrets moraju biti konfigurisani** - Bot će vratiti grešku ako LIVE mod nema API ključeve
2. **Atomski hedges** - Ako jedan leg faila, pokušava se rollback drugog
3. **Audit log** - Svaki LIVE nalog se loguje sa detaljima
4. **Graceful degradation** - Ako LIVE close faila, DB se ipak ažurira

---

## Pre korišćenja LIVE moda

1. Sačuvajte API ključeve kao Cloud Secrets (5 ključeva)
2. Testirajte u PAPER modu da bot radi
3. Aktivirajte LIVE sa malim iznosom
4. Pratite audit log za greške
