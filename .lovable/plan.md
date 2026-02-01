
Cilj: da login radi stabilno u svim slučajevima (postojeći korisnici, novi korisnici, spor backend), bez “zaglavljenog učitavanja”, bez vraćanja na /login posle uspešne prijave, i bez bezbednosnih prečica (admin se i dalje proverava isključivo kroz role tabelu / RPC).

## Šta trenutno “puca” (uzrok)
U trenutnoj implementaciji, aplikacija meša 2 različite stvari:
1) “Korisnik je prijavljen” (postoji validna sesija)
2) “Korisnički app-podaci su učitani” (profiles/plan/role)

Kod sada tretira neuspelo učitavanje `profiles` kao da prijava nije uspela, i onda ProtectedRoute vraća korisnika na `/login`. To deluje kao “kompromitovan login”, i u praksi izgleda kao loop ili kao “Signing in…” pa povratak na login.

Dodatno, `register()` se oslanja na to da trigger odmah kreira profil, pa radi `update profiles` nakon 500ms — to može da omane ako backend kasni.

## Princip rešenja
- Sesija (auth) mora biti primarni izvor istine za to da li je korisnik “ulogovan”.
- App-podaci (profile/plan/role) se učitavaju sekundarno; ako ne uspe, korisnik ostaje ulogovan, ali UI dobija jasnu poruku + automatski “self-heal” (bootstrap) pokušaj.
- Admin pristup ostaje strogo server-side preko `has_role()`; nikad iz localStorage ili iz profila.

---

## Implementacioni koraci (Frontend)

### 1) Razdvojiti “ulogovan” od “userData učitan”
U `src/store/authStore.ts`:
- Promeniti semantiku store-a tako da:
  - `isAuthenticated` = `!!session` (tj. postoji validna sesija)
  - `user` (AppUser) može biti `null` i kada je korisnik ulogovan (dok se userData ne učita ili ako učitavanje padne)
  - Dodati novo polje npr. `isUserDataLoading` i/ili `userDataError` (odvojeno od generalnog `error`), da UI može da prikaže poruku tipa “Nalog je ulogovan, ali profil nije spreman – pokušavam da popravim…”

Zašto: ovim sprečavamo redirect loop i “lažno” log-out stanje kada je realno sesija validna.

### 2) Uvesti “bootstrap” i retry mehanizam u toku login/init
U `fetchUserData(userId)`:
- Ako `profiles` ne postoji ili vraća grešku koja implicira “no rows / missing”, uraditi:
  1) pozvati `rpc('bootstrap_user')` (nova backend funkcija u sledećem odeljku)
  2) retry `profiles` + `has_role` + `get_user_plan` jednom (sa kratkim delay/backoff npr. 150–300ms)

U `initialize()` i `login()`:
- Kada dobijemo `session`, prvo setovati `session` u store (da aplikacija zna da je ulogovan),
- zatim učitati userData kroz gore opisani resilient fetch (sa bootstrap + retry),
- ako userData i dalje ne uspe, ostaviti user = null, ali NE vraćati korisnika na login; umesto toga prikazati smislen error (npr. toast + banner u Dashboard-u) i ponuditi “Try again” dugme koje poziva `refreshUserData()`.

### 3) Popraviti routing logiku da se ne oslanja na userData za osnovnu prijavu
U `src/App.tsx`:
- `ProtectedRoute` treba da proverava `session`/`isAuthenticated`, a ne da zavisi od `user !== null`.
- `AdminRoute` i dalje treba da zahteva `user?.isAdmin === true` (ako userData nije učitan, tretirati kao “nije admin” i preusmeriti na `/dashboard` ili prikazati “Checking permissions…”).

### 4) Poboljšati UX za slučajeve “ulogovan ali userData nije spreman”
- Dodati banner/alert (na `/dashboard` ili globalno) koji se pojavi kad:
  - korisnik ima sesiju, ali `user` je null ili `userDataError` postoji
- U tom banneru:
  - Poruka “Prijava je uspešna, ali nalog se još inicijalizuje. Pokušavam da popravim…”
  - Dugme “Retry” (poziva `refreshUserData()`)

---

## Implementacioni koraci (Backend / Database)

Napomena: Ne menjamo role logiku (role ostaju u `user_roles`), i ne uvodimo nikakvo čuvanje admin statusa u profilu.

### 5) Dodati SECURITY DEFINER RPC za samopopravku naloga: `bootstrap_user()`
Kroz migraciju dodati funkciju (public schema) koja radi:
- Umetne `profiles` red ako nedostaje:
  - `INSERT INTO profiles(user_id, email) VALUES (auth.uid(), auth.email()) ON CONFLICT (user_id) DO NOTHING;`
- Umetne osnovnu rolu user:
  - `INSERT INTO user_roles(user_id, role) VALUES (auth.uid(), 'user') ON CONFLICT (user_id, role) DO NOTHING;`
- Umetne default subscription ako ne postoji aktivna:
  - `IF NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = auth.uid() AND status='active') THEN INSERT ... free plan ...; END IF;`
- Umetne default portfolio ako korisnik nema nijedan:
  - `IF NOT EXISTS (SELECT 1 FROM portfolios WHERE user_id = auth.uid()) THEN INSERT ... 'Paper Trading' ...; END IF;`

Ovo je bezbedno jer:
- funkcija je callable samo za authenticated korisnika (validna sesija),
- sve se radi za `auth.uid()` (nema mogućnosti da korisnik “bootstrapuje” tuđi nalog),
- admin privilegije se ne dodeljuju ovde.

### 6) (Opcionalno ali preporučeno) Učiniti postojeći `handle_new_user` otpornijim
Ako se oslanjamo i na trigger:
- Promeniti inserte na “idempotent” (ON CONFLICT DO NOTHING) gde postoji unique constraint (profiles.user_id, user_roles(user_id,role)).
- Za subscriptions/portfolios dodati EXISTS check da se izbegne dupliranje.
- Time smanjujemo šansu da se user kreira u auth-u, ali da app tabele ostanu prazne zbog transient greške.

---

## Test plan (što ćemo proveriti posle implementacije)
1) Login sa postojećim nalogom:
   - klik Sign In → odlazak na /dashboard bez vraćanja na /login
2) Logout → Login ponovo:
   - bez “beskonačnog loadinga”
3) Novi nalog (posle registracije):
   - ako je potreban email confirmation: jasno objašnjenje, i nakon potvrde login radi
4) Namerno simulirati “missing profile” (ručno obrisati profile red u test okruženju):
   - login i dalje uspeva (sesija validna), bootstrap ga vrati nazad, dashboard proradi
5) AdminRoute:
   - običan user nikad ne dobija /admin
   - ako userData nije učitan, /admin ne propušta

---

## Tehničke napomene (za stabilnost)
- Zadržati postojeći timeout zaštitni mehanizam, ali ga vezati za sesiju i UI tako da se korisniku kaže šta se dešava (ne samo “loading…”).
- Razmotriti uklanjanje globalnog `authListenerInitialized` ili njegovo vezivanje za lifecycle (da ne blokira re-init u slučaju greške), ali bez duplih listener-a. Najčistije: čuvati subscription u store-u i odjaviti ga na reload/cleanup.

---

## Rezultat
- Korisnik više ne može da upadne u login loop zbog “missing/late profile”.
- “Ulogovan sam” i “učitani su moji podaci” su odvojeni, pa UI radi predvidljivo.
- Bezbednost ostaje očuvana: admin se i dalje proverava isključivo server-side kroz role tabelu/funkciju, bez ikakvih klijentskih prečica.
