export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alert_events: {
        Row: {
          alert_rule_id: string
          created_at: string
          delivered_status: string
          error_text: string | null
          id: string
          opportunity_id: string | null
          payload: Json
          retry_count: number
          signal_id: string | null
          ts: string
        }
        Insert: {
          alert_rule_id: string
          created_at?: string
          delivered_status?: string
          error_text?: string | null
          id?: string
          opportunity_id?: string | null
          payload: Json
          retry_count?: number
          signal_id?: string | null
          ts?: string
        }
        Update: {
          alert_rule_id?: string
          created_at?: string
          delivered_status?: string
          error_text?: string | null
          id?: string
          opportunity_id?: string | null
          payload?: Json
          retry_count?: number
          signal_id?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_events_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          channel: Database["public"]["Enums"]["alert_channel"]
          cooldown_minutes: number
          created_at: string
          exchange_filter: string[] | null
          id: string
          is_enabled: boolean
          last_triggered_at: string | null
          min_score: number | null
          name: string
          rule_config: Json
          signal_types: Database["public"]["Enums"]["signal_type"][] | null
          symbol_filter: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["alert_channel"]
          cooldown_minutes?: number
          created_at?: string
          exchange_filter?: string[] | null
          id?: string
          is_enabled?: boolean
          last_triggered_at?: string | null
          min_score?: number | null
          name: string
          rule_config?: Json
          signal_types?: Database["public"]["Enums"]["signal_type"][] | null
          symbol_filter?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["alert_channel"]
          cooldown_minutes?: number
          created_at?: string
          exchange_filter?: string[] | null
          id?: string
          is_enabled?: boolean
          last_triggered_at?: string | null
          min_score?: number | null
          name?: string
          rule_config?: Json
          signal_types?: Database["public"]["Enums"]["signal_type"][] | null
          symbol_filter?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json
          rate_limit_per_min: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json
          rate_limit_per_min?: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          rate_limit_per_min?: number
          user_id?: string
        }
        Relationships: []
      }
      backtest_runs: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          end_date: string
          id: string
          markets: string[]
          max_drawdown: number | null
          name: string | null
          results: Json | null
          sharpe_ratio: number | null
          start_date: string
          started_at: string | null
          status: string
          total_pnl: number | null
          total_trades: number | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          completed_at?: string | null
          config: Json
          created_at?: string
          end_date: string
          id?: string
          markets: string[]
          max_drawdown?: number | null
          name?: string | null
          results?: Json | null
          sharpe_ratio?: number | null
          start_date: string
          started_at?: string | null
          status?: string
          total_pnl?: number | null
          total_trades?: number | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          end_date?: string
          id?: string
          markets?: string[]
          max_drawdown?: number | null
          name?: string | null
          results?: Json | null
          sharpe_ratio?: number | null
          start_date?: string
          started_at?: string | null
          status?: string
          total_pnl?: number | null
          total_trades?: number | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      computed_metrics: {
        Row: {
          created_at: string
          id: string
          market_id: string
          metric_name: string
          metric_value: number
          params: Json | null
          ts: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_id: string
          metric_name: string
          metric_value: number
          params?: Json | null
          ts: string
        }
        Update: {
          created_at?: string
          id?: string
          market_id?: string
          metric_name?: string
          metric_value?: number
          params?: Json | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "computed_metrics_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      dead_letter: {
        Row: {
          created_at: string
          error_message: string
          error_stack: string | null
          event_type: string
          id: string
          max_retries: number
          next_retry_at: string | null
          payload: Json
          resolved: boolean
          retry_count: number
          source: string
        }
        Insert: {
          created_at?: string
          error_message: string
          error_stack?: string | null
          event_type: string
          id?: string
          max_retries?: number
          next_retry_at?: string | null
          payload: Json
          resolved?: boolean
          retry_count?: number
          source: string
        }
        Update: {
          created_at?: string
          error_message?: string
          error_stack?: string | null
          event_type?: string
          id?: string
          max_retries?: number
          next_retry_at?: string | null
          payload?: Json
          resolved?: boolean
          retry_count?: number
          source?: string
        }
        Relationships: []
      }
      exchanges: {
        Row: {
          api_base_url: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          maker_fee: number
          name: string
          supported_features: Json | null
          taker_fee: number
          website_url: string | null
          withdrawal_fees: Json | null
          ws_base_url: string | null
        }
        Insert: {
          api_base_url?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          maker_fee?: number
          name: string
          supported_features?: Json | null
          taker_fee?: number
          website_url?: string | null
          withdrawal_fees?: Json | null
          ws_base_url?: string | null
        }
        Update: {
          api_base_url?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          maker_fee?: number
          name?: string
          supported_features?: Json | null
          taker_fee?: number
          website_url?: string | null
          withdrawal_fees?: Json | null
          ws_base_url?: string | null
        }
        Relationships: []
      }
      executions: {
        Row: {
          executed_at: string
          fee: number
          fee_currency: string
          id: string
          order_id: string
          price: number
          size: number
        }
        Insert: {
          executed_at?: string
          fee?: number
          fee_currency?: string
          id?: string
          order_id: string
          price: number
          size: number
        }
        Update: {
          executed_at?: string
          fee?: number
          fee_currency?: string
          id?: string
          order_id?: string
          price?: number
          size?: number
        }
        Relationships: [
          {
            foreignKeyName: "executions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rates: {
        Row: {
          created_at: string
          funding_rate: number
          id: string
          market_id: string
          next_funding_ts: string | null
          predicted_rate: number | null
          source_event_id: string | null
          ts: string
        }
        Insert: {
          created_at?: string
          funding_rate: number
          id?: string
          market_id: string
          next_funding_ts?: string | null
          predicted_rate?: number | null
          source_event_id?: string | null
          ts: string
        }
        Update: {
          created_at?: string
          funding_rate?: number
          id?: string
          market_id?: string
          next_funding_ts?: string | null
          predicted_rate?: number | null
          source_event_id?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_rates_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_rates_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "raw_events"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rates_hourly: {
        Row: {
          avg_rate: number | null
          hour: string
          id: string
          market_id: string
          max_rate: number | null
          min_rate: number | null
          sample_count: number | null
        }
        Insert: {
          avg_rate?: number | null
          hour: string
          id?: string
          market_id: string
          max_rate?: number | null
          min_rate?: number | null
          sample_count?: number | null
        }
        Update: {
          avg_rate?: number | null
          hour?: string
          id?: string
          market_id?: string
          max_rate?: number | null
          min_rate?: number | null
          sample_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_rates_hourly_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_runs: {
        Row: {
          completed_at: string | null
          errors: Json | null
          id: string
          metadata: Json | null
          records_fetched: number | null
          records_inserted: number | null
          records_updated: number | null
          run_type: string
          source: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          errors?: Json | null
          id?: string
          metadata?: Json | null
          records_fetched?: number | null
          records_inserted?: number | null
          records_updated?: number | null
          run_type: string
          source: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          errors?: Json | null
          id?: string
          metadata?: Json | null
          records_fetched?: number | null
          records_inserted?: number | null
          records_updated?: number | null
          run_type?: string
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          created_at: string
          exchange_id: string
          exchange_symbol: string
          id: string
          is_active: boolean
          liquidity_tier: number | null
          lot_size: number | null
          market_type: Database["public"]["Enums"]["market_type"]
          max_order_size: number | null
          min_order_size: number | null
          symbol_id: string
          tick_size: number | null
        }
        Insert: {
          created_at?: string
          exchange_id: string
          exchange_symbol: string
          id?: string
          is_active?: boolean
          liquidity_tier?: number | null
          lot_size?: number | null
          market_type: Database["public"]["Enums"]["market_type"]
          max_order_size?: number | null
          min_order_size?: number | null
          symbol_id: string
          tick_size?: number | null
        }
        Update: {
          created_at?: string
          exchange_id?: string
          exchange_symbol?: string
          id?: string
          is_active?: boolean
          liquidity_tier?: number | null
          lot_size?: number | null
          market_type?: Database["public"]["Enums"]["market_type"]
          max_order_size?: number | null
          min_order_size?: number | null
          symbol_id?: string
          tick_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "markets_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "markets_symbol_id_fkey"
            columns: ["symbol_id"]
            isOneToOne: false
            referencedRelation: "symbols"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          estimated_yield_8h: number | null
          estimated_yield_annual: number | null
          exchanges: string[]
          id: string
          is_speculative: boolean
          long_market_id: string | null
          net_after_fees: number | null
          opportunity_type: string
          reason: Json
          risk_tier: string
          score: number
          short_market_id: string | null
          spread_percent: number | null
          symbol_id: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          estimated_yield_8h?: number | null
          estimated_yield_annual?: number | null
          exchanges: string[]
          id?: string
          is_speculative?: boolean
          long_market_id?: string | null
          net_after_fees?: number | null
          opportunity_type: string
          reason?: Json
          risk_tier: string
          score: number
          short_market_id?: string | null
          spread_percent?: number | null
          symbol_id: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          estimated_yield_8h?: number | null
          estimated_yield_annual?: number | null
          exchanges?: string[]
          id?: string
          is_speculative?: boolean
          long_market_id?: string | null
          net_after_fees?: number | null
          opportunity_type?: string
          reason?: Json
          risk_tier?: string
          score?: number
          short_market_id?: string | null
          spread_percent?: number | null
          symbol_id?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_long_market_id_fkey"
            columns: ["long_market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_short_market_id_fkey"
            columns: ["short_market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_symbol_id_fkey"
            columns: ["symbol_id"]
            isOneToOne: false
            referencedRelation: "symbols"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities_daily: {
        Row: {
          avg_score: number | null
          avg_yield: number | null
          date: string
          id: string
          max_score: number | null
          opportunity_count: number | null
          opportunity_type: string
          symbol_id: string
        }
        Insert: {
          avg_score?: number | null
          avg_yield?: number | null
          date: string
          id?: string
          max_score?: number | null
          opportunity_count?: number | null
          opportunity_type: string
          symbol_id: string
        }
        Update: {
          avg_score?: number | null
          avg_yield?: number | null
          date?: string
          id?: string
          max_score?: number | null
          opportunity_count?: number | null
          opportunity_type?: string
          symbol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_daily_symbol_id_fkey"
            columns: ["symbol_id"]
            isOneToOne: false
            referencedRelation: "symbols"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          avg_fill_price: number | null
          created_at: string
          filled_size: number
          id: string
          idempotency_key: string | null
          market_id: string
          order_type: Database["public"]["Enums"]["order_type"]
          portfolio_id: string
          position_id: string | null
          price: number | null
          side: Database["public"]["Enums"]["order_side"]
          size: number
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          avg_fill_price?: number | null
          created_at?: string
          filled_size?: number
          id?: string
          idempotency_key?: string | null
          market_id: string
          order_type: Database["public"]["Enums"]["order_type"]
          portfolio_id: string
          position_id?: string | null
          price?: number | null
          side: Database["public"]["Enums"]["order_side"]
          size: number
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          avg_fill_price?: number | null
          created_at?: string
          filled_size?: number
          id?: string
          idempotency_key?: string | null
          market_id?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          portfolio_id?: string
          position_id?: string | null
          price?: number | null
          side?: Database["public"]["Enums"]["order_side"]
          size?: number
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          api_enabled: boolean
          api_rate_limit_per_min: number | null
          backtest_enabled: boolean
          created_at: string
          currency: string
          data_delay_seconds: number
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          max_alerts_per_day: number
          max_symbols: number
          name: string
          price_monthly: number
          price_yearly: number | null
          realtime_data: boolean
          speculative_zone_full: boolean
          tier: Database["public"]["Enums"]["plan_tier"]
        }
        Insert: {
          api_enabled?: boolean
          api_rate_limit_per_min?: number | null
          backtest_enabled?: boolean
          created_at?: string
          currency?: string
          data_delay_seconds?: number
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_alerts_per_day?: number
          max_symbols?: number
          name: string
          price_monthly?: number
          price_yearly?: number | null
          realtime_data?: boolean
          speculative_zone_full?: boolean
          tier: Database["public"]["Enums"]["plan_tier"]
        }
        Update: {
          api_enabled?: boolean
          api_rate_limit_per_min?: number | null
          backtest_enabled?: boolean
          created_at?: string
          currency?: string
          data_delay_seconds?: number
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_alerts_per_day?: number
          max_symbols?: number
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          realtime_data?: boolean
          speculative_zone_full?: boolean
          tier?: Database["public"]["Enums"]["plan_tier"]
        }
        Relationships: []
      }
      pnl_snapshots: {
        Row: {
          drawdown_percent: number | null
          id: string
          portfolio_id: string
          realized_pnl: number
          sharpe_ratio: number | null
          total_value: number
          ts: string
          unrealized_pnl: number
        }
        Insert: {
          drawdown_percent?: number | null
          id?: string
          portfolio_id: string
          realized_pnl?: number
          sharpe_ratio?: number | null
          total_value: number
          ts?: string
          unrealized_pnl?: number
        }
        Update: {
          drawdown_percent?: number | null
          id?: string
          portfolio_id?: string
          realized_pnl?: number
          sharpe_ratio?: number | null
          total_value?: number
          ts?: string
          unrealized_pnl?: number
        }
        Relationships: [
          {
            foreignKeyName: "pnl_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          currency: string
          current_balance: number
          id: string
          initial_balance: number
          is_paper: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_paper?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_paper?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          closed_at: string | null
          current_price: number
          entry_price: number
          id: string
          leverage: number
          liquidation_price: number | null
          market_id: string
          opened_at: string
          portfolio_id: string
          realized_pnl: number
          side: Database["public"]["Enums"]["position_side"]
          size: number
          status: string
          stop_loss: number | null
          take_profit: number | null
          unrealized_pnl: number
        }
        Insert: {
          closed_at?: string | null
          current_price: number
          entry_price: number
          id?: string
          leverage?: number
          liquidation_price?: number | null
          market_id: string
          opened_at?: string
          portfolio_id: string
          realized_pnl?: number
          side: Database["public"]["Enums"]["position_side"]
          size: number
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          unrealized_pnl?: number
        }
        Update: {
          closed_at?: string | null
          current_price?: number
          entry_price?: number
          id?: string
          leverage?: number
          liquidation_price?: number | null
          market_id?: string
          opened_at?: string
          portfolio_id?: string
          realized_pnl?: number
          side?: Database["public"]["Enums"]["position_side"]
          size?: number
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          unrealized_pnl?: number
        }
        Relationships: [
          {
            foreignKeyName: "positions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          ask_price: number | null
          bid_price: number | null
          created_at: string
          id: string
          index_price: number | null
          last_price: number
          mark_price: number | null
          market_id: string
          open_interest: number | null
          source_event_id: string | null
          ts: string
          volume_24h: number | null
        }
        Insert: {
          ask_price?: number | null
          bid_price?: number | null
          created_at?: string
          id?: string
          index_price?: number | null
          last_price: number
          mark_price?: number | null
          market_id: string
          open_interest?: number | null
          source_event_id?: string | null
          ts: string
          volume_24h?: number | null
        }
        Update: {
          ask_price?: number | null
          bid_price?: number | null
          created_at?: string
          id?: string
          index_price?: number | null
          last_price?: number
          mark_price?: number | null
          market_id?: string
          open_interest?: number | null
          source_event_id?: string | null
          ts?: string
          volume_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prices_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "raw_events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          discord_user_id: string | null
          display_name: string | null
          email: string
          id: string
          telegram_chat_id: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          discord_user_id?: string | null
          display_name?: string | null
          email: string
          id?: string
          telegram_chat_id?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          discord_user_id?: string | null
          display_name?: string | null
          email?: string
          id?: string
          telegram_chat_id?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      raw_events: {
        Row: {
          created_at: string
          event_type: string
          hash_dedup: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          source: string
          ts: string
        }
        Insert: {
          created_at?: string
          event_type: string
          hash_dedup: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          source: string
          ts?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          hash_dedup?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          source?: string
          ts?: string
        }
        Relationships: []
      }
      risk_limits: {
        Row: {
          created_at: string
          id: string
          kill_switch_enabled: boolean
          kill_switch_triggered: boolean
          max_daily_loss: number | null
          max_drawdown_percent: number | null
          max_leverage: number | null
          max_position_size: number | null
          portfolio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kill_switch_enabled?: boolean
          kill_switch_triggered?: boolean
          max_daily_loss?: number | null
          max_drawdown_percent?: number | null
          max_leverage?: number | null
          max_position_size?: number | null
          portfolio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kill_switch_enabled?: boolean
          kill_switch_triggered?: boolean
          max_daily_loss?: number | null
          max_drawdown_percent?: number | null
          max_leverage?: number | null
          max_position_size?: number | null
          portfolio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_limits_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: true
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_versions: {
        Row: {
          caps: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          thresholds: Json
          version: string
          weights: Json
        }
        Insert: {
          caps?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          thresholds?: Json
          version: string
          weights?: Json
        }
        Update: {
          caps?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          thresholds?: Json
          version?: string
          weights?: Json
        }
        Relationships: []
      }
      signals: {
        Row: {
          confidence: number
          created_at: string
          expires_at: string | null
          id: string
          is_speculative: boolean
          market_id: string
          reason: Json
          score: number
          scoring_version_id: string | null
          signal_type: Database["public"]["Enums"]["signal_type"]
          ts: string
        }
        Insert: {
          confidence: number
          created_at?: string
          expires_at?: string | null
          id?: string
          is_speculative?: boolean
          market_id: string
          reason?: Json
          score: number
          scoring_version_id?: string | null
          signal_type: Database["public"]["Enums"]["signal_type"]
          ts?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          is_speculative?: boolean
          market_id?: string
          reason?: Json
          score?: number
          scoring_version_id?: string | null
          signal_type?: Database["public"]["Enums"]["signal_type"]
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_scoring_version_id_fkey"
            columns: ["scoring_version_id"]
            isOneToOne: false
            referencedRelation: "scoring_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      symbols: {
        Row: {
          base_asset: string
          category: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          quote_asset: string
        }
        Insert: {
          base_asset: string
          category?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          quote_asset: string
        }
        Update: {
          base_asset?: string
          category?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          quote_asset?: string
        }
        Relationships: []
      }
      system_health: {
        Row: {
          component: string
          error_count_1h: number | null
          id: string
          last_error_at: string | null
          last_success_at: string | null
          metadata: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          component: string
          error_count_1h?: number | null
          id?: string
          last_error_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          status: string
          updated_at?: string
        }
        Update: {
          component?: string
          error_count_1h?: number | null
          id?: string
          last_error_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          alerts_sent: number
          api_calls: number
          backtest_runs: number
          created_at: string
          id: string
          period_end: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts_sent?: number
          api_calls?: number
          backtest_runs?: number
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts_sent?: number
          api_calls?: number
          backtest_runs?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          market_id: string | null
          notes: string | null
          symbol_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_id?: string | null
          notes?: string | null
          symbol_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          market_id?: string | null
          notes?: string | null
          symbol_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_symbol_id_fkey"
            columns: ["symbol_id"]
            isOneToOne: false
            referencedRelation: "symbols"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["plan_tier"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_channel: "telegram" | "discord" | "email" | "webhook"
      app_role: "admin" | "moderator" | "user"
      market_type: "spot" | "perpetual" | "futures" | "option"
      order_side: "buy" | "sell"
      order_status:
        | "pending"
        | "open"
        | "filled"
        | "partially_filled"
        | "cancelled"
        | "rejected"
      order_type: "market" | "limit" | "stop_market" | "stop_limit"
      plan_tier: "free" | "pro" | "elite" | "team"
      position_side: "long" | "short"
      signal_type:
        | "funding_extreme"
        | "funding_divergence"
        | "cross_exchange_spread"
        | "basis_yield"
        | "composite_arbitrage"
        | "volatility_spike"
        | "abnormal_volume"
        | "breakout_momentum"
        | "funding_flip"
        | "liquidation_cascade"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_channel: ["telegram", "discord", "email", "webhook"],
      app_role: ["admin", "moderator", "user"],
      market_type: ["spot", "perpetual", "futures", "option"],
      order_side: ["buy", "sell"],
      order_status: [
        "pending",
        "open",
        "filled",
        "partially_filled",
        "cancelled",
        "rejected",
      ],
      order_type: ["market", "limit", "stop_market", "stop_limit"],
      plan_tier: ["free", "pro", "elite", "team"],
      position_side: ["long", "short"],
      signal_type: [
        "funding_extreme",
        "funding_divergence",
        "cross_exchange_spread",
        "basis_yield",
        "composite_arbitrage",
        "volatility_spike",
        "abnormal_volume",
        "breakout_momentum",
        "funding_flip",
        "liquidation_cascade",
      ],
    },
  },
} as const
