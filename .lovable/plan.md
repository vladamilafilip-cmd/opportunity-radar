# Plan: IQ200 Tier-Based Scaling System (20 Berzi × 100 Parova)

## ✅ IMPLEMENTATION STATUS

### Completed Phases

| Faza | Opis | Status |
|------|------|--------|
| **1** | DB migracija (tier columns + schedule tabela) | ✅ DONE |
| **2** | Populirati 100 simbola sa tier vrijednostima | ✅ DONE |
| **3** | Dodati 8 novih berzi (OKX, Bitget, Gate, KuCoin, HTX, MEXC, Kraken, Deribit) | ✅ DONE |
| **4** | Implementirati tier-based ingestion scheduler | ✅ DONE |
| **5** | Dodati API fetchere za sve berze (batch endpoints) | ✅ DONE |
| **6** | Liquidity pre-filtering u ingestion | ✅ DONE |
| **7** | Circuit breaker sa exponential backoff | ✅ DONE |

### Remaining Work

| Faza | Opis | Status |
|------|------|--------|
| **8** | Update metrics engine sa hub-spoke arbitrage | TODO |
| **9** | Dodati 10 Extended tier berzi | TODO |
| **10** | Monitoring dashboard | TODO |

## Current System State

| Metrika | Vrijednost |
|---------|------------|
| Aktivne berze | 10 |
| Aktivni simboli | 100 |
| Aktivni marketi | 475 |
| Schedule zapisi | 29 |
| Zadnji test: funding rates | 267 |
| Zadnji test: prices | 332 |

## Tier Arhitektura

### Symbol Tiers

| Tier | Kategorija | Parova | Primjeri | Refresh Interval |
|------|------------|--------|----------|------------------|
| **T1** | Majors | 10 | BTC, ETH, SOL, BNB, XRP | 1 min |
| **T2** | Top Altcoins | 25 | ARB, OP, LINK, AVAX, DOT | 3 min |
| **T3** | Mid Altcoins | 30 | SUI, APT, INJ, SEI, TIA | 5 min |
| **T4** | Meme/High Risk | 35 | PEPE, WIF, DOGE, SHIB, BONK | 10 min |

### Exchange Tiers

| Tier | Berze | Simboli |
|------|-------|---------|
| **Primary** | Binance, Bybit, OKX | Svi (T1-T4) |
| **Secondary** | Bitget, Gate, KuCoin | T1-T3 |
| **Tertiary** | HTX, MEXC, Kraken, Deribit | T1-T2 |

## Key Features Implemented

1. **Batch API Calls**: 1 poziv po berzi = svi parovi
2. **Tier-Based Scheduling**: Različiti refresh intervali po tier kombinaciji
3. **Circuit Breaker**: Exponential backoff (5min → 15min → 30min → disable)
4. **Liquidity Pre-filtering**: Skip ako volume < $1M ili spread > 50bps
5. **10 Exchange Fetchers**: Binance, Bybit, OKX, Bitget, Gate, KuCoin, HTX, MEXC, Kraken, Deribit

## Files Modified/Added

### Edge Functions
- `supabase/functions/ingest-exchange-data/index.ts` - Refaktorisan main engine
- `supabase/functions/ingest-exchange-data/exchangeFetchers.ts` - 10 batch fetcher-a
- `supabase/functions/ingest-exchange-data/scheduler.ts` - Tier scheduling logika

### Database Changes
- `symbols`: +symbol_tier, +volatility_multiplier, +is_meme
- `exchanges`: +exchange_tier, +rate_limit_per_min, +batch_endpoint, +funding_interval_hours
- Nova tabela: `ingestion_schedule`
- engine_config: tier_intervals, exchange_tiers, liquidity_filters, hub_exchanges

## Expected Results

| Metrika | Prije | Poslije |
|---------|-------|---------|
| Arbitrage prilika/h | ~5-10 | ~50-100 |
| Shitcoin coverage | 3 | 35 |
| API ban rizik | 0% | 0% |
| Compute cost | $X | ~$0.23X |
