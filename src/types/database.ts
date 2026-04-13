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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          google_calendar_event_id: string | null
          id: string
          performed_by: string | null
          related_to_id: string | null
          related_to_type: string | null
          scheduled_at: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          google_calendar_event_id?: string | null
          id?: string
          performed_by?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          scheduled_at?: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          google_calendar_event_id?: string | null
          id?: string
          performed_by?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          scheduled_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          content: string | null
          created_at: string
          embedding: string | null
          id: string
          rich_blocks: Json | null
          role: string
          session_id: string
          tokens_used: number | null
          tool_calls: Json | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          rich_blocks?: Json | null
          role: string
          session_id: string
          tokens_used?: number | null
          tool_calls?: Json | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          rich_blocks?: Json | null
          role?: string
          session_id?: string
          tokens_used?: number | null
          tool_calls?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_agent_id: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"] | null
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_snapshots: {
        Row: {
          key: string
          payload: Json
          updated_at: string
        }
        Insert: {
          key: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          key?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_agent_id: string | null
          client_id: string
          closed_at: string | null
          created_at: string
          first_contact_at: string | null
          id: string
          last_contact_at: string | null
          property_id: string | null
          source: Database["public"]["Enums"]["lead_source"] | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          client_id: string
          closed_at?: string | null
          created_at?: string
          first_contact_at?: string | null
          id?: string
          last_contact_at?: string | null
          property_id?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          client_id?: string
          closed_at?: string | null
          created_at?: string
          first_contact_at?: string | null
          id?: string
          last_contact_at?: string | null
          property_id?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      market_listings: {
        Row: {
          address: string | null
          area_m2: number | null
          created_at: string
          district: string
          external_id: string
          first_seen_at: string
          id: string
          is_new: boolean
          last_seen_at: string
          price: number | null
          property_type: string | null
          source: string
          title: string
          url: string
        }
        Insert: {
          address?: string | null
          area_m2?: number | null
          created_at?: string
          district: string
          external_id: string
          first_seen_at?: string
          id?: string
          is_new?: boolean
          last_seen_at?: string
          price?: number | null
          property_type?: string | null
          source: string
          title: string
          url: string
        }
        Update: {
          address?: string | null
          area_m2?: number | null
          created_at?: string
          district?: string
          external_id?: string
          first_seen_at?: string
          id?: string
          is_new?: boolean
          last_seen_at?: string
          price?: number | null
          property_type?: string | null
          source?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      monitoring_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          filters: Json
          id: string
          last_run_at: string | null
          locations: string[]
          name: string
          next_run_at: string | null
          notify_email: boolean
          notify_telegram: boolean
          query: string
          telegram_chat_id: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          filters?: Json
          id?: string
          last_run_at?: string | null
          locations?: string[]
          name: string
          next_run_at?: string | null
          notify_email?: boolean
          notify_telegram?: boolean
          query: string
          telegram_chat_id?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          filters?: Json
          id?: string
          last_run_at?: string | null
          locations?: string[]
          name?: string
          next_run_at?: string | null
          notify_email?: boolean
          notify_telegram?: boolean
          query?: string
          telegram_chat_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          google_access_token: string | null
          google_email: string | null
          google_refresh_token: string | null
          google_token_expiry: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          telegram_chat_id: number | null
          telegram_link_code: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          google_access_token?: string | null
          google_email?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: number | null
          telegram_link_code?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          google_access_token?: string | null
          google_email?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: number | null
          telegram_link_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          agent_id: string | null
          area_m2: number
          city: string
          client_id: string | null
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          district: string
          document_urls: string[]
          floor: number | null
          gallery_urls: string[]
          id: string
          last_renovation: string | null
          owner_id: string | null
          permit_data: string | null
          price: number
          reconstruction_notes: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          total_floors: number | null
          type: Database["public"]["Enums"]["property_type"]
          updated_at: string
          year_built: number | null
        }
        Insert: {
          address: string
          agent_id?: string | null
          area_m2: number
          city?: string
          client_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          district: string
          document_urls?: string[]
          floor?: number | null
          gallery_urls?: string[]
          id?: string
          last_renovation?: string | null
          owner_id?: string | null
          permit_data?: string | null
          price: number
          reconstruction_notes?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          total_floors?: number | null
          type: Database["public"]["Enums"]["property_type"]
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          address?: string
          agent_id?: string | null
          area_m2?: number
          city?: string
          client_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          district?: string
          document_urls?: string[]
          floor?: number | null
          gallery_urls?: string[]
          id?: string
          last_renovation?: string | null
          owner_id?: string | null
          permit_data?: string | null
          price?: number
          reconstruction_notes?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          total_floors?: number | null
          type?: Database["public"]["Enums"]["property_type"]
          updated_at?: string
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          format: string
          generated_by: string | null
          id: string
          period_end: string
          period_start: string
          storage_path: string | null
          title: string
          type: Database["public"]["Enums"]["report_type"]
        }
        Insert: {
          created_at?: string
          format?: string
          generated_by?: string | null
          id?: string
          period_end: string
          period_start: string
          storage_path?: string | null
          title: string
          type: Database["public"]["Enums"]["report_type"]
        }
        Update: {
          created_at?: string
          format?: string
          generated_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          storage_path?: string | null
          title?: string
          type?: Database["public"]["Enums"]["report_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_lead_pipeline: {
        Row: {
          agent_name: string | null
          assigned_agent_id: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          closed_at: string | null
          created_at: string | null
          first_contact_at: string | null
          id: string | null
          last_contact_at: string | null
          property_address: string | null
          property_id: string | null
          property_price: number | null
          property_title: string | null
          source: Database["public"]["Enums"]["lead_source"] | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      v_property_summary: {
        Row: {
          address: string | null
          agent_id: string | null
          agent_name: string | null
          area_m2: number | null
          city: string | null
          client_id: string | null
          client_name: string | null
          cover_image_url: string | null
          created_at: string | null
          district: string | null
          document_urls: string[] | null
          floor: number | null
          gallery_urls: string[] | null
          id: string | null
          last_activity_at: string | null
          last_renovation: string | null
          lead_count: number | null
          owner_id: string | null
          permit_data: string | null
          price: number | null
          reconstruction_notes: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["property_status"] | null
          title: string | null
          total_floors: number | null
          type: Database["public"]["Enums"]["property_type"] | null
          updated_at: string | null
          year_built: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_weekly_kpis: {
        Row: {
          active_pipeline: number | null
          closed_lost: number | null
          closed_won: number | null
          new_leads: number | null
          viewings_scheduled: number | null
          week: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      user_role: { Args: never; Returns: string }
      uuid_generate_v1: { Args: never; Returns: string }
      uuid_generate_v1mc: { Args: never; Returns: string }
      uuid_generate_v3: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_generate_v4: { Args: never; Returns: string }
      uuid_generate_v5: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_nil: { Args: never; Returns: string }
      uuid_ns_dns: { Args: never; Returns: string }
      uuid_ns_oid: { Args: never; Returns: string }
      uuid_ns_url: { Args: never; Returns: string }
      uuid_ns_x500: { Args: never; Returns: string }
    }
    Enums: {
      activity_type:
        | "call"
        | "email"
        | "viewing"
        | "offer"
        | "contract"
        | "note"
        | "task"
        | "meeting"
      lead_source:
        | "referral"
        | "sreality"
        | "bezrealitky"
        | "reality_cz"
        | "direct"
        | "social"
        | "event"
        | "other"
      lead_status:
        | "new"
        | "contacted"
        | "viewing_scheduled"
        | "offer_made"
        | "closed_won"
        | "closed_lost"
      property_status: "active" | "pending" | "sold" | "withdrawn"
      property_type: "byt" | "dum" | "komercni" | "pozemek" | "garaze"
      report_type: "weekly" | "monthly" | "quarterly" | "custom"
      user_role: "admin" | "agent" | "viewer"
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
      activity_type: [
        "call",
        "email",
        "viewing",
        "offer",
        "contract",
        "note",
        "task",
        "meeting",
      ],
      lead_source: [
        "referral",
        "sreality",
        "bezrealitky",
        "reality_cz",
        "direct",
        "social",
        "event",
        "other",
      ],
      lead_status: [
        "new",
        "contacted",
        "viewing_scheduled",
        "offer_made",
        "closed_won",
        "closed_lost",
      ],
      property_status: ["active", "pending", "sold", "withdrawn"],
      property_type: ["byt", "dum", "komercni", "pozemek", "garaze"],
      report_type: ["weekly", "monthly", "quarterly", "custom"],
      user_role: ["admin", "agent", "viewer"],
    },
  },
} as const
