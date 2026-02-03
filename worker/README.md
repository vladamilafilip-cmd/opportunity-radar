# Diadonum Worker

Local Node.js worker for the Diadonum crypto arbitrage autopilot system.

## Overview

This worker runs locally on your machine and manages:
- Scanning for funding arbitrage opportunities
- Opening/closing paper trading positions
- Risk management and kill switch
- Audit logging

## Requirements

- Node.js 18+
- Access to a Supabase project (Cloud or Local)

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

# Or for local Supabase:
# SUPABASE_URL=http://localhost:54321
# SUPABASE_SERVICE_ROLE_KEY=your-local-service-key
```

### 3. Run the Worker

Development (with hot reload):
```bash
npm run dev
```

Production:
```bash
npm start
```

## Configuration

All configuration is in `worker/src/index.ts`. Key settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `capital.totalEur` | 200 | Total capital in EUR |
| `capital.maxRiskPercent` | 10 | Max risk (10% = €20) |
| `capital.positionSizeEur` | 10 | Fixed position size |
| `worker.scanIntervalSeconds` | 60 | Scan frequency |

### Bucket Allocation

- **SAFE**: 70% (14 positions max)
- **MEDIUM**: 20% (4 positions max)
- **HIGH**: 10% (2 positions max)

### Profit Thresholds

| Risk Tier | Min Profit | Max Spread | Min Liquidity |
|-----------|------------|------------|---------------|
| SAFE | 15 bps | 10 bps | 70 |
| MEDIUM | 25 bps | 20 bps | 50 |
| HIGH | 50 bps | 50 bps | 30 |

## Exit Rules

Positions are automatically closed when:

1. **Max holding time** (24h) exceeded
2. **Min holding period** (1 interval) passed AND:
   - PnL drift > 2% (delta-neutral breakdown)
   - Profit falls below threshold

## Kill Switch

Automatically triggers when:
- Unrealized loss exceeds max daily drawdown (€20)
- Stress test shows potential losses beyond limit

Requires manual reset via UI.

## Logs

All actions are logged to `autopilot_audit_log` table:
- Position opens/closes
- Funding collections
- Kill switch events
- Errors

## Architecture

```
worker/
├── src/
│   ├── index.ts              # Entry point + scheduler
│   ├── supabaseClient.ts     # Database connection
│   ├── engine/
│   │   ├── formulas.ts       # Core calculations
│   │   ├── opportunityEngine.ts  # Market scanning
│   │   ├── positionManager.ts    # Position lifecycle
│   │   └── riskManager.ts        # Risk controls
│   ├── adapters/
│   │   └── exchangeAdapter.ts    # LIVE skeleton (not implemented)
│   └── utils/
│       └── auditLog.ts           # Logging
```

## IMPORTANT: Paper Trading Only

This worker is configured for **PAPER TRADING ONLY**.
Live trading adapters are skeleton implementations and will NOT execute real trades.

To enable live trading (NOT RECOMMENDED without thorough testing):
1. Implement exchange adapters in `adapters/`
2. Add encrypted API key storage
3. Implement order verification and reconciliation
4. Add passphrase-protected mode switching
