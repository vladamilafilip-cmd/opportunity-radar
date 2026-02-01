
# Plan: Fix Duplicate Signals in Funding Arbitrage Table

## Problem Analysis

The "Funding Arbitrage Opportunities" table shows multiple duplicate rows for the same trading pair (SEI/USDT, htx → mexc). This happens because:

1. **Backend Issue**: The Metrics Engine creates a new `opportunity_id` every minute (due to `ts_bucket` in the upsert constraint). When closing old signals, it only matches by `opportunity_id`, so signals with different opportunity IDs remain `open`.

2. **Frontend Issue**: The Dashboard query fetches ALL signals without filtering by `status = 'open'`, and doesn't de-duplicate by the unique combination of symbol + exchanges.

---

## Solution

### Part 1: Frontend Fix (Dashboard Query)

**File**: `src/pages/Dashboard.tsx`

Add `status = 'open'` filter to the trading_signals query:

```typescript
// BEFORE (line 115-122):
supabase
  .from("trading_signals")
  .select(`...`)
  .order("created_at", { ascending: false })
  .limit(20)

// AFTER:
supabase
  .from("trading_signals")
  .select(`...`)
  .eq("status", "open")                    // Only show active signals
  .order("created_at", { ascending: false })
  .limit(20)
```

Add de-duplication logic in `displaySignals` transformation:

```typescript
// De-duplicate by symbol + long_exchange + short_exchange
// Keep only the most recent signal for each unique pair
const seen = new Set();
const uniqueSignals = realSignals.filter(sig => {
  const key = `${sig.symbol_id}-${sig.long_exchange}-${sig.short_exchange}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
```

### Part 2: Backend Fix (Metrics Engine)

**File**: `supabase/functions/run-metrics-engine/index.ts`

Update signal closing logic to match by unique pair combination, not just opportunity_id:

```typescript
// BEFORE (lines 643-651):
await supabase
  .from('trading_signals')
  .update({ status: 'closed', ... })
  .in('opportunity_id', oppIds)
  .eq('status', 'open');

// AFTER: Close by unique pair combination
for (const signal of signals) {
  await supabase
    .from('trading_signals')
    .update({ 
      status: 'closed', 
      closed_at: new Date().toISOString(),
      closed_reason: 'superseded'
    })
    .eq('symbol_id', signal.symbol_id)
    .eq('long_exchange', signal.long_exchange)
    .eq('short_exchange', signal.short_exchange)
    .eq('status', 'open')
    .neq('id', 'placeholder'); // Will be updated to exclude new signal
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add `.eq("status", "open")` filter + de-duplication logic |
| `supabase/functions/run-metrics-engine/index.ts` | Fix signal closing to use symbol+exchange combination |

---

## Expected Result

```text
BEFORE:
SEI/USDT  htx → mexc  +7.77%  (duplicate 1)
SEI/USDT  htx → mexc  +7.77%  (duplicate 2)
SEI/USDT  htx → mexc  +7.77%  (duplicate 3)
...

AFTER:
SEI/USDT  htx → mexc  +7.77%  (single, latest signal)
```
