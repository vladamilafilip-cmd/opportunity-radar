
# Pojednostavljen Funding Arbitrage Bot - $500 Kapital

## Cilj
Napraviti minimalistički one-page dashboard fokusiran ISKLJUČIVO na funding arbitrage sa tvojim $500 kapitalom, koristeći samo Binance i OKX.

---

## Nova Konfiguracija ($500 = ~€460)

```text
┌─────────────────────────────────────────────────────────────┐
│                    KAPITAL ALOKACIJA                        │
├─────────────────────────────────────────────────────────────┤
│  Total: $500 (€460)                                         │
│  ├── Binance: €230 (50%) - LONG pozicije                    │
│  ├── OKX: €230 (50%) - SHORT pozicije                       │
│  ├── Buffer: €60 (13%) - Uvek rezervisano                   │
│  └── Max Deployed: €400 (87%)                               │
│                                                             │
│  Hedge Size: €50 (€25 LONG + €25 SHORT)                     │
│  Max Hedges: 8 pozicija                                     │
│  Kill Switch: €50 daily drawdown                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Dostupni Parovi (120 ukupno)

| Berza   | Broj parova | Zajednički sa drugom |
|---------|-------------|----------------------|
| Binance | 20          | 15 (BTC, ETH, SOL, DOGE, etc.) |
| OKX     | 100         | 15 (zajednički)      |

Sistem automatski pronalazi arbitražu između ISTIH simbola na obe berze.

---

## One-Page Dashboard Struktura

```text
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  FUNDING ARBITRAGE BOT        [LIVE] [TEST] toggle  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │   KAPITAL STATUS     │  │   DANAS PnL          │         │
│  │   $500 / €400 deployed│  │   +$12.50            │         │
│  │   ████████░░ 80%     │  │   +2.5% ROI          │         │
│  └──────────────────────┘  └──────────────────────┘         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AKTIVNE POZICIJE (hedge pairs)                      │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ BTC/USDT  L:Binance S:OKX  +0.03% │ €50 │ 2h   │  │   │
│  │  │ ETH/USDT  L:Binance S:OKX  +0.02% │ €50 │ 5h   │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TOP PRILIKE (real-time)                             │   │
│  │  Symbol    Spread    APR     Action                  │   │
│  │  SOL/USDT  +0.05%    182%    [ENTER]                 │   │
│  │  DOGE/USDT +0.04%    146%    [ENTER]                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  [▶ START]      │  │  [■ STOP ALL]   │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ACTIVITY LOG (poslednje akcije)                     │   │
│  │  12:30 - Opened BTC hedge +0.03%                     │   │
│  │  12:25 - Closed ETH hedge +€0.50                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Tehnički Plan

### 1. Ažuriranje Konfiguracije (`config/autopilot.ts`)
- Kapital: €460 ($500)
- Samo 2 berze: Binance, OKX
- Hedge size: €50 (€25 + €25)
- Buffer: €60
- Max hedges: 8
- Kill switch: €50

### 2. Nova Stranica (`src/pages/FundingBot.tsx`)
Potpuno nova one-page stranica sa:
- LIVE/TEST toggle na vrhu
- Kapital i PnL widget
- Aktivne pozicije (compact)
- Top prilike tabela
- Start/Stop kontrole
- Mini activity log

### 3. Uklanjanje Nepotrebnog
Izbaciti sa dashboard-a:
- Price arbitrage tab
- Opportunities tab  
- Profit calculator (kompleksni)
- Product tour
- Multiple tabs

### 4. Routing
- `/bot` - Nova glavna stranica
- Redirect `/dashboard` na `/bot`

---

## Entry Strategija (IQ200)

```text
FILTER PRAVILA:
├── Min funding spread: 0.03% (30 bps per 8h)
├── Max bid-ask spread: 0.15% (15 bps)
├── Min APR: 100%+
└── Samo SAFE tier (proven parovi)

POZICIJA SIZING:
├── Fixed: €50 per hedge
├── Max 8 concurrent
└── Nikad više od 20% na jedan par

EXIT PRAVILA:
├── Min hold: 8h (1 funding interval)
├── Exit ako profit < 0.01%
├── Exit ako drift > 0.5%
└── Automatski after 24h
```

---

## Fajlovi za Kreiranje/Izmenu

| Fajl | Akcija |
|------|--------|
| `config/autopilot.ts` | UPDATE - nova konfiguracija za $500 |
| `src/pages/FundingBot.tsx` | CREATE - nova one-page stranica |
| `src/components/bot/CapitalWidget.tsx` | CREATE - kapital status |
| `src/components/bot/OpportunitiesTable.tsx` | CREATE - prilike |
| `src/components/bot/PositionsCard.tsx` | CREATE - pozicije |
| `src/components/bot/ModeToggle.tsx` | CREATE - LIVE/TEST switch |
| `src/App.tsx` | UPDATE - dodati novu rutu |

---

## Rezultat

Minimalistički, fokusiran dashboard koji:
1. Prikazuje samo ono što je BITNO
2. Omogućava brzo prebacivanje LIVE/TEST
3. Optimizovan za $500 kapital
4. Koristi SAMO Binance i OKX (120 parova)
5. Fokusiran na SAFE tier (najsigurnije prilike)
