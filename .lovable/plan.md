
# Plan: PnL Praćenje i Detaljan Prikaz Pozicija

## Šta ćemo uraditi

### 1. Simulacija Unrealized PnL-a (Nerealizovani dobitak/gubitak)
Trenutno sve pozicije imaju `unrealized_pnl_eur = 0` jer nema dinamičkog kalkulisanja. Za TEST mode, dodaćemo simulaciju koja računa PnL na osnovu vremena i entry funding spread-a.

### 2. Prošireni CapitalWidget sa Unrealized PnL
Dodaćemo peti widget koji prikazuje **UNREALIZED** - ukupan nerealizovani PnL svih otvorenih pozicija.

### 3. Detaljniji prikaz pozicija
Proširićemo `PositionsCard` sa:
- Entry spread i očekivani APR
- Funding collected (simulirano)
- Broj intervala (8h perioda)
- Expand/Collapse za više detalja

---

## Tehnički detalji

### A. `src/store/autopilotStore.ts`
Dodaćemo funkciju `simulatePnl()` koja za TEST mode računa:
```typescript
function simulatePnl(position: AutopilotPosition): number {
  const hoursOpen = (Date.now() - new Date(position.entry_ts).getTime()) / (1000 * 60 * 60);
  const intervalsComplete = Math.floor(hoursOpen / 8);
  const fundingPerInterval = position.size_eur * (position.entry_funding_spread_8h / 100);
  // Simuliraj 70% uspešnosti (30% loss od spread/fees)
  const grossFunding = intervalsComplete * fundingPerInterval;
  const costs = intervalsComplete * position.size_eur * 0.0008; // 8 bps per interval
  return grossFunding - costs;
}
```

Ažuriraćemo `fetchPositions` da računa simulirani PnL za svaku poziciju.

### B. `src/components/bot/CapitalWidget.tsx`
Proširićemo grid sa 4 na 5 kolona i dodati:
```
UNREALIZED: €X.XX
(Od otvorenih pozicija)
```

Props će dobiti novi `unrealizedPnl: number`.

### C. `src/components/bot/PositionsCard.tsx`
Svaka pozicija će prikazivati:
- **Symbol** + L/S berze
- **Size**: €50
- **Entry Spread**: 0.28%
- **Expected APR**: ~122%
- **Intervals**: 2/3 (collected/open)
- **Funding Collected**: €0.14
- **Unrealized PnL**: +€0.08 / -€0.02
- **Duration**: 16h

Dodaćemo expandable sekciju za svaku poziciju sa dodatnim detaljima.

### D. `src/pages/FundingBot.tsx`
Prosledićemo `unrealizedPnl` iz store-a u `CapitalWidget`.

---

## Očekivani rezultat

| Metrika | Pre | Posle |
|---------|-----|-------|
| Unrealized PnL widget | ❌ | ✅ €X.XX |
| Position PnL simulacija | €0.00 | Dinamički |
| Position detalji | Osnovno | Prošireno |
| Funding collected | €0.00 | Simulirano |

---

## Fajlovi za izmenu

1. `src/store/autopilotStore.ts` - Dodati simulatePnl funkciju i state za unrealizedPnl
2. `src/components/bot/CapitalWidget.tsx` - Dodati 5. widget za Unrealized PnL
3. `src/components/bot/PositionsCard.tsx` - Proširiti sa detaljima i expandable sekcijom
4. `src/pages/FundingBot.tsx` - Proslediti unrealizedPnl prop
