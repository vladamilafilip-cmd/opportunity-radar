
# Plan: Watermark Logo + Favicon Usklađivanje

## Pregled
Dodavanje Diadonum logoa kao suptilan watermark u pozadinu Dashboard stranice, plus ažuriranje favicon elemenata da budu konzistentni sa favicon.jpg stilom.

---

## Deo 1: Watermark Logo u Pozadini

### Gde se dodaje
Pozadina glavnog sadržaja Dashboard-a (ispod svih ostalih elemenata)

### Vizuelni stil
- Veliki logo (otprilike 300-400px)
- Vrlo niska prozirnost (5-10%) da bude suptilan
- Fiksiran u centru ili donjem desnom uglu
- Ne ometa čitljivost sadržaja
- Uključuje favicon.jpg i tekst "Diadonum"

### Tehnicka implementacija

```tsx
// Dodati u Dashboard.tsx kao pozadinski element
<div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
  <div className="opacity-[0.05] flex flex-col items-center gap-4">
    <img 
      src="/favicon.jpg" 
      alt="" 
      className="w-64 h-64 rounded-3xl object-cover"
    />
    <span className="text-6xl font-bold tracking-wider">DIADONUM</span>
  </div>
</div>
```

---

## Deo 2: Favicon Konzistentnost

### Trenutno stanje
- `public/favicon.jpg` - glavni logo (koristi se)
- `public/favicon.ico` - stari format
- `public/icons/icon-512.svg` - SVG ikona sa drugačijim dizajnom (krugovi + linija)
- `index.html` - referencira `/favicon.jpg`

### Promene
1. **index.html** - već koristi favicon.jpg, ostaje isto
2. **manifest.json** - ažurirati da koristi favicon.jpg umesto PNG ikona (ili ostaviti jer PWA radi)
3. **Opciono**: Generisati PNG ikone od favicon.jpg za PWA (72, 96, 128, 144, 152, 192, 384, 512px)

### Preporuka
Posto favicon.jpg već funkcioniše i koristi se, predlažem da manifest.json ažuriramo da koristi favicon.jpg direktno umesto nepostojećih PNG fajlova.

---

## Fajlovi za izmenu

| Fajl | Izmena |
|------|--------|
| `src/pages/Dashboard.tsx` | Dodati watermark element u pozadini |
| `public/manifest.json` | Opciono: ažurirati ikone da koriste favicon.jpg |

---

## Vizualni prikaz

```text
+----------------------------------------------------------+
|  [Logo] Diadonum           [Live Data] [Refresh] [User]  |
+----------------------------------------------------------+
|                                                           |
|  Risk Disclaimer banner (plava boja)                     |
|                                                           |
|  +-- Kalkulator profita --+                              |
|  |  ...                    |     ╭─────────────╮         |
|  +-------------------------+     │             │         |
|                                  │  [favicon]  │ ← 5%    |
|  [Tabs: Funding | Arb | ...]     │             │  opacity|
|                                  │  DIADONUM   │         |
|  Tabele sa podacima...           │             │         |
|                                  ╰─────────────╯         |
+----------------------------------------------------------+
```

---

## Tehnička napomena

- Watermark koristi `pointer-events-none` tako da ne blokira klikove
- `z-0` osigurava da je iza svog sadržaja (header ima `z-50`)
- Vrlo niska prozirnost (5%) čini ga jedva vidljivim ali prisutnim
