

# Nastavak Implementacije - LIVE Funding Arbitrage Autopilot

## Pregled Urađenog

| Komponenta | Status |
|------------|--------|
| `config/autopilot.ts` - LIVE parametri | ✅ Gotovo |
| `src/types/autopilot.ts` - HedgePosition, ExchangeBalance tipovi | ✅ Gotovo |
| `worker/src/config/exchangeBalances.ts` - Per-exchange alokacija | ✅ Gotovo |
| `worker/src/engine/formulas.ts` - Novi thresholds (0.25%, 0.6% drift) | ✅ Gotovo |
| `worker/src/adapters/hedgeExecutor.ts` - Atomic hedge execution | ✅ Gotovo |
| `worker/src/utils/apiKeyManager.ts` - Enkriptovano skladište | ✅ Gotovo |
| `worker/src/index.ts` - DRY RUN mode, LIVE logika | ✅ Gotovo |
| `worker/src/engine/riskManager.ts` - Tiered drawdown | ✅ Gotovo |
| `worker/src/engine/positionManager.ts` - Hedge logika | ✅ Gotovo |
| `worker/src/engine/opportunityEngine.ts` - Whitelist + filteri | ✅ Gotovo |
| `src/store/autopilotStore.ts` - Dry run, exchange balances | ✅ Gotovo |
| `src/components/autopilot/PersonalRobotWidget.tsx` - LIVE mode | ✅ Gotovo |
| `src/components/autopilot/QuickStats.tsx` - Dnevne/nedeljne statistike | ✅ Gotovo |
| `src/components/autopilot/AuditLogViewer.tsx` - Timeline aktivnosti | ✅ Gotovo |
| `src/components/autopilot/AutopilotPositions.tsx` - Quick actions | ✅ Gotovo |
| Database migration (hedge_id, pnl_drift, dry_run_enabled) | ✅ Gotovo |

---

## Preostalo za Implementaciju

### Faza 3: UI Poboljšanja (Zaokruživanje)

| Fajl | Akcija | Opis |
|------|--------|------|
| `src/components/autopilot/ExchangeAllocation.tsx` | **CREATE** | Izdvojena komponenta za exchange balanse sa detaljnim prikazom |
| `src/components/autopilot/RiskWarningBanner.tsx` | **CREATE** | Reusable warning banner sa punim disclaimer-om |
| `src/components/autopilot/HedgePositionCard.tsx` | **CREATE** | Kompaktni prikaz hedge-a kao jedinice (long+short leg) |
| `src/components/DisclaimerBanner.tsx` | **UPDATE** | Dodaj LIVE arbitrage specifične informacije |
| `src/components/autopilot/index.ts` | **UPDATE** | Dodaj eksport novih komponenti |

### Faza 4: Final Integration

| Fajl | Akcija | Opis |
|------|--------|------|
| `src/pages/Dashboard.tsx` | **VERIFY** | Osiguraj da je DRY RUN toggle vidljiv |
| `worker/README.md` | **UPDATE** | Dodaj LIVE instrukcije za pokretanje |

---

## Detalji Implementacije

### 1. ExchangeAllocation.tsx

Nova komponenta za detaljan prikaz alokacije kapitala po berzi:

```text
┌─────────────────────────────────────────────────────────────┐
│  EXCHANGE ALLOCATION                                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┬──────────────┬──────────────┬────────────┐ │
│  │ Hyperliquid │   Binance    │    Bybit     │    OKX     │ │
│  │ SHORT       │   LONG       │    BOTH      │    BOTH    │ │
│  │ €45/€60     │   €30/€40    │   €20/€30    │  €15/€30   │ │
│  │ ████████░░  │   ███████░░  │   ██████░░░  │  █████░░░  │ │
│  └─────────────┴──────────────┴──────────────┴────────────┘ │
│  ┌─────────────┬──────────────┐                             │
│  │     dYdX    │    KuCoin    │   Total: €130/€200         │
│  │   SHORT     │    LONG      │   Buffer: €40 ✓            │
│  │   €10/€20   │   €10/€20    │                             │
│  └─────────────┴──────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

Karakteristike:
- Progress bar za svaku berzu
- Purpose indicator (LONG/SHORT/BOTH)
- Color coding za deployed vs allocation
- Hover tooltip sa detaljima

### 2. RiskWarningBanner.tsx

Reusable banner sa punim disclaimer-om za LIVE trading:

```text
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ RISK DISCLOSURE                                          │
│                                                             │
│ This is a market-neutral funding arbitrage strategy.       │
│ While designed to minimize directional exposure,           │
│ profit is NOT guaranteed.                                   │
│                                                             │
│ • Funding rates can change unexpectedly                    │
│ • Execution slippage may exceed estimates                  │
│ • Exchange API failures can cause losses                   │
│ • Past performance ≠ future results                        │
│                                                             │
│ USE AT YOUR OWN RISK.                                       │
│                           [Dismiss] [Learn More →]          │
└─────────────────────────────────────────────────────────────┘
```

Karakteristike:
- Collapsible (može se sakriti)
- LocalStorage za "don't show again"
- Link na Risk Disclosure page

### 3. HedgePositionCard.tsx

Kompaktnija alternativa tabeli za mobilne uređaje:

```text
┌─────────────────────────────────────────────────────────────┐
│  BTC/USDT                              [SAFE] [2h ago]      │
│  ├── LONG:  Binance  @$98,432      │   PnL: +€0.45 (0.45%)  │
│  └── SHORT: Hyperliquid @$98,428   │   Funding: €0.12 (2x)  │
│                                                             │
│  Size: €20 (€10+€10)   Drift: 0.02%                        │
│                                                             │
│  [ + Accumulate ] [ ⚡ Collect ] [ ℹ Explain ] [ ✕ Close ] │
└─────────────────────────────────────────────────────────────┘
```

Karakteristike:
- Mobile-friendly card layout
- Obe strane hedge-a jasno prikazane
- Drift indicator (delta-neutral health)
- Inline quick actions

### 4. Update DisclaimerBanner.tsx

Dodaj kontekst za LIVE arbitrage:

- Promeni generički tekst u specifičan za funding arbitrage
- Dodaj link na `/risk-disclosure`

### 5. Worker README Update

Dodaj instrukcije za:
- Postavljanje API ključeva lokalno
- Pokretanje u DRY RUN vs LIVE mode
- Monitoring i logovanje

---

## Redosled Implementacije

1. **ExchangeAllocation.tsx** - Izdvojena exchange komponenta
2. **RiskWarningBanner.tsx** - Reusable warning banner
3. **HedgePositionCard.tsx** - Mobile-friendly position card
4. **Update index.ts** - Dodaj eksporte
5. **Update DisclaimerBanner.tsx** - Specifičan tekst
6. **Update worker/README.md** - LIVE instrukcije

---

## Tehnički Detalji

### ExchangeAllocation Props

```typescript
interface ExchangeAllocationProps {
  balances: ExchangeBalance[];
  compact?: boolean;  // Za PersonalRobotWidget
  showPurpose?: boolean;
}
```

### RiskWarningBanner Props

```typescript
interface RiskWarningBannerProps {
  variant?: 'full' | 'compact';
  dismissible?: boolean;
  storageKey?: string;  // Za localStorage
}
```

### HedgePositionCard Props

```typescript
interface HedgePositionCardProps {
  position: AutopilotPosition;
  onAccumulate?: () => void;
  onCollect?: () => void;
  onClose?: () => void;
  onExplain?: () => void;
}
```

---

## Napomena

Posle ovih izmena, sistem ce biti potpuno spreman za LIVE funding arbitrage sa:

1. Full UI visibility svih hedge pozicija
2. Exchange-level capital tracking
3. Proper risk warnings i disclaimers
4. Mobile-friendly position cards
5. DRY RUN toggle za testiranje bez slanja naloga

Worker ostaje u DRY RUN mode po defaultu dok se ne implementiraju pravi exchange adapteri sa CCXT.

