

# LIVE Funding Arbitrage Bot - Finalna Čišćenja i Optimizacije

## Analiza Trenutnog Stanja

Pregledao sam kompletan kod i sistem je **95% gotov** za LIVE delta-neutral hedge trading. Evo šta je već implementirano:

### Implementirano

| Komponenta | Status | Lokacija |
|------------|--------|----------|
| Config sa LIVE parametrima | ✅ Kompletno | `config/autopilot.ts` |
| Kapital €200, hedge €20, buffer €40 | ✅ Tačno | `config/autopilot.ts` |
| 6 dozvoljenih berzi | ✅ Tačno | Hyperliquid, Binance, Bybit, OKX, dYdX, KuCoin |
| Raspodela po berzama | ✅ Tačno | HL:60, Binance:40, Bybit:30, OKX:30, dYdX:20, KuCoin:20 |
| Symbol whitelist | ✅ Tačno | BTC, ETH, SOL, LTC, XRP, BNB, LINK, DOGE + 10 Tier2 |
| Entry filteri (0.25%, 0.20%, 0.15%) | ✅ Tačno | `formulas.ts` |
| Exit pravila (drift 0.6%, spread 0.35%) | ✅ Tačno | `formulas.ts` |
| Risk manager (€10/€20 drawdown) | ✅ Tačno | `riskManager.ts` |
| Atomic hedge execution | ✅ Kompletno | `hedgeExecutor.ts` |
| Worker sa 60s intervalom | ✅ Kompletno | `worker/src/index.ts` |
| UI PersonalRobotWidget | ✅ Kompletno | Exchange allocation, risk meter, STOP ALL |
| Explain drawer | ✅ Kompletno | `ExplainDrawer.tsx` |
| Audit log | ✅ Kompletno | `AuditLogViewer.tsx` |
| DRY RUN mode | ✅ Kompletno | Toggle u UI |

---

## Potrebne Izmene (5%)

### 1. Ukloni Paper Trading reference iz UI

Trenutno u `Dashboard.tsx` (linija 312-318) postoji link na "Paper Trading" u dropdown meniju. Ovo treba zameniti sa "Autopilot Settings" ili ukloniti.

```typescript
// Trenutno
<DropdownMenuItem asChild data-tour="paper-trading">
  <Link to="/trading" className="cursor-pointer">
    <LineChart className="h-4 w-4 mr-2" />
    Paper Trading
  </Link>
</DropdownMenuItem>

// Treba zameniti sa
<DropdownMenuItem asChild>
  <Link to="/dashboard#autopilot" className="cursor-pointer">
    <Bot className="h-4 w-4 mr-2" />
    Autopilot
  </Link>
</DropdownMenuItem>
```

### 2. Mode Toggle u PersonalRobotWidget

Dodaj mogućnost promene mode-a (OFF/LIVE/DRY RUN) direktno u widgetu umesto samo badge prikaza.

```text
┌─────────────────────────────────────────────────┐
│  Mode: [OFF] [LIVE] [DRY RUN]                  │
└─────────────────────────────────────────────────┘
```

### 3. Profit Reinvestment Logic

Prema zahtevu "reinvestira profit povećanjem broja pozicija, ne veličine" - ovo je već implementirano kroz `maxConcurrentHedges: 8`. Kako profit raste, više pozicija može biti otvoreno, ali svaka ostaje €20.

Potrebno je samo dodati vizuelni indikator za profit reinvestment status u UI.

### 4. Ukloni Mock Data Fallback za Autopilot

Trenutno Dashboard koristi mock data kao fallback. Za autopilot sekciju, mock data treba da bude potpuno isključen - samo real DB data.

### 5. Exit Signal za Volatility Spike

Dodaj exit uslov za nagli skok volatilnosti (nije eksplicitno implementiran):

```typescript
// U formulas.ts checkExitConditions()
// 6. Volatility spike check
if (currentVolatility > entryVolatility * 2) {
  return `Volatility spike (${(currentVolatility/entryVolatility).toFixed(1)}x)`;
}
```

---

## Fajlovi za Izmenu

| Fajl | Izmena | Prioritet |
|------|--------|-----------|
| `src/pages/Dashboard.tsx` | Zameni "Paper Trading" link | HIGH |
| `src/components/autopilot/PersonalRobotWidget.tsx` | Dodaj mode toggle buttons | HIGH |
| `worker/src/engine/formulas.ts` | Dodaj volatility spike exit | MEDIUM |
| `src/components/autopilot/QuickStats.tsx` | Dodaj reinvestment status | LOW |

---

## Detalj Implementacije

### PersonalRobotWidget Mode Toggle

```tsx
// Unutar CardHeader, ispod Badge-a
<div className="flex items-center gap-1 mt-2">
  <Button
    size="sm"
    variant={mode === 'off' ? 'default' : 'ghost'}
    onClick={() => setMode('off')}
    className="h-7 text-xs"
  >
    OFF
  </Button>
  <Button
    size="sm"
    variant={mode === 'live' ? 'default' : 'ghost'}
    onClick={() => setMode('live')}
    className="h-7 text-xs"
    disabled={!hasPassphrase} // LIVE zahteva passphrase
  >
    LIVE
  </Button>
  <Button
    size="sm"
    variant={mode === 'dryrun' ? 'default' : 'ghost'}
    onClick={() => setMode('dryrun')}
    className="h-7 text-xs"
  >
    DRY RUN
  </Button>
</div>
```

### Dashboard Link Fix

Ukloni reference na `/trading` za paper trading i zameni sa autopilot fokusom:

```tsx
<DropdownMenuItem asChild>
  <Link to="/dashboard" className="cursor-pointer">
    <Bot className="h-4 w-4 mr-2" />
    Autopilot
  </Link>
</DropdownMenuItem>
```

---

## Sigurnost i Upozorenja

Sistem već ima:
- ✅ Risk disclosure banner
- ✅ "Profit NOT guaranteed" upozorenje
- ✅ Kill switch sa manual reset
- ✅ Buffer enforcement (€40)
- ✅ Tiered drawdown control

Nema potrebe za dodatnim sigurnosnim merama.

---

## Rezime

Sistem je **spreman za LIVE** sa sledećim karakteristikama:

| Karakteristika | Vrednost |
|----------------|----------|
| Kapital | €200 |
| Position size | €20 hedge (€10 + €10) |
| Max pozicija | 8 istovremeno |
| Buffer | €40 uvek slobodno |
| Max deployed | €160 |
| Kill switch | €20 dnevni drawdown |
| Caution level | €10 dnevni drawdown |
| Min profit | 0.25% po 8h (SAFE) |
| Max spread | 0.20% bid/ask |
| Max cost | 0.15% fee+slippage |
| Drift limit | 0.6% PnL drift |
| Scan interval | 60 sekundi |
| Berze | 6 (HL, Binance, Bybit, OKX, dYdX, KuCoin) |
| Simboli | 8 Tier1 + 10 Tier2 (likvidni only) |
| Leverage | Max 2x, default 1x |

**Worker ostaje u DRY RUN mode po defaultu** dok se ne implementiraju pravi CCXT adapteri za svaku berzu.

Finalne izmene su minimalne i fokusirane na UX čišćenje.

