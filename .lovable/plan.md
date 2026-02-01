
# Plan: Fix Top Opportunities Calculations

## Problem

The "Top Opportunities" table shows **0.0000%** and **+$0.00** for all entries due to a field name mismatch:

| Code uses | Mock data has | Value format |
|-----------|---------------|--------------|
| `estimatedProfit` ❌ | `potentialReturn` ✅ | Already percentage (2.5 = 2.5%) |

---

## Solution

### File: `src/pages/Dashboard.tsx`

**Fix 1 - Est. Profit % Display (line 657)**

```typescript
// BEFORE:
{Number.isFinite(opp.estimatedProfit) ? `+${(opp.estimatedProfit * 100).toFixed(4)}%` : '0.0000%'}

// AFTER:
{Number.isFinite(opp.potentialReturn) ? `+${opp.potentialReturn.toFixed(4)}%` : '0.0000%'}
```

- Use `potentialReturn` instead of `estimatedProfit`
- Remove `* 100` since value is already a percentage

**Fix 2 - Est. Profit $ Calculation (line 663)**

```typescript
// BEFORE:
{formatProfitAbsolute(opp.estimatedProfit || 0)}

// AFTER:
{formatProfitAbsolute((opp.potentialReturn || 0) / 100)}
```

- Use `potentialReturn` and divide by 100 to convert from percentage to decimal

---

## Summary

| Line | Before | After |
|------|--------|-------|
| 657 | `opp.estimatedProfit * 100` | `opp.potentialReturn` (already %) |
| 663 | `opp.estimatedProfit` | `opp.potentialReturn / 100` |

---

## Expected Result

```text
BEFORE:
MYRO/USDT   price    0.0000%   8   +$0.00    606   SAFE
MEME/USDT   price    0.0000%   8   +$0.00    398   SAFE

AFTER:
MYRO/USDT   price    +1.2345%  8   +$123.45  606   SAFE
MEME/USDT   price    +0.8765%  8   +$87.65   398   SAFE
```
