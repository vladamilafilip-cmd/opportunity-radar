import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaperPosition, PaperTrade, TradingStats } from '@/types';
import { generatePaperPositions, generatePaperTrades, generateTradingStats } from '@/lib/mockData';

interface TradingStore {
  positions: PaperPosition[];
  trades: PaperTrade[];
  stats: TradingStats;
  isLoading: boolean;
  openPosition: (data: {
    symbol: string;
    longExchange: string;
    shortExchange: string;
    size: number;
  }) => Promise<void>;
  closePosition: (positionId: string) => Promise<void>;
  closeAllPositions: () => Promise<void>;
  refreshPositions: () => void;
  accumulateProfit: (positionId: string) => void;
  takeProfitPartial: (positionId: string) => void;
  accumulateAll: () => void;
  takeProfitAll: () => void;
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      positions: generatePaperPositions(),
      trades: generatePaperTrades(),
      stats: generateTradingStats(),
      isLoading: false,

      openPosition: async (data) => {
        set({ isLoading: true });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const basePrice = data.symbol.includes('BTC') ? 65000 : 
                         data.symbol.includes('ETH') ? 3500 : 100;
        
        const newPosition: PaperPosition = {
          id: `pos-${Date.now()}`,
          symbol: data.symbol,
          longExchange: data.longExchange,
          shortExchange: data.shortExchange,
          entryPrice: basePrice,
          currentPrice: basePrice,
          size: data.size,
          unrealizedPnl: 0,
          unrealizedPnlPercent: 0,
          openedAt: new Date().toISOString(),
          status: 'open',
        };
        
        set(state => ({
          positions: [newPosition, ...state.positions],
          isLoading: false,
        }));
      },

      closePosition: async (positionId: string) => {
        set({ isLoading: true });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const position = get().positions.find(p => p.id === positionId);
        
        if (position) {
          const closedTrade: PaperTrade = {
            id: `trade-${Date.now()}`,
            symbol: position.symbol,
            longExchange: position.longExchange,
            shortExchange: position.shortExchange,
            entryPrice: position.entryPrice,
            exitPrice: position.currentPrice,
            size: position.size,
            realizedPnl: position.unrealizedPnl,
            realizedPnlPercent: position.unrealizedPnlPercent,
            openedAt: position.openedAt,
            closedAt: new Date().toISOString(),
          };
          
          set(state => ({
            positions: state.positions.filter(p => p.id !== positionId),
            trades: [closedTrade, ...state.trades],
            stats: {
              ...state.stats,
              totalTrades: state.stats.totalTrades + 1,
              totalPnl: state.stats.totalPnl + closedTrade.realizedPnl,
            },
            isLoading: false,
          }));
        }
      },

      closeAllPositions: async () => {
        set({ isLoading: true });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const openPositions = get().positions.filter(p => p.status === 'open');
        
        if (openPositions.length === 0) {
          set({ isLoading: false });
          return;
        }
        
        const closedTrades: PaperTrade[] = openPositions.map(position => ({
          id: `trade-${Date.now()}-${position.id}`,
          symbol: position.symbol,
          longExchange: position.longExchange,
          shortExchange: position.shortExchange,
          entryPrice: position.entryPrice,
          exitPrice: position.currentPrice,
          size: position.size,
          realizedPnl: position.unrealizedPnl,
          realizedPnlPercent: position.unrealizedPnlPercent,
          openedAt: position.openedAt,
          closedAt: new Date().toISOString(),
        }));
        
        const totalPnlFromClosed = closedTrades.reduce((sum, t) => sum + t.realizedPnl, 0);
        
        set(state => ({
          positions: state.positions.filter(p => p.status !== 'open'),
          trades: [...closedTrades, ...state.trades],
          stats: {
            ...state.stats,
            totalTrades: state.stats.totalTrades + closedTrades.length,
            totalPnl: state.stats.totalPnl + totalPnlFromClosed,
          },
          isLoading: false,
        }));
      },

      refreshPositions: () => {
        // Simulate price updates
        set(state => ({
          positions: state.positions.map(pos => {
            const priceChange = (Math.random() - 0.5) * 0.02;
            const newPrice = pos.currentPrice * (1 + priceChange);
            const pnl = ((newPrice - pos.entryPrice) / pos.entryPrice) * pos.size;
            const pnlPercent = ((newPrice - pos.entryPrice) / pos.entryPrice) * 100;
            
            return {
              ...pos,
              currentPrice: newPrice,
              unrealizedPnl: pnl,
              unrealizedPnlPercent: pnlPercent,
            };
          }),
        }));
      },

      accumulateProfit: (positionId: string) => {
        const position = get().positions.find(p => p.id === positionId);
        if (position && position.unrealizedPnl > 0) {
          const profit = position.unrealizedPnl;
          set(state => ({
            positions: state.positions.map(p => 
              p.id === positionId 
                ? {
                    ...p,
                    size: p.size + profit,
                    unrealizedPnl: 0,
                    unrealizedPnlPercent: 0,
                    entryPrice: p.currentPrice,
                  }
                : p
            ),
            stats: {
              ...state.stats,
              totalPnl: state.stats.totalPnl + profit,
            }
          }));
        }
      },

      takeProfitPartial: (positionId: string) => {
        const position = get().positions.find(p => p.id === positionId);
        if (position && position.unrealizedPnl > 0) {
          const profit = position.unrealizedPnl;
          set(state => ({
            positions: state.positions.map(p => 
              p.id === positionId 
                ? {
                    ...p,
                    unrealizedPnl: 0,
                    unrealizedPnlPercent: 0,
                    entryPrice: p.currentPrice,
                  }
                : p
            ),
            stats: {
              ...state.stats,
              totalPnl: state.stats.totalPnl + profit,
            }
          }));
        }
      },

      accumulateAll: () => {
        const profitablePositions = get().positions.filter(p => p.unrealizedPnl > 0);
        if (profitablePositions.length === 0) return;
        
        const totalProfit = profitablePositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
        
        set(state => ({
          positions: state.positions.map(p => 
            p.unrealizedPnl > 0
              ? {
                  ...p,
                  size: p.size + p.unrealizedPnl,
                  unrealizedPnl: 0,
                  unrealizedPnlPercent: 0,
                  entryPrice: p.currentPrice,
                }
              : p
          ),
          stats: {
            ...state.stats,
            totalPnl: state.stats.totalPnl + totalProfit,
          }
        }));
      },

      takeProfitAll: () => {
        const profitablePositions = get().positions.filter(p => p.unrealizedPnl > 0);
        if (profitablePositions.length === 0) return;
        
        const totalProfit = profitablePositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
        
        set(state => ({
          positions: state.positions.map(p => 
            p.unrealizedPnl > 0
              ? {
                  ...p,
                  unrealizedPnl: 0,
                  unrealizedPnlPercent: 0,
                  entryPrice: p.currentPrice,
                }
              : p
          ),
          stats: {
            ...state.stats,
            totalPnl: state.stats.totalPnl + totalProfit,
          }
        }));
      },
    }),
    {
      name: 'diadonum-trading',
    }
  )
);
