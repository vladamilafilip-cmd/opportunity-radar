# Diadonum - Crypto Funding Arbitrage Platform

A comprehensive crypto funding rate arbitrage discovery and paper trading platform built with React, TypeScript, and Supabase.

## Features

- **Funding Rate Scanner**: Real-time funding rate monitoring across major exchanges
- **Arbitrage Detection**: Automatic identification of cross-exchange funding arbitrage opportunities
- **Paper Trading**: Risk-free position simulation with realistic PnL tracking
- **Autopilot System**: Local-first automated paper trading with configurable risk management
- **Risk Management**: Bucket allocation, kill switch, and exposure limits

## Quick Start

### Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Autopilot Worker (Local Node.js)

```bash
cd worker
npm install
npm run dev
```

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        DIADONUM                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │  React UI    │────│   Zustand    │────│   Supabase   │         │
│  │  Dashboard   │    │   Stores     │    │   Cloud/DB   │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                 │                  │
│  ┌──────────────────────────────────────────────┴───────────────┐ │
│  │                    LOCAL WORKER (Node.js)                     │ │
│  │  Opportunity Engine → Position Manager → Risk Manager         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Configuration

All autopilot settings are in `config/autopilot.ts`:

| Setting | Default | Description |
|---------|---------|-------------|
| `capital.totalEur` | 200 | Total capital in EUR |
| `capital.maxRiskPercent` | 10 | Max risk (10% = €20) |
| `capital.positionSizeEur` | 10 | Fixed position size |
| `worker.scanIntervalSeconds` | 60 | Scan frequency |

### Bucket Allocation

| Tier | Allocation | Max Positions |
|------|------------|---------------|
| SAFE | 70% | 14 |
| MEDIUM | 20% | 4 |
| HIGH | 10% | 2 |

### Profit Thresholds

| Risk Tier | Min Profit | Max Spread |
|-----------|------------|------------|
| SAFE | 15 bps | 10 bps |
| MEDIUM | 25 bps | 20 bps |
| HIGH | 50 bps | 50 bps |

## Autopilot System

The autopilot runs locally and manages paper trading positions automatically:

1. **Scans** for opportunities every 60 seconds
2. **Ranks** opportunities by score (profit × liquidity × stability)
3. **Opens** positions within risk budget and bucket limits
4. **Monitors** PnL and simulates funding collection
5. **Closes** positions based on exit rules (time, drift, profit threshold)

### Exit Rules

- Min holding: 1 funding interval (8h)
- Max holding: 24 hours
- PnL drift > 2% (delta-neutral breakdown)
- Profit falls below 0.05%

### Kill Switch

Automatically triggers when:
- Daily drawdown exceeds €20
- Stress test shows potential losses beyond limit

Requires manual reset via UI.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **State**: Zustand, TanStack Query
- **UI**: shadcn/ui, Lucide icons
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Worker**: Node.js, tsx

## Project Structure

```
├── config/
│   └── autopilot.ts          # Autopilot configuration
├── src/
│   ├── components/
│   │   ├── autopilot/        # Autopilot UI components
│   │   └── ui/               # shadcn/ui components
│   ├── pages/                # Route pages
│   ├── store/                # Zustand stores
│   └── types/                # TypeScript types
├── worker/
│   └── src/
│       ├── engine/           # Core logic
│       └── utils/            # Utilities
└── supabase/
    └── functions/            # Edge functions
```

## File Overview

### Key Files Created

| File | Purpose |
|------|---------|
| `config/autopilot.ts` | Single source of truth for all autopilot settings |
| `worker/src/index.ts` | Worker entry point with scheduler loop |
| `worker/src/engine/formulas.ts` | All profit/risk calculation formulas |
| `worker/src/engine/opportunityEngine.ts` | Market scanning and ranking |
| `worker/src/engine/positionManager.ts` | Position lifecycle management |
| `worker/src/engine/riskManager.ts` | Risk controls and kill switch |
| `src/store/autopilotStore.ts` | Zustand store for autopilot state |
| `src/components/autopilot/AutopilotPanel.tsx` | Main control panel UI |
| `src/components/autopilot/ExplainDrawer.tsx` | Trade explanation modal |

## Security

- All sensitive operations use service role key (worker only)
- RLS policies protect user data
- Paper trading mode prevents real trades
- Kill switch prevents runaway losses

## Disclaimer

This is a paper trading simulation tool for educational purposes.
It does not execute real trades or manage real funds.
Always do your own research before trading cryptocurrencies.

## License

MIT
