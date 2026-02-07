
# Plan: Bot da otvara više pozicija umesto da preskače ciklus

## Problem
Executor pronalazi 49 validnih prilika, ali proverava samo prvu. Ako već ima poziciju na tom symbolu, preskače ceo ciklus umesto da proba sledeću priliku.

## Trenutno ponašanje
```text
1. Pronađi najbolju priliku (WIF/USDT @ 14.78 bps)
2. Proveri da li već ima pozicija na WIF/USDT → DA
3. PRESKOČI ceo ciklus (ne gleda drugu priliku)
```

## Željeno ponašanje
```text
1. Pronađi top 5 prilika
2. Za svaku od njih:
   - Ako već ima pozicija na tom symbolu → preskoči i probaj sledeću
   - Ako nema → otvori poziciju i završi
3. Ako sve 5 već postoje → preskoči ciklus
```

## Tehnička implementacija

### Izmena `autopilot-executor/index.ts`

**Stara logika:**
```typescript
const best = validOpps[0];
// ... check if exists
if (existingPos) {
  return skipped: 'duplicate_symbol';
}
// ... open position
```

**Nova logika:**
```typescript
// Iterate through top opportunities until we find one we don't have
for (const opp of validOpps.slice(0, 10)) {
  const symbol = opp.symbols?.display_name;
  
  // Check if we already have position on this symbol
  const { data: existing } = await supabase
    .from('autopilot_positions')
    .select('id')
    .eq('symbol', symbol)
    .eq('status', 'open')
    .limit(1);
  
  if (existing && existing.length > 0) {
    log(`Already have position on ${symbol}, trying next...`);
    continue; // Try next opportunity
  }
  
  // Found a new opportunity - open position
  // ... insert logic
  break;
}
```

## Očekivani rezultat
- Bot će moći da otvori do 8 različitih pozicija
- Svaki ciklus će probati sledeći dostupni symbol
- Uz trenutne prilike: WIF/USDT (već), SOL/USDT (već), AVAX/USDT (nova), DOGE/USDT (nova), itd.

## Fajlovi za izmenu
- `supabase/functions/autopilot-executor/index.ts`

## Vremenski okvir
- Implementacija: ~3 minuta
- Nove pozicije: sledeći cron ciklus (~1 minut nakon deploy-a)
