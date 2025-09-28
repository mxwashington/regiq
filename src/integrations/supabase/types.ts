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
      alert_delivery_queue: {
        Row: {
          alert_id: string
          created_at: string
          delivered_at: string | null
          delivery_method: string
          id: string
          metadata: Json | null
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string
          id?: string
          metadata?: Json | null
          scheduled_for?: string
          status?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string
          id?: string
          metadata?: Json | null
          scheduled_for?: string
          status?: string
          user_id?: string
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
      alert_preferences: {
        Row: {
          agencies: string[]
          categories: string[]
          created_at: string
          delay_non_critical: boolean
          email_frequency: string
          id: string
          max_daily_alerts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agencies?: string[]
          categories?: string[]
          created_at?: string
          delay_non_critical?: boolean
          email_frequency?: string
          id?: string
          max_daily_alerts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agencies?: string[]
          categories?: string[]
          created_at?: string
          delay_non_critical?: boolean
          email_frequency?: string
          id?: string
          max_daily_alerts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      alert_rule_matches: {
        Row: {
          alert_id: string
          alert_rule_id: string
          id: string
          matched_at: string
          notification_status: string | null
          notified_at: string | null
        }
        Insert: {
          alert_id: string
          alert_rule_id: string
          id?: string
          matched_at?: string
          notification_status?: string | null
          notified_at?: string | null
        }
        Update: {
          alert_id?: string
          alert_rule_id?: string
          id?: string
          matched_at?: string
          notification_status?: string | null
          notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_rule_matches_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rule_matches_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          created_at: string
          email_enabled: boolean
          frequency: string
          id: string
          is_active: boolean
          last_triggered_at: string | null
          term: string
          trigger_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          frequency?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          term: string
          trigger_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          frequency?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          term?: string
          trigger_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          ai_summary: string | null
          created_at: string
          data_classification: string | null
          dismissed_by: string[] | null
          external_url: string | null
          full_content: string | null
          id: string
          perplexity_processed: boolean | null
          published_date: string
          region: string | null
          source: string
          summary: string
          title: string
          updated_at: string
          urgency: string
          urgency_score: number | null
        }
        Insert: {
          agency?: string | null
          ai_summary?: string | null
          created_at?: string
          data_classification?: string | null
          dismissed_by?: string[] | null
          external_url?: string | null
          full_content?: string | null
          id?: string
          perplexity_processed?: boolean | null
          published_date: string
          region?: string | null
          source: string
          summary: string
          title: string
          updated_at?: string
          urgency?: string
          urgency_score?: number | null
        }
        Update: {
          agency?: string | null
          ai_summary?: string | null
          created_at?: string
          data_classification?: string | null
          dismissed_by?: string[] | null
          external_url?: string | null
          full_content?: string | null
          id?: string
          perplexity_processed?: boolean | null
          published_date?: string
          region?: string | null
          source?: string
          summary?: string
          title?: string
          updated_at?: string
          urgency?: string
          urgency_score?: number | null
        }
        Relationships: []
      }
      analytics_reports: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          filters: Json | null
          generated_at: string
          id: string
          report_data: Json
          report_name: string
          report_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          filters?: Json | null
          generated_at?: string
          id?: string
          report_data: Json
          report_name: string
          report_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          filters?: Json | null
          generated_at?: string
          id?: string
          report_data?: Json
          report_name?: string
          report_type?: string
          user_id?: string
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
          key_hash: string | null
          key_name: string
          key_prefix: string | null
          last_used_at: string | null
          rate_limit_per_hour: number | null
          security_metadata: Json | null
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
          key_hash?: string | null
          key_name: string
          key_prefix?: string | null
          last_used_at?: string | null
          rate_limit_per_hour?: number | null
          security_metadata?: Json | null
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
          key_hash?: string | null
          key_name?: string
          key_prefix?: string | null
          last_used_at?: string | null
          rate_limit_per_hour?: number | null
          security_metadata?: Json | null
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
      audit_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      benchmark_data: {
        Row: {
          created_at: string
          data_source: string | null
          id: string
          industry_sector: string
          metric_type: string
          metric_value: number
          percentile_rank: number | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          id?: string
          industry_sector: string
          metric_type: string
          metric_value: number
          percentile_rank?: number | null
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          data_source?: string | null
          id?: string
          industry_sector?: string
          metric_type?: string
          metric_value?: number
          percentile_rank?: number | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      collaboration_comments: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          edited_at: string | null
          entity_id: string
          entity_type: string
          id: string
          mentions: string[] | null
          reply_to: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          edited_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          mentions?: string[] | null
          reply_to?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          edited_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          mentions?: string[] | null
          reply_to?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_comments_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "collaboration_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_assistant_chats: {
        Row: {
          answer: string
          context_alerts: Json | null
          created_at: string | null
          id: string
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          context_alerts?: Json | null
          created_at?: string | null
          id?: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          context_alerts?: Json | null
          created_at?: string | null
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      compliance_deadlines: {
        Row: {
          agency: string
          completion_date: string | null
          completion_notes: string | null
          created_at: string
          deadline_date: string
          deadline_time: string | null
          description: string | null
          facility_id: string | null
          id: string
          next_occurrence: string | null
          priority: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          regulation_reference: string | null
          reminder_days: number[] | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency: string
          completion_date?: string | null
          completion_notes?: string | null
          created_at?: string
          deadline_date: string
          deadline_time?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          next_occurrence?: string | null
          priority?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          regulation_reference?: string | null
          reminder_days?: number[] | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency?: string
          completion_date?: string | null
          completion_notes?: string | null
          created_at?: string
          deadline_date?: string
          deadline_time?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          next_occurrence?: string | null
          priority?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          regulation_reference?: string | null
          reminder_days?: number[] | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      compliance_metrics: {
        Row: {
          agency: string | null
          category: string | null
          created_at: string
          facility_id: string | null
          id: string
          metadata: Json | null
          metric_date: string
          metric_type: string
          metric_value: number
          user_id: string
        }
        Insert: {
          agency?: string | null
          category?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          metadata?: Json | null
          metric_date: string
          metric_type: string
          metric_value: number
          user_id: string
        }
        Update: {
          agency?: string | null
          category?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          metadata?: Json | null
          metric_date?: string
          metric_type?: string
          metric_value?: number
          user_id?: string
        }
        Relationships: []
      }
      compliance_reminders: {
        Row: {
          acknowledged_at: string | null
          days_before: number
          deadline_id: string
          id: string
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          days_before: number
          deadline_id: string
          id?: string
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          days_before?: number
          deadline_id?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reminders_deadline_id_fkey"
            columns: ["deadline_id"]
            isOneToOne: false
            referencedRelation: "compliance_deadlines"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_templates: {
        Row: {
          agency: string
          category: string | null
          created_at: string
          default_priority: string | null
          description: string | null
          id: string
          is_active: boolean | null
          recurrence_type: string | null
          regulation_reference: string | null
          title: string
          typical_deadline_months: number[] | null
        }
        Insert: {
          agency: string
          category?: string | null
          created_at?: string
          default_priority?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          recurrence_type?: string | null
          regulation_reference?: string | null
          title: string
          typical_deadline_months?: number[] | null
        }
        Update: {
          agency?: string
          category?: string | null
          created_at?: string
          default_priority?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          recurrence_type?: string | null
          regulation_reference?: string | null
          title?: string
          typical_deadline_months?: number[] | null
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
      custom_data_ingestion_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          data_source_id: string
          error_details: Json | null
          errors_count: number | null
          id: string
          processing_time_ms: number | null
          records_imported: number | null
          records_processed: number | null
          records_skipped: number | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data_source_id: string
          error_details?: Json | null
          errors_count?: number | null
          id?: string
          processing_time_ms?: number | null
          records_imported?: number | null
          records_processed?: number | null
          records_skipped?: number | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data_source_id?: string
          error_details?: Json | null
          errors_count?: number | null
          id?: string
          processing_time_ms?: number | null
          records_imported?: number | null
          records_processed?: number | null
          records_skipped?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_data_ingestion_logs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "custom_data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_data_sources: {
        Row: {
          auth_config: Json | null
          configuration: Json
          created_at: string
          description: string | null
          error_message: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          metadata: Json | null
          name: string
          source_type: string
          status: string | null
          sync_frequency: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_config?: Json | null
          configuration?: Json
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          metadata?: Json | null
          name: string
          source_type: string
          status?: string | null
          sync_frequency?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_config?: Json | null
          configuration?: Json
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          metadata?: Json | null
          name?: string
          source_type?: string
          status?: string | null
          sync_frequency?: number | null
          updated_at?: string
          user_id?: string
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
          base_url: string | null
          created_at: string
          data_gov_org: string | null
          fetch_interval: number | null
          id: string
          is_active: boolean
          keywords: Json | null
          last_error: string | null
          last_fetched_at: string | null
          last_successful_fetch: string | null
          metadata: Json | null
          name: string
          polling_interval_minutes: number | null
          priority: number | null
          region: string
          rss_feeds: Json | null
          source_type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          agency: string
          base_url?: string | null
          created_at?: string
          data_gov_org?: string | null
          fetch_interval?: number | null
          id?: string
          is_active?: boolean
          keywords?: Json | null
          last_error?: string | null
          last_fetched_at?: string | null
          last_successful_fetch?: string | null
          metadata?: Json | null
          name: string
          polling_interval_minutes?: number | null
          priority?: number | null
          region?: string
          rss_feeds?: Json | null
          source_type?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          agency?: string
          base_url?: string | null
          created_at?: string
          data_gov_org?: string | null
          fetch_interval?: number | null
          id?: string
          is_active?: boolean
          keywords?: Json | null
          last_error?: string | null
          last_fetched_at?: string | null
          last_successful_fetch?: string | null
          metadata?: Json | null
          name?: string
          polling_interval_minutes?: number | null
          priority?: number | null
          region?: string
          rss_feeds?: Json | null
          source_type?: string
          updated_at?: string
          url?: string | null
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
      digest_preferences: {
        Row: {
          created_at: string | null
          digest_time: string | null
          enabled: boolean | null
          frequency: string | null
          id: string
          timezone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          digest_time?: string | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          digest_time?: string | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          compliance_requirements: Json | null
          contact_info: Json | null
          created_at: string
          created_by: string | null
          facility_type: string | null
          id: string
          name: string
          organization_user_id: string
          regulatory_zones: string[] | null
          settings: Json | null
          status: string | null
        }
        Insert: {
          address?: string | null
          compliance_requirements?: Json | null
          contact_info?: Json | null
          created_at?: string
          created_by?: string | null
          facility_type?: string | null
          id?: string
          name: string
          organization_user_id: string
          regulatory_zones?: string[] | null
          settings?: Json | null
          status?: string | null
        }
        Update: {
          address?: string | null
          compliance_requirements?: Json | null
          contact_info?: Json | null
          created_at?: string
          created_by?: string | null
          facility_type?: string | null
          id?: string
          name?: string
          organization_user_id?: string
          regulatory_zones?: string[] | null
          settings?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      facility_alerts: {
        Row: {
          alert_id: string
          assigned_to: string | null
          created_at: string
          facility_id: string
          id: string
          is_relevant: boolean | null
          notes: string | null
          risk_level: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          alert_id: string
          assigned_to?: string | null
          created_at?: string
          facility_id: string
          id?: string
          is_relevant?: boolean | null
          notes?: string | null
          risk_level?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          alert_id?: string
          assigned_to?: string | null
          created_at?: string
          facility_id?: string
          id?: string
          is_relevant?: boolean | null
          notes?: string | null
          risk_level?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_alerts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_users: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          permissions: Json | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_users_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_assessments: {
        Row: {
          alert_id: string | null
          category: string | null
          created_at: string | null
          estimated_cost: number | null
          id: string
          impact_description: string | null
          mitigation_plan: string | null
          severity: string | null
          timeline_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          category?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          impact_description?: string | null
          mitigation_plan?: string | null
          severity?: string | null
          timeline_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string | null
          category?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          impact_description?: string | null
          mitigation_plan?: string | null
          severity?: string | null
          timeline_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_assessments_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      import_compliance_gaps: {
        Row: {
          affected_facilities: Json | null
          alert_id: string
          compliance_requirements_missed: string[] | null
          created_at: string
          gap_type: string
          id: string
          importer_name: string | null
          origin_country: string | null
          potential_risk_level: string
          product_type: string
          remediation_needed: Json | null
          timeline_to_fix: string | null
          updated_at: string
        }
        Insert: {
          affected_facilities?: Json | null
          alert_id: string
          compliance_requirements_missed?: string[] | null
          created_at?: string
          gap_type: string
          id?: string
          importer_name?: string | null
          origin_country?: string | null
          potential_risk_level?: string
          product_type: string
          remediation_needed?: Json | null
          timeline_to_fix?: string | null
          updated_at?: string
        }
        Update: {
          affected_facilities?: Json | null
          alert_id?: string
          compliance_requirements_missed?: string[] | null
          created_at?: string
          gap_type?: string
          id?: string
          importer_name?: string | null
          origin_country?: string | null
          potential_risk_level?: string
          product_type?: string
          remediation_needed?: Json | null
          timeline_to_fix?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_compliance_gaps_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
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
          encryption_version: string | null
          id: string
          ip_address: unknown | null
          is_encrypted: boolean | null
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
          encryption_version?: string | null
          id?: string
          ip_address?: unknown | null
          is_encrypted?: boolean | null
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
          encryption_version?: string | null
          id?: string
          ip_address?: unknown | null
          is_encrypted?: boolean | null
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
      plan_features: {
        Row: {
          created_at: string
          feature_key: string
          feature_value: Json
          id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          feature_value?: Json
          id?: string
          plan_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          feature_value?: Json
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_interval: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          plan_id: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          plan_id: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          plan_id?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      process_failure_patterns: {
        Row: {
          affected_systems: string[] | null
          alert_id: string
          created_at: string
          failure_category: string
          failure_type: string
          id: string
          regulatory_gaps: Json | null
          root_cause_analysis: Json | null
          severity_level: string
          similar_pattern_count: number | null
          trend_indicators: Json | null
          updated_at: string
        }
        Insert: {
          affected_systems?: string[] | null
          alert_id: string
          created_at?: string
          failure_category: string
          failure_type: string
          id?: string
          regulatory_gaps?: Json | null
          root_cause_analysis?: Json | null
          severity_level?: string
          similar_pattern_count?: number | null
          trend_indicators?: Json | null
          updated_at?: string
        }
        Update: {
          affected_systems?: string[] | null
          alert_id?: string
          created_at?: string
          failure_category?: string
          failure_type?: string
          id?: string
          regulatory_gaps?: Json | null
          root_cause_analysis?: Json | null
          severity_level?: string
          similar_pattern_count?: number | null
          trend_indicators?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_failure_patterns_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
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
          subscription_status: string | null
          trial_ends_at: string | null
          trial_expired: boolean | null
          trial_starts_at: string | null
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
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_expired?: boolean | null
          trial_starts_at?: string | null
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
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_expired?: boolean | null
          trial_starts_at?: string | null
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
      regulatory_gap_indicators: {
        Row: {
          affected_areas: Json
          created_at: string
          evidence_alerts: string[] | null
          gap_description: string
          id: string
          indicator_type: string
          last_updated_at: string
          priority_level: string
          recommended_actions: Json | null
          risk_score: number
          trend_direction: string
          user_id: string | null
        }
        Insert: {
          affected_areas?: Json
          created_at?: string
          evidence_alerts?: string[] | null
          gap_description: string
          id?: string
          indicator_type: string
          last_updated_at?: string
          priority_level?: string
          recommended_actions?: Json | null
          risk_score?: number
          trend_direction?: string
          user_id?: string | null
        }
        Update: {
          affected_areas?: Json
          created_at?: string
          evidence_alerts?: string[] | null
          gap_description?: string
          id?: string
          indicator_type?: string
          last_updated_at?: string
          priority_level?: string
          recommended_actions?: Json | null
          risk_score?: number
          trend_direction?: string
          user_id?: string | null
        }
        Relationships: []
      }
      risk_patterns: {
        Row: {
          affected_entities: Json | null
          confidence: number | null
          created_at: string
          discovery_method: string | null
          frequency: number | null
          id: string
          impact_score: number | null
          pattern_data: Json
          pattern_type: string
          updated_at: string
        }
        Insert: {
          affected_entities?: Json | null
          confidence?: number | null
          created_at?: string
          discovery_method?: string | null
          frequency?: number | null
          id?: string
          impact_score?: number | null
          pattern_data?: Json
          pattern_type: string
          updated_at?: string
        }
        Update: {
          affected_entities?: Json | null
          confidence?: number | null
          created_at?: string
          discovery_method?: string | null
          frequency?: number | null
          id?: string
          impact_score?: number | null
          pattern_data?: Json
          pattern_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_predictions: {
        Row: {
          confidence_level: number
          created_at: string
          entity_id: string
          entity_type: string
          expires_at: string
          historical_data: Json | null
          id: string
          mitigation_recommendations: Json | null
          model_version: string | null
          predicted_at: string
          prediction_horizon: number
          risk_factors: Json | null
          risk_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_level?: number
          created_at?: string
          entity_id: string
          entity_type: string
          expires_at?: string
          historical_data?: Json | null
          id?: string
          mitigation_recommendations?: Json | null
          model_version?: string | null
          predicted_at?: string
          prediction_horizon?: number
          risk_factors?: Json | null
          risk_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_level?: number
          created_at?: string
          entity_id?: string
          entity_type?: string
          expires_at?: string
          historical_data?: Json | null
          id?: string
          mitigation_recommendations?: Json | null
          model_version?: string | null
          predicted_at?: string
          prediction_horizon?: number
          risk_factors?: Json | null
          risk_score?: number
          updated_at?: string
          user_id?: string
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
      security_monitoring_cache: {
        Row: {
          id: string
          last_updated: string | null
          policy_count: number
          rls_enabled: boolean
          security_level: string
          table_name: string
        }
        Insert: {
          id?: string
          last_updated?: string | null
          policy_count: number
          rls_enabled: boolean
          security_level: string
          table_name: string
        }
        Update: {
          id?: string
          last_updated?: string | null
          policy_count?: number
          rls_enabled?: boolean
          security_level?: string
          table_name?: string
        }
        Relationships: []
      }
      sensitive_data_access_log: {
        Row: {
          access_reason: string | null
          created_at: string | null
          field_names: string[] | null
          id: string
          ip_address: unknown | null
          operation: string
          record_count: number | null
          session_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_reason?: string | null
          created_at?: string | null
          field_names?: string[] | null
          id?: string
          ip_address?: unknown | null
          operation: string
          record_count?: number | null
          session_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_reason?: string | null
          created_at?: string | null
          field_names?: string[] | null
          id?: string
          ip_address?: unknown | null
          operation?: string
          record_count?: number | null
          session_id?: string | null
          table_name?: string
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
      supplier_alerts: {
        Row: {
          alert_id: string | null
          created_at: string | null
          id: string
          relevance_score: number | null
          supplier_id: string | null
        }
        Insert: {
          alert_id?: string | null
          created_at?: string | null
          id?: string
          relevance_score?: number | null
          supplier_id?: string | null
        }
        Update: {
          alert_id?: string | null
          created_at?: string | null
          id?: string
          relevance_score?: number | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_alerts_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_alerts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
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
      suppliers: {
        Row: {
          created_at: string | null
          duns_number: string | null
          id: string
          last_checked: string | null
          metadata: Json | null
          name: string
          risk_score: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duns_number?: string | null
          id?: string
          last_checked?: string | null
          metadata?: Json | null
          name: string
          risk_score?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duns_number?: string | null
          id?: string
          last_checked?: string | null
          metadata?: Json | null
          name?: string
          risk_score?: number | null
          updated_at?: string | null
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
      task_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          alert_id: string | null
          assigned_by: string | null
          assigned_to: string | null
          category: string | null
          completion_date: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          category?: string | null
          completion_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          category?: string | null
          completion_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      team_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          team_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          team_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_alert_assignments: {
        Row: {
          alert_id: string
          assigned_by: string
          assigned_to: string | null
          created_at: string
          due_date: string | null
          id: string
          metadata: Json | null
          notes: string | null
          priority: string | null
          status: string | null
          team_id: string
          updated_at: string
          workflow_stage: string | null
        }
        Insert: {
          alert_id: string
          assigned_by: string
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          team_id: string
          updated_at?: string
          workflow_stage?: string | null
        }
        Update: {
          alert_id?: string
          assigned_by?: string
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          team_id?: string
          updated_at?: string
          workflow_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_alert_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          invited_at: string
          joined_at: string | null
          member_email: string
          member_name: string | null
          role: string | null
          status: string | null
          team_owner: string
        }
        Insert: {
          id?: string
          invited_at?: string
          joined_at?: string | null
          member_email: string
          member_name?: string | null
          role?: string | null
          status?: string | null
          team_owner: string
        }
        Update: {
          id?: string
          invited_at?: string
          joined_at?: string | null
          member_email?: string
          member_name?: string | null
          role?: string | null
          status?: string | null
          team_owner?: string
        }
        Relationships: []
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          permissions: Json | null
          role: string
          status: string | null
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          status?: string | null
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          status?: string | null
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          recipient_id: string
          sender_id: string | null
          team_id: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          recipient_id: string
          sender_id?: string | null
          team_id?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string | null
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          settings: Json | null
          team_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          settings?: Json | null
          team_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          settings?: Json | null
          team_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          created_at: string
          current_usage: number
          feature_key: string
          id: string
          limit_value: number
          period_end: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_usage?: number
          feature_key: string
          id?: string
          limit_value: number
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_usage?: number
          feature_key?: string
          id?: string
          limit_value?: number
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          started_at: string
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["plan_id"]
          },
        ]
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
      webhook_deliveries: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_attempts: number | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string | null
          webhook_endpoint_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_attempts?: number | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          webhook_endpoint_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_attempts?: number | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          webhook_endpoint_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_endpoint_id_fkey"
            columns: ["webhook_endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          description: string | null
          endpoint_url: string
          events: Json
          headers: Json | null
          id: string
          is_active: boolean
          name: string
          retry_config: Json | null
          secret_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          endpoint_url: string
          events?: Json
          headers?: Json | null
          id?: string
          is_active?: boolean
          name: string
          retry_config?: Json | null
          secret_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          endpoint_url?: string
          events?: Json
          headers?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          retry_config?: Json | null
          secret_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_instances: {
        Row: {
          assigned_users: Json | null
          completed_at: string | null
          context_data: Json | null
          created_at: string
          current_step: number
          due_date: string | null
          id: string
          name: string
          priority: string
          status: string
          step_history: Json | null
          template_id: string | null
          total_steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_users?: Json | null
          completed_at?: string | null
          context_data?: Json | null
          created_at?: string
          current_step?: number
          due_date?: string | null
          id?: string
          name: string
          priority?: string
          status?: string
          step_history?: Json | null
          template_id?: string | null
          total_steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_users?: Json | null
          completed_at?: string | null
          context_data?: Json | null
          created_at?: string
          current_step?: number
          due_date?: string | null
          id?: string
          name?: string
          priority?: string
          status?: string
          step_history?: Json | null
          template_id?: string | null
          total_steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_executions: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          execution_notes: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          started_at: string | null
          status: string
          step_name: string
          step_number: number
          workflow_instance_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          execution_notes?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          step_name: string
          step_number: number
          workflow_instance_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          execution_notes?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          step_name?: string
          step_number?: number
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_executions_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system_template: boolean
          name: string
          updated_at: string
          usage_count: number | null
          user_id: string
          workflow_definition: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_template?: boolean
          name: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
          workflow_definition?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_template?: boolean
          name?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
          workflow_definition?: Json
        }
        Relationships: []
      }
      alerts_summary: {
        Row: {
          source: string
          total_alerts: number
          recent_alerts: number
          created_at: string
          updated_at: string
        }
        Insert: {
          source: string
          total_alerts?: number
          recent_alerts?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          source?: string
          total_alerts?: number
          recent_alerts?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      alert_sync_logs: {
        Row: {
          id: string
          source: string
          status: string
          run_started: string
          run_finished: string | null
          alerts_fetched: number | null
          alerts_inserted: number | null
          alerts_updated: number | null
          alerts_skipped: number | null
          errors: string[] | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          source: string
          status?: string
          run_started?: string
          run_finished?: string | null
          alerts_fetched?: number | null
          alerts_inserted?: number | null
          alerts_updated?: number | null
          alerts_skipped?: number | null
          errors?: string[] | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          source?: string
          status?: string
          run_started?: string
          run_finished?: string | null
          alerts_fetched?: number | null
          alerts_inserted?: number | null
          alerts_updated?: number | null
          alerts_skipped?: number | null
          errors?: string[] | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_alert_to_team: {
        Args: {
          alert_id_param: string
          assigned_to_param?: string
          notes_param?: string
          priority_param?: string
          team_id_param: string
        }
        Returns: string
      }
      audit_email_exposure: {
        Args: Record<PropertyKey, never>
        Returns: {
          has_email_column: boolean
          policy_name: string
          recommendation: string
          security_status: string
          table_name: string
        }[]
      }
      audit_extension_security: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_schema: unknown
          extension_name: unknown
          recommendation: string
          security_status: string
        }[]
      }
      check_account_lockout_status: {
        Args: { user_email_param: string }
        Returns: Json
      }
      check_compliance_data_rate_limit: {
        Args: { operation_type: string; user_uuid: string }
        Returns: boolean
      }
      check_current_security_status: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      check_enhanced_rate_limit: {
        Args: {
          endpoint_param: string
          ip_address_param?: unknown
          ip_rate_limit?: number
          user_rate_limit?: number
        }
        Returns: Json
      }
      check_enhanced_rate_limit_v2: {
        Args: {
          endpoint_param: string
          ip_address_param?: unknown
          ip_rate_limit?: number
          user_rate_limit?: number
        }
        Returns: Json
      }
      check_feature_access: {
        Args: { feature: string; user_uuid: string }
        Returns: boolean
      }
      check_profiles_security: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      create_facility_with_admin: {
        Args: {
          facility_address: string
          facility_name: string
          facility_type?: string
        }
        Returns: string
      }
      create_secure_api_key: {
        Args: { key_name_param: string; rate_limit_param?: number }
        Returns: Json
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
      create_team_with_admin: {
        Args: {
          team_description?: string
          team_name: string
          team_type?: string
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
      enforce_alert_limit: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      enhanced_rate_limit_check: {
        Args: { endpoint_name: string; ip_limit?: number; user_limit?: number }
        Returns: Json
      }
      extend_user_session_secure: {
        Args: { hours_to_extend?: number }
        Returns: Json
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
      get_api_rate_limit: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_current_security_posture: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_feature_usage: {
        Args: { feature_name_param: string; user_id_param: string }
        Returns: {
          current_usage: number
          is_unlimited: boolean
          usage_limit: number
        }[]
      }
      get_payment_security_audit: {
        Args: Record<PropertyKey, never>
        Returns: {
          command: string
          policy_condition: string
          policy_name: string
          security_status: string
          table_name: string
        }[]
      }
      get_security_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_dashboard_enhanced: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_hardening_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_health_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_implementation_final_report: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_implementation_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_status_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_system_security_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_trial_days_remaining: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_user_active_teams: {
        Args: { user_id_param: string }
        Returns: {
          team_id: string
        }[]
      }
      get_user_entitlements: {
        Args: { user_uuid: string }
        Returns: {
          feature_key: string
          feature_value: Json
          plan_id: string
          status: string
        }[]
      }
      get_user_facilities: {
        Args: { user_uuid: string }
        Returns: {
          facility_id: string
          facility_name: string
          facility_type: string
          status: string
          user_role: string
        }[]
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
      is_account_locked: {
        Args: { user_email: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_facility_admin: {
        Args: { facility_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_regiq_admin: {
        Args: { user_email: string }
        Returns: boolean
      }
      is_team_admin_or_manager: {
        Args: { team_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_trial_expired: {
        Args: { user_uuid: string }
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
      log_compliance_access: {
        Args: {
          additional_data?: Json
          operation_type: string
          record_count?: number
          table_accessed: string
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
        Args:
          | {
              operation_param: string
              record_count_param?: number
              sensitive_fields?: Json
              table_name_param: string
            }
          | {
              operation_param: string
              record_count_param?: number
              sensitive_fields_param?: string[]
              table_name_param: string
            }
        Returns: boolean
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
      log_suspicious_activity: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      provision_enterprise_api_key: {
        Args: { target_user_id: string }
        Returns: string
      }
      refresh_security_monitoring: {
        Args: Record<PropertyKey, never>
        Returns: number
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
      run_security_audit: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      secure_admin_activities: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      secure_api_key_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      secure_api_keys: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      secure_payment_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      secure_security_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      validate_and_sanitize_input: {
        Args: { allow_html?: boolean; input_text: string; max_length?: number }
        Returns: Json
      }
      validate_api_key_secure: {
        Args: { api_key_input: string }
        Returns: {
          is_valid: boolean
          key_metadata: Json
          rate_limit: number
          user_id: string
        }[]
      }
      validate_enterprise_api_key: {
        Args: { api_key_input: string }
        Returns: {
          is_valid: boolean
          rate_limit: number
          user_id: string
        }[]
      }
      validate_security_configuration: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      start_sync_log: {
        Args: {
          p_source: string
          p_metadata?: Json
        }
        Returns: string
      }
      finish_sync_log: {
        Args: {
          p_log_id: string
          p_status: string
          p_alerts_fetched?: number
          p_alerts_inserted?: number
          p_alerts_updated?: number
          p_alerts_skipped?: number
          p_errors?: string[]
          p_results?: Json
        }
        Returns: void
      }
      upsert_alert: {
        Args: {
          p_external_id: string
          p_source: string
          p_title: string
          p_summary: string
          p_link_url: string | null
          p_date_published: string
          p_date_updated: string | null
          p_jurisdiction: string | null
          p_locations: string[] | null
          p_product_types: string[] | null
          p_category: string
          p_severity: string
          p_raw: Json
          p_hash: string
        }
        Returns: {
          action: string
          id: string
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
