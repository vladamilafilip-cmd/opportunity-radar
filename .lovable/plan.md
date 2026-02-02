
# Plan: Uklanjanje pretplata - Sve je besplatno

## Pregled

Uklanjanje celokupnog sistema pretplata i pravljenje jednog FREE plana koji ima sve funkcionalnosti. Svi korisnici dobijaju pun pristup svim alatima bez ikakvih ograničenja.

---

## Fajlovi za izmenu

### 1. src/lib/mockData.ts
**Zadatak:** Zameniti 4 plana sa jednim FREE planom koji ima SVE feature-e

**Izmene:**
- `PLAN_DETAILS` array - samo jedan plan sa svim funkcionalnostima:
  - Real-time refresh
  - Funding & Price arbitrage signali
  - Paper trading
  - 100+ trading parova (meme coins uključeni)
  - API pristup
  - Alertovi (Discord/Telegram)
  - Bez ograničenja

---

### 2. src/pages/Opportunity.tsx
**Zadatak:** Ukloniti `isPro` proveru koja blokira paper trading

**Izmene:**
- Linija 44: Ukloniti `const isPro = user?.plan !== 'free';`
- Linije 46-54: Ukloniti proveru koja vraća "PRO Required" toast
- Omogućiti svim korisnicima da otvore pozicije

---

### 3. src/pages/Billing.tsx
**Zadatak:** Pojednostaviti stranicu - prikazati samo jedan FREE plan

**Izmene:**
- Ukloniti logiku za promenu planova
- Prikazati "All Features Unlocked - Forever Free"
- Dodati listu svih dostupnih funkcionalnosti
- Ukloniti billing date i upgrade opcije

---

### 4. src/pages/Landing.tsx
**Zadatak:** Ukloniti pricing sekciju sa više planova

**Izmene:**
- Zameniti pricing grid sa jednom karticom "100% FREE"
- Lista svih besplatnih funkcionalnosti
- Jasnija poruka: "Sve funkcionalnosti su besplatne"

---

### 5. src/pages/Register.tsx
**Zadatak:** Ažurirati success poruku

**Izmene:**
- Linija 74: Promeniti "You're on the FREE plan" u "All features unlocked!"

---

### 6. src/pages/Dashboard.tsx
**Zadatak:** Ukloniti LockedFeature komponentu i plan prikaz

**Izmene:**
- Linija 278: Promeniti "{user?.plan} Plan" u "Full Access"
- Linije 703-713: Ukloniti `LockedFeature` komponentu (više nije potrebna)

---

### 7. src/pages/Admin.tsx
**Zadatak:** Ažurirati admin statistike

**Izmene:**
- Linije 111-112: Ukloniti "PRO Users" i "Free Slots" metrike
- Prikazati samo ukupan broj korisnika i aktivnih korisnika

---

## Rezime promena

| Stavka | Pre | Posle |
|--------|-----|-------|
| Broj planova | 4 (free, pro, elite, team) | 1 (FREE) |
| Paper trading | PRO only | Svi korisnici |
| Funding/Price Arb | PRO only | Svi korisnici |
| Real-time data | Elite only | Svi korisnici |
| API pristup | Team only | Svi korisnici |
| Alertovi | Elite+ | Svi korisnici |
| Broj simbola | 100+ | 100+ (nepromenjeno) |
| Meme coins | 40 dostupno | 40 dostupno (nepromenjeno) |

---

## Napomena

Baza podataka (plans tabela) ostaje nepromenjena jer frontend koristi mock data iz `mockData.ts`. Ako u budućnosti želiš da sinhronizuješ bazu, možemo ažurirati i nju.

