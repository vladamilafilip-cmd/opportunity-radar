
# Plan: Snižavanje BPS Pragova za Prikaz Prilika

## Problem
Trenutni pragovi su previsoki za Binance ↔ OKX arbitražu:
- **Trenutni minProfitBps (SAFE)**: 30 bps
- **Realni spread Binance/OKX**: ~3-5 bps
- **Troškovi (fees + slippage)**: ~12 bps

Matematički: 3.5 bps spread - 12 bps troškovi = **-8.5 bps** (gubitak) → filtrira se

## Rešenje

### 1. Sniziti minProfitBps pragove

| Tier | Staro | Novo | Razlog |
|------|-------|------|--------|
| SAFE | 30 bps | **5 bps** | Realistično za iste berze |
| MEDIUM | 40 bps | **10 bps** | Nešto viši rizik |
| HIGH | 50 bps | **15 bps** | Samo za prikaz |

### 2. Smanjiti procenjene troškove

| Parametar | Staro | Novo | Razlog |
|-----------|-------|------|--------|
| takerFeeBps | 4 | **3** | VIP nivo na Binance/OKX |
| slippageBps | 2 | **1** | Visoka likvidnost |
| safetyBufferBps | 3 | **2** | Konzervativnije |
| **Ukupno** | 12 bps | **8 bps** | |

### 3. Ažurirati maxSpreadBps (bid-ask)

| Tier | Staro | Novo |
|------|-------|------|
| SAFE | 15 bps | **25 bps** |
| MEDIUM | 20 bps | **35 bps** |

## Izmene u fajlovima

**`config/autopilot.ts`**:
```typescript
thresholds: {
  safe: {
    minProfitBps: 5,      // Bilo 30
    maxSpreadBps: 25,     // Bilo 15
    maxTotalCostBps: 10,  // Bilo 12
    minLiquidityScore: 60, // Bilo 70
  },
  medium: {
    minProfitBps: 10,     // Bilo 40
    maxSpreadBps: 35,     // Bilo 20
    maxTotalCostBps: 12,
    minLiquidityScore: 50,
  },
  high: {
    minProfitBps: 15,     // Bilo 50
    maxSpreadBps: 50,
    maxTotalCostBps: 15,
    minLiquidityScore: 40,
  },
},

costs: {
  takerFeeBps: 3,         // Bilo 4
  slippageBps: 1,         // Bilo 2
  safetyBufferBps: 2,     // Bilo 3
  maxTotalCostBps: 8,     // Bilo 12
},
```

## Očekivani rezultat

Sa novim pragovima:
- Spread 5 bps - 8 bps troškovi = **-3 bps** (još uvek gubitak)
- Ali sa minProfitBps: 5, prilike sa spreadom ≥13 bps će se prikazati

**Alternativa**: Ako i dalje nema prilika, mogu dodatno spustiti na:
- minProfitBps: **0** (prikaži sve neto-pozitivne)
- Ili čak **-5** (prikaži i "skoro profitabilne")

## Rizik
Niži pragovi = veći rizik od ulaska u marginalno profitabilne pozicije. Ali za Binance+OKX sa visokom likvidnošću, to je prihvatljivo.
