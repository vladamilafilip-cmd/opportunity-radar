

# Plan: Omogućavanje Funding Arb i Price Arb tabova

## Analiza problema

"Funding Arb" i "Price Arb" tabovi na Dashboard-u su trenutno **onemogućeni** za korisnike sa Free planom.

**Logika u kodu:**
- Linija 138: `const isPro = user?.plan !== 'free'` - provjerava da li korisnik ima plaćeni plan
- Linije 267 i 271: `disabled={!isPro}` - onemogućuje tabove ako korisnik nema Pro plan

**Stanje u bazi:**
- Korisnik trenutno ima **Free** plan i **active** subscription

## Predloženo rješenje

Ukloniti Pro ograničenje sa tabova kako bi svi korisnici mogli pristupiti Funding Arb i Price Arb funkcionalnostima.

## Koraci implementacije

### 1. Ukloniti `disabled` atribute sa tabova

**Datoteka:** `src/pages/Dashboard.tsx`

**Izmjena linija 267-274:**
```tsx
// Prije:
<TabsTrigger value="funding-arb" className="gap-2" disabled={!isPro}>
  ...
</TabsTrigger>
<TabsTrigger value="price-arb" className="gap-2" disabled={!isPro}>
  ...
</TabsTrigger>

// Poslije:
<TabsTrigger value="funding-arb" className="gap-2">
  ...
</TabsTrigger>
<TabsTrigger value="price-arb" className="gap-2">
  ...
</TabsTrigger>
```

### 2. Ukloniti LockedFeature provjere

**Izmjena linija 340-341 i 408-410:**

Zamijeniti provjere `{!isPro ? (<LockedFeature ... />) : (...)}` sa direktnim prikazom sadržaja bez Pro ograničenja.

### 3. (Opcionalno) Ukloniti `isPro` varijablu

Ako se više ne koristi nigdje drugdje, ukloniti liniju 138.

## Tehnički detalji

| Element | Lokacija | Promjena |
|---------|----------|----------|
| TabsTrigger "funding-arb" | Linija 267 | Ukloniti `disabled={!isPro}` |
| TabsTrigger "price-arb" | Linija 271 | Ukloniti `disabled={!isPro}` |
| LockedFeature check | Linija 340 | Ukloniti conditional |
| LockedFeature check | Linija 408 | Ukloniti conditional |

## Alternativa

Ako želite zadržati Pro ograničenje, mogu umjesto toga nadograditi korisnikov plan u bazi:

```sql
UPDATE subscriptions 
SET plan_id = (SELECT id FROM plans WHERE tier = 'pro')
WHERE user_id = '8277cd95-8ebe-4bf4-9023-697d575c0563';
```

