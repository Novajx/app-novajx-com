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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          country: string
          dob: string
          full_name: string
          id: string
          id_back_url: string
          id_front_url: string
          id_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          user_id: string
        }
        Insert: {
          country: string
          dob: string
          full_name: string
          id?: string
          id_back_url: string
          id_front_url: string
          id_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url: string
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          user_id: string
        }
        Update: {
          country?: string
          dob?: string
          full_name?: string
          id?: string
          id_back_url?: string
          id_front_url?: string
          id_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mining_sessions: {
        Row: {
          base_amount: number
          claimed_at: string
          id: string
          next_available_at: string
          referral_bonus: number
          total_amount: number
          user_id: string
        }
        Insert: {
          base_amount?: number
          claimed_at?: string
          id?: string
          next_available_at?: string
          referral_bonus?: number
          total_amount?: number
          user_id: string
        }
        Update: {
          base_amount?: number
          claimed_at?: string
          id?: string
          next_available_at?: string
          referral_bonus?: number
          total_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          banned: boolean
          country: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          kyc_approved_at: string | null
          phone: string | null
          referral_code: string
          referred_by: string | null
        }
        Insert: {
          banned?: boolean
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          kyc_approved_at?: string | null
          phone?: string | null
          referral_code: string
          referred_by?: string | null
        }
        Update: {
          banned?: boolean
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          kyc_approved_at?: string | null
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_bonuses: {
        Row: {
          amount: number
          created_at: string
          id: string
          mining_session_id: string | null
          referred_id: string
          referrer_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          mining_session_id?: string | null
          referred_id: string
          referrer_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mining_session_id?: string | null
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_bonuses_mining_session_id_fkey"
            columns: ["mining_session_id"]
            isOneToOne: false
            referencedRelation: "mining_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          last_activity_at: string | null
          referred_id: string
          referrer_id: string
          status: Database["public"]["Enums"]["referral_status"]
          total_bonus_earned: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity_at?: string | null
          referred_id: string
          referrer_id: string
          status?: Database["public"]["Enums"]["referral_status"]
          total_bonus_earned?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_activity_at?: string | null
          referred_id?: string
          referrer_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
          total_bonus_earned?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          receiver_id: string
          sender_id: string
          status: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          receiver_id: string
          sender_id: string
          status?: string
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          id: string
          locked_balance: number
          referral_earnings: number
          total_mined: number
          total_received: number
          total_sent: number
          updated_at: string
          user_id: string
          withdrawal_address: string | null
        }
        Insert: {
          balance?: number
          id?: string
          locked_balance?: number
          referral_earnings?: number
          total_mined?: number
          total_received?: number
          total_sent?: number
          updated_at?: string
          user_id: string
          withdrawal_address?: string | null
        }
        Update: {
          balance?: number
          id?: string
          locked_balance?: number
          referral_earnings?: number
          total_mined?: number
          total_received?: number
          total_sent?: number
          updated_at?: string
          user_id?: string
          withdrawal_address?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          active_referrals: number | null
          country: string | null
          full_name: string | null
          referral_earnings: number | null
          total_referrals: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_process_withdrawal: {
        Args: {
          _action: string
          _note?: string
          _request_id: string
          _tx_hash?: string
        }
        Returns: undefined
      }
      admin_review_kyc: {
        Args: { _action: string; _kyc_id: string; _reason?: string }
        Returns: undefined
      }
      claim_mining: { Args: never; Returns: Json }
      find_user_for_transfer: {
        Args: { _query: string }
        Returns: {
          full_name: string
          id: string
          referral_code: string
        }[]
      }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      request_withdrawal: {
        Args: { _amount: number; _wallet_address: string }
        Returns: Json
      }
      swap_njx: { Args: { _amount: number }; Returns: Json }
      transfer_njx: {
        Args: { _amount: number; _note?: string; _recipient: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      kyc_status: "not_submitted" | "pending" | "approved" | "rejected"
      referral_status: "active" | "inactive"
      withdrawal_status: "pending" | "approved" | "rejected" | "paid"
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
      app_role: ["admin", "user"],
      kyc_status: ["not_submitted", "pending", "approved", "rejected"],
      referral_status: ["active", "inactive"],
      withdrawal_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const
