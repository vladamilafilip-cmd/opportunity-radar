
# Plan: Ukloni Watermark + Dupliraj Logo u Header-u

## Pregled
Uklanjanje watermark elementa iz pozadine i dupliranje Diadonum logoa sa ikonom u header-u (vrh stranice).

---

## Promene

### 1. Ukloniti Watermark (linije 221-231)
Brisanje celog bloka sa watermark logom u pozadini:
```tsx
// OBRISATI OVAJ BLOK:
{/* Watermark Logo */}
<div className="fixed inset-0 pointer-events-none z-0 ...">
  ...
</div>
```

### 2. Duplirati Logo u Header-u
Trenutni header ima jedan logo + tekst. Dupliraćemo ga tako da bude:
- Logo + "Diadonum" + Logo + "Diadonum"

```tsx
// TRENUTNO (linije 235-242):
<div className="flex items-center gap-2">
  <img src="/favicon.jpg" alt="Diadonum" className="h-9 w-9 rounded-lg object-cover"/>
  <span className="text-lg font-bold hidden sm:inline">Diadonum</span>
</div>

// NOVO:
<div className="flex items-center gap-4">
  <div className="flex items-center gap-2">
    <img src="/favicon.jpg" alt="Diadonum" className="h-9 w-9 rounded-lg object-cover"/>
    <span className="text-lg font-bold hidden sm:inline">Diadonum</span>
  </div>
  <div className="flex items-center gap-2">
    <img src="/favicon.jpg" alt="Diadonum" className="h-9 w-9 rounded-lg object-cover"/>
    <span className="text-lg font-bold hidden sm:inline">Diadonum</span>
  </div>
</div>
```

---

## Vizualni prikaz

```text
BILO:
[Logo] Diadonum                    [Live Data] [Refresh] [User]

BIĆE:
[Logo] Diadonum  [Logo] Diadonum   [Live Data] [Refresh] [User]
```

---

## Fajl za izmenu

| Fajl | Izmena |
|------|--------|
| `src/pages/Dashboard.tsx` | Obrisati watermark (linije 221-231), duplirati logo u header-u (linije 235-242) |
