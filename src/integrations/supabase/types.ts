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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_activities: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      alert_interactions: {
        Row: {
          alert_id: string | null
          created_at: string
          id: string
          interaction_data: Json | null
          interaction_type: string
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          id?: string
          interaction_data?: Json | null
          interaction_type: string
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          id?: string
          interaction_data?: Json | null
          interaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_interactions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_notes: {
        Row: {
          alert_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_alert_notes_alert"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_reviews: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          reviewed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          reviewed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          reviewed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_alert_reviews_alert"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_tags: {
        Row: {
          alert_id: string
          confidence_score: number | null
          created_at: string
          id: string
          is_primary: boolean | null
          tag_id: string
        }
        Insert: {
          alert_id: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          tag_id: string
        }
        Update: {
          alert_id?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_tags_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          agency: string | null
          created_at: string
          data_classification: string | null
          dismissed_by: string[] | null
          external_url: string | null
          full_content: string | null
          id: string
          published_date: string
          region: string | null
          source: string
          summary: string
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          agency?: string | null
          created_at?: string
          data_classification?: string | null
          dismissed_by?: string[] | null
          external_url?: string | null
          full_content?: string | null
          id?: string
          published_date: string
          region?: string | null
          source: string
          summary: string
          title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          agency?: string | null
          created_at?: string
          data_classification?: string | null
          dismissed_by?: string[] | null
          external_url?: string | null
          full_content?: string | null
          id?: string
          published_date?: string
          region?: string | null
          source?: string
          summary?: string
          title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_name: string
          last_used_at: string | null
          rate_limit_per_hour: number | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          last_used_at?: string | null
          rate_limit_per_hour?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          last_used_at?: string | null
          rate_limit_per_hour?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cookie_consents: {
        Row: {
          analytics: boolean
          consent_date: string
          essential: boolean
          expires_at: string
          functional: boolean
          id: string
          ip_address: unknown | null
          marketing: boolean
          updated_at: string
          user_agent: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          analytics?: boolean
          consent_date?: string
          essential?: boolean
          expires_at?: string
          functional?: boolean
          id?: string
          ip_address?: unknown | null
          marketing?: boolean
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          analytics?: boolean
          consent_date?: string
          essential?: boolean
          expires_at?: string
          functional?: boolean
          id?: string
          ip_address?: unknown | null
          marketing?: boolean
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      data_access_logs: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown | null
          operation: string
          record_count: number | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          operation: string
          record_count?: number | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          operation?: string
          record_count?: number | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      data_freshness: {
        Row: {
          created_at: string
          error_message: string | null
          fetch_status: string
          id: string
          last_attempt: string
          last_successful_fetch: string
          records_fetched: number | null
          source_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          fetch_status?: string
          id?: string
          last_attempt?: string
          last_successful_fetch?: string
          records_fetched?: number | null
          source_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          fetch_status?: string
          id?: string
          last_attempt?: string
          last_successful_fetch?: string
          records_fetched?: number | null
          source_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          agency: string
          created_at: string
          fetch_interval: number | null
          id: string
          is_active: boolean
          last_fetched_at: string | null
          metadata: Json | null
          name: string
          source_type: string
          updated_at: string
          url: string
        }
        Insert: {
          agency: string
          created_at?: string
          fetch_interval?: number | null
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          metadata?: Json | null
          name: string
          source_type: string
          updated_at?: string
          url: string
        }
        Update: {
          agency?: string
          created_at?: string
          fetch_interval?: number | null
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          metadata?: Json | null
          name?: string
          source_type?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      demo_content: {
        Row: {
          content: Json
          content_type: string | null
          created_at: string | null
          demo_scenario: string | null
          display_order: number | null
          id: string
          industry_focus: string | null
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: Json
          content_type?: string | null
          created_at?: string | null
          demo_scenario?: string | null
          display_order?: number | null
          id?: string
          industry_focus?: string | null
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          content_type?: string | null
          created_at?: string | null
          demo_scenario?: string | null
          display_order?: number | null
          id?: string
          industry_focus?: string | null
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      demo_sessions: {
        Row: {
          created_at: string | null
          created_by: string | null
          demo_scenario: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          session_data: Json | null
          session_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          demo_scenario?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          session_data?: Json | null
          session_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          demo_scenario?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          session_data?: Json | null
          session_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      enterprise_features: {
        Row: {
          created_at: string | null
          current_usage: number | null
          feature_name: string
          id: string
          is_enabled: boolean | null
          reset_period: string | null
          updated_at: string | null
          usage_limit: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_usage?: number | null
          feature_name: string
          id?: string
          is_enabled?: boolean | null
          reset_period?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_usage?: number | null
          feature_name?: string
          id?: string
          is_enabled?: boolean | null
          reset_period?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          facility_type: string | null
          id: string
          name: string
          organization_user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          facility_type?: string | null
          id?: string
          name: string
          organization_user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          facility_type?: string | null
          id?: string
          name?: string
          organization_user_id?: string
        }
        Relationships: []
      }
      ip_rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          is_blocked: boolean | null
          requests_count: number | null
          window_start: string | null
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: unknown
          is_blocked?: boolean | null
          requests_count?: number | null
          window_start?: string | null
        }
        Update: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          is_blocked?: boolean | null
          requests_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown | null
          load_time_ms: number | null
          page_path: string
          page_title: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown | null
          load_time_ms?: number | null
          page_path: string
          page_title?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown | null
          load_time_ms?: number | null
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          action_type: string
          amount_cents: number | null
          created_at: string | null
          currency: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          stripe_session_id: string | null
          success: boolean | null
          user_id: string
        }
        Insert: {
          action_type: string
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          stripe_session_id?: string | null
          success?: boolean | null
          user_id: string
        }
        Update: {
          action_type?: string
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          stripe_session_id?: string | null
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      perplexity_searches: {
        Row: {
          agencies: string[] | null
          created_at: string | null
          error_message: string | null
          id: string
          industry: string | null
          query: string
          search_type: string | null
          success: boolean | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          agencies?: string[] | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          industry?: string | null
          query: string
          search_type?: string | null
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          agencies?: string[] | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          industry?: string | null
          query?: string
          search_type?: string | null
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_permissions: string[] | null
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          last_ip_address: unknown | null
          last_seen_at: string | null
          plan_limits: Json | null
          role: string | null
          session_extended_until: string | null
          subscription_plan: string | null
          trusted_ips: unknown[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_permissions?: string[] | null
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_ip_address?: unknown | null
          last_seen_at?: string | null
          plan_limits?: Json | null
          role?: string | null
          session_extended_until?: string | null
          subscription_plan?: string | null
          trusted_ips?: unknown[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_permissions?: string[] | null
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_ip_address?: unknown | null
          last_seen_at?: string | null
          plan_limits?: Json | null
          role?: string | null
          session_extended_until?: string | null
          subscription_plan?: string | null
          trusted_ips?: unknown[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          requests_count: number | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          requests_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          requests_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      regulatory_data_sources: {
        Row: {
          agency: string
          base_url: string
          created_at: string | null
          data_gov_org: string | null
          id: string
          is_active: boolean | null
          keywords: Json | null
          last_error: string | null
          last_successful_fetch: string | null
          name: string
          polling_interval_minutes: number | null
          priority: number | null
          region: string
          rss_feeds: Json | null
          source_type: string
          updated_at: string | null
        }
        Insert: {
          agency: string
          base_url: string
          created_at?: string | null
          data_gov_org?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: Json | null
          last_error?: string | null
          last_successful_fetch?: string | null
          name: string
          polling_interval_minutes?: number | null
          priority?: number | null
          region?: string
          rss_feeds?: Json | null
          source_type?: string
          updated_at?: string | null
        }
        Update: {
          agency?: string
          base_url?: string
          created_at?: string | null
          data_gov_org?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: Json | null
          last_error?: string | null
          last_successful_fetch?: string | null
          name?: string
          polling_interval_minutes?: number | null
          priority?: number | null
          region?: string
          rss_feeds?: Json | null
          source_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      search_analytics: {
        Row: {
          clicked_result_position: number | null
          created_at: string
          filters_applied: Json | null
          id: string
          results_count: number | null
          search_duration_ms: number | null
          search_query: string
          search_type: string | null
          user_id: string | null
        }
        Insert: {
          clicked_result_position?: number | null
          created_at?: string
          filters_applied?: Json | null
          id?: string
          results_count?: number | null
          search_duration_ms?: number | null
          search_query: string
          search_type?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_result_position?: number | null
          created_at?: string
          filters_applied?: Json | null
          id?: string
          results_count?: number | null
          search_duration_ms?: number | null
          search_query?: string
          search_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      search_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          expires_at: string
          id: string
          query: string
          result_data: Json
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          expires_at: string
          id?: string
          query: string
          result_data: Json
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          query?: string
          result_data?: Json
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      source_finder_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          processed: number
          status: string
          updated: number
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed?: number
          status: string
          updated?: number
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed?: number
          status?: string
          updated?: number
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      supplier_watches: {
        Row: {
          agency: string | null
          created_at: string
          id: string
          keywords: string[] | null
          supplier_identifier: string | null
          supplier_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          supplier_identifier?: string | null
          supplier_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          supplier_identifier?: string | null
          supplier_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      tag_classifications: {
        Row: {
          ai_model: string | null
          alert_id: string
          classification_data: Json | null
          classification_method: string
          confidence_scores: Json | null
          created_at: string
          id: string
        }
        Insert: {
          ai_model?: string | null
          alert_id: string
          classification_data?: Json | null
          classification_method: string
          confidence_scores?: Json | null
          created_at?: string
          id?: string
        }
        Update: {
          ai_model?: string | null
          alert_id?: string
          classification_data?: Json | null
          classification_method?: string
          confidence_scores?: Json | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_classifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      taxonomy_tags: {
        Row: {
          category_id: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          category_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_tags_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          amount: number
          created_at: string
          feature_name: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          feature_name: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          feature_name?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          updated_at: string | null
          usage_count: number | null
          usage_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          created_at: string
          element_id: string | null
          element_type: string | null
          id: string
          interaction_data: Json | null
          interaction_type: string
          page_path: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          element_id?: string | null
          element_type?: string | null
          id?: string
          interaction_data?: Json | null
          interaction_type: string
          page_path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          element_id?: string | null
          element_type?: string | null
          id?: string
          interaction_data?: Json | null
          interaction_type?: string
          page_path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          preferred_sources: string[] | null
          updated_at: string
          urgency_threshold: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          preferred_sources?: string[] | null
          updated_at?: string
          urgency_threshold?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          preferred_sources?: string[] | null
          updated_at?: string
          urgency_threshold?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          ip_address: unknown | null
          operating_system: string | null
          pages_visited: number | null
          session_id: string
          start_time: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          ip_address?: unknown | null
          operating_system?: string | null
          pages_visited?: number | null
          session_id: string
          start_time?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          ip_address?: unknown | null
          operating_system?: string | null
          pages_visited?: number | null
          session_id?: string
          start_time?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_enhanced_rate_limit: {
        Args: {
          endpoint_param: string
          ip_address_param?: unknown
          ip_rate_limit?: number
          user_rate_limit?: number
        }
        Returns: Json
      }
      clean_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_all_alerts_for_user: {
        Args: { user_id: string }
        Returns: undefined
      }
      create_security_alert: {
        Args: {
          alert_type_param: string
          description_param: string
          metadata_param?: Json
          severity_param: string
          title_param: string
        }
        Returns: string
      }
      detect_suspicious_activity: {
        Args: { user_id_param: string }
        Returns: Json
      }
      dismiss_alert_for_user: {
        Args: { alert_id: string; user_id: string }
        Returns: undefined
      }
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_analytics_overview: {
        Args: { days_back?: number }
        Returns: {
          avg_session_duration: number
          bounce_rate: number
          device_breakdown: Json
          top_pages: Json
          total_page_views: number
          unique_visitors: number
          user_growth: Json
        }[]
      }
      get_feature_usage: {
        Args: { feature_name_param: string; user_id_param: string }
        Returns: {
          current_usage: number
          is_unlimited: boolean
          usage_limit: number
        }[]
      }
      get_security_status_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      grant_admin_permission: {
        Args: { permission_name: string; target_user_id: string }
        Returns: undefined
      }
      has_admin_permission: {
        Args: { permission_name_param: string; user_id_param: string }
        Returns: boolean
      }
      has_enterprise_feature: {
        Args: { feature_name_param: string; user_id_param: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          action_type: string
          details?: Json
          target_id?: string
          target_type?: string
        }
        Returns: undefined
      }
      log_admin_action_enhanced: {
        Args: {
          action_type: string
          details?: Json
          require_admin?: boolean
          target_id?: string
          target_type?: string
        }
        Returns: undefined
      }
      log_critical_data_access: {
        Args: {
          additional_metadata?: Json
          operation_param: string
          record_count_param?: number
          table_name_param: string
        }
        Returns: undefined
      }
      log_data_access_attempt: {
        Args: {
          operation_param: string
          record_count_param?: number
          table_name_param: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: { event_type_param: string; metadata_param?: Json }
        Returns: undefined
      }
      log_security_event_enhanced: {
        Args: {
          event_type_param: string
          metadata_param?: Json
          threat_level_param?: string
        }
        Returns: undefined
      }
      log_sensitive_data_access: {
        Args: {
          operation_param: string
          record_count_param?: number
          sensitive_fields?: Json
          table_name_param: string
        }
        Returns: undefined
      }
      log_source_finder_result: {
        Args: {
          error_text?: string
          processed_count: number
          status_text: string
          updated_count: number
        }
        Returns: undefined
      }
      provision_enterprise_api_key: {
        Args: { target_user_id: string }
        Returns: string
      }
      reset_data_pipeline_timestamps: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      revoke_admin_permission: {
        Args: { permission_name: string; target_user_id: string }
        Returns: undefined
      }
      revoke_user_api_keys: {
        Args: { target_user_id: string }
        Returns: number
      }
      should_extend_session: {
        Args: { current_ip?: unknown; user_id_param: string }
        Returns: boolean
      }
      update_user_activity: {
        Args: { ip_address_param?: unknown; user_id_param: string }
        Returns: undefined
      }
      update_user_admin_permissions: {
        Args: { new_permissions: string[]; target_user_id: string }
        Returns: undefined
      }
      update_user_profile: {
        Args: {
          new_company?: string
          new_email?: string
          new_full_name?: string
          profile_user_id: string
        }
        Returns: undefined
      }
      upsert_system_setting: {
        Args: {
          description_param?: string
          key_param: string
          value_param: Json
        }
        Returns: undefined
      }
      validate_enterprise_api_key: {
        Args: { api_key_input: string }
        Returns: {
          is_valid: boolean
          rate_limit: number
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
