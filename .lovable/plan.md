
# Plan: Period Selector + Leverage Slider

## Overview
Adding two professional trading tools to the Dashboard profit calculator:
1. **Period Selector** - Dropdown to choose timeframe (8h, 1D, 7D, 30D) for annualized profit projections
2. **Leverage Slider** - Interactive slider (1x-10x) showing amplified profits and liquidation warnings

---

## Current State Analysis

The Dashboard (`src/pages/Dashboard.tsx`) already has:
- Investment amount input ($10,000 default)
- `formatProfitAbsolute()` function calculating profit from percentage
- Tables displaying Est. Profit ($) based on investment

The profit calculation currently uses raw percentages without period scaling or leverage.

---

## Implementation Details

### 1. New State Variables

```typescript
// Add to Dashboard component state
const [selectedPeriod, setSelectedPeriod] = useState<string>("8h");
const [leverage, setLeverage] = useState<number>(1);
```

### 2. Period Multiplier Logic

| Period | Multiplier | Description |
|--------|-----------|-------------|
| 8h     | 1x        | Single funding interval (base) |
| 1D     | 3x        | 3 funding intervals per day |
| 7D     | 21x       | Weekly projection |
| 30D    | 90x       | Monthly projection |

### 3. Updated Profit Calculation

```typescript
const getPeriodMultiplier = (period: string) => {
  switch (period) {
    case "1D": return 3;
    case "7D": return 21;
    case "30D": return 90;
    default: return 1; // 8h base
  }
};

const formatProfitAbsolute = (percent: number): string => {
  if (!Number.isFinite(percent)) return "$0.00";
  const periodMultiplier = getPeriodMultiplier(selectedPeriod);
  const profit = investmentAmount * percent * periodMultiplier * leverage;
  // ... format as before
};
```

### 4. UI Components

#### Period Selector (Dropdown)
- Position: Next to investment input in calculator card
- Uses existing `Select` component from shadcn/ui
- Options: 8h, 1D, 7D, 30D with labels

#### Leverage Slider
- Position: Below period selector in same card
- Uses existing `Slider` component from shadcn/ui
- Range: 1x to 10x (step: 1)
- Visual display: Current value + profit preview
- Warning badge when leverage > 5x

### 5. Risk Warning Display

```typescript
// When leverage > 5x, show warning
{leverage > 5 && (
  <div className="text-amber-500 text-sm flex items-center gap-1">
    <AlertTriangle className="h-4 w-4" />
    High leverage increases liquidation risk
  </div>
)}
```

---

## Visual Layout

```text
+----------------------------------------------------------+
|  Kalkulator profita                                       |
+----------------------------------------------------------+
|  Uložena suma: [$ 10,000]    Period: [8h ▼]              |
|                                                           |
|  Leverage: 1x  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━  10x        |
|            Current: 3x                                    |
|                                                           |
|  ⚠️ High leverage increases liquidation risk (if >5x)    |
+----------------------------------------------------------+
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add state, period logic, leverage slider, update calculator UI |

No new files needed - all components already exist in the project.

---

## Technical Notes

- **Period selector**: Uses funding rate intervals (8h standard). Daily = 3x, Weekly = 21x, Monthly = 90x
- **Leverage slider**: Pure UI multiplier for visualization. Does not affect actual trading
- **All existing table columns** will automatically use new multipliers via the shared `formatProfitAbsolute` function
- **Mobile responsive**: Uses flex-wrap for proper stacking on small screens
