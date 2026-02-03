# Diadonum Worker

Local Node.js worker for the Diadonum LIVE funding arbitrage autopilot system.

## Overview

This worker runs locally on your machine and manages:
- Scanning for delta-neutral funding arbitrage opportunities
- Opening/closing atomic hedge positions (LONG + SHORT legs)
- Risk management with tiered drawdown control
- Kill switch and buffer enforcement
- Audit logging

## Modes

| Mode | Description |
|------|-------------|
| **DRY RUN** (Default) | Scans, decides, logs - but does NOT execute trades |
| **LIVE** | Executes real trades on connected exchanges |

**IMPORTANT**: Worker starts in DRY RUN mode. Enable LIVE only after thorough testing.

## Requirements

- Node.js 18+
- Access to Lovable Cloud backend
- Exchange API keys (for LIVE mode only)

## Setup

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Configure Environment

Create a `.env` file in the worker directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. API Key Setup (LIVE Mode Only)

API keys are stored locally with AES-256 encryption:

```bash
# First-time setup: Set your passphrase
npm run setup-keys

# Add exchange keys
npm run add-key binance
npm run add-key hyperliquid
# ... etc
```

Keys are stored in `~/.diadonum/keys.enc` and NEVER leave your device.

### 4. Run the Worker

DRY RUN mode (default, safe):
```bash
npm run dev
```

LIVE mode (requires API keys):
```bash
DRY_RUN=false npm run dev
```

Production:
```bash
npm start
```

## Configuration

Key settings in `config/autopilot.ts`:

| Setting | Value | Description |
|---------|-------|-------------|
| `capital.totalEur` | €200 | Total capital |
| `capital.hedgeSizeEur` | €20 | Per hedge (€10 + €10 legs) |
| `capital.bufferEur` | €40 | Always reserved |
| `capital.maxRiskEur` | €20 | Kill switch threshold |
| `worker.scanIntervalSeconds` | 60 | Scan frequency |

### Exchange Allocation

| Exchange | Allocation | Purpose |
|----------|------------|---------|
| Hyperliquid | €60 | Primary SHORT |
| Binance | €40 | Primary LONG |
| Bybit | €30 | LONG/SHORT |
| OKX | €30 | LONG/SHORT |
| dYdX | €20 | SHORT (1h funding) |
| KuCoin | €20 | LONG |

### Symbol Whitelist

**Tier 1 (Always)**: BTC, ETH, SOL, XRP, DOGE, BNB, LINK, LTC
**Tier 2 (Verified)**: ADA, AVAX, MATIC, DOT, ATOM, UNI, AAVE, ARB, OP, SUI

Meme/shitcoins are automatically blocked.

### Entry Thresholds

| Risk Tier | Min Profit | Max Spread | Min Liquidity |
|-----------|------------|------------|---------------|
| SAFE | 25 bps | 20 bps | 70 |
| MEDIUM | 35 bps | 25 bps | 50 |
| HIGH | 50 bps | 35 bps | 30 |

## Hedge Execution

Positions are opened as atomic hedges:

1. Identify funding spread ≥ 0.25%
2. Verify bid/ask ≤ 0.20% on BOTH exchanges
3. Submit LONG + SHORT orders simultaneously
4. If ANY order fails → rollback ALL
5. Verify notional match within 1%

**Never leaves a "naked leg"** - if one side fails, the other is immediately closed.

## Exit Rules

| Trigger | Condition | Action |
|---------|-----------|--------|
| Profit Target | 1 interval + ≥60% expected | Close hedge |
| Spread Collapse | Net spread < 0.05%/8h | Close hedge |
| Liquidity Issue | Bid/ask > 0.35% | Close hedge |
| PnL Drift | Delta drift > 0.6% | Close hedge |
| Data Stale | No update > 120s | **Close ALL + Pause** |
| Max Holding | 24h exceeded | Close hedge |

## Risk Management

### Tiered Drawdown

| Level | Drawdown | Action |
|-------|----------|--------|
| Normal | €0-10 | Full operation |
| Caution | €10-20 | Stop new positions |
| Kill Switch | ≥€20 | Close ALL + Stop |

### Buffer Enforcement

€40 always reserved. Max deployable: €160 (8 hedges × €20).

## Monitoring

### Logs

All actions logged to `autopilot_audit_log`:
- Hedge opens/closes
- Funding collections
- Kill switch events
- Errors

### Real-time Status

View in UI Dashboard:
- Exchange allocation status
- Active hedges
- Risk budget meter
- DRY RUN indicator

## Architecture

```
worker/
├── src/
│   ├── index.ts              # Entry point + scheduler
│   ├── supabaseClient.ts     # Database connection
│   ├── engine/
│   │   ├── formulas.ts       # Core calculations (25bps, 0.6% drift)
│   │   ├── opportunityEngine.ts  # Whitelist + filters
│   │   ├── positionManager.ts    # Atomic hedge lifecycle
│   │   └── riskManager.ts        # Tiered drawdown
│   ├── adapters/
│   │   ├── exchangeAdapter.ts    # LIVE execution (skeleton)
│   │   └── hedgeExecutor.ts      # Atomic hedge + rollback
│   ├── config/
│   │   └── exchangeBalances.ts   # Per-exchange allocation
│   └── utils/
│       ├── auditLog.ts           # Logging
│       └── apiKeyManager.ts      # Encrypted key storage
```

## Security

### API Keys
- AES-256 encrypted locally
- Passphrase required to decrypt
- Never transmitted to cloud
- Keys stay in memory only during execution

### Network
- Read-only Supabase queries for opportunities
- Write only to audit log and position tables
- Service role key required (not exposed to frontend)

## Troubleshooting

### Worker won't start
- Check `.env` has correct Supabase credentials
- Verify service role key permissions

### No opportunities found
- Check if exchanges are active in DB
- Verify symbols are in whitelist
- Lower thresholds in DRY RUN for testing

### Kill switch triggered
- Reset via UI Dashboard
- Check audit log for cause
- Verify exchange balances are sufficient

### API key errors (LIVE mode)
- Re-run `npm run setup-keys`
- Verify exchange API permissions (trade + read)
- Check API key expiration

## IMPORTANT: Production Readiness

For LIVE trading, complete these steps:

1. ✅ Test thoroughly in DRY RUN mode
2. ✅ Verify atomic hedge logic works
3. ⚠️ Implement CCXT exchange adapters
4. ⚠️ Add order verification & reconciliation
5. ⚠️ Test on exchange testnets
6. ⚠️ Security audit API key manager
7. ⚠️ Set up monitoring & alerting

**DO NOT enable LIVE mode until all steps are complete.**
