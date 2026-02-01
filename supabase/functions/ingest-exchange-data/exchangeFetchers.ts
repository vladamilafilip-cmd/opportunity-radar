/**
 * IQ200 TIER SYSTEM - EXCHANGE BATCH FETCHERS
 * 
 * Each exchange has ONE batch API call that returns ALL pairs.
 * This minimizes rate limit usage and prevents banning.
 */

// ============================================
// TYPES
// ============================================

export interface FundingData {
  symbol: string;
  fundingRate: number;
  nextFundingTs: string | null;
  markPrice: number;
}

export interface TickerData {
  symbol: string;
  lastPrice: number;
  markPrice: number;
  bidPrice: number;
  askPrice: number;
  volume24h: number;
  openInterest: number;
}

export interface ExchangeData {
  funding: Map<string, FundingData>;
  tickers: Map<string, TickerData>;
  errors: string[];
}

// ============================================
// BINANCE FETCHER
// ============================================

export async function fetchBinanceData(): Promise<ExchangeData> {
  const funding = new Map<string, FundingData>();
  const tickers = new Map<string, TickerData>();
  const errors: string[] = [];

  try {
    // Parallel fetch funding + tickers
    const [fundingRes, tickerRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex'),
      fetch('https://fapi.binance.com/fapi/v1/ticker/24hr'),
    ]);

    if (fundingRes.ok) {
      const data = await fundingRes.json();
      for (const item of data) {
        if (!item.symbol.endsWith('USDT')) continue;
        funding.set(item.symbol, {
          symbol: item.symbol,
          fundingRate: parseFloat(item.lastFundingRate),
          nextFundingTs: new Date(item.nextFundingTime).toISOString(),
          markPrice: parseFloat(item.markPrice),
        });
      }
    } else {
      errors.push(`Binance funding: ${fundingRes.status}`);
    }

    if (tickerRes.ok) {
      const data = await tickerRes.json();
      for (const item of data) {
        if (!item.symbol.endsWith('USDT')) continue;
        tickers.set(item.symbol, {
          symbol: item.symbol,
          lastPrice: parseFloat(item.lastPrice),
          markPrice: parseFloat(item.lastPrice), // Will be overwritten from funding
          bidPrice: parseFloat(item.bidPrice),
          askPrice: parseFloat(item.askPrice),
          volume24h: parseFloat(item.quoteVolume),
          openInterest: 0,
        });
      }
    } else {
      errors.push(`Binance ticker: ${tickerRes.status}`);
    }

    // Merge mark prices from funding into tickers
    for (const [symbol, fundingData] of funding) {
      const ticker = tickers.get(symbol);
      if (ticker) {
        ticker.markPrice = fundingData.markPrice;
      }
    }

  } catch (error: any) {
    errors.push(`Binance error: ${error.message}`);
  }

  return { funding, tickers, errors };
}

// ============================================
// BYBIT FETCHER
// ============================================

export async function fetchBybitData(): Promise<ExchangeData> {
  const funding = new Map<string, FundingData>();
  const tickers = new Map<string, TickerData>();
  const errors: string[] = [];

  try {
    const response = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.result?.list) {
        for (const item of data.result.list) {
          if (!item.symbol.endsWith('USDT')) continue;

          funding.set(item.symbol, {
            symbol: item.symbol,
            fundingRate: parseFloat(item.fundingRate || '0'),
            nextFundingTs: item.nextFundingTime 
              ? new Date(parseInt(item.nextFundingTime)).toISOString() 
              : null,
            markPrice: parseFloat(item.markPrice || item.lastPrice || '0'),
          });

          tickers.set(item.symbol, {
            symbol: item.symbol,
            lastPrice: parseFloat(item.lastPrice || '0'),
            markPrice: parseFloat(item.markPrice || item.lastPrice || '0'),
            bidPrice: parseFloat(item.bid1Price || '0'),
            askPrice: parseFloat(item.ask1Price || '0'),
            volume24h: parseFloat(item.turnover24h || '0'),
            openInterest: parseFloat(item.openInterest || '0'),
          });
        }
      }
    } else {
      errors.push(`Bybit: ${response.status}`);
    }
  } catch (error: any) {
    errors.push(`Bybit error: ${error.message}`);
  }

  return { funding, tickers, errors };
}

// ============================================
// OKX FETCHER
// ============================================

export async function fetchOkxData(): Promise<ExchangeData> {
  const funding = new Map<string, FundingData>();
  const tickers = new Map<string, TickerData>();
  const errors: string[] = [];

  try {
    // OKX: fetch tickers (contains funding rate) - single batch call
    const tickerRes = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP');

    if (tickerRes.ok) {
      const data = await tickerRes.json();
      if (data.data) {
        for (const item of data.data) {
          if (!item.instId.includes('-USDT-')) continue;
          
          // OKX includes funding in ticker response for SWAPs
          funding.set(item.instId, {
            symbol: item.instId,
            fundingRate: parseFloat(item.fundingRate || '0'),
            nextFundingTs: item.nextFundingTime 
              ? new Date(parseInt(item.nextFundingTime)).toISOString() 
              : null,
            markPrice: parseFloat(item.last || '0'),
          });
          
          tickers.set(item.instId, {
            symbol: item.instId,
            lastPrice: parseFloat(item.last || '0'),
            markPrice: parseFloat(item.last || '0'),
            bidPrice: parseFloat(item.bidPx || '0'),
            askPrice: parseFloat(item.askPx || '0'),
            volume24h: parseFloat(item.volCcy24h || '0'),
            openInterest: parseFloat(item.oi || '0'),
          });
          
          // Update funding with mark price
          const fundingData = funding.get(item.instId);
          if (fundingData) {
            fundingData.markPrice = parseFloat(item.last || '0');
          }
        }
      }
    } else {
      errors.push(`OKX ticker: ${tickerRes.status}`);
    }

  } catch (error: any) {
    errors.push(`OKX error: ${error.message}`);
  }

  return { funding, tickers, errors };
}

// ============================================
// BITGET FETCHER
// ============================================

export async function fetchBitgetData(): Promise<ExchangeData> {
  const funding = new Map<string, FundingData>();
  const tickers = new Map<string, TickerData>();
  const errors: string[] = [];

  try {
    const response = await fetch('https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES');
    
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        for (const item of data.data) {
          if (!item.symbol.endsWith('USDT')) continue;
          
          funding.set(item.symbol, {
            symbol: item.symbol,
            fundingRate: parseFloat(item.fundingRate || '0'),
            nextFundingTs: item.nextFundingTime 
              ? new Date(parseInt(item.nextFundingTime)).toISOString() 
              : null,
            markPrice: parseFloat(item.markPrice || item.lastPr || '0'),
          });

          tickers.set(item.symbol, {
            symbol: item.symbol,
            lastPrice: parseFloat(item.lastPr || '0'),
            markPrice: parseFloat(item.markPrice || item.lastPr || '0'),
            bidPrice: parseFloat(item.bidPr || '0'),
            askPrice: parseFloat(item.askPr || '0'),
            volume24h: parseFloat(item.quoteVolume || '0'),
            openInterest: parseFloat(item.openInterest || '0'),
          });
        }
      }
    } else {
      errors.push(`Bitget: ${response.status}`);
    }
  } catch (error: any) {
    errors.push(`Bitget error: ${error.message}`);
  }

  return { funding, tickers, errors };
}

// ============================================
// GATE.IO FETCHER
// ============================================

export async function fetchGateData(): Promise<ExchangeData> {
  const funding = new Map<string, FundingData>();
  const tickers = new Map<string, TickerData>();
  const errors: string[] = [];

  try {
    const response = await fetch('https://api.gateio.ws/api/v4/futures/usdt/tickers');
    
    if (response.ok) {
      const data = await response.json();
      for (const item of data) {
        if (!item.contract.endsWith('_USDT')) continue;
        
        const symbol = item.contract;
        
        funding.set(symbol, {
          symbol,
          fundingRate: parseFloat(item.funding_rate || '0'),
          nextFundingTs: item.funding_rate_indicative 
            ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
            : null,
          markPrice: parseFloat(item.mark_price || item.last || '0'),
        });

        tickers.set(symbol, {
          symbol,
          lastPrice: parseFloat(item.last || '0'),
          markPrice: parseFloat(item.mark_price || item.last || '0'),
          bidPrice: parseFloat(item.highest_bid || '0'),
          askPrice: parseFloat(item.lowest_ask || '0'),
          volume24h: parseFloat(item.quote_volume_24h || '0'),
          openInterest: parseFloat(item.total_size || '0'),
        });
      }
    } else {
      errors.push(`Gate.io: ${response.status}`);
    }
  } catch (error: any) {
    errors.push(`Gate.io error: ${error.message}`);
  }

  return { funding, tickers, errors };
}

// ============================================
// KUCOIN FETCHER
// ============================================

export async function fetchKucoinData(): Promise<ExchangeData> {
  const funding = new Map<string, FundingData>();
  const tickers = new Map<string, TickerData>();
  const errors: string[] = [];

  try {
    const [contractsRes, tickerRes] = await Promise.all([
      fetch('https://api-futures.kucoin.com/api/v1/contracts/active'),
      fetch('https://api-futures.kucoin.com/api/v1/allTickers'),
    ]);

    // Get funding rates from contracts
    if (contractsRes.ok) {
      const data = await contractsRes.json();
      if (data.data) {
        for (const item of data.data) {
          if (!item.symbol.endsWith('USDTM')) continue;
          
          funding.set(item.symbol, {
            symbol: item.symbol,
            fundingRate: parseFloat(item.fundingFeeRate || '0'),
            nextFundingTs: item.nextFundingRateTime 
              ? new Date(item.nextFundingRateTime).toISOString()
              : null,
            markPrice: parseFloat(item.markPrice || '0'),
          });
        }
      }
    } else {
      errors.push(`KuCoin contracts: ${contractsRes.status}`);
    }

    // Get ticker data
    if (tickerRes.ok) {
      const data = await tickerRes.json();
      if (data.data?.ticker) {
        for (const item of data.data.ticker) {
          if (!item.symbol.endsWith('USDTM')) continue;
          
          tickers.set(item.symbol, {
            symbol: item.symbol,
            lastPrice: parseFloat(item.last || '0'),
            markPrice: parseFloat(item.last || '0'),
            bidPrice: parseFloat(item.bestBid || '0'),
            askPrice: parseFloat(item.bestAsk || '0'),
            volume24h: parseFloat(item.vol || '0'),
            openInterest: 0,
          });
        }
      }
    } else {
      errors.push(`KuCoin tickers: ${tickerRes.status}`);
    }

  } catch (error: any) {
    errors.push(`KuCoin error: ${error.message}`);
  }

  return { funding, tickers, errors };
}

// ============================================
// HTX (HUOBI) FETCHER
// ============================================

export async function fetchHtxData(): Promise<ExchangeData> {
  const funding = new Map<string, FundingData>();
  const tickers = new Map<string, TickerData>();
  const errors: string[] = [];

  try {
    // HTX: Use the correct linear swap API endpoints
    const [tickerRes, fundingRes] = await Promise.all([
      fetch('https://api.hbdm.com/linear-swap-ex/market/detail/batch_merged'),
      fetch('https://api.hbdm.com/linear-swap-api/v1/swap_batch_funding_rate'),
    ]);

    if (fundingRes.ok) {
      const data = await fundingRes.json();
      if (data.data) {
        for (const item of data.data) {
          if (!item.contract_code.endsWith('-USDT')) continue;
          
          const symbol = item.contract_code;
          
          funding.set(symbol, {
            symbol,
            fundingRate: parseFloat(item.funding_rate || '0'),
            nextFundingTs: item.next_funding_time 
              ? new Date(parseInt(item.next_funding_time)).toISOString()
              : null,
            markPrice: 0,
          });
        }
      }
    } else {
      errors.push(`HTX funding: ${fundingRes.status}`);
    }

    if (tickerRes.ok) {
      const data = await tickerRes.json();
      if (data.ticks) {
        for (const item of data.ticks) {
          if (!item.contract_code?.endsWith('-USDT')) continue;
          
          const symbol = item.contract_code;
          
          tickers.set(symbol, {
            symbol,
            lastPrice: parseFloat(item.close || '0'),
            markPrice: parseFloat(item.close || '0'),
            bidPrice: parseFloat(item.bid?.[0] || '0'),
            askPrice: parseFloat(item.ask?.[0] || '0'),
            volume24h: parseFloat(item.amount || '0'),
            openInterest: 0,
          });
          
          // Update funding mark price
          const f = funding.get(symbol);
          if (f) f.markPrice = parseFloat(item.close || '0');
        }
      }
    } else {
      errors.push(`HTX ticker: ${tickerRes.status}`);
    }

  } catch (error: any) {
    errors.push(`HTX error: ${error.message}`);
  }

  return { funding, tickers, errors };
}

// ============================================
// MEXC FETCHER
// ============================================

export async function fetchMexcData(): Promise<ExchangeData> {
  const funding = new Map<string, FundingData>();
  const tickers = new Map<string, TickerData>();
  const errors: string[] = [];

  try {
    const response = await fetch('https://contract.mexc.com/api/v1/contract/ticker');
    
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        for (const item of data.data) {
          if (!item.symbol.endsWith('_USDT')) continue;
          
          const symbol = item.symbol;
          
          funding.set(symbol, {
            symbol,
            fundingRate: parseFloat(item.fundingRate || '0'),
            nextFundingTs: item.nextSettleTime 
              ? new Date(parseInt(item.nextSettleTime)).toISOString()
              : null,
            markPrice: parseFloat(item.fairPrice || item.lastPrice || '0'),
          });

          tickers.set(symbol, {
            symbol,
            lastPrice: parseFloat(item.lastPrice || '0'),
            markPrice: parseFloat(item.fairPrice || item.lastPrice || '0'),
            bidPrice: parseFloat(item.bid1 || '0'),
            askPrice: parseFloat(item.ask1 || '0'),
            volume24h: parseFloat(item.volume24 || '0'),
            openInterest: parseFloat(item.holdVol || '0'),
          });
        }
      }
    } else {
      errors.push(`MEXC: ${response.status}`);
    }
  } catch (error: any) {
    errors.push(`MEXC error: ${error.message}`);
  }

  return { funding, tickers, errors };
}

// ============================================
// KRAKEN FETCHER
// ============================================

export async function fetchKrakenData(): Promise<ExchangeData> {
  const funding = new Map<string, FundingData>();
  const tickers = new Map<string, TickerData>();
  const errors: string[] = [];

  try {
    const response = await fetch('https://futures.kraken.com/derivatives/api/v3/tickers');
    
    if (response.ok) {
      const data = await response.json();
      if (data.tickers) {
        for (const item of data.tickers) {
          // Only perpetuals with USD base
          if (!item.symbol.startsWith('PF_') || !item.symbol.endsWith('USD')) continue;
          
          const symbol = item.symbol;
          
          funding.set(symbol, {
            symbol,
            fundingRate: parseFloat(item.fundingRate || '0'),
            nextFundingTs: item.nextFundingRateTime 
              ? new Date(item.nextFundingRateTime).toISOString()
              : null,
            markPrice: parseFloat(item.markPrice || item.last || '0'),
          });

          tickers.set(symbol, {
            symbol,
            lastPrice: parseFloat(item.last || '0'),
            markPrice: parseFloat(item.markPrice || item.last || '0'),
            bidPrice: parseFloat(item.bid || '0'),
            askPrice: parseFloat(item.ask || '0'),
            volume24h: parseFloat(item.vol24h || '0'),
            openInterest: parseFloat(item.openInterest || '0'),
          });
        }
      }
    } else {
      errors.push(`Kraken: ${response.status}`);
    }
  } catch (error: any) {
    errors.push(`Kraken error: ${error.message}`);
  }

  return { funding, tickers, errors };
}

// ============================================
// DERIBIT FETCHER
// ============================================

export async function fetchDeribitData(): Promise<ExchangeData> {
  const funding = new Map<string, FundingData>();
  const tickers = new Map<string, TickerData>();
  const errors: string[] = [];

  try {
    // Deribit only has BTC and ETH perpetuals
    const instruments = ['BTC-PERPETUAL', 'ETH-PERPETUAL'];
    
    const promises = instruments.map(async (inst) => {
      const res = await fetch(`https://www.deribit.com/api/v2/public/ticker?instrument_name=${inst}`);
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          const item = data.result;
          const symbol = inst;
          
          funding.set(symbol, {
            symbol,
            fundingRate: parseFloat(item.funding_8h || '0'),
            nextFundingTs: null, // Deribit has continuous funding
            markPrice: parseFloat(item.mark_price || item.last_price || '0'),
          });

          tickers.set(symbol, {
            symbol,
            lastPrice: parseFloat(item.last_price || '0'),
            markPrice: parseFloat(item.mark_price || item.last_price || '0'),
            bidPrice: parseFloat(item.best_bid_price || '0'),
            askPrice: parseFloat(item.best_ask_price || '0'),
            volume24h: parseFloat(item.stats?.volume_usd || '0'),
            openInterest: parseFloat(item.open_interest || '0'),
          });
        }
      }
    });
    
    await Promise.all(promises);

  } catch (error: any) {
    errors.push(`Deribit error: ${error.message}`);
  }

  return { funding, tickers, errors };
}

// ============================================
// MAIN DISPATCHER
// ============================================

export type ExchangeCode = 'binance' | 'bybit' | 'okx' | 'bitget' | 'gate' | 'kucoin' | 'htx' | 'mexc' | 'kraken' | 'deribit';

const FETCHERS: Record<ExchangeCode, () => Promise<ExchangeData>> = {
  binance: fetchBinanceData,
  bybit: fetchBybitData,
  okx: fetchOkxData,
  bitget: fetchBitgetData,
  gate: fetchGateData,
  kucoin: fetchKucoinData,
  htx: fetchHtxData,
  mexc: fetchMexcData,
  kraken: fetchKrakenData,
  deribit: fetchDeribitData,
};

export async function fetchExchangeData(exchangeCode: string): Promise<ExchangeData> {
  const fetcher = FETCHERS[exchangeCode as ExchangeCode];
  if (!fetcher) {
    return {
      funding: new Map(),
      tickers: new Map(),
      errors: [`Unknown exchange: ${exchangeCode}`],
    };
  }
  return fetcher();
}
