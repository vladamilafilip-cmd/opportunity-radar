
# Interaktivni Demo Tour + Pravna Zastita

## Pregled

Implementacija interaktivnog onboarding tour-a za nove korisnike koji demonstrira vrednost platforme, uz kompletnu pravnu dokumentaciju koja stiti vlasnika od potencijalnih tuzbi.

---

## Deo 1: Interaktivni Tour (react-joyride)

### Komponente koje treba kreirati:

1. **src/components/ProductTour.tsx** - Glavna tour komponenta
   - Koristi `react-joyride` biblioteku (najpopularnija za React)
   - Definise korake kroz kljucne feature-e
   - Pamti u localStorage da li je korisnik vec zavrsio tour
   - Skip/Next/Previous dugmad

2. **src/hooks/useTour.ts** - Custom hook za upravljanje tour stanjem
   - `hasSeenTour` - da li je korisnik video tour
   - `startTour()` - pokrece tour
   - `completeTour()` - oznacava kao zavrsen

### Tour Koraci (8 koraka):

| Korak | Target Element | Sadrzaj |
|-------|---------------|---------|
| 1 | Dobrodosli | "Dobrodosli u Diadonum! Ova platforma vam pomaze da pronadjete arbitrazne prilike na kripto trzistima." |
| 2 | Profit Calculator | "Izracunajte potencijalnu zaradu na osnovu vase investicije i perioda." |
| 3 | Funding Tab | "Funding Rates tab prikazuje trenutne stope finansiranja na svim berzama." |
| 4 | Funding Arb Tab | "Ovde mozete videti mogucnosti za funding arbitrazu - long na jednoj berzi, short na drugoj." |
| 5 | Price Arb Tab | "Price Arbitrage prikazuje cenovne razlike izmedju berzi." |
| 6 | Risk Badge | "Svaka prilika je ocenjena po riziku: Safe, Medium ili High." |
| 7 | Paper Trading | "Testirajte strategije sa virtualnim novcem pre nego sto rizikujete pravi kapital." |
| 8 | Disclaimer | "VAZNO: Ovo nije finansijski savet. Trgovanje kriptovalutama nosi znacajan rizik gubitka." |

### Stilizacija:
- Spotlight efekat na aktivni element
- Animirani overlay
- Progress indicator
- Mobilno responzivan

---

## Deo 2: Pravna Zastita

### Stranice koje treba kreirati:

1. **src/pages/TermsOfService.tsx** - Uslovi koriscenja
2. **src/pages/PrivacyPolicy.tsx** - Politika privatnosti  
3. **src/pages/RiskDisclosure.tsx** - Detaljna izjava o riziku
4. **src/pages/Disclaimer.tsx** - Opsta izjava o odricanju odgovornosti

### Sadrzaj pravnih dokumenata:

#### Terms of Service (kljucne tacke):
- Platforma pruza samo INFORMACIJE, ne finansijski savet
- Korisnik je u potpunosti odgovoran za svoje trgovinske odluke
- Paper trading je simulacija i ne garantuje rezultate
- Zabrana koriscenja za maloletnike
- Geografska ogranicenja (neke jurisdikcije zabranjuju kripto)
- Pravo na suspenziju naloga
- Ogranicenje odgovornosti (limitation of liability)
- Klauzula o arbitrazi sporova

#### Privacy Policy:
- Koje podatke prikupljamo (email, ime, trading istorija)
- Kako koristimo podatke
- Cookies i analytics
- Prava korisnika (GDPR compliance)
- Kontakt za brisanje podataka

#### Risk Disclosure:
- Kripto trziste je ekstremno volatilno
- Mogucnost gubitka celokupnog kapitala
- Leverage moze uvecati gubitke
- Proslost nije garancija buducnosti
- Nisu svi signali tacni
- Tehnicke greske mogu prouzrokovati gubitke
- Regulatorna neizvesnost

### Izmene u postojecim komponentama:

1. **Register.tsx** - Dodaj checkbox:
   ```
   [ ] Procitao sam i prihvatam Uslove Koriscenja i Politiku Privatnosti.
       Razumem da ovo nije finansijski savet i da trgovanje nosi rizik gubitka.
   ```

2. **Landing.tsx** - Footer linkovi:
   - Terms of Service | Privacy Policy | Risk Disclosure

3. **Dashboard.tsx** - Poboljsan DisclaimerBanner:
   - Link na detaljan Risk Disclosure

4. **DisclaimerBanner.tsx** - Opsirnije upozorenje sa linkom

---

## Deo 3: Tehnicka Implementacija

### Nova zavisnost:
```bash
npm install react-joyride
```

### Nove rute u App.tsx:
```typescript
<Route path="/terms" element={<TermsOfService />} />
<Route path="/privacy" element={<PrivacyPolicy />} />
<Route path="/risk-disclosure" element={<RiskDisclosure />} />
<Route path="/disclaimer" element={<Disclaimer />} />
```

### Struktura fajlova:
```text
src/
  components/
    ProductTour.tsx (NOVO)
    DisclaimerBanner.tsx (IZMENA - dodat link)
  hooks/
    useTour.ts (NOVO)
  pages/
    TermsOfService.tsx (NOVO)
    PrivacyPolicy.tsx (NOVO)
    RiskDisclosure.tsx (NOVO)
    Disclaimer.tsx (NOVO)
    Register.tsx (IZMENA - checkbox)
    Landing.tsx (IZMENA - footer linkovi)
    Dashboard.tsx (IZMENA - ProductTour integracija)
  App.tsx (IZMENA - nove rute)
```

---

## Deo 4: Zasto Ovo Stiti od Tuzbi

### Kljucni pravni principi:

1. **Informed Consent (Informisani pristanak)**
   - Korisnik MORA da cekira da razume rizike pre registracije
   - Ne moze tvrditi da nije znao

2. **Educational Purpose (Obrazovna svrha)**
   - Eksplicitno navedeno da je platforma za informativne svrhe
   - Nije registrovani finansijski savetnik

3. **No Guarantees (Bez garancija)**
   - Nigde ne obecavamo profit
   - "Past performance does not guarantee future results"

4. **User Responsibility (Odgovornost korisnika)**
   - Korisnik donosi odluke samostalno
   - Platforma samo prikazuje javno dostupne podatke

5. **Limitation of Liability (Ogranicenje odgovornosti)**
   - Maksimalna odgovornost = placena pretplata
   - Iskljucenje odgovornosti za indirektne gubitke

---

## Zasto je ovo bolje od video demo-a

| Video Demo | Interaktivni Tour |
|------------|-------------------|
| Statican, brzo zastari | Uvek aktuelan |
| Zahteva hosting (YouTube) | Radi lokalno |
| Korisnik moze preskociti | Step-by-step obavezivanje |
| Nema personalizacije | Kontekstualno |
| Nema pravne integracije | Zavrsava na disclaimer-u |

---

## Redosled Implementacije

1. Instalacija react-joyride
2. Kreiranje pravnih stranica (Terms, Privacy, Risk)
3. ProductTour komponenta
4. Integracija u Dashboard
5. Checkbox na registraciji
6. Footer linkovi na Landing
7. Testiranje celog flow-a

---

## Napomena

Iako ova implementacija pruza solidnu pravnu osnovu, za potpunu sigurnost preporucujem konsultaciju sa advokatom specijalizovanim za:
- FinTech regulativu
- GDPR compliance
- Kripto regulativu u tvojoj jurisdikciji
