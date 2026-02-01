
# Plan: Kalkulator profita na uloženu sumu

## Opis

Dodati interaktivni kalkulator koji omogućava korisnicima da unesu uloženu sumu i vide procijenjeni profit u apsolutnim brojevima (USD/USDT) umjesto samo procenata.

## Izmjene

### 1. Dodati state za uloženu sumu

**Datoteka:** `src/pages/Dashboard.tsx`

Dodati novi state na početku komponente:
```tsx
const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
```

### 2. Kreirati Kalkulator komponentu

Dodati novu sekciju iznad tabova sa:
- Input polje za unos sume (default: $10,000)
- Label i formatiranje broja sa separatorima
- Responsive dizajn

```tsx
{/* Investment Calculator */}
<Card className="mb-6">
  <CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2 text-lg">
      <Calculator className="h-5 w-5 text-primary" />
      Kalkulator profita
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-4">
      <Label htmlFor="investment">Uložena suma:</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
        <Input
          id="investment"
          type="number"
          value={investmentAmount}
          onChange={(e) => setInvestmentAmount(Number(e.target.value))}
          className="pl-7 w-40"
          min={0}
        />
      </div>
    </div>
  </CardContent>
</Card>
```

### 3. Ažurirati tabele sa apsolutnim profitom

**Funding Arb tabela** - dodati kolonu "Est. Profit ($)":

| Kolona | Formula |
|--------|---------|
| Est. Profit ($) | `investmentAmount * (netProfit / 100)` |

**Price Arb tabela** - dodati kolonu "Est. Profit ($)":

| Kolona | Formula |
|--------|---------|
| Est. Profit ($) | `investmentAmount * (spread / 100)` |

**Top Opportunities tabela** - dodati kolonu "Est. Profit ($)":

| Kolona | Formula |
|--------|---------|
| Est. Profit ($) | `investmentAmount * (estimatedProfit / 100)` |

### 4. Format funkcija za prikaz

Kreirati helper funkciju za formatiranje profita:
```tsx
const formatProfit = (percent: number): string => {
  const profit = investmentAmount * (percent / 100);
  return profit >= 0 
    ? `+$${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-$${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
```

### 5. Dodati import za ikonu i komponente

```tsx
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
```

## Prikaz u tabelama

**Prije:**
| Net Profit |
|------------|
| +0.0234% |

**Poslije:**
| Net Profit | Est. Profit ($) |
|------------|-----------------|
| +0.0234% | +$2.34 |

## Lokacije izmjena

| Element | Lokacija | Promjena |
|---------|----------|----------|
| State | Linija ~48 | Dodati `investmentAmount` state |
| Import | Linija 21-34 | Dodati `Calculator` ikonu |
| Import | Linija 1-14 | Dodati `Input`, `Label` |
| Kalkulator UI | Prije tabova (~259) | Nova Card komponenta |
| Funding Arb | Linije 364-396 | Dodati Est. Profit kolonu |
| Price Arb | Linije 424-448 | Dodati Est. Profit kolonu |
| Top Opps | Linije 476-509 | Ažurirati Est. Profit prikaz |

## Primjer izlaza

Za uloženu sumu od $10,000 i Net Profit od 0.0234%:

```
Est. Profit ($): +$2.34
```

Za uloženu sumu od $50,000 i Net Profit od 0.15%:

```
Est. Profit ($): +$75.00
```
