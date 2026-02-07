
# Plan: Bezbedno čuvanje API ključeva i aktivacija LIVE trgovanja

## Pregled

Ovaj plan opisuje kako ćemo bezbedno sačuvati API ključeve za Binance i OKX berze i aktivirati mogućnost LIVE trgovanja umesto trenutnog paper/test moda.

---

## Koraci implementacije

### 1. Čuvanje API ključeva kao Cloud Secrets

Sačuvaćemo sledeće ključeve kao enkriptovane secrets:
- `BINANCE_API_KEY`
- `BINANCE_API_SECRET`  
- `OKX_API_KEY`
- `OKX_API_SECRET`
- `OKX_PASSPHRASE`

Ovi ključevi će biti dostupni **SAMO** backend funkcijama u runtime-u - nikada neće biti vidljivi u kodu ili klijentskoj aplikaciji.

---

### 2. Ažuriranje autopilot-executor funkcije

Trenutno `autopilot-executor` ima CCXT logiku koja je označena kao TODO. Implementiraćemo:

- Dohvatanje API ključeva iz Cloud Secrets
- Inicijalizacija CCXT klijenata za Binance i OKX
- Izvršavanje pravih naloga umesto simulacije
- Provera balansa pre otvaranja pozicija

---

### 3. Dodavanje UI kontrole za mod

Na `/bot` stranici dodaćemo mogućnost prebacivanja između:
- **Paper Mode** - simulacija (trenutno aktivno)
- **Live Mode** - pravo trgovanje sa vašim ključevima

Sa jasnim upozorenjem pre aktivacije Live moda.

---

## Tehnički detalji

### Edge funkcija: autopilot-executor

```text
┌─────────────────────────────────────┐
│  autopilot-executor (cron svaki min)│
├─────────────────────────────────────┤
│  1. Proveri mode (paper/live)       │
│  2. Ako LIVE:                       │
│     - Dohvati ključeve iz Secrets   │
│     - Inicijalizuj CCXT             │
│     - Proveri balanse               │
│     - Izvrši prave naloge           │
│  3. Ako PAPER:                      │
│     - Simuliraj kao do sada         │
└─────────────────────────────────────┘
```

### CCXT integracija

```typescript
import ccxt from 'npm:ccxt';

const binance = new ccxt.binance({
  apiKey: Deno.env.get('BINANCE_API_KEY'),
  secret: Deno.env.get('BINANCE_API_SECRET'),
});

const okx = new ccxt.okx({
  apiKey: Deno.env.get('OKX_API_KEY'),
  secret: Deno.env.get('OKX_API_SECRET'),
  password: Deno.env.get('OKX_PASSPHRASE'),
});
```

---

## Bezbednosne napomene

1. **API ključevi nikada ne napuštaju server** - dostupni su samo Edge funkcijama
2. **Koristite ključeve sa minimalnim privilegijama** - samo Trade + Read, BEZ Withdraw
3. **Preporučujem rotaciju ključeva** jer su bili izloženi u četu
4. **Live mod zahteva eksplicitnu aktivaciju** - neće se slučajno uključiti

---

## Sledeći koraci nakon odobrenja

1. Rotirati ključeve na berzama (iz bezbednosnih razloga)
2. Sačuvati nove ključeve kao Cloud Secrets
3. Implementirati CCXT logiku u autopilot-executor
4. Dodati Live/Paper toggle u UI sa upozorenjima
5. Testirati na malim iznosima pre punog korišćenja
