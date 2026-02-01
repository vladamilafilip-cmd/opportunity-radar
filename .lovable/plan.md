
# Plan: Translate Serbian Text to English

## Overview
Translate all Serbian text in the application to English for consistency and broader accessibility.

---

## Files to Modify

### 1. `src/pages/Dashboard.tsx`
Profit calculator and leverage warnings:

| Line | Serbian | English |
|------|---------|---------|
| 316 | Kalkulator profita | Profit Calculator |
| 322 | Uložena suma: | Investment Amount: |
| 342 | 1 dan (3x) | 1 day (3x) |
| 343 | 7 dana (21x) | 7 days (21x) |
| 344 | 30 dana (90x) | 30 days (90x) |
| 369 | Visok leverage povećava rizik likvidacije | High leverage increases liquidation risk |
| 375 | Procjena profita: | Profit Estimate: |

### 2. `src/components/UserDataBanner.tsx`
Loading and error states:

| Line | Serbian | English |
|------|---------|---------|
| 25 | Učitavanje profila... | Loading profile... |
| 27 | Vaš nalog se inicijalizuje. Molimo sačekajte. | Your account is being initialized. Please wait. |
| 38 | Problem sa učitavanjem profila | Problem loading profile |
| 41-43 | Prijava je uspešna, ali podaci o profilu nisu dostupni. Možete nastaviti sa korišćenjem aplikacije ili pokušati ponovo. | Login successful, but profile data is not available. You can continue using the application or try again. |
| 51 | Pokušaj ponovo | Try again |

---

## Summary

**Total translations**: 12 text strings across 2 files

All other pages (Landing, Login, Register, Settings, etc.) are already in English.
