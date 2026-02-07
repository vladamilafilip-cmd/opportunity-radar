
# Plan: Implementacija LIVE Trgovanja sa CCXT

## Pregled

Ovaj plan implementira pravo LIVE trgovanje integracijom CCXT biblioteke u `autopilot-executor` Edge funkciju. Trenutno sistem samo simulira pozicije u bazi - nakon implementacije, bot će izvršavati stvarne naloge na Binance i OKX berzama.

---

## Faza 1: Čuvanje API Ključeva

Pre bilo kakve implementacije, moramo bezbedno sačuvati API ključeve kao enkriptovane Cloud Secrets:

| Secret Name | Opis |
|-------------|------|
| `BINANCE_API_KEY` | Binance API ključ |
| `BINANCE_API_SECRET` | Binance tajni ključ |
| `OKX_API_KEY` | OKX API ključ |
| `OKX_API_SECRET` | OKX tajni ključ |
| `OKX_PASSPHRASE` | OKX passphrase |

---

## Faza 2: Ažuriranje autopilot-executor

### Trenutno stanje (linije 236-275)
```typescript
// 7. Open new position (paper mode - mock prices)
const mockPrice = symbol.includes('BTC') ? 95000 : ...
```

### Novo stanje sa CCXT

```text
┌──────────────────────────────────────────────────────────┐
│                  autopilot-executor                       │
├──────────────────────────────────────────────────────────┤
│  IF mode === 'live':                                      │
│    1. Dohvati API ključeve iz Secrets                     │
│    2. Inicijalizuj CCXT klijente (Binance, OKX)           │
│    3. Proveri balanse na obe berze                        │
│    4. Dohvati tržišne cene (ticker)                       │
│    5. Izvrši LONG nalog na jednoj berzi                   │
│    6. Izvrši SHORT nalog na drugoj berzi                  │
│    7. Verifikuj fill-ove i izračunaj stvarne cene         │
│    8. Sačuvaj poziciju sa pravim podacima                 │
│  ELSE (paper):                                            │
│    - Simuliraj kao do sada                                │
└──────────────────────────────────────────────────────────┘
```

### Ključne promene u kodu

1. **Import CCXT**
```typescript
import ccxt from 'npm:ccxt';
```

2. **Funkcija za inicijalizaciju berzi**
```typescript
function initializeExchanges(mode: string) {
  if (mode !== 'live') return null;
  
  const binance = new ccxt.binance({
    apiKey: Deno.env.get('BINANCE_API_KEY'),
    secret: Deno.env.get('BINANCE_API_SECRET'),
    options: { defaultType: 'future' }
  });
  
  const okx = new ccxt.okx({
    apiKey: Deno.env.get('OKX_API_KEY'),
    secret: Deno.env.get('OKX_API_SECRET'),
    password: Deno.env.get('OKX_PASSPHRASE'),
  });
  
  return { binance, okx };
}
```

3. **Funkcija za izvršavanje hedge-a**
```typescript
async function executeHedge(
  exchanges: { binance: ccxt.binance; okx: ccxt.okx },
  symbol: string,
  longExchange: string,
  shortExchange: string,
  sizeEur: number
) {
  // Dohvati cene
  const longEx = exchanges[longExchange.toLowerCase()];
  const shortEx = exchanges[shortExchange.toLowerCase()];
  
  const ticker = await longEx.fetchTicker(symbol);
  const price = ticker.last;
  const size = sizeEur / price;
  
  // Izvrši naloge istovremeno
  const [longOrder, shortOrder] = await Promise.all([
    longEx.createMarketOrder(symbol, 'buy', size),
    shortEx.createMarketOrder(symbol, 'sell', size),
  ]);
  
  return {
    longPrice: longOrder.average,
    shortPrice: shortOrder.average,
    longOrderId: longOrder.id,
    shortOrderId: shortOrder.id,
  };
}
```

---

## Faza 3: Ažuriranje autopilot-control

Dodati podršku za LIVE zatvaranje pozicija:

```typescript
if (payload.action === "close_position") {
  // Dohvati detalje pozicije
  const { data: position } = await admin
    .from("autopilot_positions")
    .select("*")
    .eq("id", payload.position_id)
    .single();
  
  if (position?.mode === 'live') {
    // Izvrši stvarne close naloge putem CCXT
    const exchanges = initializeExchanges('live');
    await closeHedge(exchanges, position);
  }
  
  // Ažuriraj status u bazi
  await admin.from("autopilot_positions").update({
    status: "closed",
    exit_ts: nowIso,
    exit_reason: payload.reason,
  }).eq("id", payload.position_id);
}
```

---

## Faza 4: UI Poboljšanja

### 4.1 Potvrda pre LIVE moda

Trenutno postoji `confirm()` dijalog - zameniću ga sa detaljnijim upozorenjem:

```typescript
// Novi LiveConfirmDialog komponenta
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>⚠️ Aktivacija LIVE Moda</AlertDialogTitle>
      <AlertDialogDescription>
        <ul>
          <li>Bot će izvršavati PRAVE naloge na Binance i OKX</li>
          <li>Vaš novac je u riziku - gubici su mogući</li>
          <li>Hedge veličina: €50 po poziciji</li>
          <li>Max gubitak: €50 dnevno (kill switch)</li>
        </ul>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Odustani</AlertDialogCancel>
      <AlertDialogAction onClick={confirmLiveMode}>
        Razumem, aktiviraj LIVE
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 4.2 Status konekcije sa berzama

Dodati indikator u header koji pokazuje da li su API ključevi konfigurisani:

```typescript
<Badge variant={hasApiKeys ? "success" : "destructive"}>
  {hasApiKeys ? "API Connected" : "No API Keys"}
</Badge>
```

---

## Bezbednosne mere

1. **API ključevi su dostupni SAMO Edge funkcijama** - nikada ne idu na klijent
2. **Double-check pre LIVE naloga** - verifikacija mode-a na više mesta
3. **Kill switch** - automatsko zaustavljanje pri €50 gubitka
4. **Audit log** - svaki nalog se loguje sa detaljima
5. **Atomski hedges** - ako jedan leg faila, drugi se poništava

---

## Fajlovi koji se menjaju

| Fajl | Promene |
|------|---------|
| `supabase/functions/autopilot-executor/index.ts` | CCXT integracija, LIVE order execution |
| `supabase/functions/autopilot-control/index.ts` | LIVE close position |
| `src/pages/FundingBot.tsx` | Poboljšani LIVE confirmation dialog |
| `src/components/bot/ModeToggle.tsx` | API status indikator |

---

## Sledeći koraci

1. **Sačuvaj API ključeve** kao Cloud Secrets
2. **Implementiraj CCXT** u autopilot-executor
3. **Testiraj u PAPER modu** da sve radi
4. **Aktiviraj LIVE** sa malim iznosom za verifikaciju

---

## Rizici i ublažavanje

| Rizik | Ublažavanje |
|-------|-------------|
| API ključ istekao | Error handling + audit log |
| Jedan leg faila | Atomski rollback - zatvori uspešni leg |
| Nedovoljan balans | Provera pre svakog trgovanja |
| Rate limiting | Retry logika sa exponential backoff |
| Cenovni drift | Max slippage tolerance (0.1%) |
