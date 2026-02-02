
# Plan: Ispravka broja signala + Maksimalne visokorizične prilike

## Problem

1. **Badge prikazuje "4 signals" ali samo 3 reda** - Deduplicija smanjuje broj ali badge možda koristi `realSignals.length` umesto `displaySignals.length`
2. **Previše malo prilika** - Korisnik želi sve visokorizične parove sa velikim potencijalnom zarade

---

## Deo 1: Ispravka broja signala

### Trenutno stanje (linije 486-489)
```javascript
{displaySignals.length > 0 && (
  <Badge variant="outline" className="ml-2">
    {displaySignals.length} signals
  </Badge>
)}
```

### Problem
- Kod izgleda ispravno, ali možda ima caching ili deployment delay
- Provera: `displaySignals` se formira iz `deduplicatedSignals` koji ima ispravnu logiku

### Rešenje
- Dodati dodatni prikaz broja: `{displaySignals.length} of {realSignals.length}` ako se razlikuju
- Ili samo prikazati `displaySignals.length` (što je već tačno u kodu)

---

## Deo 2: Maksimalne visokorizične prilike

### Trenutno u mockData.ts
- 100 funding arbitrage prilika
- 80 price arbitrage prilika  
- ALI random distribucija - možda malo high-risk parova

### Izmene za maksimalno visok rizik

**Strategija: Fokus na meme coins i high-risk altcoins**

```javascript
// Umesto random SYMBOLS, prioritizovati HIGH_RISK_SYMBOLS
for (let i = 0; i < 150; i++) {
  // 70% šanse za high-risk/meme, 20% medium, 10% safe
  const rand = Math.random();
  let symbol: string;
  if (rand < 0.70) {
    symbol = HIGH_RISK_SYMBOLS[Math.floor(Math.random() * HIGH_RISK_SYMBOLS.length)];
  } else if (rand < 0.90) {
    symbol = MEDIUM_SYMBOLS[Math.floor(Math.random() * MEDIUM_SYMBOLS.length)];
  } else {
    symbol = SAFE_SYMBOLS[Math.floor(Math.random() * SAFE_SYMBOLS.length)];
  }
  // ... ostatak logike
}
```

### Povećanje broja prilika
- Funding Arb: 100 → **200 prilika**
- Price Arb: 80 → **150 prilika**
- Top Opportunities: 25 → **50 prilika**

### Ekstremnije stope za meme coins
```javascript
if (isMeme) {
  longFundingRate = randomBetween(-0.50, 0.10);   // Bilo: -0.30 do 0.05
  shortFundingRate = randomBetween(0.25, 0.80);   // Bilo: 0.15 do 0.60
  // Spread do 1.3% po 8h = ~60% APR!
}
```

### Price arb spreads
```javascript
if (isMeme) {
  spreadMultiplier = randomBetween(0.02, 0.12); // 2% - 12% spreads!
} else if (symbolRisk === 'high') {
  spreadMultiplier = randomBetween(0.01, 0.08); // 1% - 8%
}
```

---

## Fajlovi za izmenu

### 1. src/lib/mockData.ts

**generateFundingArbitrage()**
- Povećati loop sa 100 na 200
- Promeniti random selekciju da favorizuje HIGH_RISK_SYMBOLS (70%)
- Povećati spread range za meme coins

**generatePriceArbitrage()**
- Povećati loop sa 80 na 150
- Promeniti random selekciju da favorizuje HIGH_RISK_SYMBOLS (70%)
- Povećati spread multiplier za meme/high-risk

**generateOpportunities()**
- Više prilika u Top Opps tabu
- Sortiraj po potencijalnom returnu (highest first)

### 2. src/pages/Dashboard.tsx

- Provera da badge koristi ispravan count (`displaySignals.length`)
- Dodati vizuelnu indikaciju koliko je high-risk prilika

---

## Očekivani rezultat

| Metrika | Pre | Posle |
|---------|-----|-------|
| Funding Arb prilike | 100 | 200 |
| Price Arb prilike | 80 | 150 |
| Top Opportunities | 25 | 50 |
| % High-Risk parova | ~35% | **70%** |
| Max funding spread | 0.90% | **1.30%** |
| Max price spread | 8% | **12%** |
| Meme coin prioritet | Random | **Favorizovani** |

---

## Upozorenje korisnicima

Sve ovo su **simulirani podaci** sa naglašeno visokim spread-ovima. U realnosti:
- Meme coins mogu imati još veće spread-ove ALI i veći slippage
- Likvidnost je problem - velike pozicije nije moguće otvoriti
- Rizik od rug pull-a i 90%+ pada

Ovo će biti jasno naglašeno kroz postojeće `HighRiskWarning` komponente i upozorenja.
