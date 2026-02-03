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
      arbitrage_opportunities: {
        Row: {
          confidence_score: number
          created_at: string
          expires_at: string | null
          funding_spread_8h: number
          gross_edge_8h_bps: number
          id: string
          liquidity_score: number
          long_exchange_id: string
          long_fee_bps: number
          long_funding_8h: number
          long_market_id: string
          long_price: number
          net_edge_8h_bps: number
          net_edge_annual_percent: number
          opportunity_score: number
          price_spread_bps: number
          profit_score: number
          reason: Json | null
          risk_penalty: number
          risk_tier: string
          short_exchange_id: string
          short_fee_bps: number
          short_funding_8h: number
          short_market_id: string
          short_price: number
          slippage_bps: number
          spread_cost_bps: number
          stability_score: number
          status: string
          symbol_id: string
          total_cost_bps: number
          total_fees_bps: number
          ts: string
          ts_bucket: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          expires_at?: string | null
          funding_spread_8h?: number
          gross_edge_8h_bps?: number
          id?: string
          liquidity_score?: number
          long_exchange_id: string
          long_fee_bps?: number
          long_funding_8h?: number
          long_market_id: string
          long_price?: number
          net_edge_8h_bps?: number
          net_edge_annual_percent?: number
          opportunity_score?: number
          price_spread_bps?: number
          profit_score?: number
          reason?: Json | null
          risk_penalty?: number
          risk_tier?: string
          short_exchange_id: string
          short_fee_bps?: number
          short_funding_8h?: number
          short_market_id: string
          short_price?: number
          slippage_bps?: number
          spread_cost_bps?: number
          stability_score?: number
          status?: string
          symbol_id: string
          total_cost_bps?: number
          total_fees_bps?: number
          ts?: string
          ts_bucket?: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          expires_at?: string | null
          funding_spread_8h?: number
          gross_edge_8h_bps?: number
          id?: string
          liquidity_score?: number
          long_exchange_id?: string
          long_fee_bps?: number
          long_funding_8h?: number
          long_market_id?: string
          long_price?: number
          net_edge_8h_bps?: number
          net_edge_annual_percent?: number
          opportunity_score?: number
          price_spread_bps?: number
          profit_score?: number
          reason?: Json | null
          risk_penalty?: number
          risk_tier?: string
          short_exchange_id?: string
          short_fee_bps?: number
          short_funding_8h?: number
          short_market_id?: string
          short_price?: number
          slippage_bps?: number
          spread_cost_bps?: number
          stability_score?: number
          status?: string
          symbol_id?: string
          total_cost_bps?: number
          total_fees_bps?: number
          ts?: string
          ts_bucket?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arbitrage_opportunities_long_exchange_id_fkey"
            columns: ["long_exchange_id"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbitrage_opportunities_long_market_id_fkey"
            columns: ["long_market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbitrage_opportunities_short_exchange_id_fkey"
            columns: ["short_exchange_id"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbitrage_opportunities_short_market_id_fkey"
            columns: ["short_market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbitrage_opportunities_symbol_id_fkey"
            columns: ["symbol_id"]
            isOneToOne: false
            referencedRelation: "symbols"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          level: string
          ts: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          level: string
          ts?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          level?: string
          ts?: string
        }
        Relationships: []
      }
      autopilot_positions: {
        Row: {
          created_at: string
          current_long_price: number | null
          current_short_price: number | null
          entry_funding_spread_8h: number
          entry_long_price: number
          entry_score: number
          entry_short_price: number
          entry_ts: string
          exit_long_price: number | null
          exit_reason: string | null
          exit_short_price: number | null
          exit_ts: string | null
          funding_collected_eur: number
          id: string
          intervals_collected: number
          leverage: number
          long_exchange: string
          long_market_id: string | null
          mode: string
          realized_pnl_eur: number | null
          realized_pnl_percent: number | null
          risk_snapshot: Json
          risk_tier: string
          short_exchange: string
          short_market_id: string | null
          size_eur: number
          status: string
          symbol: string
          symbol_id: string | null
          unrealized_pnl_eur: number
          unrealized_pnl_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_long_price?: number | null
          current_short_price?: number | null
          entry_funding_spread_8h: number
          entry_long_price: number
          entry_score: number
          entry_short_price: number
          entry_ts?: string
          exit_long_price?: number | null
          exit_reason?: string | null
          exit_short_price?: number | null
          exit_ts?: string | null
          funding_collected_eur?: number
          id?: string
          intervals_collected?: number
          leverage?: number
          long_exchange: string
          long_market_id?: string | null
          mode?: string
          realized_pnl_eur?: number | null
          realized_pnl_percent?: number | null
          risk_snapshot?: Json
          risk_tier: string
          short_exchange: string
          short_market_id?: string | null
          size_eur: number
          status?: string
          symbol: string
          symbol_id?: string | null
          unrealized_pnl_eur?: number
          unrealized_pnl_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_long_price?: number | null
          current_short_price?: number | null
          entry_funding_spread_8h?: number
          entry_long_price?: number
          entry_score?: number
          entry_short_price?: number
          entry_ts?: string
          exit_long_price?: number | null
          exit_reason?: string | null
          exit_short_price?: number | null
          exit_ts?: string | null
          funding_collected_eur?: number
          id?: string
          intervals_collected?: number
          leverage?: number
          long_exchange?: string
          long_market_id?: string | null
          mode?: string
          realized_pnl_eur?: number | null
          realized_pnl_percent?: number | null
          risk_snapshot?: Json
          risk_tier?: string
          short_exchange?: string
          short_market_id?: string | null
          size_eur?: number
          status?: string
          symbol?: string
          symbol_id?: string | null
          unrealized_pnl_eur?: number
          unrealized_pnl_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_positions_long_market_id_fkey"
            columns: ["long_market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_positions_short_market_id_fkey"
            columns: ["short_market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_positions_symbol_id_fkey"
            columns: ["symbol_id"]
            isOneToOne: false
            referencedRelation: "symbols"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_state: {
        Row: {
          config_snapshot: Json
          daily_drawdown_eur: number
          id: string
          is_running: boolean
          kill_switch_active: boolean
          kill_switch_reason: string | null
          last_scan_ts: string | null
          last_trade_ts: string | null
          mode: string
          total_funding_collected_eur: number
          total_realized_pnl_eur: number
          updated_at: string
        }
        Insert: {
          config_snapshot?: Json
          daily_drawdown_eur?: number
          id?: string
          is_running?: boolean
          kill_switch_active?: boolean
          kill_switch_reason?: string | null
          last_scan_ts?: string | null
          last_trade_ts?: string | null
          mode?: string
          total_funding_collected_eur?: number
          total_realized_pnl_eur?: number
          updated_at?: string
        }
        Update: {
          config_snapshot?: Json
          daily_drawdown_eur?: number
          id?: string
          is_running?: boolean
          kill_switch_active?: boolean
          kill_switch_reason?: string | null
          last_scan_ts?: string | null
          last_trade_ts?: string | null
          mode?: string
          total_funding_collected_eur?: number
          total_realized_pnl_eur?: number
          updated_at?: string
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
      computed_metrics_v2: {
        Row: {
          created_at: string
          data_quality: number | null
          exchange_id: string
          funding_interval_hours: number
          funding_rate_8h: number
          funding_rate_annual: number
          funding_rate_raw: number
          id: string
          liquidity_score: number
          mark_price: number
          market_id: string
          open_interest: number | null
          slippage_bps: number
          spread_bps: number
          symbol_id: string
          taker_fee_bps: number
          total_cost_bps: number
          ts: string
          ts_bucket: string
          volatility_score: number
          volume_24h: number | null
        }
        Insert: {
          created_at?: string
          data_quality?: number | null
          exchange_id: string
          funding_interval_hours?: number
          funding_rate_8h?: number
          funding_rate_annual?: number
          funding_rate_raw?: number
          id?: string
          liquidity_score?: number
          mark_price?: number
          market_id: string
          open_interest?: number | null
          slippage_bps?: number
          spread_bps?: number
          symbol_id: string
          taker_fee_bps?: number
          total_cost_bps?: number
          ts?: string
          ts_bucket?: string
          volatility_score?: number
          volume_24h?: number | null
        }
        Update: {
          created_at?: string
          data_quality?: number | null
          exchange_id?: string
          funding_interval_hours?: number
          funding_rate_8h?: number
          funding_rate_annual?: number
          funding_rate_raw?: number
          id?: string
          liquidity_score?: number
          mark_price?: number
          market_id?: string
          open_interest?: number | null
          slippage_bps?: number
          spread_bps?: number
          symbol_id?: string
          taker_fee_bps?: number
          total_cost_bps?: number
          ts?: string
          ts_bucket?: string
          volatility_score?: number
          volume_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "computed_metrics_v2_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "computed_metrics_v2_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "computed_metrics_v2_symbol_id_fkey"
            columns: ["symbol_id"]
            isOneToOne: false
            referencedRelation: "symbols"
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
      engine_config: {
        Row: {
          config_key: string
          config_value: Json
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      engine_runs: {
        Row: {
          completed_at: string | null
          config_snapshot: Json | null
          duration_ms: number | null
          error_message: string | null
          error_stack: string | null
          id: string
          markets_processed: number | null
          metrics_computed: number | null
          opportunities_found: number | null
          signals_generated: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          config_snapshot?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          markets_processed?: number | null
          metrics_computed?: number | null
          opportunities_found?: number | null
          signals_generated?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          config_snapshot?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          markets_processed?: number | null
          metrics_computed?: number | null
          opportunities_found?: number | null
          signals_generated?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      exchanges: {
        Row: {
          api_base_url: string | null
          batch_endpoint: string | null
          code: string
          created_at: string
          exchange_tier: number | null
          funding_interval_hours: number | null
          id: string
          is_active: boolean
          logo_url: string | null
          maker_fee: number
          name: string
          rate_limit_per_min: number | null
          supported_features: Json | null
          taker_fee: number
          website_url: string | null
          withdrawal_fees: Json | null
          ws_base_url: string | null
        }
        Insert: {
          api_base_url?: string | null
          batch_endpoint?: string | null
          code: string
          created_at?: string
          exchange_tier?: number | null
          funding_interval_hours?: number | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          maker_fee?: number
          name: string
          rate_limit_per_min?: number | null
          supported_features?: Json | null
          taker_fee?: number
          website_url?: string | null
          withdrawal_fees?: Json | null
          ws_base_url?: string | null
        }
        Update: {
          api_base_url?: string | null
          batch_endpoint?: string | null
          code?: string
          created_at?: string
          exchange_tier?: number | null
          funding_interval_hours?: number | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          maker_fee?: number
          name?: string
          rate_limit_per_min?: number | null
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
      ingestion_schedule: {
        Row: {
          backoff_until: string | null
          consecutive_failures: number | null
          created_at: string | null
          exchange_id: string
          id: string
          interval_minutes: number
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          symbol_tier: number
          updated_at: string | null
        }
        Insert: {
          backoff_until?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          exchange_id: string
          id?: string
          interval_minutes?: number
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          symbol_tier: number
          updated_at?: string | null
        }
        Update: {
          backoff_until?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          exchange_id?: string
          id?: string
          interval_minutes?: number
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          symbol_tier?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_schedule_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
        ]
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
          is_meme: boolean | null
          quote_asset: string
          symbol_tier: number | null
          volatility_multiplier: number | null
        }
        Insert: {
          base_asset: string
          category?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          is_meme?: boolean | null
          quote_asset: string
          symbol_tier?: number | null
          volatility_multiplier?: number | null
        }
        Update: {
          base_asset?: string
          category?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_meme?: boolean | null
          quote_asset?: string
          symbol_tier?: number | null
          volatility_multiplier?: number | null
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
      trading_signals: {
        Row: {
          closed_at: string | null
          closed_reason: string | null
          confidence: number
          created_at: string
          direction: string
          expires_at: string
          id: string
          is_speculative: boolean
          long_exchange: string
          net_profit_estimate_bps: number
          net_profit_estimate_percent: number
          next_funding_time: string | null
          opportunity_id: string | null
          reason: Json | null
          score: number
          short_exchange: string
          signal_type: string
          status: Database["public"]["Enums"]["signal_status"]
          symbol_id: string
          ts: string
          ttl_seconds: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_reason?: string | null
          confidence?: number
          created_at?: string
          direction: string
          expires_at: string
          id?: string
          is_speculative?: boolean
          long_exchange: string
          net_profit_estimate_bps?: number
          net_profit_estimate_percent?: number
          next_funding_time?: string | null
          opportunity_id?: string | null
          reason?: Json | null
          score?: number
          short_exchange: string
          signal_type: string
          status?: Database["public"]["Enums"]["signal_status"]
          symbol_id: string
          ts?: string
          ttl_seconds?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_reason?: string | null
          confidence?: number
          created_at?: string
          direction?: string
          expires_at?: string
          id?: string
          is_speculative?: boolean
          long_exchange?: string
          net_profit_estimate_bps?: number
          net_profit_estimate_percent?: number
          next_funding_time?: string | null
          opportunity_id?: string | null
          reason?: Json | null
          score?: number
          short_exchange?: string
          signal_type?: string
          status?: Database["public"]["Enums"]["signal_status"]
          symbol_id?: string
          ts?: string
          ttl_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_signals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "arbitrage_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_signals_symbol_id_fkey"
            columns: ["symbol_id"]
            isOneToOne: false
            referencedRelation: "symbols"
            referencedColumns: ["id"]
          },
        ]
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
      annualize_8h_rate: { Args: { rate_8h: number }; Returns: number }
      bootstrap_user: { Args: never; Returns: Json }
      calc_liquidity_score: { Args: { spread_bps: number }; Returns: number }
      calc_profit_score: { Args: { net_edge_bps: number }; Returns: number }
      cleanup_engine_data: { Args: never; Returns: undefined }
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
      normalize_funding_8h: {
        Args: { funding_rate: number; interval_hours: number }
        Returns: number
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
      signal_status: "open" | "closed" | "expired"
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
        | "funding_arbitrage"
        | "spread_arbitrage"
        | "basis_arbitrage"
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
      signal_status: ["open", "closed", "expired"],
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
        "funding_arbitrage",
        "spread_arbitrage",
        "basis_arbitrage",
      ],
    },
  },
} as const
