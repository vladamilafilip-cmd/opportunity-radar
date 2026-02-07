
## Cilj
Zaustaviti `EXECUTOR_ERROR` i omogućiti da bot stvarno otvara pozicije kada pronađe Binance/OKX/Bybit priliku.

## Šta se trenutno dešava (uzrok)
U logovima se pojavljuje greška:
- `invalid input syntax for type integer: "44.3916"`

To se poklapa sa trenutnim kodom u `autopilot-executor`, gde se u `autopilot_positions.entry_score` (koji je u bazi **integer**) upisuje `best.opportunity_score` (koji je u bazi **numeric** i često je decimalan, npr. `44.3916`). Zbog toga insert pada, a u UI vidiš `EXECUTOR_ERROR`.

Dodatno: `entry_funding_spread_8h` se trenutno upisuje kao `spreadBps / 10000`, ali ostatak UI/store logike (PositionsCard + simulatePnl) očekuje da je to **bps** vrednost (npr. `14.78` bps), ne frakcija.

## Implementacione promene (kodeks)
### 1) Popravka tipa za `entry_score` (obavezno)
U `supabase/functions/autopilot-executor/index.ts`:
- promeniti:
  - `entry_score: best.opportunity_score || 80`
- u:
  - `entry_score: Math.round(Number(best.opportunity_score ?? 80))`

Time garantujemo da u integer kolonu nikad ne ide decimalna vrednost.

### 2) Ispravka jedinice za `entry_funding_spread_8h` (preporučeno da se PnL i prikaz slažu)
Trenutno:
- `entry_funding_spread_8h: spreadBps / 10000`

Predlog:
- `entry_funding_spread_8h: Number(spreadBps)`

Obrazloženje:
- `spreadBps` dolazi iz `arbitrage_opportunities.net_edge_8h_bps` i već je u bps.
- UI prikazuje spread kao `(entry_funding_spread_8h / 100)%` i store simulacija radi `entry_funding_spread_8h / 100` -> percent, što je konzistentno samo ako čuvamo bps.

### 3) Stabilizacija tipova za insert (malo “hardening”)
U istom `positionData` objektu:
- `intervals_collected: 0` (ostaje, ali osigurati da je integer)
- `leverage: 1` (numeric u bazi, ok)
- `risk_tier` osigurati string fallback (već postoji)

### 4) Poboljšati error logging (da se sledeći put odmah vidi koji field puca)
U `catch` bloku:
- uz `error.message` dodati i `details` sa ključnim vrednostima koje pokušavamo da upišemo (npr. `symbol`, `spreadBps`, `opportunity_score`, izračunati `entry_score`), da Activity Log bude dijagnostički koristan.

## (Opcionalno) Uklanjanje React warning-a za `Badge` ref
U konzoli postoji:
- “Function components cannot be given refs… Check the render method of OpportunitiesTable… at Badge”

Plan:
- otvoriti `src/components/ui/badge.tsx` i proveriti da li je komponenta definisana preko `React.forwardRef`.
- ako nije, prebaciti je na `forwardRef` (shadcn pattern), tako da Radix/komponente koje prosleđuju ref ne prave warning.

Ovo nije blocker za otvaranje pozicija, ali čisti konzolu i sprečava buduće UI probleme.

## Validacija (šta očekujemo posle izmene)
1) U Activity Log više ne bi trebalo da se pojavljuje `EXECUTOR_ERROR` sa integer porukom.
2) Na sledećem cron ciklusu (1 min) executor treba da uspešno ubaci novi red u `autopilot_positions` kada nađe priliku.
3) U UI:
   - “Active Positions” treba da poraste,
   - a “Entry Spread” i simulirani funding PnL da izgledaju realno (jer su bps jedinice usklađene).

## Fajlovi koji će se menjati
- `supabase/functions/autopilot-executor/index.ts`
- (opciono) `src/components/ui/badge.tsx`

## Rizici / napomene
- Ovo rešava trenutno rušenje inserta (glavni razlog zašto “bot radi a ništa se ne dešava”).
- Ako i dalje nema pozicija posle ovoga, sledeći korak je proveriti da li `autopilot_state.is_running=true`, `kill_switch_active=false`, i da li query vraća `validOpps.length > 0` (što već logujemo kao “Top opportunities…”).
