

# Plan: Pametnije filtriranje prilika za Binance/OKX/Bybit

## Problem
Bot traži prvih 500 prilika sortirano po spreadu, ali SVE prvih 500 su Bitget→OKX parovi. Tvoje Binance/OKX/Bybit prilike (WIF, AVAX) postoje ali su van tog ranga.

## Rešenje
Umesto da filtriramo na klijentu nakon fetch-a, potrebno je da baza vrati SAMO prilike za Binance/OKX/Bybit direktno u SQL upitu.

## Tehnički koraci

### 1. Izmena autopilot-executor funkcije
Promeniti upit da filtrira po exchange ID-ovima direktno u SQL-u:

```text
1. Dobiti ID-eve za Binance, OKX i Bybit iz exchanges tabele
2. Filtrirati arbitrage_opportunities gde su oba exchange-a u tom skupu
3. Ukloniti client-side filtriranje jer više nije potrebno
```

### 2. Nova logika upita
```
SQL filter: long_exchange_id IN (binance_id, okx_id, bybit_id)
       AND short_exchange_id IN (binance_id, okx_id, bybit_id)
       AND long_exchange_id != short_exchange_id
```

### 3. Očekivani rezultat
- **WIF/USDT** Bybit→Binance @ 14.78 bps → automatski entry
- **WIF/USDT** Bybit→OKX @ 11.79 bps  
- **AVAX/USDT** Bybit→Binance @ 6.05 bps

### 4. Dodatno
- Dodati logging da prikaže nađene validne prilike pre entry-a
- Deploy nove verzije funkcije

## Vremenski okvir
- Implementacija: ~5 minuta
- Prva pozicija: sledeći cron ciklus (~1 minut nakon deploy-a)

