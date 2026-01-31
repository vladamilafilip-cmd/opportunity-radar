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
  refreshPositions: () => void;
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
    }),
    {
      name: 'iq200-trading',
    }
  )
);
