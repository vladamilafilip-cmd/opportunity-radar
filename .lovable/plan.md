
# Implementacija Funding Arbitrage Bota

## Šta radim

### 1. Dodajem 10 API Secrets
- BINANCE_API_KEY, BINANCE_API_SECRET
- BINANCE_TESTNET_API_KEY, BINANCE_TESTNET_API_SECRET
- OKX_API_KEY, OKX_API_SECRET, OKX_API_PASSPHRASE
- OKX_TESTNET_API_KEY, OKX_TESTNET_API_SECRET, OKX_TESTNET_API_PASSPHRASE

### 2. Kreiram Edge Funkciju `autopilot-executor`
- Koristi CCXT za Binance i OKX
- Automatski bira mainnet/testnet po modu
- Skenira funding spreads
- Otvara/zatvara hedge pozicije
- BEZ logovanja (po zahtevu)

### 3. Ažuriram UI
- Popravka TEST/LIVE toggle-a
- Dodajem ENTER dugme za manual trade
- Dodajem CLOSE dugme za zatvaranje

## Fajlovi

| Fajl | Akcija |
|------|--------|
| `supabase/functions/autopilot-executor/index.ts` | CREATE |
| `src/pages/FundingBot.tsx` | UPDATE |
| `src/store/autopilotStore.ts` | UPDATE |

## Tehničke napomene

- CCXT preko `npm:ccxt` specifier-a
- Sandbox mode = testnet
- Max 8 pozicija, €50 po hedge-u
- Kill switch na €50 drawdown
