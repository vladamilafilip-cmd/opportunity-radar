
# Auth System Fix - IMPLEMENTIRANO ✅

## Izvršene promene

### Backend (Migracija)
1. ✅ Kreirana `bootstrap_user()` SECURITY DEFINER funkcija za self-healing korisničkih podataka
2. ✅ Ažuriran `handle_new_user()` trigger da bude idempotent (ON CONFLICT DO NOTHING)
3. ✅ Dodat UNIQUE constraint na `profiles.user_id`

### Frontend

#### authStore.ts - Refaktorisano
- `isAuthenticated` = `!!session` (sesija je izvor istine)
- `user` može biti `null` čak i kad je korisnik ulogovan
- Dodato `isUserDataLoading` i `userDataError` za granularno praćenje stanja
- Bootstrap + retry logika: ako profil ne postoji, poziva `rpc('bootstrap_user')` i pokušava ponovo
- Login/register odmah setuju `isAuthenticated: true` čim postoji sesija

#### App.tsx - Routing popravljen
- `ProtectedRoute` proverava samo `isAuthenticated` (sesiju)
- `AdminRoute` čeka `isUserDataLoading` pre provere admin statusa
- Nema više login loop-a zbog missing userData

#### UserDataBanner.tsx - Novi komponent
- Prikazuje loading stanje dok se profil učitava
- Prikazuje error sa Retry dugmetom ako profil nije dostupan
- Samo se pojavljuje kada je korisnik ulogovan ali userData ima problem

## Rezultat
- ✅ Login više ne puca zbog kasnog/nedostajućeg profila
- ✅ Sesija i userData su razdvojeni
- ✅ Admin provera ostaje server-side (has_role RPC)
- ✅ Self-healing mehanizam za nove/oštećene naloge
