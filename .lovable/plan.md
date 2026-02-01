
# Plan: Fix Price Arbitrage Calculations

## Problem Summary

The Price Arbitrage Opportunities table shows **0.0000%** spread and **$0.00** profit for all entries because of a field name mismatch between mock data and display code.

---

## Root Cause Analysis

### Mock Data Structure (`src/lib/mockData.ts`, line 168):
```typescript
{
  spreadPercent: 2.5,    // Already a percentage (2.5 = 2.5%)
  netAfterFees: 2.3,     // Net profit percentage
  ...
}
```

### Dashboard Code (`src/pages/Dashboard.tsx`, line 590):
```typescript
arb.spread * 100  // ← Tries to read 'spread' which doesn't exist
                  // ← Also multiplies by 100, expecting decimal format
```

---

## Fixes Required

### File: `src/pages/Dashboard.tsx`

**Fix 1 - Spread Display (line 590)**

| Before | After |
|--------|-------|
| `arb.spread * 100` | `arb.spreadPercent` |

```typescript
// Line 590:
{Number.isFinite(arb.spreadPercent) 
  ? `+${arb.spreadPercent.toFixed(4)}%` 
  : '0.0000%'}
```

**Fix 2 - Est. Profit Calculation (line 596)**

| Before | After |
|--------|-------|
| `arb.spread \|\| 0` | `(arb.netAfterFees \|\| arb.spreadPercent \|\| 0) / 100` |

```typescript
// Line 596:
{formatProfitAbsolute((arb.netAfterFees || arb.spreadPercent || 0) / 100)}
```

The `netAfterFees` field already accounts for trading fees, making it a more accurate profit estimate.

---

## Expected Result

```text
BEFORE:
ETH/USDT  Binance → KuCoin  0.0000%  +$0.00   141  SAFE
DOT/USDT  Bitget  → Gate    0.0000%  +$0.00   117  SAFE

AFTER:
ETH/USDT  Binance → KuCoin  +1.2345%  +$123.45   141  SAFE
DOT/USDT  Bitget  → Gate    +0.8765%  +$87.65    117  SAFE
```

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/pages/Dashboard.tsx` | 590 | Fix spread display: `arb.spreadPercent` |
| `src/pages/Dashboard.tsx` | 596 | Fix profit calc: `(arb.netAfterFees / 100)` |
