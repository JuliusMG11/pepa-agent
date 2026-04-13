// Auto-generated types from schema — regenerate with:
// pnpm supabase gen types typescript --local > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          avatar_url: string | null;
          telegram_chat_id: number | null;
          google_access_token: string | null;
          google_refresh_token: string | null;
          google_token_expiry: string | null;
          google_email: string | null;
          telegram_link_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: Database["public"]["Enums"]["user_role"];
          avatar_url?: string | null;
          telegram_chat_id?: number | null;
          google_access_token?: string | null;
          google_refresh_token?: string | null;
          google_token_expiry?: string | null;
          google_email?: string | null;
          telegram_link_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: Database["public"]["Enums"]["user_role"];
          avatar_url?: string | null;
          telegram_chat_id?: number | null;
          google_access_token?: string | null;
          google_refresh_token?: string | null;
          google_token_expiry?: string | null;
          google_email?: string | null;
          telegram_link_code?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          title: string;
          address: string;
          city: string;
          district: string;
          type: Database["public"]["Enums"]["property_type"];
          status: Database["public"]["Enums"]["property_status"];
          price: number;
          area_m2: number;
          floor: number | null;
          total_floors: number | null;
          year_built: number | null;
          last_renovation: string | null;
          reconstruction_notes: string | null;
          permit_data: string | null;
          source_url: string | null;
          cover_image_url: string | null;
          gallery_urls: string[];
          client_id: string | null;
          document_urls: string[];
          owner_id: string | null;
          agent_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          address: string;
          city?: string;
          district: string;
          type: Database["public"]["Enums"]["property_type"];
          status?: Database["public"]["Enums"]["property_status"];
          price: number;
          area_m2: number;
          floor?: number | null;
          total_floors?: number | null;
          year_built?: number | null;
          last_renovation?: string | null;
          reconstruction_notes?: string | null;
          permit_data?: string | null;
          source_url?: string | null;
          cover_image_url?: string | null;
          gallery_urls?: string[];
          client_id?: string | null;
          document_urls?: string[];
          owner_id?: string | null;
          agent_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          address?: string;
          city?: string;
          district?: string;
          type?: Database["public"]["Enums"]["property_type"];
          status?: Database["public"]["Enums"]["property_status"];
          price?: number;
          area_m2?: number;
          floor?: number | null;
          total_floors?: number | null;
          year_built?: number | null;
          last_renovation?: string | null;
          reconstruction_notes?: string | null;
          permit_data?: string | null;
          source_url?: string | null;
          cover_image_url?: string | null;
          gallery_urls?: string[];
          client_id?: string | null;
          document_urls?: string[];
          owner_id?: string | null;
          agent_id?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          source: Database["public"]["Enums"]["lead_source"] | null;
          notes: string | null;
          assigned_agent_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          source?: Database["public"]["Enums"]["lead_source"] | null;
          notes?: string | null;
          assigned_agent_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          source?: Database["public"]["Enums"]["lead_source"] | null;
          notes?: string | null;
          assigned_agent_id?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          client_id: string;
          property_id: string | null;
          assigned_agent_id: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          source: Database["public"]["Enums"]["lead_source"] | null;
          utm_source: string | null;
          utm_medium: string | null;
          first_contact_at: string | null;
          last_contact_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          property_id?: string | null;
          assigned_agent_id?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          source?: Database["public"]["Enums"]["lead_source"] | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          first_contact_at?: string | null;
          last_contact_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          property_id?: string | null;
          assigned_agent_id?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          source?: Database["public"]["Enums"]["lead_source"] | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          first_contact_at?: string | null;
          last_contact_at?: string | null;
          closed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          type: Database["public"]["Enums"]["activity_type"];
          title: string;
          description: string | null;
          related_to_type: string | null;
          related_to_id: string | null;
          performed_by: string | null;
          scheduled_at: string | null;
          completed_at: string | null;
          created_at: string;
          google_calendar_event_id: string | null;
        };
        Insert: {
          id?: string;
          type: Database["public"]["Enums"]["activity_type"];
          title: string;
          description?: string | null;
          related_to_type?: string | null;
          related_to_id?: string | null;
          performed_by?: string | null;
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          google_calendar_event_id?: string | null;
        };
        Update: {
          type?: Database["public"]["Enums"]["activity_type"];
          title?: string;
          description?: string | null;
          related_to_type?: string | null;
          related_to_id?: string | null;
          performed_by?: string | null;
          scheduled_at?: string | null;
          completed_at?: string | null;
          google_calendar_event_id?: string | null;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          title: string;
          type: Database["public"]["Enums"]["report_type"];
          period_start: string;
          period_end: string;
          generated_by: string | null;
          storage_path: string | null;
          format: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: Database["public"]["Enums"]["report_type"];
          period_start: string;
          period_end: string;
          generated_by?: string | null;
          storage_path?: string | null;
          format?: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          type?: Database["public"]["Enums"]["report_type"];
          period_start?: string;
          period_end?: string;
          generated_by?: string | null;
          storage_path?: string | null;
          format?: string;
        };
        Relationships: [];
      };
      agent_conversations: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string;
          role: "user" | "assistant" | "tool";
          content: string | null;
          tool_calls: Json | null;
          tokens_used: number | null;
          embedding: string | null; // vector(1536) represented as string
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id: string;
          role: "user" | "assistant" | "tool";
          content?: string | null;
          tool_calls?: Json | null;
          tokens_used?: number | null;
          embedding?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          session_id?: string;
          role?: "user" | "assistant" | "tool";
          content?: string | null;
          tool_calls?: Json | null;
          tokens_used?: number | null;
          embedding?: string | null;
        };
        Relationships: [];
      };
      monitoring_jobs: {
        Row: {
          id: string;
          name: string;
          query: string;
          locations: string[];
          enabled: boolean;
          last_run_at: string | null;
          next_run_at: string | null;
          notify_telegram: boolean;
          notify_email: boolean;
          telegram_chat_id: number | null;
          filters: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          query: string;
          locations?: string[];
          enabled?: boolean;
          last_run_at?: string | null;
          next_run_at?: string | null;
          notify_telegram?: boolean;
          notify_email?: boolean;
          telegram_chat_id?: number | null;
          filters?: Record<string, unknown>;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          query?: string;
          locations?: string[];
          enabled?: boolean;
          last_run_at?: string | null;
          next_run_at?: string | null;
          notify_telegram?: boolean;
          notify_email?: boolean;
          telegram_chat_id?: number | null;
          filters?: Record<string, unknown>;
        };
        Relationships: [];
      };
      market_listings: {
        Row: {
          id: string;
          source: string;
          external_id: string;
          title: string;
          address: string | null;
          district: string;
          price: number | null;
          area_m2: number | null;
          url: string;
          property_type: string | null;
          first_seen_at: string;
          last_seen_at: string;
          is_new: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          source: string;
          external_id: string;
          title: string;
          address?: string | null;
          district: string;
          price?: number | null;
          area_m2?: number | null;
          url: string;
          property_type?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
          is_new?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          address?: string | null;
          price?: number | null;
          area_m2?: number | null;
          property_type?: string | null;
          last_seen_at?: string;
          is_new?: boolean;
        };
        Relationships: [];
      };
      dashboard_snapshots: {
        Row: {
          key: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          payload?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_property_summary: {
        Row: {
          id: string;
          title: string;
          address: string;
          city: string;
          district: string;
          type: Database["public"]["Enums"]["property_type"];
          status: Database["public"]["Enums"]["property_status"];
          price: number;
          area_m2: number;
          floor: number | null;
          total_floors: number | null;
          year_built: number | null;
          last_renovation: string | null;
          reconstruction_notes: string | null;
          permit_data: string | null;
          source_url: string | null;
          cover_image_url: string | null;
          gallery_urls: string[] | null;
          client_id: string | null;
          client_name: string | null;
          document_urls: string[] | null;
          owner_id: string | null;
          agent_id: string | null;
          created_at: string;
          updated_at: string;
          lead_count: number;
          last_activity_at: string | null;
          agent_name: string | null;
        };
        Relationships: [];
      };
      v_lead_pipeline: {
        Row: {
          id: string;
          client_id: string;
          property_id: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          source: Database["public"]["Enums"]["lead_source"] | null;
          first_contact_at: string | null;
          last_contact_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
          assigned_agent_id: string | null;
          client_name: string;
          client_email: string | null;
          client_phone: string | null;
          property_title: string | null;
          property_address: string | null;
          property_price: number | null;
          agent_name: string | null;
        };
        Relationships: [];
      };
      v_weekly_kpis: {
        Row: {
          week: string;
          new_leads: number;
          closed_won: number;
          closed_lost: number;
          viewings_scheduled: number;
          active_pipeline: number;
        };
        Relationships: [];
      };
    };
    Enums: {
      property_type: "byt" | "dum" | "komercni" | "pozemek" | "garaze";
      property_status: "active" | "pending" | "sold" | "withdrawn";
      lead_status:
        | "new"
        | "contacted"
        | "viewing_scheduled"
        | "offer_made"
        | "closed_won"
        | "closed_lost";
      lead_source:
        | "referral"
        | "sreality"
        | "bezrealitky"
        | "reality_cz"
        | "direct"
        | "social"
        | "event"
        | "other";
      activity_type:
        | "call"
        | "email"
        | "viewing"
        | "meeting"
        | "offer"
        | "contract"
        | "note"
        | "task";
      report_type: "weekly" | "monthly" | "quarterly" | "custom";
      user_role: "admin" | "agent" | "viewer";
    };
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
