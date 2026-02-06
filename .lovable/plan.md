
# Plan: Proširenje filtera za prikaz prilika

## Dijagnostika problema

Analizom baze podataka i koda otkriveno je **tri kritična problema**:

1. **Filter berzi je previše restriktivan**
   - Konfiguracija dozvoljava samo: `binance` + `okx`
   - U bazi postoje prilike sa: `bitget`, `bybit`, `kraken`, `htx`, `mexc`
   - Nema nijednog para koji je ISTOVREMENO Binance + OKX

2. **Whitelist simbola ne pokriva dostupne prilike**
   - Trenutni whitelist: BTC, ETH, SOL, XRP, DOGE, BNB, LINK...
   - Najbolje prilike u bazi: FLOW/USDT, ZIL/USDT (nisu na listi!)

3. **Bucket alokacija blokira sve prilike**
   - Konfiguracija: `safe: 100%, medium: 0%, high: 0%`
   - Sve prilike u bazi su označene kao `high` risk

## Predloženo rešenje

### 1. Proširiti listu dozvoljenih berzi

Dodati Bitget, Bybit i Kraken u konfiguraciju jer imaju značajan broj prilika:

```
exchanges: [
  { code: 'binance', name: 'Binance', allocation: 100, purpose: 'both', fundingInterval: 8 },
  { code: 'okx', name: 'OKX', allocation: 100, purpose: 'both', fundingInterval: 8 },
  { code: 'bitget', name: 'Bitget', allocation: 80, purpose: 'both', fundingInterval: 8 },
  { code: 'bybit', name: 'Bybit', allocation: 80, purpose: 'both', fundingInterval: 8 },
  { code: 'kraken', name: 'Kraken', allocation: 60, purpose: 'both', fundingInterval: 8 },
]
```

### 2. Proširiti whitelist simbola

Dodati tokene koji imaju aktivne prilike:

```
whitelist: [
  'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'LINK', 'LTC', 'ADA', 'AVAX',
  'MATIC', 'DOT', 'ATOM', 'UNI', 'ARB',
  'FLOW', 'ZIL', 'APE', 'NEAR', 'FTM', 'OP', 'INJ', 'SUI', 'TIA', 'SEI'
]
```

### 3. Omogućiti MEDIUM i HIGH tier (sa upozorenjima)

Za prikaz prilika (ali ne automatsko trgovanje):

```
buckets: {
  safe: { percent: 70, maxPositions: 6 },
  medium: { percent: 25, maxPositions: 2 },
  high: { percent: 5, maxPositions: 0 },  // Prikaz ali bez auto-trade
}
```

### 4. Ukloniti filter berzi u useOpportunities.ts

Za **prikaz** prilika ukloniti strogi filter, ali zadržati upozorenja:

```typescript
// Umesto filtriranja po exchange-u, prikazati sve sa risk oznakama
const mapped: Opportunity[] = data.map(opp => ({
  ...
  riskTier: calculateRiskTier(...), // Dinamički računati
  exchangeWarning: !isAllowedExchange(longEx, shortEx), // Označiti ako nije preferred
}));
```

## Tehnički detalji

| Fajl | Izmena |
|------|--------|
| `config/autopilot.ts` | Dodati berze, simbole, prilagoditi buckete |
| `src/hooks/useOpportunities.ts` | Ukloniti strogi filter berzi za prikaz |
| `src/components/bot/OpportunitiesTable.tsx` | Dodati oznaku za "non-preferred" berze |

## Bezbednost

- Automatsko trgovanje ostaje restriktivno (samo SAFE tier)
- HIGH risk parovi se prikazuju ali dugme ENTER je onemogućeno
- Manual trade zahteva potvrdu za non-preferred berze
