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
      alarms: {
        Row: {
          address: string | null
          alarm_type: string
          created_at: string
          house_number: string | null
          id: string
          latitude: number | null
          longitude: number | null
          observations: string | null
          parcel_name: string | null
          phone_number: string | null
          processed_at: string | null
          processed_by: string | null
          sender_name: string | null
          status: string
        }
        Insert: {
          address?: string | null
          alarm_type: string
          created_at?: string
          house_number?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          observations?: string | null
          parcel_name?: string | null
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          sender_name?: string | null
          status?: string
        }
        Update: {
          address?: string | null
          alarm_type?: string
          created_at?: string
          house_number?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          observations?: string | null
          parcel_name?: string | null
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          sender_name?: string | null
          status?: string
        }
        Relationships: []
      }
      ble_devices: {
        Row: {
          battery: number | null
          created_at: string
          created_by: string | null
          device_id: string
          device_identifier: string | null
          enabled: boolean
          id: string
          last_seen_at: string | null
          manufacturer: string | null
          model: string | null
          name: string | null
          parcel_id: string
          phone_number: string | null
          profile: string | null
          registered_number_id: string | null
          rssi: number | null
          token_hash: string | null
          updated_at: string
        }
        Insert: {
          battery?: number | null
          created_at?: string
          created_by?: string | null
          device_id: string
          device_identifier?: string | null
          enabled?: boolean
          id?: string
          last_seen_at?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string | null
          parcel_id: string
          phone_number?: string | null
          profile?: string | null
          registered_number_id?: string | null
          rssi?: number | null
          token_hash?: string | null
          updated_at?: string
        }
        Update: {
          battery?: number | null
          created_at?: string
          created_by?: string | null
          device_id?: string
          device_identifier?: string | null
          enabled?: boolean
          id?: string
          last_seen_at?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string | null
          parcel_id?: string
          phone_number?: string | null
          profile?: string | null
          registered_number_id?: string | null
          rssi?: number | null
          token_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ble_devices_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ble_devices_registered_number_id_fkey"
            columns: ["registered_number_id"]
            isOneToOne: false
            referencedRelation: "registered_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      ble_events: {
        Row: {
          alarm_id: string | null
          ble_device_id: string | null
          button: string
          created_at: string
          event_id: string
          id: string
          payload: Json | null
          pressed_at: string | null
          received_at: string
        }
        Insert: {
          alarm_id?: string | null
          ble_device_id?: string | null
          button: string
          created_at?: string
          event_id: string
          id?: string
          payload?: Json | null
          pressed_at?: string | null
          received_at?: string
        }
        Update: {
          alarm_id?: string | null
          ble_device_id?: string | null
          button?: string
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json | null
          pressed_at?: string | null
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ble_events_alarm_id_fkey"
            columns: ["alarm_id"]
            isOneToOne: false
            referencedRelation: "alarms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ble_events_ble_device_id_fkey"
            columns: ["ble_device_id"]
            isOneToOne: false
            referencedRelation: "ble_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_device_parcels: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          parcel_name: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          parcel_name: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          parcel_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_device_parcels_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "gps_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_devices: {
        Row: {
          cra_user_number: string | null
          created_at: string
          created_by: string | null
          id: string
          imei: string
          model: string | null
          name: string | null
          panic_button_enabled: boolean
          relay_active_until: string | null
          relay_duration: number
          sim_number: string | null
        }
        Insert: {
          cra_user_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          imei: string
          model?: string | null
          name?: string | null
          panic_button_enabled?: boolean
          relay_active_until?: string | null
          relay_duration?: number
          sim_number?: string | null
        }
        Update: {
          cra_user_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          imei?: string
          model?: string | null
          name?: string | null
          panic_button_enabled?: boolean
          relay_active_until?: string | null
          relay_duration?: number
          sim_number?: string | null
        }
        Relationships: []
      }
      gps_relay_jobs: {
        Row: {
          action: string
          alarm_id: string | null
          completed_at: string | null
          created_at: string
          device_id_traccar: number
          error_message: string | null
          execute_at: string
          id: string
          imei: string
          status: string
        }
        Insert: {
          action?: string
          alarm_id?: string | null
          completed_at?: string | null
          created_at?: string
          device_id_traccar: number
          error_message?: string | null
          execute_at: string
          id?: string
          imei: string
          status?: string
        }
        Update: {
          action?: string
          alarm_id?: string | null
          completed_at?: string | null
          created_at?: string
          device_id_traccar?: number
          error_message?: string | null
          execute_at?: string
          id?: string
          imei?: string
          status?: string
        }
        Relationships: []
      }
      operator_parcels: {
        Row: {
          created_at: string
          id: string
          parcel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parcel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parcel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_parcels_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      parcels: {
        Row: {
          account_number: string | null
          created_at: string
          id: string
          name: string
          whatsapp_group_id: string | null
          whatsapp_invite_link: string | null
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          id?: string
          name: string
          whatsapp_group_id?: string | null
          whatsapp_invite_link?: string | null
        }
        Update: {
          account_number?: string | null
          created_at?: string
          id?: string
          name?: string
          whatsapp_group_id?: string | null
          whatsapp_invite_link?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      registered_numbers: {
        Row: {
          callmebot_apikey: string | null
          created_at: string
          house_number: string | null
          id: string
          is_parcel_admin: boolean | null
          owner_name: string
          parcel_name: string | null
          phone_number: string
          user_number: string | null
        }
        Insert: {
          callmebot_apikey?: string | null
          created_at?: string
          house_number?: string | null
          id?: string
          is_parcel_admin?: boolean | null
          owner_name: string
          parcel_name?: string | null
          phone_number: string
          user_number?: string | null
        }
        Update: {
          callmebot_apikey?: string | null
          created_at?: string
          house_number?: string | null
          id?: string
          is_parcel_admin?: boolean | null
          owner_name?: string
          parcel_name?: string | null
          phone_number?: string
          user_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      operator_parcel_names: { Args: { _user_id: string }; Returns: string[] }
      setup_first_admin: {
        Args: { _email: string; _full_name: string; _password: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "operator"
        | "director_monitoreo"
        | "supervisor_central"
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
      app_role: [
        "admin",
        "operator",
        "director_monitoreo",
        "supervisor_central",
      ],
    },
  },
} as const
