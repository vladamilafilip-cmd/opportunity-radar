

# Plan: Uvek Vidljiv P&L Indikator

## Problem
- `PortfolioSummary` postoji ali se gubi među ostalim karticama
- Kada korisnik skroluje, ne vidi svoj P&L
- Korisnik mora da traži gde je prikazan profit/gubitak

## Rešenje: Sticky P&L Bar u Headeru

### Nova komponenta: Floating P&L Widget

Dodajemo **mali ali upadljiv P&L indikator u header** koji je UVEK vidljiv:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Diadonum          │ 📊 +$45.23 (2 pos) │ 🔄 Live │ [👤 User]      │
└────────────────────────────────────────────────────────────────────────────┘
```

Kada korisnik ima otvorene pozicije, vidi:
- **Boju** (zelena za profit, crvena za gubitak)
- **Ukupni unrealized P&L**
- **Broj otvorenih pozicija**
- **Klik vodi na /trading stranicu**

### Dodatno: Poboljšanje PortfolioSummary Vidljivosti

1. Dodati veći margin i padding
2. Dodati blagi pulse animaciju kada se P&L promeni
3. Premestiti iznad tabova (već jeste, ali treba dodati `mb-6` razmak)

## Fajlovi za Izmenu

### 1. src/components/FloatingPnL.tsx (NOVA)
```typescript
// Kompaktni P&L widget za header
- Prikazuje ukupni unrealized P&L
- Broj otvorenih pozicija
- Klikom vodi na /trading
- Zelena/crvena boja zavisno od profita
```

### 2. src/pages/Dashboard.tsx
```typescript
// U header sekciji (linija ~268-282) dodati:
<FloatingPnL />

// Pre DropdownMenu komponente
```

### 3. src/components/PortfolioSummary.tsx
```typescript
// Dodati margin-bottom za bolju separaciju
// Dodati "sticky" opciju kada je na vrhu viewport-a
// Povećati font size za P&L vrednosti
```

## Vizuelni Rezultat

### Desktop Header:
```
[Logo] Diadonum    │ 💰 +$127.45 unrealized │ 📈 3 positions │ Live Data │ [User ▼]
```

### Mobile Header:
```
[Logo]  │ +$127 (3) │ [👤]
```

### PortfolioSummary (ispod headera):
- Veći i upadljiviji prikaz
- Razmak `mb-6` od tabova
- Opcioni sticky režim

## Tehnički Detalji

### FloatingPnL komponenta
```typescript
export function FloatingPnL() {
  const { positions, stats } = useTradingStore();
  const openPositions = positions.filter(p => p.status === 'open');
  const totalPnL = openPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  
  if (openPositions.length === 0) return null; // Sakrij ako nema pozicija
  
  return (
    <Link to="/trading">
      <Badge variant={totalPnL >= 0 ? "success" : "destructive"}>
        <Wallet className="h-3 w-3 mr-1" />
        {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
        <span className="ml-1 opacity-70">({openPositions.length})</span>
      </Badge>
    </Link>
  );
}
```

## Očekivani Rezultat

| Element | Pre | Posle |
|---------|-----|-------|
| P&L u headeru | Ne postoji | Uvek vidljiv badge |
| Vizuelna prominentnost | Gubi se | Upadljiv i uvek dostupan |
| Mobile prikaz | Nije optimizovan | Kompaktan badge |
| Klik akcija | Nema | Vodi na /trading |

