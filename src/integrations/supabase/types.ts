export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
          created_at: string
          external_url: string | null
          full_content: string | null
          id: string
          published_date: string
          source: string
          summary: string
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          full_content?: string | null
          id?: string
          published_date: string
          source: string
          summary: string
          title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          created_at?: string
          external_url?: string | null
          full_content?: string | null
          id?: string
          published_date?: string
          source?: string
          summary?: string
          title?: string
          updated_at?: string
          urgency?: string
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
          role: string | null
          session_extended_until: string | null
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
          role?: string | null
          session_extended_until?: string | null
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
          role?: string | null
          session_extended_until?: string | null
          trusted_ips?: unknown[] | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_feature_usage: {
        Args: { user_id_param: string; feature_name_param: string }
        Returns: {
          current_usage: number
          usage_limit: number
          is_unlimited: boolean
        }[]
      }
      has_enterprise_feature: {
        Args: { user_id_param: string; feature_name_param: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      should_extend_session: {
        Args: { user_id_param: string; current_ip?: unknown }
        Returns: boolean
      }
      update_user_activity: {
        Args: { user_id_param: string; ip_address_param?: unknown }
        Returns: undefined
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
