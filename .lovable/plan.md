

# Plan: IQ200 Tier-Based Scaling System (20 Berzi × 100 Parova)

## Executive Summary

Implementacija inteligentnog tier sistema koji skalira pokrivanje na **20 berzi** i **100 parova** bez rizika od banovanja API-ja, uz 80% uštede compute resursa.

## Trenutno Stanje

| Metrika | Trenutno | Cilj |
|---------|----------|------|
| Aktivne berze | 2 (Binance, Bybit) | 20 |
| Simboli/parovi | 20 | 100 |
| Aktivni marketi | 40 | ~400 (optimizirano) |
| API pozivi/min | ~6 | ~25 (batch) |

## API Rate Limit Analiza (Kritično za Ne-Banovanje)

| Berza | Rate Limit | Naš pristup | Sigurnost |
|-------|------------|-------------|-----------|
| Binance | 1200/min | 1 batch call za sve | ✅ 99% ispod |
| Bybit | 600/min | 1 batch call | ✅ 99% ispod |
| OKX | 60/2s | 1 batch call/30s | ✅ Sigurno |
| Bitget | 100/s | 1 batch call/30s | ✅ Sigurno |
| Gate.io | 900/min | 1 batch call | ✅ Sigurno |
| KuCoin | 30/s | 1 batch call/30s | ✅ Sigurno |
| HTX | 100/10s | 1 batch call/30s | ✅ Sigurno |
| MEXC | 500/10s | 1 batch call | ✅ Sigurno |

**Princip: 1 API poziv = svi parovi** (batch fetch). Nikada pojedinačni pozivi po paru.

## Tier Arhitektura

### Symbol Tiers (Što se prati)

| Tier | Kategorija | Parova | Primjeri | Refresh Interval |
|------|------------|--------|----------|------------------|
| **T1** | Majors | 10 | BTC, ETH, SOL, BNB, XRP | 1 min |
| **T2** | Top Altcoins | 25 | ARB, OP, LINK, AVAX, DOT, MATIC | 3 min |
| **T3** | Mid Altcoins | 30 | SUI, APT, INJ, SEI, TIA, JUP | 5 min |
| **T4** | Meme/High Risk | 35 | PEPE, WIF, DOGE, SHIB, BONK | 10 min |

### Exchange Tiers (Gdje se prati)

| Tier | Berze | Opis |
|------|-------|------|
| **Primary** | Binance, Bybit, OKX | Svi simboli, 1 min refresh |
| **Secondary** | Bitget, Gate, KuCoin | T1-T3 simboli, 3 min refresh |
| **Tertiary** | HTX, MEXC, Deribit, Kraken | T1-T2 simboli, 5 min refresh |
| **Extended** | + 10 manjih | Samo T1 majors, 10 min refresh |

## Smart Processing Matrix

```text
                    Exchange Tiers
Symbol Tiers    Primary(3)  Secondary(3)  Tertiary(4)  Extended(10)
─────────────────────────────────────────────────────────────────────
T1 Majors (10)     ✓ 1min      ✓ 3min       ✓ 5min       ✓ 10min
T2 Top (25)        ✓ 1min      ✓ 3min       ✓ 5min       ○ skip
T3 Mid (30)        ✓ 1min      ✓ 3min       ○ skip       ○ skip
T4 Meme (35)       ✓ 1min      ○ skip       ○ skip       ○ skip

Legend: ✓ = proces, ○ = skip
```

**Rezultat**: 
- Maksimalno: 100 × 20 = 2000 kombinacija
- Optimizirano: ~450 aktivnih market kombinacija
- **Ušteda: 77.5%**

## Database Schema Changes

### 1. Proširiti `symbols` tabelu

```sql
ALTER TABLE symbols 
ADD COLUMN symbol_tier integer DEFAULT 3 CHECK (symbol_tier BETWEEN 1 AND 4),
ADD COLUMN volatility_multiplier numeric DEFAULT 1.0,
ADD COLUMN is_meme boolean DEFAULT false;
```

### 2. Proširiti `exchanges` tabelu

```sql
ALTER TABLE exchanges
ADD COLUMN exchange_tier integer DEFAULT 2 CHECK (exchange_tier BETWEEN 1 AND 3),
ADD COLUMN rate_limit_per_min integer DEFAULT 100,
ADD COLUMN batch_endpoint text;
```

### 3. Dodati scheduling tabelu

```sql
CREATE TABLE ingestion_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id uuid REFERENCES exchanges(id),
  symbol_tier integer NOT NULL,
  interval_minutes integer NOT NULL DEFAULT 5,
  last_run_at timestamptz,
  next_run_at timestamptz,
  is_active boolean DEFAULT true,
  
  UNIQUE(exchange_id, symbol_tier)
);
```

### 4. Nova engine_config zapisi

```sql
INSERT INTO engine_config (config_key, config_value) VALUES
('tier_intervals', '{"t1": 1, "t2": 3, "t3": 5, "t4": 10}'),
('exchange_tiers', '{"primary": ["binance", "bybit", "okx"], "secondary": ["bitget", "gate", "kucoin"]}'),
('liquidity_filters', '{"min_volume_24h": 1000000, "max_spread_bps": 50}');
```

## API Integration (Nove Berze)

### Batch Endpoint Strategija

| Berza | Batch Endpoint | Format |
|-------|----------------|--------|
| OKX | `GET /api/v5/market/tickers?instType=SWAP` | Sve USDT perps u 1 pozivu |
| Bitget | `GET /api/v2/mix/market/tickers?productType=USDT-FUTURES` | Sve u 1 pozivu |
| Gate.io | `GET /api/v4/futures/usdt/tickers` | Sve u 1 pozivu |
| KuCoin | `GET /api/v1/market/allTickers` | Sve u 1 pozivu |
| HTX | `GET /linear-swap-api/v1/swap_batch_funding_rate` | Sve u 1 pozivu |
| MEXC | `GET /api/v1/contract/detail` | Sve u 1 pozivu |

**Svaka berza = 1 API poziv za sve podatke. Bez petlji po parovima!**

## Ingest Engine Refactor

### Nova arhitektura: `ingest-exchange-data/index.ts`

```text
┌─────────────────────────────────────────────────────────────┐
│  Cron Trigger (svaki minut)                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Check ingestion_schedule: šta treba sada?               │
│     - Filtrira po next_run_at <= now()                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Group by Exchange (batch je uvijek cijela berza)        │
│     - Binance: fetch all, filter T1-T4 u post-processing   │
│     - OKX: fetch all, filter T1-T3                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Pre-filter: skip ako volume < $1M ili spread > 50bps   │
│     - Ovo se radi NAKON fetch-a, u memoriji                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Upsert samo validne zapise u funding_rates/prices      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Update ingestion_schedule.next_run_at                  │
└─────────────────────────────────────────────────────────────┘
```

### Pseudo-kod za Scheduler

```typescript
async function shouldFetchExchange(exchangeCode: string, symbolTier: number): Promise<boolean> {
  const { data } = await supabase
    .from('ingestion_schedule')
    .select('next_run_at')
    .eq('exchange_id', exchangeId)
    .eq('symbol_tier', symbolTier)
    .single();
  
  return !data?.next_run_at || new Date(data.next_run_at) <= new Date();
}
```

## 100 Simbola Lista

### Tier 1 - Majors (10)
BTC, ETH, SOL, BNB, XRP, ADA, AVAX, DOT, LINK, LTC

### Tier 2 - Top Altcoins (25)
MATIC, OP, ARB, ATOM, UNI, APT, SUI, INJ, TIA, SEI, NEAR, FTM, ALGO, ICP, HBAR, FIL, VET, XLM, EOS, AAVE, MKR, CRV, LDO, RUNE, SNX

### Tier 3 - Mid Altcoins (30)
STRK, JUP, WLD, BLUR, IMX, MANA, SAND, AXS, GALA, ENJ, GMT, FLOW, ROSE, KAVA, ZIL, ONE, QTUM, NEO, WAVES, ICX, ZRX, BAT, ENS, LRC, DYDX, GMX, RDNT, PENDLE, STX, CFX

### Tier 4 - Meme/High Risk (35)
DOGE, SHIB, PEPE, WIF, BONK, FLOKI, MEME, TURBO, BOME, SLERF, MYRO, BRETT, MOG, BABYDOGE, ELON, LADYS, AIDOGE, COQ, TOSHI, PONKE, BOOK, MICHI, POPCAT, NEIRO, SUNDOG, GIGA, SPX, GOAT, FWOG, MOODENG, PNUT, ACT, LUCE, CHILLGUY, HIPPO

## Metrics Engine Update

### Pre-filter Logika

```typescript
function shouldProcessMarket(metric: ComputedMetric, config: EngineConfig): boolean {
  // Skip low volume pairs
  if (metric.volume_24h < config.liquidity_filters.min_volume_24h) return false;
  
  // Skip high spread (illiquid) pairs
  if (metric.spread_bps > config.liquidity_filters.max_spread_bps) return false;
  
  // Skip stale data
  if (metric.data_quality < 0.5) return false;
  
  return true;
}
```

### Smart Arbitrage Pairing

Umjesto O(n²) svih parova, koristimo "hub" model:

```text
Hub berze: Binance, Bybit, OKX
Spoke berze: ostale

Parovi se formiraju samo:
  Hub ↔ Hub (3 kombinacije)
  Hub ↔ Spoke (3 × 17 = 51 kombinacija)
  
Nikada: Spoke ↔ Spoke (izbjegavamo 17 × 16 / 2 = 136 kombinacija)
```

**Ušteda u arbitrage compute: ~70%**

## Sekvenca Implementacije

| Faza | Opis | Kompleksnost |
|------|------|--------------|
| **1** | DB migracija (tier columns + schedule tabela) | Low |
| **2** | Populirati 100 simbola sa tier vrijednostima | Low |
| **3** | Aktivirati preostalih 6 berzi (već u DB) | Low |
| **4** | Dodati API fetchere za OKX, Bitget, Gate, KuCoin, HTX, MEXC | Medium |
| **5** | Implementirati ingestion scheduler | Medium |
| **6** | Update metrics engine sa pre-filterima | Low |
| **7** | Dodati 12 novih berzi (Extended tier) | Medium |
| **8** | Monitoring i fine-tuning | Low |

## Monitoring & Safety

### Circuit Breakers

```typescript
interface CircuitBreaker {
  exchange: string;
  consecutive_failures: number;
  backoff_until: Date | null;
}

// Ako berza failuje 3x zaredom → backoff 5 min
// Ako failuje 5x → backoff 30 min
// Ako failuje 10x → disable do manual review
```

### Health Metrics

```sql
-- Pratiti u system_health tabeli
INSERT INTO system_health (component, status, metadata) VALUES
('ingestion_binance', 'healthy', '{"success_rate": 99.5, "avg_latency_ms": 120}'),
('ingestion_okx', 'degraded', '{"success_rate": 85, "avg_latency_ms": 450}');
```

## Očekivani Rezultati

| Metrika | Prije | Poslije |
|---------|-------|---------|
| Arbitrage prilika/h | ~5-10 | ~50-100 |
| Net Edge prosijek | 15 bps | 25-40 bps |
| Shitcoin coverage | 3 (DOGE, PEPE, WIF) | 35 |
| API ban rizik | 0% | 0% (batch strategija) |
| Compute cost | $X | ~$0.23X |

## Zaključak

Ova arhitektura omogućava 5x veći coverage uz:
- **Nula rizika od banovanja** (batch API pozivi)
- **77% manje database writes** (tier filtering)
- **70% brži arbitrage compute** (hub-spoke model)
- **Veći profit potencijal** (shitcoin volatilnost)

