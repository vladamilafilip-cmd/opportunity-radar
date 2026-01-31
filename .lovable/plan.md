

# 🎯 IQ200 RADAR - Demo verzija

Kompletna crypto arbitrage radar aplikacija sa simuliranim podacima za testiranje.

---

## 🏠 Landing Page & Auth

**Landing stranica** sa:
- Hero sekcija - "Find Crypto Arbitrage Opportunities"
- Features pregled (Funding Arb, Price Arb, Paper Trading)
- Pricing planovi (FREE / PRO £20 / PRO+ £50)
- Risk disclaimer banner
- Login/Register dugmad

**Auth sistem** (simuliran):
- Email + password login forma
- Registracija
- Demo korisnici za testiranje

---

## 📊 Dashboard

Glavni dashboard sa tabovima:

**Funding Tab**
- Tabela: Exchange | Symbol | Funding Rate | Next Funding | Risk Tier
- Color-coded badges (SAFE/MEDIUM/HIGH)
- Auto-refresh indikator

**Funding Arbitrage Tab**
- Long Exchange | Short Exchange | Symbol | Spread | Score
- "Open Paper Trade" dugme
- Sortiranje po score-u

**Price Arbitrage Tab**
- Buy Exchange | Sell Exchange | Spread% | Net After Fees
- Quick trade dugmad

**Opportunities Tab**
- Rangirane prilike po score-u
- Klik otvara detail stranicu

---

## 📈 Opportunity Details

Stranica za pojedinačnu priliku:
- Price chart (Recharts)
- Funding history chart
- Exchange comparison tabela
- Risk tier badge
- "Open Paper Trade" dugme

---

## 💼 Paper Trading

Simulator za trading:
- Open position forma (symbol, exchanges, USD size)
- Active positions tabela
- Unrealized P&L
- Close position dugme
- Trading history
- Performance stats

---

## 💳 Billing Page

- Trenutni plan
- Plan comparison kartica
- Upgrade/Downgrade dugmad
- Stripe placeholder (za kasnije)

---

## ⚙️ Admin Panel

- Users lista
- Subscription status
- "Mark as FREE" dugme (za prvih 50)
- Enable/Disable accounts

---

## 🎨 Dizajn

- **Dark trading theme** (Binance/TradingView stil)
- Responsive (mobile-first)
- Large tap targets za mobile
- Professional look
- Animated transitions

---

## 📱 PWA Support

- Manifest.json
- Service worker
- Offline caching
- Install prompt
- Home screen ikone

---

## 🔧 Tehnički detalji

- React + Vite + TypeScript
- TailwindCSS + shadcn/ui
- Zustand za state
- React Query (spremno za pravi API)
- Mock data service (lako zamenljiv sa pravim backend-om)
- Recharts za grafikone

