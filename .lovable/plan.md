
# Plan: Povećaj Logo i Natpis u Header-u

## Pregled
Uklanjanje duplog logoa i povećanje jednog logoa sa natpisom "Diadonum" u header-u.

---

## Promene

### Trenutno stanje (linije 224-241)
Duplirani logo elementi:
```tsx
<div className="flex items-center gap-4">
  <div className="flex items-center gap-2">
    <img className="h-9 w-9 rounded-lg object-cover"/>
    <span className="text-lg font-bold">Diadonum</span>
  </div>
  <div className="flex items-center gap-2">
    <img className="h-9 w-9 rounded-lg object-cover"/>
    <span className="text-lg font-bold">Diadonum</span>
  </div>
</div>
```

### Novo stanje
Jedan veći logo i veći tekst:
```tsx
<div className="flex items-center gap-3">
  <img 
    src="/favicon.jpg" 
    alt="Diadonum" 
    className="h-12 w-12 rounded-lg object-cover"
  />
  <span className="text-2xl font-bold hidden sm:inline">Diadonum</span>
</div>
```

---

## Veličine

| Element | Bilo | Biće |
|---------|------|------|
| Logo slika | h-9 w-9 (36px) | h-12 w-12 (48px) |
| Tekst | text-lg (~18px) | text-2xl (~24px) |

---

## Vizualni prikaz

```text
BILO:
[Logo 36px] Diadonum  [Logo 36px] Diadonum   [controls...]

BIĆE:
[Logo 48px] DIADONUM                          [controls...]
     ↑          ↑
   veći      veći tekst
```

---

## Fajl za izmenu

| Fajl | Izmena |
|------|--------|
| `src/pages/Dashboard.tsx` | Zameniti dupli logo jednim većim (linije 224-241) |
