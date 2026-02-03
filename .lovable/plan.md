
# LIVE Funding Arbitrage Autopilot - Delta-Neutral Hedged System

## Pregled Izmena

Prelazak sa paper trading sistema na LIVE delta-neutral hedge autopilot sa striktnim pravilima za funding arbitrage.

---

## Kljucne Promene

### 1. Config Potpuna Reorganizacija (`config/autopilot.ts`)

| Parametar | Staro | Novo |
|-----------|-------|------|
| Mode | `'paper'` | `'live'` (default) |
| Allowed Exchanges | 10 berzi | **Samo 6**: Binance, Bybit, OKX, KuCoin, Hyperliquid, dYdX |
| Position Size | 10 EUR leg | **20 EUR hedge** (10 EUR per leg) |
| Max Positions | 20 | **8 hedge pozicija** (160 EUR max) |
| Buffer | None | **40 EUR uvek rezervisano** |
| Max Leverage | N/A | **2x max**, default 1x |
| Min Net Profit | 15bps | **25bps (0.25%)** za SAFE |
| Max Bid/Ask Spread | 10bps | **20bps (0.20%)** |
| Total Cost Limit | N/A | **15bps (0.15%)** max |
| PnL Drift Limit | 2% | **0.6%** |
| Data Stale Timeout | N/A | **120s** (close all) |

### 2. Nova Struktura Exchange Alokacije

```text
┌─────────────────────────────────────────────────────────────────┐
│                   EXCHANGE BALANCE ALLOCATION                   │
├─────────────────────────────────────────────────────────────────┤
│  Exchange         │  Allocation  │  Purpose                     │
│───────────────────│──────────────│──────────────────────────────│
│  Hyperliquid      │  €60         │  Primary SHORT (funding edge)│
│  Binance          │  €40         │  LONG hedge (reliable)       │
│  Bybit            │  €30         │  LONG/SHORT                  │
│  OKX              │  €30         │  LONG/SHORT                  │
│  dYdX             │  €20         │  SHORT (1h funding)          │
│  KuCoin           │  €20         │  LONG hedge                  │
├─────────────────────────────────────────────────────────────────┤
│  TOTAL            │  €200        │  Buffer: €40 always reserved │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Symbol Whitelist (Likvidni Only)

**Tier 1 (Always Allowed)**:
- BTC, ETH, SOL, XRP, DOGE, BNB, LINK, LTC

**Tier 2 (Verified Liquid)** - Max 10 dodatnih:
- ADA, AVAX, MATIC, DOT, ATOM, UNI, AAVE, ARB, OP, SUI

**Blacklist**:
- Svi meme/shitcoins automatski blokirani
- `is_meme = true` u DB → skip

---

## 4. Delta-Neutral Hedge Logika

### Otvaranje Pozicije (Atomic Hedge)

```text
┌─────────────────────────────────────────────────────────────────┐
│                    HEDGE ENTRY FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Identify Opportunity                                        │
│     ├── Check funding spread (short - long) ≥ 0.25%            │
│     ├── Check bid/ask spread ≤ 0.20% on BOTH exchanges         │
│     ├── Check symbol is in whitelist                            │
│     └── Check total costs ≤ 0.15%                              │
│                                                                 │
│  2. Select Exchanges                                            │
│     ├── SHORT on exchange with HIGHER funding rate              │
│     └── LONG on exchange with LOWER funding rate                │
│                                                                 │
│  3. Execute Atomic Hedge                                        │
│     ├── Submit BOTH orders simultaneously                       │
│     ├── If ANY order fails → CANCEL ALL + RETRY or ABORT        │
│     ├── Notional must match within 1% tolerance                 │
│     └── Never leave "naked leg"                                 │
│                                                                 │
│  4. Confirm & Log                                               │
│     ├── Verify both fills                                       │
│     ├── Record entry prices, fees, timestamps                   │
│     └── Calculate expected funding per interval                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Exit Pravila

| Trigger | Uslov | Akcija |
|---------|-------|--------|
| Profit Target | 1 interval passed + ≥60% expected profit | Close hedge |
| Spread Collapse | Net spread < 0.05%/8h | Close hedge |
| Liquidity Deterioration | Bid/ask spread > 0.35% | Close hedge |
| PnL Drift | Delta-neutral drift > 0.6% | Close hedge |
| Data Stale | No update > 120s | **Close ALL + Pause** |
| Max Holding | 24h+ | Close hedge |

---

## 5. Risk Manager Updates

### Tiered Drawdown Control

```text
┌─────────────────────────────────────────────────────────────────┐
│                    RISK MANAGER LEVELS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Level 1: Drawdown €0-10                                        │
│  └── Normal operation, can open new positions                   │
│                                                                 │
│  Level 2: Drawdown €10-20 (YELLOW)                             │
│  └── STOP opening new positions                                 │
│  └── Continue managing existing hedges                          │
│                                                                 │
│  Level 3: Drawdown ≥ €20 (RED)                                 │
│  └── KILL SWITCH: Close ALL positions                           │
│  └── Stop autopilot                                             │
│  └── Require manual reset                                       │
│                                                                 │
│  Buffer Rule: Always maintain €40 free capital                 │
│  └── Max deployed: €160 (8 × €20 hedges)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. UI Promene

### Ukloniti

- "Paper Trading" mode toggle
- "PAPER" badge
- Simulacija funding payment-a

### Dodati

- **DRY RUN** toggle (test logike bez slanja naloga)
- Exchange balance alokacija prikaz
- Warning banner: "Risk-minimized, market-neutral strategy. Profit is NOT guaranteed."
- Per-exchange balance tracking
- Atomic hedge status (both legs or none)

### Redizajnirati PersonalRobotWidget

```text
┌────────────────────────────────────────────────────────────────┐
│  🤖 FUNDING ARBITRAGE BOT                    [LIVE] [DRY RUN] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ⚠️ Market-neutral strategy. Profit NOT guaranteed.           │
│                                                                │
│  Status: ● Running (last scan 23s ago)                         │
│                                                                │
│  EXCHANGE ALLOCATION                                           │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐  │
│  │ Hyperliquid  │   Binance    │    Bybit     │    OKX     │  │
│  │   €60/€60    │   €30/€40    │   €20/€30    │  €20/€30   │  │
│  └──────────────┴──────────────┴──────────────┴────────────┘  │
│  ┌──────────────┬──────────────┐                              │
│  │     dYdX     │    KuCoin    │   Buffer: €40 (reserved)    │
│  │   €10/€20    │   €10/€20    │                              │
│  └──────────────┴──────────────┘                              │
│                                                                │
│  ACTIVE HEDGES: 4 / 8                                          │
│  Deployed: €80 / €160   │   Buffer: €40 ✓                     │
│                                                                │
│  Risk: €8.40 / €20.00 (42%)  ████████░░░░░░░░░░░░              │
│  ├── €0-10: Normal                                             │
│  ├── €10-20: No new positions                                  │
│  └── €20+: KILL SWITCH                                         │
│                                                                │
│  💰 Today: +€1.24  │  📈 Total: +€5.67  │  ⏱ Funding: €3.12   │
│                                                                │
│  [ ▶ Start ] [ ⏸ Pause ] [ 🛑 STOP ALL ]                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Fajlovi za Izmenu/Kreiranje

### Config

| Fajl | Akcija | Opis |
|------|--------|------|
| `config/autopilot.ts` | **UPDATE** | Novi parametri, exchange alokacija, whitelist |

### Worker Engine

| Fajl | Akcija | Opis |
|------|--------|------|
| `worker/src/index.ts` | **UPDATE** | Ukloni "PAPER" poruke, dodaj DRY RUN mode |
| `worker/src/engine/formulas.ts` | **UPDATE** | Novi thresholds (0.25%, 0.6% drift) |
| `worker/src/engine/opportunityEngine.ts` | **UPDATE** | Symbol whitelist, striktni filteri |
| `worker/src/engine/positionManager.ts` | **UPDATE** | Atomic hedge logika, notional matching |
| `worker/src/engine/riskManager.ts` | **UPDATE** | Tiered drawdown, buffer enforcement |
| `worker/src/adapters/exchangeAdapter.ts` | **UPDATE** | Prepare for LIVE adapters (skeleton) |
| `worker/src/adapters/hedgeExecutor.ts` | **CREATE** | Atomic hedge execution + rollback |
| `worker/src/config/exchangeBalances.ts` | **CREATE** | Per-exchange allocation config |
| `worker/src/utils/apiKeyManager.ts` | **CREATE** | Encrypted API key storage (local) |

### Frontend

| Fajl | Akcija | Opis |
|------|--------|------|
| `src/store/autopilotStore.ts` | **UPDATE** | Ukloni paper mode, dodaj dry run |
| `src/types/autopilot.ts` | **UPDATE** | Novi tipovi (HedgePosition, ExchangeBalance) |
| `src/components/autopilot/PersonalRobotWidget.tsx` | **UPDATE** | Exchange alokacija, warning banner |
| `src/components/autopilot/ExchangeAllocation.tsx` | **CREATE** | Balance per exchange komponenta |
| `src/components/autopilot/RiskWarningBanner.tsx` | **CREATE** | Profit not guaranteed warning |
| `src/components/autopilot/HedgePositionCard.tsx` | **CREATE** | Prikaz hedge (long+short) kao jedinice |
| `src/pages/Dashboard.tsx` | **UPDATE** | Integracija novih komponenti |

### Database

| Akcija | Opis |
|--------|------|
| **Migration** | Dodaj `hedge_id` kolonu za povezivanje long/short lega |
| **Migration** | Dodaj `exchange_balance` tabelu za tracking |
| **Update RLS** | Service role samo za worker operacije |

---

## 8. Sigurnosna Upozorenja

### Obavezni Disclaimer u UI

```text
⚠️ RISK DISCLOSURE
This is a risk-minimized, market-neutral funding arbitrage strategy.
While designed to minimize directional exposure, profit is NOT guaranteed.
- Funding rates can change unexpectedly
- Execution slippage may exceed estimates  
- Exchange API failures can cause unexpected losses
- Past performance does not guarantee future results

USE AT YOUR OWN RISK. Never trade with funds you cannot afford to lose.
```

### API Key Security

- Lokalno enkriptovani (AES-256) sa passphrase
- Nikada se ne salju van uredjaja
- Worker cita keys samo u memoriju
- Keys se ne loguju

---

## 9. Implementacija po Koracima

### Faza 1: Config + Types (Osnova)
1. Update `config/autopilot.ts` sa novim parametrima
2. Update `src/types/autopilot.ts` sa HedgePosition tipom
3. Kreiraj `worker/src/config/exchangeBalances.ts`

### Faza 2: Worker Engine Updates
4. Update `formulas.ts` - novi thresholds
5. Update `opportunityEngine.ts` - whitelist + striktni filteri
6. Update `positionManager.ts` - hedge logika
7. Update `riskManager.ts` - tiered drawdown
8. Kreiraj `hedgeExecutor.ts` - atomic execution

### Faza 3: UI Updates
9. Update `PersonalRobotWidget.tsx` - ukloni paper, dodaj dry run
10. Kreiraj `ExchangeAllocation.tsx`
11. Kreiraj `RiskWarningBanner.tsx`
12. Update `Dashboard.tsx`

### Faza 4: Database + Security
13. Migration za hedge_id i exchange_balance
14. Kreiraj `apiKeyManager.ts` (skeleton)

---

## 10. DRY RUN Mode

Za testiranje logike bez slanja pravih naloga:

```typescript
// config
dryRun: {
  enabled: false,  // Toggle u UI
  logOnly: true,   // Log decisions without executing
  mockFills: true, // Simulate order fills for testing
}
```

DRY RUN ce:
- Skenirati prilike normalno
- Donositi odluke o open/close
- Logovati sve akcije
- **NE** slati naloge na berze
- **NE** simulirati paper PnL (to je uklenjeno)

---

## Napomena

Ovaj plan implementira LIVE-ready infrastrukturu, ali konkretni exchange adapteri (Binance, Bybit, itd.) ostaju kao skeleton. Za pravi LIVE trading potrebno je:

1. Implementirati svaki adapter sa CCXT REST
2. Dodati order verification i reconciliation
3. Testirati na testnetu svake berze
4. Security audit API key managementa
