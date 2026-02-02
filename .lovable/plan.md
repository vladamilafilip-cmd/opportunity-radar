
# Plan: Tasteri za Akumulaciju i Realizaciju Profita

## Problem
Kada je korisnik u profitu, nema opciju da:
1. **Akumulira** - reinvestira profit u istu poziciju (compound efekat)
2. **Primi/Pokupi** - realizuje samo profit bez zatvaranja cele pozicije (partial take profit)

---

## Rešenje

### A. FloatingPnL - Brze akcije u headeru

Kada je P&L pozitivan, pored badge-a dodajemo dva dugmeta:

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo]  │ 💰 +$45.23 (2 pos) [📈 Akumuliraj] [💵 Pokupi]  │ [👤]    │
└──────────────────────────────────────────────────────────────────────┘
```

- **Akumuliraj** - Dodaje profit na veličinu pozicije (compound)
- **Pokupi** - Realizuje profit i resetuje P&L na nulu

### B. PositionCard - Akcije po poziciji

Za svaku poziciju u profitu dodajemo dugmiće:

```
┌──────────────────────────────────────┐
│  PEPE/USDT            $1,000         │
│  ...                                 │
│  Unrealized P&L: +$25.50 (+2.55%)   │
│                                      │
│  [📈 Akumuliraj +$25]  [💵 Pokupi]  │
│  [✕ Zatvori poziciju]               │
└──────────────────────────────────────┘
```

---

## Tehnička Implementacija

### 1. Nove akcije u tradingStore.ts

```typescript
interface TradingStore {
  // Postojeće...
  
  // NOVE AKCIJE:
  accumulateProfit: (positionId: string) => Promise<void>;
  takeProfitPartial: (positionId: string) => Promise<void>;
  accumulateAll: () => Promise<void>;
  takeProfitAll: () => Promise<void>;
}

// accumulateProfit - Dodaje unrealized P&L na size pozicije
accumulateProfit: async (positionId: string) => {
  const position = get().positions.find(p => p.id === positionId);
  if (position && position.unrealizedPnl > 0) {
    set(state => ({
      positions: state.positions.map(p => 
        p.id === positionId 
          ? {
              ...p,
              size: p.size + p.unrealizedPnl,  // Povećaj poziciju
              unrealizedPnl: 0,                 // Reset P&L
              unrealizedPnlPercent: 0,
              entryPrice: p.currentPrice,       // Nova entry cena
            }
          : p
      ),
      stats: {
        ...state.stats,
        totalPnl: state.stats.totalPnl + position.unrealizedPnl, // Dodaj u realized
      }
    }));
  }
}

// takeProfitPartial - Realizuje profit bez zatvaranja pozicije
takeProfitPartial: async (positionId: string) => {
  const position = get().positions.find(p => p.id === positionId);
  if (position && position.unrealizedPnl > 0) {
    set(state => ({
      positions: state.positions.map(p => 
        p.id === positionId 
          ? {
              ...p,
              unrealizedPnl: 0,
              unrealizedPnlPercent: 0,
              entryPrice: p.currentPrice, // Reset entry na current
            }
          : p
      ),
      stats: {
        ...state.stats,
        totalPnl: state.stats.totalPnl + position.unrealizedPnl,
      }
    }));
  }
}
```

### 2. Izmene u FloatingPnL.tsx

```typescript
export function FloatingPnL() {
  const { positions, accumulateAll, takeProfitAll } = useTradingStore();
  const [showActions, setShowActions] = useState(false);
  
  // Postojeća logika...
  
  const isProfit = totalPnL > 0;
  
  return (
    <div className="flex items-center gap-2">
      <Link to="/trading">
        <Badge>...</Badge>
      </Link>
      
      {/* Akcioni tasteri - samo kada je profit > 0 */}
      {isProfit && (
        <>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs bg-success/10 text-success"
            onClick={accumulateAll}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Akumuliraj
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs bg-primary/10 text-primary"
            onClick={takeProfitAll}
          >
            <DollarSign className="h-3 w-3 mr-1" />
            Pokupi
          </Button>
        </>
      )}
    </div>
  );
}
```

### 3. Izmene u PositionCard.tsx

Dodavanje dugmića za svaku poziciju u profitu:

```typescript
// U PositionCard komponenti
{position.unrealizedPnl > 0 && (
  <div className="flex gap-2 mt-3">
    <Button 
      size="sm" 
      variant="outline"
      className="flex-1 bg-success/10 text-success"
      onClick={() => onAccumulate(position.id)}
    >
      <TrendingUp className="h-3 w-3 mr-1" />
      Akumuliraj +${position.unrealizedPnl.toFixed(2)}
    </Button>
    <Button 
      size="sm" 
      variant="outline"
      className="flex-1 bg-primary/10 text-primary"
      onClick={() => onTakeProfit(position.id)}
    >
      <Wallet className="h-3 w-3 mr-1" />
      Pokupi
    </Button>
  </div>
)}
```

---

## Fajlovi za izmenu

| Fajl | Izmena |
|------|--------|
| `src/store/tradingStore.ts` | Dodati `accumulateProfit`, `takeProfitPartial`, `accumulateAll`, `takeProfitAll` |
| `src/components/FloatingPnL.tsx` | Dodati dugmiće "Akumuliraj" i "Pokupi" kada je profit > 0 |
| `src/components/PositionCard.tsx` | Dodati akcione dugmiće za svaku poziciju u profitu |
| `src/pages/Trading.tsx` | Proslediti nove handler funkcije |

---

## Vizuelni Prikaz

### FloatingPnL u headeru (kada je profit):
```
💰 +$45.23 (2 pos) │ [📈 Akumuliraj] [💵 Pokupi]
```

### PositionCard (pojedinačna pozicija u profitu):
```
┌─────────────────────────────────────────────┐
│  PEPE/USDT                        $1,000    │
│  Long: Binance ──── Short: dYdX             │
│                                             │
│  Unrealized P&L     Funding Collected       │
│  +$25.50 (+2.55%)   +$8.50 (3 intervals)   │
│                                             │
│  ┌────────────────┐ ┌────────────────┐      │
│  │ 📈 Akumuliraj  │ │ 💵 Pokupi      │      │
│  │    +$25.50     │ │    Profit      │      │
│  └────────────────┘ └────────────────┘      │
│                                             │
│            [✕ Zatvori poziciju]             │
└─────────────────────────────────────────────┘
```

---

## Objašnjenje za korisnike

- **Akumuliraj**: "Reinvestiraj svoj profit. Tvoja pozicija raste, a entry cena se resetuje na trenutnu. Compound efekat!"
- **Pokupi (Take Profit)**: "Realizuj svoj profit. Pozicija ostaje otvorena, ali P&L se resetuje na nulu."

Obe akcije prebacuju unrealized P&L u realized P&L (ukupna zarada).

---

## Očekivani rezultat

| Funkcija | Efekat |
|----------|--------|
| Akumuliraj | Size: $1000 → $1025, Entry: reset, Realized: +$25 |
| Pokupi | Size: $1000 (nepromenjeno), Entry: reset, Realized: +$25 |
| Akumuliraj Sve | Primeni na sve pozicije u profitu |
| Pokupi Sve | Realizuj profit iz svih pozicija |
