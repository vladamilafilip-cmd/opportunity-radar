
# Automatski Funding Arbitrage Bot - Kompletan Plan

## Pregled

Kreiranje kompletnog automatskog trading sistema koji:
1. Koristi tvoje Binance i OKX API ključeve (MAINNET + TESTNET)
2. Automatski otvara/zatvara delta-neutral hedge pozicije
3. Ima TEST i LIVE mode sa jednim klikom
4. Omogućava manualno upravljanje pozicijama

---

## Arhitektura Sistema

```text
┌─────────────────────────────────────────────────────────────┐
│                    FUNDING ARBITRAGE BOT                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐          ┌──────────────────────────────┐ │
│  │   FRONTEND   │          │     EDGE FUNCTION            │ │
│  │   /bot page  │◄────────►│   autopilot-executor         │ │
│  │              │          │   (svaku 1 minutu)           │ │
│  └──────────────┘          └──────────────────────────────┘ │
│                                       │                      │
│                                       ▼                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              CLOUD SECRETS (Encrypted)                │   │
│  │  BINANCE_API_KEY    BINANCE_API_SECRET               │   │
│  │  OKX_API_KEY        OKX_API_SECRET   OKX_PASSPHRASE  │   │
│  │  + TESTNET verzije                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                       │                      │
│                                       ▼                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   SUPABASE DB                         │   │
│  │  autopilot_state    autopilot_positions              │   │
│  │  autopilot_audit_log                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Korak 1: Dodavanje API Ključeva u Cloud Secrets

Potrebno je dodati sledeće secrets:

| Secret Name | Vrednost | Namena |
|-------------|----------|--------|
| BINANCE_API_KEY | q7Oai8m... | Mainnet API Key |
| BINANCE_API_SECRET | EkKA925... | Mainnet Secret |
| BINANCE_TESTNET_API_KEY | pAnBHCB... | Testnet API Key |
| BINANCE_TESTNET_API_SECRET | W5ac1n7... | Testnet Secret |
| OKX_API_KEY | 0f07410... | Mainnet API Key |
| OKX_API_SECRET | 030B86F... | Mainnet Secret |
| OKX_API_PASSPHRASE | Vlada@... | Mainnet Passphrase |
| OKX_TESTNET_API_KEY | d955218... | Testnet/Demo Key |
| OKX_TESTNET_API_SECRET | 667300C... | Testnet Secret |
| OKX_TESTNET_API_PASSPHRASE | Filip@... | Testnet Passphrase |

---

## Korak 2: Nova Edge Funkcija `autopilot-executor`

Kreiranje nove Edge funkcije koja:

1. Čita `autopilot_state.mode` (live/test/off)
2. Koristi odgovarajuće API ključeve (mainnet/testnet)
3. Skenira funding rate prilike između Binance i OKX
4. Otvara hedge pozicije kada je profit > 0.03%
5. Zatvara pozicije po exit pravilima
6. Loguje sve akcije u audit log

```text
autopilot-executor/
├── index.ts           # Main handler
├── ccxtClient.ts      # CCXT inicijalizacija
├── hedgeEngine.ts     # Logika za otvaranje/zatvaranje
└── types.ts           # TypeScript tipovi
```

**Ključne funkcije:**

- `scanOpportunities()` - Pronalazi spread između berzi
- `executeHedge(symbol, side)` - Otvara LONG na jednoj, SHORT na drugoj
- `closeHedge(hedgeId)` - Zatvara oba lega istovremeno
- `collectFunding()` - Simulira/prati funding collection

---

## Korak 3: Ažuriranje FundingBot.tsx UI

### Popravke:

1. **TEST dugme** - Popraviti da pravilno menja mode u bazi
2. **Manual Enter** - Omogućiti ručno otvaranje pozicije na klik
3. **Close Position** - Poziva Edge funkciju za zatvaranje
4. **Real-time Opportunities** - Fetch iz `funding_rates` tabele

### Nova dugmad:

| Dugme | Akcija |
|-------|--------|
| LIVE | Prebacuje na mainnet API ključeve |
| TEST | Prebacuje na testnet API ključeve |
| ENTER | Manualno otvara hedge na izabranom paru |
| CLOSE | Zatvara izabranu poziciju |
| SYNC | Osvežava stanje sa berzi |

---

## Korak 4: Database State Fix

Trenutno stanje u bazi:
- `mode: live` (ali TEST dugme ne reaguje)
- `is_running: true`
- `dry_run_enabled: true`

Potrebno:
- Ukloniti `dry_run_enabled` (zamenjen sa mode)
- Dodati `trading_mode` enum: `mainnet | testnet`

---

## Korak 5: Workflow Trading Ciklusa

```text
Svaku 1 minutu Edge Function radi:

1. CHECK STATE
   └── Ako mode == 'off' → SKIP
   └── Ako kill_switch → SKIP

2. FETCH FUNDING RATES
   ├── Binance: /fapi/v1/premiumIndex
   └── OKX: /api/v5/market/tickers

3. CALCULATE SPREADS
   └── Za svaki par gde oba imaju podatke:
       spread = binance_rate - okx_rate

4. FILTER OPPORTUNITIES
   ├── |spread| >= 0.03% (30 bps)
   ├── bid-ask spread <= 0.15%
   └── Oba para imaju dovoljnu likvidnost

5. OPEN NEW HEDGES (ako ima prostora)
   ├── Check: current_positions < 8
   ├── Check: deployed < €400
   └── Execute: LONG na berzi sa nižim funding, SHORT na višem

6. UPDATE EXISTING POSITIONS
   ├── Fetch current prices
   ├── Calculate unrealized PnL
   └── Simulate funding collection

7. CHECK EXIT CONDITIONS
   ├── Time > 8h AND profit achieved
   ├── Spread collapsed
   ├── PnL drift > 0.5%
   └── Manual close request

8. CLOSE POSITIONS IF NEEDED
   ├── Close LONG leg
   ├── Close SHORT leg
   └── Update DB status

9. LOG & UPDATE STATE
   └── Save to autopilot_audit_log
```

---

## Korak 6: Sigurnosne Mere

1. **API Key Permissions**
   - Binance: Samo Futures Trading (bez Withdrawal)
   - OKX: Trade Only (bez Transfer)

2. **Kill Switch**
   - Aktivira se pri €50 daily drawdown
   - Zahteva manual reset

3. **Position Limits**
   - Max 8 hedge pozicija
   - Max €400 deployed (od €460)
   - €60 uvek u rezervi

4. **Rate Limiting**
   - 1 scan po minuti
   - Max 10 API calls po ciklusu

---

## Fajlovi za Kreiranje/Izmenu

| Fajl | Akcija | Opis |
|------|--------|------|
| `supabase/functions/autopilot-executor/index.ts` | CREATE | Main Edge Function |
| `supabase/functions/autopilot-executor/ccxtClient.ts` | CREATE | CCXT sa API ključevima |
| `supabase/functions/autopilot-executor/hedgeEngine.ts` | CREATE | Trading logika |
| `src/pages/FundingBot.tsx` | UPDATE | Popraviti dugmad, dodati manual trade |
| `src/components/bot/ModeToggle.tsx` | UPDATE | Popraviti TEST/LIVE toggle |
| `src/store/autopilotStore.ts` | UPDATE | Dodati manualTrade funkciju |

---

## Rezultat

Nakon implementacije:

1. **TEST mode** - Koristi Binance/OKX testnet, bez pravog novca
2. **LIVE mode** - Koristi mainnet, pravi trades sa $500
3. **Automatski** - Otvara/zatvara pozicije svake minute
4. **Manualno** - Možeš kliknuti ENTER na bilo koju priliku
5. **Potpuna kontrola** - START/STOP/STOP ALL sa jednim klikom

---

## Napomena o Bezbednosti

**KRITIČNO:** API ključevi koje si podelio treba ODMAH regenerisati jer su vidljivi u chat istoriji. Ovi ključevi će biti korišćeni samo za inicijalnu konfiguraciju - zameni ih čim sistem proradi.
