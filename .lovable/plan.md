
# Plan: Paper Trading za sve + Više parova + Funding Interval Fix

## Pregled promena

Tri glavne oblasti izmena:

1. **Omogući Paper Trading za sve korisnike** (ne samo PRO)
2. **Dodaj više parova za trading** sa jasnim upozorenjima za visokorizične
3. **Ispravi funding intervale** - podržati 1h, 4h, 8h i druge intervale

---

## Deo 1: Paper Trading za sve

### Trenutno stanje
- `Trading.tsx` blokira free korisnike (linije 17, 35-60)
- Prikazuje "Upgrade to PRO" umesto sadržaja

### Izmene

**src/pages/Trading.tsx**
- Ukloniti proveru `isPro` koja blokira pristup
- Dodati "FREE MODE" badge koji naglašava da je ovo simulacija
- Zadržati auto-refresh za sve korisnike (ne samo PRO)

```text
UKLONITI:
- const isPro = user?.plan !== 'free';
- if (!isPro) return (...upgrade screen...)

DODATI:
- Badge "Paper Trading - Educational Mode"
- Upozorenje: "Ovo je simulacija. Ne koristite pravi novac."
```

---

## Deo 2: Dodaj više parova + Upozorenja

### Trenutno stanje mockData.ts
- 10 safe simbola
- 10 medium simbola  
- 15 high risk simbola
- Ukupno: 35 simbola

### Baza podataka (već ima)
- 100+ simbola uključujući 35 meme coinova
- Ali UI koristi mock data, ne real data

### Izmene

**src/lib/mockData.ts**
Proširiti liste simbola da odražavaju bazu:

```text
SAFE_SYMBOLS (Tier 1): 10 simbola
- BTC, ETH, SOL, XRP, BNB, LTC, ADA, AVAX, LINK, DOT

MEDIUM_SYMBOLS (Tier 2): 25 simbola  
- ARB, OP, SUI, APT, INJ, SEI, TIA, JUP, NEAR, ATOM
- UNI, AAVE, FIL, ICP, MKR, LDO, FTM, CRV, SNX, RUNE
- ALGO, EOS, HBAR, VET, XLM

HIGH_RISK_SYMBOLS (Tier 3-4): 65 simbola
- Gaming: AXS, GALA, IMX, GMT, ENJ
- DeFi: DYDX, GMX, LRC, ENS, KAVA
- Memes (35): DOGE, SHIB, PEPE, WIF, BONK, FLOKI, MEME, TURBO, BOME, SLERF, 
  MYRO, BRETT, MOG, BABYDOGE, ELON, LADYS, AIDOGE, COQ, TOSHI, PONKE,
  BOOK, MICHI, POPCAT, NEIRO, SUNDOG, GIGA, SPX, GOAT, FWOG, MOODENG,
  PNUT, ACT, LUCE, CHILLGUY, HIPPO
```

**src/components/RiskBadge.tsx**
- Dodati tooltip sa objašnjenjem rizika
- Za HIGH tier: Dodati animaciju (pulse/glow) da privuče pažnju

**src/pages/Dashboard.tsx**
- Za meme coinove: Dodati "EXTREME RISK" banner
- Prikazati volatility_multiplier ako je > 2.0
- Sortirati po riziku (safe first)

---

## Deo 3: Fix Funding Intervali

### Problem
- Kod pretpostavlja 8h za sve
- Kraken ima 4h interval
- dYdX i Hyperliquid imaju 1h interval
- Ovo utiče na APY kalkulacije

### Trenutna logika u `run-metrics-engine/index.ts`
```javascript
function getFundingInterval(exchangeCode: string, config: EngineConfig): number {
  return config.funding_intervals[code] ?? 8; // Default 8h
}
```

### Izmene

**Baza - engine_config**
Ažurirati `funding_intervals` konfiguraciju:
```json
{
  "binance": 8,
  "bybit": 8, 
  "okx": 8,
  "bitget": 8,
  "gate": 8,
  "kucoin": 8,
  "htx": 8,
  "mexc": 8,
  "kraken": 4,
  "deribit": 8,
  "dydx": 1,
  "hyperliquid": 1
}
```

**Tabela exchanges** 
- `kraken` već ima `funding_interval_hours: 4` ✓
- Ali engine čita iz `engine_config`, ne iz tabele

**src/pages/Dashboard.tsx**
- Prikazati funding interval pored stope (npr. "0.01% / 4h")
- Normalizovati prikaz na 8h ekvivalent za poređenje

**UI prikaz**
Dodati kolonu u tabeli:
```text
| Exchange | Symbol | Rate | Interval | 8h Equiv | Risk |
| Kraken   | BTC    | 0.02%| 4h       | 0.04%    | Safe |
| Binance  | BTC    | 0.03%| 8h       | 0.03%    | Safe |
```

---

## Deo 4: Upozorenja za visok rizik

### Novi komponent: HighRiskWarning

**src/components/HighRiskWarning.tsx**
```text
Za simbole sa:
- is_meme = true
- volatility_multiplier > 2.0
- symbol_tier = 4

Prikazati banner:
┌─────────────────────────────────────────┐
│ ⚠️ EXTREME RISK - MEME COIN              │
│ • Ekstremna volatilnost (3x+ normalne)  │
│ • Mogućnost gubitka 100% kapitala       │
│ • Niska likvidnost = veći slippage      │
│ • NIJE preporučeno za početnike         │
└─────────────────────────────────────────┘
```

### Izmene u tabelama

**Dashboard.tsx - Funding Arb tab**
- Dodati kolonu "Volatility" 
- Za high risk: Crvena pozadina reda
- Tooltip: "Ovaj par ima 3x veću volatilnost od normalnog"

**Trading.tsx - Open Position**
- Pre otvaranja pozicije na high-risk paru:
  - Prikazati modal upozorenja
  - Zahtevati potvrdu "Razumem rizik"

---

## Tehnički plan implementacije

### Fajlovi za izmenu:

1. **src/pages/Trading.tsx**
   - Ukloniti isPro blokadu
   - Dodati educational banere

2. **src/lib/mockData.ts**
   - Proširiti liste simbola
   - Ažurirati volatility multipliers

3. **src/components/RiskBadge.tsx**
   - Dodati tooltip
   - Animacija za HIGH

4. **src/components/HighRiskWarning.tsx** (NOVO)
   - Komponent za upozorenja

5. **src/pages/Dashboard.tsx**
   - Kolona za funding interval
   - 8h ekvivalent prikaz
   - Sortiranje po riziku

### Baza podataka:

Ažurirati `engine_config.funding_intervals`:
```sql
UPDATE engine_config 
SET config_value = '{"binance":8,"bybit":8,"okx":8,"bitget":8,"gate":8,"kucoin":8,"htx":8,"mexc":8,"kraken":4,"deribit":8,"dydx":1,"hyperliquid":1}'
WHERE config_key = 'funding_intervals';
```

---

## Rezime promena

| Oblast | Pre | Posle |
|--------|-----|-------|
| Paper Trading | Samo PRO | Svi korisnici |
| Broj parova | ~35 mock | 100+ (svi iz baze) |
| Funding interval | Samo 8h | 1h, 4h, 8h podržano |
| Risk upozorenja | Badge samo | Modal + Banner + Animacija |
| Meme coinovi | Prikazani normalno | Crveni banner + potvrda |

---

## Pravna zaštita (već implementirano)

Postojeće disclaimere na Trading stranici pojačati:
- "Paper trading je SAMO simulacija"
- "Ne koristite pravi novac na osnovu ovih rezultata"
- "Meme coinovi mogu izgubiti 90%+ vrednosti za dan"
