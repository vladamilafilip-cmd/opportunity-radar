
# Plan: Strogi Filter - Samo Binance + OKX

## Problem
Trenutno UI prikazuje prilike sa svih berzi (Bitget, Bybit, Kraken...) sa oznakom upozorenja. Ti želiš da se **uopšte ne prikazuju** prilike koje uključuju druge berze.

## Rešenje

### 1. Dodati strogi filter u `useOpportunities.ts`

Filtrirati rezultate tako da prolaze **samo** parovi gde su OBE strane Binance ili OKX:

```typescript
// Dozvoljena lista berzi (lowercase)
const ALLOWED_EXCHANGES = ['binance', 'okx'];

// Filter funkcija
function isBothExchangesAllowed(longEx: string, shortEx: string): boolean {
  return ALLOWED_EXCHANGES.includes(longEx.toLowerCase()) && 
         ALLOWED_EXCHANGES.includes(shortEx.toLowerCase());
}

// Primeniti filter na sve rezultate
const filtered = mapped.filter(opp => 
  isBothExchangesAllowed(opp.longExchange, opp.shortExchange)
);
```

### 2. Ukloniti upozorenje za "non-preferred" berze iz `OpportunitiesTable.tsx`

Pošto će sve prikazane prilike biti samo Binance/OKX, upozorenje (⚠️) više nije potrebno.

### 3. Ažurirati fallback logiku

U slučaju greške ili praznih podataka, generisati samo Binance ↔ OKX parove.

## Tehnički detalji

| Fajl | Izmena |
|------|--------|
| `src/hooks/useOpportunities.ts` | Dodati strogi filter pre `setOpportunities()` |
| `src/components/bot/OpportunitiesTable.tsx` | Ukloniti `isPreferredExchange` upozorenje |

## Rezultat

- Prikazuju se SAMO parovi: Binance ↔ Binance, Binance ↔ OKX, OKX ↔ OKX
- Sve ostale berze su potpuno skrivene
- Ako nema validnih parova u bazi, prikazuje se poruka "No opportunities" ili fallback podaci
